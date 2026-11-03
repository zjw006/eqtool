/* 零资产签名音效与 TTS。换音色只需调整顶部 SOUND 参数表。 */
(function(root){
  const STORE='reactor-sound-v1';
  const SOUND={
    click:{d:.06,s:[['tone',880,.05,'square',0,0,.2]]},select:{d:.04,s:[['tone',1200,.025,'sine',0,0,.2]]},
    'play-solid':{d:.1,s:[['tone',150,.08,'sine',90,0,.5]]},
    'play-liquid':{d:.16,s:[['tone',400,.12,'sine',250,0,.35],['tone',520,.1,'sine',300,.04,.2]]},
    'play-gas':{d:.22,s:[['noise',.2,2000,6000,0,.2,'highpass']]},
    play:{d:.12,s:[['tone',440,.1,'sine',660,0,.3]]},turn:{d:.3,s:[['tone',440,.12,'sine',0,0,.25],['tone',660,.15,'sine',0,.1,.25]]},
    win:{d:.6,s:[['tone',523,.2,'sine',0,0,.3],['tone',659,.2,'sine',0,.13,.3],['tone',784,.2,'sine',0,.26,.3]]},
    lose:{d:.6,s:[['tone',523,.2,'sine',0,0,.25],['tone',440,.2,'sine',0,.13,.25],['tone',349,.2,'sine',0,.26,.25]]},
    'zinc-acid':{reaction:1,d:.65,s:[['bubble',6,1200],['tone',200,.08,'sine',120,0,.2]]},
    'hydrogen-flame':{reaction:1,d:.7,s:[['noise',.35,5000,300,0,.5],['tone',60,.45,'sine',35,0,.65]]},
    'sodium-sparks':{reaction:1,d:.7,s:[['metal',880],['noise',.4,6000,1200,.04,.2,'highpass']]},
    electrolysis:{reaction:1,d:.8,s:[['tone',50,.65,'sawtooth',50,0,.25],['bubble',6,800]]},
    'copper-reduction':{reaction:1,d:.55,s:[['tone',220,.4,'sine',180,0,.25],['bubble',3,650]]},
    'methane-inferno':{reaction:1,d:1,s:[['noise',.75,7000,100,0,.65],['tone',48,.8,'sawtooth',30,0,.65],['bubble',5,300]]},
    'lime-cloud':{reaction:1,d:.65,s:[['noise',.45,700,90,0,.35],['noise',.4,1800,500,.1,.15]]},
    'neutral-ripple':{reaction:1,d:.8,s:[['tone',220,.65,'sine',222,0,.12],['tone',330,.65,'sine',332,.03,.09]]},
    'iron-plating':{reaction:1,d:.65,s:[['metal',620],['metal',930]]},
    'silver-floc':{reaction:1,d:.65,s:[['bubble',8,1700],['noise',.35,3000,800,0,.12,'highpass']]},
    'sodium-blast':{reaction:1,d:1.05,s:[['noise',.7,8000,80,0,.75],['tone',60,.8,'sine',28,0,.8]]},
    'chlorine-blast':{reaction:1,d:1.1,s:[['noise',.55,6500,150,0,.6],['noise',.8,5000,7000,.18,.25,'highpass'],['tone',58,.55,'sine',32,0,.6]]}
  };
  class ReactorAudio{
    constructor(){this.ctx=null;this.activeReactions=0;this.speechPending=0;this.speechGeneration=0;this.speechWaiters=[];let saved={};try{saved=JSON.parse(localStorage.getItem(STORE)||'{}');}catch(_){}this.sfx=saved.sfx!==false;this.voice=saved.voice!==false;this.guide=saved.guide!==false;}
    save(){try{localStorage.setItem(STORE,JSON.stringify({sfx:this.sfx,voice:this.voice,guide:this.guide}));}catch(_){}}
    unlock(){this.ensure();if(this.ctx)this.ctx.resume();if(root.speechSynthesis)root.speechSynthesis.getVoices();}
    setSfx(on){this.sfx=on;this.ensure();if(this.ctx){this.ctx.resume();this.master.gain.setTargetAtTime(on ? .3:0,this.ctx.currentTime,.015);}this.save();}
    setVoice(on){this.voice=on;if(!on)this.cancelSpeech();this.save();}
    setGuide(on){this.guide=on;this.save();}
    ensure(){if(this.ctx)return;const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.sfx ? .3:0;this.comp=this.ctx.createDynamicsCompressor();this.master.connect(this.comp);this.comp.connect(this.ctx.destination);}
    tone(freq,duration,type='sine',endFreq=0,delay=0,volume=.35,up=1){
      if(!this.sfx)return;this.ensure();if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq*up),t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq*up),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);
    }
    noise(duration,from,to,delay=0,volume=.3,filter='lowpass'){
      if(!this.sfx)return;this.ensure();if(!this.ctx)return;const length=this.ctx.sampleRate*duration,b=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
      const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain(),t=this.ctx.currentTime+delay;s.buffer=b;f.type=filter;f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(to,t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);
    }
    bubble(count,base,up){for(let i=0;i<count;i++)this.tone((base+i*170)*up,.07,'sine',(base+i*130)*up,i*.055,.2);}
    metal(base,up){[0,1,2].forEach(i=>{this.tone(base*(i+1)*up,.12,'square',base*.8*up,i*.07,.16);this.tone(base*1.51*up,.09,'sine',0,i*.07,.1);});}
    play(type,chain=1){
      const r=SOUND[type];if(!r||!this.sfx)return;const up=Math.pow(2,(chain-1)/12);
      if(r.reaction&&this.activeReactions>=2){setTimeout(()=>this.play(type,chain),200);return;}
      if(r.reaction){this.activeReactions++;setTimeout(()=>this.activeReactions--,r.d*1000+80);}
      r.s.forEach(step=>{const[k,...a]=step;if(k==='tone')this.tone(...a,up);else if(k==='noise')this.noise(...a);else if(k==='bubble')this.bubble(...a,up);else if(k==='metal')this.metal(...a,up);});
      if(r.reaction)this.tone(200,.07,'sine',120,0,.2);
    }
    cancelSpeech(){
      this.speechGeneration++;this.speechPending=0;const waiters=this.speechWaiters.splice(0);waiters.forEach(resolve=>resolve());if(root.speechSynthesis)root.speechSynthesis.cancel();
    }
    waitForSpeech(){if(!this.speechPending)return Promise.resolve();return new Promise(resolve=>this.speechWaiters.push(resolve));}
    speak(text,queue=false){
      if(!this.voice||!root.speechSynthesis||!text)return Promise.resolve();if(!queue)this.cancelSpeech();const generation=this.speechGeneration;this.speechPending++;
      return new Promise(resolve=>{
        let settled=false,timer=null;const done=()=>{if(settled)return;settled=true;clearTimeout(timer);if(generation===this.speechGeneration){this.speechPending=Math.max(0,this.speechPending-1);if(!this.speechPending){const waiters=this.speechWaiters.splice(0);waiters.forEach(notify=>notify());}}resolve();};
        const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=1.05;const zh=root.speechSynthesis.getVoices().find(v=>v.lang==='zh-CN');if(zh)u.voice=zh;u.onend=done;u.onerror=done;timer=setTimeout(done,Math.max(2200,text.length*300+1200));root.speechSynthesis.speak(u);
      });
    }
  }
  root.ReactorAudio=ReactorAudio;
})(typeof window!=='undefined'?window:globalThis);
