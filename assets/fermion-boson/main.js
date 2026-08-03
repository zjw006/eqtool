/* 粒子宇宙大对决 · 交互逻辑 */
(function () {
  'use strict';

  /* ========== 粒子档案数据 ========== */
  var PARTICLES = {
    electron: {
      name: '电子 Electron',
      sym: 'e⁻ · 电荷 -1 · 轻子',
      family: '费米子 · 自旋 1/2',
      desc: '1897 年由汤姆孙发现，是人类认识的第一种基本粒子。它环绕原子核运动，占据分层的量子轨道，是原子外层唯一的“常住居民”。',
      power: '决定一切化学性质与材料导电性；电流的本质就是电子的定向移动。'
    },
    quark: {
      name: '夸克 Quark',
      sym: 'u（上）/ d（下）· 电荷 +2/3、-1/3',
      family: '费米子 · 自旋 1/2',
      desc: '物质最深层的“零件”，共有六种“味”。上夸克与下夸克三个一组，被胶子粘成质子和中子；由于“夸克禁闭”，它们永远无法单独现身。',
      power: '拼出原子核，进而拼出宇宙间所有普通物质。'
    },
    proton: {
      name: '质子 Proton',
      sym: 'p · uud · 电荷 +1',
      family: '费米子（复合）· 自旋 1/2',
      desc: '由两个上夸克和一个下夸克组成的复合粒子，坐镇原子核中心。原子核里有几颗质子，就决定了这是几号元素。',
      power: '定义元素身份：1 颗是氢，6 颗是碳，79 颗是金。'
    },
    neutron: {
      name: '中子 Neutron',
      sym: 'n · udd · 电荷 0',
      family: '费米子（复合）· 自旋 1/2',
      desc: '由一上两下三个夸克组成，不带电。它在原子核中稀释质子间的静电排斥，让多质子原子核得以稳定存在。',
      power: '核反应的钥匙：中子轰击可引发核裂变，点亮核电站与恒星炉火的另一面。'
    },
    neutrino: {
      name: '中微子 Neutrino',
      sym: 'ν · 电荷 0 · 轻子',
      family: '费米子 · 自旋 1/2',
      desc: '质量极小、几乎不与任何物质相互作用。此刻每秒钟有数以万亿计的中微子穿过你的身体，而你毫无察觉。',
      power: '恒星内部的“信使”，带着超新星爆发与太阳核心的第一手情报穿越宇宙。'
    },
    photon: {
      name: '光子 Photon',
      sym: 'γ · 电荷 0 · 质量 0',
      family: '玻色子 · 自旋 1',
      desc: '光的粒子形态，也是电磁相互作用的传递者。两颗带电粒子之间的吸引与排斥，本质上是它们在不断交换虚光子。',
      power: '传递电磁力；可见光、无线电、X 射线都是它的不同“马甲”。'
    },
    gluon: {
      name: '胶子 Gluon',
      sym: 'g · 电荷 0 · 带色荷',
      family: '玻色子 · 自旋 1',
      desc: '强相互作用的传递者，共有 8 种。它像胶水一样把夸克粘成质子、中子，再把原子核捆成一团。自己带“色荷”，还会与同类相互作用。',
      power: '施展自然界最强的力——把夸克永久囚禁在原子核里。'
    },
    wz: {
      name: 'W / Z 玻色子',
      sym: 'W± / Z⁰ · 质量 ≈ 80~91 GeV',
      family: '玻色子 · 自旋 1',
      desc: '弱相互作用的传递者，1983 年在欧洲核子中心被发现。它们异常“肥胖”，因此弱力射程极短，只在原子核内部起作用。',
      power: '导演 β 衰变，让质子与中子互相变身——太阳因此得以持续燃烧。'
    },
    higgs: {
      name: '希格斯玻色子 Higgs',
      sym: 'H · 电荷 0 · 质量 ≈ 125 GeV',
      family: '玻色子 · 自旋 0',
      desc: '标准模型中唯一自旋为 0 的基本粒子，2012 年在大型强子对撞机（LHC）上被确认。遍布宇宙的希格斯场像“糖浆”一样拖住粒子，赋予它们质量。',
      power: '质量的赋予者：没有它，电子将以光速飞驰，原子无法形成。'
    }
  };

  /* ========== 弹窗逻辑 ========== */
  var mask = document.getElementById('modalMask');
  var mName = document.getElementById('mName');
  var mSym = document.getElementById('mSym');
  var mFamily = document.getElementById('mFamily');
  var mDesc = document.getElementById('mDesc');
  var mPower = document.getElementById('mPower');

  function openModal(key) {
    var p = PARTICLES[key];
    if (!p) return;
    mName.textContent = p.name;
    mSym.textContent = p.sym;
    mFamily.textContent = p.family;
    mDesc.textContent = p.desc;
    mPower.textContent = p.power;
    mask.classList.add('show');
  }
  function closeModal() { mask.classList.remove('show'); }

  document.querySelectorAll('[data-p]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      openModal(el.getAttribute('data-p'));
    });
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ========== 氖原子壳层填充动画 ========== */
  var stage = document.getElementById('atomStage');
  var note = document.getElementById('shellNote');
  if (stage) {
    var CX = 50, CY = 50; // 百分比中心
    var shells = [
      { r: 75, count: 2 },   // 1s（px 半径，相对 150px 环）
      { r: 150, count: 8 }   // 2s + 2p
    ];
    var dots = [];
    shells.forEach(function (sh, si) {
      for (var i = 0; i < sh.count; i++) {
        var angle = (Math.PI * 2 * i) / sh.count + (si ? Math.PI / 8 : 0);
        var el = document.createElement('div');
        el.className = 'shell-e';
        // 以舞台中心为基准的百分比定位
        var x = 50, y = 50;
        el.style.left = 'calc(' + x + '% + ' + (Math.cos(angle) * sh.r).toFixed(1) + 'px)';
        el.style.top = 'calc(' + y + '% + ' + (Math.sin(angle) * sh.r).toFixed(1) + 'px)';
        el.textContent = (i % 2 === 0) ? '↑' : '↓';
        stage.appendChild(el);
        dots.push(el);
      }
    });

    var step = 0, total = dots.length;
    function tick() {
      if (step <= total) {
        dots.forEach(function (d, i) { d.classList.toggle('on', i < step); });
        note.textContent = '电子填充中… ' + step + ' / ' + total +
          (step === total ? '  氖原子完成：1s² 2s² 2p⁶，壳层全满，性质极稳定！' : '');
        step++;
      } else {
        step = 0; // 循环重播
      }
    }
    tick();
    setInterval(tick, 650);
  }
})();
