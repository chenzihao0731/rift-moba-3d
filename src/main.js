import * as THREE from 'three';
import { createWorld } from './world.js';
import { Actors } from './actors.js';
import { Game, CHAMPIONS, ITEMS, LANES } from './simulation.js';
import { cameraDrag, cameraPan } from './camera-controls.js';
import { ShopView } from './shop-view.js';
import './style.css';

const $=id=>document.getElementById(id), txt=(id,v)=>{const el=$(id);if(!el)return;if(['ward-button','camera-button','sound-button','pause-button'].includes(id)){const span=el.querySelector('span');if(span)span.textContent=v;el.title=String(v);el.setAttribute('aria-label',v);}else el.textContent=v;}, show=(id,v=true)=>$(id)?.classList.toggle('hidden',!v);
const BASE_URL=import.meta.env.BASE_URL;
const canvas=$('game-canvas');
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});} catch(e){document.body.innerHTML='<div style="padding:10vh;color:#e5c782;background:#0a1722;height:100vh;font:20px sans-serif">此浏览器暂无法创建 3D 画面。请启用硬件加速，并使用较新的 Chrome、Edge 或 Safari。</div>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101f28);scene.fog=new THREE.FogExp2(0x15282b,.0021);
scene.add(new THREE.HemisphereLight(0xc6dfeb,0x284a38,1.6));const sun=new THREE.DirectionalLight(0xffe8c1,2.3);sun.position.set(-65,150,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-145,right:145,top:145,bottom:-145,near:1,far:350});sun.shadow.bias=-.0007;sun.shadow.normalBias=.6;scene.add(sun);const moon=new THREE.DirectionalLight(0x75bacf,1);moon.position.set(100,60,-130);scene.add(moon);
const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,700),world=createWorld(scene),actors=new Actors(scene,$('labels'));
let heroId=localStorage.getItem('rift-hero')||'ahri';if(!CHAMPIONS.some(h=>h.id===heroId))heroId='ahri';
let game=new Game({hero:heroId}),running=false,paused=false,ended=false,locked=true,sound=false,armed=null,selected=null;
game.setObstacles?.(world.obstacles||[]);
let zoom=68,width=innerWidth,height=innerHeight,mouse={x:width/2,y:height/2,inside:false},targetPoint={x:0,z:0};const cameraCenter=new THREE.Vector3(0,0,0),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),rayPoint=new THREE.Vector3();
let cameraGesture=null,hovered=null;
const clock=new THREE.Clock();let total=0,hudTime=0,fpsFrames=0,fpsTime=0;const minimap=$('minimap'),mctx=minimap.getContext('2d');
const aim=new THREE.Group();const aimCircle=new THREE.Mesh(new THREE.RingGeometry(9.8,10,80),new THREE.MeshBasicMaterial({color:0x72eddc,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));aimCircle.rotation.x=-Math.PI/2;aim.add(aimCircle);const aimGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const aimLine=new THREE.Line(aimGeometry,new THREE.LineBasicMaterial({color:0xa2f5e3,transparent:true,opacity:.9}));aim.add(aimLine);aim.visible=false;scene.add(aim);
const fogCanvas=document.createElement('canvas');fogCanvas.width=fogCanvas.height=minimap.width;const fogContext=fogCanvas.getContext('2d');
const selectionRing=new THREE.Mesh(new THREE.RingGeometry(2,2.15,48),new THREE.MeshBasicMaterial({color:0xff756c,transparent:true,opacity:.8,side:THREE.DoubleSide}));selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;scene.add(selectionRing);
const heroStyles={ahri:{heading:'灵动魅惑，游走于战场',description:'用欺诈宝珠消耗对手，以魅惑创造击杀机会。灵魄突袭让你穿梭战场，追击或撤退。',combo:'E 魅惑 → Q 宝珠 → W 狐火 → R 突袭',difficulty:3},ashe:{heading:'精准射击，掌控战场',description:'保持距离，利用万箭齐发减速敌人。鹰击长空照亮野区，魔法水晶箭远程开启团战。',combo:'W 减速 → 普攻叠层 → Q 连射 → R 冰箭',difficulty:2},garen:{heading:'无畏冲锋，守护德玛西亚',description:'贴近敌人释放审判，在危急时刻开启勇气。德玛西亚正义对低生命敌人造成致命打击。',combo:'Q 沉默 → E 审判 → W 减伤 → R 斩杀',difficulty:1},lux:{heading:'以光为刃，照亮黑暗',description:'光之束缚控制对手，透光奇点覆盖战区。曲光屏障保护自己，终极闪光贯穿敌人。',combo:'Q 束缚 → E 奇点 → R 终极闪光',difficulty:2},ezreal:{heading:'奥术探险，灵巧出击',description:'秘术射击持续消耗，精华跃动标记敌人。奥术跃迁躲开危险，精准弹幕穿过整条兵线。',combo:'W 标记 → Q 引爆 → E 位移 → R 弹幕',difficulty:3}};
Object.assign(heroStyles,{yasuo:{heading:'踏风而行，御剑破阵',description:'斩钢闪命中两次积攒旋风，第三次击飞敌人后接狂风绝息斩。踏前斩在敌群中穿梭，风墙阻挡敌方飞弹。',combo:'Q 叠风 → 第三次 Q 击飞 → R 绝息斩 · E 穿梭兵线',difficulty:3},teemo:{heading:'蘑菇阵地，小个子大麻烦',description:'吹箭致盲对手，毒性射击持续消耗。用小莫快跑游走，把隐形蘑菇布在河道与野区；站定后还能进入隐身。',combo:'R 蘑菇埋伏 → Q 致盲 → 普攻挂毒 → W 撤离',difficulty:2},jinx:{heading:'双枪狂欢，引爆整个战场',description:'在机枪与火箭炮之间切换，火箭普攻造成范围爆炸。震荡电磁波减速，嚼火者封路；参与击杀后获得狂暴加速。',combo:'E 夹子封路 → W 减速 → Q 火箭炮 → R 超究极火箭',difficulty:2}});
function populateLobby(){const grid=$('hero-grid');grid.innerHTML=CHAMPIONS.map(h=>`<button class="hero-card ${h.id===heroId?'selected':''}" data-hero="${h.id}" aria-pressed="${h.id===heroId}" style="--hero-color:${h.color||'#50bbcf'}"><img src="${BASE_URL}assets/${h.id}-splash.jpg" alt="${h.name}" draggable="false"><span class="hero-card-shade"></span><span class="hero-role">${h.role||'英雄'}</span><div class="hero-card-info"><span class="hero-card-title">${h.title||''}</span><h3>${h.name}</h3><span class="hero-difficulty">${'◆'.repeat(heroStyles[h.id].difficulty)}${'◇'.repeat(3-heroStyles[h.id].difficulty)}</span></div><span class="hero-selected-mark">已选</span></button>`).join('');grid.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>chooseHero(b.dataset.hero)));chooseHero(heroId);}
function chooseHero(id){heroId=id;localStorage.setItem('rift-hero',id);const h=CHAMPIONS.find(h=>h.id===id),s=heroStyles[id];document.querySelectorAll('.hero-card').forEach(b=>{b.classList.toggle('selected',b.dataset.hero===id);b.setAttribute('aria-pressed',b.dataset.hero===id);});txt('hero-title',`${h.name} · ${s.heading}`);txt('hero-description',s.description);txt('hero-combo',s.combo);document.documentElement.style.setProperty('--hero-splash',`url('${BASE_URL}assets/${id}-splash.jpg')`);}
let skillButtons=[],sumButtons=[],itemButtons=[],shopView;
function getShopView(){return shopView ||= new ShopView(()=>game,BASE_URL,()=>{processEvents();updateHud();});}
function setupHud(){const h=CHAMPIONS.find(h=>h.id===heroId);$('hero-portrait').src=`${BASE_URL}assets/${heroId}-portrait.png`;txt('hero-name',h.name);$('hero-name').title=h.passive?`${h.passive.name}：${h.passive.description}`:'';
 $('skills').innerHTML=h.skills.map((s,i)=>`<button class="skill-slot ${s.passive?'passive-skill':''}" data-key="${s.key}" title="${s.key} ${s.name}\n${s.description}\n消耗 ${s.cost||0} · 冷却 ${s.cooldown||0} 秒"><span class="skill-icon" style="--skill-hue:${[185,220,320,45][i]}"><img src="${BASE_URL}assets/${heroId}-${s.key}.png" alt="${s.name}" draggable="false"></span><span class="skill-key">${s.key}</span><span class="skill-name">${s.name}${s.passive?' · 被动':''}</span><span class="cooldown"></span><span class="skill-level-dots"></span><span class="upgrade-skill hidden" title="升级技能">+</span></button>`).join('');skillButtons=[...$('skills').children];skillButtons.forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('.upgrade-skill')){game.levelSkill?.(b.dataset.key);return;}armSkill(b.dataset.key);}));
 $('summoners').innerHTML=[['D','闪现','闪'],['F','引燃','焚']].map(([key,name,icon])=>`<button class="skill-slot summoner-slot" data-key="${key}" title="${key} ${name}"><span class="skill-icon"><img src="${BASE_URL}assets/summoner-${key}.png" alt="${name}" draggable="false"></span><span class="skill-key">${key}</span><span class="skill-name">${name}</span><span class="cooldown"></span></button>`).join('');sumButtons=[...$('summoners').children];sumButtons.forEach(b=>b.addEventListener('click',()=>armSkill(b.dataset.key)));
 const keys=['1','2','3','5','6','7'];$('inventory').innerHTML=keys.map((k,i)=>`<button class="item-slot" data-index="${i}" title="空装备栏"><span class="item-icon"></span><span class="item-key">${k}</span><span class="item-count"></span><span class="item-cooldown"></span></button>`).join('');itemButtons=[...$('inventory').children];itemButtons.forEach((b,i)=>b.addEventListener('click',()=>game.useItem(i,targetPoint.x,targetPoint.z)));renderShop();}
function start(){game=new Game({hero:heroId,practice:$('practice-toggle')?.checked||false});game.setObstacles?.(world.obstacles||[]);actors.clear();running=true;paused=false;ended=false;armed=null;selected=null;cameraGesture=null;locked=true;zoom=innerWidth<700?50:63;cameraCenter.set(game.player.x,0,game.player.z);['lobby','pause-panel','end-panel','help-panel','shop-panel','loading-screen'].forEach(id=>show(id,false));show('hud');document.body.classList.add('in-game');setupHud();getShopView().selectedSlot=-1;resize();toast('欢迎来到召唤师峡谷。右键移动，Q / W / E / R 施法。',5500);soundEvent('start');updateHud();updateCameraButton();updateCursor();}
function setPause(v){if(!running||ended)return;cancelCameraGesture();paused=v;show('pause-panel',v);txt('pause-button',v?'继续':'暂停');}
function openShop(){armed=null;aim.visible=false;cancelCameraGesture();updateCursor();show('shop-panel',$('shop-panel').classList.contains('hidden'));if(!$('shop-panel').classList.contains('hidden'))renderShop();}
function renderShop(){getShopView().render();}
function armSkill(key){if(!running||paused||!game.player.alive)return;if(key==='A'||key==='4'){armed=key;updateCursor();toast(key==='A'?'左键点敌人精准攻击，点地面攻击移动':'点击目标位置放置侦查守卫',2200);return;}const instant=CHAMPIONS.find(h=>h.id===heroId).skills.find(s=>s.key===key)?.targeting==='self';if(instant){game.cast(key,targetPoint.x,targetPoint.z,selected?.id);processEvents();return;}if(armed===key){castAt(key,targetPoint.x,targetPoint.z);return;}armed=key;updateCursor();const skill=CHAMPIONS.find(h=>h.id===heroId).skills.find(s=>s.key===key);toast(`${key} ${skill?.name||({D:'闪现',F:'引燃'})[key]} · 点击目标施放，右键取消`,2500);}
function castAt(key,x,z,id){
 if(key==='4')game.placeWard(x,z);
 else if(key==='A'){
   const target=game.getEntity(id);
   if(target&&target.team!==game.player.team){selected=target;game.attackMove(x,z,target.id);actors.pulse(target.x,target.z,0xff6f76,2,.45);}
   else{selected=null;game.attackMove(x,z);actors.pulse(x,z,0xffa76f,.7,.5);}
 }else game.cast(key,x,z,id||entityAt(x,z)?.id);
 armed=null;aim.visible=false;updateCursor();processEvents();
}
function castAtPointer(key){const point=pointerPoint(mouse.x,mouse.y),target=entityAtPointer(mouse.x,mouse.y,point);castAt(key,point.x,point.z,target?.id);}
function pointerPoint(clientX,clientY){ndc.set(clientX/width*2-1,-clientY/height*2+1);ray.setFromCamera(ndc,camera);if(ray.ray.intersectPlane(plane,rayPoint)){targetPoint={x:THREE.MathUtils.clamp(rayPoint.x,-123,123),z:THREE.MathUtils.clamp(rayPoint.z,-123,123)};}return targetPoint;}
function entityAt(x,z){let nearest=null,d=Infinity;for(const e of game.entities){if(!e.alive||e.id===game.player.id||(e.kind==='ward'&&e.team==='blue')||(e.team!=='blue'&&game.isVisible&&!game.isVisible(e)))continue;const dist=Math.hypot(e.x-x,e.z-z),r=e.radius||(e.kind==='tower'?4:e.kind==='nexus'?7:e.kind==='monster'?4:e.kind==='hero'?2.8:1.9);if(dist<r+1.2&&dist<d){nearest=e;d=dist;}}return nearest;}
function entityAtPointer(clientX,clientY,point=pointerPoint(clientX,clientY)){
 // Pick the visible 3D body, including raised heads and tower crystals.
 const meshes=[];
 for(const e of game.entities){const actor=actors.map.get(e.id);if(!e.alive||e.id===game.player.id||!actor?.mesh.visible||e.kind==='ward'&&e.team==='blue'||game.isVisible&&!game.isVisible(e))continue;
   if(Math.hypot(e.x-point.x,e.z-point.z)<(e.radius||2)+16)meshes.push(actor.mesh);
 }
 for(const hit of ray.intersectObjects(meshes,true)){
   let object=hit.object;if(!object.visible)continue;
   while(object&&!object.userData.entityId)object=object.parent;
   const e=game.getEntity(object?.userData.entityId);if(e)return e;
 }
 return entityAt(point.x,point.z);
}
function updateCursor(){
 const kind=!running||paused||ended?'default':cameraGesture?.active?'drag':armed==='A'?'attack':armed==='4'?'ward':armed?'aim':hovered&&hovered.team!==game.player.team?'attack':'move';
 if(canvas.dataset.cursor!==kind)canvas.dataset.cursor=kind;
}
function cancelCameraGesture(){
 if(cameraGesture&&canvas.hasPointerCapture(cameraGesture.id))canvas.releasePointerCapture(cameraGesture.id);
 cameraGesture=null;updateCursor();
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
window.addEventListener('pointermove',e=>{
 mouse={x:e.clientX,y:e.clientY,inside:e.target===canvas};
 if(!cameraGesture)return;
 const dx=e.clientX-cameraGesture.x,dy=e.clientY-cameraGesture.y;
 if(!cameraGesture.active&&Math.hypot(dx,dy)<4)return;
 if(!cameraGesture.active){cameraGesture.active=true;locked=false;updateCameraButton();}
 const center=cameraDrag(cameraGesture.origin,dx,dy,zoom,height);cameraCenter.set(center.x,0,center.z);
 updateCursor();e.preventDefault();
});
canvas.addEventListener('pointerleave',()=>{mouse.inside=false;hovered=null;updateCursor();});
canvas.addEventListener('pointerdown',e=>{
 if(!running||paused||ended)return;e.preventDefault();const p=pointerPoint(e.clientX,e.clientY),ent=entityAtPointer(e.clientX,e.clientY,p);
 if(e.button===1){cameraGesture={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{x:cameraCenter.x,z:cameraCenter.z},active:true};locked=false;canvas.setPointerCapture(e.pointerId);updateCameraButton();updateCursor();return;}
 if(e.button===2){cancelCameraGesture();if(armed){armed=null;aim.visible=false;updateCursor();return;}
   if(ent&&ent.team!=='blue'){selected=ent;game.attackTarget(ent.id);actors.pulse(ent.x,ent.z,0xff6f76,2);}
   else{game.moveTo(p.x,p.z);actors.pulse(p.x,p.z,0x5af1b5,.65,.55);}return;
 }
 if(armed){castAt(armed,p.x,p.z,ent?.id);return;}
 if(e.pointerType==='touch'){if(ent&&ent.team!=='blue'){selected=ent;game.attackTarget(ent.id);}else game.moveTo(p.x,p.z);actors.pulse(p.x,p.z,0x5af1b5,.6,.5);}
 else{selected=ent;if(!ent){cameraGesture={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{x:cameraCenter.x,z:cameraCenter.z},active:false};canvas.setPointerCapture(e.pointerId);}}
});
window.addEventListener('pointerup',cancelCameraGesture);
canvas.addEventListener('pointercancel',cancelCameraGesture);
canvas.addEventListener('lostpointercapture',()=>{cameraGesture=null;updateCursor();});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!running)return;zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.04,35,115);resize();},{passive:false});
minimap.addEventListener('contextmenu',e=>e.preventDefault());minimap.addEventListener('pointerdown',e=>{if(!running||paused)return;const r=minimap.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*256-128,z=(e.clientY-r.top)/r.height*256-128;if(e.button===2||e.pointerType==='touch'&&armed==='A')game.moveTo(x,z);else{locked=false;cameraCenter.set(x,0,z);updateCameraButton();}});
const pressed=new Set();window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;const k=e.key.toUpperCase();const modalOpen=!$('shop-panel').classList.contains('hidden')||!$('help-panel').classList.contains('hidden');if(modalOpen&&k!=='ESCAPE'){if(k==='P'&&!e.repeat&&!$('shop-panel').classList.contains('hidden')){e.preventDefault();openShop();}return;}if(['TAB',' ','ARROWUP','ARROWDOWN','ARROWLEFT','ARROWRIGHT'].includes(k))e.preventDefault();if(e.repeat&&![' ','ARROWUP','ARROWDOWN','ARROWLEFT','ARROWRIGHT'].includes(k))return;pressed.add(k);
 if(k==='ESCAPE'){if(armed){armed=null;aim.visible=false;updateCursor();return;}if(!$('help-panel').classList.contains('hidden')){show('help-panel',false);return;}if(!$('shop-panel').classList.contains('hidden')){show('shop-panel',false);return;}setPause(!paused);return;}if(!running||paused||ended)return;
 if('QWER'.includes(k)&&k.length===1){if(e.ctrlKey){e.preventDefault();game.levelSkill?.(k);}else if(e.shiftKey){castAtPointer(k);}else armSkill(k);}
 if(k==='D')castAtPointer('D');if(k==='F')castAtPointer('F');if(k==='4')armSkill('4');if(k==='A'){if(e.shiftKey){const point=pointerPoint(mouse.x,mouse.y);castAt('A',point.x,point.z,entityAtPointer(mouse.x,mouse.y,point)?.id);}else armSkill('A');}if(k==='S'){game.stop();armed=null;}if(k==='B'){game.recall();processEvents();}if(k==='P')openShop();if(k==='Y'){locked=!locked;updateCameraButton();}if(k===' '){cameraCenter.set(game.player.x,0,game.player.z);}
 if(k==='TAB'){renderScoreboard();show('scoreboard');}const itemKeys=['1','2','3','5','6','7'];if(itemKeys.includes(k))game.useItem(itemKeys.indexOf(k),targetPoint.x,targetPoint.z);
});window.addEventListener('keyup',e=>{pressed.delete(e.key.toUpperCase());if(e.key==='Tab')show('scoreboard',false);});window.addEventListener('blur',()=>{pressed.clear();mouse.inside=false;cancelCameraGesture();});
function updateCameraButton(){txt('camera-button',locked?'跟随':'自由');$('camera-button')?.classList.toggle('active',locked);}
$('start-game').addEventListener('click',start);$('shop-button').addEventListener('click',openShop);$('shop-close').addEventListener('click',()=>show('shop-panel',false));$('ward-button').addEventListener('click',()=>armSkill('4'));$('recall-button').addEventListener('click',()=>{game.recall();processEvents();});$('help-button').addEventListener('click',()=>show('help-panel'));$('help-close').addEventListener('click',()=>show('help-panel',false));$('pause-button').addEventListener('click',()=>setPause(!paused));$('resume-button').addEventListener('click',()=>setPause(false));$('restart-button').addEventListener('click',start);$('play-again').addEventListener('click',start);$('lobby-button').addEventListener('click',()=>{running=false;paused=false;show('pause-panel',false);show('hud',false);show('lobby');document.body.classList.remove('in-game');armed=null;});$('camera-button').addEventListener('click',()=>{locked=!locked;updateCameraButton();});$('sound-button').addEventListener('click',()=>{sound=!sound;txt('sound-button',sound?'声音 开':'声音 关');if(sound){initAudio();soundEvent('start');}});
let toastTimer;function toast(message,duration=3000){txt('toast',message);show('toast');clearTimeout(toastTimer);toastTimer=setTimeout(()=>show('toast',false),duration);}
function feed(text,team=''){const el=document.createElement('div');el.className=`feed-entry ${team}`;el.textContent=text;$('event-feed').prepend(el);if($('event-feed').children.length>5)$('event-feed').lastChild.remove();setTimeout(()=>el.remove(),10000);}
function processEvents(){for(const e of game.events.splice(0)){actors.event(e);if(e.type==='message')toast(e.text||'',3000);if(e.type==='recall'&&e.source===game.player.id)toast(e.text||'正在回城',3000);if(e.type==='death'&&e.text)feed(e.text,e.team);if(['purchase','sale','victory'].includes(e.type)&&e.text||e.type==='level'&&e.source===game.player.id&&e.text)toast(e.text);if(['spell','purchase','sale','level'].includes(e.type))soundEvent(e.type==='sale'?'gold':e.type);if(e.type==='gold')soundEvent('gold');if(e.type==='victory')finish();}}
function finish(){if(ended)return;ended=true;txt('end-title',game.winner==='blue'?'胜 利':'失 败');txt('end-stats',`${formatTime(game.time)} · ${game.player.kills||0} / ${game.player.deaths||0} / ${game.player.assists||0} · 补刀 ${game.player.cs||0}`);show('end-panel');soundEvent('start');}
function updateHud(){const p=game.player;txt('match-time',formatTime(game.time));txt('score-blue',game.score?.blue||0);txt('score-red',game.score?.red||0);txt('hero-level',p.level||1);txt('hp-text',`${Math.ceil(Math.max(0,p.hp))} / ${p.maxHp}`);$('hp-fill').style.width=`${Math.max(0,p.hp/p.maxHp)*100}%`;txt('mana-text',`${Math.ceil(p.mana||0)} / ${p.maxMana||0}`);$('mana-fill').style.width=`${(p.mana||0)/(p.maxMana||1)*100}%`;$('xp-fill').style.width=`${Math.min(100,(p.xp||0)/(p.xpToNext||p.nextLevelXp||200)*100)}%`;txt('gold',Math.floor(p.gold??game.gold??0).toLocaleString());txt('kda',`${p.kills||0} / ${p.deaths||0} / ${p.assists||0}`);txt('cs',p.cs||0);txt('shop-gold',Math.floor(p.gold||0));
 txt('shop-status',game.practice?'练习模式 · 随时购买、合成和出售装备':!p.alive?'阵亡期间 · 可购买、合成和出售装备':game.canShop()?'泉水商店 · 点击装备购买或合成':'返回泉水购买与出售 · B 回城');
 if(!$('shop-panel').classList.contains('hidden'))shopView?.update();
 for(const b of [...skillButtons,...sumButtons]){const key=b.dataset.key,cd=p.cooldowns?.[key]||0;b.classList.toggle('on-cooldown',cd>0);b.classList.toggle('selected',armed===key);const lockedSkill=key==='R'&&p.level<6;const recharging=heroId==='teemo'&&key==='R'&&p.skillLevels.R>0&&p.shroomCharges<=0;const rechargeLeft=Math.max(0,28-p.skillLevels.R*4-(p.shroomRecharge||0));const levels=p.skillLevels||p.skillRanks;b.classList.toggle('unlearned',lockedSkill||(levels&&levels[key]===0));b.classList.toggle('recharging',recharging);b.querySelector('.cooldown').textContent=lockedSkill?'6级':recharging?Math.ceil(rechargeLeft):cd>.05?cd<10?cd.toFixed(1):Math.ceil(cd):'';const dots=b.querySelector('.skill-level-dots');if(dots)dots.textContent='▪'.repeat(levels?.[key]||1);const rank=levels?.[key]||0,max=key==='R'?3:5,required=key==='R'?[6,11,16][rank]:rank*2+1;b.querySelector('.upgrade-skill')?.classList.toggle('hidden',!(p.skillPoints>0&&rank<max&&p.level>=required));}
 itemButtons.forEach((b,i)=>{const slot=p.inventory?.[i],item=ITEMS.find(it=>it.id===slot?.id);if(b.dataset.item!==(slot?.id||'')){b.dataset.item=slot?.id||'';b.querySelector('.item-icon').innerHTML=item?`<img src="${BASE_URL}assets/item-${item.id}.png" alt="${item.name}" draggable="false">`:'';}b.querySelector('.item-count').textContent=slot?.count>1?slot.count:'';b.querySelector('.item-cooldown').textContent=slot?.cooldown>.05?Math.ceil(slot.cooldown):'';b.title=item?`${item.name}\n${item.description}${slot.count>1?`\n数量 ${slot.count}`:''}${item.active?'\n点击或按对应数字键使用':'\n按 P 打开商店可出售'}`:'空装备栏';b.classList.toggle('equipped',!!item);});
 txt('hero-mechanic',heroId==='yasuo'?`旋风 ${p.qStacks||0} / 2 · 浪客护盾 ${Math.round(p.flow||0)}%`:heroId==='teemo'?`蘑菇 ${p.skillLevels.R?`${p.shroomCharges} / 3${p.shroomCharges<3?` · ${Math.ceil(Math.max(0,28-p.skillLevels.R*4-(p.shroomRecharge||0)))}秒补充`:''}`:'6级学习 R'}${p.stealthed?' · 隐身中':''}`:heroId==='jinx'?`${p.rocketMode?'火箭炮 · 范围爆炸':'机枪 · 连射叠速'}${p.excitedUntil>game.time?' · 罪恶快感':''}`:'');
 const wardCd=p.cooldowns?.['4']||0;txt('ward-button',wardCd>0?`${Math.ceil(wardCd)}s`:`插眼 ${p.wardCharges??2}`);$('ward-button').title=`侦查守卫 · ${p.wardCharges??2} 层充能 · [4]`;
 if(!p.alive){txt('toast',`你已阵亡 · ${Math.ceil(p.respawnTimer??Math.max(0,(p.respawnAt||game.time)-game.time))} 秒后重生`);show('toast');}else if(p.recallAt>game.time){txt('toast',`回城中 · ${Math.max(0,p.recallAt-game.time).toFixed(1)} 秒`);show('toast');}
 if(selected?.alive){show('target-panel');txt('target-name',selected.name||selected.heroId||({tower:'防御塔',minion:'小兵',nexus:'水晶枢纽',inhibitor:'召唤水晶',monster:'野怪'})[selected.kind]);$('target-hp-fill').style.width=`${selected.hp/selected.maxHp*100}%`;selectionRing.visible=true;selectionRing.position.set(selected.x,.15,selected.z);selectionRing.scale.setScalar((selected.radius||2)/2);}else{show('target-panel',false);selectionRing.visible=false;}
 if(game.winner&&!ended)finish();}
function renderScoreboard(){if(!$('scoreboard-body'))return;const heroes=game.entities.filter(e=>e.kind==='hero');$('scoreboard-body').innerHTML=['blue','red'].map(team=>`<section class="score-team ${team}"><h3>${team==='blue'?'蓝色方':'红色方'}</h3>${heroes.filter(e=>e.team===team).map(e=>`<div class="score-row"><img src="${BASE_URL}assets/${e.heroId}-portrait.png" alt=""><strong>${CHAMPIONS.find(h=>h.id===e.heroId)?.name||e.heroId}${e.id===game.player.id?' · 你':''}</strong><span>Lv ${e.level}</span><span>${e.kills||0}/${e.deaths||0}/${e.assists||0}</span><span>${e.cs||0} CS</span></div>`).join('')}</section>`).join('');}
function formatTime(t){return`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height);const span=running?zoom:150;const ratio=width/height;camera.left=-span*ratio/2;camera.right=span*ratio/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);
function mapRender(){const s=minimap.width,k=s/256,m=v=>(v+128)*k;mctx.clearRect(0,0,s,s);mctx.fillStyle='#183728';mctx.fillRect(0,0,s,s);mctx.strokeStyle='#24594d';mctx.lineWidth=12;mctx.beginPath();mctx.moveTo(m(-110),m(-110));mctx.lineTo(m(110),m(110));mctx.stroke();
 mctx.lineWidth=5;mctx.strokeStyle='#68715a';for(const points of Object.values(LANES)){mctx.beginPath();points.forEach((p,i)=>i?mctx.lineTo(m(p.x),m(p.z)):mctx.moveTo(m(p.x),m(p.z)));mctx.stroke();}
 // Fog is punched out only by friendly units and wards.
 const fog=fogCanvas,fc=fogContext;fc.globalCompositeOperation='source-over';fc.clearRect(0,0,s,s);fc.fillStyle='rgba(2,9,15,.72)';fc.fillRect(0,0,s,s);fc.globalCompositeOperation='destination-out';for(const e of [...game.entities.filter(e=>e.alive&&e.team==='blue'),...(game.reveals||[]).filter(e=>e.team==='blue'&&e.until>game.time)]){const r=(e.radius&&e.until?e.radius:e.kind==='ward'?23:e.kind==='hero'?31:e.kind==='tower'?31:20)*k,gr=fc.createRadialGradient(m(e.x),m(e.z),r*.65,m(e.x),m(e.z),r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');fc.fillStyle=gr;fc.beginPath();fc.arc(m(e.x),m(e.z),r,0,Math.PI*2);fc.fill();}mctx.drawImage(fog,0,0);
 for(const e of game.entities){if(!e.alive||(e.team!=='blue'&&game.isVisible&&!game.isVisible(e)&&!['tower','nexus','inhibitor'].includes(e.kind)))continue;mctx.fillStyle=e.team==='blue'?'#58cef1':e.team==='red'?'#ff6675':e.kind==='monster'?'#d4b976':'#8fffd1';let r=e.kind==='hero'?3.1:e.kind==='nexus'?4.5:e.kind==='tower'?2.5:e.kind==='monster'?2.5:1.2;if(e.kind==='hero'){mctx.strokeStyle=e.id===game.player.id?'#fffbe0':'#111e28';mctx.lineWidth=e.id===game.player.id?1.5:.8;}mctx.beginPath();mctx.arc(m(e.x),m(e.z),r,0,Math.PI*2);mctx.fill();if(e.kind==='hero')mctx.stroke();}
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];mctx.strokeStyle='#e3d8ac';mctx.lineWidth=.8;mctx.beginPath();corners.forEach(([x,y],i)=>{const point=new THREE.Vector3();ray.setFromCamera(new THREE.Vector2(x,y),camera);ray.ray.intersectPlane(plane,point);if(i)mctx.lineTo(m(point.x),m(point.z));else mctx.moveTo(m(point.x),m(point.z));});mctx.closePath();mctx.stroke();}
let audio;function initAudio(){if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}
function soundEvent(type){if(!sound)return;try{initAudio();const tones={spell:[460,720,.08],gold:[950,1400,.08],purchase:[500,800,.18],level:[550,1100,.25],start:[210,430,.6]};const [start,end,duration]=tones[type]||[330,200,.1];const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type==='spell'?'sine':'triangle';oscillator.frequency.setValueAtTime(start,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(end,audio.currentTime+duration);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}catch{}}
function frame(){requestAnimationFrame(frame);const rawDt=clock.getDelta(),dt=Math.min(rawDt,.2);total+=dt;fpsTime+=rawDt;fpsFrames++;if(fpsTime>1){txt('fps',Math.round(fpsFrames/fpsTime));fpsFrames=0;fpsTime=0;}
 if(running&&!paused&&!ended){for(let remaining=dt;remaining>0.0001;remaining-=.05)game.update(Math.min(.05,remaining));processEvents();hudTime+=dt;if(hudTime>.1){updateHud();mapRender();hudTime=0;}}
 if(running&&!paused&&!ended){
   const pan= cameraGesture?{x:0,z:0}:cameraPan(mouse,{width,height},pressed,zoom,dt);
   if(pressed.has(' ')){cancelCameraGesture();cameraCenter.set(game.player.x,0,game.player.z);}
   else if(pan.x||pan.z){if(locked){locked=false;updateCameraButton();}cameraCenter.x+=pan.x;cameraCenter.z+=pan.z;}
   else if(locked&&!cameraGesture)cameraCenter.lerp(new THREE.Vector3(game.player.x,0,game.player.z),1-Math.exp(-dt*15));
 }
 else if(!running)cameraCenter.lerp(new THREE.Vector3(-5,0,12),.01);
 if(running){cameraCenter.x=THREE.MathUtils.clamp(cameraCenter.x,-120,120);cameraCenter.z=THREE.MathUtils.clamp(cameraCenter.z,-120,120);}
 camera.position.copy(cameraCenter).add(new THREE.Vector3(0,110,86));camera.lookAt(cameraCenter);camera.updateMatrixWorld();
 if(running&&mouse.inside&&!cameraGesture){const point=pointerPoint(mouse.x,mouse.y);hovered=entityAtPointer(mouse.x,mouse.y,point);}else hovered=null;updateCursor();
 world.update(total,paused?0:dt);actors.sync(game,paused?0:dt,total,camera,width,height,running);
 aim.visible=running&&!!armed&&!paused;if(aim.visible){aim.position.set(game.player.x,.24,game.player.z);const range=heroId==='yasuo'&&armed==='Q'&&game.player.qStacks>=2&&game.player.qStackUntil>game.time?47:armed==='4'?28:armed==='D'?22:armed==='A'?game.player.attackRange||15:CHAMPIONS.find(h=>h.id===heroId).skills.find(s=>s.key===armed)?.range||35;aimCircle.scale.setScalar(range/10);aimGeometry.attributes.position.setXYZ(1,targetPoint.x-game.player.x,0,targetPoint.z-game.player.z);aimGeometry.attributes.position.needsUpdate=true;aimGeometry.computeBoundingSphere();}
 renderer.render(scene,camera);
}
populateLobby();resize();show('loading-screen',false);txt('ping','本地对局');requestAnimationFrame(frame);
// A small read-only diagnostics surface supports browser verification and performance review.
window.__rift={get game(){return game;},get renderer(){return renderer;},get camera(){return camera;},get scene(){return scene;},get actors(){return actors;},get world(){return world;},get running(){return running;},get paused(){return paused;},get armed(){return armed;},get hero(){return heroId;},get cameraLocked(){return locked;},get cameraCenter(){return{x:cameraCenter.x,z:cameraCenter.z};},start,chooseHero,worldToScreen(x,z,y=0){const p=new THREE.Vector3(x,y,z).project(camera);return{x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height};}};
