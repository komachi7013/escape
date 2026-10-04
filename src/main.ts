import './ui/style.css';
import { Room, targetNames } from './render/room';
import { AudioEngine } from './audio';
import {additionalPuzzle} from './ui/additionalPuzzles';
import {advanceStage,plantsSolved,stageTitles,stageHints,hintLevels} from './simulation/state';
import { BOOKS, CRESTS, BOOK_ANSWER, CREST_ANSWER, HINTS, loadProgress, saveProgress, fresh, inventory, nextPuzzle, unlockDrawer, finishBooks, finishChest, useItem, escape, type Item, type Target } from './simulation/state';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<canvas id="world" aria-label="宿屋の3Dの部屋"></canvas><div class="vignette"></div><div id="markers"></div>
<section id="title-screen"><div class="title-copy"><div class="eyebrow">A LITTLE FANTASY ESCAPE</div><div class="ornament">✦ ───── ✦</div><h1><span>古い宿屋からの</span><span>脱出</span></h1><p>目を覚ますと、扉には見知らぬ鍵。<br>部屋に残された小さな手掛かりをたどり、<br>朝の光へ、一歩を踏み出そう。</p><div class="title-actions" id="title-actions"></div></div><div class="chapter-note">３つの部屋、ひとつの冒険。　／　音とともにお楽しみください</div><div class="title-sound"><button class="tool" id="title-audio">BGMを再生</button><small id="title-audio-note">音とともに、冒険へ。</small></div></section>
<div id="hud" hidden><div class="brand"><span class="brand-mark">✦</span><div><div class="eyebrow" id="stage-number">THE OLD INN · ROOM 01 / 03</div><h2 id="stage-name">旅人の客室</h2><div class="progress-dots" id="progress-dots"></div></div></div>
<div class="tools"><button class="tool" id="hint">ヒント</button><button class="tool" id="settings" aria-label="音と設定">音と設定</button><button class="tool" id="fullscreen">全画面</button></div>
<div id="inventory"></div><div id="status" role="status" aria-live="polite"></div>
<div class="view-controls"><button class="tool" id="zoom-out" aria-label="縮小">−</button><span class="zoom-text" id="zoom-text">1.0×</span><button class="tool" id="zoom-in" aria-label="拡大">＋</button><button class="tool" id="reset-view">全体表示</button></div></div>
<div id="intro-label" class="intro-label" hidden>さて、この部屋の秘密を探そう。</div><div id="modal-root" hidden></div>
<section id="result" hidden><div class="result-copy"><img src="/assets/sparkle.png" alt=""><div class="eyebrow">A NEW JOURNEY BEGINS</div><h1 id="result-title">脱出成功！</h1><p id="result-message">小さな謎が、旅の扉を開いた。</p><button id="next-stage" class="primary" hidden>次のステージへ</button><button id="replay" class="primary">もう一度遊ぶ</button><br><button id="back-title" class="text-button">タイトルへ</button></div></section>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
let state=loadProgress(), selected:Item|undefined, phase:'title'|'intro'|'play'|'escape'|'result'='title';
let room:Room|undefined, modal=false, lastFocus:HTMLElement|null=null, statusTimer:number|undefined, pendingItem:Item|undefined;
const audio=new AudioEngine();
const itemNames:Record<Item,string>={paper:'紙片',crest:'紋章',key:'出口の鍵',mirror:'小さな鏡',decoder:'解読円盤',lens:'望遠鏡のレンズ'};
const itemImage=(item:Item)=>`/assets/${item==='key'&&state.stage===3?'star-key':item}.png`;
const symbols:Record<string,string>={'太陽':'☀','月':'☾','星':'★','王冠':'♛','葉':'❧','波':'≈','炎':'♨','山':'△','雪':'❄'};
const symbol=(name:string)=>`<span class="symbol"><b aria-hidden="true">${symbols[name]}</b><small>${name}</small></span>`;
const clueRow=(names:string[])=>`<div class="clue-row">${names.map(symbol).join('<span class="arrow" aria-hidden="true">→</span>')}</div>`;
function persist(){if(!saveProgress(state)){$('save-warning').hidden=false;}room?.setState(state);renderInventory();renderProgress();}
const warning=document.createElement('div');warning.id='save-warning';warning.className='save-warning';warning.hidden=true;warning.textContent='このブラウザーでは保存できません。このまま遊べますが、閉じると進行が失われます。';app.append(warning);
function status(message:string,ms=4300){window.clearTimeout(statusTimer);$('status').textContent=message;if(ms)statusTimer=window.setTimeout(()=>$('status').textContent='',ms);}
function renderProgress(){$('stage-number').textContent=`THE OLD INN · ROOM 0${state.stage} / 03`;$('stage-name').textContent=stageTitles[state.stage-1];$('progress-dots').innerHTML=(state.stage===1?[state.drawer,state.shelf,state.chest]:state.stage===2?[state.garden.mirrorTaken,plantsSolved(state),state.garden.keyTaken]:[state.observatory.decoderTaken,state.observatory.lensTaken,state.observatory.keyTaken]).map(d=>`<i class="${d?'done':''}"></i>`).join('');}
function renderInventory(){const items=inventory(state);if(selected&&!items.includes(selected))selected=undefined;
  $('inventory').innerHTML=`<span class="inventory-caption">所持品</span>${items.length?items.map(item=>`<button class="item ${selected===item?'selected':''}" data-item="${item}" aria-label="${itemNames[item]}を選択" aria-pressed="${selected===item}"><img src="${itemImage(item)}" alt=""><span class="item-caption">${itemNames[item]}${selected===item?'<small>選択中</small>':''}</span></button>`).join(''):'<span class="empty-bag">まだ何も持っていない</span>'}${selected?'<button class="cancel-item" id="cancel-item">選択解除</button>':''}`;
  document.querySelectorAll<HTMLButtonElement>('[data-item]').forEach(b=>b.onclick=()=>{room?.cancelWalk();selected=selected===b.dataset.item?undefined:b.dataset.item as Item;renderInventory();if(selected)status(`${itemNames[selected]}を選択しました。使いたい対象を調べよう。`);});
  const cancel=document.getElementById('cancel-item');if(cancel)cancel.onclick=()=>{selected=undefined;room?.cancelWalk();renderInventory();status('アイテムの選択を解除しました。');};
  if(selected==='paper'){const read=document.createElement('button');read.className='cancel-item';read.id='inventory-read-paper';read.textContent='紙片を読む';read.onclick=()=>showPaper();$('inventory').append(read);}
}
function title(){audio.setTheme('title');phase='title';closeModal();$('result').hidden=true;$('title-screen').hidden=false;$('hud').hidden=true;room?.setTitle();
  $('title-actions').innerHTML=state.started?'<button class="primary" id="continue">続きから</button><button class="text-button" id="new-game">最初から</button>':'<button class="primary" id="start-game">ゲーム開始</button>';
  const cont=document.getElementById('continue');if(cont)cont.onclick=()=>begin(true);
  const start=document.getElementById('start-game');if(start)start.onclick=()=>begin(false);
  const n=document.getElementById('new-game');if(n)n.onclick=()=>confirmReset();
}
async function begin(resume:boolean){if(!room)return;closeModal();if(!resume)state=fresh();state.started=true;selected=undefined;persist();
  audio.setTheme(state.stage===1?'inn':state.stage===2?'garden':'stars');
  phase='intro';$('intro-label').textContent=`${stageTitles[state.stage-1]}の秘密を探そう。`;zoomText();$('title-screen').hidden=true;$('intro-label').hidden=false;$('result').hidden=true;$('hud').hidden=true;
  const audioOk=await audio.start();room.start(()=>{zoomText();$('intro-label').hidden=true;if(state.escaped){result();return;}phase='play';$('hud').hidden=false;status(audioOk?'光る印をクリックして調べよう。ホイールで拡大できます。':'音を開始できませんでした。「音と設定」で再試行できます。',6500);},resume);
}
function choose(t:Target){if(phase!=='play'||modal||!room)return;pendingItem=selected;status(`${targetNames[t]}へ向かっています…`,0);
  room.walk(t,target=>{if(phase!=='play'||modal)return;status('');const item=pendingItem;pendingItem=undefined;
    let itemMessage='';if(item){if(useItem(state,item,target)){audio.play('unlock');selected=undefined;persist();itemMessage=item==='crest'?'紋章をはめた。4つのボタンが淡く光り始めた。':item==='mirror'?'鏡を鏡台に固定した。光の向きを変えられそうだ。':item==='decoder'?'解読円盤をはめた。文字をずらして読めそうだ。':item==='lens'?'レンズを取り付けた。星がはっきり見える。':'鍵が回った。扉を開けられそうだ。';}
    else itemMessage=item==='paper'?'紙片は本棚の手掛かりだ。所持品から「紙片を読む」で確認できる。':`${itemNames[item]}は、ここには使えない。アイテムは手元に残っている。`;}
    investigate(target,itemMessage);
  });
}
function openModal(titleText:string,content:string,chapter='INVESTIGATION'){room?.cancelWalk();if(!modal)lastFocus=document.activeElement as HTMLElement;modal=true;const root=$('modal-root');root.hidden=false;
  root.innerHTML=`<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><div class="eyebrow">${chapter}</div><h2 id="dialog-title">${titleText}</h2></div><button class="close" id="close-dialog" aria-label="閉じる">×</button></header><div id="dialog-content">${content}</div></section>`;
  $('close-dialog').onclick=closeModal; $('close-dialog').focus();
  $('markers').inert=true;$('hud').inert=true;$('title-screen').inert=true;$('result').inert=true;
}
function closeModal(){modal=false;$('modal-root').hidden=true;$('modal-root').innerHTML='';$('markers').inert=false;$('hud').inert=false;$('title-screen').inert=false;$('result').inert=false;if(lastFocus?.isConnected)lastFocus.focus();}
function note(message:string){const p=document.createElement('p');p.className='message';p.role='status';p.textContent=message;$('dialog-content').append(p);}
function reward(item:Item,message:string){audio.play('item');persist();openModal('小さな発見',`<img class="reward" src="${itemImage(item)}" alt="${itemNames[item]}"><p class="reward-label">${itemNames[item]}を手に入れた。</p><p>${message}</p><div class="dialog-footer"><button class="primary" id="take-item">探索を続ける</button></div>`,'DISCOVERY');$('take-item').onclick=closeModal;}
function investigate(t:Target,itemMessage=''){
  if(additionalPuzzle(t,{state:()=>state,persist,open:openModal,reward,sound:k=>audio.play(k)})){if(itemMessage)note(itemMessage);return;}
  if(t==='painting'){openModal('天体の絵',`<p>古びた額の中には、太陽と月と星。よく見ると、同じ記号がいくつも描かれている。</p><div class="clue" aria-label="太陽2個、月4個、星3個"><div class="painting-row"><span>☀</span><span>☀</span></div><div class="painting-row"><span>☾</span><span>☾</span><span>☾</span><span>☾</span></div><div class="painting-row"><span>★</span><span>★</span><span>★</span></div></div>`);}
  if(t==='memo'){openModal('机に残されたメモ',`<p>「空のしるしを、この順に。」<br>短い言葉の下に、3つの記号が記されている。</p><div class="clue">${clueRow(['太陽','月','星'])}</div>`);}
  if(t==='flag'){openModal('壁に掛けられた旗',`<p>4つの紋章が縦に並んでいる。飾りの矢印は、上から下へ向いている。</p><div class="clue banner"><div class="banner-axis">上から下へ ↓</div>${['月','王冠','太陽','星'].map(s=>`<div class="clue-row">${symbol(s)}</div>`).join('')}</div>`);}
  if(t==='bed'){openModal('旅人のベッド',`<p>毛布には、まだ少しぬくもりが残っている。枕の下にも、ベッドの脇にも鍵はなさそうだ。</p><p>扉の向こうから、小鳥の声が聞こえる。</p>`);}
  if(t==='desk'){
    if(state.drawer){openModal('開いた引き出し','<p>数字錠は開いている。中にあった紙片は、所持品から何度でも確認できる。</p>');}
    else {openModal('引き出しの数字錠',`<p>3桁の数字錠が付いている。机のメモと壁の絵に、手掛かりがありそうだ。</p><form class="lock-form" id="lock-form"><div class="lock-form"><input id="lock-code" aria-label="3桁の暗証番号" inputmode="numeric" autocomplete="off" maxlength="3" pattern="[0-9]{3}" placeholder="000" required><button class="primary" type="submit">解錠する</button></div></form><p class="message" id="lock-message" role="status"></p>`);
      $('lock-form').onsubmit=e=>{e.preventDefault();if(unlockDrawer(state,$<HTMLInputElement>('lock-code').value)){audio.play('success');reward('paper','古い紙片に、3つの記号。部屋のどこかに、これと同じしるしがありそうだ。');}else{audio.play('wrong');$('lock-message').textContent='カチリ…まだ開かない。別の数字を試してみよう。';}};
    }
  }
  if(t==='shelf'){
    if(state.shelf){openModal('本棚の隠し収納','<p>本棚の奥の収納は開いている。そこにあった紋章は、宝箱のくぼみに合いそうだ。</p>');}
    else {openModal('しるしのある本棚',`<p>${state.drawer?'5冊の本に、小さなしるし。紙片の順に押せば、何かが起こりそうだ。':'5冊の本には、異なるしるしが付いている。押す順序の手掛かりを、先に探そう。'}</p>${state.drawer?'<button class="text-button" id="read-paper">紙片を読む</button>':''}<div class="choice-row">${BOOKS.map(n=>`<button class="symbol-button" data-book="${n}" ${state.drawer?'':'disabled'}><b aria-hidden="true">${symbols[n]}</b><small>${n}</small></button>`).join('')}</div><div class="input-trail" id="sequence" aria-live="polite">${state.drawer?'本を押す順序を選ぼう。':'引き出しに手掛かりがありそうだ。'}</div><p class="message" id="sequence-message" role="status"></p>`);
      const paper=document.getElementById('read-paper');if(paper)paper.onclick=()=>showPaper(()=>investigate('shelf'));
      bindSequence('book',BOOK_ANSWER,arr=>finishBooks(state,arr),()=>reward('crest','本棚の奥で、真鍮の紋章を見つけた。所持品で選び、宝箱に使ってみよう。'));
    }
  }
  if(t==='chest'){
    if(state.chest){openModal('開いた宝箱','<p>宝箱は開いている。出口の鍵は、もう手に入れた。</p>');}
    else if(!state.crestUsed){openModal('紋章の宝箱',`<p>蓋の中央に、丸い紋章をはめるくぼみがある。4つのボタンは、まだ動かない。</p><div class="choice-row">${CRESTS.map(n=>`<button class="symbol-button" disabled><b aria-hidden="true">${symbols[n]}</b><small>${n}</small></button>`).join('')}</div><p>${state.shelf?'所持品の紋章を選び、宝箱を調べて使おう。':'くぼみに合う紋章を、部屋で探そう。'}</p>`);}
    else {openModal('紋章の宝箱',`<p>紋章がはまり、4つのボタンが動くようになった。壁の旗に、順序の手掛かりがありそうだ。</p><div class="choice-row">${CRESTS.map(n=>`<button class="symbol-button" data-crest="${n}"><b aria-hidden="true">${symbols[n]}</b><small>${n}</small></button>`).join('')}</div><div class="input-trail" id="sequence" aria-live="polite">紋章を押す順序を選ぼう。</div><p class="message" id="sequence-message" role="status"></p>`);
      bindSequence('crest',CREST_ANSWER,arr=>finishChest(state,arr),()=>reward('key','重い蓋の下には、古い鍵がひとつ。所持品で選び、出口の扉に使おう。'));
    }
  }
  if(t==='door'){openModal('出口の扉',state.doorUnlocked?`<p>鍵は開いた。扉の隙間から、朝の光が差し込んでいる。</p><div class="dialog-footer"><button class="primary" id="open-door">開ける</button></div>`:'<p>頑丈な木の扉。取っ手を引いても、びくともしない。<br>この部屋のどこかに、鍵が隠されているはずだ。</p>');
    const open=document.getElementById('open-door');if(open)open.onclick=()=>{if(!escape(state))return;persist();closeModal();phase='escape';$('hud').hidden=true;$('markers').inert=true;audio.play('escape');room?.escape(result);};
  }
  if(itemMessage)note(itemMessage);
}
function bindSequence(kind:'book'|'crest',answer:string[],solve:(a:string[])=>boolean,done:()=>void){let seq:string[]=[];
  document.querySelectorAll<HTMLButtonElement>(`[data-${kind}]`).forEach(b=>b.onclick=()=>{const value=b.dataset[kind]!;audio.play('click');seq.push(value);
    if(value!==answer[seq.length-1]){seq=[];audio.play('wrong');$('sequence').textContent='順序が戻りました。';$('sequence-message').textContent='この順ではないようだ。最初から試してみよう。';return;}
    $('sequence').textContent=seq.join(' → ');$('sequence-message').textContent='';
    if(seq.length===answer.length&&solve(seq)){audio.play('success');done();}
  });
}
function showPaper(back?:()=>void){openModal('本棚の配置を示す紙片',`<p>引き出しから見つけた紙片。3つのしるしが、左から右へ並んでいる。</p><div class="clue">${clueRow(['葉','波','炎'])}</div>${back?'<div class="dialog-footer"><button class="secondary" id="return-shelf">本棚へ戻る</button></div>':''}`,'FIELD NOTE');if(back)$('return-shelf').onclick=back;}
function hints(){if(phase!=='play')return;const next=nextPuzzle(state);
  if(next===3){openModal('扉の向こうへ',`<p>${state.doorUnlocked?'扉の鍵は開いている。出口の扉を調べて「開ける」を押そう。':'所持品の出口の鍵を選び、出口の扉を調べて使おう。'}</p>`,'HINT');return;}
  const levels=hintLevels(state),texts=stageHints(state);const level=levels[next];openModal((state.stage===1?['数字錠のヒント','本棚のヒント','宝箱のヒント']:state.stage===2?['隠れた道具のヒント','鉢の配置のヒント','光路のヒント']:['地球儀のヒント','文字暗号のヒント','星の暗号のヒント'])[next],`<p>必要なときに、少しずつ。ヒントの使用にペナルティはありません。</p><ol class="hint-list">${texts[next].slice(0,level).map(h=>`<li>${h}</li>`).join('')}</ol>${level<3?`<div class="dialog-footer"><button class="${level===2?'secondary':'primary'}" id="next-hint">${level===2?'答えを表示する（3段階目）':`ヒント${level+1}を見る`}</button></div>`:'<p>手掛かりは何度でも調べられます。</p>'}`,'HINT');
  if(level<3)$('next-hint').onclick=()=>{if(level===2){openModal('答えを表示します',`<p>次のヒントには、この仕掛けの正解が書かれています。</p><div class="dialog-footer"><button class="secondary" id="cancel-answer">戻る</button><button class="primary" id="show-answer">答えを表示する</button></div>`,'HINT');$('cancel-answer').onclick=hints;$('show-answer').onclick=()=>{levels[next]=3;persist();hints();};}else{levels[next]++;persist();hints();}};
}
function settings(){openModal('音と設定',`<p>考える時間に、心地よい音を。</p>${(['bgm','sfx'] as const).map(k=>`<div class="audio-row"><span>${k==='bgm'?'BGM':'効果音'}</span><input type="range" min="0" max="1" step=".05" value="${audio.settings[k]}" id="volume-${k}" aria-label="${k==='bgm'?'BGM':'効果音'}の音量"><label><input type="checkbox" id="mute-${k}" ${audio.settings[k==='bgm'?'bgmMuted':'sfxMuted']?'checked':''}>消音</label></div>`).join('')}<div class="dialog-footer"><button class="secondary" id="retry-audio">音の再生を試す</button><button class="secondary" id="return-title">タイトルへ</button></div><p class="message" id="audio-message" role="status"></p>`,'SETTINGS');
  for(const k of ['bgm','sfx'] as const){$<HTMLInputElement>(`volume-${k}`).oninput=e=>{audio.settings[k]=Number((e.target as HTMLInputElement).value);audio.apply();};$<HTMLInputElement>(`mute-${k}`).onchange=e=>{audio.settings[k==='bgm'?'bgmMuted':'sfxMuted']=(e.target as HTMLInputElement).checked;audio.apply();};}
  $('retry-audio').onclick=async()=>{$('audio-message').textContent=await audio.start()?'音の再生を開始しました。':'この環境では音を開始できません。このまま遊べます。';audio.play('click');};$('return-title').onclick=()=>{persist();title();};
}
function confirmReset(){openModal('最初から遊びますか？','<p>保存されているゲームの進行を初期化します。音量設定は引き継ぎます。</p><div class="dialog-footer"><button class="secondary" id="cancel-reset">戻る</button><button class="primary" id="confirm-reset">最初から始める</button></div>','NEW JOURNEY');$('cancel-reset').onclick=closeModal;$('confirm-reset').onclick=()=>begin(false);}
function result(){phase='result';$('markers').inert=true;$('hud').hidden=true;$('intro-label').hidden=true;$('result').hidden=false;
  $('result-title').textContent=state.stage===3?'完全脱出成功！':'脱出成功！';$('result-message').innerHTML=state.stage===1?'客室の扉が開いた。<br>廊下の先には、薬草の香りが漂う部屋。':state.stage===2?'物置の秘密を解き明かした。<br>最後は、星を見つめる書斎へ。':'３つの部屋の秘密が、すべてほどけた。<br>宿屋の外には、新しい朝が待っている。';$('next-stage').hidden=state.stage===3;$('next-stage').textContent=state.stage===1?'第2ステージへ':'第3ステージへ';
}
function fatal(message:string){openModal('ゲームを表示できませんでした',`<p>${message}</p><div class="dialog-footer"><button class="primary" id="reload">再読み込み</button></div>`,'NOTICE');$('reload').onclick=()=>location.reload();$('close-dialog').hidden=true;}
try{room=new Room($<HTMLCanvasElement>('world'),$('markers'),choose,fatal);room.setState(state);title();renderInventory();renderProgress();}catch(e){console.error(e);fatal('WebGL 2 を利用できません。ブラウザーのハードウェアアクセラレーションを有効にして、再読み込みしてください。');}
// Critical asset failure offers an explicit retry, never a silently blank screen.
for(const name of ['paper','crest','key','sparkle','mirror','decoder','lens','star-key']){const image=new Image();image.onerror=()=>fatal('画像を読み込めませんでした。接続を確認して再読み込みしてください。');image.src=`/assets/${name}.png`;}
$('hint').onclick=hints;$('settings').onclick=settings;$('replay').onclick=confirmReset;$('back-title').onclick=title;
$('zoom-in').onclick=()=>{room?.setZoom(.2);zoomText();};$('zoom-out').onclick=()=>{room?.setZoom(-.2);zoomText();};$('reset-view').onclick=()=>{room?.resetCamera();zoomText();};
function zoomText(){$('zoom-text').textContent=`${(room?.zoom??1).toFixed(1)}×`;}
window.addEventListener('wheel',e=>{if(phase!=='play'||modal||(e.target as HTMLElement).closest('#inventory,.tools,.view-controls'))return;e.preventDefault();room?.setZoom(e.deltaY<0?.12:-.12);zoomText();},{passive:false});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('このブラウザーでは全画面に対応していません。通常表示で遊べます。');}catch{status('全画面に切り替えられませんでした。通常表示で遊べます。');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'全画面解除':'全画面';});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal&&!$('close-dialog').hidden)closeModal();else if(selected){selected=undefined;renderInventory();}}if(e.key==='Tab'&&modal){const focusables=Array.from($('modal-root').querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
window.addEventListener('pagehide',()=>{if(state.started)persist();});

$('next-stage').onclick=()=>{if(advanceStage(state)){persist();begin(true);}};
function titleAudioState(){const playing=audio.context?.state==='running'&&!audio.settings.bgmMuted;$('title-audio').textContent=playing?'BGMを消音':'BGMを再生';$('title-audio-note').textContent=playing?'♪ 宿屋の朝 — オリジナルBGM':'ボタンまたは最初の操作で音を開始できます。';}
$('title-audio').onclick=async()=>{if(audio.context?.state==='running'&&!audio.settings.bgmMuted){audio.settings.bgmMuted=true;audio.apply();}else{audio.settings.bgmMuted=false;audio.apply();await audio.start();}titleAudioState();};
if(room){audio.start().then(titleAudioState);}
for(const event of ['pointerdown','keydown'] as const)document.addEventListener(event,e=>{if(phase==='title'&&!(e.target as HTMLElement).closest('#title-audio'))audio.start().then(titleAudioState);});
