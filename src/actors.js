import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CombatEffects } from './combat-effects.js';
const materials = new Map(), geometries = new Map();
const mergedModels=new Map();
const mat = (color, glow=false) => {const key=color+':'+glow;if(!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({color,roughness:glow?.35:.72,metalness:glow?.4:.18,emissive:glow?color:0,emissiveIntensity:glow?.8:0}));return materials.get(key);};
const geo=(key,fn)=>{if(!geometries.has(key))geometries.set(key,fn());return geometries.get(key);};
function part(g,geometry,color,x=0,y=0,z=0,scale=[1,1,1],glow=false){const m=new THREE.Mesh(geometry,mat(color,glow));m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
const sphere=(g,c,x,y,z,s=[1,1,1],glow=false)=>part(g,geo('sphere',()=>new THREE.SphereGeometry(1,10,8)),c,x,y,z,s,glow);
const box=(g,c,x,y,z,s)=>part(g,geo('box',()=>new THREE.BoxGeometry(1,1,1)),c,x,y,z,s);
const cylinder=(g,c,x,y,z,r,h,rTop=r,glow=false)=>part(g,geo(`c${r}:${h}:${rTop}`,()=>new THREE.CylinderGeometry(rTop,r,h,10)),c,x,y,z,[1,1,1],glow);
const ring=(g,c,r,y,t=.1)=>{const m=part(g,geo(`ring${r}:${t}`,()=>new THREE.TorusGeometry(r,t,5,48)),c,0,y,0,[1,1,1],true);m.rotation.x=Math.PI/2;return m;};
function rod(g,c,a,b,r=.2){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),m=part(g,geo('rod',()=>new THREE.CylinderGeometry(1,1,1,6)),c,...a,[r,d.length(),r]);m.position.add(d.multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function hero(e){if(e.heroId==='teemo')return scoutHero(e);const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.userData.body=body;const key=e.heroId||'ahri',blue=e.team==='blue',team=blue?0x45deee:0xee5062;
const colors={ahri:0xb9234b,ashe:0x235c97,garen:0x244c8b,lux:0xe7d1a0,ezreal:0x916139,yasuo:0x345967,jinx:0x6a325f},cloth=colors[key]||0x315c68,skin=0xf4c9af,hair={ahri:0x172338,ashe:0xdcebf4,garen:0x403628,lux:0xeacf70,ezreal:0xdabc58,yasuo:0x202935,jinx:0x229de0}[key]||0x334152;
ring(g,team,1.6,.12,.07);
const legs=[];for(const s of [-1,1]){const l=new THREE.Group();l.position.set(s*.48,1.45,0);body.add(l);rod(l,key==='garen'?0x9da5aa:0x293140,[0,0,0],[0,-1.2,.12],.25);box(l,0x28303b,0,-1.15,.24,[.46,.35,.75]);legs.push(l);}g.userData.legs=legs;
cylinder(body,cloth,0,2.0,0,.9,1.55,.65);sphere(body,skin,0,3.42,0,[.58,.69,.56]);sphere(body,hair,0,3.78,-.1,[.64,.45,.6]);box(body,0xcab784,0,1.55,.78,[1.4,.18,.12]);
for(const s of [-1,1]){sphere(body,key==='garen'?0xbac5c8:cloth,s*.93,2.66,0,[key==='garen'?.65:.34,.39,.38]);rod(body,cloth,[s*.93,2.55,0],[s*1.15,1.93,.4],.22);sphere(body,skin,s*1.15,1.9,.4,[.22,.25,.22]);}
if(key==='ahri'){for(const s of [-1,1]){const ear=part(body,geo('ear',()=>new THREE.ConeGeometry(.28,.9,4)),hair,s*.42,4.25,0);ear.rotation.z=-s*.22;}
const tails=[];for(let i=0;i<9;i++){const t=new THREE.Group();t.position.set(0,1.85,-.45);body.add(t);const angle=(i-4)*.27;rod(t,0xe7dddf,[0,0,0],[Math.sin(angle)*2.3,1.1,-Math.cos(angle)*2.1],.42);sphere(t,0xfaf2ee,Math.sin(angle)*2.9,1.2,-Math.cos(angle)*2.65,[.45,.55,.9]);t.rotation.x=(i%3)*.18;tails.push(t);}g.userData.tails=tails;sphere(body,0x41e6ec,1.2,2.1,1.05,[.53,.53,.53],true);}
if(key==='ashe'){const cloak=part(body,geo('cloak',()=>new THREE.ConeGeometry(1.35,2.4,8,1,true)),0x193d70,0,1.85,-.5,[1,1,.65]);cloak.rotation.x=.1;const bow=part(body,geo('bow',()=>new THREE.TorusGeometry(1.2,.12,5,18,Math.PI)),0x62dff9,-1.3,2.4,.6,[1,1,1],true);bow.rotation.z=-Math.PI/2;rod(body,0xc2f5ff,[-1.3,1.2,.6],[-1.3,3.6,.6],.04);}
if(key==='garen'){box(body,0xc1c8c9,0,2.4,.66,[1.15,1.05,.17]);box(body,0xd2b66a,0,2.38,.78,[.14,.8,.16]);box(body,0x284b91,0,2.1,-.69,[1.5,1.9,.14]);const sword=new THREE.Group();sword.position.set(1.25,1.92,.45);body.add(sword);box(sword,0xd5e2e5,0,1.05,.1,[.32,2.9,.14]);box(sword,0xd2b15f,0,-.12,.1,[1,.15,.25]);box(sword,0x644b37,0,-.45,.1,[.18,.5,.18]);sword.rotation.z=-.24;g.userData.sword=sword;const spin=part(g,geo('spinRing',()=>new THREE.RingGeometry(3.8,4.25,48)),0xe7c875,0,.3,0,[1,1,1],true);spin.rotation.x=-Math.PI/2;spin.visible=false;g.userData.spinRing=spin;}
if(key==='lux'){cylinder(body,0xf0e6cf,0,1.5,0,1.12,1.3,.72);rod(body,0xd7bb65,[1.18,.65,.4],[1.18,4.25,.4],.1);ring(body,0xf9df8e,.45,4.18,.11).position.x=1.18;sphere(body,0xffee9a,1.18,4.2,.4,[.27,.35,.27],true);sphere(body,hair,-.45,3.25,-.27,[.22,.8,.35]);sphere(body,hair,.45,3.25,-.27,[.22,.8,.35]);}
if(key==='ezreal'){box(body,0x405267,0,2.53,.73,[1.2,.38,.12]);box(body,0xbba374,-1.1,2,.45,[.65,.54,.62]);sphere(body,0x4ecaf3,-1.12,2,.85,[.28,.28,.2],true);box(body,0x493c2c,0,2.25,-.6,[1.1,1.05,.35]);box(body,0x987d4e,0,3.87,.5,[1.02,.23,.2]);}
if(key==='yasuo'){
 sphere(body,skin,.18,2.6,.58,[.48,.58,.24]);
 for(let i=0;i<3;i++)box(body,0x8b9387,-1.02,2.83-i*.16,.05,[.88,.19,.96]);
 cylinder(body,0x28303a,0,4.05,-.18,.3,.55,.42);
 sphere(body,0x1a2432,0,4.5,-.35,[.34,.42,.32]);
 const pony=new THREE.Group();pony.position.set(0,4.35,-.36);body.add(pony);rod(pony,0x172431,[0,0,0],[0,-.5,-1.2],.22);rod(pony,0x172431,[0,-.5,-1.2],[0,-1.55,-1.5],.19);g.userData.ponytail=pony;
 const scarf=new THREE.Group();scarf.position.set(-.3,3,-.5);body.add(scarf);box(scarf,0x2d85a6,0,-.18,-.7,[.8,.32,1.7]);box(scarf,0x386f87,.28,-.55,-1.65,[.55,.25,1.2]);g.userData.scarf=scarf;
 box(body,0x9a7850,0,1.67,.84,[1.65,.26,.25]);
 const sword=new THREE.Group();sword.position.set(1.17,1.95,.55);body.add(sword);rod(sword,0xd8eeeb,[0,0,0],[.3,3.7,.15],.075);box(sword,0xe4f9ee,.17,1.95,.1,[.2,3.65,.07]);box(sword,0xcfb073,0,.08,0,[.75,.16,.36]);rod(sword,0x203346,[0,-.65,0],[0,.05,0],.12);sword.rotation.z=-.62;g.userData.sword=sword;
 rod(body,0x234251,[-.95,1.6,-.3],[-1.1,-.1,-.9],.12);
}
if(key==='jinx'){
 box(body,0x252d3d,0,1.55,.64,[1.4,.45,.34]);box(body,0x8e3d74,0,2.12,.81,[1.22,.5,.13]);
 for(const s of [-1,1]){sphere(body,0x2cc3eb,s*.48,3.7,-.46,[.3,.46,.4]);const braid=new THREE.Group();braid.position.set(s*.67,3.56,-.38);body.add(braid);for(let i=0;i<8;i++)sphere(braid,i%2?0x1574b7:0x2aace5,s*(i*.105)+Math.sin(i*1.8)*.08,-i*.4,-i*.065,[.21,.28,.22]);box(braid,0xaf417f,s*.74,-3.15,-.46,[.25,.22,.23]);g.userData.braids??=[];g.userData.braids.push(braid);}
 const rocket=new THREE.Group();rocket.position.set(-1.26,2.27,.34);body.add(rocket);const barrel=cylinder(rocket,0x253842,0,0,.4,.46,2.8,.59);barrel.rotation.x=Math.PI/2;const nose=part(rocket,geo('jinxRocketNose',()=>new THREE.ConeGeometry(.57,.9,10)),0x527c7d,0,0,2.2);nose.rotation.x=Math.PI/2;sphere(rocket,0xf45b8b,-.3,.2,1.7,[.13,.12,.13],true);sphere(rocket,0xf45b8b,.3,.2,1.7,[.13,.12,.13],true);for(const s of [-1,1])box(rocket,0x728985,s*.55,0,.1,[.23,.84,.8]);rod(rocket,0x765464,[0,-.75,-.4],[0,0,-.4],.13);g.userData.rocket=rocket;
 rod(body,0x35465b,[1.22,2.05,.5],[1.22,2.05,1.68],.2);sphere(body,0xfaa764,1.22,2.05,1.76,[.17,.17,.07],true);
}
const shield=new THREE.Mesh(geo('shield',()=>new THREE.SphereGeometry(1,16,12)),new THREE.MeshBasicMaterial({color:team,transparent:true,opacity:.14,depthWrite:false}));shield.position.y=2.4;shield.scale.set(2.05,2.55,2.05);shield.visible=false;shield.renderOrder=3;g.add(shield);g.userData.shield=shield;
return g;}
function scoutHero(e){
 const g=new THREE.Group(),body=new THREE.Group(),team=e.team==='blue'?0x45deee:0xee5062;g.add(body);g.userData.body=body;ring(g,team,1.5,.12,.07);
 const legs=[];for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.44,.9,0);body.add(leg);box(leg,0x6b5536,0,-.36,.25,[.6,.58,.84]);legs.push(leg);}g.userData.legs=legs;
 sphere(body,0x56724a,0,1.35,0,[1.02,.92,.82]);box(body,0x9b7747,0,1.03,.71,[1.65,.2,.2]);
 sphere(body,0xddc5a0,0,2.4,.1,[1.01,.88,.88]);sphere(body,0xf1debc,0,2.12,.71,[.75,.43,.34]);sphere(body,0x795c40,0,2.28,1.03,[.17,.13,.11]);
 for(const s of [-1,1]){sphere(body,0xdbc8a0,s*.79,2.91,-.2,[.33,.61,.24]);sphere(body,0x302c28,s*.33,2.49,.82,[.11,.065,.065]);sphere(body,0x83a361,s*.95,1.6,.18,[.3,.42,.3]);sphere(body,0xdbbb8a,s*1.01,1.24,.4,[.25,.23,.27]);}
 sphere(body,0x486447,0,3.07,-.07,[1.12,.54,1]);cylinder(body,0x73965d,0,2.97,.24,1.19,.14);box(body,0x957543,0,3.13,.83,[1.57,.23,.18]);
 for(const s of [-1,1]){sphere(body,0xbeab78,s*.44,3.17,.88,[.35,.28,.14]);sphere(body,0x375e65,s*.44,3.17,1,[.25,.2,.055],true);}
 const plume=part(body,geo('scoutFeather',()=>new THREE.ConeGeometry(.26,1.25,6)),0xcd5968,.84,3.52,-.2,[.75,1,.45]);plume.rotation.z=-.55;
 box(body,0x695c39,0,1.71,-.8,[1.5,1.6,.55]);box(body,0x87a159,0,2.25,-1.14,[1.12,.3,.27]);rod(body,0xb69b65,[-.84,1.88,-1.04],[.82,1.88,-1.04],.24);
 rod(body,0x92723f,[1.05,1.66,.44],[1.05,1.66,2.02],.1);cylinder(body,0xb19d66,1.05,1.66,2.03,.13,.1).rotation.x=Math.PI/2;
 const shield=new THREE.Mesh(geo('shield',()=>new THREE.SphereGeometry(1,16,12)),new THREE.MeshBasicMaterial({color:team,transparent:true,opacity:.14,depthWrite:false}));shield.position.y=1.8;shield.scale.set(1.75,1.95,1.75);shield.visible=false;g.add(shield);g.userData.shield=shield;return g;
}
function structure(e){const g=new THREE.Group(),color=e.team==='blue'?0x36d3e8:0xef3c61;
if(e.kind==='nexus'){cylinder(g,0x27323b,0,.6,0,7.2,1.2);cylinder(g,0x56616a,0,1.35,0,5.8,.6);ring(g,color,5.1,1.75,.2);const crystal=part(g,geo('crystal',()=>new THREE.OctahedronGeometry(1)),color,0,5.2,0,[3,4.5,3],true);g.userData.crystal=crystal;for(let i=0;i<6;i++){const a=i*Math.PI/3;const p=new THREE.Group();p.position.set(Math.cos(a)*5.9,0,Math.sin(a)*5.9);g.add(p);cylinder(p,0x566570,0,2.2,0,.6,3.4,.4);sphere(p,color,0,4,0,[.35,.35,.35],true);}}
else if(e.kind==='inhibitor'){cylinder(g,0x3a4a55,0,.5,0,3.5,1);ring(g,color,2.7,1,.15);part(g,geo('crystal',()=>new THREE.OctahedronGeometry(1)),color,0,2.4,0,[1.7,2.2,1.7],true);}
else {cylinder(g,0x3c4850,0,.5,0,3.35,1);cylinder(g,0x60656a,0,1.2,0,2.5,.6);cylinder(g,0x53626a,0,3.4,0,1.7,4.0,1.35);cylinder(g,0x919084,0,5.5,0,2.1,.5);cylinder(g,0x455663,0,6.4,0,1.3,1.5,.9);part(g,geo('crystal',()=>new THREE.OctahedronGeometry(1)),color,0,8.3,0,[1.1,1.8,1.1],true);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(g,0x8a8c85,Math.cos(a)*1.9,5.8,Math.sin(a)*1.9,[.8,1.3,.8]);}ring(g,color,2.65,1.55,.12);}
return g;}
function minion(e){const g=new THREE.Group(),c=e.team==='blue'?0x3384c3:0xb1394a,type=e.minionType||e.type||'melee',caster=['caster','ranged'].includes(type);
if(type==='cannon'){box(g,0x493f35,0,.8,0,[2.15,.7,2.7]);box(g,c,0,1.4,-.45,[1.7,.6,1.7]);const barrel=cylinder(g,0x566570,0,1.85,.6,.36,2.45,.48);barrel.rotation.x=Math.PI/2;const muzzle=cylinder(g,0x202d34,0,1.85,1.9,.34,.13);muzzle.rotation.x=Math.PI/2;const wheels=[];for(const side of [-1,1])for(const zz of [-.85,.85]){const wheel=part(g,geo('wheel',()=>new THREE.CylinderGeometry(.66,.66,.27,10).rotateZ(Math.PI/2)),0x6f6250,side*1.15,.67,zz);sphere(g,0xbba575,side*1.32,.67,zz,[.15,.2,.2]);wheels.push(wheel);}g.userData.wheels=wheels;part(g,geo('hood',()=>new THREE.ConeGeometry(.58,.9,8)),c,0,2.2,-.7);return g;}
cylinder(g,0x252e38,0,.65,0,.65,.8);cylinder(g,c,0,1.4,0,.8,1,.5);sphere(g,0xd6b494,0,2.1,0,[.38,.43,.38]);part(g,geo('hood',()=>new THREE.ConeGeometry(.58,.9,8)),c,0,2.55,0);if(caster){rod(g,0x6e5536,[.8,.7,.2],[.8,2.7,.2],.1);sphere(g,e.team==='blue'?0x58ddff:0xff6d86,.8,2.75,.2,[.25,.3,.25],true);}else{box(g,0x848d8a,-.82,1.5,.4,[.18,1.1,.95]);rod(g,0xb5c6cb,[.75,1.4,.5],[.75,2.8,.6],.1);}if(type==='super'){g.scale.setScalar(1.48);box(g,0x8997a3,0,1.65,.55,[1.1,.95,.22]);for(const side of [-1,1])sphere(g,0xb9b8ab,side*.8,1.8,0,[.5,.42,.5]);}return g;}
function monster(e){const g=new THREE.Group(),type=e.monsterType||e.type||e.name||'',dragon=/dragon|龙/i.test(type),baron=/baron|纳什/i.test(type),large=dragon||baron;
if(type==='wolves'){sphere(g,0x586773,0,1.5,0,[1.1,.95,2]);sphere(g,0x87929a,0,2.05,1.8,[.68,.72,.78]);sphere(g,0x657680,0,1.85,2.45,[.46,.35,.6]);sphere(g,0x18252d,0,1.9,2.92,[.25,.17,.17]);for(const side of [-1,1]){part(g,geo('wolfEar',()=>new THREE.ConeGeometry(.3,.85,4)),0x6e7d84,side*.45,2.85,1.65);sphere(g,0x77d6d5,side*.49,2.19,2.28,[.12,.12,.1],true);for(const zz of [-1.1,1])rod(g,0x4c5b68,[side*.7,1.3,zz],[side*.85,.3,zz+.2],.25);}rod(g,0x7f8c92,[0,1.4,-1.4],[0,1.6,-3],.3);return g;}
if(type==='raptors'){sphere(g,0x77526c,0,1.5,0,[1.35,1.4,1.4]);sphere(g,0x9c485a,0,2.7,1,[.65,.67,.75]);const beak=part(g,geo('beak',()=>new THREE.ConeGeometry(.4,1.3,4)),0xb09569,0,2.6,1.8);beak.rotation.x=Math.PI/2;for(const side of [-1,1]){sphere(g,0xf1c664,side*.5,2.85,1.25,[.12,.13,.12],true);rod(g,0x9d8267,[side*.7,1,0],[side*.8,.15,.4],.17);sphere(g,0x5e4965,side*1.2,1.5,-.2,[.5,1.0,1.5]);}for(let i=0;i<3;i++)rod(g,0x9b5366,[(i-1)*.4,1.7,-.8],[(i-1)*.8,2.5,-2],.17);return g;}
const c=baron?0x6d407c:dragon?0x665641:type==='blue'?0x697c82:type==='red'?0x75534a:0x516f69; sphere(g,c,0,large?3.6:1.7,0,large?[3.2,2.7,4]:[1.8,1.6,1.8]);sphere(g,c,0,large?5:2.6,large?3.8:1.7,large?[1.5,1.3,2]:[.8,.7,1]);for(const s of [-1,1]){sphere(g,baron?0xff9cd8:0xf6cf66,s*.75,large?5.4:2.8,large?5.2:2.45,[.17,.18,.17],true);for(let i=0;i<2;i++)rod(g,c,[s*(large?2.5:1.3),large?3:1.3,i*(large?4:1.8)-(large?2:1)], [s*(large?3.8:1.7),.6,i*(large?4:1.8)-(large?2:1)],large?.7:.4);}
if(type==='blue'||type==='red'){const glow=type==='blue'?0x4ed4ed:0xee6553;part(g,geo('crystal',()=>new THREE.OctahedronGeometry(1)),glow,0,1.8,1.6,[.8,1.1,.6],true);for(const side of [-1,1]){part(g,geo('crystal',()=>new THREE.OctahedronGeometry(1)),glow,side*1.6,2.5,0,[.55,1.0,.6],true);sphere(g,c,side*1.9,1.3,.8,[.65,.9,.65]);}}
if(dragon){g.userData.wings=[];if(!materials.has('dragon-wing'))materials.set('dragon-wing',new THREE.MeshStandardMaterial({color:0x826144,side:THREE.DoubleSide,roughness:.8}));for(const s of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(s*9,5);shape.lineTo(s*7,-3);shape.lineTo(s*3,-1);shape.closePath();const w=new THREE.Mesh(geo(`dragonWing${s}`,()=>new THREE.ShapeGeometry(shape)),materials.get('dragon-wing'));w.position.set(s*2,4,-1);w.rotation.x=-.5;w.castShadow=true;g.add(w);g.userData.wings.push(w);rod(g,0xb6a07d,[s*2,4,-1],[s*9,6.5,-3.5],.15);}rod(g,c,[0,3,-3],[0,2,-8],1);}
if(baron){for(let i=0;i<5;i++)rod(g,0x896492,[Math.sin(i)*2,5,0],[Math.sin(i)*3,8+i*.6,-1],.5);part(g,geo('horn',()=>new THREE.ConeGeometry(.6,2,6)),0xc3a1cb,0,7,4);}
return g;}
export function createActor(e){const g=e.kind==='hero'?hero(e):['tower','nexus','inhibitor'].includes(e.kind)?structure(e):e.kind==='monster'?monster(e):e.kind==='ward'?ward(e):minion(e);g.position.set(e.x,0,e.z);g.userData.entityId=e.id;return g;}
function ward(e){const g=new THREE.Group();cylinder(g,0x857247,0,1,0,.3,1.8);const eye=sphere(g,0x75ffc8,0,2.1,0,[.68,.45,.35],true);sphere(g,0x152d2b,0,2.15,.32,[.2,.28,.1]);ring(g,0x50c79d,.85,.18,.07);return g;}
function mergeStaticModel(group,e,directOnly=false){
 const key=[e.kind,e.team,e.heroId,e.minionType,e.monsterType,directOnly].join(':'),dynamic=new Set([group.userData.crystal,...(group.userData.wheels||[]),...(group.userData.wings||[])]),parts=[];
 if(directOnly)parts.push(...group.children.filter(o=>o.isMesh&&!dynamic.has(o)));else group.traverse(o=>{if(o.isMesh&&!dynamic.has(o))parts.push(o);});
 let model=mergedModels.get(key);
 if(!model){group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),buckets=new Map();for(const object of parts){let geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.deleteAttribute('uv');geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));if(!buckets.has(object.material))buckets.set(object.material,[]);buckets.get(object.material).push(geometry);}model=[];for(const [material,list] of buckets){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(geometry)model.push({geometry,material});}mergedModels.set(key,model);}
 for(const object of parts)object.parent?.remove(object);
 for(const entry of model){const object=new THREE.Mesh(entry.geometry,entry.material);object.castShadow=true;object.receiveShadow=true;group.add(object);}
}
const MAGIC = {ahri:0x77efff,ashe:0x8eeaff,garen:0xffcf73,lux:0xffe59d,ezreal:0x55daff,yasuo:0xa8f3e5,teemo:0x9ee462,jinx:0xff77bc};
function missileColor(p){return p.hero==='ahri'&&p.skill==='E'?0xff78bc:p.hero==='ahri'&&['W','R'].includes(p.skill)?0xbe8aff:p.hero==='jinx'&&p.rocket?0xffbb60:MAGIC[p.hero]||(p.team==='blue'?0x5bcee7:0xff7a8d);}
function missile(p){
 const group=new THREE.Group(),color=missileColor(p),ultimate=p.skill==='R',attack=p.skill==='attack',size=ultimate?.9:attack?.24:.5;
 if(p.hero==='yasuo'&&p.skill==='Q3'){
  const rings=[];for(let i=0;i<4;i++){const r=ring(group,color,.7+i*.27,-.8+i*.85,.12);r.position.z=(i%2?1:-1)*.1;rings.push(r);}galeCone(group,color);group.userData.rings=rings;
 }else if(p.hero==='jinx'&&(ultimate||p.rocket)){
  const barrel=cylinder(group,0x41606c,0,0,0,ultimate?.64:.28,ultimate?3.3:1.6);barrel.rotation.x=Math.PI/2;
  const nose=part(group,geo('rocketMissileNose',()=>new THREE.ConeGeometry(1,1.8,10)),0xff78b5,0,0,ultimate?2:1,[size*.68,size*.68,size*.68],true);nose.rotation.x=Math.PI/2;
  for(const s of [-1,1])box(group,0x89c8cf,s*size*.65,0,-size*.9,[size*.3,size*.9,size*.8]);sphere(group,0xffe892,0,0,-size*1.6,[size*.5,size*.5,size*.8],true);
 }else if(p.hero==='ashe'||p.hero==='teemo'){
  const scale=p.hero==='teemo'?.27:size,head=part(group,geo('arrowhead',()=>new THREE.ConeGeometry(1,2.5,4)),color,0,0,.5,[scale,scale,scale],true);head.rotation.x=Math.PI/2;rod(group,color,[0,0,-1.4],[0,0,.4],ultimate?.15:.055);
  if(p.hero==='ashe'&&ultimate){for(const s of [-1,1]){const fin=part(group,geo('iceFin',()=>new THREE.OctahedronGeometry(1)),0xcfffff,s*.8,0,-.35,[.37,.28,1.3],true);fin.rotation.y=s*.3;}const halo=ring(group,color,1.2,0,.07);halo.rotation.x=0;}
 }else if(p.hero==='ahri'&&p.skill==='E'){
  const shape=new THREE.Shape();shape.moveTo(0,-.8);shape.bezierCurveTo(-1.6,.35,-.8,1.2,0,.55);shape.bezierCurveTo(.8,1.2,1.6,.35,0,-.8);part(group,geo('charmHeart',()=>new THREE.ShapeGeometry(shape)),color,0,0,.02,[.85,.85,.85],true);sphere(group,0xffd7ed,0,0,0,[.22,.22,.22],true);
 }else{
  sphere(group,color,0,0,0,[size,size,size],true);sphere(group,0xecfcff,0,0,.04,[size*.4,size*.4,size*.4],true);
  if(p.hero==='ahri'&&!attack){for(const r of [size*1.3,size*1.75]){const halo=ring(group,p.returning?0xffd7ec:0x63cbff,r,0,.055);halo.rotation.x=r===size*1.3?.55:1.9;}}
  if(p.hero==='lux'){const halo=ring(group,0xffd465,size*1.8,0,.08);halo.rotation.x=0;group.userData.rings=[halo];}
  if(p.hero==='ezreal'&&ultimate){for(const s of [1,.76]){const arc=part(group,geo('ezArc',()=>new THREE.TorusGeometry(2,.16,4,18,Math.PI)),s===1?0x6de8ff:0xffe5ad,0,0,.1,[s,s,s],true);arc.rotation.z=-Math.PI/2;}}
  if(p.hero==='jinx'&&p.skill==='W'){rod(group,0xeae3ff,[0,0,-1.4],[0,0,1.4],.09);const halo=ring(group,0xc079ff,.65,0,.05);halo.rotation.x=0;}
 }
 group.userData.trailAge=0;
 return group;
}
function galeCone(group,color){const wind=part(group,geo('galeCone',()=>new THREE.ConeGeometry(1.3,4,10,1,true)),color,0,.5,0,[1,1,1],true);wind.material=zoneMaterial(color,.16);group.userData.ownedMaterials=[wind.material];}
function disposeOwned(group){group.traverse(o=>{if(o.userData.ownedMaterial)o.material.dispose();});for(const material of group.userData.ownedMaterials||[])material.dispose();}
function zoneMaterial(color,opacity=.6){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});}
function zoneMesh(group,geometry,color,opacity,x=0,y=0,z=0,scale=[1,1,1]){const m=new THREE.Mesh(geometry,zoneMaterial(color,opacity));m.userData.ownedMaterial=true;m.position.set(x,y,z);m.scale.set(...scale);m.renderOrder=2;group.add(m);return m;}
function createZone(zone){
 const group=new THREE.Group(),kind=zone.kind||({'yasuo-wall':'windwall','teemo-mushroom':'mushroom','jinx-chompers':'chompers'}[zone.type])||'light',r=zone.radius||5;
 group.userData.kind=kind;group.userData.rotation=0;
 if(kind==='windwall'){
  const length=Math.hypot(zone.toX-zone.fromX,zone.toZ-zone.fromZ)||12;
  group.userData.length=length;group.userData.rotation=Math.atan2(zone.toX-zone.fromX,zone.toZ-zone.fromZ);
  zoneMesh(group,geo('zoneBox',()=>new THREE.BoxGeometry(1,1,1)),0x91f5e7,.12,0,3.4,0,[.25,6.2,length]);
  const ribbons=[];for(let i=0;i<7;i++){const strip=zoneMesh(group,geo('zoneBox',()=>new THREE.BoxGeometry(1,1,1)),i%2?0xddfff1:0x77dcca,.55,0,.5+i*.95,0,[.14,.065,length]);ribbons.push(strip);}group.userData.ribbons=ribbons;
  for(const s of [-1,1])zoneMesh(group,geo('zoneBox',()=>new THREE.BoxGeometry(1,1,1)),0xb5fff3,.6,0,3.3,s*length*.5,[.16,6.4,.16]);
 }else if(kind==='mushroom'){
  cylinder(group,0xc8c398,0,.57,0,.36,1.0,.28);sphere(group,0x9c7348,0,1.05,0,[1.14,.54,1.06]);sphere(group,0xbb4d55,0,1.26,0,[1.01,.31,.93]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(group,0xf0d78e,Math.sin(a)*.65,1.44,Math.cos(a)*.61,[.15,.08,.15]);}
  const glow=zoneMesh(group,geo('zoneCircle',()=>new THREE.CircleGeometry(1,40)),0x93df5b,.08,0,.22,0,[r,r,r]);glow.rotation.x=-Math.PI/2;group.userData.glow=glow;
  const edge=zoneMesh(group,geo('zoneRing',()=>new THREE.RingGeometry(.95,1,48)),0xa4e87b,.38,0,.24,0,[r,r,r]);edge.rotation.x=-Math.PI/2;
 }else if(kind==='chompers'){
  box(group,0x344254,0,.42,0,[1.25,.65,1.7]);const jaw=[];
  for(const s of [-1,1]){const j=new THREE.Group();j.position.set(s*.56,.53,0);group.add(j);box(j,0x9da7a3,0,.22,0,[.2,.68,1.8]);for(let i=0;i<4;i++){const tooth=part(j,geo('chomperTooth',()=>new THREE.ConeGeometry(.17,.53,4)),0xd9e3d4,0,.63,(i-1.5)*.43);tooth.rotation.z=s*.55;}j.rotation.z=-s*.32;jaw.push(j);}group.userData.jaws=jaw;
  sphere(group,0xff60ab,0,.86,.71,[.32,.22,.1],true);const spring=ring(group,0xb7a77f,.4,.2,.05);spring.rotation.x=0;spring.position.z=-.3;
  const edge=zoneMesh(group,geo('zoneRing',()=>new THREE.RingGeometry(.95,1,48)),0xff78c6,.36,0,.22,0,[r,r,r]);edge.rotation.x=-Math.PI/2;
 }else{
  const edge=zoneMesh(group,geo('zoneRing',()=>new THREE.RingGeometry(.96,1,64)),0xffe8ab,.6,0,0,0,[r,r,r]);edge.rotation.x=-Math.PI/2;group.userData.edge=edge;
  const fill=zoneMesh(group,geo('zoneCircle',()=>new THREE.CircleGeometry(1,48)),0xc8adff,.07,0,.02,0,[r,r,r]);fill.rotation.x=-Math.PI/2;
  const inner=zoneMesh(group,geo('zoneRing',()=>new THREE.RingGeometry(.95,1,56)),0xa58fff,.36,0,.05,0,[r*.7,r*.7,r*.7]);inner.rotation.x=-Math.PI/2;group.userData.inner=inner;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const rune=zoneMesh(group,geo('zoneBox',()=>new THREE.BoxGeometry(1,1,1)),0xffe0a9,.65,Math.sin(a)*r*.84,.06,Math.cos(a)*r*.84,[.2,.1,1]);rune.rotation.y=a+Math.PI/4;}
  const orb=zoneMesh(group,geo('sphere',()=>new THREE.SphereGeometry(1,10,8)),0xffe6a9,.55,0,1.3,0,[.6,.6,.6]);group.userData.orb=orb;
 }
 return group;
}
export class Actors {
 constructor(scene,labels){this.scene=scene;this.labels=labels;this.map=new Map();this.fx=[];this.projectiles=new Map();this.zones=new Map();this._projection=new THREE.Vector3();this.effects=new CombatEffects(scene);this.visualTime=0;this.active=false;}
 clear(){
  for(const {mesh,label} of this.map.values()){this.scene.remove(mesh);mesh.userData.shield?.material.dispose();label?.remove();}this.map.clear();
  for(const mesh of this.projectiles.values()){this.scene.remove(mesh);disposeOwned(mesh);}this.projectiles.clear();
  for(const mesh of this.zones.values()){this.scene.remove(mesh);disposeOwned(mesh);}this.zones.clear();
  this.fx.forEach(f=>this.removeFx(f));this.fx=[];this.effects.clear();this.visualTime=0;
 }
 get stats(){return{...this.effects.stats,actors:this.map.size,projectiles:this.projectiles.size,zones:this.zones.size,floatingLabels:this.fx.length};}
 zoneVisible(game,zone,active){
  if(!active||zone.team==='blue')return true;if(game.isZoneVisible)return game.isZoneVisible(zone,'blue');
  if(zone.kind==='mushroom'||zone.type==='teemo-mushroom')return game.entities.some(e=>e.alive&&e.team==='blue'&&e.kind==='ward'&&e.control&&Math.hypot(e.x-zone.x,e.z-zone.z)<(e.visionRange||26));
  return !game.isVisible||game.isVisible({alive:true,kind:'zone',team:zone.team,x:zone.x,z:zone.z});
 }
 sync(game,dt,time,camera,width,height,active=true){
  this.game=game;this.active=active;this.visualTime+=dt;time=this.visualTime;const keep=new Set();
  for(const e of game.entities){
   if(!e.alive&&e.kind!=='hero')continue;keep.add(e.id);let a=this.map.get(e.id);
   if(!a){
    const mesh=createActor(e);if(e.kind!=='hero'){mesh.position.set(0,0,0);mergeStaticModel(mesh,e);mesh.position.set(e.x,0,e.z);}else mergeStaticModel(mesh.userData.body,e,true);this.scene.add(mesh);
    let label;if(e.kind!=='ward'){label=document.createElement('div');label.className=`entity-label ${e.kind} ${e.team} ${e.id===game.player.id?'player':''}`;label.innerHTML='<span class="entity-name"></span><div class="entity-health"><i></i></div>';this.labels.append(label);}
    a={mesh,label,lastX:e.x,lastZ:e.z,statusAge:0};this.map.set(e.id,a);
   }
   const visible=e.alive&&(e.team==='blue'||!active||!game.isVisible||game.isVisible(e));a.mesh.visible=visible;if(a.label)a.label.style.display=visible?'':'none';if(!visible)continue;
   const dx=e.x-a.lastX,dz=e.z-a.lastZ,moving=Math.hypot(dx,dz)>.006;
   if(['hero','minion','monster'].includes(e.kind)){const angle=a.aimUntil>game.time?a.aimAngle:moving?Math.atan2(dx,dz):Number.isFinite(e.facing)?Math.PI/2-e.facing:null;if(angle!==null){const diff=THREE.MathUtils.euclideanModulo(angle-a.mesh.rotation.y+Math.PI,Math.PI*2)-Math.PI;a.mesh.rotation.y+=diff*(1-Math.exp(-dt*15));}}
   a.mesh.position.set(e.x,e.airborneUntil>game.time?Math.sin(Math.min(1,(e.airborneUntil-game.time)/1.15)*Math.PI)*2.4:0,e.z);
   const data=a.mesh.userData;
   if(data.body){
    if(dt>0){data.body.position.y=moving?Math.sin(time*13)*.12:Math.sin(time*2)*.05;(data.legs||[]).forEach((l,i)=>l.rotation.x=moving?Math.sin(time*12+i*Math.PI)*.5:0);(data.tails||[]).forEach((t,i)=>t.rotation.z=Math.sin(time*2+i*.55)*.11);(data.braids||[]).forEach((b,i)=>b.rotation.x=Math.sin(time*3+i)*.07+(moving?.16:0));if(data.ponytail)data.ponytail.rotation.x=Math.sin(time*3)*.06+(moving?.15:0);if(data.scarf)data.scarf.rotation.x=Math.sin(time*3.5)*.08+(moving?.2:0);}
    const spinning=e.spinUntil>game.time||e.spinning;if(spinning)data.body.rotation.y+=dt*15;else data.body.rotation.y=0;
    if(data.spinRing){data.spinRing.visible=!!spinning;data.sword.rotation.z=spinning?-Math.PI/2:-.24;}
    if(e.heroId==='yasuo'&&data.sword){
     const sword=data.sword,action=a.swordAction;sword.position.set(1.17,1.95,.55);sword.rotation.set(0,0,-.62);sword.scale.setScalar(1);data.body.rotation.x=0;data.body.position.z=0;
     if(action){action.age+=dt;const t=Math.min(1,action.age/action.duration),lunge=Math.sin(t*Math.PI);
      if(action.mode==='thrust'){
       sword.rotation.set(Math.PI/2,0,-.1);sword.position.set(.75,2.1,.6+lunge*1.8);sword.scale.y=1+lunge*.2;data.body.rotation.x=lunge*.09;data.body.position.z=lunge*.42;
      }else if(action.mode==='spin'){
       data.body.rotation.y=t*Math.PI*2;sword.rotation.set(.18,0,-Math.PI/2);sword.position.set(1.2,2.2,.7);
      }else if(action.mode==='swing')sword.rotation.z=-.62-lunge*1.25;
      else if(action.mode==='dash'){sword.rotation.set(.4,0,-1.4);data.body.rotation.x=lunge*.15;}
      if(t>=1)a.swordAction=null;
     }
    }
    if(data.rocket)data.rocket.visible=!!e.rocketMode;
    if(data.shield){data.shield.visible=e.shield>0&&e.shieldUntil>game.time;data.shield.material.opacity=.12+Math.sin(time*4)*.025;}
    if(dt>0&&active){
     a.statusAge+=dt;if(a.statusAge>.08){a.statusAge=0;
      if(spinning){this.effects.trail(e.x+Math.sin(time*18)*4.4,.8,e.z+Math.cos(time*18)*4.4,0xffd16c,.9,4,.4);}
      if(e.recallAt){this.effects.trail(e.x+Math.sin(time*4)*2.2,.3+Math.sin(time*3)*.2,e.z+Math.cos(time*4)*2.2,0x7cfbe2,.8,3,1.0);}
      if(e.poisonUntil>game.time)this.effects.trail(e.x,1.5,e.z,0x8fde57,.75,2,.6);
      if(e.igniteUntil>game.time)this.effects.trail(e.x,1.4,e.z,0xff7a3c,.9,4,.45);
      if(e.excitedUntil>game.time||e.hasteUntil>game.time&&moving)this.effects.trail(e.x,.7,e.z,MAGIC[e.heroId],.55,3,.45);
     }
    }
   }
   for(const wheel of data.wheels||[])if(moving)wheel.rotation.x+=Math.hypot(dx,dz)*1.5;
   if(dt>0)for(const wing of data.wings||[])wing.rotation.x=-.5+Math.sin(time*1.7)*.055;
   if(data.crystal&&dt>0){data.crystal.rotation.y=time*.3;data.crystal.position.y=5.2+Math.sin(time*2)*.2;}
   if(a.label){const h=e.kind==='hero'?(e.heroId==='teemo'?4.9:6):e.kind==='tower'?11:e.kind==='nexus'?12:e.kind==='inhibitor'?5:e.kind==='monster'?(['dragon','baron'].includes(e.monsterType)?10:4.6):e.minionType==='super'?5:3.8;this._projection.set(e.x,h+a.mesh.position.y,e.z).project(camera);const on=this._projection.z<1&&this._projection.x>-1.1&&this._projection.x<1.1&&this._projection.y>-1.1&&this._projection.y<1.1;a.label.style.display=on?'':'none';a.label.style.transform=`translate(${(this._projection.x*.5+.5)*width}px,${(-this._projection.y*.5+.5)*height}px) translate(-50%,-100%)`;a.label.querySelector('i').style.width=`${Math.max(0,e.hp/e.maxHp)*100}%`;a.label.querySelector('.entity-name').textContent=e.kind==='hero'?`${e.id===game.player.id?'你 · ':''}${e.name||e.heroId} ${e.level||1}`:e.kind==='monster'?(e.name||'野怪'):'';}
   a.lastX=e.x;a.lastZ=e.z;
  }
  for(const [id,a]of this.map)if(!keep.has(id)){this.scene.remove(a.mesh);a.mesh.userData.shield?.material.dispose();a.label?.remove();this.map.delete(id);}
  const projectiles=new Set();
  for(const p of game.projectiles||[]){
   if(p.dead)continue;projectiles.add(p.id);let mesh=this.projectiles.get(p.id);if(!mesh){mesh=missile(p);this.scene.add(mesh);this.projectiles.set(p.id,mesh);}
   mesh.position.set(p.x,p.hero==='yasuo'&&p.skill==='Q3'?2:2.4,p.z);mesh.rotation.y=Math.atan2(p.dx,p.dz);mesh.visible=!active||p.team==='blue'||!game.isVisible||game.isVisible({alive:true,kind:'projectile',team:p.team,x:p.x,z:p.z});
   if(dt>0){for(const [i,r]of(mesh.userData.rings||[]).entries())r.rotation.y=time*(i%2?4:-4);if(mesh.visible&&active){mesh.userData.trailAge+=dt;if(mesh.userData.trailAge>.035){mesh.userData.trailAge=0;const size=p.skill==='R'?1.2:p.skill==='attack'?.4:.7;this.effects.trail(p.x,2.3,p.z,missileColor(p),size,p.skill==='R'?5:2,p.hero==='ashe'?.65:.42);if(p.hero==='jinx'&&(p.rocket||p.skill==='R'))this.effects.trail(p.x-p.dx*1.1,2.3,p.z-p.dz*1.1,0xffaa45,size,3,.5);}}}
  }
  for(const[id,mesh]of this.projectiles)if(!projectiles.has(id)){this.scene.remove(mesh);disposeOwned(mesh);this.projectiles.delete(id);}
  const zones=new Set();
  for(const zone of game.zones||[]){
   if(zone.dead)continue;const id=zone.id??`${zone.type||'light'}:${zone.sourceId}:${zone.until}:${zone.x}:${zone.z}`;zones.add(id);let group=this.zones.get(id);if(!group){group=createZone(zone);this.scene.add(group);this.zones.set(id,group);}
   group.position.set(zone.x,.2,zone.z);group.rotation.y=group.userData.rotation;group.visible=this.zoneVisible(game,zone,active);const data=group.userData;
   if(dt>0){if(data.inner)data.inner.rotation.z=time*.28;if(data.orb)data.orb.position.y=1.3+Math.sin(time*3)*.35;if(data.edge)data.edge.material.opacity=.5+Math.sin(time*3)*.1;for(const[i,ribbon]of(data.ribbons||[]).entries()){ribbon.position.y=.45+i*.95+Math.sin(time*5+i)*.2;ribbon.material.opacity=.4+Math.sin(time*4+i)*.16;}if(data.glow)data.glow.material.opacity=(game.time<zone.armedAt?.13:.055)+Math.sin(time*2)*.025;}
  }
  for(const[id,group]of this.zones)if(!zones.has(id)){this.scene.remove(group);disposeOwned(group);this.zones.delete(id);}
  for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.age+=dt;if(f.age>=f.duration){this.removeFx(f);this.fx.splice(i,1);continue;}f.el.style.opacity=1-f.age/f.duration;this._projection.set(f.x,5+f.age*5,f.z).project(camera);f.el.style.transform=`translate(${(this._projection.x*.5+.5)*width}px,${(-this._projection.y*.5+.5)*height}px)`;}
  this.effects.update(dt,camera,height);
 }
 removeFx(f){f.el?.remove();}
 pulse(x,z,color=0x55e9c1,radius=1.4,duration=.7){this.effects.ring(x,z,color,radius,duration);}
 bolt(from,to,color=0x68e8ff,size=.35,duration=.3){this.effects.bolt(from,to,color,size,duration);}
 beam(from,to,color=0x72efff,r=.3,duration=.45){this.effects.beam(from,to,color,r,duration);}
 floating(x,z,text,color='#fff'){if(this.fx.length>=50)this.removeFx(this.fx.shift());const el=document.createElement('div');el.className='floating-text';el.style.color=color;el.textContent=text;this.labels.append(el);this.fx.push({el,age:0,duration:1.2,x,z});}
 eventVisible(e,x,z){const game=this.game;if(!game||!this.active||!game.isVisible)return true;const target=game.getEntity?.(e.target),source=game.getEntity?.(e.source);return e.team==='blue'||target?.team==='blue'||source?.team==='blue'||game.isVisible({alive:true,kind:'effect',team:e.team||source?.team||'red',x,z});}
 event(e){
  const c=e.color||(e.team==='red'?0xff6078:0x74e9ff),x=e.x??e.toX??0,z=e.z??e.toZ??0,source=this.game?.getEntity?.(e.source),hero=e.hero||e.heroId||source?.heroId,liveMissiles=Array.isArray(this.game?.projectiles);
  if(!this.eventVisible(e,x,z))return;
  const from=new THREE.Vector3(e.fromX??source?.x??x,2.5,e.fromZ??source?.z??z),to=new THREE.Vector3(e.toX??x,2.5,e.toZ??z),fx=this.effects;
  if(e.type==='damage'){this.floating(x,z,Math.round(e.amount||0),e.team==='blue'?'#ffe9b9':'#ff8b8b');fx.burst(x,1.8,z,c,8,4,.32);}
  if(e.type==='gold')this.floating(x,z,`+${e.amount||0} 金币`,'#e8c775');
  if(['attack','spell'].includes(e.type)){
   const actor=this.map.get(e.source),dx=to.x-from.x,dz=to.z-from.z;
   if(actor&&Math.hypot(dx,dz)>.1){actor.aimAngle=Math.atan2(dx,dz);actor.aimUntil=(this.game?.time||0)+.5;}
   if(actor&&hero==='yasuo'){
    if(e.type==='attack')actor.swordAction={mode:'swing',age:0,duration:.28};
    else if(['Q','Q3'].includes(e.key)){
     actor.swordAction={mode:'thrust',age:0,duration:.32};
     if(Math.hypot(dx,dz)>.1)actor.mesh.rotation.y=actor.aimAngle;
    }else if(['EQ','EQ3'].includes(e.key))actor.swordAction={mode:'spin',age:0,duration:.5};
    else if(e.key==='E')actor.swordAction={mode:'dash',age:0,duration:.28};
   }
  }
  if(e.type==='attack'){
   if(!liveMissiles)this.bolt(from,to,c,.23,.22);
   else if(source?.attackRange<=8)fx.slash(from.x,from.z,hero==='yasuo'?0xa6fbe9:c,hero==='garen'?3.3:2.7,Math.atan2(to.x-from.x,to.z-from.z),.23);
   else fx.burst(from.x,2.3,from.z,hero==='jinx'?0xffc774:c,5,2,.16);
  }
  if(e.type==='spell'){
   const hasMissile=liveMissiles&&({ahri:['Q','W','E'],ashe:['W','R'],lux:['Q'],ezreal:['Q','W','R'],yasuo:['Q3'],teemo:['Q'],jinx:['W','R']}[hero]||[]).includes(e.key);
   if(e.key==='D'||hero==='ezreal'&&e.key==='E'||hero==='ahri'&&e.key==='R'){
    const color=e.key==='D'?0xffe49d:hero==='ahri'?0xd996ff:0x77e5ff;fx.rune(from.x,from.z,color,2,.55);fx.rune(to.x,to.z,color,3,.75);fx.lineBurst(from,to,color,24,1,.7);fx.burst(to.x,1.4,to.z,color,30,8,.75);
   }else if(e.key==='F'){
    fx.rune(x,z,0xff8646,2,.7);fx.burst(x,.5,z,0xff843b,42,6,.85);fx.burst(x,1.5,z,0xffe28c,18,4,.65);
   }else if(e.key==='ZHONYA'){fx.rune(x,z,0xffd34e,3.1,2.3);fx.burst(x,2,z,0xffe68d,30,3,1.6);
   }else if(hero==='lux'&&e.key==='R'){
    fx.rune(from.x,from.z,0xffdfa0,5,.95);fx.beam(from,to,0xffcd6a,1.3,.85,true);fx.beam(from,to,0xc38aff,2,.7);fx.burst(from.x,2.5,from.z,0xfff1cb,60,12,1);fx.ring(to.x,to.z,0xfff1ca,5,.8);
   }else if(hero==='garen'&&e.key==='R'){
    const top=new THREE.Vector3(x,27,z),ground=new THREE.Vector3(x,.45,z);fx.beam(top,ground,0xffc250,1.1,.8,true);fx.rune(x,z,0xffd67f,6,.95);fx.slash(x,z,0xffda87,6,0,.8);fx.burst(x,.6,z,0xffefb7,90,17,1.1,18);
   }else if(hero==='garen'&&e.key==='SPIN'){
    fx.slash(x,z,0xffcc69,7,this.visualTime*15,.4);
   }else if(hero==='yasuo'&&e.key==='R'){
    fx.rune(x,z,0xcaffef,6,1);fx.beam(new THREE.Vector3(x,12,z),new THREE.Vector3(x,1,z),0xa5fff2,.7,.75,true);for(let i=0;i<3;i++)fx.slash(x,z,0x9ee5ee,5+i,i*2,.7+i*.12);fx.burst(x,2,z,0xdbffff,70,14,.9);
   }else if(hero==='yasuo'&&e.key==='AIRBORNE'){
    fx.rune(x,z,0xbffff3,4,.85);fx.burst(x,.3,z,0xbffcf5,32,9,.8);
   }else if(hero==='yasuo'&&e.key==='FLOW'){
    fx.rune(x,z,0xb9edff,3.3,1.1);fx.burst(x,1.8,z,0xc5ffff,24,5,.8);
   }else if(hero==='yasuo'&&e.key==='Q'){
    fx.thrust(new THREE.Vector3(from.x,2.1,from.z),new THREE.Vector3(to.x,2.1,to.z),0xa2f4e7,.95,.32);
   }else if(hero==='yasuo'&&e.key==='Q3'){
    const direction=to.clone().sub(from),length=direction.length();
    const tip=from.clone().addScaledVector(direction,length>.01?Math.min(8,length)/length:0);from.y=tip.y=2.1;
    fx.thrust(from,tip,0xb6ffff,.75,.3);fx.lineBurst(from,tip,0xbafff5,14,.25,.35);
   }else if(hero==='yasuo'&&['EQ','EQ3'].includes(e.key)){
    fx.swordSpin(x,z,e.key==='EQ3'?0x97f5ff:0xb8ffdf,e.radius||9,e.key==='EQ3');
   }else if(hero==='yasuo'&&e.key==='E'){
    fx.lineBurst(from,to,0x9af4e7,24,.65,.45);
   }else if(hero==='yasuo'&&e.key==='WALL_BLOCK'){
    fx.burst(x,2,z,0xcbfff8,30,9,.55);fx.ring(x,z,0x91eadb,2,.4);
   }else if(hero==='yasuo'&&e.key==='W'){fx.rune(from.x,from.z,0x9feddf,3,.5);
   }else if(e.key==='MUSHROOM'){
    fx.rune(x,z,0xa2e353,e.radius||9,1.1);fx.burst(x,.5,z,0xa0e64f,90,13,1.4);fx.burst(x,1,z,0xe4ab5b,35,6,.9,8);
   }else if(e.key==='TRAP'){
    fx.slash(x,z,0xff80c3,3,0,.4);fx.burst(x,1,z,0xffd866,50,9,.75,12);fx.rune(x,z,0xff7abd,3,.8);
   }else if(['ROCKET_HIT','ROCKET','EXPLOSION'].includes(e.key)){
    fx.ring(x,z,0xffcd70,e.radius||7,.85);fx.burst(x,2,z,0xff964e,90,18,1.1,10);fx.burst(x,2,z,0xffe3af,35,12,.7);
   }else if(hero==='jinx'&&['EXCITED','Q'].includes(e.key)){
    fx.rune(source?.x??x,source?.z??z,0xff74c3,3.3,.75);fx.burst(source?.x??x,2,source?.z??z,0xb794ff,26,7,.8);
   }else if(['ICE','E2','MARK'].includes(e.key)){
    if(e.key==='ICE')fx.crystals(x,z,0x9feaff,Math.min(8,e.radius||5),1);else{fx.rune(x,z,c,Math.min(10,e.radius||3),.8);fx.burst(x,1.5,z,c,65,12,.9);}
   }else if(hero==='lux'&&e.key==='W'){
    fx.beam(from,to,0xffe9b0,.25,.5,true);fx.rune(from.x,from.z,0xffefb5,2.5,.65);
   }else if(hasMissile){fx.rune(from.x,from.z,c,1.8,.35);fx.burst(from.x,2.5,from.z,c,12,3,.35);
   }else if(hero==='lux'&&e.key==='E'||hero==='teemo'&&e.key==='R'||hero==='jinx'&&e.key==='E'){
    fx.burst(x,.4,z,c,14,4,.5);
   }else if(hero==='garen'||hero==='ashe'&&e.key==='Q'||hero==='teemo'&&e.key==='W'){
    fx.rune(from.x,from.z,c,3.2,.85);fx.burst(from.x,1,from.z,c,24,5,.6);
   }else if(hero==='ashe'&&e.key==='E'){
    fx.rune(x,z,0x8befff,Math.min(13,e.radius||12),1.2);fx.burst(x,3,z,0xaeedff,35,10,1.1);
   }else if(from.distanceTo(to)>.2){fx.lineBurst(from,to,c,18,1,.5);fx.ring(to.x,to.z,c,3,.65);
   }else{fx.rune(x,z,c,Math.min(5,e.radius||3),.7);fx.burst(x,1,z,c,24,7,.7);}
  }
  if(['ward','death','level','recall'].includes(e.type)){
   const color=e.type==='death'?0xff6876:e.type==='level'?0xffe49d:0x69eedc,radius=e.type==='death'?3.5:2.5;
   fx.rune(x,z,color,radius,e.type==='recall'?1.4:1);fx.burst(x,.5,z,color,e.type==='death'?40:26,e.type==='death'?9:5,1);
  }
 }
}
