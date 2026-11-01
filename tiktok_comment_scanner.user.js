// ==UserScript==
// @name         TikTok Comment Scanner
// @namespace    cheo-follow.tiktok
// @version      1.0.0
// @description  Quét người bình luận TikTok, tự cuộn, lưu danh sách và xuất CSV. Không tự follow hoặc like.
// @match        https://www.tiktok.com/*
// @match        https://tiktok.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/tai23082004l02-svg/Cheo-follow/main/tiktok_comment_scanner.user.js
// @downloadURL  https://raw.githubusercontent.com/tai23082004l02-svg/Cheo-follow/main/tiktok_comment_scanner.user.js
// ==/UserScript==
(()=>{
'use strict';
if(document.querySelector('#ttcs-panel'))return;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state={running:false,stop:false,steps:0,items:new Map()};
const css=document.createElement('style');
css.textContent='#ttcs-panel{position:fixed!important;right:16px!important;top:95px!important;width:330px!important;max-height:80vh!important;overflow:auto!important;background:#171717!important;color:#fff!important;border:2px solid #fe2c55!important;border-radius:12px!important;padding:13px!important;font:13px Arial!important;z-index:2147483647!important;box-shadow:0 6px 24px #0008!important}#ttcs-panel button{padding:7px 9px!important;margin:3px!important;border:1px solid #777!important;border-radius:6px!important;background:#292929!important;color:white!important;cursor:pointer!important}#ttcs-panel a{color:#69c9d0!important}#ttcs-panel[hidden],#ttcs-open[hidden]{display:none!important}#ttcs-list{max-height:38vh;overflow:auto}.ttcs-item{padding:7px 0;border-bottom:1px solid #555}#ttcs-open{position:fixed!important;right:0!important;top:30%!important;z-index:2147483647!important;background:#fe2c55!important;color:white!important;border:0!important;padding:12px!important;border-radius:8px 0 0 8px!important}';
document.head.append(css);
const panel=document.createElement('div');panel.id='ttcs-panel';
panel.innerHTML='<strong>TikTok Comment Scanner v1.0</strong><button id="ttcs-hide">Ẩn</button><p id="ttcs-count">Đã tìm 0 tài khoản | Cuộn: 0</p><button id="ttcs-find">Tìm kiếm</button><button id="ttcs-stop">■ Dừng</button><button id="ttcs-clear">Xóa danh sách</button><button id="ttcs-export">Xuất CSV</button><p id="ttcs-status">Mở bình luận TikTok rồi nhấn Tìm kiếm.</p><div id="ttcs-list"></div><small>Bản thử nghiệm: chỉ thu thập tên và hồ sơ hiển thị. Mở hồ sơ để kiểm tra Follow/Following.</small>';
const open=document.createElement('button');open.id='ttcs-open';open.textContent='TikTok Scanner';open.hidden=true;
document.body.append(panel,open);
const $=s=>panel.querySelector('#'+s);
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const visible=e=>!!(e&&e.isConnected&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height);
const status=s=>$('ttcs-status').textContent=s;
function commentRoots(){
 const sections=[...document.querySelectorAll('[data-e2e="comment-list"],[data-e2e="comment-level-1"],[data-e2e="comment-item"],[class*="DivCommentListContainer"],[class*="DivCommentItemContainer"]')].filter(visible);
 const list=sections.filter(e=>e.matches('[data-e2e="comment-list"],[class*="DivCommentListContainer"]'));
 return list.length?list:sections;
}
function candidateRows(){
 const root=commentRoots();
 const rows=new Set();
 for(const e of root){
  if(e.matches('[data-e2e="comment-item"],[data-e2e="comment-level-1"],[class*="DivCommentItemContainer"]'))rows.add(e);
  for(const row of e.querySelectorAll('[data-e2e="comment-item"],[data-e2e="comment-level-1"],[class*="DivCommentItemContainer"]'))rows.add(row);
 }
 // TikTok changes class names frequently; fallback to profile links inside comments.
 if(!rows.size){
  for(const a of document.querySelectorAll('a[href*="/@"]')){
   if(!visible(a)||a.closest('#ttcs-panel'))continue;
   let p=a.parentElement;
   for(let i=0;i<5&&p;i++,p=p.parentElement){
    if(p.querySelector('[data-e2e="comment-text"],[data-e2e="comment-reply-1"],[class*="CommentText"]')){rows.add(p);break;}
   }
  }
 }
 return [...rows].filter(visible);
}
function collect(){
 let newCount=0;
 for(const row of candidateRows()){
  const links=[...row.querySelectorAll('a[href*="/@"]')].filter(visible);
  if(!links.length)continue;
  const link=links[0];
  let url;
  try{const u=new URL(link.href,location.href);if(!/tiktok\.com$/.test(u.hostname)&&!/\.tiktok\.com$/.test(u.hostname))continue;url=u.origin+u.pathname;}catch{continue;}
  const name=norm(link.innerText||link.getAttribute('title')||link.textContent)||decodeURIComponent(url.split('/@')[1]||'');
  if(!name)continue;
  const text=norm(row.querySelector('[data-e2e="comment-text"],[class*="CommentText"]')?.innerText||'').slice(0,220);
  const key=url;
  const previous=state.items.get(key);
  if(!previous){state.items.set(key,{name,url,comment:text,count:1});newCount++;}
  else if(text&&previous.comment!==text){previous.count++;if(!previous.comment)previous.comment=text;}
 }
 render();
 return newCount;
}
function render(){
 $('ttcs-count').textContent='Đã tìm '+state.items.size+' tài khoản | Cuộn: '+state.steps;
 const list=$('ttcs-list');list.replaceChildren();
 for(const p of state.items.values()){
  const row=document.createElement('div');row.className='ttcs-item';
  const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=p.name;
  const detail=document.createElement('div');detail.textContent=p.comment.slice(0,100);
  row.append(a,detail);list.append(row);
 }
}
function scroller(){
 const roots=commentRoots();
 const candidates=new Set();
 for(const root of roots){
  for(let el=root;el&&el!==document.body;el=el.parentElement){
   if(el.scrollHeight>el.clientHeight+100&&el.clientHeight>150)candidates.add(el);
  }
 }
 const all=[...candidates];
 all.sort((a,b)=>{
  const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
  return Math.abs(ra.width-500)-Math.abs(rb.width-500)||b.clientHeight-a.clientHeight;
 });
 return all[0]||null;
}
async function scan(){
 if(state.running)return;
 state.running=true;state.stop=false;
 let stuck=0;
 try{
  for(let i=0;i<120&&!state.stop;i++){
   collect();
   const target=scroller();
   if(!target){status('Không xác định được vùng cuộn bình luận. Hãy mở phần bình luận của video.');break;}
   const before=target.scrollTop;
   const step=Math.max(140,Math.min(360,Math.round(target.clientHeight*.45)));
   target.scrollBy({top:step,behavior:'instant'});
   await wait(1000);
   collect();state.steps++;
   stuck=Math.abs(target.scrollTop-before)<2?stuck+1:0;
   status('Đang tìm và cuộn '+state.steps+'/120; '+state.items.size+' tài khoản.');
   if(stuck>=4){status('Đã tới cuối vùng cuộn. Tìm thấy '+state.items.size+' tài khoản.');break;}
  }
  if(state.stop)status('Đã dừng. Tìm thấy '+state.items.size+' tài khoản.');
  else if(state.steps>=120)status('Đã đạt 120 lượt cuộn.');
 }catch(err){status('Lỗi khi quét: '+err.message);}
 finally{state.running=false;}
}
$('ttcs-find').onclick=scan;
$('ttcs-stop').onclick=()=>{state.stop=true;status('Đang dừng...');};
$('ttcs-clear').onclick=()=>{state.items.clear();state.steps=0;render();status('Đã xóa danh sách.');};
$('ttcs-hide').onclick=()=>{panel.hidden=true;open.hidden=false;};
open.onclick=()=>{panel.hidden=false;open.hidden=true;};
$('ttcs-export').onclick=()=>{
 if(!state.items.size){status('Danh sách trống.');return;}
 const q=x=>'"'+String(x||'').replace(/"/g,'""')+'"';
 const csv='\uFEFF'+[['Tên','Hồ sơ','Bình luận mẫu','Số bình luận đã thấy'],...[...state.items.values()].map(p=>[p.name,p.url,p.comment,p.count])].map(row=>row.map(q).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download='tiktok-comment-scanner.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
};
render();
})();