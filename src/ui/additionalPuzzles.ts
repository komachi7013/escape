import {moveCrate,takeMirror,liftRug,placePlant,plantsSolved,turnMirror,takeGardenKey,moveGlobe,takeDecoder,moveChart,turnDecoder,caesar,solveCipher,takeLens,turnTelescope,solveStars,type Progress,type Target,type Item,type Plant} from '../simulation/state';
export interface PuzzleUI {state:()=>Progress;persist:()=>void;open:(title:string,content:string,chapter?:string)=>void;reward:(item:Item,message:string)=>void;sound:(kind:'click'|'wrong'|'success')=>void;}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const plantNames:Record<Plant,string>={leaf:'葉の鉢',flower:'花の鉢',fruit:'実の鉢'};
const plantIcons:Record<Plant,string>={leaf:'❧',flower:'✿',fruit:'●'};
const bearings=['北','北東','東','南東','南','南西','西','北西'];
const plantCard=(p:Plant)=>`<button class="plant-card ${p}" data-plant="${p}" aria-label="${plantNames[p]}を移動"><span aria-hidden="true">${plantIcons[p]}</span><small>${plantNames[p]}</small></button>`;

// Pointer drag and explicit buttons share exactly the same state transition.
// The button alternative also makes every movement usable from the keyboard.
function bindMove(piece:string,action:string,commit:()=>boolean,refresh:()=>void,ui:PuzzleUI){
  const element=$(piece);let start=0,dragging=false,distance=0;
  const finish=()=>{if(commit()){ui.persist();ui.sound('click');refresh();}};
  element.onpointerdown=e=>{start=e.clientX;distance=0;dragging=true;element.setPointerCapture(e.pointerId);};
  element.onpointermove=e=>{if(!dragging)return;distance=e.clientX-start;element.style.transform=`translateX(${Math.max(-30,Math.min(145,distance))}px)`;};
  element.onpointerup=()=>{if(!dragging)return;dragging=false;if(distance>55)finish();else element.style.transform='';};
  element.onpointercancel=()=>{dragging=false;element.style.transform='';};
  $(action).onclick=finish;
}
export function additionalPuzzle(t:Target,ui:PuzzleUI):boolean {
  const s=ui.state();if(s.stage===1||t==='door')return false;
  const refresh=()=>additionalPuzzle(t,ui);
  if(s.stage===2){const g=s.garden;
    if(t==='crates'){
      ui.open('積まれた木箱',g.crateMoved?`<p>木箱を動かすと、床に小さな鏡が落ちていた。</p>${g.mirrorTaken?'<p>鏡は取り出した。ほかにも動かせる物がないか、探してみよう。</p>':'<img class="reward" src="/assets/mirror.png" alt="小さな鏡"><div class="dialog-footer"><button class="primary" id="take-mirror">隠れていた鏡を取る</button></div>'}`:`<p>床に擦れた跡がある。この木箱は横へ動かせそうだ。</p><div class="move-zone"><div class="scratch"></div><button class="movable crate-piece" id="crate-piece" aria-label="木箱をドラッグして移動">❧</button><span class="drag-destination">ここへ →</span></div><p class="gesture-note">木箱を右へドラッグ。ボタンでも動かせます。</p><div class="dialog-footer"><button class="secondary" id="move-crate">木箱を横へ動かす</button></div>`);
      if(!g.crateMoved)bindMove('crate-piece','move-crate',()=>moveCrate(s),refresh,ui);
      if(g.crateMoved&&!g.mirrorTaken)$('take-mirror').onclick=()=>{if(takeMirror(s))ui.reward('mirror','曇りのない鏡だ。窓の光を、どこかへ導けるかもしれない。');};
    }else if(t==='rug'){
      ui.open('古い敷物',g.rugLifted?`<p>敷物の下に、植物の配置図が描かれていた。</p><div class="clue plant-diagram"><div>❧ 葉 → 水 ≈</div><div>✿ 花 → 光 ☀</div><div>● 実 → 土 ▱</div></div><p>「鉢を定位置へ。光路の覆いが開く。」</p>`:`<p>敷物の端だけが、少し浮いている。下には何かありそうだ。</p><div class="move-zone"><button class="movable rug-piece" id="rug-piece" aria-label="敷物をドラッグしてめくる">✦</button><span class="drag-destination">端をめくる →</span></div><div class="dialog-footer"><button class="secondary" id="lift-rug">敷物をめくる</button></div>`);
      if(!g.rugLifted)bindMove('rug-piece','lift-rug',()=>liftRug(s),refresh,ui);
    }else if(t==='plants'){
      ui.open('薬草の鉢',`<p>${plantsSolved(s)?'鉢が定位置に揃うと、鏡台の覆いが開いた。窓の光を使えそうだ。':'3つの鉢と、3つの台座。鉢をドラッグして移そう。選択して「置く」でも操作できる。'}</p><div class="plant-tray">${(['leaf','flower','fruit'] as Plant[]).filter(p=>!g.pots.includes(p)).map(plantCard).join('')}</div><div class="pot-slots">${['水 ≈','光 ☀','土 ▱'].map((name,i)=>`<section class="pot-slot" data-slot="${i}" aria-label="${name}の台座"><h3>${name}</h3>${g.pots[i]?plantCard(g.pots[i]!):'<span class="empty-slot">空いている</span>'}${plantsSolved(s)?'':`<button class="place-plant" data-place="${i}" aria-label="${name.split(' ')[0]}の台座へ置く">ここへ置く</button>`}</section>`).join('')}</div><p class="message" id="plant-message" role="status">${plantsSolved(s)?'正しい配置！ 鏡台を調べてみよう。':'鉢を選んで、置きたい台座へ。'}</p>${g.rugLifted?'<p class="gesture-note">床の図：葉は水、花は光、実は土。</p>':'<p class="gesture-note">部屋のどこかに配置図が隠れていそうだ。</p>'}`);
      if(!plantsSolved(s))bindPlants(ui,refresh);
    }else if(t==='mirrorStand'){
      ui.open('窓辺の鏡台',!plantsSolved(s)?'<p>鏡を固定する台に覆いがかかっている。「鉢を定位置へ」と刻まれている。</p><p>植物の台座を調べ、部屋で配置の手掛かりを探そう。</p>':!g.mirrorPlaced?'<p>鏡台の覆いが開いている。丸い鏡を固定できそうだ。</p><p>所持品の鏡を選び、この鏡台を調べて使おう。</p>':`<p>鏡を回して、窓からの光を導こう。窓枠には「光は葉の扉へ」と刻まれていた。</p><div class="mirror-preview"><div class="mirror-line"></div><img id="mirror-preview" src="/assets/mirror.png" alt="角度を調整する鏡"></div><label class="range-label">鏡の向き <input id="mirror-angle" type="range" min="0" max="2" step="1" value="${g.mirrorAngle}" aria-label="鏡の角度" ${g.keyTaken?'disabled':''}></label><div class="range-marks"><span>左</span><span>中央</span><span>右</span></div><p class="message" id="mirror-message" role="status"></p>`);
      if(g.mirrorPlaced){const update=()=>{$('mirror-preview').style.transform=`rotate(${(g.mirrorAngle-1)*30}deg)`;$('mirror-message').textContent=g.mirrorAngle===2?'光が葉の扉に届いた。隠し戸が開いた！':'光はまだ隠し戸に届いていない。鏡を回してみよう。';};update();$<HTMLInputElement>('mirror-angle').oninput=e=>{if(turnMirror(s,Number((e.target as HTMLInputElement).value))){ui.persist();update();}};}
    }else if(t==='cache'){
      const open=g.mirrorPlaced&&g.mirrorAngle===2&&plantsSolved(s);
      ui.open('葉の隠し戸',open?g.keyTaken?'<p>隠し戸の中にあった鍵は取り出した。出口へ向かおう。</p>':'<p>光が葉のしるしに届くと、隠し戸が開いた。奥に鍵が見える。</p><img class="reward" src="/assets/key.png" alt="鍵"><div class="dialog-footer"><button class="primary" id="take-garden-key">奥の鍵を取る</button></div>':'<p>葉のしるしが刻まれた隠し戸。押しても動かない。</p><p>取っ手の代わりに、磨かれた光の受け口が付いている。</p>');
      if(open&&!g.keyTaken)$('take-garden-key').onclick=()=>{if(takeGardenKey(s))ui.reward('key','薬草の香りが漂う部屋の出口へ。鍵を選んで扉に使おう。');};
    }else if(t==='window'){ui.open('光の差す窓','<p>葉のすき間から、暖かな光が一本差し込んでいる。</p><div class="clue"><p style="color:inherit;text-align:center">「光は、葉の扉へ。」</p></div><p>鏡があれば、この光を別の場所へ向けられそうだ。</p>');}
    else return false;
  }else{const o=s.observatory;
    if(t==='globe'){
      ui.open('古い地球儀',o.globeMoved?o.decoderTaken?'<p>地球儀の下に挟まっていた円盤は取り出した。文字の刻まれた机で使えそうだ。</p>':'<p>地球儀をずらすと、真鍮の解読円盤が見つかった。</p><img class="reward" src="/assets/decoder.png" alt="解読円盤"><div class="dialog-footer"><button class="primary" id="take-decoder">解読円盤を取る</button></div>':'<p>脚の下に、金属の縁が見えている。地球儀をずらせば取り出せそうだ。</p><div class="move-zone"><button class="movable globe-piece" id="globe-piece" aria-label="地球儀をドラッグして移動">🌐</button><span class="drag-destination">横へずらす →</span></div><div class="dialog-footer"><button class="secondary" id="move-globe">地球儀を横へ動かす</button></div>');
      if(!o.globeMoved)bindMove('globe-piece','move-globe',()=>moveGlobe(s),refresh,ui);
      if(o.globeMoved&&!o.decoderTaken)$('take-decoder').onclick=()=>{if(takeDecoder(s))ui.reward('decoder','アルファベットの刻まれた円盤だ。暗号机に使うと、文字をずらして読める。');};
    }else if(t==='starChart'){
      ui.open('壁の星図',`<p>北東に「白鳥」、月のしるしの下に小さな箱。星図の縁には、動かした跡がある。</p><div class="clue star-map"><div class="map-north">北 ↑</div><span class="map-swan">✦ 白鳥<br><small>北東 ↗</small></span><span class="map-moon">☾ 月<br><small>小さな箱</small></span></div>${o.chartMoved?'<div class="clue"><p style="color:inherit;text-align:center">星図の裏：「３歩、文字を戻せ。」</p></div>':'<div class="dialog-footer"><button class="secondary" id="move-chart">星図を横へずらす</button></div>'}${o.cipherSolved&&!o.lensTaken?'<p>暗号が示していたのは、MOON＝月。この小箱のことだ。</p><div class="dialog-footer"><button class="primary" id="take-lens">月の小箱を開ける</button></div>':o.lensTaken?'<p>月の小箱から、望遠鏡のレンズを取り出した。</p>':'<p>月の小箱は閉じている。暗号机と連動しているようだ。</p>'}`);
      if(!o.chartMoved)$('move-chart').onclick=()=>{if(moveChart(s)){ui.persist();ui.sound('click');refresh();}};
      if(o.cipherSolved&&!o.lensTaken)$('take-lens').onclick=()=>{if(takeLens(s))ui.reward('lens','透明なレンズが入っていた。所持品から選び、望遠鏡に取り付けよう。');};
    }else if(t==='cipherDesk'){
      ui.open('文字の暗号机',o.cipherSolved?'<p>解読した言葉は「MOON＝月」。星図の月の小箱が開いた。</p>':!o.decoderUsed?'<p>机の中央に「PRRQ」と刻まれている。横には円盤を置くための丸いくぼみ。</p><div class="cipher-word">PRRQ</div><p>部屋で解読円盤を見つけ、所持品から選んでこの机に使おう。</p>':`<p>円盤を回すと、文字を一つずつ前へ戻せる。戻す数の手掛かりは、星図の裏にありそうだ。</p><div class="cipher-word">PRRQ → <output id="decoded-word">${caesar('PRRQ',o.wheel)}</output></div><div class="alphabet-wheel"><div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div><div id="shifted-alphabet"></div></div><label class="range-label">戻す文字数：<output id="wheel-value">${o.wheel}</output><input id="decoder-wheel" type="range" min="0" max="25" step="1" value="${o.wheel}" aria-label="文字を戻す数"></label><form id="cipher-form"><div class="lock-form word-form"><input id="cipher-answer" maxlength="8" autocomplete="off" aria-label="解読した言葉" placeholder="単語" required><button class="primary">解読する</button></div></form><p class="message" id="cipher-message" role="status"></p>`);
      if(o.decoderUsed&&!o.cipherSolved){const update=()=>{$('wheel-value').textContent=String(o.wheel);$('decoded-word').textContent=caesar('PRRQ',o.wheel);$('shifted-alphabet').textContent=caesar('ABCDEFGHIJKLMNOPQRSTUVWXYZ',o.wheel);};update();$<HTMLInputElement>('decoder-wheel').oninput=e=>{if(turnDecoder(s,Number((e.target as HTMLInputElement).value))){ui.persist();update();}};
        $('cipher-form').onsubmit=e=>{e.preventDefault();if(solveCipher(s,$<HTMLInputElement>('cipher-answer').value)){ui.persist();ui.sound('success');refresh();}else{ui.sound('wrong');$('cipher-message').textContent=!o.chartMoved?'戻す数の手掛かりを、星図の裏で先に確かめよう。':'まだ違うようだ。円盤の位置と、解読した言葉を見直そう。';}};
      }
    }else if(t==='lexicon'){
      ui.open('星の符号表','<p>「短い光は点、長い光は線。一息ずつ区切って読め。」</p><div class="clue morse-table"><div>K <code>− ・ −</code></div><div>E <code>・</code></div><div>Y <code>− ・ − −</code></div><div>A <code>・ −</code></div><div>N <code>− ・</code></div><div>R <code>・ − ・</code></div></div><p>望遠鏡の観測記録には、点と線の並びが残るそうだ。</p>');
    }else if(t==='telescope'){
      if(o.keyTaken){ui.open('星を見つめる望遠鏡','<p>観測台の小さな収納から、出口の鍵を取り出した。最後の扉へ向かおう。</p>');return true;}
      ui.open('星を見つめる望遠鏡',!o.lensUsed?'<p>望遠鏡の先端にレンズが欠けている。このままでは、星がぼやけてしまう。</p><p>レンズを見つけて、所持品から選び、この望遠鏡に取り付けよう。</p>':`<p>星図を頼りに、望遠鏡を回して観測しよう。方位盤の上をドラッグして向けられる。</p><div class="telescope-controls"><div class="compass" id="compass" aria-label="望遠鏡の方位盤"><span class="north">北</span><span class="east">東</span><span class="south">南</span><span class="west">西</span><i id="compass-needle"></i></div><div class="scope-view" id="scope-view"></div></div><label class="range-label">観測する方角：<output id="bearing-name">${bearings[o.bearing]}</output><input id="telescope-bearing" type="range" min="0" max="7" step="1" value="${o.bearing}" aria-label="望遠鏡の方角"></label><div id="observation" ${o.bearing===1?'':'hidden'}><div class="star-code" aria-label="観測記録、線点線、点、線点線線"><span>− ・ −</span><span>・</span><span>− ・ − −</span></div><p>白鳥の光が、点と線の記録を残した。符号表を見比べて、3文字の言葉に直そう。</p><form id="star-form"><div class="lock-form word-form"><input id="star-answer" maxlength="8" autocomplete="off" aria-label="星の暗号の答え" placeholder="単語" required><button class="primary">記録を解読する</button></div></form></div><p class="message" id="star-message" role="status"></p>`);
      if(o.lensUsed)bindTelescope(ui);
    }else return false;
  }
  return true;
}
function bindPlants(ui:PuzzleUI,refresh:()=>void){let selected:Plant|undefined;const s=ui.state();
  const place=(slot:number)=>{if(!selected){$('plant-message').textContent='先に、移動する鉢を選ぼう。';return;}if(placePlant(s,selected,slot)){ui.persist();ui.sound(plantsSolved(s)?'success':'click');refresh();}};
  document.querySelectorAll<HTMLElement>('[data-plant]').forEach(card=>{let sx=0,sy=0,dragging=false,moved=false;
    card.onclick=()=>{selected=card.dataset.plant as Plant;document.querySelectorAll('[data-plant]').forEach(c=>c.classList.toggle('active',c===card));$('plant-message').textContent=`${plantNames[selected]}を選択。置く台座を選ぼう。`;};
    card.onpointerdown=e=>{sx=e.clientX;sy=e.clientY;dragging=true;moved=false;selected=card.dataset.plant as Plant;card.setPointerCapture(e.pointerId);card.classList.add('dragging');};
    card.onpointermove=e=>{if(!dragging)return;const dx=e.clientX-sx,dy=e.clientY-sy;moved||=Math.hypot(dx,dy)>5;if(moved)card.style.transform=`translate(${dx}px,${dy}px)`;};
    card.onpointerup=e=>{dragging=false;card.classList.remove('dragging');card.style.transform='';if(moved){card.style.pointerEvents='none';const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-slot]');card.style.pointerEvents='';if(target)place(Number(target.dataset.slot));}};
    card.onpointercancel=()=>{dragging=false;card.classList.remove('dragging');card.style.transform='';};
  });
  document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b=>b.onclick=()=>place(Number(b.dataset.place)));
}
function bindTelescope(ui:PuzzleUI){const s=ui.state(),o=s.observatory;
  const update=()=>{$('bearing-name').textContent=bearings[o.bearing];$<HTMLInputElement>('telescope-bearing').value=String(o.bearing);$('compass-needle').style.transform=`rotate(${o.bearing*45}deg)`;$('observation').hidden=o.bearing!==1;$('scope-view').innerHTML=o.bearing===1?'<span class="constellation">✦<br>　✧　 ✧<br>✧　　✦</span><small>白鳥の星座</small>':'<span class="constellation dim">・　　✧<br>　・<br>✧　　・</span><small>まだ目的の星ではない</small>';};update();
  const turn=(bearing:number)=>{if(turnTelescope(s,bearing)){ui.persist();update();}};
  $<HTMLInputElement>('telescope-bearing').oninput=e=>turn(Number((e.target as HTMLInputElement).value));let dragging=false;
  const point=(e:PointerEvent)=>{const rect=$('compass').getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);if(Math.hypot(dx,dy)<12)return;turn((Math.round(Math.atan2(dx,-dy)/(Math.PI/4))+8)%8);};
  $('compass').onpointerdown=e=>{dragging=true;$('compass').setPointerCapture(e.pointerId);point(e);};$('compass').onpointermove=e=>{if(dragging)point(e);};$('compass').onpointerup=()=>dragging=false;$('compass').onpointercancel=()=>dragging=false;
  $('star-form').onsubmit=e=>{e.preventDefault();if(solveStars(s,$<HTMLInputElement>('star-answer').value)){ui.sound('success');ui.reward('key','星の言葉が収納を開いた。最後の鍵で、宿屋の外へ進もう。');}else{ui.sound('wrong');$('star-message').textContent='記録と符号表を見比べ、もう一度読んでみよう。';}};
}
