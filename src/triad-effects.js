import * as THREE from 'three';

const CARD_COLORS={BLUE:0x58a6ff,RED:0xff5e6d,GOLD:0xffd75c};
function card(fx,group,color,x,y,z,size=.6){
 const edge=fx.mesh(group,'box',color,.9);edge.position.set(x,y,z);edge.scale.set(size,size*1.5,.045);
 const face=fx.mesh(group,'box',0xfff3d3,.7);face.position.set(x,y,z+.035);face.scale.set(size*.75,size*1.25,.02);
 const mark=fx.mesh(group,'crystal',color,1);mark.position.set(x,y,z+.06);mark.scale.set(size*.22,size*.3,.018);
 return edge;
}
function cardOrbit(fx,from,to,color,duration=1.5){
 const group=new THREE.Group();group.name='twistedfate-gate-card-orbit';group.userData.shape='card-orbit';
 const cards=[];for(let i=0;i<8;i++){const cg=new THREE.Group();group.add(cg);card(fx,cg,color,0,0,0,.8);cards.push(cg);}
 fx.add(group,duration,(_,t)=>{group.position.copy(from);for(const[i,cg]of cards.entries()){const a=i*Math.PI/4+t*Math.PI*2;cg.position.set(Math.sin(a)*3.8,.9+Math.sin(a+t*3)*.55,Math.cos(a)*3.8);cg.rotation.set(.12,a+t,Math.sin(t*4+i)*.2);}});
 fx.rune(from.x,from.z,color,4.2,duration);if(to)fx.rune(to.x,to.z,color,4.2,duration);
}
function destinyEye(fx,from,color){
 const group=new THREE.Group();group.name='twistedfate-destiny-eye';group.position.copy(from);group.position.y=6.2;group.userData.shape='destiny';
 const iris=fx.mesh(group,'ring',color,.9);iris.scale.set(2.2,1.1,1);
 const pupil=fx.mesh(group,'crystal',0xffe9b2,1);pupil.scale.set(.22,.55,.12);
 fx.add(group,1.9,(_,t)=>{group.position.y=6.2+Math.sin(t*Math.PI)*1.1;iris.rotation.z=t*.18;});
 fx.rune(from.x,from.z,color,7,1.5);
}
function plasmaMark(fx,point,color){
 const group=new THREE.Group();group.name='kaisa-plasma-detonation';group.userData.shape='plasma';group.position.set(point.x,2,point.z);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,shard=fx.mesh(group,'crystal',i%2?color:0xf5d5ff,.92);shard.position.set(Math.sin(a)*2.6,Math.cos(a)*2.6,0);shard.rotation.z=-a;shard.scale.set(.21,.71,.15);}
 fx.add(group,.75,(_,t)=>{group.rotation.y=t*2;group.scale.setScalar(.4+Math.sin(t*Math.PI)*1.4);});
 fx.burst(point.x,2,point.z,color,48,10,.8);fx.ring(point.x,point.z,color,4.5,.7);
}
function hookTether(fx,from,to,color,source,resolve,duration=.7){
 const group=new THREE.Group();group.name='camille-hookshot-cables';group.userData.shape='hookshot';
 const beams=[];for(const side of[-1,1]){const cable=fx.mesh(group,'cylinder',color,.95);beams.push({cable,side});const hook=fx.mesh(group,'crystal',0xe3fffa,.9);hook.position.copy(to);hook.scale.set(.23,.23,.7);hook.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);}
 const origin=new THREE.Vector3(),delta=new THREE.Vector3();
 fx.add(group,duration,(_,t)=>{const e=source&&resolve?.(source.id);origin.set(e?.x??from.x,2.6,e?.z??from.z);for(const{cable,side}of beams){const start=origin.clone();start.x+=side*.75;delta.copy(to).sub(start);const length=delta.length();cable.position.copy(start).addScaledVector(delta,.5);cable.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());cable.scale.set(.035,length,.035);}});
 fx.ring(to.x,to.z,color,2.2,.5);
}

export function triadSpell(fx,e,hero,from,to,color,context={}){
 if(hero==='twistedfate'){
  const selected=Object.keys(CARD_COLORS).find(key=>e.key.includes(key));
  if(e.key==='Q'){
   fx.burst(from.x,2.3,from.z,color,18,3,.35);
   if(!context.liveMissiles){const direction=Math.atan2(to.x-from.x,to.z-from.z);for(let i=-1;i<=1;i++){const endpoint=new THREE.Vector3(from.x+Math.sin(direction+i*.23)*42,2.4,from.z+Math.cos(direction+i*.23)*42);fx.lineBurst(from,endpoint,i===0?0xffd969:color,16,.14,.5);}}
  }else if(e.key==='DESTINY'||e.key==='R'){destinyEye(fx,from,color);
  }else if(e.key==='R2_GATE'||e.key==='GATE_CHANNEL'){cardOrbit(fx,from,to,color,1.5);
  }else if(e.key==='GATE'){cardOrbit(fx,to,null,color,.65);fx.burst(from.x,2,from.z,color,32,8,.65);fx.burst(to.x,2,to.z,0xffe4a4,32,8,.65);
  }else if(e.key.startsWith('CARD_')){const tint=CARD_COLORS[selected]||color,group=new THREE.Group();group.name=`twistedfate-${selected||'wild'}-card-hit`;group.position.set(to.x,3,to.z);card(fx,group,tint,0,0,0,.95);fx.add(group,.5,(_,t)=>{group.rotation.y=t*4;group.position.y=3+t;group.scale.setScalar(1+t*.5);});fx.impact(to.x,to.z,tint,selected==='RED'?5.5:3,'magic');
  }else if(selected){fx.rune(from.x,from.z,CARD_COLORS[selected],2.3,.6);fx.burst(from.x,3,from.z,CARD_COLORS[selected],12,3,.5);
  }else if(e.key==='W'||e.key==='W_CYCLE'){const group=new THREE.Group();group.position.copy(from);group.name='twistedfate-pick-a-card';for(let i=0;i<3;i++)card(fx,group,Object.values(CARD_COLORS)[i],(i-1)*.85,2,0,.6);fx.add(group,.8,(_,t)=>group.rotation.y=t*.6);}
  return true;
 }
 if(hero==='kaisa'){
  if(e.key==='PLASMA_BURST'){plasmaMark(fx,to,color);
  }else if(e.key==='PLASMA'||e.key==='PLASMA_MARK'){fx.ring(to.x,to.z,color,1.7,.35);
  }else if(['Q','W'].includes(e.key)){
   for(const side of[-1,1])fx.burst(from.x+side*1.1,3,from.z-.3,color,e.key==='Q'?10:18,4,.3);
   if(!context.liveMissiles)fx.beam(from,to,color,e.key==='W'?.24:.1,.45,true);
  }else if(e.key==='E'||e.key==='E_READY'){
   fx.rune(from.x,from.z,color,2.6,e.key==='E'?.8:.5);for(const side of[-1,1])fx.beam(new THREE.Vector3(from.x+side*.8,1,from.z),new THREE.Vector3(from.x+side*1.3,4.2,from.z-.5),color,.12,.65,true);
  }else if(e.key==='R'){
   fx.lineBurst(from,to,color,35,.5,.65);fx.rune(to.x,to.z,color,4.2,.8);fx.slash(to.x,to.z,color,4,Math.atan2(to.x-from.x,to.z-from.z),.55);
  }else fx.rune(from.x,from.z,color,2.4,.6);
  return true;
 }
 if(hero==='camille'){
  const angle=Math.atan2(to.x-from.x,to.z-from.z);
  if(e.key==='E'){hookTether(fx,from,to,color,context.source,context.resolve,.75);
  }else if(e.key==='E2'){
   hookTether(fx,from,to,color,context.source,context.resolve,.3);fx.lineBurst(from,to,color,28,.35,.6);fx.slash(to.x,to.z,0xc3fff2,3,angle,.4);
  }else if(['Q','Q2','Q_HIT','Q2_HIT'].includes(e.key)){
   fx.slash(from.x,from.z,e.key==='Q2'?0xf0fff9:color,e.key==='Q2'?4.4:3,angle,.35);fx.burst(from.x,1.2,from.z,color,14,5,.4);
  }else if(e.key==='W'){fx.cone(from,to,color,e.radius||18,.6);
  }else if(e.key==='R'){fx.lineBurst(from,to,color,20,.4,.5);fx.rune(to.x,to.z,color,e.radius||12,.8);
  }else fx.ring(to.x,to.z,color,2.8,.6);
  return true;
 }
 return false;
}

export function triadAction(actor,e,hero){
 if(!actor||!['twistedfate','kaisa','camille'].includes(hero))return;
 const key=e.type==='attack'?'attack':e.key;
 actor.triadAction={key,age:0,duration:hero==='kaisa'&&key==='E'?.8:hero==='twistedfate'&&key==='R2_GATE'?1.5:.45};
}

export function animateTriad(actor,e,dt,time,game){
 const data=actor.mesh.userData,action=actor.triadAction;
 if(!['twistedfate','kaisa','camille'].includes(e.heroId))return;
 let progress=0,pulse=0;
 if(action){action.age+=dt;progress=Math.min(1,action.age/action.duration);pulse=Math.sin(progress*Math.PI);if(progress>=1)actor.triadAction=null;}
 if(data.cardFan){data.cardFan.rotation.set(0,0,action&&['Q','attack'].includes(action.key)?pulse*-.55:Math.sin(time*1.7)*.04);data.cardFan.position.z=.65+pulse*.5;}
 if(data.selectedCards){const color=e.ext?.lockedCard||(e.ext?.cardCycle?.until>game.time?e.ext.cardChoice:null),colorIndex={blue:0,red:1,gold:2}[String(color||'').toLowerCase()];for(const[i,card]of data.selectedCards.entries()){card.visible=colorIndex===i;card.rotation.y=Math.sin(time*1.4)*.25;card.position.y=5.18+Math.sin(time*3)*.08;}}
 for(const[side,pod]of(data.voidPods||[]).entries()){pod.rotation.x=action&&['Q','W','attack'].includes(action.key)?pulse*-.48:Math.sin(time*2+side)*.035;pod.rotation.z=(side===0?1:-1)*.22;}
 if(e.heroId==='camille'){
  data.body.rotation.x=action&&['E','E2','R'].includes(action.key)?pulse*.17:0;
  if(action&&['Q','Q2','attack'].includes(action.key)){const leg=data.legs[1];leg.rotation.x=-pulse*.95;leg.rotation.z=-pulse*.35;}else for(const leg of data.legs)leg.rotation.z=0;
  for(const[side,hook]of(data.hookHands||[]).entries())hook.rotation.y=(side===0?-1:1)*pulse*.45;
 }
}
