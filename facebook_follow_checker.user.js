// ==UserScript==
// @name         Facebook Follow Checker 24H
// @namespace    cheo-follow.local
// @version      2.2.0
// @description  Quản lý danh sách following/followers, tự cuộn, đối chiếu và kiểm tra quá hạn 24 giờ.
// @match        https://www.facebook.com/*
// @match        https://web.facebook.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==
(function(){
'use strict';
if(window.__followChecker21)return;
window.__followChecker21=true;
const KEY='cheo_follow_v21', DAY=86400000, nap=ms=>new Promise(r=>setTimeout(r,ms));
const state={running:false,stop:false};
let db;
try{db=JSON.parse(GM_getValue(KEY,'null'))||{};}catch{db={};}
db.following ||= {};db.followers ||= {};db.scans ||= {};
const save=()=>GM_setValue(KEY,JSON.stringify(db));
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const blocked=new Set('friends groups pages watch reels stories marketplace events notifications messages settings privacy help search home login photo photos videos posts share profile'.split(' '));
function account(url){
 let u;try{u=new URL(url,location.origin);}catch{return null;}
 if(!['www.facebook.com','web.facebook.com','facebook.com','m.facebook.com'].includes(u.hostname))return null;
 if(u.pathname==='/profile.php'){const id=u.searchParams.get('id');return /^\d+$/.test(id||'')?{id:'id:'+id,url:'https://www.facebook.com/profile.php?id='+id}:null;}
 const parts=decodeURIComponent(u.pathname).split('/').filter(Boolean);
 if(parts.length!==1||blocked.has(parts[0].toLowerCase()))return null;
 return {id:'slug:'+parts[0].toLowerCase(),url:'https://www.facebook.com/'+encodeURIComponent(parts[0])};
}
const main=()=>document.querySelector('[role="main"]')||document.querySelector('main')||document.body;
function visible(){
 const found=new Map();
 for(const a of main().querySelectorAll('a[href]')){
  if(a.closest('#cf-panel,nav,header,[role="navigation"],[role="banner"]'))continue;
  const user=account(a.href);if(!user)continue;
  const name=norm((a.innerText||a.querySelector('img[alt]')?.alt||a.getAttribute('aria-label')||'').split('\n')[0]);
  if(name.length<2||name.length>90||/^(theo dõi|đang theo dõi|follow|unfollow|bạn bè|xem thêm)$/i.test(name))continue;
  if(!found.has(user.id))found.set(user.id,{...user,name,node:a});
 }
 return [...found.values()];
}
function collect(mode){
 let fresh=0;
 for(const p of visible()){
  if(!db[mode][p.id]){db[mode][p.id]={id:p.id,name:p.name,url:p.url,firstSeen:Date.now()};fresh++;}
  else{db[mode][p.id].name=p.name;db[mode][p.id].url=p.url;}
 }
 save();render();return fresh;
}
const status=t=>{const e=document.querySelector('#cf-status');if(e)e.textContent=t;};
function scroller(){
 const root=main();
 const all=[document.scrollingElement,root,...root.querySelectorAll('div')].filter(x=>x&&x.clientHeight>170&&x.scrollHeight>x.clientHeight+150);
 all.sort((a,b)=>(b.clientHeight*b.clientWidth)-(a.clientHeight*a.clientWidth));
 return all.find(x=>x!==document.scrollingElement)||document.scrollingElement;
}
async function scan(mode){
 if(state.running)return;
 if(!confirm('Bạn đã mở đúng danh sách '+(mode==='following'?'Đang theo dõi':'Người theo dõi')+' trên Facebook chưa?'))return;
 state.running=true;state.stop=false;
 let steps=0,stable=0,old='',fresh=0;
 try{
  for(;steps<120&&!state.stop;steps++){
   fresh+=collect(mode);
   const el=scroller();if(!el)break;
   const sig=[el.scrollTop,el.scrollHeight,Object.keys(db[mode]).length].join(':');
   stable=sig===old?stable+1:0;old=sig;
   if(stable>=6)break;
   status('Đang cuộn: '+(steps+1)+'/120 | mới lưu '+fresh+' hồ sơ. Có thể nhấn Dừng.');
   el.scrollBy({top:Math.max(350,el.clientHeight*.75),behavior:'instant'});
   await nap(1300);
  }
  collect(mode);
  db.scans[mode]={at:Date.now(),completed:!state.stop&&stable>=6,count:Object.keys(db[mode]).length};
  save();
  status('Kết thúc quét '+mode+'. Đã lưu '+Object.keys(db[mode]).length+' hồ sơ. '+(db.scans[mode].completed?'Có vẻ đã đến cuối danh sách.':'Chưa xác nhận quét đủ.'));
 }catch(e){status('Lỗi: '+e.message);}
 finally{state.running=false;render();}
}
function pending(){
 return Object.values(db.following).filter(p=>!p.unfollowedAt&&!db.followers[p.id]&&Date.now()-p.firstSeen>=DAY);
}
function render(){
 const e=document.querySelector('#cf-stats');if(!e)return;
 const f=Object.values(db.following).filter(p=>!p.unfollowedAt);
 const miss=f.filter(p=>!db.followers[p.id]);
 e.textContent='Đang theo dõi: '+f.length+' | Follower: '+Object.keys(db.followers).length+' | Chưa thấy follow lại: '+miss.length+' | Quá 24h: '+pending().length;
 const list=document.querySelector('#cf-list');list.replaceChildren();
 for(const p of pending().slice(0,100)){
  const line=document.createElement('div');line.style.margin='5px 0';
  const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=p.name;
  const done=document.createElement('button');done.textContent='Đã gỡ';done.onclick=()=>{p.unfollowedAt=Date.now();save();render();};
  line.append(a,' ',done);list.append(line);
 }
}
function csv(){
 const rows=[['Tên','URL','Follow lại','Thời điểm ghi nhận','Quá 24h']];
 for(const p of Object.values(db.following))rows.push([p.name,p.url,db.followers[p.id]?'Có':'Chưa thấy',new Date(p.firstSeen).toLocaleString('vi-VN'),Date.now()-p.firstSeen>=DAY?'Có':'Không']);
 const payload='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const href=URL.createObjectURL(new Blob([payload],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=href;a.download='cheo-follow-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1500);
}
async function reviewBatch(){
 if(state.running)return;
 const people=pending();
 if(!people.length)return status('Không có hồ sơ quá hạn 24 giờ.');
 if(!db.scans.followers?.completed||!db.scans.following?.completed)return status('Cần quét đủ cả hai danh sách trước khi xét gỡ.');
 if(Date.now()-db.scans.followers.at>3600000||Date.now()-db.scans.following.at>3600000)return status('Cần quét lại cả hai danh sách trong 60 phút gần đây.');
 const count=Math.min(10,people.length);
 if(!confirm('Có '+people.length+' hồ sơ quá 24 giờ chưa thấy follow lại. Mở tối đa '+count+' hồ sơ để bạn xác nhận hủy theo dõi thủ công? Không phải ai vắng mặt cũng chắc chắn chưa follow lại.'))return;
 for(const p of people.slice(0,count))window.open(p.url,'_blank','noopener');
 status('Đã mở '+count+' trang. Kiểm tra từng người và chọn “Đã gỡ” sau khi tự hủy follow trên Facebook.');
}
const style=document.createElement('style');
style.textContent='#cf-toggle{position:fixed;top:38%;left:0;right:auto;bottom:auto;background:#2563eb;color:white;border:0;border-radius:25px;padding:10px 15px;z-index:2147483647;cursor:pointer}#cf-panel{position:fixed;top:16%;left:12px;right:auto;bottom:auto;width:340px;max-height:78vh;overflow:auto;box-sizing:border-box;background:#fff;color:#182433;border:2px solid #2563eb;border-radius:12px;padding:12px;z-index:2147483647;font:13px/1.5 Arial;box-shadow:0 10px 30px #0004}#cf-panel[hidden],#cf-toggle[hidden]{display:none!important}#cf-panel button{padding:6px 9px;margin:3px;background:#e5edff;color:#182433;border:1px solid #a9c3fc;border-radius:6px;cursor:pointer}#cf-panel a{color:#155ed6}#cf-status{white-space:pre-wrap;margin:10px 0}#cf-list{max-height:180px;overflow:auto}';
document.head.append(style);
const toggle=document.createElement('button');toggle.id='cf-toggle';toggle.textContent='☰ Follow 24H';document.body.append(toggle);
const panel=document.createElement('div');panel.id='cf-panel';panel.hidden=false;
panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b>Facebook Follow Checker 24H</b><button id="cf-close">✕</button></div><p id="cf-stats"></p><button id="cf-following">↻ Cuộn + lưu Đang theo dõi</button><button id="cf-followers">↻ Cuộn + lưu Người theo dõi</button><button id="cf-stop">■ Dừng</button><p id="cf-status">Chọn đúng tab danh sách Facebook trước khi cuộn.</p><button id="cf-export">Xuất CSV</button><button id="cf-review">Kiểm tra tối đa 10 người quá hạn</button><b>Chưa thấy follow lại sau 24h:</b><div id="cf-list"></div><small>Thời gian 24h tính từ lúc tool ghi nhận lần đầu. Quét chỉ thu thập dữ liệu hiển thị, có thể thiếu. Không tự bỏ theo dõi để tránh gỡ nhầm.</small>';
document.body.append(panel);
toggle.hidden=true;
try { GM_registerMenuCommand('Mở Follow Checker 24H',()=>{panel.hidden=false;toggle.hidden=true;render();}); } catch(e) { console.warn('Menu command unavailable',e); }
toggle.onclick=()=>{toggle.hidden=true;panel.hidden=false;render();};
panel.querySelector('#cf-close').onclick=()=>{panel.hidden=true;toggle.hidden=false;};
panel.querySelector('#cf-following').onclick=()=>scan('following');
panel.querySelector('#cf-followers').onclick=()=>scan('followers');
panel.querySelector('#cf-stop').onclick=()=>{state.stop=true;status('Đang dừng...');};
panel.querySelector('#cf-export').onclick=csv;
panel.querySelector('#cf-review').onclick=reviewBatch;
render();
})();