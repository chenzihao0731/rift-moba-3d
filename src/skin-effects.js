import * as THREE from 'three';
import { getSkin } from './cosmetics-data.js';

const materials=new Map(),geometries=new Map(),protectedColors=new Set([0xf4c9af,0xddc5a0,0xf1debc,0xdbbb8a,0xd6b494,0x795c40,0x302c28,0x172338,0x202935,0x1a2432]);
function geometry(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
function glow(color){const key=`glow:${color}`;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.75,roughness:.35,metalness:.35}));return materials.get(key);}
function recolor(material,skin){const key=`${material.uuid}:${skin.id}`;if(!materials.has(key)){
 const next=material.clone(),original=material.color?.getHex();
 if(material.isMeshStandardMaterial&&!protectedColors.has(original)){
  const tint=new THREE.Color(material.emissiveIntensity>.4?skin.accent:skin.color);next.color.copy(tint).lerp(material.color,.18);
  if(material.emissiveIntensity>.4){next.emissive.set(skin.accent);next.emissiveIntensity=.75;}next.metalness=skin.theme==='space'?.58:skin.theme==='frost'?.36:skin.theme==='arcade'?.38:.22;
 }
 materials.set(key,next);
}return materials.get(key);}
function accessory(group,shape,color,x,y,z,scale,rotation){const mesh=new THREE.Mesh(shape,glow(color));mesh.position.set(x,y,z);mesh.scale.set(...scale);if(rotation)mesh.rotation.set(...rotation);group.add(mesh);return mesh;}
export function applySkin(group,entity){
 const skin=getSkin(entity.skinId);group.userData.skinId=skin&&skin.championId===entity.heroId?skin.id:'default';if(!skin||skin.championId!==entity.heroId)return group;
 group.traverse(object=>{if(object.isMesh&&object!==group.userData.shield&&object.material?.isMeshStandardMaterial)object.material=recolor(object.material,skin);});
 const body=group.userData.body||group,s=entity.heroId==='teemo'||entity.heroId==='veigar'||entity.heroId==='annie'||entity.heroId==='ziggs'?.8:1;
 const box=geometry('box',()=>new THREE.BoxGeometry(1,1,1)),crystal=geometry('crystal',()=>new THREE.OctahedronGeometry(1)),torus=geometry('torus',()=>new THREE.TorusGeometry(1,.075,5,32));
 if(skin.theme==='arcade'){
  for(const side of[-1,1])for(let i=0;i<3;i++)accessory(body,box,i%2?skin.accent:skin.color,side*(1.1+i*.22)*s,(2.6+i*.38)*s,-.6,[.3*s,.3*s,.16]);
  accessory(body,box,skin.accent,0,2.4*s,.95,[.15,1.1*s,.12]);
 }else if(skin.theme==='frost'){
  for(const side of[-1,1])for(let i=0;i<2;i++)accessory(body,crystal,skin.accent,side*(.95+i*.27)*s,(2.7+i*.4)*s,-.15,[.18,.55,.19],[0,0,-side*.3]);
 }else if(skin.theme==='inferno'){
  for(const side of[-1,1])accessory(body,crystal,skin.accent,side*1.05*s,3*s,0,[.2,.65,.2],[0,0,-side*.2]);
  accessory(body,torus,skin.accent,0,2.4*s,-.95,[1.15*s,1.15*s,.8],[0,0,0]);
 }else if(skin.theme==='candy'){
  for(const side of[-1,1])accessory(body,crystal,side>0?skin.accent:0xffedf4,side*1.15*s,2.9*s,-.25,[.31,.31,.31],[0,0,Math.PI/4]);
  accessory(body,torus,skin.accent,0,1.65*s,.02,[1.08*s,1.08*s,.7],[Math.PI/2,0,0]);
 }else{
  const orbit=accessory(group,torus,skin.accent,0,3.2*s,0,[1.6*s,1.6*s,1.6*s],[.9,0,.2]);group.userData.skinOrbit=orbit;
  for(const side of[-1,1])accessory(body,crystal,skin.accent,side*.9*s,3.15*s,-.3,[.16,.4,.16]);
 }
 const halo=new THREE.Mesh(geometry('halo',()=>new THREE.RingGeometry(.95,1,48)),glow(skin.accent));halo.position.y=.16;halo.rotation.x=-Math.PI/2;halo.scale.setScalar(entity.heroId==='malphite'||entity.heroId==='blitzcrank'?2.3:1.9);group.add(halo);group.userData.skin=skin;return group;
}
export function updateSkin(group,dt,time,effects,entity){
 if(!group.userData.skin||dt<=0)return;const skin=group.userData.skin;if(group.userData.skinOrbit)group.userData.skinOrbit.rotation.y+=dt*.55;
 group.userData.skinTrailAge=(group.userData.skinTrailAge||0)+dt;if(effects&&group.userData.skinTrailAge>.23){group.userData.skinTrailAge=0;const angle=time*1.5;effects.trail(entity.x+Math.cos(angle)*1.6,.3,entity.z+Math.sin(angle)*1.6,skin.accent,.32,1,.55);}
}
