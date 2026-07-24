/* ========== 二次元卡通风格工具 ========== */
(function() {
  'use strict';

  // 防止重复注入
  if (document.getElementById('anime-cartoon-injected')) return;

  // 1. 注入 Google Fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preconnect';
  fontLink.href = 'https://fonts.googleapis.com';
  document.head.appendChild(fontLink);
  const fontLink2 = document.createElement('link');
  fontLink2.rel = 'preconnect';
  fontLink2.href = 'https://fonts.gstatic.com';
  fontLink2.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink2);
  const fontLink3 = document.createElement('link');
  fontLink3.rel = 'stylesheet';
  fontLink3.href = 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@300;400;500;700;900&family=Quicksand:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink3);

  // 2. 注入主题CSS
  const themeCSS = document.createElement('link');
  themeCSS.rel = 'stylesheet';
  themeCSS.href = './_shared/anime-cartoon-theme.css';
  document.head.appendChild(themeCSS);

  // 3. 添加返回按钮（如果没有）
  if (!document.querySelector('.anime-back-btn, .back-btn, .home-btn, .back-link')) {
    const backBtn = document.createElement('a');
    backBtn.className = 'anime-back-btn';
    backBtn.href = './index.html';
    backBtn.textContent = '← 返回绘本馆';
    document.body.appendChild(backBtn);
  }

  // 4. 添加浮动装饰
  if (!document.querySelector('.anime-deco-layer')) {
    const decoLayer = document.createElement('div');
    decoLayer.className = 'anime-deco-layer';
    const emojis = ['🌸', '⭐', '🎈', '🦋', '🎀', '🍀', '☁️', '💗', '🌈', '✨', '🍀', '🌸', '⭐', '🎈', '🦋'];
    for (let i = 0; i < 15; i++) {
      const deco = document.createElement('span');
      deco.className = 'anime-deco';
      deco.textContent = emojis[i % emojis.length];
      deco.style.left = (Math.random() * 95) + '%';
      deco.style.animationDuration = (15 + Math.random() * 20) + 's';
      deco.style.animationDelay = (Math.random() * 15) + 's';
      deco.style.fontSize = (16 + Math.random() * 12) + 'px';
      decoLayer.appendChild(deco);
    }
    document.body.appendChild(decoLayer);
  }

  // 5. 修复内联 style 中的暗色值
  document.querySelectorAll('[style]').forEach(function(el) {
    let s = el.getAttribute('style');
    if (!s) return;
    // 修复背景色
    s = s.replace(/background\s*:\s*#0[b7]1120/gi, 'background: #FFF8F0');
    s = s.replace(/background\s*:\s*#131[b2]2[e8]e/gi, 'background: #FFFDF7');
    s = s.replace(/background\s*:\s*#1[a1]2540/gi, 'background: #FFF5EE');
    s = s.replace(/background\s*:\s*#07070d/gi, 'background: #FFF8F0');
    s = s.replace(/background\s*:\s*#151e32/gi, 'background: #FFFDF7');
    s = s.replace(/background\s*:\s*#1e293b/gi, 'background: #FFF5EE');
    // 修复文字色
    s = s.replace(/color\s*:\s*#f1f5f9/gi, 'color: #4A3B2E');
    s = s.replace(/color\s*:\s*#94a3b8/gi, 'color: #9B8B7A');
    s = s.replace(/color\s*:\s*#e2e8f0/gi, 'color: #4A3B2E');
    // 修复边框色
    s = s.replace(/border[^;]*#334155/gi, function(match) {
      return match.replace(/#334155/gi, 'rgba(180,160,140,0.25)');
    });
    el.setAttribute('style', s);
  });

  // 6. 修复 Canvas 内的暗色背景
  document.querySelectorAll('canvas').forEach(function(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const origFill = ctx.fillStyle;
    // 不直接改 canvas 绘制，留给各页面自己的 JS 处理
  });

  document.getElementById('anime-cartoon-injected') || 
    document.documentElement.setAttribute('data-anime-theme', 'true');
  
  // 标记已注入
  const marker = document.createElement('meta');
  marker.id = 'anime-cartoon-injected';
  marker.name = 'anime-cartoon-theme';
  marker.content = 'injected';
  document.head.appendChild(marker);
})();