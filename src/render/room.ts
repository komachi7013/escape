import * as THREE from 'three';
import type { Progress, Target } from '../simulation/state';
import { destinations, route, type Point } from '../simulation/navigation';
import {AdditionalRoom,extraLabels} from './additionalRooms';
import type {Stage} from '../simulation/state';

export const targetNames: Record<Target,string> = { painting:'壁の絵', memo:'机のメモ', desk:'数字錠の引き出し', shelf:'本棚', flag:'壁の旗', chest:'紋章の宝箱', door:'出口の扉', bed:'ベッド', crates:'積まれた木箱',rug:'古い敷物',plants:'薬草の鉢',mirrorStand:'鏡台',cache:'葉の隠し戸',window:'光の差す窓',globe:'地球儀',starChart:'星図',cipherDesk:'暗号机',telescope:'望遠鏡',lexicon:'星の符号表' };
const labels: Partial<Record<Target,THREE.Vector3>> = {
  painting:new THREE.Vector3(-2.65,2.7,-2.78), memo:new THREE.Vector3(-2.6,1.45,1.18), desk:new THREE.Vector3(-2.6,.85,2.1),
  shelf:new THREE.Vector3(3,2.6,-1.95), flag:new THREE.Vector3(1.5,2.6,-2.8), chest:new THREE.Vector3(2.85,1.15,1.7),
  door:new THREE.Vector3(0,1.65,-2.79), bed:new THREE.Vector3(-2.85,.95,-.3),
};
const mat = (color:THREE.ColorRepresentation, roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export class Room {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera=new THREE.PerspectiveCamera(38,1,.1,100);
  player = new THREE.Group(); private body = new THREE.Group(); private legs: THREE.Group[]=[];
  private doorPivot=new THREE.Group(); private chestLid=new THREE.Group(); private drawer=new THREE.Group();
  private selectRing: THREE.Mesh; private particles: THREE.Points;
  private focus=new THREE.Vector3(0,.8,0); private desiredFocus=this.focus.clone(); zoom=1;
  private cameraIntro=0; private introActive=false; private moving?: {points:Point[]; index:number; target:Target; done:(t:Target)=>void; speed:number};
  private phase='title'; private doorsOpen=false; private state?:Progress; private escapedAt=0;
  private last=performance.now(); private elapsed=0; private running=true;
  private onReady?:()=>void; private frameId=0;
  private light1:THREE.PointLight; private light2:THREE.PointLight;
  private markers: HTMLButtonElement[]=[];
  private environment=new THREE.Group();private shownStage:Stage=1;private activeLabels=labels;private extraRooms=new Map<2|3,AdditionalRoom>();
  constructor(readonly canvas:HTMLCanvasElement, readonly markerLayer:HTMLElement, readonly choose:(t:Target)=>void, readonly fail:(message:string)=>void) {
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.35;
    this.scene.background=new THREE.Color('#162421'); this.scene.fog=new THREE.Fog('#162421',22,48);
    this.scene.add(new THREE.HemisphereLight('#f4dfb0','#4a5b54',2.15));
    const sun=new THREE.DirectionalLight('#ffe3ac',3.3); sun.position.set(-3,8,5); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7}); sun.shadow.bias=-.001;
    this.scene.add(sun); const cool=new THREE.DirectionalLight('#badbd7',1.5); cool.position.set(5,5,-2);this.scene.add(cool);
    this.scene.add(this.environment);this.buildRoom(); this.buildAdventurer();
    this.light1=this.lantern(-3.6,2.1,-2.6);this.light2=this.lantern(.95,2.6,-2.6);
    this.selectRing=new THREE.Mesh(new THREE.RingGeometry(.28,.32,48),new THREE.MeshBasicMaterial({color:'#efd49a',transparent:true,opacity:.65,side:THREE.DoubleSide}));
    this.selectRing.rotation.x=-Math.PI/2;this.selectRing.position.y=.035;this.scene.add(this.selectRing);this.selectRing.visible=false;
    const points=new Float32Array(55*3); for(let i=0;i<55;i++){points[i*3]=Math.sin(i*89)*3.7;points[i*3+1]=.3+(i%23)/8;points[i*3+2]=Math.cos(i*17)*2.8;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(points,3));
    this.particles=new THREE.Points(pg,new THREE.PointsMaterial({color:'#f8d08a',size:.025,transparent:true,opacity:.4}));this.scene.add(this.particles);
    this.setMarkers();
    window.addEventListener('resize',()=>this.resize());this.resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.running=false;cancelAnimationFrame(this.frameId);fail('3D描画が一時停止しました。進行は自動保存されています。ページを再読み込みしてください。');});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
    canvas.addEventListener('pointermove',e=>this.hover(e));canvas.addEventListener('click',e=>this.pick(e));
    this.tick();
  }
  private box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material, bevel=false){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(bevel){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#241a13',transparent:true,opacity:.2}));mesh.add(edges);}return mesh;
  }
  private cylinder(parent:THREE.Object3D,r:number,rt:number,h:number,x:number,y:number,z:number,m:THREE.Material,n=12){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,rt,h,n),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  private sphere(parent:THREE.Object3D,r:number,x:number,y:number,z:number,m:THREE.Material){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
  private buildRoom(){
    const wood=mat('#65442c'), dark=mat('#34271f'), trim=mat('#422f22'), gold=mat('#bd9654',.42,.6), stone=mat('#b7ac8d'), cream=mat('#e7d9b4'), teal=mat('#326266');
    this.box(this.environment,8.5,.45,6.5,0,-.23,0,trim);
    for(let row=0;row<13;row++) for(let col=0;col<6;col++){
      const hue=(row*7+col*3)%6;this.box(this.environment,1.35,.07,.47,-3.38+col*1.35,.035,-2.9+row*.48,mat(['#8c6945','#98714d','#a17b52','#8d6847','#ac8054','#96704d'][hue]));
      if((row+col)%2===0)for(const x of [-.57,.57])this.cylinder(this.environment,.016,.016,.004,-3.38+col*1.35+x,.075,-2.9+row*.48,dark,6);
    }
    this.box(this.environment,8.4,3.9,.22,0,1.95,-3.15,stone);this.box(this.environment,.22,3.9,6.2,-4.15,1.95,0,stone);
    // Timber frame, plaster infill and stone base give the room a warm old-inn silhouette.
    for(const x of [-4,-2,2,4])this.box(this.environment,.18,3.95,.28,x,1.96,-3,trim);
    for(const y of [.22,1.03,3.75])this.box(this.environment,8.2,.18,.26,0,y,-2.99,trim);
    for(const z of [-2.9,0,2.9])this.box(this.environment,.27,3.9,.18,-4,1.95,z,trim);
    for(const y of [.2,1,3.75])this.box(this.environment,.26,.15,6.1,-4,y,0,trim);
    for(let i=0;i<11;i++)this.box(this.environment,.72,.34,.07,-3.65+i*.73,.6,-2.98,mat(i%2?'#827d68':'#948c76'),true);
    // Front edges are cut away; no wall obscures the playfield.
    this.box(this.environment,8.4,.11,.12,0,.09,3.1,gold);this.box(this.environment,.12,.11,6.2,4.16,.09,0,gold);
    const rug=mat('#3a6360');this.box(this.environment,2.5,.022,3.7,.05,.09,.3,rug);
    for(const x of [-1.15,1.25])this.box(this.environment,.055,.008,3.48,x,.106,.3,gold);
    for(const z of [-1.37,1.97])this.box(this.environment,2.4,.008,.055,.05,.106,z,gold);
    for(let i=0;i<7;i++){const tile=this.box(this.environment,.25,.007,.25,.05,.108,-1.05+i*.45,mat('#a59a6e'));tile.rotation.y=Math.PI/4;}
    // Door, hinge, planks and wrought iron straps.
    this.box(this.environment,1.75,2.8,.18,0,1.4,-2.94,dark);
    for(const x of [-.9,.9])this.box(this.environment,.18,2.9,.35,x,1.45,-2.85,gold);
    this.box(this.environment,1.98,.18,.35,0,2.89,-2.85,gold);
    this.doorPivot.position.set(-.78,0,-2.72);this.environment.add(this.doorPivot);
    for(let i=0;i<6;i++)this.box(this.doorPivot,.25,2.63,.14,.13+i*.26,1.33,0,mat(i%2?'#67482d':'#725134'));
    for(const y of [.52,2.08])this.box(this.doorPivot,1.56,.13,.055,.78,y,.095,dark);
    this.box(this.doorPivot,.13,.24,.08,1.29,1.1,.13,gold);this.sphere(this.doorPivot,.065,1.29,1.12,.21,gold);
    const knob=new THREE.Mesh(new THREE.TorusGeometry(.09,.022,8,16),gold);knob.position.set(1.29,.98,.19);this.doorPivot.add(knob);
    // Bed on the left: timber posts, pillow and woven teal blanket.
    this.box(this.environment,1.58,.35,2.1,-2.95,.39,-.65,wood);
    this.box(this.environment,1.48,.24,1.98,-2.95,.66,-.65,cream);
    this.box(this.environment,1.5,.075,1.5,-2.95,.815,-.4,teal);
    this.box(this.environment,1.05,.18,.42,-2.95,.89,-1.42,cream);
    for(const x of [-3.66,-2.24])for(const z of [-1.6,.34]){this.cylinder(this.environment,.09,.09,1,x,.51,z,wood);this.sphere(this.environment,.115,x,1.04,z,gold);}
    this.box(this.environment,1.5,.48,.13,-2.95,1.05,-1.62,wood);
    for(let i=0;i<6;i++)this.box(this.environment,.035,.01,1.45,-3.55+i*.24,.861,-.4,mat('#598281'));
    // Writing desk with physically animated drawer.
    this.box(this.environment,1.75,.13,1.05,-2.85,1.17,1.63,wood);
    for(const x of [-3.57,-2.14])for(const z of [1.23,2.04])this.box(this.environment,.13,1.1,.13,x,.58,z,trim);
    this.box(this.environment,1.52,.46,.86,-2.85,.87,1.59,wood);
    this.drawer.position.set(-2.85,.94,2.04);this.environment.add(this.drawer);
    this.box(this.drawer,1.45,.29,.07,0,0,0,trim);this.box(this.drawer,.65,.15,.05,0,0,.06,gold);
    for(let i=0;i<3;i++)this.box(this.drawer,.16,.1,.05,-.2+i*.2,0,.1,dark);
    this.box(this.environment,.52,.015,.34,-2.57,1.25,1.42,cream);
    this.cylinder(this.environment,.1,.12,.16,-3.4,1.31,1.38,dark);
    const feather=this.box(this.environment,.04,.48,.015,-3.39,1.59,1.4,cream);feather.rotation.z=-.4;
    this.cylinder(this.environment,.09,.1,.07,-3.36,1.25,1.91,gold);this.cylinder(this.environment,.025,.025,.28,-3.36,1.42,1.91,cream);
    this.sphere(this.environment,.045,-3.36,1.59,1.91,mat('#ffda82'));
    // Bookshelf on the right, colorful books with exact symbol canvas labels.
    this.box(this.environment,1.65,2.9,.16,3.07,1.5,-2.7,trim);
    for(const x of [2.2,3.94])this.box(this.environment,.16,2.95,.68,x,1.5,-2.42,wood);
    for(const y of [.15,1.05,1.9,2.97])this.box(this.environment,1.88,.12,.72,3.07,y,-2.4,wood);
    const colors=['#627347','#3c7476','#a55d43','#9a8050','#65768b'];
    for(let r=0;r<3;r++)for(let i=0;i<7;i++){
      const x=2.4+i*.22, h=.52+((i*3+r)%4)*.05;
      this.box(this.environment,.16,h,.35,x,[.53,1.46,2.38][r],-2.31,mat(colors[i%5]));
      for(const y of [-h*.32,h*.32])this.box(this.environment,.16,.02,.018,x,[.53,1.46,2.38][r]+y,-2.126,gold);
      if(r===1&&i<5){const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle=colors[i];ctx.fillRect(0,0,128,256);ctx.fillStyle='#efd7a1';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='68px serif';ctx.fillText(['❧','≈','♨','△','❄'][i],64,106);ctx.font='28px serif';ctx.fillText(['葉','波','炎','山','雪'][i],64,181);
        const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const spine=new THREE.Mesh(new THREE.PlaneGeometry(.15,.38),new THREE.MeshStandardMaterial({map:texture,roughness:1}));spine.position.set(x,1.46,-2.118);this.environment.add(spine);}
    }
    // Chest, curved hinged lid and brass binding.
    const chest=new THREE.Group();chest.position.set(2.98,0,1.5);this.environment.add(chest);
    this.box(chest,1.5,.65,.92,0,.42,0,wood);this.chestLid.position.set(0,.76,-.46);chest.add(this.chestLid);
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(.47,.47,1.5,16,1,false,0,Math.PI),wood);lid.rotation.z=Math.PI/2;lid.rotation.x=Math.PI/2;lid.position.set(0,0,.46);lid.castShadow=true;this.chestLid.add(lid);
    this.box(this.chestLid,1.5,.12,.92,0,0,.46,wood);
    for(const x of [-.59,.59]){this.box(chest,.1,.65,.94,x,.44,0,gold);this.box(this.chestLid,.11,.11,.98,x,.06,.46,gold);}
    this.cylinder(chest,.16,.16,.06,0,.57,.5,gold,10).rotation.x=Math.PI/2;
    this.box(chest,.11,.13,.07,0,.54,.57,dark);
    // Framed exact clues: pictorial elements remain deterministic and readable.
    this.wallArt(-2.65,2.38,1.38,1.07,'painting');this.wallArt(1.46,2.36,.72,1.45,'flag');
    // Moonlit window on the left wall.
    this.box(this.environment,.035,1.2,1.16,-3.99,2.42,.46,mat('#355e64',.4));
    for(const z of [-.18,1.1])this.box(this.environment,.14,1.45,.1,-3.9,2.4,z,trim);
    for(const y of [1.72,2.43,3.12])this.box(this.environment,.14,.1,1.32,-3.9,y,.46,trim);
    this.box(this.environment,.32,.1,1.43,-3.88,1.67,.46,wood);
    // Small barrel, pot plant, rolled scrolls and wood beams.
    this.cylinder(this.environment,.33,.28,.75,3.6,.44,-.65,wood);
    for(const y of [.16,.66])this.cylinder(this.environment,.34,.34,.065,3.6,y,-.65,dark);
    this.cylinder(this.environment,.15,.11,.22,3.63,.93,-.65,mat('#ab7753'));
    for(let i=0;i<5;i++){const leaf=this.sphere(this.environment,.12,3.63+Math.sin(i*2)*.16,1.16+Math.cos(i*2)*.12,-.65+Math.cos(i*2)*.16,mat('#557453'));leaf.scale.set(.5,1.8,.6);leaf.rotation.z=i*.8;}
  }
  private wallArt(x:number,y:number,w:number,h:number,type:'painting'|'flag'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=type==='painting'?400:800; const c=canvas.getContext('2d')!;
    c.fillStyle=type==='painting'?'#e0cf9b':'#305955';c.fillRect(0,0,canvas.width,canvas.height);
    c.strokeStyle='#bb9753';c.lineWidth=12;c.strokeRect(16,16,canvas.width-32,canvas.height-32);
    const symbols=type==='painting'?['☀','☀','☾','☾','☾','☾','★','★','★']:['☾','♛','☀','★'];
    c.fillStyle=type==='painting'?'#674a25':'#e6ce91';c.textAlign='center';c.textBaseline='middle';
    c.font=type==='painting'?'72px serif':'112px serif';
    if(type==='painting')symbols.forEach((s,i)=>{const positions=[[170,85],[335,85],[96,193],[202,193],[309,193],[416,193],[140,306],[260,306],[380,306]];c.fillText(s,...positions[i] as [number,number]);});
    else {symbols.forEach((s,i)=>c.fillText(s,250,117+i*174));c.font='55px serif';c.fillText('↓',432,396);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    this.box(this.environment,w+.14,h+.14,.15,x,y,-2.92,mat('#624326'));
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:1}));face.position.set(x,y,-2.83);this.environment.add(face);
  }
  private lantern(x:number,y:number,z:number){
    const gold=mat('#9a7138',.5,.5), glow=new THREE.MeshBasicMaterial({color:'#ffcf78'});
    this.box(this.scene,.24,.37,.2,x,y,z,gold);this.box(this.scene,.15,.25,.21,x,y,z+.01,glow);
    for(const dx of [-.105,.105])this.box(this.scene,.035,.35,.035,x+dx,y,z+.12,gold);
    const light=new THREE.PointLight('#ffc478',5,6,2);light.position.set(x,y,z+.3);this.scene.add(light);return light;
  }
  private buildAdventurer(){
    this.scene.add(this.player);this.player.add(this.body);this.player.position.set(0,.1,-1.4);this.player.rotation.y=Math.PI;
    const boot=mat('#312c24'), cloth=mat('#66746d'), skin=mat('#e0b483'), cape=mat('#8f4837'),hair=mat('#433026'),gold=mat('#cda362');
    for(const x of [-.115,.115]){const leg=new THREE.Group();leg.position.set(x,.35,0);this.body.add(leg);this.box(leg,.16,.25,.16,0,-.12,0,cloth);this.box(leg,.18,.14,.25,0,-.28,.025,boot);this.legs.push(leg);}
    this.cylinder(this.body,.24,.19,.44,0,.55,0,cloth);
    this.box(this.body,.43,.065,.34,0,.46,0,boot);this.sphere(this.body,.23,0,.98,0,skin);
    this.sphere(this.body,.235,0,1.06,-.02,hair).scale.set(1,.75,1);
    this.box(this.body,.28,.15,.17,0,1.08,.08,hair);
    for(const x of [-.28,.28]){this.cylinder(this.body,.075,.07,.33,x,.55,0,cloth);this.sphere(this.body,.068,x,.36,.035,skin);}
    const mantle=new THREE.Mesh(new THREE.ConeGeometry(.33,.53,8,1,true),cape);mantle.position.set(0,.59,-.11);mantle.rotation.x=-.18;mantle.castShadow=true;this.body.add(mantle);
    this.cylinder(this.body,.26,.29,.12,0,.78,0,cape);this.sphere(this.body,.042,.15,.8,.21,gold);
    this.box(this.body,.19,.25,.12,.22,.45,-.1,mat('#9d7948'));
  }
  private resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  start(done:()=>void, resume=false){this.phase='intro';this.introActive=true;this.cameraIntro=0;this.onReady=done;this.player.position.set(0,.1,resume?.7:-1.4);this.player.visible=true;this.player.rotation.y=Math.PI;this.zoom=1;this.desiredFocus.set(0,.8,0);this.focus.copy(this.desiredFocus);this.doorsOpen=false;this.escapedAt=0;}
  setTitle(){this.showStage(1);this.phase='title';this.moving=undefined;this.player.position.set(0,.1,-1.4);this.player.rotation.y=Math.PI;this.player.visible=true;this.doorsOpen=false;}
  private setMarkers(){this.markerLayer.innerHTML='';this.markers=[];for(const target of Object.keys(this.activeLabels) as Target[]){const b=document.createElement('button');b.className='hotspot';b.dataset.target=target;b.setAttribute('aria-label',targetNames[target]);b.innerHTML=`<span class="hotspot-dot"></span><span class="hotspot-label">${targetNames[target]}</span>`;b.onclick=()=>this.choose(target);this.markerLayer.append(b);this.markers.push(b);}}
  private showStage(stage:Stage){this.shownStage=stage;this.environment.visible=stage===1;for(const view of this.extraRooms.values())view.root.visible=view.stage===stage;if(stage!==1){let view=this.extraRooms.get(stage);if(!view){view=new AdditionalRoom(stage);this.extraRooms.set(stage,view);this.scene.add(view.root);}view.root.visible=true;}this.activeLabels=stage===1?labels:extraLabels[stage];this.setMarkers();this.resetCamera();}
  setState(s:Progress){this.state=s;if(this.shownStage!==s.stage)this.showStage(s.stage);}
  setZoom(delta:number){if(this.phase!=='play')return;this.zoom=THREE.MathUtils.clamp(this.zoom+delta,1,2);if(this.zoom===1)this.desiredFocus.set(0,.8,0);}
  resetCamera(){this.zoom=1;this.desiredFocus.set(0,.8,0);}
  focusTarget(t:Target){if(this.zoom>1){this.desiredFocus.copy(this.activeLabels[t]!);this.desiredFocus.y=.8;this.desiredFocus.x*=.75;this.desiredFocus.z*=.65;}}
  walk(t:Target,done:(t:Target)=>void){const dest=destinations[t];const pts=route(this.player.position,dest);let prev:Point=this.player.position;let distance=0;for(const p of pts){distance+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;}
    this.moving={points:pts,index:0,target:t,done,speed:Math.max(2.7,distance/1.65)};this.selectRing.visible=true;this.selectRing.position.set(dest.x,.11,dest.z);this.focusTarget(t);}
  cancelWalk(){this.moving=undefined;this.selectRing.visible=false;}
  escape(done:()=>void){this.phase='escape';this.doorsOpen=true;this.escapedAt=0;this.onReady=done;}
  private getPick(e:PointerEvent|MouseEvent){if(this.phase!=='play')return;const mouse=new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,this.camera);
    let best:Target|undefined,dist=.45;for(const t of Object.keys(this.activeLabels) as Target[]){const d=ray.ray.distanceToPoint(this.activeLabels[t]!);if(d<dist){best=t;dist=d;}}return best;}
  private hover(e:PointerEvent){this.canvas.style.cursor=this.getPick(e)?'pointer':'default';}
  private pick(e:MouseEvent){const t=this.getPick(e);if(t)this.choose(t);}
  private tick=()=>{
    if(!this.running)return;this.frameId=requestAnimationFrame(this.tick);const now=performance.now(),dt=Math.min((now-this.last)/1000,.05);this.last=now;this.elapsed+=dt;
    const startPos=new THREE.Vector3(0,2.4,4.6),startLook=new THREE.Vector3(0,1.2,-2.2);
    const baseDistance=innerWidth/innerHeight<1.5?1.15:1;
    const offset=new THREE.Vector3(9,9.6,13).multiplyScalar(baseDistance/this.zoom);
    this.focus.lerp(this.desiredFocus,1-Math.exp(-dt*5));
    if(this.phase==='title'){this.camera.position.copy(startPos);this.camera.lookAt(startLook);}
    else if(this.introActive){this.cameraIntro+=dt;const t=THREE.MathUtils.smoothstep(this.cameraIntro,0,matchMedia('(prefers-reduced-motion: reduce)').matches?.2:2.4);
      this.camera.position.lerpVectors(startPos,this.focus.clone().add(offset),t);this.camera.lookAt(startLook.clone().lerp(this.focus,t));
      if(t>=1){this.introActive=false;this.phase='play';this.onReady?.();this.onReady=undefined;}}
    else {this.camera.position.copy(this.focus).add(offset);this.camera.lookAt(this.focus);}
    if(this.moving && this.phase==='play'){
      const m=this.moving,p=m.points[m.index],dx=p.x-this.player.position.x,dz=p.z-this.player.position.z,len=Math.hypot(dx,dz),step=m.speed*dt;
      if(len<=step){this.player.position.x=p.x;this.player.position.z=p.z;m.index++;
        if(m.index>=m.points.length){this.moving=undefined;this.selectRing.visible=false;const face=this.activeLabels[m.target]!;this.player.rotation.y=Math.atan2(face.x-this.player.position.x,face.z-this.player.position.z);m.done(m.target);}}
      else {this.player.position.x+=dx/len*step;this.player.position.z+=dz/len*step;this.player.rotation.y=Math.atan2(dx,dz);}
    }
    if(this.phase==='escape'){this.escapedAt+=dt;this.player.rotation.y=Math.PI;this.player.position.z-=dt*1.4;if(this.escapedAt>1.6){this.player.visible=false;this.phase='result';this.onReady?.();this.onReady=undefined;}}
    const walk=!!this.moving||this.phase==='escape';this.body.position.y=walk?Math.abs(Math.sin(this.elapsed*15))*.045:Math.sin(this.elapsed*2)*.018;
    this.legs.forEach((leg,i)=>leg.rotation.x=walk?Math.sin(this.elapsed*15+i*Math.PI)*.55:0);
    this.doorPivot.rotation.y=THREE.MathUtils.damp(this.doorPivot.rotation.y,this.doorsOpen?-1.35:0,4,dt);
    this.chestLid.rotation.x=THREE.MathUtils.damp(this.chestLid.rotation.x,this.state?.chest?-1.05:0,4,dt);
    this.drawer.position.z=THREE.MathUtils.damp(this.drawer.position.z,this.state?.drawer?2.28:2.04,4,dt);
    if(this.shownStage!==1&&this.state)this.extraRooms.get(this.shownStage)?.update(this.state,dt,this.elapsed,this.doorsOpen);
    this.particles.rotation.y=Math.sin(this.elapsed*.1)*.1;this.light1.intensity=5+Math.sin(this.elapsed*3)*.17;this.light2.intensity=5+Math.sin(this.elapsed*2.8)*.17;
    this.camera.updateMatrixWorld();for(const b of this.markers){const point=this.activeLabels[b.dataset.target as Target]!.clone().project(this.camera);b.style.left=`${(point.x+1)*innerWidth/2}px`;b.style.top=`${(1-point.y)*innerHeight/2}px`;b.hidden=this.phase!=='play'||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;}
    this.renderer.render(this.scene,this.camera);
  };
}
