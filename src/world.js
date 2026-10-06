import * as THREE from 'three';

// All scenery is generated locally. Coordinates share the game's x/z ground plane.
const TOP = [[-100,100],[-110,65],[-112,-60],[-90,-108],[65,-110],[100,-100]];
const BOT = [[-100,100],[-65,112],[90,108],[112,75],[108,-65],[100,-100]];
const MID = [[-100,100],[0,0],[100,-100]];
const LANES = [TOP, BOT, MID];
const CAMPS = [[-62,8],[-12,62],[62,-8],[12,-62],[-77,47],[-40,58],[77,-47],[40,-58]];
const JUNGLE_CORRIDORS = [
  [[-100,100],[-62,8],[-28,-1],[-16,-5]],
  [[-100,100],[-12,62],[24,28]],
  [[100,-100],[62,-8],[28,1],[16,5]],
  [[100,-100],[12,-62],[-24,-28]],
];
const SQRT2 = Math.sqrt(2);

function seededRandom(seed = 87653) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1];
  const t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}

function distanceToPath(x,z,path) {
  let d=Infinity;
  for(let i=1;i<path.length;i++) d=Math.min(d,segmentDistance(x,z,path[i-1],path[i]));
  return d;
}

function pathDistance(x,z) {
  return Math.min(...LANES.map(p=>distanceToPath(x,z,p)));
}

function terrainHeight(x,z) {
  const border=Math.max(Math.abs(x),Math.abs(z));
  const outside=Math.max(0,border-123);
  return -.14 + Math.sin(x*.13)*Math.cos(z*.16)*.055 + outside*.39 + Math.max(0,outside-10)*.28;
}

function groundTexture(random) {
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#8e927d'; ctx.fillRect(0,0,256,256);
  for(let i=0;i<16000;i++) {
    const shade=Math.floor(96+random()*90);
    ctx.fillStyle=`rgba(${shade},${shade+4},${shade-10},${.08+random()*.14})`;
    const n=1+random()*2.3;
    ctx.fillRect(random()*256,random()*256,n,n);
  }
  for(let i=0;i<210;i++) {
    const x=random()*256,y=random()*256;
    ctx.strokeStyle='rgba(55,67,52,.2)'; ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*12-6,y+random()*12-6);ctx.stroke();
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(26,26);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  return tex;
}

function stoneTexture(random) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#8c8b76';ctx.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++) {
    ctx.fillStyle=random()<.5?'rgba(50,49,41,.05)':'rgba(221,218,179,.07)';
    ctx.fillRect(random()*512,random()*512,1+random()*5,1+random()*5);
  }
  for(let row=0;row<7;row++) for(let col=0;col<7;col++) {
    const x=col*79+(row%2?35:0)-30,y=row*81-12;
    ctx.strokeStyle='rgba(38,48,41,.35)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+3,y+random()*8);ctx.lineTo(x+73,y+3);ctx.lineTo(x+78,y+75);ctx.lineTo(x+4,y+79);ctx.closePath();ctx.stroke();
    ctx.strokeStyle='rgba(221,220,179,.22)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+7,y+6);ctx.lineTo(x+68,y+5);ctx.stroke();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
}

function rockyGeometry(random) {
  const geometry=new THREE.IcosahedronGeometry(1,1);
  const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const f=.91+.13*Math.sin(x*23.1+y*18.6+z*13.3)+.06*Math.sin(x*11.7-z*8.1);
    pos.setXYZ(i,x*f,y*f,z*f);
  }
  geometry.computeVertexNormals();return geometry;
}

function stripGeometry(path,width,random,y=.025) {
  const points=[];
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3);
    for(let j=0;j<n;j++)points.push([THREE.MathUtils.lerp(a[0],b[0],j/n),THREE.MathUtils.lerp(a[1],b[1],j/n)]);
  }
  points.push(path[path.length-1]);
  const vertices=[],uvs=[],indices=[];let distance=0;
  for(let i=0;i<points.length;i++) {
    const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
    const dx=after[0]-before[0],dz=after[1]-before[1],len=Math.hypot(dx,dz);
    if(i)distance+=Math.hypot(p[0]-before[0],p[1]-before[1]);
    const w=width*(.94+random()*.12);
    vertices.push(p[0]-dz/len*w,y,p[1]+dx/len*w,p[0]+dz/len*w,y,p[1]-dx/len*w);
    uvs.push(0,distance/15,1,distance/15);
    if(i) {const a=(i-1)*2,b=i*2;indices.push(a,b,a+1,b,b+1,a+1);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

export function createWorld(scene) {
  const random=seededRandom(), world=new THREE.Group();world.name='The Verdant Rift';scene.add(world);
  const animated=[], disposables=[], batches=new Map(), obstacles=[];
  const v3=new THREE.Vector3(),quat=new THREE.Quaternion(),matrix=new THREE.Matrix4();
  const materials={
    rock:new THREE.MeshStandardMaterial({color:0x535e62,roughness:1,flatShading:true}),
    slate:new THREE.MeshStandardMaterial({color:0x313f48,roughness:1,flatShading:true}),
    moss:new THREE.MeshStandardMaterial({color:0x314f40,roughness:1,flatShading:true}),
    bark:new THREE.MeshStandardMaterial({color:0x463d35,roughness:1}),
    leaf:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98,flatShading:true}),
    grass:new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide}),
    wood:new THREE.MeshStandardMaterial({color:0x68513a,roughness:.95}),
    gold:new THREE.MeshStandardMaterial({color:0xab9161,roughness:.65,metalness:.3}),
    stone:new THREE.MeshStandardMaterial({color:0x818b88,roughness:.93,flatShading:true}),
    blue:new THREE.MeshStandardMaterial({color:0x55dbe8,emissive:0x179eab,emissiveIntensity:1.2,roughness:.4,metalness:.15}),
    red:new THREE.MeshStandardMaterial({color:0xf4868d,emissive:0xd12643,emissiveIntensity:1.15,roughness:.4,metalness:.15}),
    fire:new THREE.MeshBasicMaterial({color:0xffbd5a}),
    dark:new THREE.MeshStandardMaterial({color:0x253d36,roughness:1}),
    cloth:new THREE.MeshStandardMaterial({color:0x234960,side:THREE.DoubleSide,roughness:1}),
    purple:new THREE.MeshStandardMaterial({color:0x867bd3,emissive:0x543da5,emissiveIntensity:1.3,roughness:.55}),
  };
  const geometries={
    rock:rockyGeometry(random),trunk:new THREE.CylinderGeometry(.64,1,1,6),
    foliage:new THREE.IcosahedronGeometry(1,1),bush:new THREE.IcosahedronGeometry(1,0),
    box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),
    cone:new THREE.ConeGeometry(1,1,6),crystal:new THREE.OctahedronGeometry(1,0),
  };

  function mesh(geometry,material,x=0,y=0,z=0,sx=1,sy=sx,sz=sx) {
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.castShadow=true;m.receiveShadow=true;world.add(m);return m;
  }
  function instance(type,mat,x,y,z,sx=1,sy=sx,sz=sx,rotation=0,color=null) {
    const key=type+'_'+mat;
    if(!batches.has(key))batches.set(key,{geometry:geometries[type],material:materials[mat],items:[]});
    batches.get(key).items.push({x,y,z,sx,sy,sz,rotation,color});
  }
  function obstacle(x,z,r,force=false) {
    if(Math.max(Math.abs(x),Math.abs(z))>122)return;
    if(pathDistance(x,z)<r+6.1)return;
    if(Math.hypot(x+100,z-100)<r+24||Math.hypot(x-100,z+100)<r+24)return;
    if(JUNGLE_CORRIDORS.some(p=>distanceToPath(x,z,p)<r+6))return;
    if(!force&&CAMPS.some(c=>Math.hypot(x-c[0],z-c[1])<r+(Math.abs(c[0])===62?12:7.2)))return;
    obstacles.push({x,z,r});
  }
  function rock(x,z,s=2,h=s,mat='rock',blocking=false) {
    if(h>2&&JUNGLE_CORRIDORS.some(p=>distanceToPath(x,z,p)<s*.82+6))return;
    instance('rock',mat,x,terrainHeight(x,z)+h*.48,z,s,h,s*(.6+random()*.35),random()*Math.PI);
    if(s>2.8)instance('rock','moss',x+.12*s,terrainHeight(x,z)+h*.85,z-.16*s,s*.8,h*.18,s*.63,random()*Math.PI);
    if(blocking||s>2.9&&h>2)obstacle(x,z,s*.82,blocking);
  }
  function tree(x,z,s=1,edge=false) {
    const y=terrainHeight(x,z),h=(6+random()*3)*s;
    instance('trunk','bark',x,y+h*.43,z,s*.58,h*.86,s*.58,random()*6.28);
    // Four overlapping angular crowns give each tree a sculpted, branching silhouette.
    const color=new THREE.Color().setHSL(.365+random()*.1,.27+random()*.23,.12+random()*.105);
    instance('foliage','leaf',x,y+h,z,s*3.2,s*2.3,s*3.3,random()*6.28,color);
    for(let i=0;i<3;i++) {
      const a=i*2.09+random()*.6;
      instance('foliage','leaf',x+Math.cos(a)*2.1*s,y+h-.7*s,z+Math.sin(a)*2.1*s,2.7*s,1.85*s,2.8*s,a,color.clone().multiplyScalar(.83+random()*.32));
    }
    if(edge)instance('cone','leaf',x,y+h+2*s,z,2.2*s,3.8*s,2.2*s,0,color.clone().multiplyScalar(.8));
    for(let i=0;i<2;i++) {
      const a=random()*6.28;
      instance('rock','moss',x+Math.cos(a)*s,y+.25,z+Math.sin(a)*s,s*1.3,.3*s,s*.7,a);
    }
    obstacle(x,z,2.8*s);
  }
  function bush(x,z,s=1,color=0x315749) {
    const c=new THREE.Color(color);
    for(let j=0;j<3;j++)instance('bush','leaf',x+(random()-.5)*s*2,.8*s,z+(random()-.5)*s*2,s*1.5,s*.9,s*1.3,random()*6.28,c.clone().multiplyScalar(.8+random()*.4));
  }

  const tex=groundTexture(random),stoneTex=stoneTexture(random);disposables.push(tex,stoneTex);
  const landGeo=new THREE.PlaneGeometry(288,288,96,96);landGeo.rotateX(-Math.PI/2);
  const pos=landGeo.attributes.position,colors=[];
  const grassColor=new THREE.Color(),darkGreen=new THREE.Color(0x25463a),lightGreen=new THREE.Color(0x56704b),earthColor=new THREE.Color(0x8d8362);
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrainHeight(x,z));
    const lane=pathDistance(x,z),river=Math.abs(x-z)/SQRT2;
    const grain=.45+.2*Math.sin(x*.031+z*.075)+.1*Math.cos(z*.19)+random()*.16;
    grassColor.copy(darkGreen).lerp(lightGreen,grain);
    if(lane<11)grassColor.lerp(earthColor,Math.max(0,1-lane/11)*.7);
    if(river<17)grassColor.lerp(new THREE.Color(0x47675b),.7);
    if(Math.max(Math.abs(x),Math.abs(z))>125)grassColor.multiplyScalar(.62);
    colors.push(grassColor.r,grassColor.g,grassColor.b);
  }
  landGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));landGeo.computeVertexNormals();
  const ground=mesh(landGeo,new THREE.MeshStandardMaterial({vertexColors:true,map:tex,roughness:1}));ground.name='Carved forest terrain';ground.castShadow=false;
  const under=mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshBasicMaterial({color:0x071d25}),0,-9,0);under.rotation.x=-Math.PI/2;under.receiveShadow=false;

  for(const [i,path] of LANES.entries()) {
    const outer=new THREE.MeshStandardMaterial({color:0x6e735b,map:stoneTex,roughness:1});
    mesh(stripGeometry(path,i===2?8.4:7.6,random,.013),outer).castShadow=false;
    const inner=new THREE.MeshStandardMaterial({color:i===2?0xaaa18a:0x9a967a,map:stoneTex,roughness:1});
    mesh(stripGeometry(path,i===2?5.9:5.1,random,.026),inner).castShadow=false;
  }

  // The river runs across the lanes, with a shallow, walkable middle ford.
  const riverVertices=[],riverUvs=[],riverIndices=[];
  for(let i=0;i<=120;i++) {
    const t=-183+i*3.05,w=10.9+2*Math.sin(t*.05)+.7*Math.sin(t*.19);
    for(const sign of [-1,1]) {
      riverVertices.push((t+sign*w)/SQRT2,.055,(t-sign*w)/SQRT2);
      riverUvs.push((sign+1)/2,i/120);
    }
    if(i){const a=(i-1)*2,b=i*2;riverIndices.push(a,b,a+1,b,b+1,a+1);}
  }
  const riverGeo=new THREE.BufferGeometry();riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverVertices,3));riverGeo.setAttribute('uv',new THREE.Float32BufferAttribute(riverUvs,2));riverGeo.setIndex(riverIndices);riverGeo.computeVertexNormals();
  const waterMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0}},
    vertexShader:`varying vec2 vUv; varying vec3 vWorld; void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float uTime;varying vec2 vUv;varying vec3 vWorld;
      void main(){float edge=smoothstep(0.0,.19,vUv.x)*(1.0-smoothstep(.81,1.0,vUv.x));
      float shallow=1.0-smoothstep(4.0,25.0,length(vWorld.xz));
      float flow=sin(vWorld.x*.7+vWorld.z*.65-uTime*1.45)+sin(vWorld.x*.21-vWorld.z*.34+uTime*.72);
      float fine=pow(max(0.0,sin(vWorld.x*1.9+sin(vWorld.z*.8)-uTime*2.0)),14.0);
      vec3 col=mix(vec3(.10,.27,.28),vec3(.02,.37,.39),edge);
      col+=vec3(.03,.11,.105)*flow*.23+vec3(.10,.20,.17)*fine*.27;
      col=mix(col,vec3(.30,.49,.40),shallow*.68);gl_FragColor=vec4(col,.84);}`
  });
  const river=mesh(riverGeo,waterMaterial);river.castShadow=false;river.receiveShadow=false;river.renderOrder=1;
  for(let t=-164;t<166;t+=2.8)for(const side of [-1,1]) {
    const gap=Math.abs(t)<22||Math.abs(t-68)<19||Math.abs(t+68)<19;
    const n=side*(12.6+2*Math.sin(t*.05)+random()*1.2);
    const x=(t+n)/SQRT2,z=(t-n)/SQRT2;
    if(!gap&&pathDistance(x,z)>7.5) {
      rock(x,z,1.1+random()*1.7,.4+random()*.8);
      if(random()<.38)bush(x,z,.6,0x315e4c);
    }
  }

  // A crossed blade creates a tuft of long grass in one instanced draw call.
  const grassGeo=new THREE.BufferGeometry();const blades=[],bladeColors=[];
  for(let i=0;i<5;i++) {
    const a=i*2.399,dx=Math.cos(a)*.16,dz=Math.sin(a)*.16,bx=Math.cos(a+Math.PI/2)*.105,bz=Math.sin(a+Math.PI/2)*.105;
    blades.push(dx-bx,0,dz-bz,dx+bx,0,dz+bz,dx*.55,.85+random()*.5,dz*.55);
    bladeColors.push(.34,.44,.32,.34,.44,.32,.78,.87,.57);
  }
  grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));grassGeo.setAttribute('color',new THREE.Float32BufferAttribute(bladeColors,3));grassGeo.computeVertexNormals();geometries.grass=grassGeo;
  materials.grass.vertexColors=true;
  for(let i=0;i<5600;i++) {
    const x=random()*254-127,z=random()*254-127,d=pathDistance(x,z),r=Math.abs(x-z)/SQRT2;
    if(d<6.6||r<11.5||Math.hypot(x+100,z-100)<23||Math.hypot(x-100,z+100)<23)continue;
    if(CAMPS.some(c=>Math.hypot(x-c[0],z-c[1])<8))continue;
    const h=.55+random()*.75;
    instance('grass','grass',x,terrainHeight(x,z)+.13,z,.9,h,.9,random()*6.28,new THREE.Color().setHSL(.28+random()*.09,.28,.55+random()*.15));
  }

  // Jungle corridors remain open while trees concentrate into irregular forests.
  const trees=[];
  for(let i=0;i<3900&&trees.length<470;i++) {
    const x=random()*252-126,z=random()*252-126;
    if(pathDistance(x,z)<13.5||Math.abs(x-z)/SQRT2<18.5)continue;
    if(Math.hypot(x+100,z-100)<27||Math.hypot(x-100,z+100)<27)continue;
    if(CAMPS.some(c=>Math.hypot(x-c[0],z-c[1])<12))continue;
    if(Math.hypot(x+48,z+48)<16||Math.hypot(x-48,z-48)<16)continue;
    if(JUNGLE_CORRIDORS.some(p=>distanceToPath(x,z,p)<9.6))continue;
    if(trees.some(p=>Math.hypot(x-p[0],z-p[1])<4.3))continue;
    trees.push([x,z]);tree(x,z,.72+random()*.53,Math.max(Math.abs(x),Math.abs(z))>117);
    if(random()<.4)bush(x+2,z-2,.7+random()*.5);
  }
  // Tall perimeter firs conceal the square map edges and give the valley depth.
  for(let i=0;i<140;i++) {
    const side=i%4,t=random()*270-135,x=side<2?(side===0?-134:134):t,z=side>=2?(side===2?-134:134):t;
    if(Math.abs(x-z)<20)continue;
    tree(x,z,1.1+random()*.7,true);
    rock(x,z,4+random()*4,5+random()*7,'slate');
  }
  for(let i=0;i<220;i++) {
    const x=random()*244-122,z=random()*244-122;
    if(pathDistance(x,z)<11||Math.abs(x-z)/SQRT2<16||CAMPS.some(c=>Math.hypot(x-c[0],z-c[1])<10))continue;
    if(Math.hypot(x+100,z-100)<27||Math.hypot(x-100,z+100)<27)continue;
    rock(x,z,1+random()*2.2,.6+random()*1.8);
  }

  const ridges=[
    [[-81,34],[-77,23],[-80,13],[-83,0]], [[-75,-22],[-69,-28],[-58,-30]],
    [[-53,77],[-44,71],[-35,66]], [[-10,82],[-1,78],[5,68]],
    [[-24,36],[-34,33],[-44,30]], [[-91,-63],[-78,-67],[-67,-72]],
  ];
  for(const sign of [-1,1])for(const ridge of ridges)for(const p of ridge) {
    const x=p[0]*sign,z=p[1]*sign;if(pathDistance(x,z)<10)continue;
    rock(x,z,4.3+random()*1.9,3.2+random()*3.3,'slate');
    instance('rock','stone',x-1.5*sign,1.6,z+1.5*sign,2,.8,1.8,random()*3);
  }

  function ring(x,z,r,tube,material,y=.15) {
    const m=mesh(new THREE.TorusGeometry(r,tube,5,64),material,x,y,z);m.rotation.x=-Math.PI/2;return m;
  }
  function base(sign) {
    const x=-100*sign,z=100*sign,team=sign===1?'blue':'red',glow=materials[team];
    const platform=mesh(new THREE.CylinderGeometry(22.6,23.3,.5,64),new THREE.MeshStandardMaterial({color:sign===1?0x778681:0x87797b,map:stoneTex,roughness:1}),x,.08,z);platform.castShadow=false;
    ring(x,z,21.4,.24,materials.stone,.4);ring(x,z,16.8,.07,glow,.39);
    ring(x,z,9.4,.055,glow,.4);ring(x,z,6.1,.075,materials.gold,.4);
    for(let i=0;i<28;i++) {
      const a=i*Math.PI*2/28,px=x+Math.cos(a)*20.3,pz=z+Math.sin(a)*20.3;
      instance('box','stone',px,.3,pz,2.5,.45,1.7,-a);
      if(i%2===0) {
        const rune=mesh(new THREE.BoxGeometry(.11,.03,1.05),glow,x+Math.cos(a)*17.6,.42,z+Math.sin(a)*17.6);rune.rotation.y=-a;
      }
    }
    // Radial inlaid stone spokes are readable through the structure silhouettes.
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      const spoke=mesh(new THREE.BoxGeometry(.14,.025,6.1),materials.gold,x+Math.sin(a)*12.8,.405,z+Math.cos(a)*12.8);spoke.rotation.y=a;
    }
    const fx=x-12*sign,fz=z+12*sign;
    mesh(new THREE.CylinderGeometry(5.6,6.2,.7,16),materials.slate,fx,.7,fz);
    ring(fx,fz,4.8,.3,materials.stone,1.16);ring(fx,fz,3.8,.13,glow,1.15);
    const fountain=mesh(new THREE.CircleGeometry(3.7,48),new THREE.MeshBasicMaterial({color:sign===1?0x2a8698:0x863749,transparent:true,opacity:.78}),fx,1.15,fz);fountain.rotation.x=-Math.PI/2;
    animated.push({mesh:fountain,type:'fountain'});
    for(let i=0;i<5;i++) {
      const a=i*6.28/5;
      const crystal=mesh(geometries.crystal,glow,fx+Math.cos(a)*4,2.05,fz+Math.sin(a)*4,.48,1.4,.48);crystal.rotation.y=a;animated.push({mesh:crystal,type:'crystal',baseY:2.05,phase:i});
    }
    // Broken monumental gates stand behind the fountain, outside the lanes.
    for(const n of [-1,1]) {
      const gx=x-15*sign+n*3.2,gz=z+18*sign;
      instance('box','slate',gx,3.2,gz,2.2,6.4,2.7,0);
      instance('box','gold',gx,5.8,gz,2.4,.38,2.9,0);
      instance('cone',team,gx,7.1,gz,.65,1.8,.65);
    }
    instance('box','stone',x-15*sign,7,z+18*sign,8.7,1.5,3.2,0);
    shop(x-11*sign,z-12*sign,sign,team);
  }

  function shop(x,z,sign,team) {
    const rotation=sign===1?-.25:Math.PI-.25;
    const group=new THREE.Group();group.position.set(x,.52,z);group.rotation.y=rotation;world.add(group);
    function part(g,m,px,py,pz,sx=1,sy=sx,sz=sx) {const o=new THREE.Mesh(g,m);o.position.set(px,py,pz);o.scale.set(sx,sy,sz);o.castShadow=true;group.add(o);return o;}
    part(geometries.box,materials.wood,0,1,0,6.6,1.7,3.1);
    part(geometries.box,materials.gold,0,1.9,0,6.9,.16,3.3);
    for(const a of [-1,1])for(const b of [-1,1])part(geometries.trunk,materials.wood,a*2.8,3,b*1.3,.17,4,.17);
    const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-3.7,4.5,-2,3.7,4.5,-2,-3.7,5.7,0,3.7,4.5,-2,3.7,5.7,0,-3.7,5.7,0,-3.7,5.7,0,3.7,5.7,0,-3.7,4.5,2,3.7,5.7,0,3.7,4.5,2,-3.7,4.5,2],3));roofGeo.computeVertexNormals();
    part(roofGeo,materials.cloth,0,0,0);
    for(let i=0;i<6;i++) {
      const awning=part(geometries.box,i%2?materials.gold:materials.cloth,-2.8+i*1.12,4.33,2,1.1,.62,.15);awning.rotation.z=(i%2?1:-1)*.07;
    }
    for(let i=0;i<4;i++) {
      const barrel=part(new THREE.CylinderGeometry(.65,.75,1.5,10),materials.wood,-4.6+i%2*1.3,.7,-1.2+Math.floor(i/2)*1.5);
      for(const yy of [.2,1.1]){const hoop=part(new THREE.TorusGeometry(.69,.055,5,12),materials.gold,barrel.position.x,yy,barrel.position.z);hoop.rotation.x=Math.PI/2;}
    }
    for(let i=0;i<5;i++) {
      part(geometries.cylinder,i%2?materials.blue:materials.purple,-2+i,2.15,.8,.17,.52,.17);
      part(geometries.crystal,materials[team],-2+i,2.52,.8,.15,.2,.15);
    }
    part(geometries.box,materials.wood,4,.6,1.4,1.5,1.2,1.5);
    part(geometries.box,materials.gold,4,1.24,1.4,1.6,.09,1.6);
    const banner=part(geometries.box,materials[team],3,3.1,-1.35,.7,1.3,.1);banner.rotation.z=.08;
  }
  base(1);base(-1);

  function bridge(x,z) {
    // Bridges cross the perpendicular river at the outer lane bends.
    const group=new THREE.Group();group.position.set(x,.04,z);group.rotation.y=-Math.PI/4;world.add(group);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(13,.27,27),materials.stone);deck.position.y=.12;deck.receiveShadow=true;group.add(deck);
    for(let i=0;i<9;i++) {
      const slab=new THREE.Mesh(new THREE.BoxGeometry(12.4,.17,2.75),i%2?materials.stone:materials.slate);slab.position.set(0,.29,-12+i*3);slab.receiveShadow=true;group.add(slab);
    }
    for(const side of [-1,1]) {
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.75,1.1,26),materials.slate);rail.position.set(side*6.3,.7,0);rail.castShadow=true;group.add(rail);
      for(const zz of [-12,0,12]) {
        const pillar=new THREE.Mesh(new THREE.BoxGeometry(1.5,2,1.5),materials.stone);pillar.position.set(side*6.3,1.3,zz);pillar.castShadow=true;group.add(pillar);
        const cap=new THREE.Mesh(geometries.cone,materials.gold);cap.position.set(side*6.3,2.55,zz);cap.scale.set(.72,.5,.72);group.add(cap);
      }
    }
  }
  bridge(-104,-105);bridge(106,105);

  function pit(x,z,baron) {
    const material=baron?materials.purple:materials.gold;
    const floor=mesh(new THREE.CircleGeometry(11.8,48),new THREE.MeshStandardMaterial({color:baron?0x2a283f:0x514535,map:stoneTex,roughness:1}),x,.11,z);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    ring(x,z,7.8,.085,material,.14);
    for(let i=0;i<19;i++) {
      const a=i*6.28/19;
      // Open mouth faces the river ford. The wall is a broken horseshoe.
      if(baron?Math.abs(THREE.MathUtils.euclideanModulo(a-Math.PI/4+Math.PI,6.28)-Math.PI)<.63:Math.abs(THREE.MathUtils.euclideanModulo(a-5*Math.PI/4+Math.PI,6.28)-Math.PI)<.63)continue;
      const px=x+Math.cos(a)*12,pz=z+Math.sin(a)*12,h=4.5+random()*4;
      rock(px,pz,3+random()*1.3,h,'slate',true);
      if(i%3===0)instance('crystal',baron?'purple':'gold',px,2.4,pz,.52,1.55,.52,a);
    }
    const angle=baron?Math.PI*1.25:Math.PI*.25;
    const px=x+Math.cos(angle)*11,pz=z+Math.sin(angle)*11;
    // Monumental carved jaws and tusks make the epic monster arenas recognizable.
    for(const side of [-1,1]) {
      instance('cone','stone',px+side*2.4,5,pz,.65,5.4,.72,side*.2);
      instance('rock','slate',px+side*3.5,2.5,pz,2.2,3.2,2.3,side*.35);
    }
    instance('rock','stone',px,4,pz,3.5,1.55,2.4,0);
    if(baron) {
      for(let i=0;i<7;i++) {
        const a=i*2.399,r=8.5+random()*2;
        instance('crystal','purple',x+Math.cos(a)*r,.8,z+Math.sin(a)*r,.38,1.6+random(),.38,a);
      }
    } else {
      const scar=mesh(new THREE.RingGeometry(3.8,4,6),materials.gold,x,.17,z);scar.rotation.x=-Math.PI/2;scar.rotation.z=Math.PI/6;
    }
  }
  pit(-48,-48,true);pit(48,48,false);

  // Camp clearings: stone circles, buff runes, discarded equipment, and glowing mushrooms.
  for(let i=0;i<CAMPS.length;i++) {
    const [x,z]=CAMPS[i],buff=i<4,blue=i%2===0;
    const patch=mesh(new THREE.CircleGeometry(buff?7:5.8,24),new THREE.MeshStandardMaterial({color:buff?0x5c6350:0x485849,map:stoneTex,roughness:1}),x,.035,z);patch.rotation.x=-Math.PI/2;patch.castShadow=false;
    for(let j=0;j<9;j++) {
      const a=j*6.28/9;
      if(a>1.3&&a<2.8)continue;
      rock(x+Math.cos(a)*(buff?8.7:7.2),z+Math.sin(a)*(buff?8.7:7.2),1.3+random(),1.1+random());
    }
    if(buff) {
      ring(x,z,4.8,.055,blue?materials.blue:materials.red,.055);
      for(let j=0;j<3;j++) {
        const a=j*2.094;
        instance('crystal',blue?'blue':'red',x+Math.cos(a)*7,.7,z+Math.sin(a)*7,.32,1.35,.32,a);
      }
    }
    for(let j=0;j<4;j++) {
      const a=random()*6.28,r=6+random()*2.5;
      instance('trunk','wood',x+Math.cos(a)*r,.25,z+Math.sin(a)*r,.1,.45,.1);
      instance('foliage',j%2?'purple':'blue',x+Math.cos(a)*r,.5,z+Math.sin(a)*r,.45,.16,.45,0);
    }
  }

  // Bushes border the river and the two side lanes: grassy tall shapes, never walls.
  const brushPatches=[[-84,-102],[-103,-72],[-109,38],[-42,106],[42,-106],[103,72],[109,-38],[84,102],[-23,-37],[23,37],[-61,-72],[61,72],[-35,-15],[35,15],[-15,-35],[15,35]];
  for(const [x,z] of brushPatches)for(let i=0;i<12;i++) {
    const px=x+(random()-.5)*10,pz=z+(random()-.5)*5;
    if(pathDistance(px,pz)<6)continue;
    bush(px,pz,.6+random()*.5,0x4c6945);
    for(let j=0;j<3;j++)instance('grass','grass',px+(random()-.5)*2,.08,pz+(random()-.5)*2,1.5,1.8,1.5,random()*6.28,new THREE.Color(0x7f9761));
  }

  // Ancient lane monuments: flickering braziers, banners, flower clusters, loose paving stones.
  function torch(x,z,team=null) {
    instance('cylinder','slate',x,1.1,z,.4,2.2,.4);
    instance('cone','gold',x,2.3,z,.85,.55,.85);
    const flame=mesh(geometries.crystal,team?materials[team]:materials.fire,x,2.85,z,.35,.85,.35);flame.castShadow=false;
    animated.push({mesh:flame,type:'flame',phase:random()*6.28,baseY:2.85});
  }
  for(const [x,z] of [[-90,90],[-108,55],[-107,-40],[-68,-107],[38,-108],[90,-90],[108,-55],[107,40],[68,107],[-38,108],[-32,19],[32,-19],[-65,56],[65,-56]])torch(x,z);
  for(const sign of [-1,1])for(const p of [[-82,91],[-91,82]]) {
    const x=p[0]*sign,z=p[1]*sign;
    instance('trunk','wood',x,3.2,z,.14,6.4,.14);
    const banner=mesh(new THREE.BoxGeometry(2.1,3.2,.08),materials[sign===1?'blue':'red'],x+1.05*sign,4.9,z);banner.rotation.z=.08*sign;
    instance('cone','gold',x,6.55,z,.28,.6,.28);
  }
  for(let i=0;i<180;i++) {
    const x=random()*225-112.5,z=random()*225-112.5;
    const d=pathDistance(x,z);if(d<6.5||d>11.7||Math.abs(x-z)<20)continue;
    instance('rock','stone',x,.05,z,.3+random()*.6,.07,.4+random()*.7,random()*6.28);
    if(random()<.6)for(let j=0;j<4;j++) {
      const px=x+(random()-.5)*2,pz=z+(random()-.5)*2;
      instance('trunk','moss',px,.35,pz,.035,.7,.035);
      instance('foliage',j%3?'purple':'blue',px,.73,pz,.15,.1,.15,random()*6.28);
    }
  }

  // Cascades at the map's corners disappear into the surrounding misty ravine.
  const waterfallMat=new THREE.MeshBasicMaterial({color:0x55a8b6,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});
  for(const sign of [-1,1]) {
    const x=sign*127,z=sign*127;
    for(let i=0;i<6;i++) {
      const fall=mesh(new THREE.PlaneGeometry(.55+random()*.8,14),waterfallMat,x+(i-2.5)*1.6,-2,z-(i-2.5)*1.6);fall.rotation.y=-Math.PI/4;fall.castShadow=false;animated.push({mesh:fall,type:'waterfall',phase:i});
    }
    for(let i=0;i<7;i++)rock(x+(i-3)*3,z-(i-3)*3,2.6,4+random()*3,'slate');
    const mist=mesh(new THREE.CircleGeometry(11,24),new THREE.MeshBasicMaterial({color:0x6babaa,transparent:true,opacity:.06,depthWrite:false}),x,-7,z);mist.rotation.x=-Math.PI/2;mist.castShadow=false;
  }

  // Sparse fireflies provide depth and moving glints without extra light sources.
  const motePositions=[],moteSeeds=[];
  for(let i=0;i<130;i++) {
    const x=random()*236-118,z=random()*236-118;
    motePositions.push(x,.5+random()*3,z);moteSeeds.push(random()*6.28);
  }
  const moteGeo=new THREE.BufferGeometry();moteGeo.setAttribute('position',new THREE.Float32BufferAttribute(motePositions,3));
  const moteMaterial=new THREE.PointsMaterial({color:0x99dbc5,size:.27,transparent:true,opacity:.62,depthWrite:false,sizeAttenuation:true});
  const motes=new THREE.Points(moteGeo,moteMaterial);world.add(motes);

  for(const batch of batches.values()) {
    const im=new THREE.InstancedMesh(batch.geometry,batch.material,batch.items.length);
    for(let i=0;i<batch.items.length;i++) {
      const p=batch.items[i];quat.setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation);
      matrix.compose(v3.set(p.x,p.y,p.z),quat,new THREE.Vector3(p.sx,p.sy,p.sz));im.setMatrixAt(i,matrix);
      if(p.color)im.setColorAt(i,p.color);
    }
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
    im.castShadow=!batch.geometry.getAttribute('color');im.receiveShadow=true;im.computeBoundingSphere();world.add(im);
  }

  return {
    ground,
    obstacles,
    group:world,
    update(time,dt) {
      waterMaterial.uniforms.uTime.value=time;
      for(const item of animated) {
        if(item.type==='crystal') {item.mesh.position.y=item.baseY+Math.sin(time*.9+item.phase)*.15;item.mesh.rotation.y+=dt*.15;}
        if(item.type==='flame') {const f=.83+Math.sin(time*7+item.phase)*.12+Math.sin(time*11+item.phase)*.05;item.mesh.scale.y=.85*f;item.mesh.position.y=item.baseY+f*.08;}
        if(item.type==='fountain') {item.mesh.material.opacity=.65+Math.sin(time*.8)*.1;}
        if(item.type==='waterfall')item.mesh.scale.x=.85+Math.sin(time*4+item.phase)*.1;
      }
      const mpos=moteGeo.attributes.position;
      for(let i=0;i<moteSeeds.length;i++) {
        mpos.setY(i,motePositions[i*3+1]+Math.sin(time*.4+moteSeeds[i])*.4);
      }
      mpos.needsUpdate=true;
    },
    dispose() {
      world.traverse(object=>{if(object.geometry)object.geometry.dispose();});
      const used=new Set();world.traverse(o=>{if(o.material){for(const mat of Array.isArray(o.material)?o.material:[o.material])used.add(mat);}});
      for(const mat of used)mat.dispose();for(const texture of disposables)texture.dispose();scene.remove(world);
    }
  };
}
