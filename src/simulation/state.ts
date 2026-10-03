export type Item = 'paper' | 'crest' | 'key' | 'mirror' | 'decoder' | 'lens';
export type Target = 'painting' | 'memo' | 'desk' | 'shelf' | 'flag' | 'chest' | 'door' | 'bed' | 'crates' | 'rug' | 'plants' | 'mirrorStand' | 'cache' | 'window' | 'globe' | 'starChart' | 'cipherDesk' | 'telescope' | 'lexicon';
export type Stage = 1 | 2 | 3;
export type Plant = 'leaf' | 'flower' | 'fruit';
export interface Garden { crateMoved:boolean; mirrorTaken:boolean; rugLifted:boolean; pots:(Plant|null)[]; mirrorPlaced:boolean; mirrorAngle:number; keyTaken:boolean; hints:[number,number,number] }
export interface Observatory { globeMoved:boolean; decoderTaken:boolean; chartMoved:boolean; decoderUsed:boolean; wheel:number; cipherSolved:boolean; lensTaken:boolean; lensUsed:boolean; bearing:number; keyTaken:boolean; hints:[number,number,number] }
export interface Progress {
  version: 2; stage:Stage; cleared:[boolean,boolean,boolean]; garden:Garden; observatory:Observatory; started: boolean; drawer: boolean; shelf: boolean; crestUsed: boolean;
  chest: boolean; doorUnlocked: boolean; escaped: boolean; hints: [number, number, number];
}
export const fresh = (): Progress => ({ version: 2, stage:1, cleared:[false,false,false], garden:{crateMoved:false,mirrorTaken:false,rugLifted:false,pots:[null,null,null],mirrorPlaced:false,mirrorAngle:0,keyTaken:false,hints:[0,0,0]}, observatory:{globeMoved:false,decoderTaken:false,chartMoved:false,decoderUsed:false,wheel:0,cipherSolved:false,lensTaken:false,lensUsed:false,bearing:0,keyTaken:false,hints:[0,0,0]}, started: false, drawer: false, shelf: false, crestUsed: false, chest: false, doorUnlocked: false, escaped: false, hints: [0, 0, 0] });
export const SAVE_KEY = 'old-inn-escape:v1';
export const BOOKS = ['葉', '波', '炎', '山', '雪'] as const;
export const CRESTS = ['太陽', '月', '星', '王冠'] as const;
export const BOOK_ANSWER = ['葉', '波', '炎'];
export const CREST_ANSWER = ['月', '王冠', '太陽', '星'];
export const HINTS = [
  ['壁の絵と机のメモを見比べてみよう。', 'メモの順に、絵の太陽・月・星の数を入力しよう。', '太陽は2個、月は4個、星は3個。答えは243。'],
  ['引き出しの紙片が、本棚の手掛かりになりそう。', '紙片の記号と同じ背表紙を、左から順に押そう。', '葉の本、波の本、炎の本の順に押そう。'],
  ['宝箱には紋章をはめる場所がある。壁の旗も調べてみよう。', '紋章をはめたら、旗を上から読んで同じ順に押そう。', '月、王冠、太陽、星の順に押そう。'],
] as const;
export function inventory(s: Progress): Item[] {
  if(s.stage===2)return [...(s.garden.mirrorTaken&&!s.garden.mirrorPlaced?['mirror' as Item]:[]),...(s.garden.keyTaken&&!s.doorUnlocked?['key' as Item]:[])];
  if(s.stage===3)return [...(s.observatory.decoderTaken&&!s.observatory.decoderUsed?['decoder' as Item]:[]),...(s.observatory.lensTaken&&!s.observatory.lensUsed?['lens' as Item]:[]),...(s.observatory.keyTaken&&!s.doorUnlocked?['key' as Item]:[])];
  return [...(s.drawer ? ['paper' as Item] : []), ...(s.shelf && !s.crestUsed ? ['crest' as Item] : []), ...(s.chest && !s.doorUnlocked ? ['key' as Item] : [])];
}
export function nextPuzzle(s: Progress): 0 | 1 | 2 | 3 { if(s.stage===2)return !s.garden.mirrorTaken?0:!plantsSolved(s)?1:!s.garden.keyTaken?2:3; if(s.stage===3)return !s.observatory.decoderTaken?0:!s.observatory.lensTaken?1:!s.observatory.keyTaken?2:3; return !s.drawer ? 0 : !s.shelf ? 1 : !s.chest ? 2 : 3; }
export function unlockDrawer(s: Progress, code: string): boolean { if (s.stage!==1 || s.drawer || code !== '243') return false; s.drawer = true; return true; }
export function finishBooks(s: Progress, input: string[]): boolean {
  if (s.stage!==1 || !s.drawer || s.shelf || input.join('|') !== BOOK_ANSWER.join('|')) return false;
  s.shelf = true; return true;
}
export function finishChest(s: Progress, input: string[]): boolean {
  if (s.stage!==1 || !s.crestUsed || s.chest || input.join('|') !== CREST_ANSWER.join('|')) return false;
  s.chest = true; return true;
}
export function useItem(s: Progress, item: Item, target: Target): boolean {
  if (!inventory(s).includes(item)) return false;
  if (s.stage===1 && item === 'crest' && target === 'chest') { s.crestUsed = true; return true; }
  if (s.stage===2 && item==='mirror' && target==='mirrorStand' && plantsSolved(s)) {s.garden.mirrorPlaced=true;return true;}
  if (s.stage===3 && item==='decoder' && target==='cipherDesk') {s.observatory.decoderUsed=true;return true;}
  if (s.stage===3 && item==='lens' && target==='telescope') {s.observatory.lensUsed=true;return true;}
  if (item === 'key' && target === 'door') { s.doorUnlocked = true; return true; }
  return false;
}
export function escape(s: Progress): boolean { if (!s.doorUnlocked || s.escaped) return false; s.escaped = true;s.cleared[s.stage-1]=true; return true; }
export function advanceStage(s:Progress):boolean {if(!s.escaped||s.stage===3)return false;s.stage=(s.stage+1) as Stage;s.escaped=false;s.doorUnlocked=false;return true;}
export function moveCrate(s:Progress):boolean {if(s.stage!==2||s.garden.crateMoved)return false;s.garden.crateMoved=true;return true;}
export function takeMirror(s:Progress):boolean {if(s.stage!==2||!s.garden.crateMoved||s.garden.mirrorTaken)return false;s.garden.mirrorTaken=true;return true;}
export function liftRug(s:Progress):boolean {if(s.stage!==2||s.garden.rugLifted)return false;s.garden.rugLifted=true;return true;}
export function plantsSolved(s:Progress):boolean {return s.garden.rugLifted&&s.garden.pots.join('|')==='leaf|flower|fruit';}
export function placePlant(s:Progress,plant:Plant,slot:number):boolean {
  if(s.stage!==2||plantsSolved(s)||!['leaf','flower','fruit'].includes(plant)||!Number.isInteger(slot)||slot<0||slot>2)return false;
  const from=s.garden.pots.indexOf(plant),displaced=s.garden.pots[slot];
  if(from>=0)s.garden.pots[from]=displaced;s.garden.pots[slot]=plant;return true;
}
export function turnMirror(s:Progress,angle:number):boolean {if(s.stage!==2||!s.garden.mirrorPlaced||s.garden.keyTaken||!Number.isInteger(angle)||angle<0||angle>2)return false;s.garden.mirrorAngle=angle;return true;}
export function takeGardenKey(s:Progress):boolean {if(s.stage!==2||!plantsSolved(s)||!s.garden.mirrorPlaced||s.garden.mirrorAngle!==2||s.garden.keyTaken)return false;s.garden.keyTaken=true;return true;}
export function moveGlobe(s:Progress):boolean {if(s.stage!==3||s.observatory.globeMoved)return false;s.observatory.globeMoved=true;return true;}
export function takeDecoder(s:Progress):boolean {if(s.stage!==3||!s.observatory.globeMoved||s.observatory.decoderTaken)return false;s.observatory.decoderTaken=true;return true;}
export function moveChart(s:Progress):boolean {if(s.stage!==3||s.observatory.chartMoved)return false;s.observatory.chartMoved=true;return true;}
export function turnDecoder(s:Progress,shift:number):boolean {if(s.stage!==3||!s.observatory.decoderUsed||s.observatory.cipherSolved||!Number.isInteger(shift)||shift<0||shift>25)return false;s.observatory.wheel=shift;return true;}
export function caesar(text:string,shift:number):string {return text.replace(/[A-Z]/g,c=>String.fromCharCode(65+(c.charCodeAt(0)-65-shift+26)%26));}
export function solveCipher(s:Progress,answer:string):boolean {if(s.stage!==3||!s.observatory.decoderUsed||!s.observatory.chartMoved||s.observatory.wheel!==3||s.observatory.cipherSolved||answer.trim().toUpperCase()!=='MOON')return false;s.observatory.cipherSolved=true;return true;}
export function takeLens(s:Progress):boolean {if(s.stage!==3||!s.observatory.cipherSolved||s.observatory.lensTaken)return false;s.observatory.lensTaken=true;return true;}
export function turnTelescope(s:Progress,bearing:number):boolean {if(s.stage!==3||!s.observatory.lensUsed||s.observatory.keyTaken||!Number.isInteger(bearing)||bearing<0||bearing>7)return false;s.observatory.bearing=bearing;return true;}
export function solveStars(s:Progress,answer:string):boolean {if(s.stage!==3||!s.observatory.lensUsed||s.observatory.bearing!==1||s.observatory.keyTaken||answer.trim().toUpperCase()!=='KEY')return false;s.observatory.keyTaken=true;return true;}
export const stageTitles=['旅人の客室','薬草の物置','星見の書斎'] as const;
export const GARDEN_HINTS=[['荷物の下も調べてみよう。動かせる木箱がある。','木箱を右へ動かすと、小さな鏡が見つかる。','木箱をドラッグして動かし、隠れていた鏡を取ろう。'],['敷物の端が浮いている。床の図が鉢の配置を教えてくれそう。','敷物をめくり、水・光・土と植物の対応を見よう。','葉の鉢を水、花の鉢を光、実の鉢を土へ移そう。'],['鉢を揃えると鏡台の覆いが開く。窓の光を利用しよう。','鏡を鏡台に使い、葉の扉へ光を向けよう。','鏡を右向きに回すと隠し戸が開く。中の鍵を取ろう。']] as const;
export const OBSERVATORY_HINTS=[['地球儀の脚の下に、何か挟まっている。','地球儀を横へ動かして、円盤を取り出そう。','地球儀を右へ動かすと、解読円盤を取れる。'],['星図の裏に文字を戻す数が隠されている。','円盤を暗号机に使い、アルファベットを3文字戻そう。','PRRQを3文字戻すとMOON。解読後、星図の月の小箱からレンズを取ろう。'],['星図に観測する方角、符号表に点と線の読み方がある。','レンズを望遠鏡に使い、北東の白鳥に向けよう。','北東で見える −・− / ・ / −・−− はKEY。望遠鏡にKEYと入力して鍵を取ろう。']] as const;
export function stageHints(s:Progress){return s.stage===1?HINTS:s.stage===2?GARDEN_HINTS:OBSERVATORY_HINTS;}
export function hintLevels(s:Progress){return s.stage===1?s.hints:s.stage===2?s.garden.hints:s.observatory.hints;}
export function decodeSave(raw: string | null): Progress {
  try {
    const d = JSON.parse(raw ?? 'null');
    if (!d || ![1,2].includes(d.version) || (d.version===2&&![1,2,3].includes(d.stage))) return fresh();
    const s = fresh();
    s.started = d.started === true;
    s.drawer = s.started && d.drawer === true;
    s.shelf = s.drawer && d.shelf === true;
    s.crestUsed = s.shelf && d.crestUsed === true;
    s.chest = s.crestUsed && d.chest === true;
    const hints=(v:unknown):[number,number,number]=>[0,1,2].map(i=>Array.isArray(v)&&Number.isInteger(v[i])?Math.max(0,Math.min(3,v[i])):0) as [number,number,number];
    const integer=(v:unknown,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max?v:0;
    s.hints=hints(d.hints);
    const g=d.garden??{},o=d.observatory??{};
    s.cleared[0]=s.chest&&(d.version===1?(d.doorUnlocked===true&&d.escaped===true):d.cleared?.[0]===true);
    if(s.cleared[0]){
      s.garden.crateMoved=g.crateMoved===true;s.garden.mirrorTaken=s.garden.crateMoved&&g.mirrorTaken===true;s.garden.rugLifted=g.rugLifted===true;
      const seen=new Set();s.garden.pots=[0,1,2].map(i=>{const p=g.pots?.[i];if(['leaf','flower','fruit'].includes(p)&&!seen.has(p)){seen.add(p);return p;}return null;});
      s.garden.mirrorPlaced=plantsSolved(s)&&s.garden.mirrorTaken&&g.mirrorPlaced===true;s.garden.mirrorAngle=integer(g.mirrorAngle,2);
      s.garden.keyTaken=s.garden.mirrorPlaced&&s.garden.mirrorAngle===2&&g.keyTaken===true;s.garden.hints=hints(g.hints);s.cleared[1]=s.garden.keyTaken&&d.cleared?.[1]===true;
    }
    if(s.cleared[1]){
      s.observatory.globeMoved=o.globeMoved===true;s.observatory.decoderTaken=s.observatory.globeMoved&&o.decoderTaken===true;s.observatory.chartMoved=o.chartMoved===true;
      s.observatory.decoderUsed=s.observatory.decoderTaken&&o.decoderUsed===true;s.observatory.wheel=integer(o.wheel,25);
      s.observatory.cipherSolved=s.observatory.decoderUsed&&s.observatory.chartMoved&&s.observatory.wheel===3&&o.cipherSolved===true;
      s.observatory.lensTaken=s.observatory.cipherSolved&&o.lensTaken===true;s.observatory.lensUsed=s.observatory.lensTaken&&o.lensUsed===true;s.observatory.bearing=integer(o.bearing,7);
      s.observatory.keyTaken=s.observatory.lensUsed&&s.observatory.bearing===1&&o.keyTaken===true;s.observatory.hints=hints(o.hints);s.cleared[2]=s.observatory.keyTaken&&d.cleared?.[2]===true;
    }
    s.stage=d.version===2&&d.stage===3&&s.cleared[1]?3:d.version===2&&d.stage>=2&&s.cleared[0]?2:1;
    const keyReady=s.stage===1?s.chest:s.stage===2?s.garden.keyTaken:s.observatory.keyTaken;
    s.doorUnlocked=keyReady&&d.doorUnlocked===true;s.escaped=s.doorUnlocked&&d.escaped===true;
    s.cleared[s.stage-1]=s.escaped;
    return s;
  } catch { return fresh(); }
}
export function loadProgress(): Progress { try { return decodeSave(localStorage.getItem(SAVE_KEY)); } catch { return fresh(); } }
export function saveProgress(s: Progress): boolean { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch { return false; } }
