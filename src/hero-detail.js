import * as THREE from 'three';

const faceMaterials=new Map();
function faceMaterial(color){if(!faceMaterials.has(color))faceMaterials.set(color,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:0}));return faceMaterials.get(color);}
function fixedPart(group,geometry,color,x,y,z,scale){const material=faceMaterial(color),mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.skinProtected=true;mesh.userData.originalFaceMaterial=material;group.add(mesh);return mesh;}
const HAIR={ahri:0x172338,ashe:0xdcebf4,garen:0x403628,lux:0xeacf70,ezreal:0xdabc58,yasuo:0x202935,jinx:0x229de0,annie:0xb83a58,morgana:0x23223a,masteryi:0x334f49,darius:0x2c2631,leona:0xbb7650,vayne:0x272035,caitlyn:0x392840,missfortune:0xad393b,sona:0x45b4c7};
const CLOTH={ahri:0xb9234b,ashe:0x235c97,garen:0x244c8b,lux:0xe7d1a0,ezreal:0x916139,yasuo:0x345967,jinx:0x6a325f,annie:0x833450,brand:0x49302a,morgana:0x45234c,veigar:0x473b7b,ziggs:0x896843,fizz:0x319395,masteryi:0x418171,leesin:0xb33535,darius:0x4b4149,malphite:0x6f7461,blitzcrank:0xc19847,leona:0x9f7543,vayne:0x46234f,caitlyn:0x493a72,missfortune:0x4d2635,sona:0x347f91,teemo:0x56724a};
const GOLD=0xcab784,STEEL=0xbecbd0,DARK=0x29343e;

// A beveled solid with a real cutting edge, reused by sword and armor pieces.
export function beveledShape(kit,key,points,depth=.09,bevel=.035){
 return kit.geo(`detail-shape:${key}`,()=>{const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:3});geometry.translate(0,0,-depth*.5);return geometry;});
}

function taperedTube(points,radii,segments=20,sides=8){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=curve.computeFrenetFrames(segments,false),positions=[],normals=[],indices=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments,point=curve.getPoint(t),rIndex=t*(radii.length-1),r=THREE.MathUtils.lerp(radii[Math.floor(rIndex)],radii[Math.min(radii.length-1,Math.ceil(rIndex))],rIndex%1);
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,n=frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a));positions.push(point.x+n.x*r,point.y+n.y*r,point.z+n.z*r);normals.push(n.x,n.y,n.z);if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setIndex(indices);return geometry;
}
export function curvedTail(kit,index){
 const angle=(index-4)*.31,spread=Math.sin(angle),rear=Math.cos(angle),lift=.65+(index%3)*.4;
 const points=[[0,0,0],[spread*1.12,.3,-rear*.8],[spread*2.5,lift,-rear*1.65],[spread*3.15,lift+1,-rear*2.15],[spread*3.15,lift+1.9,-rear*1.72]];
 return kit.geo(`fox-curved-tail:${index}`,()=>taperedTube(points,[.18,.36,.52,.43,.015],24,10));
}
export function addHeroDetail(group,e,kit){
 const {sphere,box,cylinder,ring,rod,part,geo}=kit,body=group.userData.body,id=e.heroId,small=['annie','veigar','ziggs'].includes(id),human=!['malphite','blitzcrank','veigar','teemo','fizz','ziggs','brand'].includes(id),h=['ahri','ashe','garen','lux','ezreal','yasuo','jinx'].includes(id)?3.42:small?2.6:id==='fizz'?3:id==='teemo'?2.4:3.6,cloth=CLOTH[id],hair=HAIR[id]||DARK;
 const eyeGeometry=geo('detail-eye',()=>new THREE.SphereGeometry(1,12,8)),featureGeometry=geo('detail-feature',()=>new THREE.SphereGeometry(1,10,7));
 const fixed=(g,c,x,y,z,s)=>fixedPart(g,featureGeometry,c,x,y,z,s);
 const tube=(key,c,points,r=.04)=>part(body,geo(`detail-tube:${id}:${key}`,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*4),r,6,false)),c);
 const trim=(key,points,r=.028,c=GOLD)=>tube(key,c,points,r);
 const plate=(key,c,points,x,y,z,scale=[1,1,1],rotation=0)=>{const mesh=part(body,beveledShape(kit,`${id}:${key}`,points,.11,.03),c,x,y,z,scale);mesh.rotation.z=rotation;return mesh;};
 if(human){
  // Paired lids, irises, tiny catchlights, angular brows and a sculpted nose.
  for(const side of[-1,1]){
   const ex=side*.225;
   const white=fixedPart(body,eyeGeometry,0xf8f4e8,ex,h+.015,.514,[.151,.078,.067]);white.rotation.z=-side*.08;
   fixedPart(body,eyeGeometry,0x102431,ex+side*.004,h+.015,.574,[.069,.069,.025]);
   const irisColor=['ahri','ashe','lux'].includes(id)?0x38acbc:['jinx','morgana'].includes(id)?0xa757be:0x578287;
   fixedPart(body,eyeGeometry,irisColor,ex,h+.016,.584,[.047,.051,.012]);fixed(body,0xffffff,ex-.018,h+.039,.599,[.017,.019,.008]);
   const brow=fixed(body,0x29202b,ex,h+.162,.489,[.177,.033,.039]);brow.rotation.z=side*(['garen','darius','yasuo'].includes(id)?-.14:.1);
   rod(body,hair,[ex-side*.148,h+.055,.547],[ex+side*.14,h+.068,.526],.016);
   sphere(body,0xf4c9af,side*.525,h-.04,0,[.11,.18,.12]);
  }
  sphere(body,0xf4c9af,0,h-.095,.566,[.074,.137,.094]);fixed(body,0x452b31,0,h-.315,.494,[.116,.018,.015]);fixed(body,0xae665f,0,h-.285,.51,[.13,.029,.025]);
  sphere(body,0xf4c9af,0,h-.47,.32,[.28,.15,.2]);
  if(!['leesin','caitlyn','missfortune'].includes(id))for(let i=-3;i<=3;i++){
   const lock=part(body,geo('detail-hair-lock',()=>new THREE.ConeGeometry(.12,.63,6)),hair,i*.13,h+.23-Math.abs(i)*.025,.31,[1,1,.56]);lock.rotation.z=i*.13;lock.rotation.x=.25;
  }
 }
 // Hand silhouettes carry four separated fingers, knuckles, a thumb, and cuff seams.
 if(!['malphite','blitzcrank','veigar','fizz'].includes(id)){
  for(const side of[-1,1]){
   const arm=group.userData.arms?.find(a=>a.userData.side===side),target=arm||body,x=arm?arm.userData.hand?.[0]??side*.22:side*(small?.87:id==='teemo'?1.01:1.15),y=arm?arm.userData.hand?.[1]??-.66:small?1.35:id==='teemo'?1.24:id==='ahri'||id==='ashe'||id==='yasuo'?1.9:1.97,z=arm?arm.userData.hand?.[2]??.4:.4;
   const fingerColor=['garen','darius','leona','masteryi'].includes(id)?STEEL:id==='brand'?0x664034:0xf4c9af;
   for(let i=0;i<4;i++){const offset=(i-1.5)*.078;rod(target,fingerColor,[x+offset,y-.09,z+.06],[x+offset,y-.24+(i%3)*.025,z+.19],.036);sphere(target,fingerColor,x+offset,y-.05,z+.13,[.041,.05,.042]);}
   rod(target,fingerColor,[x-side*.13,y-.02,z+.08],[x-side*.17,y-.13,z+.21],.05);
   const cuff=cylinder(target,cloth,x,y+.18,z,.248,.12,.245);ring(target,GOLD,.243,y+.18,.025).position.set(x,y+.18,z);
  }
 }
 // Neck/collar, belt stitchwork, overlapping lower garment panels and boot soles.
 if(!['malphite','blitzcrank','veigar','fizz','brand','teemo'].includes(id)){
  const sy=small?.73:1;
  const collarColor=['garen','darius','leona'].includes(id)?GOLD:id==='ahri'?0xf0ddd2:id==='ashe'?0xb5cfda:cloth;
  for(const side of[-1,1]){
   if(!['yasuo','leesin','jinx','sona'].includes(id))plate(`collar${side}`,collarColor,[[side*.12,0],[side*.3,.18],[side*.43,.015],[side*.2,-.06]],0,2.81*sy,.57,[1,1,1]);
   plate(`hem${side}`,cloth,[[-.3,0],[.3,0],[.48,-.74],[-.36,-.65]],side*.41,1.48*sy,.56,[sy,sy,1],side*.08);
   trim(`hemTrim${side}`,[[side*.64,.89*sy,.63],[side*.55,1.43*sy,.67]],.025);
  }
  box(body,DARK,0,1.64*sy,.82,[.37,.3,.09]);box(body,GOLD,0,1.64*sy,.88,[.26,.21,.045]);box(body,DARK,0,1.64*sy,.91,[.12,.11,.018]);
  for(let i=-3;i<=3;i++)sphere(body,GOLD,i*.18,1.51*sy,.76,[.022,.022,.025]);
  for(const [index,leg]of(group.userData.legs||[]).entries()){
   box(leg,DARK,0,small?-.79:-1.33,.22,[.47,.07,.8]);box(leg,STEEL,0,small?-.57:-1.01,.5,[.28,.13,.08]);
   for(let i=0;i<3;i++)rod(leg,0xcab784,[-.14,small?-.53+i*.08:-1.08+i*.1,.59],[.14,small?-.53+i*.08:-1.08+i*.1,.59],.018);
  }
 }
 if(id==='ahri'){
  for(const side of[-1,1]){const inner=part(body,geo('detail-fox-ear',()=>new THREE.ConeGeometry(.13,.57,4)),0xc48196,side*.42,4.25,.07,[1,1,.4]);inner.rotation.z=-side*.22;for(let i=0;i<3;i++)trim(`whisker${side}:${i}`,[[side*.32,h-.14+i*.068,.548],[side*.45,h-.18+i*.076,.415]],.012,0x29202b);}
  plate('corset',0x9d173d,[[-.48,.45],[.48,.45],[.36,-.45],[-.36,-.45]],0,2.28,.73);
  for(let i=0;i<4;i++){rod(body,GOLD,[-.16,2.05+i*.17,.88],[.16,2.22+i*.17,.88],.018);rod(body,GOLD,[.16,2.05+i*.17,.88],[-.16,2.22+i*.17,.88],.018);}
  const jewel=part(body,geo('detail-jewel',()=>new THREE.OctahedronGeometry(1)),0x7cf0e9,0,2.77,.76,[.14,.18,.065],true);
  for(const side of[-1,1])tube(`hairFlow${side}`,hair,[[side*.46,3.84,-.14],[side*.58,3.4,-.37],[side*.55,2.65,-.73],[side*.67,2.25,-.88]],.16);
 }else if(id==='ashe'){
  const hoodGeometry=geo('detail-ashe-open-hood',()=>new THREE.SphereGeometry(1,20,14,Math.PI,Math.PI,0,Math.PI*.81)),hood=part(body,hoodGeometry,0x17375d,0,3.67,-.17,[.79,.89,.72]);
  trim('hoodEdge',[[-.6,3.24,.2],[-.66,3.72,.39],[-.48,4.22,.33],[0,4.42,.15],[.48,4.22,.33],[.66,3.72,.39],[.6,3.24,.2]],.035,0xb5cfda);
  trim('capeLeft',[[-.62,2.99,-.32],[-1.1,2.06,-.67],[-.82,.68,-.87]],.034,0x91a4c0);trim('capeRight',[[.62,2.99,-.32],[1.1,2.06,-.67],[.82,.68,-.87]],.034,0x91a4c0);
  for(const side of[-1,1]){plate(`bowBlade${side}`,0xc6f6fd,[[-.1,0],[.17,.48],[.04,.81],[-.15,.18]],-1.3,2.4+side*.68,.64,[1,side,1]);}
  rod(body,0xefffff,[-1.3,1.19,.62],[-1.3,3.6,.62],.015);rod(body,0xb9ddcc,[-1.3,2.35,.66],[-1.3,2.35,2.06],.036);
  box(body,0x394965,.75,2.1,-.77,[.43,1.5,.4]);for(let i=0;i<3;i++)rod(body,GOLD,[.63+i*.13,2.2,-.88],[.63+i*.13,3.27,-.88],.023);
 }else if(id==='garen'||id==='darius'||id==='leona'){
  for(const side of[-1,1]){
   for(let i=0;i<3;i++)plate(`pauldron${side}:${i}`,i===0?GOLD:STEEL,[[-.36,.17],[0,.48],[.38,.2],[.3,-.27],[-.28,-.22]],side*(1.0+i*.035),2.89-i*.19,.24,[1.2,1,1],-side*.08);
   for(const yy of[2.88,2.59,2.29])sphere(body,GOLD,side*.46,yy,.845,[.047,.047,.03]);
   plate(`knee${side}`,STEEL,[[-.2,.2],[.2,.2],[.27,-.11],[0,-.36],[-.24,-.1]],side*.48,.83,.4);
  }
  plate('breastplate',id==='leona'?0xc3a364:0x839ca8,[[-.52,.51],[.52,.51],[.6,-.37],[0,-.63],[-.6,-.37]],0,2.3,.8);
  trim('breastline',[[-.5,2.83,.86],[0,2.47,.99],[.5,2.83,.86]],.033,GOLD);trim('waistplate',[[-.54,1.93,.91],[0,1.82,1.0],[.54,1.93,.91]],.035,GOLD);
  const sword=group.userData.sword;if(sword){
   if(id==='darius'){const edge=part(sword,beveledShape(kit,'darius-axe-blade',[[-.13,0],[-1.25,.22],[-1.34,1.64],[-.22,1.48]],.12,.05),0xe9eeec,-.18,1.94,.18);rod(sword,GOLD,[0,1.74,.25],[0,3.57,.25],.04);}
   else{const length=id==='garen'?2.58:3.18,blade=part(sword,beveledShape(kit,`${id}-fine-blade`,[[-.16,0],[.16,0],[.15,length-.28],[0,length],[-.15,length-.28]],.08,.027),0xf1f5ec,0,.09,.17);rod(sword,0x7e8f9a,[0,.25,.25],[0,length-.2,.25],.017);for(let i=0;i<6;i++)ring(sword,GOLD,.13,-.24-i*.063,.019).position.z=.07;}
  }
 }else if(id==='yasuo'){
  for(let i=0;i<4;i++){plate(`shoulderPlate${i}`,i%2?0x778b91:0xa7b3ac,[[-.42,.15],[.15,.42],[.5,.12],[.33,-.18],[-.32,-.15]],-1.02,3.08-i*.18,.14,[1,1,1],-.06);for(const x of[-1.28,-.85])sphere(body,GOLD,x,3.0-i*.18,.31,[.039,.038,.038]);}
  const sword=group.userData.sword;if(sword){
   const blade=part(sword,beveledShape(kit,'yasuo-katana',[[0,0],[.16,.03],[.28,3.42],[.13,3.76],[.1,3.41]],.055,.017),0xecf9f3,0,.09,.09);trim('katanaSheath',[[-.95,1.63,-.32],[-1.03,.5,-.58],[-1.1,-.1,-.9]],.055,0x907f56);
   for(let i=0;i<8;i++){const wrap=box(sword,0xb99f72,0,-.58+i*.075,0,[.23,.037,.19]);wrap.rotation.z=i%2?.38:-.38;}
   const guard=ring(sword,0x9d8d61,.33,.035,.06);guard.scale.set(1,.77,1);const pommel=sphere(sword,0xd0c288,0,-.66,0,[.16,.075,.14]);
  }
  for(let i=-2;i<=2;i++)trim(`scalp${i}`,[[i*.12,3.98,-.18],[i*.11,4.25,-.29],[i*.08,4.46,-.35]],.026,0x36404b);
  fixed(body,0x29202b,0,h-.33,.475,[.1,.046,.04]);
 }else if(id==='lux'){
  for(const side of[-1,1])plate(`robePanel${side}`,0xf6eac8,[[-.26,.62],[.26,.62],[.36,-.63],[-.34,-.63]],side*.48,1.12,.74,[1,1,1]);
  trim('robeEmbroidery',[[-.53,1.88,.88],[-.63,1.25,.87],[-.51,.62,.89]],.028,GOLD);trim('robeEmbroidery2',[[.53,1.88,.88],[.63,1.25,.87],[.51,.62,.89]],.028,GOLD);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(body,GOLD,[1.18,4.2,.4],[1.18+Math.cos(a)*.4,4.2+Math.sin(a)*.4,.4],.024);}sphere(body,0xf5ffff,1.18,4.2,.4,[.13,.19,.14],true);
 }else if(id==='ezreal'){
  for(const side of[-1,1])trim(`coatLapel${side}`,[[side*.52,2.9,.49],[side*.35,2.55,.82],[side*.61,1.89,.66]],.046,0xc6ae7c);
  for(let i=0;i<3;i++)box(body,0x987d4e,-1.13,1.85+i*.17,.5,[.76,.085,.73]);part(body,geo('detail-jewel',()=>new THREE.OctahedronGeometry(1)),0x77eaff,-1.12,2.03,.94,[.27,.29,.15],true);
  trim('backStrap',[[.58,2.8,.71],[.15,2.31,.88],[-.47,1.82,.74]],.067,0x4e4539);box(body,0x6f5035,.66,1.83,-.07,[.35,.55,.38]);
 }else if(id==='jinx'){
  for(const side of[-1,1]){for(let i=0;i<5;i++)sphere(body,0xc9b192,side*.55,1.58+i*.13,.73,[.06,.056,.047]);trim(`strap${side}`,[[side*.32,2.86,.46],[side*.58,2.12,.75]],.04,0x343348);}
  const rocket=group.userData.rocket;if(rocket){for(let i=0;i<4;i++){const rim=ring(rocket,0x597d89,.48,0,.035);rim.rotation.x=0;rim.position.z=-.85+i*.54;}box(rocket,0x162e38,0,.4,.75,[.31,.15,1.15]);for(let i=0;i<4;i++)box(rocket,0xa85b76,(i-1.5)*.11,.01,1.79,[.064,.17,.06]);}
  for(const side of[-1,1])trim(`tattoo${side}`,[[side*.85,2.59,.28],[side*1.0,2.42,.42],[side*.98,2.21,.55]],.025,0x427dac);
 }else if(id==='teemo'||id==='ziggs'){
  const ty=id==='teemo'?3.2:2.72,gx=id==='teemo'?.44:.29,gz=id==='teemo'?1.01:.72;
  for(const side of[-1,1]){const rim=ring(body,0xb7a064,id==='teemo'?.275:.235,ty,.035);rim.rotation.x=0;rim.position.set(side*gx,ty,gz);sphere(body,0xd5faff,side*gx-.07,ty+.055,gz+.025,[.046,.026,.014]);}
  for(const side of[-1,1])trim(`packStrap${side}`,[[side*.62,id==='teemo'?2.27:2.17,-.37],[side*.7,id==='teemo'?1.52:1.43,.31],[side*.57,1.14,.65]],.065,0x98845b);
  for(const side of[-1,1])box(body,GOLD,side*.51,id==='teemo'?1.68:1.56,.6,[.17,.22,.045]);
  if(id==='teemo'){for(let i=-2;i<=2;i++)trim(`fur${i}`,[[i*.13,2.22,1.023],[i*.13+.025,2.07,1.02]],.014,0x795c40);rod(body,0xc3a467,[1.05,1.66,1.8],[1.05,1.66,2.08],.145);const mouth=ring(body,DARK,.11,1.66,.032);mouth.rotation.x=0;mouth.position.set(1.05,1.66,2.1);}
  else{for(const side of[-1,1])ring(body,GOLD,.38,1.72,.032).position.set(side*.9,1.46,.72);fixed(body,0x452b31,0,2.34,.6,[.25,.022,.016]);}
 }else if(id==='annie'){
  for(let i=0;i<5;i++)trim(`dressPleat${i}`,[[Math.sin(i*1.256)*.52,1.4,Math.cos(i*1.256)*.52],[Math.sin(i*1.256)*.96,.59,Math.cos(i*1.256)*.96]],.024,0xe8b68c);
  plate('collarBow',0xf1dbb8,[[-.36,.1],[-.05,0],[-.32,-.18]],0,2.22,.55);plate('collarBow2',0xf1dbb8,[[.36,.1],[.05,0],[.32,-.18]],0,2.22,.55);sphere(body,GOLD,0,2.21,.6,[.073,.066,.037]);
 }else if(id==='brand'){
  for(const side of[-1,1]){fixed(body,0x102431,side*.22,3.65,.54,[.17,.09,.04]);sphere(body,0xffdd8d,side*.22,3.65,.59,[.093,.046,.024],true);trim(`burnCrack${side}`,[[side*.36,3.85,.41],[side*.28,3.45,.54],[side*.4,3.25,.37]],.031,0xffb254);}
  for(let i=0;i<4;i++)trim(`torsoCrack${i}`,[[Math.sin(i*1.7)*.48,1.5,.64],[Math.sin(i*1.7+.4)*.59,2.08,.72],[Math.sin(i*1.7)*.46,2.8,.55]],.027,0xff934a);
 }else if(id==='morgana'){
  for(const side of[-1,1]){const wing=group.userData.wings?.[side<0?0:1];if(wing)for(let i=0;i<8;i++){const feather=part(wing,beveledShape(kit,`morgana-feather-${side}:${i}`,[[0,0],[side*.15,.28],[side*.34,-1.53],[0,-1.83],[-side*.11,-.22]],.035,.009),i%2?0x573468:0x1e1c2d,side*(.8+i*.31),-.2-i*.16,.1);feather.rotation.z=-side*(.69+i*.085);}}
  plate('darkCrown',0x9973b0,[[-.48,0],[-.3,.38],[-.12,.13],[0,.51],[.12,.13],[.3,.38],[.48,0]],0,4.12,.09);
  trim('robeFront',[[-.48,2.67,.65],[-.25,2.1,.77],[0,1.65,.92],[.25,2.1,.77],[.48,2.67,.65]],.032,0xa47cba);
 }else if(id==='veigar'){
  for(let i=0;i<5;i++){const angle=(i-2)*.23;plate(`hatRune${i}`,GOLD,[[-.048,0],[0,.19],[.048,0],[0,-.08]],Math.sin(angle)*.96,2.63,Math.cos(angle)*.95,[1,1,1]);}
  for(const side of[-1,1]){const ringMesh=ring(body,GOLD,.11,2.27,.017);ringMesh.rotation.x=0;ringMesh.scale.y=1.5;ringMesh.position.set(side*.27,2.27,.575);}
  trim('capeSeam',[[-.66,1.81,.39],[-.81,1.1,.61],[-.91,.52,.68]],.024,0xa999ca);trim('capeSeam2',[[.66,1.81,.39],[.81,1.1,.61],[.91,.52,.68]],.024,0xa999ca);
  for(let i=0;i<3;i++)ring(body,GOLD,.17,.74+i*.28,.025).position.set(1.1,.74+i*.28,.45);
 }else if(id==='fizz'){
  trim('smile',[[-.27,2.8,.54],[0,2.74,.62],[.27,2.8,.54]],.024,0x163a43);for(const side of[-1,1]){sphere(body,0xccebd9,side*.29,3.11,.61,[.045,.045,.013]);for(let i=0;i<3;i++)trim(`gill${side}:${i}`,[[side*.55,3.1-i*.13,.1],[side*.61,3.03-i*.13,-.06]],.02,0x1a626e);}
  for(const y of[1.1,2.2,3.5])ring(body,GOLD,.12,y,.021).position.set(1.1,y,.42);
 }else if(id==='masteryi'){
  for(const x of[-.42,0,.42])for(const y of[3.56,3.78]){const rim=ring(body,0x8ca895,.102,y,.022);rim.rotation.x=0;rim.position.set(x,y,.785);sphere(body,0xffffff,x-.02,y+.018,.804,[.024,.023,.013]);}
  if(group.userData.sword){part(group.userData.sword,beveledShape(kit,'yi-blade',[[-.16,0],[.16,0],[.18,3.45],[0,3.85],[-.18,3.45]],.07,.023),0xc7f5de,0,.17,.12);for(let i=0;i<5;i++)ring(group.userData.sword,GOLD,.14,-.12-i*.095,.018);}
 }else if(id==='leesin'){
  for(const side of[-1,1]){for(let i=0;i<5;i++)ring(body,0xe9dbc0,.32,1.9+i*.056,.018).position.set(side*1.2,1.9+i*.056,.43);trim(`muscle${side}`,[[side*.22,2.84,.57],[side*.44,2.57,.76],[side*.26,2.37,.76]],.035,0xd49d83);}
  trim('blindfoldTails',[[0,3.74,-.56],[.2,3.53,-1.08],[.4,3.29,-1.51]],.08,0xb83f3b);trim('beltFold',[[-.45,1.64,.73],[0,1.52,.9],[.45,1.64,.73]],.045,0xd4ab84);
 }else if(id==='malphite'){
  for(let i=0;i<10;i++){const x=Math.sin(i*2.4)*1.6,y=1.2+(i%4)*.75;trim(`rockFault${i}`,[[x,y,1.16],[x+.13,y+.32,1.22],[x-.09,y+.61,1.1]],.039,0x3d554b);}
  plate('rockBrow',0x8b9880,[[-.85,0],[-.5,.25],[0,.07],[.5,.25],[.85,0],[.5,-.13],[-.5,-.13]],0,4.76,1.04);
  for(const side of[-1,1])for(let i=0;i<3;i++)sphere(body,0x414f43,side*(2.0+i*.24),1.5,.98,[.055,.2,.09]);
 }else if(id==='blitzcrank'){
  for(const side of[-1,1]){for(let i=0;i<4;i++)rod(body,0x596c71,[side*(1.65+i*.17),2.44,1.3],[side*(1.65+i*.17),1.95,1.46],.065);for(let i=0;i<4;i++)sphere(body,0x68736c,side*1.48,2.5+i*.28,.61,[.056,.056,.045]);const lens=ring(body,0xb9bfa5,.22,4.3,.034);lens.rotation.x=0;lens.position.set(side*.33,4.3,.986);}
  for(let i=-3;i<=3;i++)box(body,0xa99762,i*.16,3.93,.989,[.085,.075,.045]);for(const x of[-.5,.5])for(const y of[1.8,3.35])sphere(body,0x626d68,x,y,1.23,[.09,.09,.061]);
  const face=ring(body,STEEL,.5,2.72,.035);face.rotation.x=0;face.position.z=1.6;
 }else if(id==='vayne'){
  for(const side of[-1,1]){const rim=ring(body,0x896577,.15,3.63,.023);rim.rotation.x=0;rim.scale.y=.57;rim.position.set(side*.24,3.63,.59);rod(body,0xbdc8d0,[side*.73,1.94,.9],[side*1.44,1.94,.9],.015);}
  trim('capeBorder',[[-.88,2.65,-.53],[-1.09,1.4,-.88],[-.72,.65,-.97]],.028,0xb75874);trim('capeBorder2',[[.88,2.65,-.53],[1.09,1.4,-.88],[.72,.65,-.97]],.028,0xb75874);
 }else if(id==='caitlyn'){
  for(const y of[3.96,4.08])ring(body,GOLD,.618,y,.024);plate('hatFeather',0xaabbc4,[[-.06,0],[.03,.61],[.21,.9],[.16,.39],[.04,.06]],.54,4.34,-.04);
  for(const side of[-1,1])trim(`coatSeam${side}`,[[side*.61,2.87,.48],[side*.57,2.26,.75],[side*.43,1.71,.82]],.027,GOLD);
  for(const z of[1.26,1.47,2.35,3.24]){const rim=ring(body,STEEL,.153,2.05,.018);rim.rotation.x=0;rim.position.set(1.0,2.05,.75+z);}
 }else if(id==='missfortune'){
  trim('hatGold',[[-.93,3.95,.21],[-.55,4.07,.51],[0,4.16,.63],[.55,4.07,.51],[.93,3.95,.21]],.036,GOLD);
  for(const side of[-1,1]){const end=ring(body,DARK,.14,1.92,.029);end.rotation.x=0;end.position.set(side*1.2,1.92,1.81);for(let i=0;i<3;i++)sphere(body,GOLD,side*.25,2.59-i*.24,.75,[.044,.041,.03]);}
 }else if(id==='sona'){
  for(const side of[-1,1]){trim(`hairRibbon${side}`,[[side*.52,3.79,-.29],[side*.68,2.73,-.39],[side*.58,1.72,-.42]],.035,GOLD);trim(`robeSeam${side}`,[[side*.46,2.24,.72],[side*.79,1.13,.85],[side*1.09,.45,.76]],.023,0x91ded4);}
  const instrument=group.userData.instrument;if(instrument){for(let i=0;i<8;i++)box(instrument,GOLD,(i-3.5)*.33,.19,-.45,[.065,.075,.085]);for(const side of[-1,1]){const edge=part(instrument,beveledShape(kit,`sona-lyre${side}`,[[0,0],[side*.35,.45],[side*.49,.17],[side*.28,-.13]],.055,.021),0xf2d59b,side*1.74,.1,0);}}
 }
 group.userData.detailVersion=2;group.userData.detailFeatures={face:human,hands:!['malphite','blitzcrank','veigar','fizz'].includes(id),hero:id};
 return group;
}

// Apply after skin remapping so facial whites, pupils and lips keep readable colors.
export function restoreFaceMaterials(group){group.traverse(object=>{if(object.isMesh&&object.userData.originalFaceMaterial)object.material=object.userData.originalFaceMaterial;});}
