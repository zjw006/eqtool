/* 入口：双模式、PVE 调度与新手引导节奏；AI 不接触 DOM。 */
(function(){
  const params=new URLSearchParams(location.search),seed=Number(params.get('seed'))||20261102,D=ReactorData;
  const game=new ReactorEngine.ReactorGame(seed),sound=new ReactorAudio(),ui=new ReactorUI(game,sound);
  let aiTimer=null,aiRunning=false,aiSteps=0,aiEpoch=0,aiFinishing=false,playerTurn=1,guidePlays=0,hintSuppressed=false,hintVisible=false,lastGuideIds=[];
  function clearAI(){aiEpoch++;clearTimeout(aiTimer);aiTimer=null;aiRunning=false;aiSteps=0;aiFinishing=false;}
  function refreshGuide(force=false){
    if(ui.mode!=='pve'||game.current!==0||game.winner!==null||game.pending||!sound.guide||(hintSuppressed&&!force)||(!force&&(playerTurn<2||playerTurn>3))){ui.clearGuide();hintVisible=false;return;}
    let suggestion=ReactorAI.suggest(game,0,{played:guidePlays});const hand=game.players[0].hand,noEnergy=hand.length>0&&hand.every(h=>D.CARD_MAP[h.id].cost>game.energy);
    if(game.players[0].hand.length<=game.handLimit&&(game.reactor.length>=8||noEnergy))suggestion={cardIds:[],reason:D.GUIDE.full,speak:D.GUIDE.speak(''),move:null};
    lastGuideIds=suggestion.cardIds;hintVisible=true;ui.showGuide(suggestion);
  }
  function beginPlayerTurn(reset=false){
    playerTurn=reset?1:playerTurn+1;guidePlays=0;hintSuppressed=false;hintVisible=false;lastGuideIds=[];
    if(ui.mode!=='pve'){ui.clearGuide();ui.setTutorial(false);return;}ui.setTutorial(playerTurn===1&&sound.guide);refreshGuide(false);
  }
  function startMode(mode){
    clearAI();ui.resetPresentation();ui.mode=mode;ui.clearGuide();ui.setTutorial(false);game.reset();ui.selected=null;ui.setThinking(false);
    ['title-screen','gameover','pause-screen','handoff','choice-modal'].forEach(id=>ui.hide(id));sound.unlock();sound.play('click');ui.render();beginPlayerTurn(true);
  }
  function resolveAIPending(events){if(!game.pending||game.pending.player!==1)return;const move=ReactorAI.chooseForced(game);if(!move)return;const res=game.chooseOpponentDiscard(move.uid,move.options);if(res.ok)events.push(...res.events);}
  async function finishAI(){
    if(game.winner!==null){clearAI();ui.setThinking(false);return;}if(aiFinishing)return;aiFinishing=true;const epoch=aiEpoch;await ui.waitForPresentation();
    if(epoch!==aiEpoch||ui.mode!=='pve'||game.current!==1||game.winner!==null)return;
    if(game.players[1].hand.length>game.handLimit){const overflow=game.resolveOverflow();ui.accept(overflow);resolveAIPending(overflow.events);await ui.waitForPresentation();if(epoch!==aiEpoch||game.winner!==null)return;if(game.pending){aiRunning=false;aiFinishing=false;return;}}
    const res=game.endTurn();clearAI();ui.setThinking(false);ui.accept(res);sound.play('turn');if(game.winner===null){ui.toast('你的回合');beginPlayerTurn(false);}
  }
  async function aiStep(){
    if(ui.mode!=='pve'||game.current!==1||game.winner!==null){clearAI();ui.setThinking(false);return;}const epoch=aiEpoch;await ui.waitForPresentation();if(epoch!==aiEpoch||ui.mode!=='pve'||game.current!==1||game.winner!==null)return;
    resolveAIPending([]);if(game.pending){aiRunning=false;aiFinishing=false;return;}if(aiSteps>=2){finishAI();return;}
    const move=ReactorAI.chooseMove(game);if(!move){finishAI();return;}if(move.discardUid)ui.accept(game.discardReactor(move.discardUid));const res=game.playCard(move.uid,move.options||{});if(!res.ok){finishAI();return;}resolveAIPending(res.events);aiSteps++;ui.accept(res);if(game.winner!==null){finishAI();return;}if(game.pending){aiRunning=false;aiFinishing=false;return;}aiTimer=setTimeout(aiStep,800);
  }
  function runAI(){if(aiRunning||ui.mode!=='pve'||game.current!==1)return;hintVisible=false;ui.clearGuide();ui.setTutorial(false);aiRunning=true;aiSteps=0;ui.setThinking(true);aiTimer=setTimeout(aiStep,300);}
  document.getElementById('pve-btn').onclick=()=>startMode('pve');document.getElementById('pvp-btn').onclick=()=>startMode('pvp');
  ui.onAITurn=runAI;ui.onRestart=()=>{clearAI();hintVisible=false;setTimeout(()=>beginPlayerTurn(true),0);};
  ui.onGuideRequest=(force=false)=>{if(force===true||!hintVisible){hintSuppressed=false;refreshGuide(true);}};
  ui.onGuideSetting=on=>{if(on){hintSuppressed=false;ui.setTutorial(playerTurn===1);refreshGuide(true);}else{hintVisible=false;ui.setTutorial(false);}};
  ui.onPlayerPlay=cardId=>{
    if(ui.mode!=='pve'||!hintVisible)return;const followed=lastGuideIds.includes(cardId);hintVisible=false;
    if(followed){guidePlays++;hintSuppressed=false;refreshGuide(true);}else{hintSuppressed=true;lastGuideIds=[];ui.clearGuide();ui.setTutorial(false);}
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.winner===null&&!document.getElementById('title-screen').classList.contains('visible'))ui.show('pause-screen');});
  window.__reactor={game,ui,sound,startMode,runAI,refreshGuide,get aiRunning(){return aiRunning;},get playerTurn(){return playerTurn;},get guidePlays(){return guidePlays;},get hintSuppressed(){return hintSuppressed;}};
  window.__gameProbe=()=>({mode:ui.mode,current:game.current,hp:game.players.map(p=>p.hp),hand:game.players.map(p=>p.hand.length),energy:game.energy,reactor:game.reactor.map(t=>t.id),deck:game.deck.length,winner:game.winner,pending:game.pending,aiRunning,thinking:ui.thinking,playerTurn,hintVisible,hintSuppressed,guideCards:ui.guideCardIds});
  window.__GAME_READY__=true;
})();
