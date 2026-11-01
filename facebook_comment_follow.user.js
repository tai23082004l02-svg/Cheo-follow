// ==UserScript==
// @name         Facebook Comment Follow
// @namespace    cheo-follow.comment
// @version      1.2.0
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
const S={running:false,stop:false,steps:0,found:new Map(),seq:0};
const css=document.createElement('style');
css.textContent='#ccf-panel{position:fixed!important;top:110px!important;right:12px!important;width:340px!important;max-height:80vh!important;overflow:auto!important;background:#fff!important;color:#172033!important;border:2px solid #2563eb!important;border-radius:12px!important;padding:12px!important;z-index:2147483647!important;box-shadow:0 8px 30px #0005!important;font:13px Arial!important}#ccf-panel button{margin:3px!important;padding:7px 9px!important;border:1px solid #bdd0ff!important;border-radius:7px!important;background:#e8efff!important;color:#13233a!important;cursor:pointer!important}#ccf-panel button:disabled{opacity:.5!important}#ccf-panel[hidden],#ccf-open[hidden]{display:none!important}#ccf-open{position:fixed!important;right:0!important;top:35%!important;z-index:2147483647!important;background:#2563eb!important;color:white!important;border:0!important;padding:12px!important;border-radius:8px 0 0 8px!important}.ccf-person{padding:7px 0;border-bottom:1px solid #ddd}.ccf-hit{outline:2px solid #10b981!important;outline-offset:2px!important}';
(document.head||document.documentElement).append(css);
const panel=document.createElement('div');panel.id='ccf-panel';
panel.innerHTML='<b>Facebook Comment Follow v1.2</b><button id="ccf-hide">Ẩn</button><p id="ccf-count">Tìm thấy 0 người</p><button id="ccf-find">Tìm trên màn hình</button><button id="ccf-scroll">Tự cuộn + lập danh sách</button><button id="ccf-stop">■ Dừng</button><button id="ccf-clear">Xóa danh sách</button><p id="ccf-status">Mở bình luận bài viết rồi bắt đầu quét.</p><div id="ccf-people" style="max-height:38vh;overflow:auto"></div><small>Chỉ bấm Follow + Like khi bạn chọn từng người. Nếu Facebook không nhận diện nút Thích, bạn sẽ cần Like thủ công.</small>';
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
function collect(){
 let added=0;
 const root=dialogRoot();
 // Search exact visible text nodes. Facebook often renders "Theo dõi" inside nested spans.
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode()){
  const t=walker.currentNode;
  if(isFollow(t.textContent))nodes.push(t.parentElement);
 }
 for(const node of nodes){
  if(!node||!isVisible(node)||node.closest('#ccf-panel'))continue;
  // A follower link can be a span nested inside a clickable text wrapper.
  const btn=node.closest('a,[role="button"],button')||node;
  const rect=btn.getBoundingClientRect();
  if(rect.width>170||rect.height>65)continue;
  let parent=node;
  let container=null, name='';
  for(let i=0;i<7&&parent;i++,parent=parent.parentElement){
   const t=txt(parent);
   if(t.length>950)break;
   const links=[...parent.querySelectorAll('a[href]')].filter(isVisible);
   const named=links.map(a=>norm(a.innerText)).find(x=>x.length>1&&x.length<75&&!isFollow(x));
   if(named && parent.getBoundingClientRect().height>35){container=parent;name=named;break;}
  }
  if(!container){
   container=node.parentElement?.parentElement?.parentElement;
   const raw=norm(container?.innerText||'').split(/Theo dõi|Follow/i)[0];
   name=raw.split('·')[0].slice(0,70)||'Người bình luận';
  }
  if(!container)continue;
  const key=name.toLowerCase();
  let item=S.found.get(key);
  if(!item){
   item={id:++S.seq,key,name,follow:btn,like:null,state:'ready'};
   S.found.set(key,item);added++;
  }else item.follow=btn;
  // Like is optional. Search within the nearest comment ancestor, not entire post.
  let box=container;
  for(let k=0;k<5&&box;k++,box=box.parentElement){
   const actions=[...box.querySelectorAll('[role="button"],button,a,span')].filter(e=>isVisible(e)&&isLike(e.getAttribute('aria-label')||e.innerText||''));
   if(actions.length===1){item.like=actions[0];break;}
   if(txt(box).length>1200)break;
  }
  btn.classList.add('ccf-hit');
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
 if(S.running){status('Hãy dừng cuộn trước khi thao tác.');return;}
 if(!isVisible(p.follow)){p.state='lost';render();status('Bình luận này đã bị Facebook bỏ khỏi vùng hiển thị khi cuộn. Hãy cuộn tới bình luận rồi nhấn Tìm trên màn hình.');return;}
 // The user clicks for this particular comment: do not run any bulk actions.
 const follow=p.follow;
 const like=p.like;
 follow.click();await nap(300);
 if(isVisible(like)&&isLike(txt(like))){like.click();p.state='done';status('Đã nhấn Follow và Like cho '+p.name+'. Kiểm tra trên Facebook để xác nhận.');}
 else{p.state='partial';status('Đã nhấn Follow cho '+p.name+', nhưng chưa nhận diện chắc chắn nút Like. Bạn hãy Like bình luận thủ công.');}
 render();
}
function scroller(){
 const r=dialogRoot();
 const els=[r,...r.querySelectorAll('div')].filter(e=>e.clientHeight>180&&e.scrollHeight>e.clientHeight+100);
 els.sort((a,b)=>b.clientHeight-a.clientHeight);
 return els[0]||document.scrollingElement;
}
async function scan(){
 if(S.running)return;S.running=true;S.stop=false;let idle=0;
 try{
  for(let i=0;i<120&&!S.stop;i++){
   const n=collect();idle=n?0:idle+1;S.steps=i+1;render();
   status('Quét lượt '+S.steps+'/120 — tìm '+S.found.size+' người');
   if(idle>=8){status('Không phát hiện thêm người mới trong 8 lượt.');break;}
   const el=scroller(),before=el.scrollTop;
   el.scrollBy({top:Math.max(300,Math.round(el.clientHeight*.7)),behavior:'instant'});
   await nap(1100);
   if(el.scrollTop===before&&idle>=3){status('Đã tới cuối vùng cuộn.');break;}
  }
  collect();
  if(S.stop)status('Đã dừng.');
 }catch(e){status('Lỗi: '+e.message)}finally{S.running=false;}
}
$('ccf-find').onclick=()=>status('Tìm thêm '+collect()+' người trên màn hình.');
$('ccf-scroll').onclick=scan;
$('ccf-stop').onclick=()=>{S.stop=true;status('Đang dừng...')};
$('ccf-clear').onclick=()=>{document.querySelectorAll('.ccf-hit').forEach(e=>e.classList.remove('ccf-hit'));S.found.clear();S.steps=0;render();status('Đã xóa danh sách.')};
$('ccf-hide').onclick=()=>{panel.hidden=true;show.hidden=false};
show.onclick=()=>{panel.hidden=false;show.hidden=true};
render();
})();