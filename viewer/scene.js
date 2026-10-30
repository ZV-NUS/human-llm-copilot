import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {DrivingView as OriginalView} from './base_view.js';

// All positions, headings, dimensions, camera and interpolation stay in OriginalView.
// This subclass replaces only display meshes, lighting and materials.
export class DrivingView extends OriginalView {
 constructor(host,mirror,onError){
  super(host,mirror,onError);this.ready=this.loadAssets();
 }
 buildRoad(){this.world=new T.Group();this.world.name='display_only_environment';this.scene.add(this.world)}
 makeCar(color){const group=new T.Group();group.userData.paint=color;this.pendingCars??=[];this.pendingCars.push(group);if(this.carAsset)this.populateCar(group);return group}
 frame(){if(!this.assetsLoaded)return;super.frame()}
 async loadAssets(){
  const loader=new T.TextureLoader(),gltf=new GLTFLoader();
  const names=['asphalt_02_diff','asphalt_02_nor_gl','asphalt_02_rough','grass_path_2_diff','grass_path_2_nor_gl','grass_path_2_rough'];
  const loaded=await Promise.all([new HDRLoader().loadAsync('viewer/media/daylight.hdr'),gltf.loadAsync('viewer/media/sedan_vehicle.gltf'),gltf.loadAsync('viewer/media/sedan_right_tire_front.gltf'),...names.map(n=>loader.loadAsync('viewer/media/'+n+'.jpg'))]);
  const [sky,body,tire,...textures]=loaded;sky.mapping=T.EquirectangularReflectionMapping;
  this.scene.background=sky;this.scene.environment=sky;this.scene.backgroundIntensity=.85;this.scene.environmentIntensity=.75;
  this.scene.backgroundRotation.y=.7;this.scene.environmentRotation.y=.7;this.scene.fog=new T.Fog('#c8d1d2',220,650);
  this.scene.children.filter(x=>x.isHemisphereLight).forEach(x=>x.intensity=.5);
  this.sun.intensity=1.65;this.sun.color.set('#fff5e5');this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.normalBias=.012;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
  this.textures=Object.fromEntries(names.map((name,i)=>{const x=textures[i];x.wrapS=x.wrapT=T.RepeatWrapping;x.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());if(name.endsWith('diff'))x.colorSpace=T.SRGBColorSpace;return [name,x]}));
  this.carAsset=body.scene;this.tireAsset=tire.scene;
  this.pendingCars.forEach(g=>this.populateCar(g));this.buildDetailedRoad();this.buildVegetation();this.buildRoadside();
  await this.renderer.compileAsync(this.scene,this.camera);this.assetsLoaded=true;
 }
 populateCar(group){
  const body=this.carAsset.clone(true);body.traverse(o=>{if(o.name==='color')o.visible=false;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
    o.material=o.material.clone();if(o.material.name.startsWith('body.'))o.material=new T.MeshPhysicalMaterial({color:group.userData.paint,metalness:.6,roughness:.28,clearcoat:.7,clearcoatRoughness:.16});
    if(o.material.name.startsWith('interior'))o.material.roughness=.8;
  }});
  const size=new T.Box3().setFromObject(body).getSize(new T.Vector3()),box=new T.Box3().setFromObject(body);
  const wrap=new T.Group();body.position.z-= (box.min.z+box.max.z)/2;wrap.add(body);
  for(const side of [-1,1])for(const z of [-1.39,1.43]){const tire=this.tireAsset.clone(true);tire.position.set(side*.81,.33,z);if(side<0)tire.rotation.y=Math.PI;
    tire.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material=o.material.clone();o.material.roughness=Math.max(.35,o.material.roughness)}});wrap.add(tire)}
  // Normalize to the same renderer unit envelope. OriginalView applies native width/length.
  wrap.scale.set(1.852/size.x,1,4.515/size.z);group.add(wrap);
 }
 surface(width,length,material,x,y,z){const p=new T.Mesh(new T.PlaneGeometry(width,length),material);p.rotation.x=-Math.PI/2;p.position.set(x,y,z);p.receiveShadow=true;this.world.add(p);return p}
 buildDetailedRoad(){
  for(const key of ['diff','nor_gl','rough'])this.textures['asphalt_02_'+key].repeat.set(10.8/3,1800/3);
  const roadMat=new T.MeshStandardMaterial({map:this.textures.asphalt_02_diff,normalMap:this.textures.asphalt_02_nor_gl,roughnessMap:this.textures.asphalt_02_rough,normalScale:new T.Vector2(.24,.24),roughness:.98,metalness:0});
  this.surface(10.8,1800,roadMat,0,.002,-450);
  for(const key of ['diff','nor_gl','rough'])this.textures['grass_path_2_'+key].repeat.set(90,1800/2);
  const grass=new T.MeshStandardMaterial({map:this.textures.grass_path_2_diff,normalMap:this.textures.grass_path_2_nor_gl,roughnessMap:this.textures.grass_path_2_rough,normalScale:new T.Vector2(.4,.4),roughness:1,color:'#a2b38a'});
  grass.onBeforeCompile=shader=>{
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    vec2 terrainHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
    vec4 terrainMap(sampler2D tex,vec2 uv){vec2 tile=floor(uv*.28),f=smoothstep(0.,1.,fract(uv*.28));
     return mix(mix(texture2D(tex,uv+terrainHash(tile)*17.),texture2D(tex,uv+terrainHash(tile+vec2(1.,0.))*17.),f.x),
      mix(texture2D(tex,uv+terrainHash(tile+vec2(0.,1.))*17.),texture2D(tex,uv+terrainHash(tile+vec2(1.,1.))*17.),f.x),f.y);}`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
     vec4 terrainColor=terrainMap(map,vMapUv);diffuseColor*=terrainColor;
    #endif`);
  };grass.customProgramCacheKey=()=> 'terrain-stochastic-color-v1';
  for(const side of [-1,1])this.surface(180,1800,grass,side*96,-.025,-450);
  this.surface(1800,2000,this.mat('#89957c'),0,-.12,-450);
  const shoulder=this.mat('#9d9f96',.98);const paint=this.mat('#dddcd0',.92);paint.map=this.textures.asphalt_02_rough.clone();paint.map.repeat.set(1,12);paint.map.needsUpdate=true;
  for(const side of [-1,1]){
   this.surface(.8,1800,shoulder,side*5.8,0,-450);this.surface(.12,1800,paint,side*5.25,.012,-450);
   this.box(.16,.11,1800,this.mat('#aeb0a6',.92),this.world,side*6.15,.03,-450);
  }
  const dashes=[];for(let z=-1300;z<400;z+=9)for(const x of [-1.8,1.8])dashes.push([x,.014,z]);this.instances(new T.BoxGeometry(.13,.012,3.4),paint,dashes);
  const steel=this.mat('#a0a7a6',.38,.7);const posts=[];for(let z=-1300;z<400;z+=4)for(const side of [-1,1])posts.push([side*6.4,.44,z]);this.instances(new T.BoxGeometry(.09,.85,.13),steel,posts);
  const profile=[[-.055,-.16],[.025,-.11],[-.025,-.055],[.04,0],[-.025,.055],[.025,.11],[-.055,.16]];
  for(const side of [-1,1]){const pos=[],idx=[];profile.forEach(([x,y])=>{pos.push(side*(6.4+x),.76+y,-1300,side*(6.4+x),.76+y,400)});for(let i=0;i<profile.length-1;i++){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();const rail=new T.Mesh(geo,steel.clone());rail.material.side=T.DoubleSide;this.world.add(rail)}
  const reflectors=[];for(let z=-1250;z<400;z+=24)for(const side of [-1,1])reflectors.push([side*6.32,.82,z]);this.instances(new T.BoxGeometry(.04,.07,.18),this.mat('#e4e0c3',.45),reflectors);
 }
 buildVegetation(){
  let seed=163;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.clearRect(0,0,256,256);
  for(let i=0;i<340;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*108,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r*.85;c.save();c.translate(x,y);c.rotate(rand()*Math.PI);const g=52+rand()*42;c.fillStyle=`rgb(${Math.round(g*.68)},${Math.round(g)},${Math.round(g*.44)})`;c.beginPath();c.ellipse(0,0,4+rand()*3,9+rand()*5,0,0,Math.PI*2);c.fill();c.restore()}
  const atlas=new T.CanvasTexture(canvas);atlas.colorSpace=T.SRGBColorSpace;
  const leafMat=new T.MeshStandardMaterial({map:atlas,alphaTest:.45,side:T.DoubleSide,roughness:1,color:'#f1eee0'});
  const leaves=[],branches=[],trunks=[];
  const branch=(from,to,width)=>{const a=new T.Vector3(...from),b=new T.Vector3(...to),o=new T.Object3D();o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());o.scale.set(width,a.distanceTo(new T.Vector3(...to)),width);o.updateMatrix();branches.push(o.matrix.clone())};
  // Irregular broadleaf canopy. All vegetation stays outside the 10.8m roadway.
  for(let i=0;i<92;i++){
   const side=i%2?1:-1,x=side*(13+rand()*20),z=-1150+i*16+rand()*7,h=3.2+rand()*2.3,spread=2.5+rand()*1.5;
   trunks.push([x,h/2,z,.7+rand()*.4,h, .7+rand()*.4]);
   for(let j=0;j<14;j++){const a=rand()*Math.PI*2,rr=spread*(.35+rand()*.65),bx=x+Math.cos(a)*rr,bz=z+Math.sin(a)*rr,by=h+.7+rand()*1.8;branch([x,h*.65,z],[bx,by,bz],.07+rand()*.06);
    for(let k=0;k<12;k++){const o=new T.Object3D();o.position.set(bx+(rand()-.5)*2.2,by+(rand()-.5)*1.7,bz+(rand()-.5)*2.2);o.rotation.set(rand()*Math.PI,rand()*Math.PI,rand()*Math.PI);const f=1.15+rand()*.65;o.scale.set(f,f,1);o.updateMatrix();leaves.push(o.matrix.clone())}}
  }
  this.instances(new T.CylinderGeometry(.15,.24,1,9),this.mat('#746d5c',1),trunks);
  const bm=new T.InstancedMesh(new T.CylinderGeometry(.7,1,1,6),this.mat('#736a54',1),branches.length);branches.forEach((m,i)=>bm.setMatrixAt(i,m));this.world.add(bm);
  const lm=new T.InstancedMesh(new T.PlaneGeometry(1.7,1.7),leafMat,leaves.length);leaves.forEach((m,i)=>lm.setMatrixAt(i,m));this.world.add(lm);
  // Ground-cover cards break up the verge without touching the travel lanes.
  const shrubs=[];for(let i=0;i<150;i++){let side=i%2?1:-1,x=side*(9+rand()*3.5),z=-1150+i*10;for(let j=0;j<13;j++){const o=new T.Object3D();o.position.set(x+(rand()-.5)*1.4,.25+rand()*.65,z+(rand()-.5)*1.7);o.rotation.set(rand()*1.5,rand()*6.28,rand()*2);o.scale.set(.45+rand()*.4,.45+rand()*.4,1);o.updateMatrix();shrubs.push(o.matrix.clone())}}
  const sh=new T.InstancedMesh(new T.PlaneGeometry(1.7,1.7),leafMat,shrubs.length);shrubs.forEach((m,i)=>sh.setMatrixAt(i,m));this.world.add(sh);
 }
 buildRoadside(){
  const grey=this.mat('#9da6a3',.45,.6);const poles=[];for(let z=-1200;z<400;z+=75)for(const side of [-1,1])poles.push([side*8.3,5.5,z]);this.instances(new T.CylinderGeometry(.07,.14,11,8),grey,poles);
  for(let z=-1200;z<400;z+=75)for(const side of [-1,1]){this.box(2.4,.08,.08,grey,this.world,side*7.1,10.95,z);this.box(.7,.11,.28,this.mat('#515b5b',.5,.4),this.world,side*6.05,10.9,z)}
 }
}
