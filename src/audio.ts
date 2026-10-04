export interface SoundSettings { bgm: number; sfx: number; bgmMuted: boolean; sfxMuted: boolean }
const defaults = (): SoundSettings => ({bgm: .35, sfx: .65, bgmMuted: false, sfxMuted: false});
export class AudioEngine {
  settings = defaults(); context?: AudioContext; music?: GainNode; effects?: GainNode;
  private timer?: number; private note = 0; private nextTime = 0;
  private theme:'title'|'inn'|'garden'|'stars'='title';
  setTheme(theme:'title'|'inn'|'garden'|'stars'){if(this.theme!==theme){this.theme=theme;this.note=0;}}
  constructor() {
    try { const d = JSON.parse(localStorage.getItem('old-inn-audio:v1') ?? '{}');
      for (const k of ['bgm','sfx'] as const) if (typeof d[k] === 'number' && Number.isFinite(d[k])) this.settings[k] = Math.max(0, Math.min(1,d[k]));
      this.settings.bgmMuted = d.bgmMuted === true; this.settings.sfxMuted = d.sfxMuted === true;
    } catch { /* audio settings are optional */ }
  }
  async start() {
    try {
      if (!this.context) { this.context = new AudioContext(); this.music = this.context.createGain(); this.effects = this.context.createGain(); this.music.connect(this.context.destination); this.effects.connect(this.context.destination); this.apply(); }
      // A blocked automatic resume must not hold up the game or its intro.
      const resumed=await Promise.race([this.context.resume().then(()=>true),new Promise<false>(resolve=>window.setTimeout(()=>resolve(false),800))]);
      if(!resumed||this.context.state!=='running')return false;
      if (!this.timer) { this.nextTime = this.context.currentTime + .08; this.timer = window.setInterval(() => this.schedule(),100); this.schedule(); }
      return true;
    } catch { return false; }
  }
  apply() {
    if (this.context) {
      this.music?.gain.setTargetAtTime(this.settings.bgmMuted ? 0 : this.settings.bgm * .24, this.context.currentTime,.05);
      this.effects?.gain.setTargetAtTime(this.settings.sfxMuted ? 0 : this.settings.sfx * .23, this.context.currentTime,.02);
    }
    try { localStorage.setItem('old-inn-audio:v1',JSON.stringify(this.settings)); } catch { /* playable without storage */ }
  }
  private tone(frequency: number, time: number, duration: number, volume: number, type: OscillatorType, bus: GainNode) {
    const ctx = this.context!; const osc=ctx.createOscillator(), gain=ctx.createGain(); osc.type=type; osc.frequency.value=frequency;
    gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(volume,time+.012); gain.gain.exponentialRampToValueAtTime(.001,time+duration);
    osc.connect(gain); gain.connect(bus); osc.start(time); osc.stop(time+duration+.05); osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  private schedule() {
    const ctx=this.context!;
    if(this.nextTime<ctx.currentTime-.5)this.nextTime=ctx.currentTime+.03;
    // 256 eighth-note steps at 96 BPM = an 80 second original seamless phrase.
    const motifs={title:[7,12,14,16,14,12,7,4,5,9,12,14,12,9,5,2,4,7,11,14,16,14,11,7,2,7,11,14,12,11,7,2],inn:[0,7,12,14,12,7,4,7,2,9,14,16,14,9,5,9,4,11,16,19,16,11,7,11,2,7,12,14,11,7,2,7],garden:[0,4,7,12,7,4,2,7,0,5,9,12,9,5,2,5,0,4,7,11,14,11,7,4,2,5,7,11,7,5,2,7],stars:[12,19,16,14,12,7,11,14,9,16,12,11,9,5,7,12,7,14,11,9,7,4,5,11,11,14,19,16,14,11,7,11]};
    const melody=motifs[this.theme], roots=this.theme==='stars'?[45,53,48,43]:[48,45,53,43];
    while(this.nextTime<ctx.currentTime+.3) {
      const n=this.note%256, bar=Math.floor(n/8), root=roots[Math.floor(bar/8)];
      const midi=root+12+melody[n%32], freq=440*2**((midi-69)/12);
      if(n%8!==7) {
        this.tone(freq,this.nextTime,this.theme==='stars'?.75:.4,n%4===0?.29:.17,'sine',this.music!);
        this.tone(freq*2,this.nextTime,.2,.025,'sine',this.music!);
      }
      if(n%4===0) { this.tone(440*2**((root-69)/12),this.nextTime,1.05,.36,'triangle',this.music!); this.tone(440*2**((root+7-69)/12),this.nextTime,.7,.1,'sine',this.music!); }
      if(n%16===0) this.tone(freq*2,this.nextTime,.85,.09,'sine',this.music!);
      if(this.theme==='title'&&n%8===0){this.tone(freq/2,this.nextTime,1.6,.11,'sine',this.music!);this.tone(freq*.5*1.005,this.nextTime,1.4,.045,'sine',this.music!);}
      this.note++; this.nextTime+=.3125;
    }
  }
  play(kind: 'click' | 'wrong' | 'success' | 'item' | 'unlock' | 'escape') {
    if(!this.context || !this.effects) return;
    const notes=kind==='wrong'?[220,174]:kind==='click'?[400]:kind==='escape'?[392,494,587,784,988]:kind==='unlock'?[294,440,587]:[523,659,784];
    notes.forEach((f,i)=>this.tone(f,this.context!.currentTime+i*.11,.3,.55,'sine',this.effects!));
  }
}
