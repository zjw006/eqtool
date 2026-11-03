/* 纯规则核心：真实结算与 preview 共用同一条路径；不引用 DOM、音频或定时器。 */
(function(root){
  if(!root.ReactorData&&typeof require!=='undefined')require('./data.js');
  const D=root.ReactorData,clone=o=>JSON.parse(JSON.stringify(o));
  class ReactorGame{
    constructor(seed=Date.now()){this.seed=seed>>>0;this.uid=0;this.reset();}
    random(){let t=this.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
    reset(){
      this.players=[0,1].map(i=>({id:i,name:i?'玩家 B':'玩家 A',hp:20,hand:[]}));
      this.deck=[];this.discard=[];this.reactor=[];this.conditions=[];this.catalysts=[];
      this.current=0;this.round=1;this.energy=3;this.handLimit=3;this.opening=[false,true];this.winner=null;this.endReason='';this.pending=null;
      this.stats={reactions:0,maxChain:0,damage:[0,0],explosions:0};this.events=[];this.temp=0;this.cracks=0;this.pot={layers:{gas:[],liquid:[],solid:[]},temp:0};
      D.CARDS.forEach(c=>{for(let i=0;i<c.count;i++)this.deck.push(this.instance(c.id));});
      for(let i=this.deck.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]];}
      for(let i=0;i<3;i++)this.draw(0);for(let i=0;i<3;i++)this.draw(1);this.syncPot();return this;
    }
    instance(id){return{uid:++this.uid,id};}
    card(id){return D.CARD_MAP[id];}
    result(ok,error=''){return{ok,error,events:this.events.splice(0),state:this};}
    syncPot(){
      const layers={gas:[],liquid:[],solid:[]};
      this.reactor.forEach(t=>{const state=this.card(t.id).state;if(layers[state])layers[state].push(t);});
      this.pot={layers,temp:this.temp};
    }
    draw(p){
      if(this.winner!==null||!this.deck.length)return;const c=this.deck.pop();
      this.players[p].hand.push(c);this.events.push({type:'draw',player:p});
      if(!this.deck.length)this.finishByDeck();
    }
    finishByDeck(){const[a,b]=this.players.map(p=>p.hp);this.winner=a===b?'draw':(a>b?0:1);this.endReason='牌库抽空';this.events.push({type:'gameOver',winner:this.winner,reason:this.endReason});}
    checkEnd(){const dead=this.players.filter(p=>p.hp<=0);if(!dead.length)return false;this.winner=dead.length===2?'draw':1-dead[0].id;this.endReason='耐久归零';this.events.push({type:'gameOver',winner:this.winner,reason:this.endReason});return true;}
    playCard(uid,options={}){
      if(this.winner!==null)return this.result(false,'本局已结束');if(this.pending)return this.result(false,'请先完成弃牌选择');
      const hand=this.players[this.current].hand,index=hand.findIndex(c=>c.uid===uid);if(index<0)return this.result(false,'这张牌不在手牌中');
      const c=this.card(hand[index].id),overflow=hand.length>this.handLimit,cost=overflow?0:c.cost;if(cost>this.energy)return this.result(false,'能量不足');
      if((c.type==='material'||c.id==='philosopher')&&this.reactor.length>=8)return this.result(false,'釜已满，请先弃置一个物质');
      if(c.id==='philosopher'&&!D.MATERIAL_IDS.includes(options.targetId))return this.result(false,'请选择要转化的物质');
      if(c.id==='antimatter'&&!this.reactor.some(t=>t.uid===options.targetUid))return this.result(false,'请选择要湮灭的物质');
      if(c.id==='quantum'&&!this.quantumTargets().includes(options.reactionId))return this.result(false,'没有可隧穿的反应');
      const[played]=hand.splice(index,1);this.discard.push(played);this.energy-=cost;this.events.push({type:'play',cardId:c.id,player:this.current,state:c.state,overflow,free:overflow});
      if(c.type==='material')this.reactor.push(this.instance(c.id));else if(c.type==='condition')this.conditions.push(c.id);else if(c.type==='catalyst')this.catalysts.push(c.id);
      else if(c.id==='philosopher')this.reactor.push(Object.assign(this.instance(options.targetId),{fantasy:true}));
      else if(c.id==='antimatter'){const i=this.reactor.findIndex(t=>t.uid===options.targetUid),[target]=this.reactor.splice(i,1);this.discard.push(target);const damage=this.harm(1-this.current,3);this.events.push({type:'annihilate',targetId:target.id,damage,player:this.current});}
      else if(c.id==='quantum')this.resolveReaction(D.REACTIONS.find(r=>r.id===options.reactionId),true,1);
      if(this.winner===null&&!this.pending)this.autoResolve(c.id==='quantum'?2:1);this.syncPot();return this.result(true);
    }
    discardReactor(uid){
      if(this.winner!==null||this.pending)return this.result(false,'当前无法操作');if(this.reactor.length<8)return this.result(false,'只有釜满时才能弃置物质');
      const i=this.reactor.findIndex(t=>t.uid===uid);if(i<0)return this.result(false,'物质不存在');const[target]=this.reactor.splice(i,1);this.discard.push(target);this.events.push({type:'discardReactor',targetId:target.id});this.syncPot();return this.result(true);
    }
    tokensFor(reactants){const used=new Set(),tokens=[];for(const id of reactants){const t=this.reactor.find(x=>x.id===id&&!used.has(x.uid));if(!t)return null;used.add(t.uid);tokens.push(t);}return tokens;}
    quantumTargets(){return D.REACTIONS.filter(r=>r.condition&&this.tokensFor(r.reactants)&&!this.conditions.includes(r.condition)).map(r=>r.id);}
    autoResolve(chain=1){
      let guard=0;while(this.winner===null&&!this.pending&&guard++<30){const available=r=>this.tokensFor(r.reactants)&&(r.condition===null||this.conditions.includes(r.condition));const r=D.REACTIONS.find(r=>r.auto&&available(r))||D.REACTIONS.find(r=>!r.auto&&available(r));if(!r)break;this.resolveReaction(r,false,chain);chain++;}
      this.stats.maxChain=Math.max(this.stats.maxChain,chain-1);
    }
    resolveReaction(r,ignoreCondition,chain){
      const tokens=this.tokensFor(r.reactants);if(!tokens)return;this.reactor=this.reactor.filter(t=>!tokens.includes(t));tokens.forEach(t=>this.discard.push(t));
      if(r.condition&&!ignoreCondition){const i=this.conditions.indexOf(r.condition);if(i>=0)this.conditions.splice(i,1);}
      let damage=0,heal=0,selfDamage=0,enemyDamage=0;
      if(r.damage){damage=r.damage+(r.effect==='fire'&&this.catalysts.includes('pt')?2:0);enemyDamage=this.harm(1-this.current,damage);}
      if(r.heal){heal=r.heal+(r.neutral&&this.catalysts.includes('enzyme')?2:0);const p=this.players[this.current],before=p.hp;p.hp=Math.min(20,p.hp+heal);heal=p.hp-before;}
      if(r.both){selfDamage=r.both;if(this.catalysts.includes('carbon'))selfDamage=Math.ceil(selfDamage/2);selfDamage=this.harm(this.current,selfDamage);enemyDamage=this.harm(1-this.current,r.both);this.stats.explosions++;this.cracks=2;}
      const overflow=[];(r.products||[]).forEach(id=>{if(this.reactor.length<8)this.reactor.push(this.instance(id));else overflow.push(id);});
      this.temp=Math.max(0,Math.min(3,this.temp+(r.heat||0)));this.stats.reactions++;this.stats.damage[this.current]+=enemyDamage;
      this.events.push({type:'reaction',reaction:r,chain,damage:enemyDamage,selfDamage,heal,products:r.products||[],overflow,player:this.current,consumed:tokens.map(t=>t.uid),consumedIds:tokens.map(t=>t.id)});this.checkEnd();
      if(this.winner===null&&r.discard&&this.players[1-this.current].hand.length)this.pending={type:'discard',player:1-this.current};this.syncPot();
    }
    harm(player,amount){const p=this.players[player],before=p.hp;p.hp=Math.max(0,p.hp-amount);return before-p.hp;}
    chooseOpponentDiscard(uid,options={}){
      if(!this.pending||this.pending.type!=='discard')return this.result(false,'当前没有手牌灌入选择');const p=this.players[this.pending.player],i=p.hand.findIndex(c=>c.uid===uid);if(i<0)return this.result(false,'请选择一张手牌');
      const c=this.card(p.hand[i].id);if(c.id==='philosopher'&&!D.MATERIAL_IDS.includes(options.targetId))return this.result(false,'请选择要转化的物质');if(c.id==='quantum'&&options.reactionId&&!this.quantumTargets().includes(options.reactionId))return this.result(false,'没有可隧穿的反应');if(c.id==='antimatter'&&options.targetUid&&!this.reactor.some(t=>t.uid===options.targetUid))return this.result(false,'请选择要湮灭的物质');
      if((c.type==='material'||c.id==='philosopher')&&this.reactor.length>=8){const at=this.reactor.findIndex(t=>t.uid===options.discardUid);if(at<0)return this.result(false,'釜已满，请选择一个物质弃置');const[target]=this.reactor.splice(at,1);this.discard.push(target);this.events.push({type:'discardReactor',targetId:target.id});}
      const[played]=p.hand.splice(i,1);this.discard.push(played);this.pending=null;this.events.push({type:'opponentDiscard',cardId:c.id,player:p.id,state:c.state,pour:true});
      if(c.type==='material')this.reactor.push(this.instance(c.id));else if(c.type==='condition')this.conditions.push(c.id);else if(c.type==='catalyst')this.catalysts.push(c.id);
      else if(c.id==='philosopher')this.reactor.push(Object.assign(this.instance(options.targetId),{fantasy:true}));
      else if(c.id==='antimatter'&&options.targetUid){const at=this.reactor.findIndex(t=>t.uid===options.targetUid),[target]=this.reactor.splice(at,1);this.discard.push(target);const damage=this.harm(1-this.current,3);this.events.push({type:'annihilate',targetId:target.id,damage,player:this.current});}
      else if(c.id==='quantum'&&options.reactionId)this.resolveReaction(D.REACTIONS.find(r=>r.id===options.reactionId),true,1);
      if(this.winner===null&&!this.pending)this.autoResolve(c.id==='quantum'?2:1);this.syncPot();return this.result(true);
    }
    static potRisk(preview){
      const have=preview.reactor.reduce((m,t)=>(m[t.id]=(m[t.id]||0)+1,m),{});let risk=0;
      D.REACTIONS.forEach(r=>{const need=r.reactants.reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{}),missing=Object.entries(need).reduce((n,[id,c])=>n+Math.max(0,c-(have[id]||0)),0)+(r.condition&&!preview.conditions.includes(r.condition)?1:0);if(missing===1)risk+=Math.max(1,r.damage||0,r.both||0,r.heal||0,(r.products||[]).length);});return risk;
    }
    chooseOverflow(){
      if(this.winner!==null||this.pending||this.players[this.current].hand.length<=this.handLimit)return null;
      const p=this.players[this.current],moves=[];
      const add=(card,options={})=>{const preview=this.preview(card,options);if(!preview.ok)return;const risk=ReactorGame.potRisk(preview),score=-risk*100+preview.damage*12+preview.heal*5-preview.selfDamage*40-preview.reactions.length;moves.push({uid:card.uid,cardId:card.id,options,preview,risk,score,discardUid:options.discardUid||null});};
      p.hand.forEach(h=>{const c=Object.assign({},this.card(h.id),{uid:h.uid}),base={};
        const variants=c.id==='philosopher'?D.MATERIAL_IDS.map(targetId=>({targetId})):c.id==='quantum'?this.quantumTargets().map(reactionId=>({reactionId})):c.id==='antimatter'?this.reactor.map(t=>({targetUid:t.uid})):[base];
        variants.forEach(options=>{if((c.type==='material'||c.id==='philosopher')&&this.reactor.length>=8)this.reactor.forEach(t=>add(c,Object.assign({discardUid:t.uid},options)));else add(c,options);});
      });
      moves.sort((a,b)=>b.score-a.score||a.uid-b.uid||String(a.options.targetId||'').localeCompare(String(b.options.targetId||'')));return moves[0]||null;
    }
    resolveOverflow(choice=null){
      if(this.players[this.current].hand.length<=this.handLimit)return this.result(false,'当前没有溢出手牌');const move=choice||this.chooseOverflow();if(!move)return this.result(false,'请先弃置釜内物质');
      if(move.discardUid){const discarded=this.discardReactor(move.discardUid);if(!discarded.ok)return discarded;}return this.playCard(move.uid,move.options||{});
    }
    endTurn(){
      if(this.winner!==null)return this.result(false,'本局已结束');if(this.pending)return this.result(false,'请先完成弃牌选择');
      if(this.players[this.current].hand.length>this.handLimit){const overflow=this.resolveOverflow();if(!overflow.ok)return overflow;if(this.winner!==null)return this.result(true);if(this.pending)return this.result(false,'请先完成弃牌选择');}
      this.catalysts=[];this.temp=Math.max(0,this.temp-1);this.cracks=Math.max(0,this.cracks-1);this.current=1-this.current;if(this.current===0)this.round++;
      this.energy=this.opening[this.current]?4:3;this.opening[this.current]=false;this.events.push({type:'turn',player:this.current,round:this.round,temp:this.temp});this.draw(this.current);this.syncPot();return this.result(true);
    }
    fork(){const sim=Object.create(ReactorGame.prototype);Object.assign(sim,this.snapshot());sim.events=[];sim.syncPot();return sim;}
    related(card,options){
      const id=card.id==='philosopher'?options.targetId:card.id;let reactions=[];
      if(card.type==='material'||card.id==='philosopher')reactions=D.REACTIONS.filter(r=>r.reactants.includes(id));
      else if(card.type==='condition')reactions=D.REACTIONS.filter(r=>r.condition===id);
      else if(card.type==='catalyst')reactions=D.REACTIONS.filter(r=>(id==='pt'&&r.effect==='fire')||(id==='enzyme'&&r.neutral)||(id==='carbon'&&r.both));
      else if(card.id==='quantum')reactions=D.REACTIONS.filter(r=>r.id===options.reactionId);
      return{id,reactions};
    }
    preview(card,options={}){
      const hand=this.players[this.current].hand,source=typeof card==='object'?hand.find(h=>h.uid===card.uid||(!card.uid&&h.id===card.id)):hand.find(h=>h.uid===card||h.id===card);
      const empty=(ok,error='')=>({ok,error,cardId:source?source.id:(card&&card.id)||'',player:this.current,reactions:[],reactionIds:[],damage:0,selfDamage:0,heal:0,chain:0,danger:false,reasons:[],reason:'',partnerIds:[],highlightUids:[],pot:clone(this.pot),reactor:clone(this.reactor),conditions:[...this.conditions],catalysts:[...this.catalysts],energy:this.energy,pending:null});
      if(!source)return empty(false,'这张牌不在手牌中');const c=this.card(source.id),sim=this.fork();
      if(options.discardUid){const discarded=sim.discardReactor(options.discardUid);if(!discarded.ok)return empty(false,discarded.error);}
      const res=sim.playCard(source.uid,options);if(!res.ok)return empty(false,res.error);
      const events=res.events,reactionEvents=events.filter(e=>e.type==='reaction'),related=this.related(c,options),consumed=new Set(reactionEvents.flatMap(e=>e.consumed));
      const relatedIds=new Set(related.reactions.flatMap(r=>r.reactants)),partnerIds=[...relatedIds].filter(id=>id!==related.id);
      const highlightUids=this.reactor.filter(t=>consumed.has(t.uid)||(!consumed.size&&relatedIds.has(t.id))).map(t=>t.uid);
      const damage=reactionEvents.reduce((n,e)=>n+e.damage,0)+events.filter(e=>e.type==='annihilate').reduce((n,e)=>n+e.damage,0),selfDamage=reactionEvents.reduce((n,e)=>n+e.selfDamage,0),heal=reactionEvents.reduce((n,e)=>n+e.heal,0),reasons=[...new Set(reactionEvents.map(e=>e.reaction.reason))];
      return{ok:true,error:'',cardId:c.id,player:this.current,events:clone(events),reactions:reactionEvents.map(e=>({id:e.reaction.id,fx:e.reaction.fx,reason:e.reaction.reason,equation:e.reaction.equation,chain:e.chain,damage:e.damage,selfDamage:e.selfDamage,heal:e.heal})),reactionIds:reactionEvents.map(e=>e.reaction.id),damage,selfDamage,heal,chain:reactionEvents.reduce((n,e)=>Math.max(n,e.chain),0),danger:selfDamage>0,reasons,reason:reasons[0]||'',partnerIds,highlightUids,pot:clone(sim.pot),reactor:clone(sim.reactor),conditions:[...sim.conditions],catalysts:[...sim.catalysts],energy:sim.energy,pending:clone(sim.pending)};
    }
    snapshot(){return clone({players:this.players,deck:this.deck,discard:this.discard,reactor:this.reactor,conditions:this.conditions,catalysts:this.catalysts,current:this.current,round:this.round,energy:this.energy,handLimit:this.handLimit,opening:this.opening,winner:this.winner,endReason:this.endReason,pending:this.pending,stats:this.stats,temp:this.temp,cracks:this.cracks,pot:this.pot,uid:this.uid,seed:this.seed});}
  }
  root.ReactorEngine={ReactorGame};if(typeof module!=='undefined'&&module.exports)module.exports=root.ReactorEngine;
})(typeof window!=='undefined'?window:globalThis);
