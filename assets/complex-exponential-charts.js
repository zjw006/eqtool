/**
 * Complex Exponential Visualization
 * Pure Canvas implementation with requestAnimationFrame
 */
(function() {
  'use strict';

  // ===== Canvas Setup =====
  var canvas = document.getElementById('complexCanvas');
  var ctx = canvas.getContext('2d');
  var W = 800, H = 500;
  var dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var cssW = rect.width || W;
    var cssH = rect.height || H;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cssW;
    H = cssH;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ===== State =====
  var state = {
    sigma: 0,
    omega: 1,
    phi: 0,
    time: 2,
    playing: false,
    mode: 'plane',
    animId: null
  };

  var defaults = { sigma: 0, omega: 1, phi: 0, time: 2 };

  // ===== DOM References =====
  var els = {
    sigma: document.getElementById('rangeSigma'),
    omega: document.getElementById('rangeOmega'),
    phi: document.getElementById('rangePhi'),
    time: document.getElementById('rangeTime'),
    valSigma: document.getElementById('valSigma'),
    valOmega: document.getElementById('valOmega'),
    valPhi: document.getElementById('valPhi'),
    valTime: document.getElementById('valTime'),
    btnPlay: document.getElementById('btnPlay'),
    btnReset: document.getElementById('btnReset'),
    btnPlane: document.getElementById('btnModePlane'),
    btnSpiral: document.getElementById('btnModeSpiral'),
    btnWave: document.getElementById('btnModeWave'),
    propRe: document.getElementById('propRe'),
    propIm: document.getElementById('propIm'),
    propMod: document.getElementById('propMod'),
    propArg: document.getElementById('propArg'),
    propSigma: document.getElementById('propSigma'),
    propOmega: document.getElementById('propOmega'),
    infoTime: document.getElementById('infoTime'),
    infoRe: document.getElementById('infoRe'),
    infoIm: document.getElementById('infoIm'),
    infoMod: document.getElementById('infoMod'),
    infoArg: document.getElementById('infoArg'),
    infoOmega: document.getElementById('infoOmega')
  };

  // ===== Math Helpers =====
  function computeZ(t) {
    var expPart = Math.exp(state.sigma * t);
    var angle = state.omega * t + state.phi;
    return {
      re: expPart * Math.cos(angle),
      im: expPart * Math.sin(angle),
      mod: expPart,
      arg: angle
    };
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  // ===== Drawing Helpers =====
  function drawArrow(fromX, fromY, toX, toY, color, width) {
    width = width || 2;
    var dx = toX - fromX;
    var dy = toY - fromY;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var ux = dx / len, uy = dy / len;
    var px = -uy, py = ux;
    var headLen = 10;
    var headW = 6;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - ux * headLen + px * headW, toY - uy * headLen + py * headW);
    ctx.lineTo(toX - ux * headLen - px * headW, toY - uy * headLen - py * headW);
    ctx.closePath();
    ctx.fill();
  }

  function dashedLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCircle(cx, cy, r, color, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    if (dashed) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    if (dashed) ctx.setLineDash([]);
  }

  // ===== Mode 1: Complex Plane Rotation =====
  function drawPlane() {
    var cx = W / 2;
    var cy = H / 2;
    var scale = Math.min(W, H) * 0.32;

    // Trail effect
    ctx.fillStyle = 'rgba(11,17,32,0.2)';
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 40); ctx.lineTo(cx, H - 40);
    ctx.moveTo(40, cy); ctx.lineTo(W - 40, cy);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px JetBrainsMono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Re', W - 25, cy + 18);
    ctx.textAlign = 'right';
    ctx.fillText('Im', cx - 10, 30);

    // Tick marks
    ctx.textAlign = 'center';
    ctx.font = '11px JetBrainsMono, monospace';
    for (var i = -3; i <= 3; i++) {
      if (i === 0) continue;
      var tx = cx + i * scale / 2;
      var ty = cy - i * scale / 2;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, cy - 4); ctx.lineTo(tx, cy + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 4, ty); ctx.lineTo(cx + 4, ty); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(i.toFixed(0), tx, cy + 18);
      ctx.fillText(i.toFixed(0), cx - 12, ty + 4);
    }

    // Unit circle (dashed)
    drawCircle(cx, cy, scale / 2, '#475569', true);

    // Current point
    var z = computeZ(state.time);
    var clampedRe = Math.max(-3, Math.min(3, z.re));
    var clampedIm = Math.max(-3, Math.min(3, z.im));
    var px = cx + clampedRe * scale / 2;
    var py = cy - clampedIm * scale / 2;

    // Projection lines
    dashedLine(px, py, px, cy, '#06b6d4');
    dashedLine(px, py, cx, py, '#ec4899');

    // Vector arrow
    drawArrow(cx, cy, px, py, '#f59e0b', 2.5);

    // Projection points
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(px, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(cx, py, 5, 0, Math.PI * 2); ctx.fill();

    // Current point glow
    ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,158,11,0.15)';
    ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    // Angle arc
    if (z.mod > 0.1) {
      ctx.strokeStyle = 'rgba(245,158,11,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, -wrapAngle(z.arg), 0, z.arg < 0);
      ctx.stroke();
    }
  }

  // ===== Mode 2: Spiral Trajectory =====
  function drawSpiral() {
    var cx = W / 2;
    var cy = H / 2;
    var scale = Math.min(W, H) * 0.22;

    // Trail effect
    ctx.fillStyle = 'rgba(11,17,32,0.2)';
    ctx.fillRect(0, 0, W, H);

    // 3D perspective: offset older points diagonally
    var depthX = 3, depthY = 3;

    // Shadow plane (pseudo-3D depth)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 2 + depthX, cy + depthY);
    ctx.lineTo(cx + scale * 2 + depthX, cy + depthY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + depthX, cy - scale * 2 + depthY);
    ctx.lineTo(cx + depthX, cy + scale * 2 + depthY);
    ctx.stroke();

    // Main axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 2, cy); ctx.lineTo(cx + scale * 2, cy);
    ctx.moveTo(cx, cy - scale * 2); ctx.lineTo(cx, cy + scale * 2);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px JetBrainsMono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Re', cx + scale * 2 + 10, cy + 4);
    ctx.textAlign = 'right';
    ctx.fillText('Im', cx - 8, cy - scale * 2 + 5);

    // Generate spiral points
    var steps = 400;
    var tMax = state.time;
    var points = [];
    for (var i = 0; i <= steps; i++) {
      var t = (i / steps) * tMax;
      var z = computeZ(t);
      // Clamp for display
      var re = Math.max(-5, Math.min(5, z.re));
      var im = Math.max(-5, Math.min(5, z.im));
      points.push({
        x: cx + re * scale,
        y: cy - im * scale,
        t: t,
        mod: z.mod
      });
    }

    // Draw shadow spiral (pseudo-3D)
    if (points.length > 1) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var j = 1; j < points.length; j++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[j-1].x + depthX, points[j-1].y + depthY);
        ctx.lineTo(points[j].x + depthX, points[j].y + depthY);
        ctx.stroke();
      }
    }

    // Draw main spiral with HSL gradient
    if (points.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var k = 1; k < points.length; k++) {
        var progress = k / points.length;
        var hue = 260 - progress * 230; // purple -> amber
        var lw = 1 + progress * 2.5;
        ctx.strokeStyle = 'hsl(' + hue + ', 80%, 60%)';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(points[k-1].x, points[k-1].y);
        ctx.lineTo(points[k].x, points[k].y);
        ctx.stroke();
      }
    }

    // Current point
    if (points.length > 0) {
      var last = points[points.length - 1];
      ctx.beginPath(); ctx.arc(last.x, last.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,158,11,0.2)';
      ctx.fill();
      ctx.beginPath(); ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }
  }

  // ===== Mode 3: Real / Imaginary Waveforms =====
  function drawWave() {
    // Trail effect
    ctx.fillStyle = 'rgba(11,17,32,0.2)';
    ctx.fillRect(0, 0, W, H);

    var padL = 60, padR = 30, padT = 30, padB = 40;
    var midY = H / 2;
    var topH = midY - padT - 20;
    var botH = midY - padT - 20;
    var plotW = W - padL - padR;

    // Divider line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, midY);
    ctx.lineTo(W - padR, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Time axis (bottom)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // Y axes for top and bottom
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, midY - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, midY + 10); ctx.lineTo(padL, H - padB); ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px JetBrainsMono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Re', padL - 8, padT + 12);
    ctx.fillText('Im', padL - 8, midY + 25);
    ctx.textAlign = 'center';
    ctx.fillText('t', W - padR + 15, H - padB + 5);

    // Time ticks
    ctx.font = '10px JetBrainsMono, monospace';
    ctx.fillStyle = '#64748b';
    for (var ti = 0; ti <= 10; ti += 2) {
      var tx = padL + (ti / 10) * plotW;
      ctx.beginPath(); ctx.moveTo(tx, H - padB); ctx.lineTo(tx, H - padB + 5); ctx.stroke();
      ctx.fillText(ti.toFixed(0), tx, H - padB + 18);
    }

    // Determine max amplitude for scaling
    var maxAmp = 1;
    for (var samp = 0; samp <= 10; samp += 0.1) {
      var testZ = computeZ(samp);
      maxAmp = Math.max(maxAmp, Math.abs(testZ.re), Math.abs(testZ.im));
    }
    maxAmp = Math.max(1, maxAmp * 1.1);

    // Y tick marks
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrainsMono, monospace';
    for (var yi = -2; yi <= 2; yi++) {
      if (yi === 0) continue;
      var yOff = (yi / 3) * topH;
      ctx.fillText((yi * maxAmp / 2).toFixed(1), padL - 6, midY - 10 - yOff + 3);
      ctx.fillText((yi * maxAmp / 2).toFixed(1), padL - 6, midY + 10 - yOff + 3);
    }

    // Draw real part wave (top)
    var realPoints = [];
    var imagPoints = [];
    var step = 0.02;
    for (var t = 0; t <= 10; t += step) {
      var wz = computeZ(t);
      var wx = padL + (t / 10) * plotW;
      realPoints.push({ x: wx, y: midY - 10 - (wz.re / maxAmp) * topH });
      imagPoints.push({ x: wx, y: midY + 10 - (wz.im / maxAmp) * botH });
    }

    // Draw real wave
    if (realPoints.length > 1) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var ri = 0; ri < realPoints.length; ri++) {
        if (ri === 0) ctx.moveTo(realPoints[ri].x, realPoints[ri].y);
        else ctx.lineTo(realPoints[ri].x, realPoints[ri].y);
      }
      ctx.stroke();
    }

    // Draw imaginary wave
    if (imagPoints.length > 1) {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var ii = 0; ii < imagPoints.length; ii++) {
        if (ii === 0) ctx.moveTo(imagPoints[ii].x, imagPoints[ii].y);
        else ctx.lineTo(imagPoints[ii].x, imagPoints[ii].y);
      }
      ctx.stroke();
    }

    // Current time vertical line
    var curX = padL + (state.time / 10) * plotW;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, H - padB);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current point markers
    var curZ = computeZ(state.time);
    var curRealY = midY - 10 - (curZ.re / maxAmp) * topH;
    var curImagY = midY + 10 - (curZ.im / maxAmp) * botH;

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(curX, curRealY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(curX, curImagY, 5, 0, Math.PI * 2); ctx.fill();
  }

  // ===== Main Draw =====
  function draw() {
    if (state.mode === 'plane') drawPlane();
    else if (state.mode === 'spiral') drawSpiral();
    else drawWave();
  }

  // ===== Update Info Panels =====
  function updateInfo() {
    var z = computeZ(state.time);
    var reStr = z.re.toFixed(2);
    var imStr = z.im.toFixed(2);
    var modStr = z.mod.toFixed(2);
    var argStr = wrapAngle(z.arg).toFixed(2);
    var timeStr = state.time.toFixed(2);
    var sigmaStr = state.sigma.toFixed(2);
    var omegaStr = state.omega.toFixed(2);

    els.valSigma.textContent = sigmaStr;
    els.valOmega.textContent = omegaStr;
    els.valPhi.textContent = state.phi.toFixed(2);
    els.valTime.textContent = timeStr;

    els.propRe.textContent = reStr;
    els.propIm.textContent = imStr;
    els.propMod.textContent = modStr;
    els.propArg.textContent = argStr;
    els.propSigma.textContent = sigmaStr;
    els.propOmega.textContent = omegaStr;

    els.infoTime.textContent = timeStr;
    els.infoRe.textContent = reStr;
    els.infoIm.textContent = imStr;
    els.infoMod.textContent = modStr;
    els.infoArg.textContent = argStr + ' rad';
    els.infoOmega.textContent = omegaStr + ' rad/s';
  }

  // ===== Animation Loop =====
  function animate() {
    if (state.playing) {
      state.time += 0.015;
      if (state.time > 10) state.time = 0;
      els.time.value = state.time;
    }
    draw();
    updateInfo();
    state.animId = requestAnimationFrame(animate);
  }

  // ===== Event Handlers =====
  function setMode(mode) {
    state.mode = mode;
    els.btnPlane.classList.toggle('active', mode === 'plane');
    els.btnSpiral.classList.toggle('active', mode === 'spiral');
    els.btnWave.classList.toggle('active', mode === 'wave');
    // Clear canvas on mode switch
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);
  }

  els.btnPlane.addEventListener('click', function() { setMode('plane'); });
  els.btnSpiral.addEventListener('click', function() { setMode('spiral'); });
  els.btnWave.addEventListener('click', function() { setMode('wave'); });

  els.sigma.addEventListener('input', function() {
    state.sigma = parseFloat(this.value);
  });
  els.omega.addEventListener('input', function() {
    state.omega = parseFloat(this.value);
  });
  els.phi.addEventListener('input', function() {
    state.phi = parseFloat(this.value);
  });
  els.time.addEventListener('input', function() {
    state.time = parseFloat(this.value);
  });

  // Play / Pause
  els.btnPlay.addEventListener('click', function() {
    if (state.playing) {
      state.playing = false;
      this.innerHTML = '\u25ba ' + '\u64ad\u653e\u52a8\u753b';
      this.classList.remove('active');
    } else {
      state.playing = true;
      this.innerHTML = '\u23f8 ' + '\u6682\u505c';
      this.classList.add('active');
    }
  });

  // Reset
  els.btnReset.addEventListener('click', function() {
    state.playing = false;
    cancelAnimationFrame(state.animId);
    els.btnPlay.innerHTML = '\u25ba ' + '\u64ad\u653e\u52a8\u753b';
    els.btnPlay.classList.remove('active');

    state.sigma = defaults.sigma;
    state.omega = defaults.omega;
    state.phi = defaults.phi;
    state.time = defaults.time;

    els.sigma.value = state.sigma;
    els.omega.value = state.omega;
    els.phi.value = state.phi;
    els.time.value = state.time;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);
    updateInfo();
    animate();
  });

  // ===== Init =====
  updateInfo();
  animate();
})();
