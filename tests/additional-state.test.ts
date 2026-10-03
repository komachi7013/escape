import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,inventory,useItem,escape,advanceStage,moveCrate,takeMirror,liftRug,placePlant,plantsSolved,turnMirror,takeGardenKey,moveGlobe,takeDecoder,moveChart,turnDecoder,caesar,solveCipher,takeLens,turnTelescope,solveStars,decodeSave} from '../src/simulation/state.ts';
function clearedFirst(){const s=fresh();s.started=true;s.drawer=s.shelf=s.crestUsed=s.chest=s.doorUnlocked=true;escape(s);return s;}
test('garden discovery, rearrangement and light reflection unlock the second exit',()=>{
  const s=clearedFirst();assert.equal(advanceStage(s),true);assert.equal(s.stage,2);assert.deepEqual(inventory(s),[]);assert.equal(advanceStage(s),false);
  assert.equal(takeMirror(s),false);assert.equal(takeGardenKey(s),false);moveCrate(s);assert.equal(takeMirror(s),true);assert.equal(takeMirror(s),false);
  assert.equal(useItem(s,'mirror','mirrorStand'),false);assert.equal(useItem(s,'mirror','cache'),false);assert.deepEqual(inventory(s),['mirror']);
  placePlant(s,'fruit',0);placePlant(s,'flower',2);placePlant(s,'leaf',1);assert.equal(plantsSolved(s),false);
  placePlant(s,'leaf',0);assert.deepEqual(s.garden.pots,['leaf','fruit','flower']);placePlant(s,'flower',1);assert.deepEqual(s.garden.pots,['leaf','flower','fruit']);assert.equal(plantsSolved(s),false);
  liftRug(s);assert.equal(plantsSolved(s),true);assert.equal(useItem(s,'mirror','mirrorStand'),true);assert.deepEqual(inventory(s),[]);
  assert.equal(turnMirror(s,1),true);assert.equal(takeGardenKey(s),false);turnMirror(s,2);assert.equal(takeGardenKey(s),true);assert.equal(takeGardenKey(s),false);
  assert.deepEqual(decodeSave(JSON.stringify(s)),s);assert.deepEqual(inventory(s),['key']);useItem(s,'key','door');assert.equal(escape(s),true);assert.deepEqual(s.cleared,[true,true,false]);
  assert.equal(advanceStage(s),true);assert.equal(s.stage,3);assert.deepEqual(inventory(s),[]);
});
test('observatory requires discovery, correct Caesar shift, lens and correct constellation',()=>{
  const s=clearedFirst();advanceStage(s);moveCrate(s);takeMirror(s);liftRug(s);(['leaf','flower','fruit'] as const).forEach((p,i)=>placePlant(s,p,i));useItem(s,'mirror','mirrorStand');turnMirror(s,2);takeGardenKey(s);useItem(s,'key','door');escape(s);advanceStage(s);
  assert.equal(takeDecoder(s),false);assert.equal(takeLens(s),false);assert.equal(solveStars(s,'KEY'),false);moveGlobe(s);takeDecoder(s);assert.equal(useItem(s,'decoder','telescope'),false);useItem(s,'decoder','cipherDesk');
  assert.equal(caesar('PRRQ',3),'MOON');assert.equal(solveCipher(s,'MOON'),false);moveChart(s);turnDecoder(s,2);assert.equal(solveCipher(s,'MOON'),false);turnDecoder(s,3);assert.equal(solveCipher(s,'moon'),true);
  assert.equal(takeLens(s),true);assert.equal(takeLens(s),false);useItem(s,'lens','telescope');turnTelescope(s,2);assert.equal(solveStars(s,'KEY'),false);turnTelescope(s,1);assert.equal(solveStars(s,'SUN'),false);assert.equal(solveStars(s,'key'),true);
  assert.deepEqual(decodeSave(JSON.stringify(s)),s);useItem(s,'key','door');escape(s);assert.deepEqual(s.cleared,[true,true,true]);assert.equal(advanceStage(s),false);assert.deepEqual(decodeSave(JSON.stringify(s)),s);
});
test('legacy saves migrate, duplicate placements and unreachable stages are repaired',()=>{
  const old={version:1,started:true,drawer:true,shelf:true,crestUsed:true,chest:true,doorUnlocked:true,escaped:true,hints:[1,2,3]};const s=decodeSave(JSON.stringify(old));assert.equal(s.version,2);assert.equal(s.stage,1);assert.equal(s.escaped,true);assert.equal(advanceStage(s),true);
  const bad={...fresh(),started:true,stage:3,cleared:[true,true,true],garden:{...fresh().garden,pots:['leaf','leaf','leaf'],mirrorTaken:true,keyTaken:true},observatory:{...fresh().observatory,keyTaken:true}};
  const restored=decodeSave(JSON.stringify(bad));assert.equal(restored.stage,1);assert.deepEqual(restored.cleared,[false,false,false]);assert.deepEqual(inventory(restored),[]);
});
