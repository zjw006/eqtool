/* DOM、交互与表现层；所有数值预测与判定均委托 engine.js。 */
(function(root){
  const D=root.ReactorData,$=id=>document.getElementById(id);
  class ReactorUI{
    constructor(game,sound){
      this.game=game;this.sound=sound;this.mode='pvp';this.thinking=false;this.onAITurn=null;this.onRestart=null;this.onPlayerPlay=null;this.onGuideRequest=null;this.onGuideSetting=null;
      this.guideCardIds=[];this.selected=null;this.previewResult=null;this.toastTimer=null;this.longTimer=null;this.suppressClick=false;this.fxTimer=null;this.impactTimer=null;this.labelTimer=null;this.presenting=false;this.endingTurn=false;this.pendingChoiceAfterHandoff=false;this.presentationSeq=0;this.presentationPromise=Promise.resolve();
      $('sfx-toggle').checked=sound.sfx;$('voice-toggle').checked=sound.voice;$('guide-toggle').checked=sound.guide;this.buildRules();this.bind();this.render();
    }
    bind(){
      $('title-rules-btn').onclick=$('rules-btn').onclick=()=>this.show('rules-modal');
      $('sound-btn').onclick=$('title-sound-btn').onclick=()=>this.show('sound-modal');
      document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>this.hide(b.dataset.close));
      $('sfx-toggle').onchange=e=>this.sound.setSfx(e.target.checked);$('voice-toggle').onchange=e=>this.sound.setVoice(e.target.checked);
      $('guide-toggle').onchange=e=>{this.sound.setGuide(e.target.checked);if(!e.target.checked)this.clearGuide();if(this.onGuideSetting)this.onGuideSetting(e.target.checked);this.render();};
      $('guide-btn').onclick=()=>{if(this.onGuideRequest)this.onGuideRequest();};
      $('pause-btn').onclick=()=>{if(!$('title-screen').classList.contains('visible')&&this.game.winner===null)this.show('pause-screen');};
      $('resume-btn').onclick=()=>this.hide('pause-screen');$('restart-btn').onclick=$('restart-pause-btn').onclick=()=>this.restart();
      $('end-turn').onclick=()=>this.endTurn();$('continue-btn').onclick=()=>{this.hide('handoff');this.render();if(this.pendingChoiceAfterHandoff){this.pendingChoiceAfterHandoff=false;this.showOpponentDiscard(true);}};
      $('reactor').onclick=e=>{if(e.target.closest('.token')||e.target.closest('#reaction-label'))return;this.playSelected();};
      $('reactor').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.playSelected();}};
      $('reactor-zone').onclick=e=>{if(e.target===$('reactor-zone'))this.cancelSelection();};
      $('reaction-label').onclick=()=>$('reaction-label').classList.remove('show');
      document.addEventListener('pointerdown',e=>{if(this.selected&&!e.target.closest('.card,#reactor,.modal,button'))this.cancelSelection();});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'){this.cancelSelection();document.querySelectorAll('.modal.visible').forEach(m=>{if(m.id!=='choice-modal')this.hide(m.id);});}});
    }
    show(id){$(id).classList.add('visible');}hide(id){$(id).classList.remove('visible');}
    isHumanTurn(){return this.mode==='pvp'||this.game.current===0;}
    displayName(id){return this.mode==='pve'?(id?'AI':'玩家'):this.game.players[id].name;}
    setThinking(on){this.thinking=on;$('opponent-panel').classList.toggle('thinking',on);if(this.mode==='pve')$('opponent-hand-count').textContent=on?'对手思考中…':this.game.players[1].hand.length+' 张手牌';}
    showGuide(suggestion){this.guideCardIds=suggestion.cardIds||[];$('guide-text').textContent=suggestion.reason;$('guide-bubble').classList.add('visible');this.renderHand();const p=this.game.players[0],index=p.hand.findIndex(h=>this.guideCardIds.includes(h.id));$('guide-bubble').style.setProperty('--hint-x',index<0?'50%':((index+.5)/Math.max(1,p.hand.length)*100)+'%');const spoken=[suggestion.speak,suggestion.reason].filter((text,i,a)=>text&&a.indexOf(text)===i).join('。');this.sound.speak(spoken,true).then(()=>{if(!this.presenting)this.render();});this.render();}
    clearGuide(){this.guideCardIds=[];$('guide-bubble').classList.remove('visible');this.renderHand();}
    setTutorial(on){$('tutorial-strip').classList.toggle('visible',!!on);}
    cancelSelection(){if(!this.selected)return;this.selected=null;this.previewResult=null;this.render();}
    resetPresentation(){this.presentationSeq++;this.presenting=false;this.presentationPromise=Promise.resolve();this.sound.cancelSpeech();clearTimeout(this.fxTimer);clearTimeout(this.labelTimer);$('fx').className='fx';$('fx').innerHTML='';$('reaction-label').classList.remove('show');}
    async waitForPresentation(){while(this.presenting||this.sound.speechPending){await this.presentationPromise;await this.sound.waitForSpeech();}}
    restart(){if(this.onRestart)this.onRestart();this.resetPresentation();this.game.reset();this.selected=null;this.previewResult=null;this.setThinking(false);this.clearGuide();this.setTutorial(false);['gameover','pause-screen','handoff','choice-modal'].forEach(id=>this.hide(id));this.render();this.toast('新实验已就绪');}
    async endTurn(){
      if(!this.isHumanTurn()||this.endingTurn)return;if(this.presenting||this.sound.speechPending){this.toast('请等待播报和特效结束');return;}this.endingTurn=true;this.clearGuide();this.setTutorial(false);this.selected=null;this.previewResult=null;this.render();
      try{
        if(this.game.players[this.game.current].hand.length>this.game.handLimit){const move=this.game.chooseOverflow();if(!move){this.toast('请先处理釜容量');return;}this.toast('手牌溢出：系统灌入'+D.CARD_MAP[move.cardId].name);const res=this.game.resolveOverflow(move);if(!this.accept(res))return;if(this.game.pending)return;await this.waitForPresentation();if(this.game.winner!==null)return;}
        const res=this.game.endTurn();if(!this.accept(res))return;if(this.game.winner!==null)return;
        if(this.mode==='pvp'){$('next-player').textContent=this.game.players[this.game.current].name+' 的回合';this.show('handoff');this.sound.play('turn');this.sound.speak(D.GUIDE.handoff(this.game.players[this.game.current].name));}
        else{this.setThinking(true);if(this.onAITurn)this.onAITurn();}
      }finally{this.endingTurn=false;this.render();}
    }
    selectCard(uid){
      if(!this.isHumanTurn()||this.game.pending||this.game.winner!==null)return;
      if(this.selected===uid){this.cancelSelection();this.sound.play('select');return;}
      this.selected=uid;this.previewResult=this.makePreview();this.sound.play('select');this.render();const c=this.card(this.selected);if(c.id==='antimatter')this.toast('点击釜内一个物质进行湮灭');
    }
    card(uid){const p=this.game.players[this.mode==='pve'?0:this.game.current],h=p.hand.find(c=>c.uid===uid);return h&&D.CARD_MAP[h.id];}
    makePreview(){
      const c=this.card(this.selected);if(!c)return null;
      if(c.id==='philosopher'||c.id==='quantum')return{ok:true,special:true,cardId:c.id,highlightUids:[],partnerIds:[],danger:false};
      if(c.id==='antimatter'&&!this.game.reactor.length)return{ok:true,special:true,cardId:c.id,highlightUids:[],partnerIds:[],danger:false};
      if(c.id==='antimatter')return this.game.preview(this.selected,{targetUid:this.game.reactor[0].uid});
      return this.game.preview(this.selected);
    }
    previewText(){
      const p=this.previewResult,c=this.card(this.selected);if(!p||!c)return'';
      if(p.special){if(c.id==='philosopher')return'选择要转化的物质后确认投放';if(c.id==='quantum')return'选择一个只差条件的反应后立即结算';return this.game.reactor.length?'选择釜内目标：湮灭并造成伤害':'釜内暂无可湮灭物质';}
      if(!p.ok)return'⚠ '+p.error;const formula=c.formula;
      if(p.reactions.length){const result=[p.damage?`敌 −${p.damage}`:'',p.selfDamage?`自己 −${p.selfDamage}`:'',p.heal?`自己 +${p.heal}`:''].filter(Boolean).join('，');return`${p.danger?'⚠ ':''}加入 ${formula} → ${p.chain>1?'连锁 ×'+p.chain+'，':''}${result||'触发反应'}。${p.reason}`;}
      if(p.damage)return`加入 ${formula} → 敌 −${p.damage}。`;
      const partners=p.partnerIds.map(id=>D.CARD_MAP[id].formula).filter((v,i,a)=>a.indexOf(v)===i).join('、');return`加入 ${formula} → 暂无反应。${partners?'可反应对象：'+partners:'等待其他牌配合。'}`;
    }
    renderPreview(){const bar=$('preview-bar'),show=!!this.selected&&!!this.previewResult;bar.classList.toggle('visible',show);bar.classList.toggle('danger',!!this.previewResult?.danger||!!this.previewResult&&!this.previewResult.ok);bar.textContent=show?this.previewText():'';}
    playSelected(){
      if(!this.isHumanTurn())return;if(!this.selected){if(this.game.reactor.length>=8)this.toast('釜已满：点击一个圆片弃置');return;}
      const c=this.card(this.selected);if(!c){this.cancelSelection();return;}
      if(c.id==='philosopher'){this.choice('贤者之石','选择要转化并放入釜内的物质',D.MATERIAL_IDS.map(id=>({id,title:D.CARD_MAP[id].formula,subtitle:D.CARD_MAP[id].name,color:D.CARD_MAP[id].color})),id=>this.attemptPlay({targetId:id}),true);return;}
      if(c.id==='quantum'){const ids=this.game.quantumTargets();if(!ids.length){this.toast('当前没有只差条件的反应');this.pulseReactor();return;}this.choice('量子隧穿','无视条件，立即触发一个反应',ids.map(id=>{const r=D.REACTIONS.find(x=>x.id===id);return{id,title:'#'+id+' '+r.equation,subtitle:r.reason,color:'#FF6FD8',wide:true};}),id=>this.attemptPlay({reactionId:id}),true);return;}
      if(c.id==='antimatter'){this.toast('请点击釜内一个物质圆片');this.pulseReactor();return;}this.attemptPlay();
    }
    attemptPlay(options={}){
      const playedCardId=this.card(this.selected)?.id,res=this.game.playCard(this.selected,options);if(!res.ok){this.accept(res);this.pulseReactor();return;}
      this.selected=null;this.previewResult=null;this.hide('choice-modal');this.accept(res);if(this.onPlayerPlay)this.onPlayerPlay(playedCardId);
    }
    accept(res){if(!res.ok){this.toast(res.error);return false;}this.render();this.animate(res.events);if(this.game.pending&&(this.mode==='pvp'||this.game.pending.player===0))setTimeout(()=>this.showOpponentDiscard(),Math.min(500,res.events.length*180));if(this.game.winner!==null)this.waitForPresentation().then(()=>this.showGameOver());return true;}
    tokenClick(uid){
      if(!this.isHumanTurn())return;if(this.selected&&this.card(this.selected)?.id==='antimatter'){this.attemptPlay({targetUid:uid});return;}
      const res=this.game.discardReactor(uid);if(!this.accept(res))this.toast(res.error);
    }
    showOpponentDiscard(afterHandoff=false){
      if(!this.game.pending)return;const p=this.game.players[this.game.pending.player];
      if(this.mode==='pvp'&&!afterHandoff){this.pendingChoiceAfterHandoff=true;$('next-player').textContent=p.name+' 选择一张手牌灌入';this.show('handoff');return;}
      const finalize=(uid,options={})=>{const res=this.game.chooseOpponentDiscard(uid,options);if(res.ok)this.hide('choice-modal');this.accept(res);if(!res.ok)return;if(this.mode==='pvp'&&this.game.winner===null){$('next-player').textContent=this.game.players[this.game.current].name+' 的回合';this.show('handoff');}else if(this.mode==='pve'&&this.game.current===1&&this.onAITurn)this.onAITurn();else if(this.onGuideRequest)this.onGuideRequest(true);};
      const prepare=(uid,options={})=>{const c=D.CARD_MAP[p.hand.find(h=>h.uid===uid)?.id];if(!c)return;
        if(c.id==='philosopher'&&!options.targetId){this.choice('贤者之石','选择要转化并放入釜内的物质',D.MATERIAL_IDS.map(id=>({id,title:D.CARD_MAP[id].formula,subtitle:D.CARD_MAP[id].name,color:D.CARD_MAP[id].color})),targetId=>prepare(uid,{...options,targetId}),false);return;}
        if(c.id==='quantum'&&!options.reactionId){const ids=this.game.quantumTargets();if(ids.length){this.choice('量子隧穿','选择要立即触发的反应',ids.map(id=>{const r=D.REACTIONS.find(x=>x.id===id);return{id,title:'#'+id+' '+r.equation,subtitle:r.reason,color:'#FF6FD8',wide:true};}),reactionId=>prepare(uid,{...options,reactionId}),false);return;}}
        if(c.id==='antimatter'&&!options.targetUid&&this.game.reactor.length){this.choice('反物质氢','选择釜内要湮灭的物质',this.game.reactor.map(t=>({id:t.uid,title:D.CARD_MAP[t.id].formula,subtitle:D.CARD_MAP[t.id].name,color:D.CARD_MAP[t.id].color})),targetUid=>prepare(uid,{...options,targetUid}),false);return;}
        if((c.type==='material'||c.id==='philosopher')&&this.game.reactor.length>=8&&!options.discardUid){this.choice('釜已满','先选择一个釜内物质弃置',this.game.reactor.map(t=>({id:t.uid,title:D.CARD_MAP[t.id].formula,subtitle:D.CARD_MAP[t.id].name,color:D.CARD_MAP[t.id].color})),discardUid=>prepare(uid,{...options,discardUid}),false);return;}finalize(uid,options);
      };
      this.choice(p.name+'：选择手牌灌入','氯化银沉淀干扰：自选一张手牌置入公共釜，不耗能量',p.hand.map(c=>{const d=D.CARD_MAP[c.id];return{id:c.uid,title:d.formula,subtitle:d.name,color:d.color};}),uid=>prepare(uid),false);
    }
    choice(title,desc,options,callback,dismissible){
      $('choice-title').textContent=title;$('choice-desc').textContent=desc;const box=$('choice-options');box.innerHTML='';
      options.forEach(o=>{const b=document.createElement('button');b.className='choice-option'+(o.wide?' wide':'');b.style.setProperty('--color',o.color||'#fff');b.innerHTML=`<b>${o.title}</b><span>${o.subtitle||''}</span>`;b.onclick=()=>callback(o.id);box.appendChild(b);});
      if(dismissible){const b=document.createElement('button');b.className='choice-option wide';b.innerHTML='<b>取消</b><span>保留这张牌</span>';b.onclick=()=>this.hide('choice-modal');box.appendChild(b);}this.show('choice-modal');
    }
    render(){
      const g=this.game,p=g.players[this.mode==='pve'?0:g.current],o=g.players[this.mode==='pve'?1:1-g.current];
      $('round').textContent='回合 '+g.round;$('deck-count').textContent='牌库 '+g.deck.length;$('opponent-name').textContent=this.displayName(this.mode==='pve'?1:1-g.current);$('opponent-hp').textContent=o.hp;this.health($('opponent-health'),o.hp);
      $('current-pill').textContent=this.mode==='pve'?(g.current?'AI 的回合':'你的回合')+' · '+p.hp+' 耐久':p.name+' · '+p.hp+' 耐久';$('hand-count').textContent=p.hand.length+' / '+g.handLimit+(p.hand.length>g.handLimit?' · 结束需灌入':'') ;$('opponent-hand-count').textContent=this.thinking?'对手思考中…':o.hand.length+' 张手牌';
      $('opponent-hand').innerHTML=o.hand.map(()=>'<i class="card-back"></i>').join('');$('energy').innerHTML=Array.from({length:Math.max(3,g.energy)},(_,i)=>`<i class="${i<g.energy?'on':''}"></i>`).join('');$('energy').setAttribute('aria-label','剩余能量 '+g.energy);$('catalyst-label').textContent=g.catalysts.map(id=>D.CARD_MAP[id].name).join(' · ');
      $('reactor-count').textContent=g.reactor.length+' / 8';$('reactor').classList.toggle('full',g.reactor.length>=8);$('reactor').classList.toggle('target',!!this.selected);$('reactor').classList.toggle('cracked',g.cracks>0);$('reactor-hint').style.display=g.reactor.length?'none':'flex';
      $('reactor').classList.remove('temp-0','temp-1','temp-2','temp-3');$('reactor').classList.add('temp-'+g.pot.temp);$('temp-label').textContent=['常温','温热','灼热','沸腾'][g.pot.temp];$('steam').innerHTML=g.pot.temp>=2?'<i></i><i></i><i></i>':'';
      this.renderTokens();this.renderHand();this.renderPreview();$('condition-rack').innerHTML=g.conditions.map(id=>`<span class="condition-chip">${D.CARD_MAP[id].formula} ${D.CARD_MAP[id].name}</span>`).join('')+g.catalysts.map(id=>`<span class="condition-chip catalyst">${D.CARD_MAP[id].name}</span>`).join('');
      $('end-turn').disabled=!!g.pending||g.winner!==null||!this.isHumanTurn()||this.presenting||this.endingTurn||this.sound.speechPending>0;document.querySelector('#end-turn small').textContent=this.presenting||this.sound.speechPending>0?'等待播报与特效':this.mode==='pve'?'AI 将自动行动':'结算并交给对手';$('guide-btn').style.display=this.mode==='pve'?'inline-block':'none';$('guide-btn').disabled=!this.isHumanTurn()||!this.sound.guide;
    }
    health(el,hp){el.innerHTML=Array.from({length:10},(_,i)=>`<i class="${hp>=(i+1)*2?'on':hp===i*2+1?'on half':''}"></i>`).join('');}
    renderTokens(){
      const layers=this.game.pot.layers,box=$('tokens'),existing=new Map([...box.children].map(el=>[el.dataset.uid,el])),alive=new Set(),targeting=this.selected&&this.card(this.selected)?.id==='antimatter',preview=this.previewResult,highlight=new Set(preview?.highlightUids||[]);
      let order=0;const layout=(state,i,n)=>{if(state==='gas')return{x:50+(i-(n-1)/2)*Math.min(17,72/Math.max(1,n-1)),y:24+(i%2)*8};if(state==='liquid')return{x:50+(i-(n-1)/2)*Math.min(18,65/Math.max(1,n-1)),y:51+(i%2)*5};return{x:38+(i%2)*24,y:65+Math.floor(i/2)*8};};
      Object.entries(layers).forEach(([state,tokens])=>tokens.forEach((t,i)=>{const key=String(t.uid),pos=layout(state,i,tokens.length),b=existing.get(key)||document.createElement('button'),c=D.CARD_MAP[t.id],related=highlight.has(t.uid);alive.add(key);b.className=`token ${state}`+(t.fantasy?' fantasy':'')+(targeting?' targetable':'')+(preview&&!preview.special?(related?(preview.danger?' preview-danger':' preview-related'):' preview-dim'):'');b.style.cssText=`left:${pos.x}%;top:${pos.y}%;--color:${c.color};--delay:${i*.23}s`;b.dataset.uid=key;b.textContent=c.formula;b.title=c.name+(this.game.reactor.length>=8?' · 点击弃置':'');b.setAttribute('aria-label',c.name);b.onclick=()=>this.tokenClick(t.uid);const current=box.children[order];if(current!==b)box.insertBefore(b,current||null);order++;}));
      existing.forEach((el,uid)=>{if(!alive.has(uid))el.remove();});
      const liquids=layers.liquid,counts={};liquids.forEach(t=>{const color=D.CARD_MAP[t.id].color;counts[color]=(counts[color]||0)+1;});const color=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]||'#57B8FF';$('liquid').style.height=liquids.length?Math.min(43,17+liquids.length*4)+'%':'0';$('liquid').style.setProperty('--liquid-color',color);
    }
    renderHand(){
      const p=this.game.players[this.mode==='pve'?0:this.game.current],hand=$('hand');hand.innerHTML='';hand.classList.toggle('waiting',!this.isHumanTurn());p.hand.forEach((h,i)=>{const c=D.CARD_MAP[h.id],b=document.createElement('button');b.className='card'+(this.selected===h.uid?' selected':'')+(p.hand.length<=this.game.handLimit&&c.cost>this.game.energy?' unaffordable':'')+(this.guideCardIds.includes(h.id)?' hint-card':'');b.disabled=!this.isHumanTurn();b.style.cssText=`--color:${c.color};--tilt:${(i-(p.hand.length-1)/2)*2.2}deg;animation-delay:${i*.035}s`;b.dataset.uid=h.uid;b.dataset.cardId=h.id;
      b.innerHTML=`<span class="formula">${c.formula}</span><span class="card-name">${c.name}</span><i class="cost">${c.cost}</i>`;b.setAttribute('aria-label',`${c.name}，费用 ${c.cost}。${c.effect}`);b.onclick=()=>{if(this.suppressClick){this.suppressClick=false;return;}this.selectCard(h.uid);};
      b.onpointerdown=()=>{this.longTimer=setTimeout(()=>{this.suppressClick=true;this.toast(c.name+'：'+(c.effect||c.speak));this.sound.speak(c.name+'。'+c.effect);},480);};['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(this.longTimer)));b.oncontextmenu=e=>e.preventDefault();hand.appendChild(b);});
    }
    animate(events){
      if(!events.length)return;const lastReaction=events.reduce((last,e,i)=>e.type==='reaction'?i:last,-1);
      if(lastReaction>=0){const seq=++this.presentationSeq;this.presenting=true;this.render();this.presentationPromise=new Promise(resolve=>setTimeout(resolve,lastReaction*250+1550)).then(()=>this.sound.waitForSpeech()).then(()=>{if(seq===this.presentationSeq){this.presenting=false;this.render();}});}
      events.forEach((e,i)=>setTimeout(()=>{
        if(e.type==='play')this.sound.play(e.state?'play-'+e.state:'play');if(e.type==='opponentDiscard'){this.sound.play(e.state?'play-'+e.state:'play');this.toast(this.displayName(e.player)+'将'+D.CARD_MAP[e.cardId].name+'灌入公共釜');}
        if(e.type==='annihilate'){this.sound.play('play-solid');this.floatDamage(e.damage,this.mode==='pve'&&e.player===1);}
        if(e.type==='reaction'){const enemyBottom=this.mode==='pve'&&e.player===1,selfBottom=!enemyBottom;this.effect(e);this.sound.play(e.reaction.fx,e.chain);this.sound.speak(e.reaction.speak,true);if(e.damage){this.floatDamage(e.damage,enemyBottom);this.popHp(enemyBottom);}if(e.selfDamage){this.floatDamage(e.selfDamage,selfBottom);this.popHp(selfBottom);}if(e.chain>1){const b=document.createElement('span');b.className='chain-badge';b.textContent='连锁 ×'+e.chain;$('reactor').appendChild(b);setTimeout(()=>b.remove(),800);}if(e.overflow.length)this.toast('产物超出釜容量，已逸散');}
      },i*250));
    }
    popHp(bottom){const el=bottom?$('current-pill'):$('opponent-hp');el.classList.remove('hp-pop');void el.offsetWidth;el.classList.add('hp-pop');}
    effect(e){
      const fx=e.reaction.fx,layer=$('fx');clearTimeout(this.fxTimer);clearTimeout(this.impactTimer);clearTimeout(this.labelTimer);layer.className='fx signature fx-'+fx;layer.innerHTML='<i class="impact-flash"></i><i class="wave"></i><i class="wave second"></i>'+Array.from({length:16},(_,i)=>`<i class="particle" style="--i:${i};--x:${(i%5-2)*16}px;--y:${(i%4-1.5)*14}px"></i>`).join('')+(e.consumedIds||[]).map((id,i)=>`<span class="collision" style="--i:${i}">${D.CARD_MAP[id].formula}</span>`).join('');
      $('game').classList.remove('impact');void $('game').offsetWidth;$('game').classList.add('impact','fx-'+fx);this.impactTimer=setTimeout(()=>$('game').classList.remove('impact','fx-'+fx),520);
      const label=$('reaction-label');label.textContent=e.reaction.equation+(e.damage?' · 敌 −'+e.damage:'')+(e.selfDamage?' · 己 −'+e.selfDamage:'')+(e.heal?' · 己 +'+e.heal:'');label.className='reaction-label show fx-'+fx;this.labelTimer=setTimeout(()=>label.classList.remove('show'),900);this.fxTimer=setTimeout(()=>{layer.className='fx';layer.innerHTML='';},1500);
    }
    floatDamage(amount,bottom){const anchor=bottom?$('current-pill'):$('opponent-hp'),r=anchor.getBoundingClientRect(),d=document.createElement('div');d.className='damage-float';d.textContent='−'+amount;d.style.left=Math.max(12,Math.min(innerWidth-48,r.left+r.width/2-10))+'px';d.style.top=(r.top-5)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),850);}
    pulseReactor(){$('reactor').classList.remove('danger');void $('reactor').offsetWidth;$('reactor').classList.add('danger');}
    toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>t.classList.remove('show'),1800);}
    showGameOver(){if(this.game.winner===null)return;this.setThinking(false);this.selected=null;this.previewResult=null;this.clearGuide();this.setTutorial(false);this.hide('handoff');this.hide('choice-modal');const w=this.game.winner;$('winner-text').textContent=w==='draw'?'平局':this.displayName(w)+' 获胜';$('winner-symbol').textContent=w==='draw'?'＝':'△';$('end-reason').textContent=this.game.endReason+' · '+this.game.players.map((p,i)=>this.displayName(i)+' '+p.hp).join(' / ');$('game-stats').innerHTML=`<div><b>${this.game.stats.reactions}</b>触发反应</div><div><b>${this.game.stats.maxChain}</b>最大连锁</div><div><b>${this.game.stats.explosions}</b>爆釜次数</div>`;this.show('gameover');this.sound.play(this.mode==='pve'&&w===1?'lose':'win');this.sound.speak(w==='draw'?D.GUIDE.draw:D.GUIDE.win(this.displayName(w)));}
    buildRules(){$('reaction-list').innerHTML=D.REACTIONS.map(r=>`<div class="rule-row"><b>#${r.id} ${r.equation}</b><span>${r.condition?'条件：'+D.CONDITIONS[r.condition]:r.auto?'自动失控':'无需条件'}</span><p>${r.reason}。${r.damage?'对手 −'+r.damage+'；':''}${r.heal?'自己 +'+r.heal+'；':''}${r.both?'双方各 −'+r.both+'；':''}${r.discard?'对手自选 1 张手牌入釜；':''}${r.products?'产物留釜':''}</p></div>`).join('');}
  }
  root.ReactorUI=ReactorUI;
})(window);
