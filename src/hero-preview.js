import * as THREE from 'three';
import {createHeroPreview,disposeHeroPreview} from './actors.js';
import {updateSkin} from './skin-effects.js';

function visibleBounds(model){
 const bounds=new THREE.Box3();model.updateMatrixWorld(true);
 const visit=object=>{if(!object.visible)return;if(object.isMesh){object.geometry.computeBoundingBox();bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));}for(const child of object.children)visit(child);};
 visit(model);return bounds;
}
export class HeroPreview{
 constructor(canvas){
  this.canvas=canvas;this.angle=.16;this.elapsed=0;this.zoom=1;this.center=new THREE.Vector3(0,2.1,0);this.size=new THREE.Vector3(5,5,5);
  try{this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});}catch{return;}
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.04;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xc9e6f2,0x15282d,1.8));
  const key=new THREE.DirectionalLight(0xffecd7,3.2);key.position.set(-4,7,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:8,bottom:-4,near:.5,far:22});key.shadow.normalBias=.025;key.shadow.bias=-.00015;this.scene.add(key);
  const rim=new THREE.DirectionalLight(0x64cff5,2.5);rim.position.set(4,6,-5);this.scene.add(rim);
  const fill=new THREE.DirectionalLight(0xffffff,.6);fill.position.set(1,2,6);this.scene.add(fill);
  this.camera=new THREE.PerspectiveCamera(34,1,.1,80);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(2.65,2.8,.22,64),new THREE.MeshStandardMaterial({color:0x193d46,metalness:.5,roughness:.42}));pedestal.position.y=-.18;pedestal.receiveShadow=true;this.scene.add(pedestal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.52,.028,8,64),new THREE.MeshBasicMaterial({color:0x77dcd8}));ring.rotation.x=Math.PI/2;ring.position.y=-.06;this.scene.add(ring);
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;const context=contactCanvas.getContext('2d'),gradient=context.createRadialGradient(64,64,6,64,64,60);gradient.addColorStop(0,'rgba(0,5,10,.6)');gradient.addColorStop(.45,'rgba(0,5,10,.27)');gradient.addColorStop(1,'rgba(0,5,10,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);this.contactTexture=new THREE.CanvasTexture(contactCanvas);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshBasicMaterial({map:this.contactTexture,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.064;this.scene.add(contact);
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,angle:this.angle};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(this.drag)this.angle=this.drag.angle+(e.clientX-this.drag.x)*.011;});
  for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>this.drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=THREE.MathUtils.clamp(this.zoom*Math.exp(e.deltaY*.001),.52,1.5);this.updateCamera();},{passive:false});
  this.observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>this.resize()):null;this.observer?.observe(canvas);
 }
 setHero(heroId,skinId='default'){
  if(!this.renderer||this.key===`${heroId}:${skinId}`)return;this.key=`${heroId}:${skinId}`;this.drag=null;
  if(this.model)disposeHeroPreview(this.model);
  this.model=createHeroPreview(heroId,skinId);this.model.rotation.y=0;
  const bounds=visibleBounds(this.model),size=bounds.getSize(new THREE.Vector3());
  this.model.scale.setScalar(Math.min(5.05/Math.max(1,size.y),7.8/Math.max(1,size.x,size.z)));
  const fitted=visibleBounds(this.model);fitted.getSize(this.size);fitted.getCenter(this.center);this.center.y=Math.max(1.5,this.center.y);this.center.x=0;this.center.z=0;
  this.scene.add(this.model);this.resetView();
 }
 resize(){
  if(!this.renderer)return;const width=this.canvas.clientWidth,height=this.canvas.clientHeight;if(!width||!height)return;
  if(width!==this.width||height!==this.height){this.width=width;this.height=height;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  this.updateCamera();
 }
 updateCamera(){
  if(!this.camera)return;const halfFov=THREE.MathUtils.degToRad(this.camera.fov*.5),vertical=this.size.y/2/Math.tan(halfFov),horizontal=Math.max(this.size.x,this.size.z)/2/(Math.tan(halfFov)*Math.max(.3,this.camera.aspect));
  const distance=Math.max(vertical,horizontal)*1.32*this.zoom;
  this.camera.position.set(0,this.center.y+distance*.115,distance);this.camera.lookAt(this.center);this.camera.updateMatrixWorld();
 }
 resetView(){this.angle=.16;this.zoom=1;this.drag=null;this.resize();}
 render(dt){
  if(!this.renderer||!this.model)return;this.resize();if(!this.width||!this.height)return;
  this.elapsed+=dt;if(!this.drag)this.angle+=dt*.11;updateSkin(this.model,dt,this.elapsed,null,{x:0,z:0});
  this.model.rotation.y=this.angle;this.model.position.y=Math.sin(this.elapsed*1.5)*.02;
  const data=this.model.userData;for(const[i,tail]of(data.tails||[]).entries())tail.rotation.z=Math.sin(this.elapsed*1.4+i*.4)*.065;
  for(const[i,braid]of(data.braids||[]).entries())braid.rotation.x=Math.sin(this.elapsed*1.6+i)*.035;
  this.renderer.render(this.scene,this.camera);
 }
 get stats(){return{drawCalls:this.renderer?.info.render.calls||0,triangles:this.renderer?.info.render.triangles||0,geometries:this.renderer?.info.memory.geometries||0,textures:this.renderer?.info.memory.textures||0};}
}
