import * as T from 'three';
import {plantsSolved,type Progress,type Stage,type Target} from '../simulation/state';
const material=(color:T.ColorRepresentation,metalness=0)=>new T.MeshStandardMaterial({color,roughness:.75,metalness});
const wood=material('#69523b'),trim=material('#3d342c'),gold=material('#c4a263',.5),stone=material('#afa992'),green=material('#627a50'),cream=material('#e8dbc1');
function box(p:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function cyl(p:T.Object3D,r:number,h:number,x:number,y:number,z:number,m:T.Material){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,16),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function ball(p:T.Object3D,r:number,x:number,y:number,z:number,m:T.Material){const o=new T.Mesh(new T.SphereGeometry(r,20,12),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;}
function text(p:T.Object3D,content:string,w:number,h:number,x:number,y:number,z:number,bg='#315951'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d')!;c.fillStyle=bg;c.fillRect(0,0,512,384);c.strokeStyle='#c8ab72';c.lineWidth=10;c.strokeRect(15,15,482,354);c.fillStyle='#eed9a9';c.textAlign='center';c.textBaseline='middle';content.split('\n').forEach((line,i,arr)=>{c.font='48px serif';c.fillText(line,256,192+(i-(arr.length-1)/2)*84);});
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:1,side:T.DoubleSide}));o.position.set(x,y,z);p.add(o);return o;
}
function table(p:T.Object3D,x:number,z:number,w=1.7,d=1.1){box(p,w,.14,d,x,1.12,z,wood);for(const dx of [-w/2+.12,w/2-.12])for(const dz of [-d/2+.12,d/2-.12])box(p,.14,1.1,.14,x+dx,.55,z+dz,trim);}
function shell(root:T.Group,stage:Stage){
  box(root,8.5,.4,6.5,0,-.2,0,trim);
  for(let r=0;r<13;r++)for(let c=0;c<6;c++)box(root,1.35,.07,.47,-3.38+c*1.35,.035,-2.9+r*.48,material(stage===2?['#92764e','#9f8258','#8f754b'][(r+c)%3]:['#72675f','#84736c','#796963'][(r+c)%3]));
  const wall=stage===2?stone:material('#778384');box(root,8.4,3.9,.22,0,1.95,-3.15,wall);box(root,.22,3.9,6.2,-4.15,1.95,0,wall);
  for(const x of [-4,-2,2,4])box(root,.18,3.9,.26,x,1.95,-3,trim);for(const y of [.23,3.75])box(root,8.2,.17,.26,0,y,-3,trim);
  for(const z of [-3,0,3])box(root,.24,3.9,.18,-4,1.95,z,trim);for(const y of [.22,3.75])box(root,.26,.16,6,-4,y,0,trim);
  box(root,8.4,.1,.1,0,.09,3.1,gold);box(root,.1,.1,6.2,4.16,.09,0,gold);
  box(root,1.7,2.8,.15,0,1.4,-2.94,trim);for(const x of [-.88,.88])box(root,.16,2.9,.3,x,1.45,-2.84,gold);box(root,1.92,.15,.3,0,2.89,-2.84,gold);
  const door=new T.Group();door.position.set(-.78,0,-2.72);root.add(door);for(let i=0;i<6;i++)box(door,.25,2.65,.13,.13+i*.26,1.33,0,wood);
  for(const y of [.5,2.1])box(door,1.56,.11,.05,.78,y,.1,trim);ball(door,.07,1.3,1.1,.18,gold);
  return door;
}
export const extraLabels:Record<2|3,Partial<Record<Target,T.Vector3>>>={
  2:{crates:new T.Vector3(-2.85,1.1,-.8),rug:new T.Vector3(.05,.18,.6),plants:new T.Vector3(3,1.75,-1.8),mirrorStand:new T.Vector3(-2.8,1.5,1.65),cache:new T.Vector3(3,1.45,1.55),window:new T.Vector3(-2.7,2.7,-2.8),door:new T.Vector3(0,1.65,-2.8)},
  3:{globe:new T.Vector3(-2.8,1.8,1.6),starChart:new T.Vector3(-2.8,2.5,-2.8),cipherDesk:new T.Vector3(2.9,1.4,1.65),telescope:new T.Vector3(2.9,1.9,-1.65),lexicon:new T.Vector3(1.55,2.6,-2.8),door:new T.Vector3(0,1.65,-2.8)},
};
export class AdditionalRoom {
  root=new T.Group();door:T.Group;private crate=new T.Group();private rug=new T.Group();private pots:T.Group[]=[];private mirror=new T.Group();private cover=new T.Group();private ray:T.Line;private cacheDoor=new T.Group();private globe=new T.Group();private chart=new T.Group();private telescope=new T.Group();private sparkle:T.Mesh;
  constructor(readonly stage:2|3){
    this.door=shell(this.root,stage);
    this.ray=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:'#fff5b0',transparent:true,opacity:.85}));this.root.add(this.ray);this.ray.visible=false;
    this.sparkle=ball(this.root,.08,stage===2?-2.85:-2.8,.16,stage===2?-.8:1.6,gold);
    if(stage===2)this.garden();else this.observatory();
  }
  private garden(){
    this.crate.position.set(-2.85,0,-.8);this.root.add(this.crate);
    box(this.crate,1.13,.8,1.12,0,.43,0,wood);for(const z of [-.58,.58])for(const y of [.15,.68])box(this.crate,1.2,.085,.06,0,y,z,trim);
    for(const x of [-.53,.53])box(this.crate,.1,.8,1.17,x,.43,0,trim);text(this.crate,'❧',.4,.35,0,.46,.593,'#6c623f');
    box(this.root,.9,.56,.86,-3.38,.32,-2,wood);box(this.root,.65,.6,.7,-3.48,.89,-2,wood);
    this.rug.position.set(.05,.1,.55);this.root.add(this.rug);box(this.rug,1.65,.025,2.1,0,0,0,material('#6d7f52'));for(const x of [-.7,.7])box(this.rug,.04,.008,1.98,x,.02,0,gold);
    const diagram=text(this.root,'葉→水　花→光\n実→土',1.6,1.2,0,.083,.55,'#81734f');diagram.rotation.x=-Math.PI/2;
    table(this.root,3,-1.75,1.8,1.1);
    for(let i=0;i<3;i++){
      const pot=new T.Group();pot.position.set(2.42+i*.56,1.2,-1.75);this.root.add(pot);cyl(pot,.18,.28,0,.14,0,material('#ac7455'));cyl(pot,.2,.065,0,.29,0,material('#a16b4a'));
      for(let j=0;j<5;j++){const leaf=ball(pot,.12,Math.sin(j*2)*.12,.47+Math.cos(j)*.06,Math.cos(j*2)*.12,green);leaf.scale.set(.5,1.7,.6);leaf.rotation.z=j;}
      if(i===1)for(let j=0;j<5;j++)ball(pot,.06,Math.sin(j*2)*.12,.62,Math.cos(j*2)*.12,material('#efd693'));
      if(i===2)for(let j=0;j<3;j++)ball(pot,.07,Math.sin(j*2)*.1,.55,Math.cos(j*2)*.1,material('#9e5540'));
      this.pots.push(pot);
      cyl(this.root,.23,.03,2.42+i*.56,1.21,-1.75,gold);
    }
    table(this.root,-2.8,1.65,1.6,1.05);cyl(this.root,.28,.12,-2.8,1.25,1.65,gold);cyl(this.root,.045,.45,-2.8,1.54,1.65,gold);
    this.mirror.position.set(-2.8,1.76,1.65);this.root.add(this.mirror);
    this.cover.position.set(-2.8,1.86,1.33);this.root.add(this.cover);box(this.cover,.75,.065,.64,0,0,.32,wood);box(this.cover,.8,.075,.065,0,0,.58,gold);
    const frame=new T.Mesh(new T.TorusGeometry(.25,.032,12,36),gold);this.mirror.add(frame);const glass=new T.Mesh(new T.CircleGeometry(.24,32),material('#b9d5d3',.65));this.mirror.add(glass);glass.position.z=.006;
    box(this.root,1.55,1.62,.86,3,.86,1.55,wood);this.cacheDoor.position.set(2.24,.78,2.01);this.root.add(this.cacheDoor);box(this.cacheDoor,1.5,1.46,.08,.75,0,0,material('#627b58'));text(this.cacheDoor,'❧',.5,.4,.75,0,.05);ball(this.cacheDoor,.06,1.32,-.1,.12,gold);
    box(this.root,1.65,.13,.96,3,1.74,1.55,trim);
    box(this.root,1.3,1.22,.1,-2.75,2.49,-2.89,material('#b9d1ba'));for(const x of [-3.45,-2.75,-2.05])box(this.root,.08,1.38,.2,x,2.49,-2.8,trim);for(const y of [1.8,2.5,3.18])box(this.root,1.5,.08,.2,-2.75,y,-2.8,trim);
    for(let i=0;i<7;i++){const bundle=new T.Group();bundle.position.set(2.15+i*.27,2.9,-2.76);this.root.add(bundle);cyl(bundle,.015,.5,0,-.13,0,green);for(let j=0;j<3;j++){const l=ball(bundle,.08,(j-1)*.055,-.39,0,green);l.scale.set(.6,1.9,.6);}}
    text(this.root,'薬草の物置',1.7,.48,2.9,3.32,-2.88);
  }
  private observatory(){
    box(this.root,2.35,.025,3.25,0,.09,.3,material('#3e566c'));for(const x of [-1.08,1.08])box(this.root,.04,.009,3.14,x,.11,.3,gold);
    table(this.root,-2.8,1.65,1.75,1.1);this.globe.position.set(-2.8,1.3,1.65);this.root.add(this.globe);cyl(this.globe,.25,.12,0,0,0,gold);cyl(this.globe,.05,.4,0,.2,0,gold);const sphere=ball(this.globe,.43,0,.63,0,material('#416e76'));
    for(let i=0;i<6;i++){const patch=ball(sphere,.13,Math.sin(i*2)*.32,Math.cos(i*3)*.21,Math.cos(i*2)*.3,material('#aba47c'));patch.scale.set(1,.4,1);}
    const meridian=new T.Mesh(new T.TorusGeometry(.48,.018,8,64),gold);meridian.position.y=.63;meridian.rotation.z=.3;this.globe.add(meridian);
    this.chart.position.set(-2.7,2.5,-2.83);this.root.add(this.chart);box(this.chart,1.6,1.27,.06,0,0,0,trim);text(this.chart,'北 ↑　北東 ↗\n白鳥 ✦　月 ☾',1.5,1.16,0,0,.045,'#334b62');
    text(this.root,'３歩、文字を戻せ',1.6,.6,-2.7,2.5,-2.89,'#776951');
    table(this.root,2.95,1.65,1.7,1.1);box(this.root,1.15,.08,.55,2.95,1.26,1.65,gold);const inscription=text(this.root,'PRRQ',.75,.35,2.95,1.31,1.63,'#4d4f53');inscription.rotation.x=-Math.PI/2;
    cyl(this.root,.22,.07,3.55,1.3,1.58,gold);text(this.root,'・ 線と点 −\nK −・−　E ・\nY −・−−',1.0,1.08,1.55,2.4,-2.82,'#3d5062');
    for(const x of [2.48,3.33])box(this.root,.08,1.5,.08,x,.8,-1.65,trim);
    cyl(this.root,.12,.1,2.9,1.5,-1.65,gold);this.telescope.position.set(2.9,1.6,-1.65);this.root.add(this.telescope);
    const tube=new T.Mesh(new T.CylinderGeometry(.16,.2,1.22,24),material('#a78851',.55));tube.rotation.x=-Math.PI/2-.35;tube.castShadow=true;this.telescope.add(tube);
    const lens=new T.Mesh(new T.CircleGeometry(.17,24),material('#9bc3d4',.6));lens.position.set(0,.21,-.6);lens.rotation.x=-.35;this.telescope.add(lens);
    box(this.root,1.78,1.82,.1,3,2.55,-2.87,material('#233d56'));
    for(let i=0;i<28;i++)ball(this.root,i%7===0?.026:.016,2.2+(i*71%160)/100,1.72+(i*53%167)/100,-2.79,material('#d8e3d0'));
    text(this.root,'星見の書斎',1.8,.42,-2.75,3.4,-2.86,'#364451');
  }
  update(s:Progress,dt:number,t:number,open:boolean){
    this.door.rotation.y=T.MathUtils.damp(this.door.rotation.y,open?-1.35:0,4,dt);
    if(this.stage===2){const g=s.garden;
      this.crate.position.z=T.MathUtils.damp(this.crate.position.z,g.crateMoved?.65:-.8,4,dt);this.rug.position.z=T.MathUtils.damp(this.rug.position.z,g.rugLifted?2.2:.55,4,dt);this.rug.scale.z=T.MathUtils.damp(this.rug.scale.z,g.rugLifted?.23:1,4,dt);
      this.sparkle.visible=g.crateMoved&&!g.mirrorTaken;this.mirror.visible=g.mirrorPlaced;this.mirror.rotation.y=T.MathUtils.damp(this.mirror.rotation.y,[.8,0,-.8][g.mirrorAngle],4,dt);this.cover.rotation.x=T.MathUtils.damp(this.cover.rotation.x,plantsSolved(s)?-1.5:0,4,dt);
      const names=['leaf','flower','fruit'];this.pots.forEach((p,i)=>{const slot=g.pots.indexOf(names[i] as 'leaf'|'flower'|'fruit');p.position.x=T.MathUtils.damp(p.position.x,slot<0?2.42+i*.56:2.42+slot*.56,4,dt);p.position.z=T.MathUtils.damp(p.position.z,slot<0?-1.55:-1.9,4,dt);});
      const lit=plantsSolved(s)&&g.mirrorPlaced&&g.mirrorAngle===2;this.cacheDoor.rotation.y=T.MathUtils.damp(this.cacheDoor.rotation.y,lit?-1.12:0,4,dt);this.ray.visible=g.mirrorPlaced;
      const positions=this.ray.geometry.getAttribute('position') as T.BufferAttribute;positions.setXYZ(0,-2.75,2.5,-2.8);positions.setXYZ(1,-2.8,1.76,1.65);positions.setXYZ(2,[-3.65,0,3][g.mirrorAngle],lit?1.45:2.6,lit?2:-2.8);positions.needsUpdate=true;this.ray.geometry.computeBoundingSphere();
    }else{const o=s.observatory;this.globe.position.z=T.MathUtils.damp(this.globe.position.z,o.globeMoved?2.3:1.65,4,dt);this.chart.position.x=T.MathUtils.damp(this.chart.position.x,o.chartMoved?-1.25:-2.7,4,dt);this.chart.position.y=T.MathUtils.damp(this.chart.position.y,o.chartMoved?3.1:2.5,4,dt);this.sparkle.position.set(-2.8,1.24,1.65);this.sparkle.visible=o.globeMoved&&!o.decoderTaken;this.telescope.rotation.y=T.MathUtils.damp(this.telescope.rotation.y,-o.bearing*Math.PI/4,4,dt);}
    this.sparkle.scale.setScalar(.85+Math.sin(t*3)*.2);
  }
}
