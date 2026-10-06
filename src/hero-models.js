import * as THREE from 'three';

export const EXTENDED_HERO_IDS=['annie','brand','morgana','veigar','ziggs','fizz','masteryi','leesin','darius','malphite','blitzcrank','leona','vayne','caitlyn','missfortune','sona'];

// Parts use the existing material/geometry cache and are merged by Actors.
export function createExtendedHero(e,kit){
 const {sphere,box,cylinder,ring,rod,part,geo}=kit,id=e.heroId,g=new THREE.Group(),body=new THREE.Group(),team=e.team==='blue'?0x45deee:0xee5062,skin=0xf4c9af;
 g.add(body);g.userData.body=body;ring(g,team,['malphite','blitzcrank'].includes(id)?2.2:1.6,.12,.07);
 const small=['annie','veigar','ziggs'].includes(id),height=small?2.6:3.6,legs=[];
 const colors={annie:0x833450,brand:0x49302a,morgana:0x45234c,veigar:0x473b7b,ziggs:0x896843,fizz:0x319395,masteryi:0x418171,leesin:0xb33535,darius:0x4b4149,malphite:0x6f7461,blitzcrank:0xc19847,leona:0x9f7543,vayne:0x46234f,caitlyn:0x493a72,missfortune:0x4d2635,sona:0x347f91},cloth=colors[id];
 const head=(color=skin,y=height)=>{sphere(body,color,0,y,0,[small?.59:.57,small?.62:.67,.56]);return y;};
 const humanoid=({armColor=cloth,armor=false,headColor=skin,hair=0x342c37}={})=>{
  for(const side of[-1,1]){const leg=new THREE.Group();leg.position.set(side*.46,small?.87:1.4,0);body.add(leg);rod(leg,armor?0x858c8f:0x273747,[0,0,0],[0,small?-.64:-1.12,.1],small?.18:.23);box(leg,0x24333e,0,small?-.61:-1.07,.23,[.43,.32,.7]);legs.push(leg);}
  cylinder(body,cloth,0,small?1.52:2.05,0,small?.65:.78,small?1.15:1.65,small?.45:.59);head(headColor);sphere(body,hair,0,height+.3,-.15,[small?.63:.61,.37,.53]);
  const arms=[];for(const side of[-1,1]){sphere(body,armColor,side*(small?.7:.91),small?1.93:2.69,0,[armor?.52:.3,.36,.35]);const arm=new THREE.Group();arm.position.set(side*(small?.7:.92),small?1.9:2.57,0);arm.userData.side=side;arm.userData.hand=[side*(small?.17:.21),small?-.55:-.6,.4];body.add(arm);rod(arm,armColor,[0,0,0],arm.userData.hand,small?.17:.21);sphere(arm,headColor,...arm.userData.hand,[.2,.23,.21]);arms.push(arm);}g.userData.arms=arms;
 };
 const cone=(color,x,y,z,r,h,sides=8)=>part(body,geo(`heroCone:${r}:${h}:${sides}`,()=>new THREE.ConeGeometry(r,h,sides)),color,x,y,z);
 const cape=(color,r=1.2,h=2.3)=>{const mesh=part(body,geo(`heroCape:${r}:${h}`,()=>new THREE.ConeGeometry(r,h,10,1,true)),color,0,1.7,-.5,[1,1,.52]);mesh.rotation.x=.15;return mesh;};
 const blade=(x=1.25,y=2,z=.4,color=0xd7e3e1,length=3.3)=>{const sword=new THREE.Group();sword.position.set(x,y,z);body.add(sword);box(sword,color,0,length*.45,0,[.25,length,.14]);box(sword,0xbe995c,0,-.03,0,[.9,.18,.24]);rod(sword,0x3a3b3f,[0,-.65,0],[0,0,0],.12);sword.rotation.z=-.3;g.userData.sword=sword;return sword;};
 if(id==='malphite'){
  const rocks=[];for(let i=0;i<18;i++){const angle=i*2.39996,r=i<5?1.4:2.1;const rock=part(body,geo('rockHero',()=>new THREE.DodecahedronGeometry(1,0)),i%3?0x656e5c:0x89937b,Math.cos(angle)*r,(i%5)*.85+.65,Math.sin(angle)*r*.5,[.6+(i%3)*.18,.6+(i%4)*.18,.8]);rock.rotation.set(i*.37,i*.7,i*.3);rocks.push(rock);}sphere(body,0x737d66,0,2.4,0,[1.7,2.1,1.1]);sphere(body,0x73775b,0,4.4,.48,[.83,.71,.64]);for(const side of[-1,1]){sphere(body,0x606c58,side*2.2,2.7,.12,[1.05,1.5,1]);sphere(body,0x889170,side*2.5,1.24,.56,[1.03,.88,1.11]);sphere(body,0x72dbe0,side*.33,4.55,1.03,[.17,.1,.12],true);cone(0xa5a580,side*1.5,4.4,-.35,.35,1.5,5);}g.userData.rockParts=rocks;
 }else if(id==='blitzcrank'){
  cylinder(body,cloth,0,2.55,0,1.58,2.7,1.15);sphere(body,0xdcb45b,0,4.3,.13,[1.0,.75,.87]);box(body,0x4a4b42,0,4.15,.86,[1.45,.44,.2]);for(const side of[-1,1]){sphere(body,0x91eaf4,side*.33,4.3,.95,[.15,.18,.11],true);cylinder(body,0x666e65,side*1.6,2.92,0,.46,1.7);sphere(body,0xb98937,side*2.15,2.1,.6,[1,.8,.95]);sphere(body,0xc99b42,side*1.76,3.8,0,[.87,.6,.7]);box(body,0x716648,side*.72,.65,.28,[.94,1.1,1.44]);rod(body,0x5c645b,[side*.72,1.65,0],[side*.72,.67,.2],.3);cylinder(body,0x544a38,side*.57,4.3,-.78,.25,2,.21);}ring(body,0x58dced,.6,2.72,.11).rotation.x=0;sphere(body,0x61e8ec,0,2.72,1.44,[.42,.5,.14],true);
 }else if(id==='veigar'){
  cylinder(body,cloth,0,1.1,0,1.06,1.6,.62);head(0x182238,2.28);cone(0x4b377e,0,3.2,-.08,1.06,2.75);cylinder(body,0xa77d4d,0,2.58,0,1.19,.16);for(const side of[-1,1]){sphere(body,0xffd564,side*.27,2.27,.55,[.11,.21,.12],true);box(body,0x323342,side*.4,.35,.33,[.45,.41,.63]);sphere(body,0x513879,side*1.0,1.35,.18,[.35,.4,.35]);}rod(body,0x8b6041,[1.1,.25,.45],[1.1,3.15,.45],.15);part(body,geo('mageStaff',()=>new THREE.OctahedronGeometry(1)),0xac7cec,1.1,3.3,.45,[.43,.7,.42],true);ring(body,0xcaa470,.54,3.36,.09).position.x=1.1;
 }else if(id==='fizz'){
  cylinder(body,cloth,0,1.7,0,.67,1.9,.49);head(0x47a8a9,3.0);sphere(body,0x328583,0,3.45,-.05,[.77,.31,.68]);for(const side of[-1,1]){sphere(body,0x51c4bf,side*.53,3.34,.13,[.26,.47,.29]);sphere(body,0x163a43,side*.29,3.07,.54,[.15,.17,.11]);rod(body,0x319695,[side*.45,.85,0],[side*.74,.17,.44],.23);sphere(body,0x3bafa3,side*.83,.2,.65,[.49,.18,.57]);rod(body,0x37a5a3,[side*.65,2.2,0],[side*1.08,1.72,.33],.16);}rod(body,0xcda862,[1.1,.52,.42],[1.1,4.45,.42],.1);for(const x of[.72,1.1,1.48]){rod(body,0x86ebed,[x,3.64,.42],[x,4.85,.42],.075);cone(0xd6f5d7,x,4.94,.42,.14,.52,5);}rod(body,0x6ebbd0,[.7,3.64,.42],[1.5,3.64,.42],.075);
 }else if(id==='ziggs'){
  humanoid({headColor:0xd2b98e,hair:0x816449});sphere(body,0xb09860,0,2.89,0,[.72,.4,.67]);for(const side of[-1,1]){sphere(body,0x3c5159,side*.29,2.72,.53,[.28,.22,.2]);sphere(body,0xd6bb60,side*.29,2.72,.7,[.18,.15,.055],true);}box(body,0x5f583e,0,1.67,-.73,[1.16,1.25,.58]);for(const side of[-1,1]){cylinder(body,0xc28b43,side*.75,1.77,-.82,.34,1.0);sphere(body,0x373b42,side*.9,1.47,.7,[.49,.49,.49]);rod(body,0xcea65e,[side*.9,1.93,.7],[side*.76,2.26,.7],.05);sphere(body,0xffb453,side*.76,2.29,.7,[.1,.12,.1],true);}
 }else if(id==='brand'){
  humanoid({headColor:0x664034,hair:0x372724,armColor:0x51342a});for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;rod(body,0xff8c35,[Math.sin(angle)*.57,1.6,Math.cos(angle)*.52],[Math.sin(angle+.3)*.56,3.1,Math.cos(angle+.3)*.53],.075);cone(0xff933e,Math.sin(angle)*.65,3.65+Math.sin(i)*.2,Math.cos(angle)*.5,.16,.85,5);}for(const side of[-1,1]){sphere(body,0xffbb58,side*1.2,1.95,.55,[.35,.4,.3],true);sphere(body,0xffc783,side*.22,3.6,.53,[.09,.08,.09],true);}
 }else{
  humanoid({hair:{annie:0xb83a58,morgana:0x23223a,masteryi:0x334f49,leesin:0x593527,darius:0x2c2631,leona:0xbb7650,vayne:0x272035,caitlyn:0x392840,missfortune:0xad393b,sona:0x45b4c7}[id],armor:['darius','leona','masteryi'].includes(id),armColor:['darius','leona'].includes(id)?0xaaa18c:cloth});
  if(id==='annie'){
   cylinder(body,0xa84662,0,.98,0,.99,.88,.54);sphere(body,0xa13962,-.47,2.8,-.18,[.42,.39,.36]);sphere(body,0xa13962,.47,2.8,-.18,[.42,.39,.36]);const bear=new THREE.Group();bear.position.set(-1.0,1.45,.7);body.add(bear);sphere(bear,0x9a693e,0,0,0,[.43,.54,.36]);sphere(bear,0xb78754,0,.62,0,[.42,.39,.38]);for(const side of[-1,1]){sphere(bear,0x8e613d,side*.3,.91,0,[.16,.19,.15]);sphere(bear,0x372d29,side*.15,.65,.33,[.055,.055,.05]);sphere(bear,0x8e6239,side*.35,-.15,0,[.18,.27,.2]);}sphere(body,0xffa958,1.0,1.6,.62,[.38,.48,.35],true);
  }else if(id==='morgana'){
   cylinder(body,0x382b4a,0,.83,0,1.55,1.35,.65);for(const side of[-1,1]){const wing=new THREE.Group();wing.position.set(side*.55,2.9,-.52);body.add(wing);for(let i=0;i<5;i++){const feather=part(wing,geo('darkFeather',()=>new THREE.ConeGeometry(.32,2.35,5)),i%2?0x292336:0x583762,side*(.8+i*.45),-.3-i*.22,-.1,[1,1,.35]);feather.rotation.z=-side*(.75+i*.14);}g.userData.wings??=[];g.userData.wings.push(wing);}sphere(body,0xc581ed,1.15,2,.52,[.34,.39,.34],true);
  }else if(id==='masteryi'){
   box(body,0x5a8771,0,3.7,.42,[1.35,.36,.6]);for(const x of[-.42,0,.42])for(const y of[3.56,3.78])sphere(body,0xc3f087,x,y,.74,[.09,.08,.065],true);blade(1.18,1.96,.4,0x91e7bc,4);cape(0x294947,.93,1.9);
  }else if(id==='leesin'){
   sphere(body,skin,0,3.91,-.05,[.59,.32,.5]);box(body,0xb83f3b,0,3.69,.56,[1.13,.26,.18]);cylinder(body,skin,0,2.48,.22,.6,.7,.7);for(const side of[-1,1]){sphere(body,0xd8c4a6,side*1.2,1.94,.43,[.3,.28,.3]);rod(body,0xe2cfaa,[side*.52,1.18,.07],[side*.52,.38,.3],.26);}rod(body,0xad313b,[0,3.72,-.55],[0,3.38,-1.45],.08);
  }else if(id==='darius'){
   box(body,0x747b7d,0,2.3,.63,[1.35,1.25,.32]);cape(0x7d263e);for(const side of[-1,1])cone(0xb9b6a5,side*1.04,3.28,0,.24,.75,5);const axe=new THREE.Group();axe.position.set(1.34,1.58,.3);body.add(axe);rod(axe,0x695041,[0,-1.05,0],[0,3.42,0],.14);box(axe,0xbfc6c6,-.58,2.8,0,[1.45,1.62,.25]);box(axe,0x454d54,.42,2.8,0,[.56,1.1,.3]);axe.rotation.z=-.24;g.userData.sword=axe;
  }else if(id==='leona'){
   box(body,0xcbb576,0,2.36,.65,[1.22,1.03,.23]);blade(1.22,1.92,.4,0xffd27b,3.4);const shield=part(body,geo('sunShield',()=>new THREE.CylinderGeometry(1.28,1.28,.24,10)),0xcfac5d,-1.25,2.13,.56,[1,1.3,1]);shield.rotation.x=Math.PI/2;sphere(body,0xffdfa0,-1.25,2.13,.78,[.47,.61,.16],true);for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(body,0xffd886,[-1.25+Math.sin(a)*.45,2.13+Math.cos(a)*.6,.86],[-1.25+Math.sin(a)*.88,2.13+Math.cos(a)*1.1,.86],.035);}
  }else if(id==='vayne'){
   cape(0x672848,1.35,2.2);box(body,0x944545,0,3.62,.53,[1.0,.14,.17]);for(const side of[-1,1]){rod(body,0x79707c,[side*.75,1.94,.88],[side*1.44,1.94,.88],.09);rod(body,0xd6bc95,[side*1.06,1.94,.54],[side*1.06,1.94,1.56],.06);}rod(body,0x70677d,[-1.12,3.35,-.62],[1.12,3.35,-.62],.11);rod(body,0x987b8e,[0,2.67,-.62],[0,3.95,-.62],.12);
  }else if(id==='caitlyn'){
   cylinder(body,0x453965,0,4.19,-.08,.61,.92,.58);cylinder(body,0x463554,0,3.74,-.07,.95,.12);box(body,0xc8a776,0,4.1,.59,[.28,.31,.08]);const rifle=new THREE.Group();rifle.position.set(1.0,2.05,.75);body.add(rifle);rod(rifle,0x6e7180,[0,0,-.7],[0,0,3.7],.12);box(rifle,0x865e42,0,0,-.76,[.36,.47,1.09]);rod(rifle,0x5e516b,[0,.36,.03],[0,.36,1.04],.12);sphere(rifle,0x8ad3f0,0,.36,1.15,[.1,.1,.055],true);
  }else if(id==='missfortune'){
   sphere(body,0x342532,0,3.99,-.03,[1.0,.32,.63]);for(const side of[-1,1]){box(body,0x633349,side*.6,3.98,-.06,[.51,.17,.52]);sphere(body,0xae3e40,side*.55,3.26,-.35,[.27,.92,.36]);rod(body,0xc5a174,[side*1.2,1.92,.54],[side*1.2,1.92,1.8],.2);box(body,0x644536,side*1.2,1.63,.79,[.28,.55,.37]);}box(body,0xccb776,0,3.99,.55,[.31,.29,.09]);
  }else if(id==='sona'){
   cylinder(body,0x307f96,0,.98,0,1.4,1.5,.67);for(const side of[-1,1])sphere(body,0x38a3b2,side*.52,2.89,-.44,[.24,1.42,.41]);const instrument=new THREE.Group();instrument.position.set(0,1.98,1.15);body.add(instrument);box(instrument,0x9b7e4c,0,0,0,[3.72,.28,1.12]);for(let i=0;i<8;i++)rod(instrument,0xffe2a7,[(i-3.5)*.33,.18,-.4],[(i-3.5)*.33,.18,.4],.027);for(const side of[-1,1])sphere(instrument,0x48d4ed,side*1.67,.07,0,[.35,.22,.55],true);g.userData.instrument=instrument;
  }
 }
 g.userData.legs=legs;g.userData.modelHeight=['malphite','blitzcrank'].includes(id)?7:small?5:6;
 const shield=new THREE.Mesh(geo('shield',()=>new THREE.SphereGeometry(1,16,12)),new THREE.MeshBasicMaterial({color:team,transparent:true,opacity:.14,depthWrite:false}));shield.position.y=small?1.8:2.4;shield.scale.setScalar(['malphite','blitzcrank'].includes(id)?3.1:small?1.8:2.2);shield.visible=false;shield.renderOrder=3;g.add(shield);g.userData.shield=shield;return g;
}
