/* 《反应炉》唯一数据源：颜色、三态、反应原因、温度与签名均在此维护。 */
(function(root){
  const C={h:'#57B8FF',o:'#FF5F56',c:'#8FA3B8',na:'#FFD54F',zn:'#9FB3C8',cl:'#B8E986',catalyst:'#B78CFF',condition:'#FF9F43',fantasy:'#FF6FD8',cu:'#E8A87C',ag:'#E7F0F7',ca:'#C8E6C9',fe:'#B0BEC5'};
  const STATES={zn:'solid',na:'solid',cuo:'solid',fe:'solid',nacl:'solid',hcl:'liquid',h2o:'liquid',caoh2:'liquid',naoh:'liquid',cuso4:'liquid',agno3:'liquid',h2:'gas',o2:'gas',cl2:'gas',ch4:'gas',co2:'gas'};
  const card=(id,name,formula,type,cost,count,color,speak,effect='')=>({id,name,formula,type,cost,count,color,speak,effect,state:STATES[id]||null});
  const CARDS=[
    card('zn','锌','Zn','material',1,2,C.zn,'锌'),card('hcl','盐酸','HCl','material',1,2,C.cl,'盐酸'),
    card('h2','氢气','H₂','material',1,2,C.h,'氢气'),card('o2','氧气','O₂','material',1,2,C.o,'氧气'),
    card('na','钠','Na','material',1,2,C.na,'钠'),card('h2o','水','H₂O','material',1,2,C.h,'水'),
    card('cl2','氯气','Cl₂','material',1,1,C.cl,'氯气'),card('cuo','氧化铜','CuO','material',1,1,C.cu,'氧化铜'),
    card('ch4','甲烷','CH₄','material',1,1,C.c,'甲烷'),card('co2','二氧化碳','CO₂','material',1,1,C.c,'二氧化碳'),
    card('caoh2','石灰水','Ca(OH)₂','material',1,1,C.ca,'石灰水'),card('naoh','氢氧化钠','NaOH','material',1,1,C.na,'氢氧化钠'),
    card('fe','铁','Fe','material',1,1,C.fe,'铁'),card('cuso4','硫酸铜','CuSO₄','material',1,1,'#57B8FF','硫酸铜溶液'),
    card('agno3','硝酸银','AgNO₃','material',1,1,C.ag,'硝酸银'),card('nacl','氯化钠','NaCl','material',1,0,C.ag,'氯化钠'),
    card('ignite','点燃','🔥','condition',0,2,C.condition,'点燃','满足燃烧类条件；触发后消耗'),
    card('electrolyze','通电','ϟ','condition',0,1,C.condition,'通电','满足电解条件；触发后消耗'),
    card('heat','加热','♨','condition',0,1,C.condition,'加热','满足加热条件；触发后消耗'),
    card('pt','铂网','Pt','catalyst',1,1,C.catalyst,'铂网','本回合燃烧类反应伤害 +2'),
    card('enzyme','酶','En','catalyst',1,1,C.catalyst,'酶','本回合中和类回复 +2'),
    card('carbon','活性炭','C','catalyst',1,1,C.catalyst,'活性炭','本回合爆釜对你伤害减半，向上取整'),
    card('philosopher','贤者之石','✦','fantasy',3,1,C.fantasy,'贤者之石','选择一种物质放入釜内'),
    card('quantum','量子隧穿','⌁','fantasy',3,1,C.fantasy,'量子隧穿','无条件触发一个只差条件的反应'),
    card('antimatter','反物质氢','H̄','fantasy',3,1,C.fantasy,'反物质氢','湮灭釜内任一物质，敌 −3')
  ];
  const reaction=(id,equation,reactants,condition,damage,effect,speak,fx,reason,heat,extra={})=>({id,equation,reactants,condition,damage,effect,speak,fx,reason,heat,...extra});
  const REACTIONS=[
    reaction(1,'Zn + 2HCl → ZnCl₂ + H₂↑',['zn','hcl','hcl'],null,2,'gas','锌和盐酸反应，生成氢气','zinc-acid','活泼金属置换酸中的氢',1,{products:['h2','h2']}),
    reaction(2,'2H₂ + O₂ → 2H₂O',['h2','h2','o2'],'ignite',4,'fire','氢气在氧气中燃烧','hydrogen-flame','氢氧燃烧生成水',2),
    reaction(3,'2Na + Cl₂ → 2NaCl',['na','na','cl2'],null,3,'fire','钠和氯气反应，生成氯化钠','sodium-sparks','钠在氯气中燃烧生成盐',2,{products:['nacl']}),
    reaction(4,'2H₂O → 2H₂ + O₂',['h2o','h2o'],'electrolyze',0,'gas','电解水，生成氢气和氧气','electrolysis','电解水分解为氢气和氧气',0,{products:['h2','h2','o2']}),
    reaction(5,'CuO + H₂ → Cu + H₂O',['cuo','h2'],'heat',3,'fire','氢气还原氧化铜','copper-reduction','氢气还原氧化铜',1),
    reaction(6,'CH₄ + 2O₂ → CO₂ + 2H₂O',['ch4','o2','o2'],'ignite',5,'fire','甲烷燃烧','methane-inferno','甲烷充分燃烧放热',3,{ultimate:true}),
    reaction(7,'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O',['co2','caoh2'],null,1,'precipitate','二氧化碳和石灰水反应，生成碳酸钙沉淀','lime-cloud','碳酸钙沉淀使石灰水浑浊',0,{heal:1,neutral:true}),
    reaction(8,'HCl + NaOH → NaCl + H₂O',['hcl','naoh'],null,0,'precipitate','盐酸和氢氧化钠发生中和反应','neutral-ripple','酸碱中和放热',1,{heal:2,neutral:true,products:['nacl']}),
    reaction(9,'Fe + CuSO₄ → FeSO₄ + Cu',['fe','cuso4'],null,2,'precipitate','铁置换出硫酸铜中的铜','iron-plating','铁置换铜并析出铜',1),
    reaction(10,'AgNO₃ + NaCl → AgCl↓ + NaNO₃',['agno3','nacl'],null,1,'precipitate','硝酸银和氯化钠反应，生成氯化银沉淀','silver-floc','银离子与氯离子生成沉淀',0,{discard:1}),
    reaction(11,'2Na + 2H₂O → 2NaOH + H₂↑',['na','h2o'],null,0,'explosion','爆釜！双方各受 2 点伤害','sodium-blast','钠遇水剧烈放热放氢',3,{both:2,auto:true}),
    reaction(12,'H₂ + Cl₂ → 2HCl',['h2','cl2'],'light',0,'explosion','氢气和氯气爆炸！双方各受 3 点伤害','chlorine-blast','氢氯混合光照爆炸',3,{both:3})
  ];
  const GUIDE={
    direct:(name,damage,heal,reason)=>`出${name}：${reason||'可触发反应'}${damage?`，敌 −${damage}`:''}${heal?`，自己 +${heal}`:''}`,
    chain:(name,damage)=>`接着出${name}：可接续连锁，总伤害 ${damage} 点`,
    setup:name=>`出${name}放着：对手用不上它，下回合再接反应。先看看对手出什么`,
    pass:'这回合凑不出反应，先留着。牌一进釜就公开，对手凑齐另一半，炸的是你',
    overflow:name=>`回合结束手牌必须不超过 3 张：主动灌入${name}，它对手最用不上，别等系统替你选`,
    pace:'这回合已出两张，留牌观察对手，下回合再接反应',
    mine:'把钠丢进釜里：对手放水就会爆釜——耐久领先时不亏',
    heal:(name,amount)=>`你的耐久较低：出${name}完成反应，回复 ${amount} 点`,
    avoid:name=>`这一步会爆釜伤到自己；建议改出${name}`,
    danger:'这一步会爆釜伤到自己；耐久落后时建议换一张',
    end:'这回合凑不出可用反应，结束回合攒能量吧',
    full:'釜已满或能量不足，先结束回合，等待新的机会',
    speak:name=>name?`推荐出${name}`:'建议结束回合',
    handoff:name=>`请交给对手，${name}的回合`,
    win:name=>`${name}获胜`,
    draw:'实验结束，平局'
  };
  root.ReactorData={CARDS,REACTIONS,COLORS:C,CARD_MAP:Object.fromEntries(CARDS.map(c=>[c.id,c])),MATERIAL_IDS:CARDS.filter(c=>c.type==='material').map(c=>c.id),CONDITIONS:{ignite:'点燃',electrolyze:'通电',heat:'加热',light:'光照'},GUIDE};
})(typeof window!=='undefined'?window:globalThis);
