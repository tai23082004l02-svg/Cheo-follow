// ==UserScript==
// @name         Facebook Comment Follow
// @namespace    cheo-follow.comment
// @version      2.1.0
// @description  Quét bình luận, tạo danh sách; chỉ Follow và Like khi người dùng nhấn từng mục.
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
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const txt=e=>norm(e?.innerText||e?.textContent||e?.getAttribute?.('aria-label')||'');
const isFollow=s=>/^(theo dõi|follow)$/i.test(norm(s));
const isLike=s=>/^(thích|like)$/i.test(norm(s));
const isVisible=e=>!!(e&&e.isConnected&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height);
const S={running:false,stop:false,steps:0,found:new Map(),seq:0,skip:false};
const css=document.createElement('style');
css.textContent='#ccf-panel{position:fixed!important;top:110px!important;right:12px!important;width:340px!important;max-height:80vh!important;overflow:auto!important;background:#fff!important;color:#172033!important;border:2px solid #2563eb!important;border-radius:12px!important;padding:12px!important;z-index:2147483647!important;box-shadow:0 8px 30px #0005!important;font:13px Arial!important}#ccf-panel button{margin:3px!important;padding:7px 9px!important;border:1px solid #bdd0ff!important;border-radius:7px!important;background:#e8efff!important;color:#13233a!important;cursor:pointer!important}#ccf-panel button:disabled{opacity:.5!important}#ccf-panel[hidden],#ccf-open[hidden]{display:none!important}#ccf-open{position:fixed!important;right:0!important;top:35%!important;z-index:2147483647!important;background:#2563eb!important;color:white!important;border:0!important;padding:12px!important;border-radius:8px 0 0 8px!important}.ccf-person{padding:7px 0;border-bottom:1px solid #ddd}.ccf-hit{outline:2px solid #10b981!important;outline-offset:2px!important}';
(document.head||document.documentElement).append(css);
const panel=document.createElement('div');panel.id='ccf-panel';
panel.innerHTML='<b>Facebook Comment Follow v2.1</b><button id="ccf-hide">Ẩn</button><p id="ccf-count">Tìm thấy 0 người</p><button id="ccf-scroll">Tìm kiếm</button><button id="ccf-stop">■ Dừng</button><button id="ccf-review">Kiểm tra toàn bộ danh sách</button><button id="ccf-clear">Xóa danh sách</button><p id="ccf-status">Mở bình luận bài viết rồi bắt đầu quét.</p><div id="ccf-people" style="max-height:38vh;overflow:auto"></div><small>Kiểm tra toàn bộ không tự Follow/Like. Mỗi nút Follow + Like vẫn cần bạn chủ động bấm.</small>';
const show=document.createElement('button');show.id='ccf-open';show.textContent='☰ Comment Follow';show.hidden=true;
(document.body||document.documentElement).append(panel,show);
const $=id=>panel.querySelector('#'+id);
const status=s=>$('ccf-status').textContent=s;
function dialogRoot(){
 return [...document.querySelectorAll('[role="dialog"]')].filter(isVisible).sort((a,b)=>b.getBoundingClientRect().height-a.getBoundingClientRect().height)[0]||document.querySelector('[role="main"]')||document.body;
}
function clickableFollow(el){
 if(!isFollow(txt(el)))return null;
 const e=el.closest('a,[role="button"],button')||el;
 if(e.closest('#ccf-panel'))return null;
 return isVisible(e)?e:null;
}
function findComment(el){
 let node=el;
 for(let i=0;i<9&&node;i++,node=node.parentElement){
  const t=txt(node);
  if(t.length>1200)break;
  const actions=[...node.querySelectorAll('[role="button"],button,a,span')].filter(a=>a!==el&&isVisible(a)&&isLike(txt(a)));
  if(actions.length){
   const nameNode=el.parentElement;
   const name=norm((nameNode?.innerText||'').split(/(?:Theo dõi|Follow)/i)[0]).replace(/\s*[·•]\s*\d+.*$/,'').slice(0,90);
   return {container:node,like:actions[0],name:name||'Người bình luận'};
  }
  // Some Facebook comment rows show the Like action only as an unlabeled thumbs-up icon.
  if(t.length>30&&t.length<500&&/Trả lời|Reply/.test(t)){
   const name=norm((el.parentElement?.innerText||'').split(/(?:Theo dõi|Follow)/i)[0]).replace(/\s*[·•]\s*\d+.*$/,'').slice(0,90);
   return {container:node,like:null,name:name||'Người bình luận'};
  }
 }
 return null;
}
function getCard(node){
 let el=node;
 for(let i=0;i<12&&el;i++,el=el.parentElement){
  if(el===dialogRoot()||el===document.body)break;
  const text=txt(el);
  if(text.length>1300)break;
  const followCount=[...el.querySelectorAll('span,a,[role="button"]')].filter(x=>x.children.length===0&&isFollow(txt(x))).length;
  const reply=/(Trả lời|Reply)/i.test(text);
  if(reply&&followCount===1&&el.getBoundingClientRect().height>=75)return el;
 }
 return null;
}
function cardName(card,followNode){
 const line=norm(card.innerText||'').split('\n').map(norm).filter(Boolean);
 const entry=line.find(x=>x.includes('Theo dõi')||x.includes('Follow'))||'';
 const candidate=entry.split(/\s*[·•]\s*|\s+Theo dõi|\s+Follow/i)[0].trim();
 if(candidate.length>1&&candidate.length<85)return candidate;
 const anchors=[...card.querySelectorAll('a[href]')].filter(isVisible);
 const match=anchors.map(a=>norm(a.innerText)).find(x=>x.length>1&&x.length<85&&!isFollow(x)&&!/Trả lời|Chia sẻ|Reply|Share/i.test(x));
 return match||'Không rõ tên';
}
function likeFor(card){
 // Facebook shows a thumbs-up SVG with accessible name "Thích".
 const icons=[...card.querySelectorAll('svg[aria-label],svg[role="img"]')].filter(isVisible);
 const likes=icons.filter(e=>isLike(e.getAttribute('aria-label')||e.querySelector('title')?.textContent||''));
 if(likes.length!==1)return null;
 const icon=likes[0];
 let target=icon.closest('[role="button"],button,a');
 if(!target){
  let e=icon.parentElement;
  for(let i=0;i<4&&e;i++,e=e.parentElement){
   const r=e.getBoundingClientRect();
   if(r.width>=15&&r.width<=90&&r.height>=15&&r.height<=55){target=e;break;}
  }
 }
 return target&&isVisible(target)?target:null;
}
const elementIds=new WeakMap();
function followNodes(){
 const r=dialogRoot(),w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),nodes=[];
 while(w.nextNode()){
  const t=w.currentNode;
  if(!isFollow(t.textContent))continue;
  const e=t.parentElement;
  if(e&&isVisible(e)&&!e.closest('#ccf-panel'))nodes.push(e);
 }
 return nodes;
}
function nearestComment(node){
 let p=node;
 for(let i=0;i<12&&p&&p!==dialogRoot();i++,p=p.parentElement){
  const t=txt(p);
  if(t.length>1100)break;
  const replies=[...p.querySelectorAll('span,[role="button"],button')].filter(x=>x.children.length===0&&/^(Trả lời|Reply)$/i.test(txt(x)));
  if(replies.length&&p.getBoundingClientRect().height>35){
   const follows=followNodes().filter(n=>p.contains(n));
   if(follows.length===1)return p;
  }
 }
 return node.parentElement?.parentElement?.parentElement||node.parentElement;
}
function locateName(node,card){
 const r=node.getBoundingClientRect();
 // Facebook author's name sits on the same line immediately left of "Theo dõi".
 const links=[...card.querySelectorAll('a[href]')].filter(isVisible).map(el=>{
  const b=el.getBoundingClientRect();
  return {el,b,dist:Math.abs((b.top+b.bottom)/2-(r.top+r.bottom)/2)};
 }).filter(x=>x.b.right<=r.left+12&&x.dist<24&&norm(x.el.innerText).length>1);
 links.sort((a,b)=>a.dist-b.dist||b.b.right-a.b.right);
 if(links[0])return norm(links[0].el.innerText).slice(0,80);
 const t=norm(card.innerText||'');
 const head=t.split(/Theo dõi|Follow/i)[0].split('·')[0].trim();
 return head.length>1&&head.length<75?head:'Người bình luận';
}
function collect(){
 let added=0;
 for(const node of followNodes()){
  const follow=node.closest('a,button,[role="button"]')||node;
  const card=nearestComment(node);
  const name=locateName(node,card);
  // Deduplicate only the same comment when Facebook re-renders it.
  // Never filter by previous follow history.
  const profile=[...card.querySelectorAll('a[href]')].find(a=>a.getBoundingClientRect().width>0&&
    (a.innerText||'').trim()===name)?.href||'';
  const snippet=(card.innerText||'').replace(/\s+/g,' ').trim().slice(0,220);
  const stable=profile&&snippet.length>20?profile+'|'+snippet:null;
  let key=stable||elementIds.get(node);
  if(!key){key='comment-'+(++S.seq);}
  elementIds.set(node,key);
  let item=S.found.get(key);
  if(!item){item={id:S.seq,key,name,follow,like:null,state:'ready'};S.found.set(key,item);added++;}
  else {if(item.state!=='done'&&item.state!=='partial')item.follow=follow;item.name=name;}
  item.like=likeFor(card);
  follow.classList.add('ccf-hit');
 }
 render();return added;
}
function render(){
 $('ccf-count').textContent='Đã tìm '+S.found.size+' người | Lượt cuộn: '+S.steps;
 const root=$('ccf-people');root.replaceChildren();
 for(const p of S.found.values()){
  const row=document.createElement('div');row.className='ccf-person';
  const title=document.createElement('span');title.textContent=p.name+' — '+(p.state==='done'?'Đã nhấn':p.state==='partial'?'Cần Like thủ công':p.state==='lost'?'Không còn trên màn hình':'Chưa xử lý');
  const btn=document.createElement('button');btn.textContent='Follow + Like';btn.disabled=p.state==='done';
  btn.onclick=()=>act(p);
  row.append(title,document.createElement('br'),btn);root.append(row);
 }
}
async function act(p){
 if(!isVisible(p.follow)){p.state='lost';render();status('Bình luận này đã bị Facebook bỏ khỏi vùng hiển thị khi cuộn. Hãy cuộn tới bình luận rồi nhấn Tìm trên màn hình.');return;}
 // The user clicks for this particular comment: do not run any bulk actions.
 const follow=p.follow;
 const like=p.like;
 follow.click();await nap(300);
 if(isVisible(like)&&!isFollow(txt(like))){like.click();p.state='done';status('Đã nhấn Follow và Like cho '+p.name+'. Kiểm tra trên Facebook để xác nhận.');}
 else{p.state='partial';status('Đã nhấn Follow cho '+p.name+', nhưng chưa nhận diện chắc chắn nút Like. Bạn hãy Like bình luận thủ công.');}
 render();
}
function scroller(){
 const r=dialogRoot();
 // Prefer the scrollable Facebook dialog; don't accidentally scroll the control panel.
 const els=[r,...r.querySelectorAll('div')].filter(e=>!e.closest('#ccf-panel')&&e.clientHeight>180&&e.scrollHeight>e.clientHeight+100);
 els.sort((a,b)=>{
  const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
  return (br.height>300?1:0)-(ar.height>300?1:0)||b.clientHeight-a.clientHeight;
 });
 return els[0]||document.scrollingElement;
}
function visibleFollowCount(){
 const area=dialogRoot().getBoundingClientRect();
 let count=0;
 for(const el of followNodes()){
  if(!isVisible(el)||el.closest('#ccf-panel'))continue;
  const r=el.getBoundingClientRect();
  if(r.top>=area.top+55&&r.bottom<=area.bottom-45&&r.top<innerHeight&&r.bottom>0)count++;
 }
 return count;
}
async function scan(){
 if(S.running)return;
 S.running=true;S.stop=false;
 let stuck=0;
 try{
  for(let i=0;i<120&&!S.stop;i++){
   collect();
   const el=scroller(),before=el.scrollTop;
   const step=Math.max(110,Math.min(240,Math.round(el.clientHeight*.25)));
   el.scrollBy({top:step,behavior:'instant'});
   await nap(850);
   collect();
   S.steps=i+1;render();
   stuck=el.scrollTop===before?stuck+1:0;
   status('Đang tìm kiếm và tự cuộn: '+S.steps+'/120 | đã tìm '+S.found.size+' người.');
   if(stuck>=5){status('Đã tới cuối vùng cuộn. Đã tìm '+S.found.size+' người.');break;}
  }
  if(S.stop)status('Đã dừng. Đã tìm '+S.found.size+' người.');
  else if(S.steps>=120)status('Đạt 120 lượt cuộn. Có thể tìm kiếm tiếp.');
 }catch(e){status('Lỗi: '+e.message);}
 finally{S.running=false;}
}
$('ccf-review').onclick=()=>{
 let available=0,missing=0,processed=0;
 for(const p of S.found.values()){
  if(p.state==='done'||p.state==='partial'){processed++;continue;}
  if(isVisible(p.follow)&&isFollow(txt(p.follow))){p.state='ready';available++;}
  else{p.state='lost';missing++;}
 }
 render();
 status('Kiểm tra '+S.found.size+' mục: '+available+' còn nút Theo dõi, '+missing+' không còn hiển thị, '+processed+' đã thao tác. Không có Follow/Like tự động.');
};
$('ccf-scroll').onclick=scan;
$('ccf-stop').onclick=()=>{S.stop=true;status('Đang dừng...')};
$('ccf-clear').onclick=()=>{document.querySelectorAll('.ccf-hit').forEach(e=>e.classList.remove('ccf-hit'));S.found.clear();S.steps=0;render();status('Đã xóa danh sách.')};
$('ccf-hide').onclick=()=>{panel.hidden=true;show.hidden=false};
show.onclick=()=>{panel.hidden=false;show.hidden=true};
render();
})();