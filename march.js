const el=id=>document.getElementById(id);
const canvas=el('actors'), ctx=canvas.getContext('2d');
const stops=[[0,'창덕궁을 나서다','창덕궁'],[.5,'배다리를 건너다','노량']];
const clamp=v=>Math.max(0,Math.min(1,v));
let size=[1,1],progress=0,day=0,tab='daily';
const art={}, silhouettes=new Map();
const tooltip=el('actor-info');
const visibleActors=[];
let pointer=null, pinned=false;
const roles={
 police:['군뢰·순시','경기감사 앞에서 질서 유지와 통행 통제를 맡은 인원입니다.','경기감사 대열'],
 royalHorse:['어보마','왕의 인장을 운반하는 말입니다.','의장 대열'],
 meal:['수라가자','수라를 운반하는 행렬 설비입니다.','자궁가교 앞 수행 대열'],
 herald:['가후선전관','행차를 수행하며 왕명을 전달하는 무관입니다.','자궁가교 수행 대열'],
 scribe:['주서·한림','행차를 수행하며 왕명과 국정 관련 기록을 남기는 관원입니다.','후미 관원 대열'],
 lead:['영기 기수','행렬 앞에서 지휘를 알리는 깃발을 든 인원.','경기감사 대열'],
 governor:['경기감사','경기도의 관찰사. 반차도에서는 경기감사의 대열이 앞쪽에 놓입니다.','경기감사 대열'],
 horseGuard:['별기대','훈련대장 소속 기마 대열. 기록에는 84명이 다섯 필씩 나란히 대열을 이루는 편제가 나옵니다.','훈련대장 대열'],
 band:['취타대','행렬에서 관악기와 타악기를 연주한 악대입니다.','의장 대열'],
 flag:['의장 기수','깃발을 들고 어가와 가교 앞을 따르는 의장 인원입니다.','의장 대열'],
 royal:['어가 호위','임금의 행차 주변을 지키는 인원입니다.','어가 대열'],
 litter:['혜경궁 홍씨의 가교','정조의 어머니 혜경궁 홍씨가 원행에 사용한 가마입니다.','자궁가교 대열'],
 escort:['협연군','가마 양옆에 배치되는 호위 군사입니다.','자궁가교 대열'],
 rear:['장용위','행렬 뒤쪽에 배치된 기마 대열. 반차도에는 96명의 편제가 기록됩니다.','장용대장 대열'],
 king:['정조 · 좌마','돈화문 출발은 기마 기록에 근거합니다.','자궁가교 뒤 어가 대열'],
 minister:['총리대신','행차 준비와 운영을 총괄한 대신의 대열입니다.','선두 관원 대열'],
 captain:['훈련대장 대열','별기대와 의장·취타 인원이 따르는 대열입니다.','훈련대장 대열'],
 carriage:['정가교','왕의 가마. 반차도의 정가교와 정조가 탄 좌마는 별개의 위치입니다.','의장 대열'],
 princess:['군주쌍교','정조의 누이인 두 군주를 모신 가마 대열입니다.','자궁가교 뒤 수행 대열'],
 rearCaptain:['장용대장','장용위와 함께 행렬 후방에 배치된 대장입니다.','장용대장 대열'],
 secretary:['도승지 대열','왕명 출납을 맡은 승정원 관원들의 대열입니다.','후미 관원 대열'],
 official:['병조판서 대열','군정을 맡은 병조의 장관이 따르는 대열입니다.','후미 관원 대열']
};
function load(name,path){
 const img=new Image();art[name]=img;img.onload=()=>{
  if(path.startsWith('march/')){
   const mask=document.createElement('canvas');
   mask.width=img.naturalWidth;mask.height=img.naturalHeight;
   const ink=mask.getContext('2d');ink.drawImage(img,0,0);
   silhouettes.set(img,ink.getImageData(0,0,mask.width,mask.height).data);
  }
  draw();
 };img.src='scenes/outward/'+path+'.webp';
}
for(const name of ['gate-street','bridge-street'])load(name,name);
for(const name of ['step0','step1','step2','step3','music','horse','guard','litter'])load(name,'march/'+name);
// Counts and ranks are expanded only where the cited arrangement specifies them.
const files=[
 ['guard','police',2],['step','lead',2],['horse','governor',1],['horse','minister',1],
 ['horse','horseGuard',84,5],['horse','captain',1],['step','flag',3],['music','band',3],
 ['horse','royalHorse',1],['step','flag',3],['music','band',3],['guard','royal',2],
 ['litter','carriage',1],['guard','meal',2],['guard','herald',2],
 ['litter','litter',1],['guard','escort',2],['horse','king',1],
 ['litter','princess',1],['litter','princess',1],
 ['horse','rear',96,5],['step','flag',3],['music','band',3],['horse','rearCaptain',1],
 ['guard','scribe',2],['horse','secretary',1],['horse','official',1]
];
const formation=[];
let tail=0;
for(const [group,[type,role,total,formationWidth=total]] of files.entries()){
 const stride=type==='litter'?.078:type==='horse'?.043:.034;
 for(let first=0;first<total;first+=formationWidth){
  const count=Math.min(formationWidth,total-first);
  for(let place=0;place<count;place++){
   const lane=place-(count-1)/2;
   const offset=role==='escort'?tail-.052:tail+Math.abs(lane)*.003;
   formation.push({type,role,lane,offset,seed:group*.37+(first+place)*.29});
  }
  tail+=stride;
 }
}
formation.sort((a,b)=>a.lane-b.lane);
function paint(scene,t,opacity=1,interactive=true){
 const bg=art[scene?'bridge-street':'gate-street'];
 if(!bg?.naturalWidth)return;
 const [w,h]=size;
 const scale=Math.max(w/bg.width,h/bg.height),W=bg.width*scale,H=bg.height*scale;
 const left=scene?(w-W)*.46:-Math.max(0,Math.min(W-w,W*.15-w*.15));
 const top=(h-H)*.53;
 ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(bg,left,top,W,H);
 const start=scene?-left/W-.085:.15;
 const finish=(w-left)/W+tail+.09;
 const head=start+(finish-start)*t;
 ctx.beginPath();ctx.rect(scene?0:left+.15*W,0,w,h);ctx.clip();
 for(const actor of formation){
  const {type,lane,offset,seed}=actor;
  const x=head-offset;
  if(!scene&&x<start)continue;
  const depth=scene?1:clamp((x-.15)/.14);
  const turn=(head-start)*W/(H*.024)+seed;
  const beat=Math.sin(turn*Math.PI*2);
  const name=type==='step'?'step'+(Math.floor(turn*4)%4+4)%4:type;
  const img=art[name];if(!img?.naturalWidth)continue;
  const stature=type==='step'?.078:type==='horse'?.078:type==='litter'?.083:.057;
  const height=H*stature*(scene?.82:(.56+.44*depth));
  const width=height*img.width/img.height;
  const px=left+x*W;
  if(px+width<w*-0.01||px-width>w)continue;
  const road=scene?.7-.236*x:.566+.074*clamp((x-.15)/.105)+.20*Math.max(0,x-.255);
  const feet=top+H*(road+lane*.011)+height*.012*Math.abs(beat);
  const angle=beat*(type==='horse'?.014:.009);
  if(interactive)visibleActors.push({actor,px,feet,width,height,img,angle,clip:scene?0:left+.15*W});
  ctx.save();ctx.translate(px,feet);ctx.rotate(angle);
  ctx.drawImage(img,-width/2,-height,width,height);ctx.restore();
 }
 ctx.restore();
}
function draw(){
 visibleActors.length=0;
 if(progress<=.47)paint(0,progress/.47);
 else if(progress>=.53)paint(1,(progress-.53)/.47);
 else{paint(0,1,1,false);const t=(progress-.47)/.06;paint(1,0,t*t*(3-2*t),false)}
 for(const sprite of visibleActors){
  const label=sprite.actor.role==='king'?'정조':sprite.actor.role==='litter'?'혜경궁 홍씨':null;
  if(!label||sprite.px<Math.max(22,sprite.clip+15)||sprite.px>size[0]-22)continue;
  const y=sprite.feet-sprite.height-8;
  ctx.save();
  ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const width=ctx.measureText(label).width+14;
  ctx.fillStyle='#392318';ctx.fillRect(sprite.px-width/2,y-10,width,20);
  ctx.fillStyle='#fff3d9';ctx.fillText(label,sprite.px,y);ctx.restore();
 }
 updateActorInfo();
}
function actorAt(x,y){
 for(let i=visibleActors.length-1;i>=0;i--){
  const sprite=visibleActors[i];
  if(x<sprite.clip)continue;
  const {px,feet,angle,width,height,img}=sprite;
  const dx=x-px,dy=y-feet,c=Math.cos(angle),sn=Math.sin(angle);
  const u=(dx*c+dy*sn)/width+.5,v=(-dx*sn+dy*c)/height+1;
  if(u<0||u>=1||v<0||v>=1)continue;
  const mask=silhouettes.get(img);
  if(mask?.[(Math.floor(v*img.height)*img.width+Math.floor(u*img.width))*4+3]>80)return sprite;
 }
}
function updateActorInfo(){
 const sprite=pinned?visibleActors.find(({actor})=>actor===pinned):pointer&&actorAt(pointer.x,pointer.y);
 const stage=el('stage');
 stage.classList.toggle('over-actor',Boolean(sprite));
 tooltip.hidden=!sprite;
 if(!sprite){pinned=false;return}
 const [title,description,group]=roles[sprite.actor.role];
 const bridge=progress>=.53;
 const detail=sprite.actor.role==='king'
  ? (bridge?'첫날 배다리를 건너는 순간의 탑승 방식은 확인되지 않아 기마로 재구성했습니다.':'돈화문에서 말을 타고 출발했다는 기록에 근거했습니다.')+' 반차도에서는 정조의 자리를 좌마로 나타냅니다.'
  : description;
 const key=sprite.actor.role+'/'+bridge;
 if(tooltip.dataset.role!==key){
  tooltip.querySelector('strong').textContent=title;
  tooltip.querySelector('p').textContent=detail;
  tooltip.querySelector('small').textContent='화성원행반차도 · '+group;
  tooltip.dataset.role=key;
 }
 const bounds=canvas.getBoundingClientRect();
 const x=bounds.left+sprite.px,y=bounds.top+sprite.feet-sprite.height;
 tooltip.style.left=Math.max(12,Math.min(innerWidth-tooltip.offsetWidth-12,x-tooltip.offsetWidth/2))+'px';
 tooltip.style.top=(y>tooltip.offsetHeight+24?y-tooltip.offsetHeight-12:Math.min(innerHeight-tooltip.offsetHeight-12,y+sprite.height+12))+'px';
}
function point(event){
 const rect=canvas.getBoundingClientRect();
 return {x:event.clientX-rect.left,y:event.clientY-rect.top};
}
const actorStage=el('stage');
actorStage.addEventListener('pointermove',event=>{
 if(event.pointerType!=='mouse')return;
 pointer=event.target.closest('header,footer,nav,button,input')?null:point(event);
 updateActorInfo();
});
actorStage.addEventListener('pointerleave',()=>{pointer=null;updateActorInfo()});
actorStage.addEventListener('click',event=>{
 if(event.target.closest('header,footer,nav,button,input'))return;
 const {x,y}=point(event);
 const actor=actorAt(x,y)?.actor;
 pinned=actor!==pinned&&actor||false;
 updateActorInfo();
});
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'){pinned=false;pointer=null;updateActorInfo()}
});
function resize(){
 const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);
 size=[r.width,r.height];canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);draw();
}
function updateJourney(){
 progress=clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
 const i=Number(progress>=.5),stop=stops[i];
 el('date').textContent='첫째 날 · 윤2월 9일 · '+stop[2];
 el('issue').textContent=stop[1];el('kind').textContent=i?'반차도 기반 · 도강 탑승 방식 재구성':'반차도 기반 · 기마 출궁 기록';
 el('route').value=Math.round(progress*10000);el('route').setAttribute('aria-valuetext',stop[2]);
 el('chair').style.top=(10+80*progress)+'%';
 if(!el('track').children.length)for(const label of ['창덕궁','노량 배다리']){
  const span=document.createElement('span');span.textContent=label;el('track').append(span);
 }
 Array.from(el('track').children).forEach((s,j)=>s.classList.toggle('here',i===j));draw();
}
const modal=el('modal'),book='https://kyudb.snu.ac.kr/book/text.do?book_cd=GK14532_00';
function routeMap(){
 // Approximate modern landmark coordinates, projected locally with north at the top.
 const points=[['창덕궁',37.579,126.991],['노량 · 용양봉저정',37.512,126.954],['시흥행궁',37.455,126.902],['사근평행궁',37.345,126.976],['화성행궁',37.282,127.014]];
 const xy=points.map(([,lat,lon])=>[62+(lon-126.90)*520,18+(37.58-lat)*650]);
 const line=xy.map(p=>p.join(',')).join(' ');
 const current=[0,1,1,2,2,3,4][stops.findLastIndex(s=>s[0]<=progress)];
 const marks=points.map(([name],i)=>{const [x,y]=xy[i];return '<circle cx="'+x+'" cy="'+y+'" r="'+(i===current?5:3)+'" fill="'+(i===current?'#9b3925':'#47372b')+'"/><text x="'+(x+11)+'" y="'+(y+4)+'">'+name+'</text>'}).join('');
 return '<h3>한양에서 화성으로</h3><svg viewBox="0 0 300 230" style="display:block;width:100%;height:225px;background:#f0e8d6;font:12px sans-serif" role="img" aria-label="북쪽의 창덕궁에서 노량, 시흥, 사근평을 거쳐 남쪽 화성행궁으로 가는 경유지 위치도"><text x="16" y="23">↑ 북</text><polyline points="'+line+'" fill="none" stroke="#937550" stroke-width="2"/>'+marks+'</svg><small>현재 지명에 대응하는 근사 위치 · 선은 경유 순서를 표시한다.</small>';
}
function fill(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));
 const cite='<a href="'+book+'" target="_blank" rel="noopener">규장각 『원행을묘정리의궤』 권수 「택일」 006a ↗</a>';
 const original=day?'同月初十日肆覲坪行宮晝停華城府行宮宿所':'龍驤鳳翥亭晝停始興縣行宮宿所';
 if(tab==='daily'&&day<2)el('content').innerHTML='<p class="day">윤2월 '+(9+day)+'일</p><h3>'+(day?'화성에 이르는 날':'궁을 떠나는 날')+'</h3><div class="routeRow">'+(day?['시흥행궁<br>출발','사근평행궁<br>낮 정차','화성행궁<br>숙박']:['창덕궁<br>출발','노량<br>도강','용양봉저정<br>낮 정차','시흥행궁<br>숙박']).map(s=>'<span>'+s+'</span>').join('')+'</div><blockquote>'+original+'</blockquote><p>'+(day?'같은 달 열흘, 사근평행궁에서 낮에 머물고 화성부 행궁에서 묵었다.':'용양봉저정에서 낮에 머물고 시흥현 행궁에서 묵었다.')+'</p><p class="source">'+cite+'</p>';
 if(tab==='daily'){
  const stop=stops.filter(s=>s[0]<=progress).pop();
  el('content').insertAdjacentHTML('afterbegin','<p class="source">현재 장면 · '+stop[2]+' · '+stop[1]+'</p>');
  el('content').insertAdjacentHTML('beforeend','<p class="context">정조는 어머니 혜경궁 홍씨를 모시고 원행에 나섰다. 낮 정차와 숙박은 의궤의 주정(晝停)과 숙소(宿所) 기록을 따른다.</p>');
 }
 if(tab==='compare')el('content').innerHTML='<h3>이틀의 여정을 한 장으로</h3><p>첫날의 숙소가 다음 날의 출발점이 된다. 두 날 모두 낮에 한 차례 머문 뒤 행궁에서 묵었다.</p><table><thead><tr><th>윤2월</th><th>출발</th><th>낮 정차</th><th>숙박</th></tr></thead><tbody><tr class="'+(!day?'active':'')+'"><th>9일</th><td>창덕궁</td><td>용양봉저정</td><td>시흥행궁</td></tr><tr class="'+(day?'active':'')+'"><th>10일</th><td>시흥행궁</td><td>사근평행궁</td><td>화성행궁</td></tr></tbody></table><h3>창덕궁에서 숙소까지</h3><div class="bars"><span>시흥</span><div><i style="width:48.5%"></i>약 16 km</div><span>화성</span><div><i></i>약 33 km</div></div><small>현대 위치 기준 직선거리 근삿값 · 실제 노정은 더 길다.</small><p class="source">'+cite+'</p>';
 if(tab==='compare')el('content').insertAdjacentHTML('beforeend',routeMap());
 if(tab==='source')el('content').innerHTML='<h3>행렬의 인물과 가마</h3><figure><img style="width:100%;max-height:35vh;object-fit:contain" src="scenes/ink/procession.jpg" alt="사용자가 제공한 채색 행렬도 부분"><figcaption class="source">제공 도판 부분 · 이미지 출처 표기 gyeomri.com</figcaption></figure><p class="context">위 그림은 화풍과 행렬 묘사를 참고한 자료다. 본 화면의 첫 이틀은 의궤의 일정을 바탕으로 만든 창작 장면이다. 인물의 정확한 수와 위치, 건물 배치와 이동 동작은 연출이다.</p><p class="source">'+cite+'</p>';
 if(tab==='source')el('content').insertAdjacentHTML('beforeend','<h3>화성능행도병풍 8폭</h3><figure><a href="scenes/screen/full-screen.jpg" target="_blank"><img src="scenes/screen/full-screen.jpg" alt="국립고궁박물관 소장 화성능행도병풍 8폭 전체"></a><figcaption>첫 이틀의 출발·도착 풍경은 재구성했다. 병풍 속 배다리 장면은 환궁길에 해당한다.</figcaption></figure><a href="folding-screen.html" target="_blank">8폭 자세히 보기 ↗</a>');

}
function details(){if(modal.open)return;tab='daily';fill();modal.showModal();el('close').focus()}
el('details').onclick=details;el('close').onclick=()=>modal.close();
modal.onclick=e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;fill()});
function seek(fraction){window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*fraction)}
el('route').oninput=e=>seek(Number(e.target.value)/10000);
el('first').onclick=()=>seek(0);
el('last').onclick=()=>seek(.62);
let startX=0,startY=0;
const stage=el('stage');
stage.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY},{passive:true});
stage.addEventListener('touchend',e=>{
 const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
 if(dx< -45&&Math.abs(dx)>Math.abs(dy)*1.4)details();
},{passive:true});
let horizontal=0,lastWheel=0;
stage.addEventListener('wheel',e=>{
 if(e.ctrlKey||Math.abs(e.deltaX)<=Math.abs(e.deltaY)*1.4)return;
 e.preventDefault();
 if(performance.now()-lastWheel>200)horizontal=0;
 lastWheel=performance.now();
 horizontal+=e.deltaX;
 if(horizontal< -36){horizontal=0;details()}
},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'&&!modal.open&&!e.target.matches('input')){e.preventDefault();details()}});
window.addEventListener('scroll',updateJourney,{passive:true});
new ResizeObserver(()=>{resize();updateJourney()}).observe(canvas);
updateJourney();
