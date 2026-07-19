(function() {
  'use strict';

  var COLORS = {
    accent: '#f59e0b',
    accent2: '#06b6d4',
    accent3: '#ec4899',
    accent4: '#10b981',
    accent5: '#8b5cf6',
    red: '#ef4444',
    muted: '#94a3b8',
    rule: '#334155',
    ink: '#f1f5f9',
    bg: '#0b1120',
    bg2: '#151e32',
    bg3: '#1e293b'
  };

  // ===================== Shared ECharts Helpers =====================

  function makeAxis(min, max) {
    var opt = {
      type: 'value',
      axisLine: { lineStyle: { color: COLORS.rule } },
      axisLabel: { color: COLORS.muted, fontFamily: 'JetBrainsMono', fontSize: 11 },
      splitLine: { lineStyle: { color: COLORS.bg2, type: 'dashed' } },
      axisTick: { lineStyle: { color: COLORS.rule } }
    };
    if (min !== undefined) opt.min = min;
    if (max !== undefined) opt.max = max;
    return opt;
  }

  function makeTooltip() {
    return {
      trigger: 'axis',
      appendToBody: true,
      backgroundColor: COLORS.bg3,
      borderColor: COLORS.rule,
      textStyle: { color: COLORS.ink, fontFamily: 'JetBrainsMono', fontSize: 12 }
    };
  }

  function generateQuadData(a, b, c, xMin, xMax, steps) {
    var data = [];
    for (var i = 0; i <= steps; i++) {
      var x = xMin + (xMax - xMin) * i / steps;
      var y = a * x * x + b * x + c;
      if (Math.abs(y) > 50) y = y > 0 ? 50 : -50;
      data.push([x, y]);
    }
    return data;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function solveQuadratic(a, b, c) {
    if (Math.abs(a) < 1e-9) return { delta: b * b, roots: [] };
    var d = b * b - 4 * a * c;
    if (d > 1e-9) {
      var sd = Math.sqrt(d);
      return { delta: d, roots: [(-b + sd) / (2 * a), (-b - sd) / (2 * a)] };
    } else if (Math.abs(d) <= 1e-9) {
      return { delta: 0, roots: [-b / (2 * a)] };
    } else {
      return { delta: d, roots: [] };
    }
  }

  // ===================== 1. Balance Chart (Canvas) =====================

  function initBalanceChart() {
    var canvas = document.getElementById('balanceCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 600, H = 250;

    var leftVal = 3, rightVal = 3;
    var currentAngle = 0;
    var targetAngle = 0;
    var animId = null;

    var sliderN = document.getElementById('balanceSliderN');
    var valN = document.getElementById('balanceN');

    sliderN.addEventListener('input', function() {
      valN.textContent = parseFloat(this.value).toFixed(1);
    });

    function getN() { return parseFloat(sliderN.value); }

    function updateStatus() {
      var formulaEl = document.getElementById('balanceFormula');
      var statusEl = document.getElementById('balanceStatus');
      formulaEl.textContent = leftVal.toFixed(1) + ' = ' + rightVal.toFixed(1);
      if (Math.abs(leftVal - rightVal) < 0.01) {
        statusEl.textContent = '\u2713 \u7b49\u5f0f\u6210\u7acb';
        statusEl.className = 'eq-status balanced';
      } else {
        statusEl.textContent = '\u2717 \u7b49\u5f0f\u4e0d\u6210\u7acb';
        statusEl.className = 'eq-status unbalanced';
      }
    }

    function computeTargetAngle() {
      var diff = leftVal - rightVal;
      targetAngle = clamp(diff * 0.06, -0.35, 0.35);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg3;
      ctx.fillRect(0, 0, W, H);

      var cx = W / 2;
      var beamY = 80;
      var beamLen = 360;
      var fulcrumY = H - 40;

      // Smooth angle
      currentAngle += (targetAngle - currentAngle) * 0.1;
      if (Math.abs(currentAngle - targetAngle) < 0.001) currentAngle = targetAngle;

      // Fulcrum (triangle)
      ctx.fillStyle = COLORS.muted;
      ctx.beginPath();
      ctx.moveTo(cx, beamY + 10);
      ctx.lineTo(cx - 25, fulcrumY);
      ctx.lineTo(cx + 25, fulcrumY);
      ctx.closePath();
      ctx.fill();

      // Base line
      ctx.strokeStyle = COLORS.rule;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 60, fulcrumY);
      ctx.lineTo(cx + 60, fulcrumY);
      ctx.stroke();

      // Beam
      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(currentAngle);

      // Beam bar
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-beamLen / 2, 0);
      ctx.lineTo(beamLen / 2, 0);
      ctx.stroke();

      // Left pan
      var panW = 60, panH = 30;
      var leftX = -beamLen / 2;
      var rightX = beamLen / 2;

      // Left rope
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(leftX, 0);
      ctx.lineTo(leftX, 35);
      ctx.stroke();
      ctx.setLineDash([]);

      // Left pan
      ctx.fillStyle = 'rgba(6,182,212,0.2)';
      ctx.strokeStyle = COLORS.accent2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftX - panW / 2, 35);
      ctx.lineTo(leftX + panW / 2, 35);
      ctx.lineTo(leftX + panW / 2 - 5, 35 + panH);
      ctx.lineTo(leftX - panW / 2 + 5, 35 + panH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left value
      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(leftVal.toFixed(1), leftX, 57);

      // Right rope
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(rightX, 0);
      ctx.lineTo(rightX, 35);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right pan
      ctx.fillStyle = 'rgba(236,72,153,0.2)';
      ctx.strokeStyle = COLORS.accent3;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rightX - panW / 2, 35);
      ctx.lineTo(rightX + panW / 2, 35);
      ctx.lineTo(rightX + panW / 2 - 5, 35 + panH);
      ctx.lineTo(rightX - panW / 2 + 5, 35 + panH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right value
      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(rightVal.toFixed(1), rightX, 57);

      ctx.restore();

      // Labels
      ctx.fillStyle = COLORS.muted;
      ctx.font = '12px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('\u5de6\u8fb9', cx - beamLen / 2 - 5, beamY - 15);
      ctx.fillText('\u53f3\u8fb9', cx + beamLen / 2 + 5, beamY - 15);

      // Continue animation if needed
      if (Math.abs(currentAngle - targetAngle) > 0.001) {
        animId = requestAnimationFrame(draw);
      } else {
        animId = null;
      }
    }

    function animate() {
      if (animId) cancelAnimationFrame(animId);
      computeTargetAngle();
      updateStatus();
      animId = requestAnimationFrame(draw);
    }

    // Button handlers
    document.getElementById('balLeftAdd').addEventListener('click', function() {
      leftVal = parseFloat((leftVal + getN()).toFixed(1));
      animate();
    });
    document.getElementById('balLeftSub').addEventListener('click', function() {
      leftVal = parseFloat((leftVal - getN()).toFixed(1));
      animate();
    });
    document.getElementById('balRightAdd').addEventListener('click', function() {
      rightVal = parseFloat((rightVal + getN()).toFixed(1));
      animate();
    });
    document.getElementById('balRightSub').addEventListener('click', function() {
      rightVal = parseFloat((rightVal - getN()).toFixed(1));
      animate();
    });
    document.getElementById('balBothAdd').addEventListener('click', function() {
      leftVal = parseFloat((leftVal + getN()).toFixed(1));
      rightVal = parseFloat((rightVal + getN()).toFixed(1));
      animate();
    });
    document.getElementById('balReset').addEventListener('click', function() {
      leftVal = 3; rightVal = 3;
      currentAngle = 0; targetAngle = 0;
      animate();
    });

    // Initial draw
    updateStatus();
    draw();
  }

  // ===================== 2. Inequality Chart (Canvas) =====================

  function initInequalityChart() {
    var canvas = document.getElementById('ineqCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 600, H = 300;

    var boundVal = 3;
    var ineqDir = '>';
    var history = [];

    var sliderN = document.getElementById('ineqSliderN');
    var valN = document.getElementById('ineqN');
    sliderN.addEventListener('input', function() {
      valN.textContent = parseFloat(this.value).toFixed(1);
    });

    function getN() { return parseFloat(sliderN.value); }

    function updateDisplay() {
      var formulaEl = document.getElementById('ineqFormula');
      var statusEl = document.getElementById('ineqStatus');
      formulaEl.innerHTML = 'x ' + (ineqDir === '>' ? '&gt;' : '&lt;') + ' ' + boundVal.toFixed(1);
      statusEl.textContent = '\u5f53\u524d\u4e0d\u7b49\u5f0f\uff1ax ' + ineqDir + ' ' + boundVal.toFixed(1);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg3;
      ctx.fillRect(0, 0, W, H);

      var lineY = 100;
      var lineXMin = 50;
      var lineXMax = W - 30;
      var rangeMin = -10;
      var rangeMax = 10;

      function xToPixel(val) {
        return lineXMin + (val - rangeMin) / (rangeMax - rangeMin) * (lineXMax - lineXMin);
      }

      // Title
      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('x ' + ineqDir + ' ' + boundVal.toFixed(1), W / 2, 30);

      // Number line
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineXMin, lineY);
      ctx.lineTo(lineXMax, lineY);
      ctx.stroke();

      // Arrow
      ctx.fillStyle = COLORS.muted;
      ctx.beginPath();
      ctx.moveTo(lineXMax, lineY);
      ctx.lineTo(lineXMax - 10, lineY - 5);
      ctx.lineTo(lineXMax - 10, lineY + 5);
      ctx.closePath();
      ctx.fill();

      // Tick marks and labels
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px JetBrainsMono';
      ctx.textAlign = 'center';
      for (var v = rangeMin; v <= rangeMax; v++) {
        var px = xToPixel(v);
        var isMajor = v % 5 === 0;
        ctx.strokeStyle = isMajor ? COLORS.muted : COLORS.rule;
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(px, lineY - (isMajor ? 8 : 5));
        ctx.lineTo(px, lineY + (isMajor ? 8 : 5));
        ctx.stroke();
        if (isMajor || v % 2 === 0) {
          ctx.fillText(v.toString(), px, lineY + 22);
        }
      }

      // Colored region
      var boundPx = xToPixel(boundVal);
      if (ineqDir === '>') {
        // Shade from boundPx to lineXMax (x > boundVal)
        var grad = ctx.createLinearGradient(boundPx, 0, lineXMax, 0);
        grad.addColorStop(0, 'rgba(16,185,129,0.35)');
        grad.addColorStop(1, 'rgba(16,185,129,0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(boundPx, lineY - 20, lineXMax - boundPx, 40);
      } else {
        // Shade from lineXMin to boundPx (x < boundVal)
        var grad2 = ctx.createLinearGradient(lineXMin, 0, boundPx, 0);
        grad2.addColorStop(0, 'rgba(16,185,129,0.08)');
        grad2.addColorStop(1, 'rgba(16,185,129,0.35)');
        ctx.fillStyle = grad2;
        ctx.fillRect(lineXMin, lineY - 20, boundPx - lineXMin, 40);
      }

      // Boundary point
      ctx.beginPath();
      ctx.arc(boundPx, lineY, 7, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.accent;
      ctx.fill();
      ctx.strokeStyle = COLORS.bg3;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label boundary
      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 13px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText(boundVal.toFixed(1), boundPx, lineY - 18);

      // Direction arrow
      ctx.strokeStyle = COLORS.accent4;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ineqDir === '>') {
        ctx.moveTo(boundPx + 15, lineY);
        ctx.lineTo(boundPx + 50, lineY);
        ctx.stroke();
        ctx.fillStyle = COLORS.accent4;
        ctx.beginPath();
        ctx.moveTo(boundPx + 50, lineY);
        ctx.lineTo(boundPx + 43, lineY - 5);
        ctx.lineTo(boundPx + 43, lineY + 5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.moveTo(boundPx - 15, lineY);
        ctx.lineTo(boundPx - 50, lineY);
        ctx.stroke();
        ctx.fillStyle = COLORS.accent4;
        ctx.beginPath();
        ctx.moveTo(boundPx - 50, lineY);
        ctx.lineTo(boundPx - 43, lineY - 5);
        ctx.lineTo(boundPx - 43, lineY + 5);
        ctx.closePath();
        ctx.fill();
      }

      // Solution text
      ctx.fillStyle = COLORS.accent4;
      ctx.font = '600 14px Outfit';
      ctx.textAlign = 'center';
      var solText = ineqDir === '>' ?
        '\u89e3\u96c6\uff1ax > ' + boundVal.toFixed(1) :
        '\u89e3\u96c6\uff1ax < ' + boundVal.toFixed(1);
      ctx.fillText(solText, W / 2, lineY + 50);

      // History log
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px JetBrainsMono';
      ctx.textAlign = 'left';
      ctx.fillText('\u64cd\u4f5c\u8bb0\u5f55\uff1a', 20, lineY + 85);
      var startIdx = Math.max(0, history.length - 5);
      for (var i = startIdx; i < history.length; i++) {
        var isFlip = history[i].indexOf('\u53cd\u8f6c') >= 0;
        ctx.fillStyle = isFlip ? COLORS.red : COLORS.muted;
        ctx.fillText((i + 1) + '. ' + history[i], 20, lineY + 105 + (i - startIdx) * 18);
      }
    }

    // Button handlers
    document.getElementById('ineqAddPos').addEventListener('click', function() {
      var n = Math.abs(getN());
      boundVal = parseFloat((boundVal + n).toFixed(1));
      history.push('\u4e24\u8fb9+' + n.toFixed(1) + ' → ' + 'x ' + ineqDir + ' ' + boundVal.toFixed(1));
      updateDisplay();
      draw();
    });
    document.getElementById('ineqAddNeg').addEventListener('click', function() {
      var n = Math.abs(getN());
      boundVal = parseFloat((boundVal - n).toFixed(1));
      history.push('\u4e24\u8fb9' + (-n).toFixed(1) + ' → ' + 'x ' + ineqDir + ' ' + boundVal.toFixed(1));
      updateDisplay();
      draw();
    });
    document.getElementById('ineqMulPos').addEventListener('click', function() {
      var n = Math.abs(getN());
      if (Math.abs(n) < 0.01) return;
      boundVal = parseFloat((boundVal * n).toFixed(1));
      history.push('\u4e24\u8fb9\u00d7' + n.toFixed(1) + ' → ' + 'x ' + ineqDir + ' ' + boundVal.toFixed(1));
      updateDisplay();
      draw();
    });
    document.getElementById('ineqMulNeg').addEventListener('click', function() {
      var n = Math.abs(getN());
      if (Math.abs(n) < 0.01) return;
      boundVal = parseFloat((boundVal * n).toFixed(1));
      ineqDir = ineqDir === '>' ? '<' : '>';
      history.push('\u4e24\u8fb9\u00d7(-' + n.toFixed(1) + ') → \u4e0d\u7b49\u53f7\u53cd\u8f6c\uff01→ x ' + ineqDir + ' ' + boundVal.toFixed(1));
      updateDisplay();
      draw();
    });
    document.getElementById('ineqReset').addEventListener('click', function() {
      boundVal = 3;
      ineqDir = '>';
      history = [];
      updateDisplay();
      draw();
    });

    updateDisplay();
    draw();
  }

  // ===================== 3. Mean Inequality Chart (ECharts) =====================

  function initMeanInequalityChart(c) {
    var dom = document.getElementById('chartMeanIneq');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function update(cc) {
      var data = [];
      var steps = 600;
      var xMin = -3, xMax = 3;
      for (var i = 0; i <= steps; i++) {
        var x = xMin + (xMax - xMin) * i / steps;
        if (Math.abs(x) < 0.05) continue;
        var y = x * x + (cc * cc) / (x * x);
        if (y > 30) continue;
        data.push([x, y]);
      }

      var minVal = 2 * cc * cc;
      var minLabel = '\u6700\u5c0f\u503c = ' + minVal.toFixed(2);
      var minPoints = [
        { coord: [cc, minVal], name: minLabel, value: minVal },
        { coord: [-cc, minVal], name: minLabel, value: minVal }
      ];

      chart.setOption({
        animation: true,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(-3.5, 3.5),
        yAxis: makeAxis(0, Math.max(10, minVal * 1.8)),
        tooltip: makeTooltip(),
        series: [
          {
            type: 'line',
            data: data,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: COLORS.accent, width: 2.5 },
            areaStyle: { color: 'rgba(245,158,11,0.12)' }
          },
          {
            type: 'line',
            data: [[-3.5, minVal], [3.5, minVal]],
            lineStyle: { color: COLORS.accent2, width: 2, type: 'dashed' },
            showSymbol: false,
            markPoint: {
              data: minPoints,
              symbolSize: 10,
              itemStyle: { color: COLORS.red },
              label: {
                show: true,
                position: 'top',
                formatter: function(p) { return p.name; },
                color: COLORS.ink,
                fontSize: 11,
                fontFamily: 'JetBrainsMono'
              }
            }
          }
        ]
      });
    }

    update(c);
    return { chart: chart, update: update };
  }

  // ===================== 4. Geometric Chart (Canvas) =====================

  function initGeometricChart(a, b) {
    var canvas = document.getElementById('geoCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 500, H = 400;

    function draw(aa, bb) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg3;
      ctx.fillRect(0, 0, W, H);

      var scale = 50;
      var ox = 60, oy = 50;

      var a2 = aa * aa;
      var b2 = bb * bb;
      var ab = aa * bb;
      var sum2 = a2 + b2;
      var twiceAb = 2 * ab;
      var diff = sum2 - twiceAb;

      // Row 1: a² + b²
      // Draw a² square
      ctx.fillStyle = 'rgba(245,158,11,0.3)';
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.fillRect(ox, oy, aa * scale, aa * scale);
      ctx.strokeRect(ox, oy, aa * scale, aa * scale);

      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 14px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('a\u00b2 = ' + a2.toFixed(1), ox + aa * scale / 2, oy + aa * scale / 2 + 5);

      // Draw b² square
      var b2x = ox + aa * scale + 20;
      ctx.fillStyle = 'rgba(6,182,212,0.3)';
      ctx.strokeStyle = COLORS.accent2;
      ctx.lineWidth = 2;
      ctx.fillRect(b2x, oy, bb * scale, bb * scale);
      ctx.strokeRect(b2x, oy, bb * scale, bb * scale);

      ctx.fillStyle = COLORS.ink;
      ctx.fillText('b\u00b2 = ' + b2.toFixed(1), b2x + bb * scale / 2, oy + bb * scale / 2 + 5);

      // Label row 1
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 14px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText('a\u00b2 + b\u00b2 = ' + sum2.toFixed(1), ox, oy + Math.max(aa, bb) * scale + 30);

      // Row 2: 2ab (two rectangles)
      var row2y = oy + Math.max(aa, bb) * scale + 55;

      // Rectangle 1: a x b
      ctx.fillStyle = 'rgba(236,72,153,0.3)';
      ctx.strokeStyle = COLORS.accent3;
      ctx.lineWidth = 2;
      ctx.fillRect(ox, row2y, aa * scale, bb * scale);
      ctx.strokeRect(ox, row2y, aa * scale, bb * scale);

      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 14px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('ab = ' + ab.toFixed(1), ox + aa * scale / 2, row2y + bb * scale / 2 + 5);

      // Rectangle 2: a x b
      var r2x = ox + aa * scale + 20;
      ctx.fillStyle = 'rgba(236,72,153,0.3)';
      ctx.strokeStyle = COLORS.accent3;
      ctx.lineWidth = 2;
      ctx.fillRect(r2x, row2y, aa * scale, bb * scale);
      ctx.strokeRect(r2x, row2y, aa * scale, bb * scale);

      ctx.fillStyle = COLORS.ink;
      ctx.fillText('ab = ' + ab.toFixed(1), r2x + aa * scale / 2, row2y + bb * scale / 2 + 5);

      // Label row 2
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 14px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText('2ab = ' + twiceAb.toFixed(1), ox, row2y + bb * scale + 30);

      // Comparison
      var compY = row2y + bb * scale + 60;
      if (Math.abs(diff) < 0.01) {
        ctx.fillStyle = COLORS.accent4;
        ctx.font = '700 18px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('a\u00b2 + b\u00b2 = 2ab  (a = b \u65f6\u53d6\u7b49\u53f7)', W / 2, compY);
      } else if (diff > 0) {
        ctx.fillStyle = COLORS.accent;
        ctx.font = '700 18px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('a\u00b2 + b\u00b2 > 2ab  (\u5dee\u503c: ' + diff.toFixed(2) + ')', W / 2, compY);
      } else {
        ctx.fillStyle = COLORS.red;
        ctx.font = '700 18px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('a\u00b2 + b\u00b2 < 2ab  (\u4e0d\u53ef\u80fd\uff0c\u56e0\u4e3a (a-b)\u00b2 \u2265 0)', W / 2, compY);
      }

      // Dimension labels
      ctx.fillStyle = COLORS.muted;
      ctx.font = '12px JetBrainsMono';
      // a label
      ctx.textAlign = 'center';
      ctx.fillText('a=' + aa.toFixed(1), ox + aa * scale / 2, oy - 8);
      // b label (for b² square)
      ctx.textAlign = 'left';
      ctx.fillText('b=' + bb.toFixed(1), b2x + bb * scale + 5, oy + bb * scale / 2);
    }

    draw(a, b);
    return { draw: draw };
  }

  // ===================== 5. Quadratic Chart (ECharts) =====================

  function initQuadraticChart(a, b, c) {
    var dom = document.getElementById('chartQuadratic');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function update(aa, bb, cc) {
      if (Math.abs(aa) < 0.01) aa = 0.01;
      var data = generateQuadData(aa, bb, cc, -6, 6, 500);
      var vertexX = -bb / (2 * aa);
      var vertexY = aa * vertexX * vertexX + bb * vertexX + cc;
      var delta = bb * bb - 4 * aa * cc;
      var sol = solveQuadratic(aa, bb, cc);

      var yMin = Math.min(vertexY, 0) - 3;
      var yMax = Math.max(vertexY, 0) + 3;
      if (Math.abs(aa) < 0.5) { yMin = Math.min(yMin, -5); yMax = Math.max(yMax, 5); }

      var markPoints = [
        {
          coord: [vertexX, vertexY],
          name: '\u9876\u70b9',
          symbolSize: 10,
          itemStyle: { color: COLORS.red },
          label: {
            show: true,
            position: 'top',
            formatter: '(' + vertexX.toFixed(2) + ', ' + vertexY.toFixed(2) + ')',
            color: COLORS.ink,
            fontSize: 11,
            fontFamily: 'JetBrainsMono'
          }
        }
      ];

      if (sol.roots.length === 2) {
        var r1 = Math.min(sol.roots[0], sol.roots[1]);
        var r2 = Math.max(sol.roots[0], sol.roots[1]);
        markPoints.push({
          coord: [r1, 0], name: 'x\u2081', symbolSize: 8,
          itemStyle: { color: COLORS.accent4 },
          label: { show: true, position: 'bottom', formatter: 'x\u2081=' + r1.toFixed(2), color: COLORS.accent4, fontSize: 10, fontFamily: 'JetBrainsMono' }
        });
        markPoints.push({
          coord: [r2, 0], name: 'x\u2082', symbolSize: 8,
          itemStyle: { color: COLORS.accent4 },
          label: { show: true, position: 'bottom', formatter: 'x\u2082=' + r2.toFixed(2), color: COLORS.accent4, fontSize: 10, fontFamily: 'JetBrainsMono' }
        });
      } else if (sol.roots.length === 1) {
        markPoints.push({
          coord: [sol.roots[0], 0], name: 'x\u2080', symbolSize: 8,
          itemStyle: { color: COLORS.accent4 },
          label: { show: true, position: 'bottom', formatter: 'x=' + sol.roots[0].toFixed(2), color: COLORS.accent4, fontSize: 10, fontFamily: 'JetBrainsMono' }
        });
      }

      chart.setOption({
        animation: false,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(-6, 6),
        yAxis: makeAxis(yMin, yMax),
        tooltip: makeTooltip(),
        series: [{
          type: 'line',
          data: data,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: COLORS.accent, width: 2.5 },
          areaStyle: { color: 'rgba(245,158,11,0.10)' },
          markLine: {
            silent: true,
            lineStyle: { color: COLORS.accent5, type: 'dashed', width: 1.5 },
            label: { show: true, formatter: 'x={c}', color: COLORS.accent5, fontFamily: 'JetBrainsMono', fontSize: 11 },
            data: [{ xAxis: vertexX }]
          },
          markPoint: { data: markPoints }
        }]
      });
    }

    update(a, b, c);
    return { chart: chart, update: update };
  }

  // ===================== 6. Param Effect Chart (ECharts, 3 grids) =====================

  function initParamEffectChart() {
    var dom = document.getElementById('chartParamEffect');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function update(pa, pb, pc) {
      if (Math.abs(pa) < 0.01) pa = 0.01;
      var d1 = generateQuadData(pa, 0, 0, -5, 5, 300);
      var d2 = generateQuadData(1, pb, 0, -5, 5, 300);
      var d3 = generateQuadData(1, 0, pc, -5, 5, 300);

      chart.setOption({
        animation: false,
        backgroundColor: 'transparent',
        grid: [
          { top: 30, right: 20, bottom: '70%', left: 50 },
          { top: '38%', right: 20, bottom: '37%', left: 50 },
          { top: '68%', right: 20, bottom: 30, left: 50 }
        ],
        xAxis: [
          makeAxis(-5, 5),
          makeAxis(-5, 5),
          makeAxis(-5, 5)
        ],
        yAxis: [
          makeAxis(-8, 8),
          makeAxis(-5, 15),
          makeAxis(-5, 10)
        ],
        tooltip: makeTooltip(),
        series: [
          {
            type: 'line', data: d1, xAxisIndex: 0, yAxisIndex: 0,
            smooth: false, showSymbol: false,
            lineStyle: { color: COLORS.accent, width: 2 }
          },
          {
            type: 'line', data: d2, xAxisIndex: 1, yAxisIndex: 1,
            smooth: false, showSymbol: false,
            lineStyle: { color: COLORS.accent2, width: 2 }
          },
          {
            type: 'line', data: d3, xAxisIndex: 2, yAxisIndex: 2,
            smooth: false, showSymbol: false,
            lineStyle: { color: COLORS.accent3, width: 2 }
          }
        ],
        graphic: [
          {
            type: 'text', left: 70, top: 10,
            style: { text: 'a \u7684\u5f71\u54cd (b=0, c=0)', fill: COLORS.accent, fontSize: 13, fontFamily: 'Outfit', fontWeight: 700 }
          },
          {
            type: 'text', left: 70, top: '35%',
            style: { text: 'b \u7684\u5f71\u54cd (a=1, c=0)', fill: COLORS.accent2, fontSize: 13, fontFamily: 'Outfit', fontWeight: 700 }
          },
          {
            type: 'text', left: 70, top: '65%',
            style: { text: 'c \u7684\u5f71\u54cd (a=1, b=0)', fill: COLORS.accent3, fontSize: 13, fontFamily: 'Outfit', fontWeight: 700 }
          }
        ]
      });
    }

    update(1, 0, 0);
    return { chart: chart, update: update };
  }

  // ===================== 7. Translation Chart (ECharts) =====================

  function initTranslationChart(h, k) {
    var dom = document.getElementById('chartTranslation');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function update(hh, kk) {
      var baseData = [];
      var transData = [];
      for (var i = 0; i <= 400; i++) {
        var x = -6 + 12 * i / 400;
        baseData.push([x, x * x]);
        var xx = x + hh;
        transData.push([xx, (x) * (x) + kk]);
      }

      // Also generate the vertex reference
      var vertexData = [[hh, kk]];

      chart.setOption({
        animation: true,
        animationDuration: 300,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(-6, 6),
        yAxis: makeAxis(-3, 15),
        tooltip: makeTooltip(),
        legend: {
          data: ['y = x\u00b2', 'y = (x-h)\u00b2+k'],
          textStyle: { color: COLORS.ink, fontFamily: 'Outfit', fontSize: 12 },
          top: 5, right: 10
        },
        series: [
          {
            name: 'y = x\u00b2',
            type: 'line',
            data: baseData,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: COLORS.muted, width: 2, type: 'dashed' }
          },
          {
            name: 'y = (x-h)\u00b2+k',
            type: 'line',
            data: transData,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: COLORS.accent, width: 2.5 },
            areaStyle: { color: 'rgba(245,158,11,0.10)' },
            markLine: {
              silent: true,
              lineStyle: { color: COLORS.accent5, type: 'dashed', width: 1.5 },
              label: { show: true, formatter: 'x=h', color: COLORS.accent5, fontFamily: 'JetBrainsMono', fontSize: 11 },
              data: [{ xAxis: hh }]
            },
            markPoint: {
              data: [{
                coord: [hh, kk], name: '\u9876\u70b9',
                symbolSize: 10, itemStyle: { color: COLORS.red },
                label: { show: true, position: 'top', formatter: '(' + hh.toFixed(1) + ', ' + kk.toFixed(1) + ')', color: COLORS.ink, fontSize: 11, fontFamily: 'JetBrainsMono' }
              }]
            }
          }
        ]
      });
    }

    update(h, k);
    return { chart: chart, update: update };
  }

  // ===================== 8. Equation Chart (ECharts) =====================

  function initEquationChart(a, b, c) {
    var dom = document.getElementById('chartEquation');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function update(aa, bb, cc) {
      if (Math.abs(aa) < 0.01) aa = 0.01;
      var data = generateQuadData(aa, bb, cc, -6, 6, 500);
      var sol = solveQuadratic(aa, bb, cc);
      var vertexX = -bb / (2 * aa);
      var vertexY = aa * vertexX * vertexX + bb * vertexX + cc;

      var yMin = Math.min(vertexY, 0) - 3;
      var yMax = Math.max(vertexY, 2) + 3;

      var rootScatter = [];
      if (sol.roots.length === 2) {
        rootScatter.push([sol.roots[0], 0]);
        rootScatter.push([sol.roots[1], 0]);
      } else if (sol.roots.length === 1) {
        rootScatter.push([sol.roots[0], 0]);
      }

      chart.setOption({
        animation: false,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(-6, 6),
        yAxis: makeAxis(yMin, yMax),
        tooltip: makeTooltip(),
        series: [
          {
            type: 'line',
            data: data,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: COLORS.accent, width: 2.5 },
            areaStyle: { color: 'rgba(245,158,11,0.08)' }
          },
          {
            type: 'line',
            data: [[-6, 0], [6, 0]],
            lineStyle: { color: COLORS.rule, width: 2 },
            showSymbol: false,
            silent: true
          },
          {
            type: 'scatter',
            data: rootScatter,
            symbolSize: 12,
            itemStyle: { color: COLORS.red },
            label: {
              show: true,
              position: 'top',
              formatter: function(p) { return 'x=' + p.value[0].toFixed(2); },
              color: COLORS.red,
              fontSize: 11,
              fontFamily: 'JetBrainsMono'
            }
          }
        ]
      });
    }

    update(a, b, c);
    return { chart: chart, update: update };
  }

  // ===================== 9. Inequality Region Chart (ECharts) =====================

  function initInequalityRegionChart(a, b, c, type) {
    var dom = document.getElementById('chartInequalityRegion');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function update(aa, bb, cc, t) {
      if (Math.abs(aa) < 0.01) aa = 0.01;
      var data = generateQuadData(aa, bb, cc, -6, 6, 500);
      var sol = solveQuadratic(aa, bb, cc);
      var vertexX = -bb / (2 * aa);
      var vertexY = aa * vertexX * vertexX + bb * vertexX + cc;

      var yMin = Math.min(vertexY, 0) - 3;
      var yMax = Math.max(vertexY, 2) + 3;

      // Build area data for positive and negative regions
      var posData = [];
      var negData = [];
      for (var i = 0; i < data.length; i++) {
        var x = data[i][0];
        var y = data[i][1];
        if (y >= 0) {
          posData.push([x, y]);
          negData.push([x, '-']);
        } else {
          negData.push([x, y]);
          posData.push([x, '-']);
        }
      }

      // Determine fill colors based on type
      var posColor, negColor;
      switch (t) {
        case 'gt':  posColor = 'rgba(16,185,129,0.30)'; negColor = 'rgba(245,158,11,0.05)'; break;
        case 'lt':  posColor = 'rgba(245,158,11,0.05)'; negColor = 'rgba(239,68,68,0.30)'; break;
        case 'gte': posColor = 'rgba(16,185,129,0.35)'; negColor = 'rgba(245,158,11,0.05)'; break;
        case 'lte': posColor = 'rgba(245,158,11,0.05)'; negColor = 'rgba(239,68,68,0.35)'; break;
        default:    posColor = 'rgba(16,185,129,0.30)'; negColor = 'rgba(245,158,11,0.05)';
      }

      // Mark roots
      var rootScatter = [];
      var rootLabels = [];
      if (sol.roots.length === 2) {
        var r1 = Math.min(sol.roots[0], sol.roots[1]);
        var r2 = Math.max(sol.roots[0], sol.roots[1]);
        rootScatter.push([r1, 0], [r2, 0]);
      } else if (sol.roots.length === 1) {
        rootScatter.push([sol.roots[0], 0]);
      }

      // Mark area on x-axis
      var markAreaData = [];
      if (sol.roots.length === 2) {
        var r1 = Math.min(sol.roots[0], sol.roots[1]);
        var r2 = Math.max(sol.roots[0], sol.roots[1]);
        var isPositive = (t === 'gt' || t === 'gte');
        if (aa > 0) {
          if (isPositive) {
            markAreaData = [[{ xAxis: -6 }, { xAxis: r1 }], [{ xAxis: r2 }, { xAxis: 6 }]];
          } else {
            markAreaData = [[{ xAxis: r1 }, { xAxis: r2 }]];
          }
        } else {
          if (isPositive) {
            markAreaData = [[{ xAxis: r1 }, { xAxis: r2 }]];
          } else {
            markAreaData = [[{ xAxis: -6 }, { xAxis: r1 }], [{ xAxis: r2 }, { xAxis: 6 }]];
          }
        }
      } else if (sol.roots.length === 1) {
        var rx = sol.roots[0];
        var isPositive = (t === 'gt' || t === 'gte');
        if (aa > 0) {
          markAreaData = isPositive ? [] : [[{ xAxis: rx }, { xAxis: rx }]];
          if (!isPositive) markAreaData = []; // single point
        } else {
          markAreaData = isPositive ? [[{ xAxis: rx }, { xAxis: rx }]] : [];
          if (isPositive) markAreaData = [];
        }
      }

      var areaColor = (t === 'gt' || t === 'gte') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      var areaBorderColor = (t === 'gt' || t === 'gte') ? COLORS.accent4 : COLORS.red;

      var series = [
        {
          type: 'line',
          data: data,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: COLORS.accent, width: 2.5 },
          z: 10
        },
        {
          type: 'line',
          data: [[-6, 0], [6, 0]],
          lineStyle: { color: COLORS.rule, width: 2 },
          showSymbol: false,
          silent: true,
          z: 5
        },
        {
          type: 'scatter',
          data: rootScatter,
          symbolSize: 12,
          itemStyle: { color: COLORS.red, borderColor: '#fff', borderWidth: 2 },
          z: 20,
          label: {
            show: true,
            position: 'top',
            formatter: function(p) { return p.value[0].toFixed(2); },
            color: COLORS.red,
            fontSize: 11,
            fontFamily: 'JetBrainsMono'
          }
        }
      ];

      // Add mark area on x-axis line
      if (markAreaData.length > 0) {
        series[1].markArea = {
          silent: true,
          itemStyle: { color: areaColor },
          data: markAreaData
        };
      }

      chart.setOption({
        animation: false,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(-6, 6),
        yAxis: makeAxis(yMin, yMax),
        tooltip: makeTooltip(),
        series: series
      });
    }

    update(a, b, c, type);
    return { chart: chart, update: update };
  }

  // ===================== Section 6: Higher-Degree Inequality (穿根法) =====================

  var PRESETS = [
    { roots: [-1, 1, 2], mult: [1, 1, 1], type: 'gt' },
    { roots: [-2, 0, 3], mult: [1, 1, 1], type: 'lt' },
    { roots: [-1, 2],    mult: [2, 1],    type: 'gt' },
    { roots: [-2, 1, 3, 4], mult: [1, 1, 1, 1], type: 'lte' }
  ];

  function initHigherIneqChart() {
    var dom = document.getElementById('chartHigherIneq');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function fEval(roots, mults, x) {
      var y = 1;
      for (var i = 0; i < roots.length; i++) {
        var d = x - roots[i];
        for (var m = 0; m < mults[i]; m++) y *= d;
      }
      return y;
    }

    function buildSignCurve(roots, mults, xMin, xMax, n) {
      var data = [];
      var step = (xMax - xMin) / n;
      for (var i = 0; i <= n; i++) {
        var x = xMin + i * step;
        var y = fEval(roots, mults, x);
        // Clamp to avoid extreme values
        y = Math.max(-8, Math.min(8, y));
        data.push([parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4))]);
      }
      return data;
    }

    function getSolution(roots, mults, type) {
      var isGt = (type === 'gt' || type === 'gte');
      var isStrict = (type === 'gt' || type === 'lt');

      // Build test points: one in each interval + edges
      var intervals = [];
      var pts = [roots[0] - 1.5];
      for (var i = 0; i < roots.length; i++) {
        if (i < roots.length - 1) {
          pts.push((roots[i] + roots[i + 1]) / 2);
        } else {
          pts.push(roots[i] + 1.5);
        }
      }
      // Also test far left and far right
      var farLeft = roots[0] - 5;
      var farRight = roots[roots.length - 1] + 5;

      // Determine sign in each interval
      var signs = [];
      // Interval 0: (-inf, root[0])
      signs.push(fEval(roots, mults, farLeft));
      // Interval i (1..n): (root[i-1], root[i])
      for (var i = 0; i < roots.length - 1; i++) {
        signs.push(fEval(roots, mults, (roots[i] + roots[i + 1]) / 2));
      }
      // Interval n: (root[n-1], +inf)
      signs.push(fEval(roots, mults, farRight));

      // For each interval, check if it satisfies the inequality
      // Also determine boundary inclusion
      var parts = [];
      var n = roots.length;

      for (var i = 0; i <= n; i++) {
        var ok = isGt ? (signs[i] > 0) : (signs[i] < 0);
        if (!ok) continue;

        var leftP, rightP, leftStr, rightStr;

        if (i === 0) {
          leftP = '(';
          leftStr = null; // -inf
        } else {
          var leftRoot = roots[i - 1];
          var leftMult = mults[i - 1];
          // Left boundary: include if non-strict and the interval sign matches
          var leftSignOk = isGt ? true : false; // at root, f=0, never satisfies strict
          if (isStrict) {
            leftP = '(';
          } else {
            // Non-strict: root (f=0) satisfies both ≥0 and ≤0
            leftP = '[';
          }
          leftStr = leftRoot.toFixed(1);
        }

        if (i === n) {
          rightP = ')';
          rightStr = null; // +inf
        } else {
          var rightRoot = roots[i];
          var rightMult = mults[i];
          if (isStrict) {
            rightP = ')';
          } else {
            rightP = ']';
          }
          rightStr = rightRoot.toFixed(1);
        }

        var s = '';
        if (leftStr === null && rightStr === null) {
          s = 'x \u2208 \u211d';
        } else if (leftStr === null) {
          s = 'x ' + (rightP === ']' ? '\u2264' : '<') + ' ' + rightStr;
        } else if (rightStr === null) {
          s = 'x ' + (leftP === '[' ? '\u2265' : '>') + ' ' + leftStr;
        } else {
          s = leftP + leftStr + ', ' + rightStr + rightP;
        }
        parts.push(s);
      }

      if (parts.length === 0) return '\u65e0\u89e3';
      return parts.join(' \u222a ');
    }

    function update(roots, mults, type) {
      var xMin = roots[0] - 3;
      var xMax = roots[roots.length - 1] + 3;
      var curveData = buildSignCurve(roots, mults, xMin, xMax, 800);

      // Build area data: positive (green) and negative (red) regions
      var posData = [];
      var negData = [];
      for (var i = 0; i < curveData.length; i++) {
        var x = curveData[i][0], y = curveData[i][1];
        if (y >= 0) {
          posData.push([x, y]);
          negData.push([x, '-']);
        } else {
          negData.push([x, y]);
          posData.push([x, '-']);
        }
      }

      var isGt = (type === 'gt' || type === 'gte');

      // Root markers
      var rootScatter = [];
      var rootLabels = [];
      for (var i = 0; i < roots.length; i++) {
        rootScatter.push([roots[i], 0]);
        var label = roots[i].toFixed(1);
        if (mults[i] === 2) label += ' (\u4e8c\u91cd)';
        rootLabels.push(label);
      }

      // Determine solution intervals for markArea
      var intervals = [];
      var testPts = [];
      testPts.push(roots[0] - 1.5);
      for (var i = 0; i < roots.length; i++) {
        testPts.push((i < roots.length - 1) ? (roots[i] + roots[i + 1]) / 2 : roots[i] + 1.5);
      }
      for (var i = 0; i < testPts.length; i++) {
        var fy = fEval(roots, mults, testPts[i]);
        var ok = isGt ? (fy > 0) : (fy < 0);
        if (ok) {
          var left = (i === 0) ? xMin : roots[i - 1];
          var right = (i === testPts.length - 1) ? xMax : roots[i];
          intervals.push([{ xAxis: left }, { xAxis: right }]);
        }
      }

      var areaColor = isGt ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';

      var series = [
        {
          type: 'line',
          data: curveData,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: COLORS.accent5, width: 2.5 },
          z: 10
        },
        {
          type: 'line',
          data: [[xMin, 0], [xMax, 0]],
          lineStyle: { color: COLORS.rule, width: 2 },
          showSymbol: false,
          silent: true,
          z: 5,
          markArea: {
            silent: true,
            itemStyle: { color: areaColor },
            data: intervals
          }
        },
        {
          type: 'scatter',
          data: rootScatter,
          symbolSize: 14,
          itemStyle: { color: COLORS.red, borderColor: '#fff', borderWidth: 2 },
          z: 20,
          label: {
            show: true,
            position: 'top',
            formatter: function(p) {
              var idx = p.dataIndex;
              var r = roots[idx];
              var m = mults[idx];
              var s = r.toFixed(1);
              if (m === 2) s += ' (\u4e8c\u91cd\u6839)';
              return s;
            },
            color: COLORS.red,
            fontSize: 11,
            fontFamily: 'JetBrainsMono'
          }
        },
        // Arrow annotations showing "穿" (odd mult) vs "弹" (even mult)
        {
          type: 'scatter',
          data: [],
          symbolSize: 0,
          label: { show: false },
          markLine: {
            silent: true,
            symbol: 'none',
            data: (function() {
              var lines = [];
              for (var i = 0; i < roots.length; i++) {
                lines.push({ xAxis: roots[i], label: { show: false } });
              }
              return lines;
            })(),
            lineStyle: { color: 'rgba(139,92,246,0.3)', type: 'dashed', width: 1 }
          }
        }
      ];

      var yMax = 6;
      var yMin = -6;

      chart.setOption({
        animation: true,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(xMin, xMax),
        yAxis: makeAxis(yMin, yMax),
        tooltip: Object.assign({
          trigger: 'item',
          formatter: function(p) {
            if (p.seriesIndex === 2) return '';
            if (p.value === '-') return '';
            return 'x = ' + p.value[0].toFixed(2) + '<br>f(x) = ' + p.value[1].toFixed(3);
          }
        }, makeTooltip()),
        series: series
      }, true);

      // Update info panel
      var rootsStr = '';
      var multStr = '';
      for (var i = 0; i < roots.length; i++) {
        if (i > 0) { rootsStr += ', '; multStr += ', '; }
        rootsStr += roots[i].toFixed(1);
        multStr += mults[i];
      }
      document.getElementById('hiRoots').textContent = 'x = ' + rootsStr;
      document.getElementById('hiMultiplicities').textContent = multStr;
      document.getElementById('hiSolution').textContent = getSolution(roots, mults, type);
    }

    // Init with first preset
    update(PRESETS[0].roots, PRESETS[0].mult, PRESETS[0].type);
    return { chart: chart, update: update };
  }

  // ===================== Section 7: Fractional Inequality (分式不等式) =====================

  var FRAC_PRESETS = [
    { numRoots: [1], numMult: [1], denRoots: [-2], denMult: [1], type: 'gt' },
    { numRoots: [-1], numMult: [1], denRoots: [3], denMult: [1], type: 'lt' },
    { numRoots: [0], numMult: [1], denRoots: [-1, 1], denMult: [1, 1], type: 'gte' },
    { numRoots: [1, -2], numMult: [1, 1], denRoots: [3], denMult: [1], type: 'lte' }
  ];

  function initFracIneqChart() {
    var dom = document.getElementById('chartFracIneq');
    if (!dom) return null;
    var chart = echarts.init(dom, null, { renderer: 'svg' });

    function fEval(roots, mults, x) {
      var y = 1;
      for (var i = 0; i < roots.length; i++) {
        var d = x - roots[i];
        for (var m = 0; m < mults[i]; m++) y *= d;
      }
      return y;
    }

    function getFracSolution(numRoots, numMult, denRoots, denMult, type) {
      var isGt = (type === 'gt' || type === 'gte');
      var isStrict = (type === 'gt' || type === 'lt');

      var allRoots = [];
      var rootIsDen = [];
      for (var i = 0; i < numRoots.length; i++) { allRoots.push(numRoots[i]); rootIsDen.push(false); }
      for (var i = 0; i < denRoots.length; i++) { allRoots.push(denRoots[i]); rootIsDen.push(true); }
      for (var i = 0; i < allRoots.length - 1; i++) {
        for (var j = i + 1; j < allRoots.length; j++) {
          if (allRoots[j] < allRoots[i]) {
            var tmp = allRoots[i]; allRoots[i] = allRoots[j]; allRoots[j] = tmp;
            tmp = rootIsDen[i]; rootIsDen[i] = rootIsDen[j]; rootIsDen[j] = tmp;
          }
        }
      }

      var n = allRoots.length;
      var parts = [];

      for (var i = 0; i <= n; i++) {
        var testX;
        if (i === 0) testX = allRoots[0] - 1;
        else if (i === n) testX = allRoots[n - 1] + 1;
        else testX = (allRoots[i - 1] + allRoots[i]) / 2;

        var fVal = fEval(numRoots, numMult, testX);
        var gVal = fEval(denRoots, denMult, testX);
        var fracSign = fVal * gVal;
        var ok = isGt ? (fracSign > 0) : (fracSign < 0);
        if (!ok) continue;

        var leftStr = null, rightStr = null;
        var leftP = '(', rightP = ')';

        if (i > 0) {
          leftStr = allRoots[i - 1].toFixed(1);
          if (rootIsDen[i - 1] === false && !isStrict) {
            leftP = '[';
          } else {
            leftP = '(';
          }
        }
        if (i < n) {
          rightStr = allRoots[i].toFixed(1);
          if (rootIsDen[i] === false && !isStrict) {
            rightP = ']';
          } else {
            rightP = ')';
          }
        }

        var s = '';
        if (leftStr === null && rightStr === null) {
          s = 'x \u2208 \u211d';
        } else if (leftStr === null) {
          s = 'x ' + (rightP === ']' ? '\u2264' : '<') + ' ' + rightStr;
        } else if (rightStr === null) {
          s = 'x ' + (leftP === '[' ? '\u2265' : '>') + ' ' + leftStr;
        } else {
          s = leftP + leftStr + ', ' + rightStr + rightP;
        }
        parts.push(s);
      }

      if (parts.length === 0) return '\u65e0\u89e3';
      return parts.join(' \u222a ');
    }

    function update(numRoots, numMult, denRoots, denMult, type) {
      var allVals = numRoots.concat(denRoots);
      var xMin = Math.min.apply(null, allVals) - 3;
      var xMax = Math.max.apply(null, allVals) + 3;

      // Build f/g curve with null breaks at denominator roots
      var curveData = [];
      var steps = 1000;
      var step = (xMax - xMin) / steps;
      for (var i = 0; i <= steps; i++) {
        var x = xMin + i * step;
        var gVal = fEval(denRoots, denMult, x);
        if (Math.abs(gVal) < 0.08) {
          curveData.push(null);
          continue;
        }
        var fVal = fEval(numRoots, numMult, x);
        var y = fVal / gVal;
        y = Math.max(-15, Math.min(15, y));
        curveData.push([parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4))]);
      }

      // f(x) and g(x) reference curves
      var numCurve = [];
      var denCurve = [];
      for (var i = 0; i <= steps; i++) {
        var x = xMin + i * step;
        var fv = fEval(numRoots, numMult, x);
        var gv = fEval(denRoots, denMult, x);
        numCurve.push([parseFloat(x.toFixed(4)), parseFloat(Math.max(-15, Math.min(15, fv)).toFixed(4))]);
        denCurve.push([parseFloat(x.toFixed(4)), parseFloat(Math.max(-15, Math.min(15, gv)).toFixed(4))]);
      }

      var isGt = (type === 'gt' || type === 'gte');

      // Combine and sort all roots
      var allRoots = [];
      var rootIsDen = [];
      for (var i = 0; i < numRoots.length; i++) { allRoots.push(numRoots[i]); rootIsDen.push(false); }
      for (var i = 0; i < denRoots.length; i++) { allRoots.push(denRoots[i]); rootIsDen.push(true); }
      for (var i = 0; i < allRoots.length - 1; i++) {
        for (var j = i + 1; j < allRoots.length; j++) {
          if (allRoots[j] < allRoots[i]) {
            var tmp = allRoots[i]; allRoots[i] = allRoots[j]; allRoots[j] = tmp;
            tmp = rootIsDen[i]; rootIsDen[i] = rootIsDen[j]; rootIsDen[j] = tmp;
          }
        }
      }

      // Solution intervals for markArea
      var intervals = [];
      var n = allRoots.length;
      for (var i = 0; i <= n; i++) {
        var testX;
        if (i === 0) testX = allRoots[0] - 1;
        else if (i === n) testX = allRoots[n - 1] + 1;
        else testX = (allRoots[i - 1] + allRoots[i]) / 2;

        var fVal = fEval(numRoots, numMult, testX);
        var gVal = fEval(denRoots, denMult, testX);
        var ok = isGt ? (fVal * gVal > 0) : (fVal * gVal < 0);
        if (!ok) continue;

        var left = (i === 0) ? xMin : allRoots[i - 1];
        var right = (i === n) ? xMax : allRoots[i];
        intervals.push([{ xAxis: left }, { xAxis: right }]);
      }

      var areaColor = isGt ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';

      // Vertical asymptote lines
      var asympLines = [];
      for (var i = 0; i < denRoots.length; i++) {
        asympLines.push({ xAxis: denRoots[i] });
      }

      // Root scatter data
      var numScatter = [];
      var denScatter = [];
      for (var i = 0; i < numRoots.length; i++) numScatter.push([numRoots[i], 0]);
      for (var i = 0; i < denRoots.length; i++) denScatter.push([denRoots[i], 0]);

      var series = [
        {
          name: 'f(x)/g(x)',
          type: 'line',
          data: curveData,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: COLORS.accent2, width: 2.5 },
          z: 10,
          connectNulls: false
        },
        {
          name: 'f(x)',
          type: 'line',
          data: numCurve,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: COLORS.accent, width: 1.5, type: 'dashed', opacity: 0.5 },
          z: 5,
          silent: true
        },
        {
          name: 'g(x)',
          type: 'line',
          data: denCurve,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: COLORS.accent3, width: 1.5, type: 'dashed', opacity: 0.5 },
          z: 5,
          silent: true
        },
        {
          type: 'line',
          data: [[xMin, 0], [xMax, 0]],
          lineStyle: { color: COLORS.rule, width: 2 },
          showSymbol: false,
          silent: true,
          z: 4,
          markArea: {
            silent: true,
            itemStyle: { color: areaColor },
            data: intervals
          }
        },
        {
          type: 'scatter',
          data: numScatter,
          symbolSize: 14,
          itemStyle: { color: COLORS.accent4, borderColor: '#fff', borderWidth: 2 },
          z: 20,
          label: {
            show: true,
            position: 'top',
            formatter: function(p) { return 'x=' + p.value[0].toFixed(1); },
            color: COLORS.accent4,
            fontSize: 10,
            fontFamily: 'JetBrainsMono'
          }
        },
        {
          type: 'scatter',
          data: denScatter,
          symbolSize: 14,
          itemStyle: { color: COLORS.bg3, borderColor: COLORS.red, borderWidth: 2.5 },
          z: 20,
          label: {
            show: true,
            position: 'bottom',
            formatter: function(p) { return 'x=' + p.value[0].toFixed(1); },
            color: COLORS.red,
            fontSize: 10,
            fontFamily: 'JetBrainsMono'
          }
        },
        {
          type: 'scatter',
          data: [],
          symbolSize: 0,
          label: { show: false },
          markLine: {
            silent: true,
            symbol: 'none',
            data: asympLines,
            lineStyle: { color: 'rgba(239,68,68,0.5)', type: 'dashed', width: 1.5 }
          }
        }
      ];

      chart.setOption({
        animation: true,
        animationDuration: 300,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 40, left: 55 },
        xAxis: makeAxis(xMin, xMax),
        yAxis: makeAxis(-15, 15),
        tooltip: Object.assign({
          trigger: 'item',
          formatter: function(p) {
            if (p.seriesIndex >= 3) return '';
            if (!p.value || p.value === '-') return '';
            return ['f(x)/g(x)', 'f(x)', 'g(x)'][p.seriesIndex] +
              '<br>x = ' + p.value[0].toFixed(2) +
              '<br>y = ' + p.value[1].toFixed(3);
          }
        }, makeTooltip()),
        legend: {
          data: ['f(x)/g(x)', 'f(x)', 'g(x)'],
          textStyle: { color: COLORS.ink, fontFamily: 'Outfit', fontSize: 12 },
          top: 5, right: 10
        },
        series: series
      }, true);

      // Update info panel
      var numStr = numRoots.map(function(r) { return r.toFixed(1); }).join(', ');
      var denStr = denRoots.map(function(r) { return r.toFixed(1); }).join(', ');
      document.getElementById('fiNumRoots').textContent = 'x = ' + numStr;
      document.getElementById('fiDenRoots').textContent = 'x = ' + denStr;
      var domainStr = denRoots.map(function(r) { return 'x \u2260 ' + r.toFixed(1); }).join(', ');
      document.getElementById('fiDomain').textContent = domainStr;
      document.getElementById('fiSolution').textContent = getFracSolution(numRoots, numMult, denRoots, denMult, type);
    }

    update(FRAC_PRESETS[0].numRoots, FRAC_PRESETS[0].numMult, FRAC_PRESETS[0].denRoots, FRAC_PRESETS[0].denMult, FRAC_PRESETS[0].type);
    return { chart: chart, update: update };
  }

  // ===================== DOMContentLoaded: Initialize Everything =====================

  document.addEventListener('DOMContentLoaded', function() {

    // --- Balance Chart ---
    initBalanceChart();

    // --- Inequality Chart ---
    initInequalityChart();

    // --- Mean Inequality Chart ---
    var meanChart = initMeanInequalityChart(1);
    document.getElementById('meanSliderC').addEventListener('input', function() {
      var c = parseFloat(this.value);
      document.getElementById('meanC').textContent = c.toFixed(1);
      if (meanChart) meanChart.update(c);
    });

    // --- Geometric Chart ---
    var geoChart = initGeometricChart(2, 1);
    document.getElementById('geoSliderA').addEventListener('input', function() {
      var a = parseFloat(this.value);
      document.getElementById('geoA').textContent = a.toFixed(1);
      if (geoChart) geoChart.draw(a, parseFloat(document.getElementById('geoSliderB').value));
    });
    document.getElementById('geoSliderB').addEventListener('input', function() {
      var b = parseFloat(this.value);
      document.getElementById('geoB').textContent = b.toFixed(1);
      if (geoChart) geoChart.draw(parseFloat(document.getElementById('geoSliderA').value), b);
    });

    // --- Quadratic Chart (Section 3a) ---
    var quadChart = initQuadraticChart(1, 0, 0);

    function updateQuadInfo(aa, bb, cc) {
      if (Math.abs(aa) < 0.01) aa = 0.01;
      var vx = -bb / (2 * aa);
      var vy = (4 * aa * cc - bb * bb) / (4 * aa);
      var delta = bb * bb - 4 * aa * cc;
      var sol = solveQuadratic(aa, bb, cc);

      document.getElementById('qiDir').textContent = aa > 0 ? '\u5411\u4e0a' : '\u5411\u4e0b';
      document.getElementById('qiDir').style.color = aa > 0 ? COLORS.accent4 : COLORS.red;
      document.getElementById('qiAxis').textContent = 'x = ' + vx.toFixed(2);
      document.getElementById('qiVertex').textContent = '(' + vx.toFixed(2) + ', ' + vy.toFixed(2) + ')';
      document.getElementById('qiDelta').textContent = delta.toFixed(2);
      document.getElementById('qiDelta').style.color = delta > 0 ? COLORS.accent4 : (Math.abs(delta) < 0.01 ? COLORS.accent : COLORS.red);

      if (delta > 0.01) {
        var r1 = Math.min(sol.roots[0], sol.roots[1]).toFixed(2);
        var r2 = Math.max(sol.roots[0], sol.roots[1]).toFixed(2);
        document.getElementById('qiRoots').textContent = '\u4e24\u4e2a: ' + r1 + ', ' + r2;
      } else if (Math.abs(delta) <= 0.01) {
        document.getElementById('qiRoots').textContent = '\u4e00\u4e2a: ' + sol.roots[0].toFixed(2);
      } else {
        document.getElementById('qiRoots').textContent = '\u96f6\u4e2a\uff08\u65e0\u5b9e\u6570\u6839\uff09';
      }

      // Update formula display
      var aStr = aa.toFixed(1);
      var bSign = bb >= 0 ? '+' : '-';
      var bStr = Math.abs(bb).toFixed(1);
      var cSign = cc >= 0 ? '+' : '-';
      var cStr = Math.abs(cc).toFixed(1);
      document.getElementById('quadFormula').innerHTML =
        'y = ' + aStr + 'x\u00b2 ' + bSign + ' ' + bStr + 'x ' + cSign + ' ' + cStr;
    }

    function onQuadChange() {
      var a = parseFloat(document.getElementById('quadSliderA').value);
      var b = parseFloat(document.getElementById('quadSliderB').value);
      var c = parseFloat(document.getElementById('quadSliderC').value);
      document.getElementById('quadValA').textContent = a.toFixed(1);
      document.getElementById('quadValB').textContent = b.toFixed(1);
      document.getElementById('quadValC').textContent = c.toFixed(1);
      if (quadChart) quadChart.update(a, b, c);
      updateQuadInfo(a, b, c);
    }
    document.getElementById('quadSliderA').addEventListener('input', onQuadChange);
    document.getElementById('quadSliderB').addEventListener('input', onQuadChange);
    document.getElementById('quadSliderC').addEventListener('input', onQuadChange);
    updateQuadInfo(1, 0, 0);

    // --- Param Effect Chart (Section 3b) ---
    var peChart = initParamEffectChart();

    function onPEChange() {
      var a = parseFloat(document.getElementById('peSliderA').value);
      var b = parseFloat(document.getElementById('peSliderB').value);
      var c = parseFloat(document.getElementById('peSliderC').value);
      document.getElementById('peValA').textContent = a.toFixed(1);
      document.getElementById('peValB').textContent = b.toFixed(1);
      document.getElementById('peValC').textContent = c.toFixed(1);
      if (peChart) peChart.update(a, b, c);
    }
    document.getElementById('peSliderA').addEventListener('input', onPEChange);
    document.getElementById('peSliderB').addEventListener('input', onPEChange);
    document.getElementById('peSliderC').addEventListener('input', onPEChange);

    // --- Translation Chart (Section 3c) ---
    var transChart = initTranslationChart(0, 0);

    function onTransChange() {
      var h = parseFloat(document.getElementById('transSliderH').value);
      var k = parseFloat(document.getElementById('transSliderK').value);
      document.getElementById('transValH').textContent = h.toFixed(1);
      document.getElementById('transValK').textContent = k.toFixed(1);
      var hSign = h >= 0 ? '-' : '+';
      var hAbs = Math.abs(h).toFixed(1);
      var kSign = k >= 0 ? '+' : '-';
      var kAbs = Math.abs(k).toFixed(1);
      document.getElementById('transFormula').innerHTML =
        'y = (x ' + hSign + ' ' + hAbs + ')\u00b2 ' + kSign + ' ' + kAbs;
      if (transChart) transChart.update(h, k);
    }
    document.getElementById('transSliderH').addEventListener('input', onTransChange);
    document.getElementById('transSliderK').addEventListener('input', onTransChange);

    // --- Equation Chart (Section 4) ---
    var eqChart = initEquationChart(1, 0, -1);

    function updateEqInfo(aa, bb, cc) {
      if (Math.abs(aa) < 0.01) aa = 0.01;
      var sol = solveQuadratic(aa, bb, cc);
      var delta = sol.delta;

      document.getElementById('eqiDelta').textContent = delta.toFixed(2);
      document.getElementById('eqiDelta').style.color = delta > 0.01 ? COLORS.accent4 : (Math.abs(delta) <= 0.01 ? COLORS.accent : COLORS.red);

      if (sol.roots.length === 2) {
        var r1 = Math.min(sol.roots[0], sol.roots[1]);
        var r2 = Math.max(sol.roots[0], sol.roots[1]);
        document.getElementById('eqiX1').textContent = r1.toFixed(2);
        document.getElementById('eqiX2').textContent = r2.toFixed(2);
        document.getElementById('eqiSum').textContent = (r1 + r2).toFixed(2) + ' = ' + (-bb / aa).toFixed(2);
        document.getElementById('eqiProd').textContent = (r1 * r2).toFixed(2) + ' = ' + (cc / aa).toFixed(2);
      } else if (sol.roots.length === 1) {
        document.getElementById('eqiX1').textContent = sol.roots[0].toFixed(2);
        document.getElementById('eqiX2').textContent = sol.roots[0].toFixed(2);
        document.getElementById('eqiSum').textContent = (2 * sol.roots[0]).toFixed(2) + ' = ' + (-bb / aa).toFixed(2);
        document.getElementById('eqiProd').textContent = (sol.roots[0] * sol.roots[0]).toFixed(2) + ' = ' + (cc / aa).toFixed(2);
      } else {
        document.getElementById('eqiX1').textContent = '\u65e0\u5b9e\u6570\u6839';
        document.getElementById('eqiX2').textContent = '\u65e0\u5b9e\u6570\u6839';
        document.getElementById('eqiX1').style.color = COLORS.red;
        document.getElementById('eqiX2').style.color = COLORS.red;
        document.getElementById('eqiSum').textContent = '-';
        document.getElementById('eqiProd').textContent = '-';
      }
    }

    function onEqChange() {
      var a = parseFloat(document.getElementById('eqSliderA').value);
      var b = parseFloat(document.getElementById('eqSliderB').value);
      var c = parseFloat(document.getElementById('eqSliderC').value);
      document.getElementById('eqValA').textContent = a.toFixed(1);
      document.getElementById('eqValB').textContent = b.toFixed(1);
      document.getElementById('eqValC').textContent = c.toFixed(1);
      document.getElementById('eqiX1').style.color = COLORS.accent4;
      document.getElementById('eqiX2').style.color = COLORS.accent4;
      if (eqChart) eqChart.update(a, b, c);
      updateEqInfo(a, b, c);
    }
    document.getElementById('eqSliderA').addEventListener('input', onEqChange);
    document.getElementById('eqSliderB').addEventListener('input', onEqChange);
    document.getElementById('eqSliderC').addEventListener('input', onEqChange);
    updateEqInfo(1, 0, -1);

    // --- Inequality Region Chart (Section 5) ---
    var currentIneqType = 'gt';
    var irChart = initInequalityRegionChart(1, 0, -1, currentIneqType);

    function updateIRFormula(aa, bb, cc, t) {
      var aStr = aa.toFixed(1);
      var bSign = bb >= 0 ? '+' : '-';
      var bStr = Math.abs(bb).toFixed(1);
      var cSign = cc >= 0 ? '+' : '-';
      var cStr = Math.abs(cc).toFixed(1);

      var expr = aStr + 'x\u00b2 ' + bSign + ' ' + bStr + 'x ' + cSign + ' ' + cStr;

      var symbol = '>';
      switch (t) {
        case 'gt': symbol = '>'; break;
        case 'lt': symbol = '<'; break;
        case 'gte': symbol = '\u2265'; break;
        case 'lte': symbol = '\u2264'; break;
      }

      document.getElementById('ineqRegionFormula').innerHTML = expr + ' ' + symbol + ' 0';
      document.getElementById('iriType').textContent = symbol;
    }

    function updateIRSolution(aa, bb, cc, t) {
      if (Math.abs(aa) < 0.01) aa = 0.01;
      var sol = solveQuadratic(aa, bb, cc);
      document.getElementById('iriDelta').textContent = sol.delta.toFixed(2);

      if (sol.roots.length === 2) {
        var r1 = Math.min(sol.roots[0], sol.roots[1]);
        var r2 = Math.max(sol.roots[0], sol.roots[1]);
        var isOpen = (t === 'gt' || t === 'lt');
        var isGt = (t === 'gt' || t === 'gte');
        var paren1 = isOpen ? '(' : '[';
        var paren2 = isOpen ? ')' : ']';
        var comma = '\u222a';

        var solText = '';
        if (aa > 0) {
          if (isGt) {
            solText = 'x ' + (isOpen ? '<' : '\u2264') + ' ' + r1.toFixed(2) + ' ' + comma + ' x ' + (isOpen ? '>' : '\u2265') + ' ' + r2.toFixed(2);
          } else {
            solText = paren1 + r1.toFixed(2) + ', ' + r2.toFixed(2) + paren2;
          }
        } else {
          if (isGt) {
            solText = paren1 + r1.toFixed(2) + ', ' + r2.toFixed(2) + paren2;
          } else {
            solText = 'x ' + (isOpen ? '<' : '\u2264') + ' ' + r1.toFixed(2) + ' ' + comma + ' x ' + (isOpen ? '>' : '\u2265') + ' ' + r2.toFixed(2);
          }
        }
        document.getElementById('iriSolution').textContent = solText;
      } else if (sol.roots.length === 1) {
        var rx = sol.roots[0].toFixed(2);
        var isGt = (t === 'gt' || t === 'gte');
        if (aa > 0) {
          if (isGt) {
            document.getElementById('iriSolution').textContent = 'x \u2208 \u211d, x \u2260 ' + rx;
          } else {
            document.getElementById('iriSolution').textContent = 'x = ' + rx;
          }
        } else {
          if (isGt) {
            document.getElementById('iriSolution').textContent = 'x = ' + rx;
          } else {
            document.getElementById('iriSolution').textContent = '\u65e0\u89e3';
          }
        }
      } else {
        var isGt = (t === 'gt' || t === 'gte');
        if (aa > 0 && isGt) {
          document.getElementById('iriSolution').textContent = 'x \u2208 \u211d';
        } else if (aa < 0 && !isGt) {
          document.getElementById('iriSolution').textContent = 'x \u2208 \u211d';
        } else {
          document.getElementById('iriSolution').textContent = '\u65e0\u89e3';
        }
      }
    }

    function onIRChange() {
      var a = parseFloat(document.getElementById('irSliderA').value);
      var b = parseFloat(document.getElementById('irSliderB').value);
      var c = parseFloat(document.getElementById('irSliderC').value);
      document.getElementById('irValA').textContent = a.toFixed(1);
      document.getElementById('irValB').textContent = b.toFixed(1);
      document.getElementById('irValC').textContent = c.toFixed(1);
      if (irChart) irChart.update(a, b, c, currentIneqType);
      updateIRFormula(a, b, c, currentIneqType);
      updateIRSolution(a, b, c, currentIneqType);
    }

    document.getElementById('irSliderA').addEventListener('input', onIRChange);
    document.getElementById('irSliderB').addEventListener('input', onIRChange);
    document.getElementById('irSliderC').addEventListener('input', onIRChange);

    // Inequality type buttons
    var typeButtons = document.querySelectorAll('#ineqTypeGroup button');
    typeButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        typeButtons.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentIneqType = this.dataset.type;
        onIRChange();
      });
    });

    // Initial inequality update
    updateIRFormula(1, 0, -1, currentIneqType);
    updateIRSolution(1, 0, -1, currentIneqType);

    // --- Higher-Degree Inequality (Section 6: 穿根法) ---
    var higherChart = initHigherIneqChart();
    var currentHigherType = 'gt';
    var currentPresetIdx = 0;

    function buildFormulaHTML(roots, mults, type) {
      var symbol = '>';
      switch (type) {
        case 'gt': symbol = '>'; break;
        case 'lt': symbol = '<'; break;
        case 'gte': symbol = '\u2265'; break;
        case 'lte': symbol = '\u2264'; break;
      }
      var parts = [];
      for (var i = 0; i < roots.length; i++) {
        var r = roots[i];
        if (r === 0) {
          parts.push(mults[i] === 1 ? 'x' : 'x\u00b2');
        } else if (r < 0) {
          parts.push(mults[i] === 1 ? '(x+' + Math.abs(r).toFixed(1) + ')' : '(x+' + Math.abs(r).toFixed(1) + ')\u00b2');
        } else {
          parts.push(mults[i] === 1 ? '(x\u2212' + r.toFixed(1) + ')' : '(x\u2212' + r.toFixed(1) + ')\u00b2');
        }
      }
      return parts.join(' \u00b7 ') + ' ' + symbol + ' 0';
    }

    function refreshHigher() {
      var preset = PRESETS[currentPresetIdx];
      document.getElementById('higherIneqFormula').innerHTML = buildFormulaHTML(preset.roots, preset.mult, currentHigherType);
      if (higherChart) higherChart.update(preset.roots, preset.mult, currentHigherType);
    }

    // Preset buttons
    var presetBtns = document.querySelectorAll('#presetIneqGroup button');
    presetBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        presetBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        var idx = parseInt(this.dataset.preset);
        if (idx === 4) {
          // Custom mode
          document.getElementById('customRootsPanel').style.display = 'block';
          return;
        }
        document.getElementById('customRootsPanel').style.display = 'none';
        currentPresetIdx = idx;
        currentHigherType = PRESETS[idx].type;
        // Sync type buttons
        var typeBtns = document.querySelectorAll('#higherIneqTypeGroup button');
        typeBtns.forEach(function(b) {
          b.classList.remove('active');
          if (b.dataset.type === currentHigherType) b.classList.add('active');
        });
        refreshHigher();
      });
    });

    // Inequality type buttons for higher degree
    var hiTypeBtns = document.querySelectorAll('#higherIneqTypeGroup button');
    hiTypeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        hiTypeBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentHigherType = this.dataset.type;
        PRESETS[currentPresetIdx].type = currentHigherType;
        refreshHigher();
      });
    });

    // Custom roots input
    document.getElementById('btnApplyCustom').addEventListener('click', function() {
      var raw = document.getElementById('customRootsInput').value.trim();
      var tokens = raw.split(',');
      var roots = [];
      var mults = [];
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i].trim();
        if (!t) continue;
        var m = 1;
        if (t.indexOf('^2') !== -1) {
          m = 2;
          t = t.replace('^2', '').trim();
        }
        var v = parseFloat(t);
        if (!isNaN(v)) {
          roots.push(v);
          mults.push(m);
        }
      }
      if (roots.length < 2) return;
      // Sort by root value
      for (var i = 0; i < roots.length - 1; i++) {
        for (var j = i + 1; j < roots.length; j++) {
          if (roots[j] < roots[i]) {
            var tmp = roots[i]; roots[i] = roots[j]; roots[j] = tmp;
            tmp = mults[i]; mults[i] = mults[j]; mults[j] = tmp;
          }
        }
      }
      // Add or update preset 4
      PRESETS[4] = { roots: roots, mult: mults, type: currentHigherType };
      currentPresetIdx = 4;
      refreshHigher();
    });

    // --- Fractional Inequality (Section 7: 分式不等式) ---
    var fracChart = initFracIneqChart();
    var currentFracIdx = 0;
    var currentFracType = 'gt';

    function buildFracFormulaHTML(numRoots, numMult, denRoots, denMult, type) {
      var symbol = '>';
      switch (type) {
        case 'gt': symbol = '>'; break;
        case 'lt': symbol = '<'; break;
        case 'gte': symbol = '\u2265'; break;
        case 'lte': symbol = '\u2264'; break;
      }
      function buildFactor(roots, mults) {
        var parts = [];
        for (var i = 0; i < roots.length; i++) {
          var r = roots[i];
          if (r === 0) {
            parts.push(mults[i] === 1 ? 'x' : 'x\u00b2');
          } else if (r < 0) {
            parts.push(mults[i] === 1 ? '(x+' + Math.abs(r).toFixed(1) + ')' : '(x+' + Math.abs(r).toFixed(1) + ')\u00b2');
          } else {
            parts.push(mults[i] === 1 ? '(x\u2212' + r.toFixed(1) + ')' : '(x\u2212' + r.toFixed(1) + ')\u00b2');
          }
        }
        return parts.join('\u00b7');
      }
      return buildFactor(numRoots, numMult) + ' / ' + buildFactor(denRoots, denMult) + ' ' + symbol + ' 0';
    }

    function refreshFrac() {
      var preset = FRAC_PRESETS[currentFracIdx];
      document.getElementById('fracFormula').innerHTML = buildFracFormulaHTML(preset.numRoots, preset.numMult, preset.denRoots, preset.denMult, currentFracType);
      if (fracChart) fracChart.update(preset.numRoots, preset.numMult, preset.denRoots, preset.denMult, currentFracType);
    }

    // Frac preset buttons
    var fracPresetBtns = document.querySelectorAll('#fracPresetGroup button');
    fracPresetBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        fracPresetBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        var idx = parseInt(this.dataset.frac);
        if (idx === 4) {
          document.getElementById('customFracPanel').style.display = 'block';
          return;
        }
        document.getElementById('customFracPanel').style.display = 'none';
        currentFracIdx = idx;
        currentFracType = FRAC_PRESETS[idx].type;
        var ftypeBtns = document.querySelectorAll('#fracTypeGroup button');
        ftypeBtns.forEach(function(b) {
          b.classList.remove('active');
          if (b.dataset.type === currentFracType) b.classList.add('active');
        });
        refreshFrac();
      });
    });

    // Frac type buttons
    var fTypeBtns = document.querySelectorAll('#fracTypeGroup button');
    fTypeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        fTypeBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentFracType = this.dataset.type;
        FRAC_PRESETS[currentFracIdx].type = currentFracType;
        refreshFrac();
      });
    });

    // Custom frac input
    function parseRoots(raw) {
      var tokens = raw.split(',');
      var roots = [], mults = [];
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i].trim();
        if (!t) continue;
        var m = 1;
        if (t.indexOf('^2') !== -1) {
          m = 2;
          t = t.replace('^2', '').trim();
        }
        var v = parseFloat(t);
        if (!isNaN(v)) { roots.push(v); mults.push(m); }
      }
      // Sort
      for (var i = 0; i < roots.length - 1; i++) {
        for (var j = i + 1; j < roots.length; j++) {
          if (roots[j] < roots[i]) {
            var tmp = roots[i]; roots[i] = roots[j]; roots[j] = tmp;
            tmp = mults[i]; mults[i] = mults[j]; mults[j] = tmp;
          }
        }
      }
      return { roots: roots, mults: mults };
    }

    document.getElementById('btnApplyFrac').addEventListener('click', function() {
      var num = parseRoots(document.getElementById('fracNumInput').value);
      var den = parseRoots(document.getElementById('fracDenInput').value);
      if (num.roots.length < 1 || den.roots.length < 1) return;
      FRAC_PRESETS[4] = { numRoots: num.roots, numMult: num.mults, denRoots: den.roots, denMult: den.mults, type: currentFracType };
      currentFracIdx = 4;
      refreshFrac();
    });

    // ===================== Window Resize =====================
    window.addEventListener('resize', function() {
      if (meanChart) meanChart.chart.resize();
      if (quadChart) quadChart.chart.resize();
      if (peChart) peChart.chart.resize();
      if (transChart) transChart.chart.resize();
      if (eqChart) eqChart.chart.resize();
      if (irChart) irChart.chart.resize();
      if (higherChart) higherChart.chart.resize();
      if (fracChart) fracChart.chart.resize();
    });

  });

})();