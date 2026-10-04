import { test } from 'node:test';
import assert from 'node:assert/strict';
import {fresh, inventory, unlockDrawer, finishBooks, finishChest, useItem, escape, decodeSave} from '../src/simulation/state.ts';
import {route,destinations} from '../src/simulation/navigation.ts';
test('three puzzles require their prerequisites, then escape with consumed items',()=>{
  const s=fresh();s.started=true;
  assert.equal(finishBooks(s,['葉','波','炎']),false);
  assert.equal(finishChest(s,['月','王冠','太陽','星']),false);
  assert.equal(useItem(s,'key','door'),false);assert.equal(escape(s),false);
  assert.equal(unlockDrawer(s,'234'),false);assert.deepEqual(inventory(s),[]);
  assert.equal(unlockDrawer(s,'243'),true);assert.deepEqual(inventory(s),['paper']);
  assert.equal(unlockDrawer(s,'243'),false);
  assert.equal(finishBooks(s,['波','葉','炎']),false);
  assert.equal(finishBooks(s,['葉','波','炎']),true);assert.deepEqual(inventory(s),['paper','crest']);
  assert.equal(useItem(s,'crest','desk'),false);assert.deepEqual(inventory(s),['paper','crest']);
  assert.equal(useItem(s,'crest','chest'),true);assert.deepEqual(inventory(s),['paper']);
  assert.equal(useItem(s,'crest','chest'),false);
  assert.equal(finishChest(s,['星','月','太陽','王冠']),false);
  assert.equal(finishChest(s,['月','王冠','太陽','星']),true);assert.deepEqual(inventory(s),['paper','key']);
  assert.equal(finishChest(s,['月','王冠','太陽','星']),false);
  assert.equal(useItem(s,'key','door'),true);assert.deepEqual(inventory(s),['paper']);
  assert.equal(escape(s),true);assert.equal(escape(s),false);
  assert.deepEqual(decodeSave(JSON.stringify(s)),s);
});
test('saves restore intermediate states and reject corrupted or impossible progression',()=>{
  for(const raw of [null,'null','{',JSON.stringify({version:2,started:true})])assert.deepEqual(decodeSave(raw),fresh());
  const bad={...fresh(),started:true,chest:true,escaped:true,hints:[-3,10,'wrong']};
  const restored=decodeSave(JSON.stringify(bad));assert.equal(restored.chest,false);assert.equal(restored.escaped,false);assert.deepEqual(restored.hints,[0,3,0]);
  const s=fresh();s.started=true;unlockDrawer(s,'243');finishBooks(s,['葉','波','炎']);useItem(s,'crest','chest');
  assert.deepEqual(decodeSave(JSON.stringify(s)),s);assert.deepEqual(inventory(decodeSave(JSON.stringify(s))),['paper']);
});
test('all investigation routes and mid-walk retargeting stay in the furniture-free aisle',()=>{
  const pts=[{x:0,z:.7},...Object.values(destinations),{x:.85,z:-.3}];
  for(const from of pts)for(const to of Object.values(destinations)){
    const path=route(from,to);assert.deepEqual(path.at(-1),to);
    const furniture=[{x1:-3.8,x2:-2.12,z1:-1.8,z2:.46},{x1:-3.73,x2:-1.975,z1:1.1,z2:2.2},{x1:2.12,x2:4.1,z1:-2.92,z2:-2.03},{x1:2.2,x2:3.76,z1:1,z2:2}];
    let prev=from;for(const end of path){for(let i=0;i<=10;i++){const x=prev.x+(end.x-prev.x)*i/10,z=prev.z+(end.z-prev.z)*i/10;assert.ok(Math.abs(x)<=1.5+1e-9&&z>=-2.1-1e-9&&z<=1.35+1e-9);for(const f of furniture){const dx=Math.max(f.x1-x,0,x-f.x2),dz=Math.max(f.z1-z,0,z-f.z2);assert.ok(Math.hypot(dx,dz)>.36,'character body must clear furniture');}}prev=end;}
  }
});
