(function () {
  'use strict';

  /* ============================
     CSS Variables & Common Config
     ============================ */
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim() || '#B89AD9';
  var accent2 = style.getPropertyValue('--accent2').trim() || '#E8A93E';
  var accent3 = style.getPropertyValue('--accent3').trim() || '#ec4899';
  var accent4 = style.getPropertyValue('--accent4').trim() || '#6BB6D6';
  var ink = style.getPropertyValue('--ink').trim() || '#4A3B2E';
  var muted = style.getPropertyValue('--muted').trim() || '#9B8B7A';
  var rule = style.getPropertyValue('--rule').trim() || 'rgba(180,160,140,0.25)';
  var bg = style.getPropertyValue('--bg').trim() || '#FFF5EE';
  var bg2 = style.getPropertyValue('--bg2').trim() || '#FFF5EE';
  var bg3 = style.getPropertyValue('--bg3').trim() || 'rgba(180,160,140,0.25)';

  var charts = {};

  function commonOption() {
    return {
      animation: false,
      backgroundColor: 'transparent',
      textStyle: { color: muted, fontFamily: 'JetBrainsMono' },
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        backgroundColor: bg3,
        borderColor: rule,
        textStyle: { color: ink, fontFamily: 'JetBrainsMono', fontSize: 11 }
      }
    };
  }

  function makeAxis(min, max) {
    return {
      type: 'value',
      min: min,
      max: max,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
      splitLine: { lineStyle: { color: bg2 } },
      axisTick: { lineStyle: { color: rule } }
    };
  }

  function dualGridOption(topSeries, bottomSeries, xMin, xMax, yMin1, yMax1, yMin2, yMax2) {
    var base = commonOption();
    base.grid = [
      { top: 40, right: 30, bottom: '55%', left: 55 },
      { top: '55%', right: 30, bottom: 40, left: 55 }
    ];
    base.xAxis = [
      {
        type: 'value', min: xMin, max: xMax, gridIndex: 0,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
        splitLine: { lineStyle: { color: bg2 } },
        axisTick: { lineStyle: { color: rule } }
      },
      {
        type: 'value', min: xMin, max: xMax, gridIndex: 1,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
        splitLine: { lineStyle: { color: bg2 } },
        axisTick: { lineStyle: { color: rule } }
      }
    ];
    base.yAxis = [
      {
        type: 'value', min: yMin1, max: yMax1, gridIndex: 0,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
        splitLine: { lineStyle: { color: bg2 } },
        axisTick: { lineStyle: { color: rule } }
      },
      {
        type: 'value', min: yMin2, max: yMax2, gridIndex: 1,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
        splitLine: { lineStyle: { color: bg2 } },
        axisTick: { lineStyle: { color: rule } }
      }
    ];
    var series = [];
    topSeries.forEach(function (s) { series.push(Object.assign({ xAxisIndex: 0, yAxisIndex: 0 }, s)); });
    bottomSeries.forEach(function (s) { series.push(Object.assign({ xAxisIndex: 1, yAxisIndex: 1 }, s)); });
    base.series = series;
    return base;
  }

  /* ============================
     Button Group Helper
     ============================ */
  function bindButtonGroup(containerId, onChange) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var buttons = container.querySelectorAll('button');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (onChange) onChange(btn);
      });
    });
    // Set first active
    if (!container.querySelector('button.active')) {
      var first = container.querySelector('button');
      if (first) first.classList.add('active');
    }
  }

  function getActiveButton(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return null;
    var active = container.querySelector('button.active');
    return active ? active.textContent.trim() : null;
  }

  /* ============================
     Tab Switching
     ============================ */
  function initTabs() {
    var tabsContainer = document.getElementById('transformTabs');
    if (!tabsContainer) return;
    var buttons = tabsContainer.querySelectorAll('button[data-tab]');
    var panels = document.querySelectorAll('[data-panel]');

    function switchTab(target) {
      var tabId = target.getAttribute('data-tab');
      buttons.forEach(function (b) { b.classList.remove('active'); });
      target.classList.add('active');
      panels.forEach(function (p) { p.classList.remove('active'); });
      var panel = document.querySelector('[data-panel="' + tabId + '"]');
      if (panel) panel.classList.add('active');
      if (tabId === 'fourier') initFourier();
      else if (tabId === 'laplace') initLaplace();
      else if (tabId === 'z') initZTransform();
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn); });
    });

    // Activate first tab
    var activeBtn = tabsContainer.querySelector('button.active');
    if (activeBtn) {
      switchTab(activeBtn);
    } else if (buttons.length > 0) {
      switchTab(buttons[0]);
    }
  }

  /* ============================================================
                          FOURIER TRANSFORM
     ============================================================ */
  var fftInited = false;

  function initFourier() {
    if (!fftInited) {
      initFFTChart();
      initOFDMChart();
      initFilterChart();
      fftInited = true;
    } else {
      updateFFTChart();
      updateOFDMChart();
      updateFilterChart();
    }
  }

  /* ---------- FFT Chart ---------- */
  function initFFTChart() {
    var dom = document.getElementById('chartFFT');
    if (!dom) return;
    charts.fft = echarts.init(dom, null, { renderer: 'svg' });

    bindButtonGroup('signalType', function () { updateFFTChart(); });

    var slider = document.getElementById('fft-harmonics');
    if (slider) {
      slider.addEventListener('input', function () { updateFFTChart(); });
    }

    updateFFTChart();
  }

  function generateSquareWave(t, N, omega) {
    var val = 0;
    for (var n = 1; n <= N * 2; n += 2) {
      val += Math.sin(n * omega * t) / n;
    }
    return val * (4 / Math.PI);
  }

  function generateSawtoothWave(t, N, omega) {
    var val = 0;
    for (var n = 1; n <= N; n++) {
      val += Math.pow(-1, n + 1) * Math.sin(n * omega * t) / n;
    }
    return val * (2 / Math.PI);
  }

  function generatePulseWave(t, N, omega) {
    var val = 0;
    for (var n = 0; n < N; n++) {
      val += Math.sin((2 * n + 1) * omega * t) / (2 * n + 1);
    }
    return val * (4 / Math.PI) * 0.8;
  }

  function generateMixedWave(t, N, omega) {
    return generateSquareWave(t, Math.max(1, Math.floor(N / 3)), omega) * 0.5
         + generateSawtoothWave(t, Math.max(1, Math.floor(N / 3)), omega) * 0.3
         + 0.2 * Math.sin(3 * omega * t);
  }

  function updateFFTChart() {
    if (!charts.fft) return;
    var N = parseInt(document.getElementById('fft-harmonics') ? document.getElementById('fft-harmonics').value : 5, 10) || 5;
    var omega = 1;
    var samples = 1000;
    var tMax = 2 * Math.PI;

    var signalType = getActiveButton('signalType') || '方波';
    var timeData = [];
    for (var i = 0; i <= samples; i++) {
      var t = tMax * i / samples;
      var y = 0;
      if (signalType === '方波') y = generateSquareWave(t, N, omega);
      else if (signalType === '锯齿波') y = generateSawtoothWave(t, N, omega);
      else if (signalType === '脉冲') y = generatePulseWave(t, N, omega);
      else y = generateMixedWave(t, N, omega);
      timeData.push([t, y]);
    }

    // Spectrum data
    var spectrumData = [];
    var freqLabels = [];
    var maxN = 20;
    for (var n = 1; n <= maxN; n++) {
      var amp = 0;
      if (signalType === '方波' && n % 2 === 1) amp = 4 / (Math.PI * n);
      else if (signalType === '锯齿波') amp = 2 / (Math.PI * n);
      else if (signalType === '脉冲' && n % 2 === 1) amp = 4 / (Math.PI * n) * 0.8;
      else if (signalType === '混合') {
        if (n % 2 === 1) amp = 0.5 * 4 / (Math.PI * n);
        amp += 0.3 * 2 / (Math.PI * n);
        if (n === 3) amp += 0.2;
      }
      var isUsed = (signalType === '方波' && n % 2 === 1 && n <= N * 2)
                || (signalType === '锯齿波' && n <= N)
                || (signalType === '脉冲' && n % 2 === 1 && n < N)
                || (signalType === '混合');
      spectrumData.push([n, amp]);
      freqLabels.push(n + '');
    }

    var opt = dualGridOption(
      [{
        type: 'line', data: timeData, smooth: true,
        lineStyle: { color: accent, width: 1.5 },
        itemStyle: { color: accent }, showSymbol: false, name: '时域信号'
      }],
      [{
        type: 'bar', data: spectrumData,
        itemStyle: {
          color: function (params) {
            var idx = params.dataIndex + 1;
            var isUsed = (signalType === '方波' && idx % 2 === 1 && idx <= N * 2)
                      || (signalType === '锯齿波' && idx <= N)
                      || (signalType === '脉冲' && idx % 2 === 1 && idx < N)
                      || (signalType === '混合');
            return isUsed ? accent2 : bg2;
          }
        },
        name: '频谱'
      }],
      0, tMax, -1.5, 1.5, 0, 1.5
    );
    charts.fft.setOption(opt, true);
  }

  /* ---------- OFDM Chart ---------- */
  function initOFDMChart() {
    var dom = document.getElementById('chartOFDM');
    if (!dom) return;
    charts.ofdm = echarts.init(dom, null, { renderer: 'svg' });

    var slider = document.getElementById('ofdm-carriers');
    if (slider) {
      slider.addEventListener('input', function () { updateOFDMChart(); });
    }

    updateOFDMChart();
  }

  function updateOFDMChart() {
    if (!charts.ofdm) return;
    var carriers = parseInt(document.getElementById('ofdm-carriers') ? document.getElementById('ofdm-carriers').value : 4, 10) || 4;
    var samples = 500;
    var tMax = 2 * Math.PI;
    var timeData = [];
    for (var i = 0; i <= samples; i++) {
      var t = tMax * i / samples;
      var y = 0;
      for (var k = 1; k <= carriers; k++) {
        y += Math.cos(k * 2 * t);
      }
      timeData.push([t, y / carriers]);
    }

    // Spectrum
    var spectrumData = [];
    for (var k = 1; k <= carriers; k++) {
      spectrumData.push([k * 2, 1]);
    }
    var freqMax = (carriers + 1) * 2;

    var opt = dualGridOption(
      [{
        type: 'line', data: timeData, smooth: false,
        lineStyle: { color: accent, width: 1.5 },
        itemStyle: { color: accent }, showSymbol: false, name: 'OFDM 时域'
      }],
      [{
        type: 'bar', data: spectrumData,
        itemStyle: { color: accent3 },
        name: '子载波频谱'
      }],
      0, tMax, -1.2, 1.2, 0, 1.5
    );
    opt.xAxis[1].max = freqMax;
    charts.ofdm.setOption(opt, true);
  }

  /* ---------- Filter Chart ---------- */
  function initFilterChart() {
    var dom = document.getElementById('chartFilter');
    if (!dom) return;
    charts.filter = echarts.init(dom, null, { renderer: 'svg' });

    var cutoffSlider = document.getElementById('filter-cutoff');
    var noiseSlider = document.getElementById('filter-noise');
    if (cutoffSlider) cutoffSlider.addEventListener('input', function () { updateFilterChart(); });
    if (noiseSlider) noiseSlider.addEventListener('input', function () { updateFilterChart(); });

    updateFilterChart();
  }

  function simpleLowPass(signal, cutoff, dt) {
    var alpha = Math.min(1, dt * cutoff);
    var result = [signal[0]];
    for (var i = 1; i < signal.length; i++) {
      result.push(alpha * signal[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  }

  function updateFilterChart() {
    if (!charts.filter) return;
    var cutoff = parseFloat(document.getElementById('filter-cutoff') ? document.getElementById('filter-cutoff').value : 8) || 8;
    var noiseLevel = parseFloat(document.getElementById('filter-noise') ? document.getElementById('filter-noise').value : 0.3) || 0.3;
    var samples = 500;
    var tMax = 2 * Math.PI;

    var original = [];
    var noisy = [];
    for (var i = 0; i <= samples; i++) {
      var t = tMax * i / samples;
      var clean = Math.sin(2 * Math.PI * 5 * t / tMax) + 0.3 * Math.sin(2 * Math.PI * 20 * t / tMax);
      original.push(clean);
      var noise = noiseLevel * (Math.random() * 2 - 1);
      noisy.push(clean + noise);
    }

    var filtered = simpleLowPass(noisy, cutoff / tMax * 20, 1);

    var originalData = [], noisyData = [], filteredData = [];
    for (var i = 0; i <= samples; i++) {
      var t = tMax * i / samples;
      originalData.push([t, original[i]]);
      noisyData.push([t, noisy[i]]);
      filteredData.push([t, filtered[i]]);
    }

    var opt = commonOption();
    opt.grid = { top: 40, right: 30, bottom: 40, left: 55 };
    opt.xAxis = makeAxis(0, tMax);
    opt.yAxis = makeAxis(-2, 2);
    opt.series = [
      {
        type: 'line', data: originalData, smooth: true,
        lineStyle: { color: accent4, width: 1.5 }, showSymbol: false, name: '原始信号'
      },
      {
        type: 'line', data: noisyData, smooth: false,
        lineStyle: { color: accent2, width: 0.8, opacity: 0.5 }, showSymbol: false, name: '加噪信号'
      },
      {
        type: 'line', data: filteredData, smooth: true,
        lineStyle: { color: accent3, width: 2 }, showSymbol: false, name: '滤波后信号'
      }
    ];
    opt.legend = {
      data: ['原始信号', '加噪信号', '滤波后信号'],
      textStyle: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
      top: 5
    };
    charts.filter.setOption(opt, true);
  }

  /* ============================================================
                        LAPLACE TRANSFORM
     ============================================================ */
  var laplaceInited = false;

  function initLaplace() {
    if (!laplaceInited) {
      initPoleZeroChart();
      initStepChart();
      initRLCChart();
      laplaceInited = true;
    } else {
      updatePoleZeroChart();
      updateStepChart();
      updateRLCChart();
    }
  }

  /* ---------- Pole-Zero Canvas ---------- */
  function initPoleZeroChart() {
    var canvas = document.getElementById('poleZeroCanvas');
    if (!canvas) return;
    charts.poleZero = canvas;

    bindButtonGroup('filterType', function () { updatePoleZeroChart(); });
    updatePoleZeroChart();
  }

  function updatePoleZeroChart() {
    var canvas = charts.poleZero;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var scale = 30;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();

    // Labels
    ctx.fillStyle = muted;
    ctx.font = '10px JetBrainsMono';
    ctx.fillText('Re', W - 20, cy - 5);
    ctx.fillText('Im', cx + 5, 12);
    ctx.fillText('0', cx + 3, cy + 12);

    // Grid ticks
    for (var v = -5; v <= 5; v++) {
      if (v === 0) continue;
      ctx.fillStyle = bg2;
      ctx.fillRect(cx + v * scale - 1, cy - 1, 2, 2);
      ctx.fillRect(cx - 1, cy - v * scale - 1, 2, 2);
    }

    var filterType = getActiveButton('filterType') || '低通';
    var w0 = 2;
    var poles = [];
    var zeros = [];
    var expr = '';

    if (filterType === '低通') {
      poles.push([-w0, 0]);
      expr = 'H(s) = ' + w0 + ' / (s + ' + w0 + ')';
    } else if (filterType === '高通') {
      poles.push([-w0, 0]);
      zeros.push([0, 0]);
      expr = 'H(s) = s / (s + ' + w0 + ')';
    } else {
      poles.push([-w0, w0], [-w0, -w0]);
      zeros.push([0, 0]);
      expr = 'H(s) = s\u00B7' + w0 + ' / ((s+' + w0 + ')\u00B2+' + (w0 * w0) + ')';
    }

    // Draw poles (x)
    poles.forEach(function (p) {
      var px = cx + p[0] * scale;
      var py = cy - p[1] * scale;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      var s = 7;
      ctx.beginPath();
      ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s);
      ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s);
      ctx.stroke();
    });

    // Draw zeros (o)
    zeros.forEach(function (z) {
      var zx = cx + z[0] * scale;
      var zy = cy - z[1] * scale;
      ctx.strokeStyle = accent4;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(zx, zy, 7, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Update result display
    var resultEl = document.getElementById('pole-result');
    if (resultEl) {
      var poleStr = poles.map(function (p) {
        var sign = p[1] >= 0 ? '+' : '';
        return '(' + p[0].toFixed(1) + sign + p[1].toFixed(1) + 'j)';
      }).join(', ');
      var zeroStr = zeros.map(function (z) {
        var sign = z[1] >= 0 ? '+' : '';
        return '(' + z[0].toFixed(1) + sign + z[1].toFixed(1) + 'j)';
      }).join(', ');
      resultEl.textContent = expr + '  |  极点: ' + poleStr + (zeroStr ? '  |  零点: ' + zeroStr : '');
    }
  }

  /* ---------- Step Response Chart ---------- */
  function initStepChart() {
    var dom = document.getElementById('chartStep');
    if (!dom) return;
    charts.step = echarts.init(dom, null, { renderer: 'svg' });

    var realSlider = document.getElementById('pole-real');
    var imagSlider = document.getElementById('pole-imag');
    if (realSlider) realSlider.addEventListener('input', function () { updateStepChart(); });
    if (imagSlider) imagSlider.addEventListener('input', function () { updateStepChart(); });

    updateStepChart();
  }

  function stepResponse(sigma, wd, t) {
    if (wd === 0) {
      return 1 - Math.exp(sigma * t);
    }
    return 1 - Math.exp(sigma * t) * (Math.cos(wd * t) + (sigma / wd) * Math.sin(wd * t));
  }

  function updateStepChart() {
    if (!charts.step) return;
    var sigma = parseFloat(document.getElementById('pole-real') ? document.getElementById('pole-real').value : -0.5) || -0.5;
    var wd = Math.abs(parseFloat(document.getElementById('pole-imag') ? document.getElementById('pole-imag').value : 2) || 2);
    var samples = 500;
    var tMax = 15;

    var currentData = [], stableData = [], unstableData = [];
    for (var i = 0; i <= samples; i++) {
      var t = tMax * i / samples;
      currentData.push([t, stepResponse(sigma, wd, t)]);
      stableData.push([t, stepResponse(-0.5, wd, t)]);
      unstableData.push([t, Math.min(stepResponse(0.5, wd, t), 5)]);
    }

    var opt = commonOption();
    opt.grid = { top: 40, right: 30, bottom: 40, left: 55 };
    opt.xAxis = makeAxis(0, tMax);
    opt.yAxis = makeAxis(-2, 5);
    opt.series = [
      {
        type: 'line', data: currentData, smooth: true,
        lineStyle: { color: accent, width: 2 }, showSymbol: false, name: '当前设置'
      },
      {
        type: 'line', data: stableData, smooth: true,
        lineStyle: { color: accent4, width: 1, type: 'dashed' }, showSymbol: false, name: '稳定(\u03C3<0)'
      },
      {
        type: 'line', data: unstableData, smooth: true,
        lineStyle: { color: '#ef4444', width: 1, type: 'dashed' }, showSymbol: false, name: '不稳定(\u03C3>0)'
      }
    ];
    opt.legend = {
      data: ['当前设置', '稳定(\u03C3<0)', '不稳定(\u03C3>0)'],
      textStyle: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
      top: 5
    };
    charts.step.setOption(opt, true);
  }

  /* ---------- RLC Chart ---------- */
  function initRLCChart() {
    var dom = document.getElementById('chartRLC');
    if (!dom) return;
    charts.rlc = echarts.init(dom, null, { renderer: 'svg' });

    var rSlider = document.getElementById('rlc-r');
    var lSlider = document.getElementById('rlc-l');
    var cSlider = document.getElementById('rlc-c');
    if (rSlider) rSlider.addEventListener('input', function () { updateRLCChart(); });
    if (lSlider) lSlider.addEventListener('input', function () { updateRLCChart(); });
    if (cSlider) cSlider.addEventListener('input', function () { updateRLCChart(); });

    updateRLCChart();
  }

  function updateRLCChart() {
    if (!charts.rlc) return;
    var R = parseFloat(document.getElementById('rlc-r') ? document.getElementById('rlc-r').value : 100) || 100;
    var L = parseFloat(document.getElementById('rlc-l') ? document.getElementById('rlc-l').value : 0.01) || 0.01;
    var C = parseFloat(document.getElementById('rlc-c') ? document.getElementById('rlc-c').value : 1e-6) || 1e-6;

    var f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    var fMin = Math.max(10, f0 / 10);
    var fMax = f0 * 10;
    var samples = 400;

    var data = [];
    for (var i = 0; i <= samples; i++) {
      var f = fMin * Math.pow(fMax / fMin, i / samples);
      var w = 2 * Math.PI * f;
      var denom = Math.sqrt(Math.pow(1 - w * w * L * C, 2) + Math.pow(w * R * C, 2));
      var gain = denom > 0 ? 20 * Math.log10(1 / denom) : -60;
      data.push([f, Math.max(gain, -60)]);
    }

    var opt = commonOption();
    opt.grid = { top: 40, right: 30, bottom: 40, left: 60 };
    opt.xAxis = {
      type: 'log', min: fMin, max: fMax,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10, formatter: function (v) { return v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0); } },
      splitLine: { lineStyle: { color: bg2 } },
      axisTick: { lineStyle: { color: rule } }
    };
    opt.yAxis = makeAxis(-60, 10);
    opt.yAxis.axisLabel.formatter = function (v) { return v + ' dB'; };
    opt.series = [
      {
        type: 'line', data: data, smooth: true,
        lineStyle: { color: accent, width: 2 }, showSymbol: false, name: '频率响应'
      }
    ];
    opt.legend = {
      data: ['频率响应'],
      textStyle: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
      top: 5
    };

    // Mark point at resonant frequency
    var w0 = 2 * Math.PI * f0;
    var denom0 = Math.sqrt(Math.pow(1 - w0 * w0 * L * C, 2) + Math.pow(w0 * R * C, 2));
    var gain0 = denom0 > 0 ? 20 * Math.log10(1 / denom0) : 0;

    opt.graphic = [{
      type: 'text',
      left: 60,
      bottom: 55,
      style: {
        text: 'f\u2080 = ' + f0.toFixed(1) + ' Hz',
        fill: accent2,
        fontFamily: 'JetBrainsMono',
        fontSize: 11
      }
    }];
    charts.rlc.setOption(opt, true);
  }

  /* ============================================================
                          Z-TRANSFORM
     ============================================================ */
  var zInited = false;

  function initZTransform() {
    if (!zInited) {
      initUnitCircleChart();
      initDigitalFilterChart();
      initVoiceChart();
      zInited = true;
    } else {
      updateUnitCircleChart();
      updateDigitalFilterChart();
      updateVoiceChart();
    }
  }

  /* ---------- Unit Circle Canvas ---------- */
  function initUnitCircleChart() {
    var canvas = document.getElementById('unitCircleCanvas');
    if (!canvas) return;
    charts.unitCircle = canvas;

    bindButtonGroup('z-filter-type', function () { updateUnitCircleChart(); });
    updateUnitCircleChart();
  }

  function updateUnitCircleChart() {
    var canvas = charts.unitCircle;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var scale = 50;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.font = '10px JetBrainsMono';
    ctx.fillText('Re', W - 20, cy - 5);
    ctx.fillText('Im', cx + 5, 12);

    // Unit circle
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = muted;
    ctx.font = '9px JetBrainsMono';
    ctx.fillText('1', cx + scale + 3, cy - 3);

    var filterType = getActiveButton('z-filter-type') || '低通';
    var r = 0.7;
    var theta = Math.PI / 6;
    var poles = [];
    var zeros = [];

    if (filterType === '低通') {
      poles.push([r * Math.cos(theta), r * Math.sin(theta)]);
      zeros.push([1, 0], [-1, 0]);
    } else if (filterType === '高通') {
      poles.push([r * Math.cos(theta), r * Math.sin(theta)]);
      zeros.push([1, 0], [-1, 0]);
    } else {
      // Bandpass: conjugate poles
      poles.push([r * Math.cos(theta), r * Math.sin(theta)]);
      poles.push([r * Math.cos(theta), -r * Math.sin(theta)]);
      zeros.push([1, 0], [-1, 0]);
    }

    // Draw poles
    poles.forEach(function (p) {
      var px = cx + p[0] * scale;
      var py = cy - p[1] * scale;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      var s = 7;
      ctx.beginPath();
      ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s);
      ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s);
      ctx.stroke();
    });

    // Draw zeros
    zeros.forEach(function (z) {
      var zx = cx + z[0] * scale;
      var zy = cy - z[1] * scale;
      ctx.strokeStyle = accent4;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(zx, zy, 7, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }

  /* ---------- Digital Filter Chart ---------- */
  function initDigitalFilterChart() {
    var dom = document.getElementById('chartDigitalFilter');
    if (!dom) return;
    charts.digitalFilter = echarts.init(dom, null, { renderer: 'svg' });

    var poleSlider = document.getElementById('df-pole');
    var zeroSlider = document.getElementById('df-zero');
    if (poleSlider) poleSlider.addEventListener('input', function () { updateDigitalFilterChart(); });
    if (zeroSlider) zeroSlider.addEventListener('input', function () { updateDigitalFilterChart(); });

    updateDigitalFilterChart();
  }

  function updateDigitalFilterChart() {
    if (!charts.digitalFilter) return;
    var poleR = parseFloat(document.getElementById('df-pole') ? document.getElementById('df-pole').value : 0.7) || 0.7;
    var zeroR = parseFloat(document.getElementById('df-zero') ? document.getElementById('df-zero').value : 0.9) || 0.9;
    var theta = Math.PI / 6;
    var samples = 300;

    var data = [];
    for (var i = 0; i <= samples; i++) {
      var w = Math.PI * i / samples;
      // H(z) = (1 - z^-1)(1 + z^-1) / (1 - 2r*cos(theta)*z^-1 + r^2*z^-2)
      var numRe = (1 - zeroR * Math.cos(w)) * (1 + zeroR * Math.cos(w));
      var numIm = zeroR * Math.sin(w) * (1 + zeroR * Math.cos(w));
      var denRe = 1 - 2 * poleR * Math.cos(theta) * Math.cos(w) + poleR * poleR * Math.cos(2 * w);
      var denIm = 2 * poleR * Math.cos(theta) * Math.sin(w) - poleR * poleR * Math.sin(2 * w);

      var numMag = Math.sqrt(numRe * numRe + numIm * numIm);
      var denMag = Math.sqrt(denRe * denRe + denIm * denIm);
      var H = denMag > 1e-10 ? numMag / denMag : 0;
      var gain = 20 * Math.log10(Math.max(H, 1e-10));
      data.push([w, Math.max(gain, -60)]);
    }

    var opt = commonOption();
    opt.grid = { top: 40, right: 30, bottom: 40, left: 60 };
    opt.xAxis = {
      type: 'value', min: 0, max: Math.PI,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: {
        color: muted, fontFamily: 'JetBrainsMono', fontSize: 10,
        formatter: function (v) { return (v / Math.PI).toFixed(1) + '\u03C0'; }
      },
      splitLine: { lineStyle: { color: bg2 } },
      axisTick: { lineStyle: { color: rule } }
    };
    opt.yAxis = makeAxis(-60, 20);
    opt.yAxis.axisLabel.formatter = function (v) { return v + ' dB'; };
    opt.series = [
      {
        type: 'line', data: data, smooth: true,
        lineStyle: { color: accent, width: 2 }, showSymbol: false, name: '数字滤波器响应'
      }
    ];
    opt.legend = {
      data: ['数字滤波器响应'],
      textStyle: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
      top: 5
    };
    charts.digitalFilter.setOption(opt, true);
  }

  /* ---------- Voice Sampling Chart ---------- */
  function initVoiceChart() {
    var dom = document.getElementById('chartVoice');
    if (!dom) return;
    charts.voice = echarts.init(dom, null, { renderer: 'svg' });

    var srSlider = document.getElementById('voice-sr');
    var filterSlider = document.getElementById('voice-filter');
    if (srSlider) srSlider.addEventListener('input', function () { updateVoiceChart(); });
    if (filterSlider) filterSlider.addEventListener('input', function () { updateVoiceChart(); });

    updateVoiceChart();
  }

  function sinc(x) {
    if (Math.abs(x) < 1e-10) return 1;
    return Math.sin(Math.PI * x) / (Math.PI * x);
  }

  function updateVoiceChart() {
    if (!charts.voice) return;
    var srMult = parseInt(document.getElementById('voice-sr') ? document.getElementById('voice-sr').value : 4) || 4;
    var filterStrength = parseFloat(document.getElementById('voice-filter') ? document.getElementById('voice-filter').value : 0.5) || 0.5;
    var N = 1000;
    var tMax = 1;

    // Original signal: sum of sinusoids to simulate voice
    var original = [];
    for (var i = 0; i <= N; i++) {
      var t = tMax * i / N;
      var y = 0.5 * Math.sin(2 * Math.PI * 3 * t)
            + 0.3 * Math.sin(2 * Math.PI * 7 * t)
            + 0.2 * Math.sin(2 * Math.PI * 12 * t)
            + 0.1 * Math.sin(2 * Math.PI * 20 * t);
      original.push([t, y]);
    }

    // Sampling
    var sampleInterval = Math.max(1, Math.floor(N / (srMult * 5)));
    var sampledPoints = [];
    for (var i = 0; i <= N; i += sampleInterval) {
      sampledPoints.push([original[i][0], original[i][1]]);
    }

    // Reconstruction via sinc interpolation
    var reconstructed = [];
    var alpha = Math.min(1, filterStrength);
    for (var i = 0; i <= N; i++) {
      var t = tMax * i / N;
      var val = 0;
      var totalWeight = 0;
      for (var k = 0; k < sampledPoints.length; k++) {
        var sk = sampledPoints[k][0];
        var yk = sampledPoints[k][1];
        var x = t / (tMax / (srMult * 5)) - k;
        var w = sinc(x);
        val += yk * w;
        totalWeight += Math.abs(w);
      }
      val = totalWeight > 0 ? val / totalWeight * (srMult * 5) / srMult : 0;
      reconstructed.push([t, val]);
    }

    // Simple smoothing pass
    var smoothed = [];
    var smoothN = Math.max(1, Math.floor(alpha * 10));
    for (var i = 0; i < reconstructed.length; i++) {
      var sum = 0, count = 0;
      for (var j = Math.max(0, i - smoothN); j <= Math.min(reconstructed.length - 1, i + smoothN); j++) {
        sum += reconstructed[j][1];
        count++;
      }
      smoothed.push([reconstructed[i][0], sum / count]);
    }

    // Use smoothed if filter > 0
    var finalRecon = filterStrength > 0.01 ? smoothed : reconstructed;

    // Sample scatter
    var scatterData = sampledPoints.map(function (p) { return [p[0], p[1]]; });

    var opt = commonOption();
    opt.grid = { top: 40, right: 30, bottom: 40, left: 55 };
    opt.xAxis = makeAxis(0, tMax);
    opt.yAxis = makeAxis(-1.5, 1.5);
    opt.series = [
      {
        type: 'line', data: original, smooth: true,
        lineStyle: { color: accent4, width: 1.5 }, showSymbol: false, name: '原始信号'
      },
      {
        type: 'scatter', data: scatterData,
        symbol: 'circle', symbolSize: 6,
        itemStyle: { color: accent2 }, name: '采样点'
      },
      {
        type: 'line', data: finalRecon, smooth: true,
        lineStyle: { color: accent3, width: 1.5 }, showSymbol: false, name: '恢复信号'
      }
    ];
    opt.legend = {
      data: ['原始信号', '采样点', '恢复信号'],
      textStyle: { color: muted, fontFamily: 'JetBrainsMono', fontSize: 10 },
      top: 5
    };
    charts.voice.setOption(opt, true);
  }

  /* ============================================================
                        INIT ALL & RESIZE
     ============================================================ */
  function initAll() {
    initTabs();
    initFourier();
  }

  window.addEventListener('DOMContentLoaded', initAll);

  window.addEventListener('resize', function () {
    Object.keys(charts).forEach(function (key) {
      if (charts[key] && charts[key].resize) {
        charts[key].resize();
      }
    });
  });

  /* ============================================================
                     EXPOSE FUNCTIONS FOR INLINE SCRIPT
     ============================================================ */
  window.initTransformCharts = function (target) {
    if (target === 'fourier') initFourier();
    else if (target === 'laplace') initLaplace();
    else if (target === 'z') initZTransform();
  };

  window.updateFFTSignal = function (type) { updateFFTChart(); };
  window.updateFFT = function (v) { updateFFTChart(); };
  window.updateOFDM = function (v) { updateOFDMChart(); };
  window.updateFilter = function (v) { updateFilterChart(); };
  window.updatePoleZero = function (type) { updatePoleZeroChart(); };
  window.updateStep = function (v) { updateStepChart(); };
  window.updateRLC = function (v) { updateRLCChart(); };
  window.updateUnitCircle = function (type) { updateUnitCircleChart(); };
  window.updateDigitalFilter = function (v) { updateDigitalFilterChart(); };
  window.updateVoice = function (v) { updateVoiceChart(); };

})();
