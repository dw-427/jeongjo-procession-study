const el=id=>document.getElementById(id);
const canvas=el('actors'), ctx=canvas.getContext('2d');
const stops=[[0,'창덕궁을 나서다','창덕궁'],[.5,'배다리를 건너다','노량']];
const clamp=v=>Math.max(0,Math.min(1,v));
let size=[1,1],progress=0,day=0,tab='daily';
const art={};
function load(name,path){
 const img=new Image();art[name]=img;img.onload=draw;img.src='scenes/outward/'+path+'.webp';
}
for(const name of ['gate-street','bridge-street'])load(name,name);
for(const name of ['step0','step1','step2','step3','music','horse','guard','litter'])load(name,'march/'+name);
const files=['step','step','horse','music','music','step','guard','litter','guard','horse','step','step','step'];
const formation=[];
let tail=0;
for(const [rank,type] of files.entries()){
 const lanes=type==='litter'?[0]:type==='horse'?[0]:[-1,1];
 for(const lane of lanes)formation.push({type,lane,offset:tail+(lane+1)*.003,seed:rank*.37+lane*.29});
 tail+=type==='litter'?.070:type==='horse'?.050:.032;
}
formation.sort((a,b)=>a.lane-b.lane);
function paint(scene,t,opacity=1){
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
 for(const {type,lane,offset,seed} of formation){
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
  const feet=top+H*(road+lane*.005)+height*.012*Math.abs(beat);
  ctx.save();ctx.translate(px,feet);ctx.rotate(beat*(type==='horse'?.014:.009));
  ctx.drawImage(img,-width/2,-height,width,height);ctx.restore();
 }
 ctx.restore();
}
function draw(){
 if(progress<=.47)paint(0,progress/.47);
 else if(progress>=.53)paint(1,(progress-.53)/.47);
 else{paint(0,1);const t=(progress-.47)/.06;paint(1,0,t*t*(3-2*t))}
}
function resize(){
 const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);
 size=[r.width,r.height];canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);draw();
}
function updateJourney(){
 progress=clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
 const i=Number(progress>=.5),stop=stops[i];
 el('date').textContent='첫째 날 · 윤2월 9일 · '+stop[2];
 el('issue').textContent=stop[1];el('kind').textContent='행차 재구성';
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
