import * as THREE from 'three';

export const TRIAD_HERO_IDS=['twistedfate','kaisa','camille'];

// The new silhouettes keep each weapon or blade in a movable group; Actors
// batches the static painted geometry within those groups after skin mapping.
export function createTriadHero(e,kit){
 const {sphere,box,cylinder,ring,rod,part,geo}=kit,id=e.heroId,g=new THREE.Group(),body=new THREE.Group(),skin=0xf4c9af,team=e.team==='blue'?0x45deee:0xee5062;
 g.add(body);g.userData.body=body;g.userData.detailHeadHeight=id==='camille'?4.3:3.6;g.userData.modelHeight=id==='camille'?7:6.5;
 const shape=(key,points,depth=.08)=>geo(`triad:${id}:${key}`,()=>{const p=new THREE.Shape();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();const geometry=new THREE.ExtrudeGeometry(p,{depth,bevelEnabled:true,bevelSegments:1,bevelSize:.025,bevelThickness:.025,steps:1});geometry.translate(0,0,-depth*.5);return geometry;});
 const plate=(target,key,color,points,x,y,z,scale=[1,1,1])=>part(target,shape(key,points),color,x,y,z,scale);
 const trim=(target,color,points,r=.025)=>{for(let i=1;i<points.length;i++)rod(target,color,points[i-1],points[i],r);};
 const jewel=(target,color,x,y,z,scale)=>part(target,geo('triad-crystal',()=>new THREE.OctahedronGeometry(1)),color,x,y,z,scale,true);
 const headY=g.userData.detailHeadHeight,cloth={twistedfate:0x443454,kaisa:0x38264f,camille:0x246870}[id],metal=id==='kaisa'?0x655779:0xadc9c9;
 ring(g,team,1.6,.12,.07);
 sphere(body,skin,0,headY,0,[.57,.67,.56]);
 const legs=[];
 for(const side of[-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.43,id==='camille'?2.06:1.4,0);leg.userData.side=side;body.add(leg);legs.push(leg);
  if(id==='camille'){
   cylinder(leg,cloth,0,-.35,0,.2,.78,.22);sphere(leg,metal,0,-.79,.05,[.24,.21,.23]);
   plate(leg,`bladeLeg${side}`,metal,[[-.18,.2],[.23,.22],[.21,-.52],[.48,-1.08],[.1,-1.21],[-.12,-.68]],0,-.91,.12,[1,1,1]);
   plate(leg,`bladeEdge${side}`,0xe3f2eb,[[.14,.12],[.24,.13],[.26,-.48],[.47,-1.03],[.16,-1.14],[.15,-.64]],0,-.91,.23);
   rod(leg,0x3fe4de,[0,-.84,.21],[.06,-1.64,.32],.025);sphere(leg,0x64ffef,0,-.8,.25,[.09,.085,.035],true);
   trim(leg,0x63898d,[[-.18,-1.01,.23],[-.1,-1.39,.24],[.15,-1.8,.27]],.024);
  }else{
   rod(leg,id==='kaisa'?metal:0x272b39,[0,0,0],[0,-1.14,.08],id==='kaisa'?.205:.23);
   if(id==='kaisa'){
    plate(leg,`shinArmor${side}`,cloth,[[-.15,.34],[.18,.32],[.21,-.52],[0,-.68],[-.18,-.5]],0,-.67,.23);
    jewel(leg,0xb589eb,0,-.4,.27,[.07,.14,.04]);
   }
   box(leg,id==='kaisa'?0x292439:0x2e2936,0,-1.08,.2,[.4,.3,.69]);
  }
 }
 g.userData.legs=legs;
 if(id==='twistedfate')cylinder(body,cloth,0,2.05,0,.76,1.63,.59);
 else{
  sphere(body,cloth,0,id==='camille'?2.86:2.15,0,[.63,.81,.41]);
  sphere(body,metal,0,id==='camille'?2.27:1.58,0,[.64,.26,.37]);
  cylinder(body,0x282334,0,id==='camille'?2.5:1.89,0,.4,.56,.51);
 }
 const arms=[];
 for(const side of[-1,1]){
  const arm=new THREE.Group(),armY=id==='camille'?3.23:2.67;arm.position.set(side*.8,armY,0);arm.userData.side=side;arm.userData.hand=[side*.19,-.7,.3];body.add(arm);
  sphere(arm,id==='twistedfate'?cloth:metal,0,0,0,[.29,.3,.29]);rod(arm,cloth,[0,-.12,0],arm.userData.hand,.16);sphere(arm,id==='twistedfate'?skin:metal,...arm.userData.hand,[.18,.22,.18]);
  if(id!=='twistedfate')plate(arm,`armGuard${side}`,metal,[[-.16,.26],[.18,.24],[.2,-.3],[-.13,-.39]],side*.1,-.39,.28);
  arms.push(arm);
 }
 g.userData.arms=arms;
 if(id==='twistedfate'){
  sphere(body,0x312537,0,3.9,-.2,[.6,.33,.51]);
  const brim=cylinder(body,0x392938,0,4.02,0,1.32,.095,1.33);brim.scale.z=.78;brim.rotation.z=-.08;
  const crown=cylinder(body,0x493248,0,4.35,-.1,.57,.7,.45);crown.rotation.z=-.08;cylinder(body,0xa68b55,0,4.1,-.05,.585,.13,.58);
  for(const side of[-1,1]){
   plate(body,`coatFront${side}`,cloth,[[-.25,.47],[.3,.46],[.44,-1.61],[-.36,-1.5]],side*.47,2.03,.53,[1,1,1]);
   plate(body,`lapel${side}`,0x826474,[[0,.4],[side*.33,.63],[side*.55,.13],[side*.22,-.55]],0,2.67,.58);
   trim(body,0xc3a570,[[side*.75,.59,.6],[side*.71,1.3,.7],[side*.46,2.11,.77]],.033);
   for(let i=0;i<4;i++){const y=.85+i*.29;jewel(body,0x987950,side*.63,y,.74,[.06,.1,.015]);}
   const back=plate(body,`coatBack${side}`,0x302436,[[-.34,.58],[.34,.59],[.48,-1.57],[-.41,-1.5]],side*.4,2.01,-.5);back.rotation.y=side*.08;
   sphere(body,0x332437,side*.49,3.26,-.36,[.18,.44,.2]);
  }
  plate(body,'shirt',0xc8baa1,[[-.28,.48],[.28,.48],[.2,-.56],[-.21,-.55]],0,2.52,.72);
  const cravat=plate(body,'cravat',0xd9b069,[[-.12,.4],[.12,.4],[.17,-.17],[0,-.42],[-.16,-.16]],0,2.57,.81);
  for(let i=0;i<3;i++)sphere(body,0xc0a268,.13,2.1-i*.19,.79,[.027,.027,.02]);
  const fan=new THREE.Group();fan.position.set(1.06,2.08,.65);body.add(fan);g.userData.cardFan=fan;
  for(let i=-1;i<=1;i++){const card=new THREE.Group();card.rotation.z=-i*.34;card.position.set(i*.13,.07,0);fan.add(card);makeCard(card,kit,[0x69aafa,0xeccb65,0xcf5a5f][i+1],.42,.63);}
  const selected=[];for(const [i,color]of[0x5da2ff,0xf26167,0xffd65c].entries()){const card=new THREE.Group();card.position.set(0,5.25,0);makeCard(card,kit,color,.62,.94);card.visible=false;body.add(card);selected.push(card);}g.userData.selectedCards=selected;
 }else if(id==='kaisa'){
  // Two independent, pointed void cannons sit above and behind the shoulders.
  const pods=[];for(const side of[-1,1]){
   const pod=new THREE.Group();pod.position.set(side*1.0,3.05,-.59);pod.rotation.z=-side*.22;body.add(pod);pods.push(pod);
   const shell=part(pod,geo('kaisa-void-pod',()=>new THREE.ConeGeometry(.43,1.88,7)),cloth,side*.21,.52,-.12,[1,1,.79]);shell.rotation.z=-side*.26;
   sphere(pod,0x665476,0,.15,0,[.49,.47,.54]);
   plate(pod,`podArmor${side}`,0x897497,[[-.33,-.35],[-.35,.36],[-.06,1.38],[.15,.82],[.32,.17],[.27,-.42]],0,.02,.32);
   plate(pod,`podRidge${side}`,0xc793f1,[[-.05,-.26],[.07,-.16],[.08,.78],[-.03,1.06],[-.07,.38]],0,.18,.395);
   const muzzle=ring(pod,0xbc91e7,.2,.19,.055);muzzle.rotation.x=0;muzzle.position.set(0,.19,.5);
   sphere(pod,0xd197ff,0,.19,.53,[.13,.17,.045],true);
   for(let i=0;i<3;i++){const spike=part(pod,geo('kaisa-spike',()=>new THREE.ConeGeometry(.075,.42,5)),0xbaa3ce,-side*.23,.08+i*.22,.12);spike.rotation.z=side*.85;}
  }g.userData.voidPods=pods;
  for(const side of[-1,1]){
   plate(body,`voidChest${side}`,metal,[[side*.03,.3],[side*.41,.39],[side*.56,-.02],[side*.21,-.27],[side*.04,-.09]],0,2.58,.44);
   trim(body,0xc294eb,[[side*.36,2.93,.3],[side*.49,2.52,.44],[side*.22,2.24,.5],[side*.2,1.93,.39]],.03);
   plate(body,`hipArmor${side}`,0x79678b,[[-.16,.32],[.21,.22],[.29,-.34],[-.05,-.29]],side*.47,1.6,.22);
   for(let i=0;i<3;i++)sphere(body,0x3d314f,side*(.4+i*.04),3.86-i*.32,-.41,[.19,.42,.18]);
   sphere(body,0xad59ca,side*.46,3.43,.31,[.052,.035,.028],true);
  }
  sphere(body,0x281f39,0,3.96,-.1,[.64,.45,.6]);
  for(let i=-2;i<=2;i++){const lock=part(body,geo('kaisa-hair-tip',()=>new THREE.ConeGeometry(.14,.75,6)),0x282139,i*.14,3.48,-.51,[1,1,.64]);lock.rotation.x=.24;}
  jewel(body,0xd9a3ff,0,2.25,.48,[.12,.22,.06]);
 }else{
  sphere(body,0xc2d7d5,0,4.66,-.1,[.64,.45,.6]);
  for(const side of[-1,1]){
   sphere(body,0x9cb6b9,side*.47,4.19,-.26,[.18,.43,.28]);
   plate(body,`tailcoat${side}`,cloth,[[-.22,.55],[.26,.58],[.5,-1.16],[-.3,-1.1]],side*.42,2.4,-.42);
   plate(body,`chestArmor${side}`,metal,[[side*.04,.36],[side*.49,.48],[side*.56,-.01],[side*.25,-.27],[side*.04,-.22]],0,3.2,.39);
   trim(body,0x59ddd0,[[side*.45,3.62,.22],[side*.31,3.12,.45],[side*.23,2.75,.38]],.022);
   box(body,0x1e4349,side*.66,2.69,-.1,[.27,.45,.44]);
   const spool=cylinder(body,0x93b7ba,side*.81,2.68,.02,.2,.18);spool.rotation.z=Math.PI/2;ring(body,0x55e9e0,.14,2.68,.035).position.set(side*.82,2.68,.15);
  }
  plate(body,'highCollar',cloth,[[-.44,0],[-.31,.22],[-.1,-.04],[0,-.19],[.1,-.04],[.31,.22],[.44,0],[.3,-.34],[-.3,-.34]],0,3.86,.33);
  jewel(body,0x61f6e4,0,3.02,.44,[.09,.2,.07]);box(body,0x94b5ba,0,2.64,.38,[.45,.19,.085]);
  const hooks=[];for(const side of[-1,1]){const hook=new THREE.Group();hook.position.set(side*.74,2.71,.24);body.add(hook);plate(hook,`hook${side}`,metal,[[-.08,-.1],[.14,.02],[.2,.31],[.1,.44],[-.11,.34],[-.09,.25],[.08,.24],[.05,.02]],0,0,0);hooks.push(hook);}g.userData.hookHands=hooks;
 }
 const shield=new THREE.Mesh(geo('shield',()=>new THREE.SphereGeometry(1,16,12)),new THREE.MeshBasicMaterial({color:team,transparent:true,opacity:.14,depthWrite:false}));shield.position.y=id==='camille'?2.8:2.4;shield.scale.set(2.2,id==='camille'?3.1:2.55,2.2);shield.visible=false;shield.renderOrder=3;g.add(shield);g.userData.shield=shield;
 return g;
}

export function makeCard(group,kit,color,width=.6,height=.9){
 const {box,part,geo}=kit;
 const back=box(group,0x24233e,0,0,0,[width,height,.065]);
 box(group,0xe3d8b8,0,0,.04,[width*.85,height*.9,.023]);
 const symbol=part(group,geo('card-suit',()=>new THREE.OctahedronGeometry(1)),color,0,0,.083,[width*.25,height*.23,.022],true);
 const corners=[];for(const side of[-1,1])corners.push(part(group,geo('card-suit',()=>new THREE.OctahedronGeometry(1)),color,side*width*.29,side*height*.32,.082,[width*.08,height*.07,.017],true));
 // A locked card retains its gameplay color when a costume remaps fabric.
 for(const mesh of[symbol,...corners])mesh.userData.originalFaceMaterial=mesh.material;
 return back;
}
