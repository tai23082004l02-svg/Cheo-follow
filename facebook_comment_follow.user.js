// ==UserScript==
// @name         Facebook Comment Follow
// @namespace    cheo-follow.comment
// @version      2.7.0
// @description  Quét bình luận Facebook, tìm người chưa theo dõi và chỉ Follow khi bạn chọn; không Like.
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
const randDelay=(min=500,max=1100)=>nap(Math.floor(Math.random()*(max-min+1))+min);
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const txt=e=>norm(e?.innerText||e?.textContent||e?.getAttribute?.('aria-label')||'');
const isFollow=s=>/^(theo dõi|follow)$/i.test(norm(s));
const isLike=s=>/^(thích|like)$/i.test(norm(s));

// Trạng thái đã Follow hoặc đã Like
const isAlreadyFollowed=s=>/^(đang theo dõi|following|bỏ theo dõi|unfollow)$/i.test(norm(s));
const isAlreadyLiked=s=>/^(đã thích|liked|gỡ|bỏ thích|unlike)$/i.test(norm(s));
const isVisible=e=>!!(e&&e.isConnected&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height);

// Danh sách lưu trữ Profile/User đã xử lý để tránh tương tác lặp lại
const processedUsers=new Set();
const S={running:false,stop:false,steps:0,found:new Map(),seq:0};

const css=document.createElement('style');
css.textContent='#ccf-panel{position:fixed!important;top:110px!important;right:12px!important;width:340px!important;max-height:80vh!important;overflow:auto!important;background:#fff!important;color:#172033!important;border:2px solid #2563eb!important;border-radius:12px!important;padding:12px!important;z-index:2147483647!important;box-shadow:0 8px 30px #0005!important;font:13px Arial!important}#ccf-panel button{margin:3px!important;padding:7px 9px!important;border:1px solid #bdd0ff!important;border-radius:7px!important;background:#e8efff!important;color:#13233a!important;cursor:pointer!important}#ccf-panel button:disabled{opacity:.5!important}#ccf-panel button.btn-auto{background:#10b981!important;color:#fff!important;border-color:#059669!important;font-weight:bold!important}#ccf-panel[hidden],#ccf-open[hidden]{display:none!important}#ccf-open{position:fixed!important;right:0!important;top:35%!important;z-index:2147483647!important;background:#2563eb!important;color:white!important;border:0!important;padding:12px!important;border-radius:8px 0 0 8px!important}.ccf-person{padding:7px 0;border-bottom:1px solid #ddd}.ccf-hit{outline:2px solid #10b981!important;outline-offset:2px!important}';
(document.head||document.documentElement).append(css);

const panel=document.createElement('div');panel.id='ccf-panel';
panel.innerHTML='<b>Facebook Comment Follow v2.6</b><button id="ccf-hide">Ẩn</button><p id="ccf-count">Tìm thấy 0 người</p><button id="ccf-scroll">Tìm kiếm</button><button id="ccf-auto" class="btn-auto">▶ Xử lý toàn bộ (Nhanh)</button><button id="ccf-stop">■ Dừng</button><button id="ccf-review">Kiểm tra danh sách</button><button id="ccf-clear">Xóa danh sách</button><p id="ccf-status">Mở bình luận bài viết rồi bắt đầu quét.</p><div id="ccf-people" style="max-height:38vh;overflow:auto"></div>';
const show=document.createElement('button');show.id='ccf-open';show.textContent='☰ Comment Follow';show.hidden=true;
(document.body||document.documentElement).append(panel,show);

const $=id=>panel.querySelector('#'+id);
const status=s=>$('ccf-status').textContent=s;

function dialogRoot(){
 return [...document.querySelectorAll('[role="dialog"]')].filter(isVisible).sort((a,b)=>b.getBoundingClientRect().height-a.getBoundingClientRect().height)[0]||document.querySelector('[role="main"]')||document.body;
}

// Kiểm tra xem nút hoặc icon like đã ở trạng thái ĐÃ LIKE chưa
function isButtonAlreadyLiked(btn){
 if(!btn)return true;
 const fullText=txt(btn);
 if(isAlreadyLiked(fullText))return true;
 if(btn.getAttribute('aria-pressed')==='true')return true;
 
 // Kiểm tra màu chữ / màu icon (màu xanh khi đã like)
 try{
  const color=getComputedStyle(btn).color||'';
  if(/rgb\(\s*(?:8|24|32),\s*(?:102|119|120)/.test(color))return true;
  const svg=btn.querySelector('svg');
  if(svg){
   const fill=getComputedStyle(svg).fill||'';
   if(/rgb\(\s*(?:8|24|32),\s*(?:102|119|120)/.test(fill))return true;
  }
 }catch(e){}
 return false;
}

function likeFor(card){
 const icons=[...card.querySelectorAll('svg[aria-label],svg[role="img"]')].filter(isVisible);
 const likes=icons.filter(e=>{
  const label=e.getAttribute('aria-label')||e.querySelector('title')?.textContent||'';
  return isLike(label)&&!isAlreadyLiked(label);
 });
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

// Trích xuất mã User định danh chuẩn (ID trang cá nhân hoặc URL làm sạch)
function extractUserKey(card,name){
 const links=[...card.querySelectorAll('a[href]')].filter(a=>a.getBoundingClientRect().width>0);
 const profileLink=links.find(a=>(a.innerText||'').trim()===name)?.href||links[0]?.href||'';
 if(profileLink){
  try{
   const url=new URL(profileLink);
   // Lấy profile.php?id=... hoặc /username
   if(url.searchParams.has('id'))return 'uid:'+url.searchParams.get('id');
   const pathname=url.pathname.replace(/^\/+/,'').split('/')[0];
   if(pathname&&!['groups','posts','watch','photo'].includes(pathname))return 'path:'+pathname;
  }catch(e){}
 }
 // Nếu không bắt được link thì dùng tên người dùng làm khóa định danh duy nhất
 return 'user:'+name.toLowerCase();
}

function collect(){
 let added=0;
 for(const node of followNodes()){
  const follow=node.closest('a,button,[role="button"]')||node;
  const card=nearestComment(node);
  const name=locateName(node,card);
  
  // LỌC TRÙNG THEO USER: Bất kể người đó comment bao nhiêu lần
  const userKey=extractUserKey(card,name);

  // Đã từng xử lý người này rồi -> bỏ qua
  if(processedUsers.has(userKey))continue;

  // Nếu người này đã có trong danh sách chờ -> bỏ qua bình luận thứ 2, 3... của họ
  if(S.found.has(userKey))continue;

  const item={id:++S.seq,key:userKey,name,follow,state:'ready'};
  S.found.set(userKey,item);
  follow.classList.add('ccf-hit');
  added++;
 }
 render();
 return added;
}

function render(){
 $('ccf-count').textContent='Chờ xử lý: '+S.found.size+' người (không trùng) | Đã xong: '+processedUsers.size+' | Lượt cuộn: '+S.steps;
 const root=$('ccf-people');root.replaceChildren();
 for(const p of S.found.values()){
  const row=document.createElement('div');row.className='ccf-person';
  const title=document.createElement('span');title.textContent=p.name+' — '+(p.state==='lost'?'Không còn trên màn hình':'Chờ xử lý');
  const btn=document.createElement('button');btn.textContent='Follow';
  btn.onclick=()=>act(p);
  row.append(title,document.createElement('br'),btn);root.append(row);
 }
}

async function act(p){
 if(!p.follow||!p.follow.isConnected){
  p.state='lost';render();
  status('Bình luận của '+p.name+' đã bị tháo khỏi DOM do cuộn.');
  return false;
 }
 p.follow.scrollIntoView({behavior:'instant',block:'center'});
 await nap(180);

 if(!isVisible(p.follow)){
  p.state='lost';render();
  return false;
 }

 const follow=p.follow;
 const followText=txt(follow);

 // BẢO VỆ FOLLOW: Không click nếu đã theo dõi
 if(!isAlreadyFollowed(followText)&&isFollow(followText)){
  follow.click();
 }
 await nap(180);

 // Đưa User này vào danh sách đã xong và xóa khỏi hàng chờ
 processedUsers.add(p.key);
 S.found.delete(p.key);
 follow.classList.remove('ccf-hit');

 status('Đã xử lý & xóa người dùng: '+p.name);
 render();
 return true;
}

function scroller(){
 const r=dialogRoot();
 const els=[r,...r.querySelectorAll('div')].filter(e=>!e.closest('#ccf-panel')&&e.clientHeight>180&&e.scrollHeight>e.clientHeight+100);
 els.sort((a,b)=>{
  const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
  return (br.height>300?1:0)-(ar.height>300?1:0)||b.clientHeight-a.clientHeight;
 });
 return els[0]||document.scrollingElement;
}

async function scan(){
 if(S.running)return;
 S.running=true;S.stop=false;
 let stuck=0;
 try{
  while(!S.stop){
   collect();
   const el=scroller(),before=el.scrollTop;
   const step=Math.max(120,Math.min(260,Math.round(el.clientHeight*.28)));
   el.scrollBy({top:step,behavior:'instant'});
   await nap(500);
   collect();
   S.steps++;render();

   stuck=Math.abs(el.scrollTop-before)<5?stuck+1:0;
   status('Đang quét: Lượt '+S.steps+' | Danh sách chờ: '+S.found.size+' người.');
   if(stuck>=5){
    status('Đã tới cuối bình luận. Còn '+S.found.size+' người chưa xử lý.');
    break;
   }
  }
  if(S.stop)status('Đã dừng tìm kiếm.');
 }catch(e){status('Lỗi: '+e.message);}
 finally{S.running=false;}
}

async function processAll(){
 if(S.running){status('Đang có tiến trình khác chạy.');return;}
 S.running=true;S.stop=false;
 status('Bắt đầu xử lý danh sách...');
 try{
  let count=0;
  while(S.found.size>0&&!S.stop){
   const p=S.found.values().next().value;
   if(!p)break;

   const success=await act(p);
   if(success)count++;

   await randDelay(500,1100);
  }
  if(!S.stop)status('Đã xử lý xong toàn bộ danh sách ('+count+' người).');
 }catch(e){
  status('Lỗi xử lý: '+e.message);
 }finally{
  S.running=false;
  render();
 }
}

$('ccf-auto').onclick=processAll;
$('ccf-review').onclick=()=>{
 let available=0,missing=0;
 for(const p of S.found.values()){
  if(isVisible(p.follow)&&isFollow(txt(p.follow))){p.state='ready';available++;}
  else{p.state='lost';missing++;}
 }
 render();
 status('Còn lại '+S.found.size+' người: '+available+' sẵn sàng, '+missing+' mất dấu. Đã xử lý tổng cộng: '+processedUsers.size);
};
$('ccf-scroll').onclick=scan;
$('ccf-stop').onclick=()=>{S.stop=true;status('Đang yêu cầu dừng...')};
$('ccf-clear').onclick=()=>{
 document.querySelectorAll('.ccf-hit').forEach(e=>e.classList.remove('ccf-hit'));
 S.found.clear();
 processedUsers.clear();
 S.steps=0;
 render();
 status('Đã xóa toàn bộ dữ liệu.');
};
$('ccf-hide').onclick=()=>{panel.hidden=true;show.hidden=false};
show.onclick=()=>{panel.hidden=false;show.hidden=true};
render();
})();
