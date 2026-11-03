/* AI 与 PVE 引导共用 engine.preview；不读取 DOM、音频或对手隐藏信息。 */
(function(root){
  const D=root.ReactorData;
  const counts=ids=>ids.reduce((map,id)=>(map[id]=(map[id]||0)+1,map),{});
  function hasTokens(ids,reactants){const have=counts(ids);return reactants.every(id=>have[id]&&have[id]-- >0);}
  function responseIds(card,preview,found=new Set()){
    const ids=preview.reactor.map(t=>t.id),conditions=preview.conditions;
    const check=(nextIds,nextConditions,filter)=>D.REACTIONS.forEach(r=>{if(!found.has(r.id)&&filter(r)&&hasTokens(nextIds,r.reactants)&&(!r.condition||nextConditions.includes(r.condition)))found.add(r.id);});
    if(card.type==='material')check(ids.concat(card.id),conditions,r=>r.reactants.includes(card.id));
    else if(card.type==='condition')check(ids,conditions.concat(card.id),r=>r.condition===card.id);
    else if(card.id==='philosopher')D.MATERIAL_IDS.forEach(id=>check(ids.concat(id),conditions,r=>r.reactants.includes(id)));
    else if(card.id==='quantum')check(ids,conditions,r=>r.condition&&!conditions.includes(r.condition));
    return found;
  }
  function retention(game,player,playedUid,preview){
    const found=new Set();game.players[player].hand.forEach(h=>{if(h.uid!==playedUid)responseIds(D.CARD_MAP[h.id],preview,found);});return found.size;
  }
  function potRisk(preview){return root.ReactorEngine.ReactorGame.potRisk(preview);}
  function evaluate(game,player,guided){
    const p=game.players[player],enemy=game.players[1-player],candidates=[];
    const useful=new Set(D.REACTIONS.flatMap(r=>r.reactants));
    const discard=game.reactor.length>=8?(game.reactor.find(t=>!useful.has(t.id))||game.reactor[0]).uid:null;
    const add=(card,options={})=>{
      if(discard&&(card.type==='material'||card.id==='philosopher'))options=Object.assign({discardUid:discard},options);
      const preview=game.preview(card,options);if(!preview.ok)return;
      let score=preview.reactions.length*42+preview.chain*10+preview.damage*12+preview.heal*(p.hp<=5?30:5)-preview.selfDamage*(p.hp<=enemy.hp?45:12)-card.cost*.3;
      if(!preview.reactions.length){if(card.id==='na'&&!game.reactor.some(t=>t.id==='h2o'))score+=24;if(card.type==='material')score+=4;if(card.type==='condition'||card.type==='catalyst')score+=preview.partnerIds.length?8:1;}
      if(preview.chain>1)score+=80;
      const kept=guided?retention(game,player,card.uid,preview):0,risk=guided?potRisk(preview):0;
      if(guided)score+=kept*8-risk*12;
      candidates.push({uid:card.uid,options,score,cardId:card.id,preview,discardUid:options.discardUid||null,retention:kept,potRisk:risk});
    };
    p.hand.forEach(h=>{
      const c=Object.assign({},D.CARD_MAP[h.id],{uid:h.uid});
      if(c.id==='philosopher')D.MATERIAL_IDS.forEach(targetId=>add(c,{targetId}));
      else if(c.id==='quantum')game.quantumTargets().forEach(reactionId=>add(c,{reactionId}));
      else if(c.id==='antimatter')game.reactor.forEach(t=>add(c,{targetUid:t.uid}));
      else add(c);
    });
    candidates.sort((a,b)=>b.score-a.score||String(a.uid).localeCompare(String(b.uid))||String(a.options.targetId||'').localeCompare(String(b.options.targetId||'')));
    return{candidates,enemy};
  }
  function suggest(game,player=game.current,options={}){
    const empty=(reason=D.GUIDE.end)=>({cardIds:[],reason,speak:D.GUIDE.speak(''),move:null});
    if(game.winner!==null||game.pending||player!==game.current)return empty();
    if(game.players[player].hand.length>game.handLimit){
      const move=game.chooseOverflow();if(!move)return empty(D.GUIDE.full);const card=D.CARD_MAP[move.cardId],target=move.cardId==='philosopher'?D.CARD_MAP[move.options.targetId]:null,name=target?`${card.name}转化成${target.name}`:card.name;
      return{cardIds:[move.cardId],reason:D.GUIDE.overflow(name),speak:target?`推荐灌入${card.name}，转化成${target.name}`:`推荐灌入${card.name}`,move};
    }
    const{candidates,enemy}=evaluate(game,player,true);if(!candidates.length)return empty();
    let move=candidates[0];
    if((options.played||0)>=2){move=candidates.find(c=>c.preview.damage>=enemy.hp);if(!move)return empty(D.GUIDE.pace);}
    if(!move.preview.reactions.length&&!move.preview.damage&&move.potRisk>0){const safe=candidates.find(c=>!c.preview.reactions.length&&!c.preview.damage&&c.potRisk===0);if(safe)move=safe;else return{cardIds:[],reason:D.GUIDE.pass,speak:'建议留牌，结束回合',move:null};}
    const card=D.CARD_MAP[move.cardId],out=move.preview,p=game.players[player],target=move.cardId==='philosopher'?D.CARD_MAP[move.options.targetId]:null,actionName=target?`${card.name}转化成${target.name}`:card.name;let reason;
    if(out.danger&&p.hp<=enemy.hp)reason=D.GUIDE.danger;
    else if(p.hp<=5&&out.heal)reason=D.GUIDE.heal(actionName,out.heal);
    else if(out.chain>1)reason=D.GUIDE.chain(actionName,out.damage);
    else if(out.reactions.length||out.damage)reason=D.GUIDE.direct(actionName,out.damage,out.heal,out.reason||'可造成直接伤害');
    else if(move.cardId==='na')reason=D.GUIDE.mine;else reason=D.GUIDE.setup(actionName);
    if(target&&!reason.includes(target.name))reason=`${actionName}：${reason}`;
    return{cardIds:[move.cardId],reason,speak:target?`推荐出${card.name}，转化成${target.name}`:D.GUIDE.speak(card.name),move};
  }
  function chooseMove(game){if(game.winner!==null||game.pending)return null;return evaluate(game,game.current,false).candidates[0]||null;}
  function chooseDiscard(game){if(!game.pending)return null;const hand=game.players[game.pending.player].hand;return hand.slice().sort((a,b)=>D.CARD_MAP[b.id].cost-D.CARD_MAP[a.id].cost||a.uid-b.uid)[0]?.uid||null;}
  function chooseForced(game){
    if(!game.pending)return null;const hand=game.players[game.pending.player].hand,targets=game.quantumTargets(),h=hand.slice().sort((a,b)=>D.CARD_MAP[b.id].cost-D.CARD_MAP[a.id].cost||a.uid-b.uid)[0];if(!h)return null;const uid=h.uid,c=D.CARD_MAP[h.id],options={};
    if(c.id==='philosopher')options.targetId=D.MATERIAL_IDS[0];else if(c.id==='quantum')options.reactionId=targets[0];else if(c.id==='antimatter')options.targetUid=game.reactor[0]?.uid;
    if((c.type==='material'||c.id==='philosopher')&&game.reactor.length>=8){const useful=new Set(D.REACTIONS.flatMap(r=>r.reactants));options.discardUid=(game.reactor.find(t=>!useful.has(t.id))||game.reactor[0]).uid;}return{uid,options};
  }
  root.ReactorAI={suggest,chooseMove,chooseDiscard,chooseForced};if(typeof module!=='undefined'&&module.exports)module.exports=root.ReactorAI;
})(typeof window!=='undefined'?window:globalThis);
