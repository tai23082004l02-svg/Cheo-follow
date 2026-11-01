// ==UserScript==
// @name         Facebook Follow Checker
// @namespace    cheo-follow.local
// @version      2.9.2
// @description  Quản lý danh sách following/followers, tự cuộn, đối chiếu và đối chiếu người chưa theo dõi lại.
// @match        https://facebook.com/*
// @match        https://www.facebook.com/*
// @match        https://web.facebook.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/tai23082004l02-svg/Cheo-follow/main/facebook_follow_checker.user.js
// @downloadURL  https://raw.githubusercontent.com/tai23082004l02-svg/Cheo-follow/main/facebook_follow_checker.user.js
// ==/UserScript==
(function(){
'use strict';
if(window.__followChecker21)return;
window.__followChecker21=true;
console.info('[Follow Checker] script loaded v2.4');
const KEY='cheo_follow_v21', nap=ms=>new Promise(r=>setTimeout(r,ms));
const storeRead=(key,fallback)=>{try{return typeof GM_getValue==='function'?GM_getValue(key,fallback):localStorage.getItem(key)||fallback;}catch{return localStorage.getItem(key)||fallback;}};
const storeWrite=(key,val)=>{try{if(typeof GM_setValue==='function')return GM_setValue(key,val);}catch(e){console.warn(e)}localStorage.setItem(key,val);};
const state={running:false,stop:false};
let db;
try{db=JSON.parse(storeRead(KEY,'null'))||{};}catch{db={};}
db.following ||= {};db.followers ||= {};db.scans ||= {};
const save=()=>storeWrite(KEY,JSON.stringify(db));
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
 // Prefer the actual page scroller. Do not scroll arbitrary Facebook sidebar widgets.
 const root=main();
 const candidates=[document.scrollingElement,root,...root.querySelectorAll('[role="main"] [style*="overflow"], [role="main"] [data-pagelet]')].filter(Boolean);
 const scrollable=candidates.filter(el=>el.scrollHeight>el.clientHeight+100 && el.clientHeight>200);
 return scrollable.sort((a,b)=>b.clientHeight-a.clientHeight)[0]||document.scrollingElement;
}
async function scan(mode){
 if(state.running)return;
 if(!confirm('Bạn đã mở đúng tab '+(mode==='following'?'Đang theo dõi':'Người theo dõi')+' trên Facebook chưa?'))return;
 state.running=true;state.stop=false;
 let steps=0,idle=0,fresh=0,completed=false,reason='';
 try{
  const limit=120;
  for(;steps<limit&&!state.stop;steps++){
   const newly=collect(mode);fresh+=newly;
   idle=newly===0?idle+1:0;
   const el=scroller();if(!el){reason='Không tìm thấy vùng cuộn.';break;}
   const bottom=el.scrollTop+el.clientHeight>=el.scrollHeight-90;
   if(idle>=4){
    completed=bottom;
    reason=bottom?'Đã tới cuối và không có tài khoản mới.':'Không có hồ sơ mới sau 4 lượt; có thể dữ liệu chưa tải đủ.';
    break;
   }
   status('Đang quét: lượt '+(steps+1)+'/'+limit+' | mới lưu '+fresh+' hồ sơ | không có người mới '+idle+'/4. Có thể nhấn Dừng.');
   const before=el.scrollTop;
   el.scrollBy({top:Math.max(350,Math.round(el.clientHeight*0.75)),behavior:'instant'});
   await nap(1200);
   if(el.scrollTop===before&&bottom&&idle>=2){completed=true;reason='Đã tới cuối danh sách.';break;}
  }
  fresh+=collect(mode);
  if(state.stop)reason='Bạn đã dừng quét.';
  if(steps>=limit)reason='Đã chạm giới hạn 120 lượt cuộn.';
  db.scans[mode]={at:Date.now(),completed:completed&&!state.stop,count:Object.keys(db[mode]).length};
  save();
  status('Kết thúc: lưu '+Object.keys(db[mode]).length+' hồ sơ ('+fresh+' mới). '+(reason||'Chưa xác nhận quét đủ.'));
 }catch(e){status('Lỗi quét: '+e.message);}
 finally{state.running=false;render();}
}
function pending(){
 return Object.values(db.following).filter(p=>!p.unfollowedAt&&!db.followers[p.id]);
}
function render(){
 const e=document.querySelector('#cf-stats');if(!e)return;
 const f=Object.values(db.following).filter(p=>!p.unfollowedAt);
 const miss=f.filter(p=>!db.followers[p.id]);
 e.textContent='Đang theo dõi: '+f.length+' | Follower: '+Object.keys(db.followers).length+' | Chưa thấy follow lại: '+miss.length+'';

}
function csv(){
 const rows=[['Tên','URL','Follow lại','Thời điểm ghi nhận']];
 for(const p of Object.values(db.following))rows.push([p.name,p.url,db.followers[p.id]?'Có':'Chưa thấy',new Date(p.firstSeen).toLocaleString('vi-VN')]);
 const payload='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const href=URL.createObjectURL(new Blob([payload],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=href;a.download='cheo-follow-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1500);
}
// Không đoán nhãn nút: chỉ thực hiện khi xác định đúng menu bỏ theo dõi.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const isUnfollow=t=>/^(bỏ theo dõi|hủy theo dõi|unfollow)(\\s|$)/i.test(norm(t));
function locateRow(profile){
 const matches=visible().filter(x=>x.id===profile.id);
 for(const m of matches){
  let e=m.node;
  for(let k=0;k<6&&e;k++,e=e.parentElement){
   const txt=norm(e.innerText||'');
   const links=e.querySelectorAll('a[href]').length;
   const buttons=e.querySelectorAll('button,[role="button"]').length;
   if(txt.includes(m.name)&&buttons>0&&links<=5&&txt.length<450)return e;
  }
 }
 return null;
}
async function unfollowVisible(profile){
 const row=locateRow(profile);
 if(!row)return false;
 const btns=[...row.querySelectorAll('button,[role="button"]')].filter(e=>!e.closest('#cf-panel'));
 const direct=btns.find(e=>isUnfollow(e.innerText||e.getAttribute('aria-label')||''));
 if(direct){direct.click();await pause(400);return true;}
 // Chỉ mở menu tác vụ rõ ràng, tuyệt đối không tự đoán nút theo vị trí.
 const menu=btns.find(e=>/^(tùy chọn|tùy chọn khác|xem thêm|more|more options|actions|\\.\\.\\.|…)$|menu/i.test(norm(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText)));
 if(!menu)return false;
 menu.click();await pause(420);
 const opts=[...document.querySelectorAll('[role="menuitem"],[role="menu"] [role="button"],[role="menu"] button')];
 const choice=opts.find(e=>isUnfollow(e.innerText||e.getAttribute('aria-label')||''));
 if(!choice){menu.click();return false;}
 choice.click();await pause(500);
 // Facebook đôi khi hỏi xác nhận lần hai.
 const dialogs=[...document.querySelectorAll('[role="dialog"]')];
 if(dialogs.length){
  const actions=[...dialogs.at(-1).querySelectorAll('button,[role="button"]')];
  const confirmBtn=actions.find(e=>isUnfollow(e.innerText||e.getAttribute('aria-label')||''));
  if(!confirmBtn){status('Facebook hiện hộp thoại không nhận diện được. Đã dừng để tránh gỡ nhầm.');state.stop=true;return false;}
  confirmBtn.click();await pause(350);
 }
 return true;
}
async function reviewBatch(){
 if(state.running)return;
 const people=pending();
 if(!people.length)return status('Không có hồ sơ chưa tìm thấy follow lại.');
 const fc=db.scans.followers,fl=db.scans.following;
 if(!fc||!fl)return status('Hãy quét cả hai danh sách ít nhất một lần.');
 
 if(!/sk=following/i.test(location.search)&&!/(following)/i.test(location.pathname))return status('Hãy mở tab Đang theo dõi của chính bạn trước.');
 if(!confirm('Sắp thử hủy theo dõi các hồ sơ chưa xuất hiện trong danh sách follower đã quét. Thao tác ảnh hưởng trực tiếp tới Facebook và không thể hoàn tác tự động. Tiếp tục?'))return;
 state.running=true;state.stop=false;
 let done=0,skipped=0,steps=0;
 const processed=new Set();
 try{
  while(!state.stop&&steps<120){
   const current=visible().filter(x=>db.following[x.id]&&!db.followers[x.id]&&!db.following[x.id].unfollowedAt&&!processed.has(x.id));
   for(const x of current){
    if(state.stop)break;
    processed.add(x.id);
    const ok=await unfollowVisible(x);
    if(ok){db.following[x.id].unfollowedAt=Date.now();done++;save();}
    else skipped++;
    status('Đã thử hủy '+done+' | Không thao tác được '+skipped+' | Nhấn Dừng để ngắt.');
    await pause(700);
   }
   const el=scroller();if(!el)break;
   const old=el.scrollTop;el.scrollBy({top:Math.max(400,Math.round(el.clientHeight*.75)),behavior:'instant'});
   await pause(900);steps++;
   if(el.scrollTop===old)break;
  }
  status('Kết thúc: '+done+' hồ sơ đã thao tác; '+skipped+' hồ sơ không tìm được nút phù hợp. Hãy kiểm tra lại trên Facebook.');
 }catch(e){status('Đã dừng vì lỗi: '+e.message);}
 finally{state.running=false;render();}
}
const style=document.createElement('style');
style.textContent='#cf-toggle{position:fixed!important;top:38%!important;left:0!important;right:auto!important;bottom:auto!important;display:block;background:#2563eb;color:white;border:0;border-radius:25px;padding:10px 15px;z-index:2147483647;cursor:pointer}#cf-panel{position:fixed!important;top:16%!important;left:12px!important;right:auto!important;bottom:auto!important;width:340px;max-height:78vh;overflow:auto;box-sizing:border-box;background:#fff;color:#182433;border:2px solid #2563eb;border-radius:12px;padding:12px;z-index:2147483647;font:13px/1.5 Arial;box-shadow:0 10px 30px #0004}#cf-panel[hidden],#cf-toggle[hidden]{display:none!important}#cf-panel button{padding:6px 9px;margin:3px;background:#e5edff;color:#182433;border:1px solid #a9c3fc;border-radius:6px;cursor:pointer}#cf-panel a{color:#155ed6}#cf-status{white-space:pre-wrap;margin:10px 0}#cf-list{max-height:180px;overflow:auto}';
(document.head||document.documentElement).append(style);
const toggle=document.createElement('button');toggle.id='cf-toggle';toggle.textContent='☰ Mở Follow Checker';(document.body||document.documentElement).append(toggle);
const panel=document.createElement('div');panel.id='cf-panel';panel.hidden=false;
panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b>Facebook Follow Checker 24H</b><button id="cf-close" title="Ẩn bảng điều khiển">− Ẩn</button></div><p id="cf-stats"></p><button id="cf-following">↻ Cuộn + lưu Đang theo dõi</button><button id="cf-followers">↻ Cuộn + lưu Người theo dõi</button><button id="cf-stop">■ Dừng</button><p id="cf-status">Chọn đúng tab danh sách Facebook trước khi cuộn.</p><button id="cf-export">Xuất CSV</button><div style="margin:9px 0;padding:8px;border:1px solid #d1d5db;border-radius:8px"><b>Quản lý dữ liệu</b><div><button id="cf-clear-following">Xóa Đang theo dõi</button><button id="cf-clear-followers">Xóa Người theo dõi</button><button id="cf-clear-all">Xóa tất cả</button></div></div><button id="cf-review" style="background:#dc2626;color:white">Hủy follow người không theo dõi lại</button>';
(document.body||document.documentElement).append(panel);
toggle.hidden=true;
try { GM_registerMenuCommand('Mở Follow Checker',()=>{panel.hidden=false;toggle.hidden=true;render();}); } catch(e) { console.warn('Menu command unavailable',e); }
toggle.onclick=()=>{toggle.hidden=true;panel.hidden=false;render();};
panel.querySelector('#cf-close').onclick=()=>{panel.hidden=true;toggle.hidden=false;};
panel.querySelector('#cf-following').onclick=()=>scan('following');
panel.querySelector('#cf-followers').onclick=()=>scan('followers');
panel.querySelector('#cf-stop').onclick=()=>{state.stop=true;status('Đang dừng...');};
panel.querySelector('#cf-export').onclick=csv;
function clearList(which){
 if(state.running){status('Hãy dừng quét trước khi xóa dữ liệu.');return;}
 const label=which==='following'?'danh sách Đang theo dõi':which==='followers'?'danh sách Người theo dõi':'TOÀN BỘ dữ liệu';
 const count=which==='all'?Object.keys(db.following).length+Object.keys(db.followers).length:Object.keys(db[which]).length;
 if(!confirm('Bạn chắc chắn muốn xóa '+label+' ('+count+' hồ sơ)? Thao tác này không thể hoàn tác.'))return;
 if(which==='all'){db.following={};db.followers={};db.scans={};}
 else {db[which]={};delete db.scans[which];}
 save();render();status('Đã xóa '+label+'.');
}
panel.querySelector('#cf-clear-following').onclick=()=>clearList('following');
panel.querySelector('#cf-clear-followers').onclick=()=>clearList('followers');
panel.querySelector('#cf-clear-all').onclick=()=>clearList('all');
panel.querySelector('#cf-review').onclick=reviewBatch;
render();
console.info('[Follow Checker] floating controls mounted');
})();