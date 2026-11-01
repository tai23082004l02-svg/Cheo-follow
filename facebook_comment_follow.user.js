// ==UserScript==
// @name         Facebook Comment Follow
// @namespace    cheo-follow.comment
// @version      1.0.0
// @description  Quét bình luận và đánh dấu nút Theo dõi / Thích để thao tác thủ công.
// @match        *://facebook.com/*
// @match        *://www.facebook.com/*
// @match        *://web.facebook.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/tai23082004l02-svg/Cheo-follow/main/facebook_comment_follow.user.js
// @downloadURL  https://raw.githubusercontent.com/tai23082004l02-svg/Cheo-follow/main/facebook_comment_follow.user.js
// ==/UserScript==
(()=>{
'use strict';
if(document.getElementById('ccf-panel'))return;
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const label=e=>(e?.innerText||e?.textContent||e?.getAttribute?.('aria-label')||'').replace(/\s+/g,' ').trim();
const follow=s=>/^(theo dõi|follow)$/i.test(s),like=s=>/^(thích|like)$/i.test(s);
const state={run:false,stop:false,found:0,steps:0,seen:new Set()};
const css=document.createElement('style');
css.textContent='#ccf-panel{position:fixed!important;top:125px!important;right:14px!important;width:305px!important;background:white!important;color:#192434!important;border:2px solid #2563eb!important;border-radius:12px!important;padding:14px!important;box-shadow:0 5px 25px #0005!important;z-index:2147483647!important;font:14px Arial!important}#ccf-panel button{padding:8px!important;margin:3px!important;border:1px solid #b0c6fa!important;border-radius:7px!important;background:#e8eeff!important;color:#192434!important;cursor:pointer!important}#ccf-panel[hidden],#ccf-open[hidden]{display:none!important}#ccf-open{position:fixed!important;right:0!important;top:38%!important;z-index:2147483647!important;padding:12px!important;background:#2563eb!important;color:white!important;border:0!important;border-radius:9px 0 0 9px!important;cursor:pointer!important}.ccf-follow-mark{outline:3px solid #10b981!important;outline-offset:3px!important;border-radius:4px!important}.ccf-like-mark{outline:2px solid #f59e0b!important;outline-offset:3px!important;border-radius:4px!important}';
(document.head||document.documentElement).append(css);
const panel=document.createElement('section');panel.id='ccf-panel';
panel.innerHTML='<b>Facebook Comment Follow</b><button id="ccf-hide">− Ẩn</button><p id="ccf-stats">Đã tìm: 0</p><button id="ccf-find">Tìm nút</button><button id="ccf-scroll">Tự cuộn + tìm</button><button id="ccf-stop">■ Dừng</button><button id="ccf-clear">Xóa đánh dấu</button><p id="ccf-status">Mở bình luận bài viết, rồi nhấn tìm.</p><small>Viền xanh: Theo dõi. Viền vàng: Thích. Bạn tự quyết định bấm, tool không tự follow/like.</small>';
const trigger=document.createElement('button');trigger.id='ccf-open';trigger.textContent='☰ Comment Follow';trigger.hidden=true;
document.body.append(panel,trigger);
const status=s=>panel.querySelector('#ccf-status').textContent=s;
const stats=()=>panel.querySelector('#ccf-stats').textContent='Đã tìm: '+state.found+' | Cuộn: '+state.steps;
const root=()=>[...document.querySelectorAll('[role="dialog"]')].filter(x=>x.getBoundingClientRect().height>140).at(-1)||document.querySelector('[role="main"]')||document.body;
function find(){
let added=0;
const all=[...root().querySelectorAll('a,button,[role="button"],span')];
for(const f of all){
 if(!follow(label(f))||!f.getBoundingClientRect().width||f.closest('#ccf-panel'))continue;
 let e=f,match=null;
 for(let i=0;i<8&&e;i++,e=e.parentElement){
  if(label(e).length>1600)break;
  const likes=[...e.querySelectorAll('a,button,[role="button"],span')].filter(x=>x!==f&&like(label(x))&&x.getBoundingClientRect().width);
  if(likes.length){match=likes[0];break;}
 }
 if(!match)continue;
 if(!state.seen.has(f)){state.seen.add(f);state.found++;added++;}
 f.classList.add('ccf-follow-mark');match.classList.add('ccf-like-mark');
}
stats();return added;
}
function scroller(){
const r=root();
return [r,...r.querySelectorAll('div')].filter(x=>x.clientHeight>180&&x.scrollHeight>x.clientHeight+100).sort((a,b)=>b.clientHeight-a.clientHeight)[0]||document.scrollingElement;
}
async function scan(){
if(state.run)return;
state.run=true;state.stop=false;let idle=0;
try{
for(let i=0;i<120&&!state.stop;i++){
 const n=find();idle=n?0:idle+1;state.steps=i+1;stats();
 if(idle>=6){status('Không có tài khoản mới sau 6 lượt.');break;}
 const el=scroller(),old=el.scrollTop;
 el.scrollBy({top:Math.max(300,Math.round(el.clientHeight*.7)),behavior:'instant'});
 await nap(950);
 if(el.scrollTop===old&&idle>=2){status('Đã tới cuối vùng cuộn.');break;}
}
find();
if(state.stop)status('Đã dừng.');else if(state.steps>=120)status('Đã đạt tối đa 120 lượt cuộn.');
}catch(e){status('Lỗi: '+e.message)}finally{state.run=false;}
}
panel.querySelector('#ccf-hide').onclick=()=>{panel.hidden=true;trigger.hidden=false;};
trigger.onclick=()=>{trigger.hidden=true;panel.hidden=false;};
panel.querySelector('#ccf-find').onclick=()=>status('Tìm thêm '+find()+' bình luận.');
panel.querySelector('#ccf-scroll').onclick=scan;
panel.querySelector('#ccf-stop').onclick=()=>{state.stop=true;status('Đang dừng...');};
panel.querySelector('#ccf-clear').onclick=()=>{document.querySelectorAll('.ccf-follow-mark,.ccf-like-mark').forEach(e=>e.classList.remove('ccf-follow-mark','ccf-like-mark'));state.seen.clear();state.found=0;state.steps=0;stats();status('Đã xóa đánh dấu.');};
stats();
})();