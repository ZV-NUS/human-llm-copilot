import * as T from './vendor/three.module.js';
export class DrivingView {
 constructor(host,mirrorHost,onError){
  this.host=host;this.mode='driver';this.samples=[];this.cars=new Map();this.frames=0;this.fps=0;this.since=performance.now();
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'default',preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','实时驾驶员第一视角');
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onError('三维画面暂不可用，请先停止当前软件任务。')});
  this.scene=new T.Scene();this.scene.background=new T.Color('#bfd6df');this.scene.fog=new T.Fog('#bfd6df',130,520);
  this.camera=new T.PerspectiveCamera(52,1,.1,650);this.rear=new T.PerspectiveCamera(45,3.6,.1,450);
  const hemi=new T.HemisphereLight(0xe3f3ff,0x717f63,2.1);this.scene.add(hemi);
  this.sun=new T.DirectionalLight(0xfff0d3,2.5);this.sun.position.set(-40,65,20);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
  Object.assign(this.sun.shadow.camera,{left:-60,right:60,top:70,bottom:-70,near:1,far:170});this.sun.shadow.normalBias=.025;this.sun.shadow.bias=-.0001;
  this.scene.add(this.sun,this.sun.target);this.buildRoad();
  this.ego=this.makeCar(0x355a73);this.scene.add(this.ego);
  this.rearTexture=new T.WebGLRenderTarget(420,110);this.mirrorScene=new T.Scene();this.mirrorCam=new T.OrthographicCamera(-1,1,1,-1,0,2);
  this.mirrorScene.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:this.rearTexture.texture})));
  this.mirrorHost=mirrorHost;new ResizeObserver(()=>this.resize()).observe(host);this.resize();
  this.renderer.setAnimationLoop(()=>this.frame());
 }
 mat(color,rough=.7,metal=0){return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
 box(x,y,z,mat,parent,px=0,py=0,pz=0){const a=new T.Mesh(new T.BoxGeometry(x,y,z),mat);a.position.set(px,py,pz);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
 instances(geo,mat,items){const mesh=new T.InstancedMesh(geo,mat,items.length);const o=new T.Object3D();items.forEach((p,i)=>{o.position.set(...p.slice(0,3));o.scale.set(...(p.slice(3).length?p.slice(3):[1,1,1]));o.updateMatrix();mesh.setMatrixAt(i,o.matrix)});mesh.receiveShadow=true;this.scene.add(mesh);return mesh}
 buildRoad(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),im=ctx.createImageData(256,256);let seed=31;
  for(let i=0;i<im.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const g=95+(seed%21);im.data.set([g,g+2,g+3,255],i)}ctx.putImageData(im,0,0);
  const asphalt=new T.CanvasTexture(canvas);asphalt.colorSpace=T.SRGBColorSpace;asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(6,500);
  const ground=this.box(2000,.12,2200,this.mat('#7d916f'),this.scene,0,-.14,-450);ground.castShadow=false;
  const road=this.box(10.8,.06,1800,new T.MeshStandardMaterial({map:asphalt,roughness:1}),this.scene,0,-.03,-450);road.castShadow=false;
  const shoulder=this.mat('#b1b4a6');for(const side of [-1,1]){this.box(.8,.04,1800,shoulder,this.scene,side*5.8,-.015,-450);this.box(.12,.012,1800,this.mat('#eeeade'),this.scene,side*5.25,.012,-450)}
  const dashes=[];for(let z=-1300;z<400;z+=9)for(const x of [-1.8,1.8])dashes.push([x,.014,z]);this.instances(new T.BoxGeometry(.13,.015,3.4),this.mat('#faf7e9'),dashes);
  const posts=[];for(let z=-1300;z<400;z+=5)for(const side of [-1,1])posts.push([side*6.4,.44,z]);this.instances(new T.BoxGeometry(.09,.85,.12),this.mat('#98a3a6',.45,.5),posts);
  for(const side of [-1,1])this.box(.12,.24,1800,this.mat('#bdc6c8',.42,.45),this.scene,side*6.4,.77,-450);
  const trunks=[],leaves=[];for(let i=0;i<130;i++){const side=i%2?1:-1;const x=side*(15+(i*17)%35),z=-1150+i*12;trunks.push([x,1.1,z]);leaves.push([x,4.2+(i%3)*.3,z,1+(i%4)*.1,1+(i%3)*.2,1+(i%4)*.1])}
  this.instances(new T.CylinderGeometry(.17,.24,2.3,6),this.mat('#776a50'),trunks);
  this.instances(new T.ConeGeometry(2.6,7,8),this.mat('#476f58'),leaves);
  const hills=[];for(let i=0;i<24;i++)hills.push([(i%2?1:-1)*(310+(i*29)%140),-48,-1000+i*80,1+(i%3)*.4,1,1]);this.instances(new T.SphereGeometry(80,12,6),this.mat('#8b9f88'),hills);
 }
 makeCar(color){
  const car=new T.Group(),body=this.mat(color,.28,.35),glass=this.mat('#2b4655',.16,.45),trim=this.mat('#20272a',.65),chrome=this.mat('#abb8bf',.32,.75);
  this.box(1.82,.47,4.4,body,car,0,.66,0);this.box(1.72,.16,4.05,body,car,0,.96,-.1);
  const cab=this.box(1.52,.52,2.2,glass,car,0,1.21,.12);this.box(1.56,.09,1.75,body,car,0,1.5,.22);
  this.box(1.6,.22,.1,trim,car,0,.51,2.24);this.box(1.6,.18,.1,trim,car,0,.5,-2.24);
  for(const x of [-.58,.58]){this.box(.43,.12,.04,new T.MeshStandardMaterial({color:0xb83732,emissive:0x5b0808,emissiveIntensity:.25}),car,x,.82,2.24);this.box(.43,.12,.04,this.mat('#f2efe1',.25),car,x,.82,-2.24)}
  this.box(.45,.16,.04,this.mat('#ebece6'),car,0,.62,2.3);
  for(const x of [-.91,.91])for(const z of [-1.42,1.42]){
   const wheel=new T.Mesh(new T.CylinderGeometry(.33,.33,.23,16),trim);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.35,z);car.add(wheel);
   const hub=new T.Mesh(new T.CylinderGeometry(.2,.2,.24,8),chrome);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);car.add(hub)}
  for(const x of [-1,1])this.box(.19,.12,.26,body,car,x,1.15,-.65);
  return car;
 }
 resize(){const r=this.host.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);this.renderer.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix()}
 setMode(mode){this.mode=mode;this.host.dataset.view=mode}
 setSample(data){if(!data)return;if(this.current&&this.current.sim_t===data.sim_t&&this.current.provenance===data.provenance)return;this.previous=this.current||data;this.current=data;this.arrived=performance.now()}
 frame(){
  if(!this.current)return;const now=performance.now();if(this.lastRender&&now-this.lastRender<1000/60-1)return;this.lastRender=now;const a=this.previous,b=this.current;const mix=matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(now-this.arrived)/120);
  const lerp=(x,y)=>x+(y-x)*mix,e={};for(const k of ['s','d','yaw','v'])e[k]=lerp(a.ego[k]||0,b.ego[k]||0);
  for(const v of b.vehicles){let car=this.cars.get(v.id);if(!car){car=this.makeCar(v.id==='lead'?0xd7dde0:0x50677c);this.cars.set(v.id,car);this.scene.add(car)}const old=a.vehicles.find(x=>x.id===v.id)||v;
   car.position.set(lerp(old.y,v.y),0,-lerp(old.x,v.x));car.rotation.y=-lerp(old.yaw||0,v.yaw||0);car.scale.set(v.width/1.852,1,v.length/4.515);car.visible=true}
  for(const [id,c]of this.cars)c.visible=b.vehicles.some(v=>v.id===id);
  this.ego.position.set(e.d,0,-e.s);this.ego.rotation.y=-e.yaw;
  const dir=new T.Vector3(Math.sin(e.yaw),0,-Math.cos(e.yaw));
  if(this.mode==='driver'){this.ego.visible=false;this.camera.position.set(e.d-.32,1.25,-e.s+.35);this.camera.lookAt(this.camera.position.clone().add(dir.clone().multiplyScalar(80)).add(new T.Vector3(0,-1,0)))}
  else{this.ego.visible=true;this.camera.position.set(e.d-13,13,-e.s+21);this.camera.lookAt(e.d,0,-e.s-28)}
  this.sun.position.set(e.d-40,65,-e.s+20);this.sun.target.position.set(e.d,0,-e.s-20);
  const r=this.renderer;r.setRenderTarget(null);r.setViewport(0,0,this.w,this.h);r.setScissorTest(false);r.render(this.scene,this.camera);
  if(this.mode==='driver'){
   this.rear.position.set(e.d,1.4,-e.s+.7);this.rear.lookAt(this.rear.position.clone().sub(dir.clone().multiplyScalar(80)));
   r.setRenderTarget(this.rearTexture);r.render(this.scene,this.rear);r.setRenderTarget(null);
   const mr=this.mirrorHost.getBoundingClientRect(),hr=this.host.getBoundingClientRect();const x=mr.left-hr.left,y=this.h-(mr.bottom-hr.top);
   r.setViewport(x,y,mr.width,mr.height);r.setScissor(x,y,mr.width,mr.height);r.setScissorTest(true);r.clearDepth();r.render(this.mirrorScene,this.mirrorCam);r.setScissorTest(false)}
  this.frames++;if(now-this.since>1000){this.fps=this.frames*1000/(now-this.since);this.frames=0;this.since=now}
 }
}
