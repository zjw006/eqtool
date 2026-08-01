(function() {
  'use strict';

  // ==================== 通用工具 ====================
  var COLORS = {
    primary: '#6BB6D6',
    secondary: 'rgba(180,160,140,0.25)',
    accent: '#E8A93E',
    fill: 'rgba(34,211,238,0.08)',
    fillStrong: 'rgba(34,211,238,0.18)',
    faceFill: 'rgba(34,211,238,0.12)',
    edgeGlow: '#6BB6D6',
    vertex: '#ffffff',
    bg: '#FFF5EE',
    text: '#4A3B2E',
    muted: '#9B8B7A',
    axis: 'rgba(180,160,140,0.25)',
    barColors: ['#6BB6D6', '#3b82f6', '#E8A93E', '#10b981', '#ef4444', '#a855f7']
  };

  function tooltipStyle() {
    return { backgroundColor: '#FFF5EE', borderColor: 'rgba(180,160,140,0.25)', textStyle: { color: '#4A3B2E', fontFamily: 'Outfit, sans-serif' } };
  }
  function axisStyle() {
    return { axisLine: { lineStyle: { color: 'rgba(180,160,140,0.25)' } }, axisLabel: { color: '#9B8B7A', fontFamily: 'JetBrainsMono, monospace' }, splitLine: { lineStyle: { color: 'rgba(51,65,85,0.25)' } } };
  }

  // 3D 数学工具
  function rotateY(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  }
  function rotateX(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
  }
  function project(v, cx, cy, scale) {
    var fov = 4;
    var z = v[2] + fov;
    var factor = fov / Math.max(z, 0.1);
    return { x: cx + v[0] * factor * scale, y: cy - v[1] * factor * scale, z: v[2] };
  }
  function faceNormal(v0, v1, v2) {
    var ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
    var bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
    return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  }
  function vecDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vecLen(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
  function vecNorm(v) {
    var l = Math.max(vecLen(v), 1e-8);
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  function drawEllipse(ctx, cx, cy, rx, ry, startAngle, endAngle, color, lineWidth) {
    rx = Math.max(rx, 0.01);
    ry = Math.max(ry, 0.01);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 1.5;
    ctx.stroke();
  }

  // 设置 Canvas DPR
  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    return { w: rect.width, h: rect.height, ctx: ctx, dpr: dpr };
  }

  // ==================== Section 1: 旋转体 ====================
  var rot = {
    canvas: null, ctx: null, w: 0, h: 0,
    type: 'cylinder',
    angle: 0,
    autoRotate: false,
    animId: null,
    rotX: -0.4, rotY: 0.6,
    dragging: false, lastMX: 0, lastMY: 0,
    scale: 60,
    a: 1.2, gh: 2.4, rTop: 0.7
  };

  var rotShapes = {
    cylinder: {
      name2d: '\u77e9\u5f62',
      axis: 'y \u8f74 (\u957f\u8fb9\u6240\u5728\u7684\u76f4\u7ebf)',
      result: '\u5706\u67f1'
    },
    cone: {
      name2d: '\u76f4\u89d2\u4e09\u89d2\u5f62',
      axis: '\u76f4\u89d2\u8fb9',
      result: '\u5706\u9525'
    },
    frustum: {
      name2d: '\u76f4\u89d2\u68af\u5f62',
      axis: '\u76f4\u89d2\u8fb9',
      result: '\u5706\u53f0'
    },
    sphere: {
      name2d: '\u534a\u5706',
      axis: '\u76f4\u5f84',
      result: '\u7403'
    }
  };

  var rotOffX = 0, rotOffY = 0;

  function rotProject(x, y, z) {
    var v = rotateY([x - rotOffX, y - rotOffY, z], rot.rotY);
    v = rotateX(v, rot.rotX);
    return project(v, rot.w / 2, rot.h / 2, rot.scale);
  }

  function drawRotAxis(ctx) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = COLORS.secondary;
    ctx.lineWidth = 1.5;
    var top = rotProject(0, rot.gh + 0.5, 0);
    var bot = rotProject(0, -0.5, 0);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawRotCylinder(ctx, angle, a, h) {
    var steps = 64;
    var angleRad = angle * Math.PI / 180;
    var filled = angle <= 0;

    // 2D rectangle outline
    ctx.save();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    var p0 = rotProject(0, 0, 0);
    var p1 = rotProject(a, 0, 0);
    var p2 = rotProject(a, h, 0);
    var p3 = rotProject(0, h, 0);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3D wireframe
    if (angle > 0) {
      // bottom ellipse
      var bRy = Math.abs(Math.cos(rot.rotY)) * 0.3 + 0.1;
      var bRx = a;
      var bCenter = rotProject(0, 0, 0);
      var topCenter = rotProject(0, h, 0);

      // Draw partial/full surface
      for (var i = 0; i < steps; i++) {
        var t1 = (i / steps) * angleRad;
        var t2 = ((i + 1) / steps) * angleRad;
        var x1 = a * Math.cos(t1);
        var z1 = a * Math.sin(t1);
        var x2 = a * Math.cos(t2);
        var z2 = a * Math.sin(t2);

        var bp1 = rotProject(x1, 0, z1);
        var bp2 = rotProject(x2, 0, z2);
        var tp1 = rotProject(x1, h, z1);
        var tp2 = rotProject(x2, h, z2);

        // side face fill
        var v0 = [x1, 0, z1], v1 = [x2, 0, z2], v2 = [x2, h, z2];
        var norm = faceNormal(v0, v1, v2);
        var light = vecNorm([0.3, 0.8, 0.5]);
        var brightness = Math.max(0, vecDot(vecNorm(norm), light)) * 0.5 + 0.3;
        var alpha = brightness * 0.22;

        ctx.fillStyle = 'rgba(34,211,238,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(bp1.x, bp1.y);
        ctx.lineTo(bp2.x, bp2.y);
        ctx.lineTo(tp2.x, tp2.y);
        ctx.lineTo(tp1.x, tp1.y);
        ctx.closePath();
        ctx.fill();

        // bottom ring fill
        ctx.fillStyle = 'rgba(34,211,238,' + (alpha * 0.4).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(bCenter.x, bCenter.y);
        ctx.lineTo(bp1.x, bp1.y);
        ctx.lineTo(bp2.x, bp2.y);
        ctx.closePath();
        ctx.fill();

        // edges
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bp1.x, bp1.y);
        ctx.lineTo(bp2.x, bp2.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tp1.x, tp1.y);
        ctx.lineTo(tp2.x, tp2.y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(34,211,238,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bp1.x, bp1.y);
        ctx.lineTo(tp1.x, tp1.y);
        ctx.stroke();
      }

      // vertical edge at start and end angle
      if (angle < 360) {
        var sx = a * Math.cos(0);
        var sz = a * Math.sin(0);
        var ex = a * Math.cos(angleRad);
        var ez = a * Math.sin(angleRad);
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 2;
        var sp1 = rotProject(sx, 0, sz);
        var sp2 = rotProject(sx, h, sz);
        ctx.beginPath(); ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
        var ep1 = rotProject(ex, 0, ez);
        var ep2 = rotProject(ex, h, ez);
        ctx.beginPath(); ctx.moveTo(ep1.x, ep1.y); ctx.lineTo(ep2.x, ep2.y); ctx.stroke();
      }
    }
  }

  function drawRotCone(ctx, angle, r, h) {
    var steps = 64;
    var angleRad = angle * Math.PI / 180;

    // 2D triangle
    ctx.save();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    var p0 = rotProject(0, 0, 0);
    var p1 = rotProject(r, 0, 0);
    var p2 = rotProject(0, h, 0);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (angle > 0) {
      var apex = rotProject(0, h, 0);
      for (var i = 0; i < steps; i++) {
        var t1 = (i / steps) * angleRad;
        var t2 = ((i + 1) / steps) * angleRad;
        var x1 = r * Math.cos(t1), z1 = r * Math.sin(t1);
        var x2 = r * Math.cos(t2), z2 = r * Math.sin(t2);

        var bp1 = rotProject(x1, 0, z1);
        var bp2 = rotProject(x2, 0, z2);
        var tp1 = rotProject(0, h, 0);

        var v0 = [x1, 0, z1], v1 = [x2, 0, z2], v2 = [0, h, 0];
        var norm = faceNormal(v0, v1, v2);
        var light = vecNorm([0.3, 0.8, 0.5]);
        var brightness = Math.max(0, vecDot(vecNorm(norm), light)) * 0.5 + 0.3;
        var alpha = brightness * 0.22;

        ctx.fillStyle = 'rgba(34,211,238,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(bp1.x, bp1.y); ctx.lineTo(bp2.x, bp2.y); ctx.lineTo(tp1.x, tp1.y); ctx.closePath();
        ctx.fill();

        // base fill
        var bc = rotProject(0, 0, 0);
        ctx.fillStyle = 'rgba(34,211,238,' + (alpha * 0.4).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(bc.x, bc.y); ctx.lineTo(bp1.x, bp1.y); ctx.lineTo(bp2.x, bp2.y); ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bp1.x, bp1.y); ctx.lineTo(bp2.x, bp2.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(34,211,238,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(bp1.x, bp1.y); ctx.lineTo(tp1.x, tp1.y); ctx.stroke();
      }
    }
  }

  function drawRotFrustum(ctx, angle, R, r, h) {
    var steps = 64;
    var angleRad = angle * Math.PI / 180;

    // 2D trapezoid
    ctx.save();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    var p0 = rotProject(0, 0, 0);
    var p1 = rotProject(R, 0, 0);
    var p2 = rotProject(r, h, 0);
    var p3 = rotProject(0, h, 0);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (angle > 0) {
      for (var i = 0; i < steps; i++) {
        var t1 = (i / steps) * angleRad;
        var t2 = ((i + 1) / steps) * angleRad;
        var x1b = R * Math.cos(t1), z1b = R * Math.sin(t1);
        var x2b = R * Math.cos(t2), z2b = R * Math.sin(t2);
        var x1t = r * Math.cos(t1), z1t = r * Math.sin(t1);
        var x2t = r * Math.cos(t2), z2t = r * Math.sin(t2);

        var bp1 = rotProject(x1b, 0, z1b);
        var bp2 = rotProject(x2b, 0, z2b);
        var tp1 = rotProject(x1t, h, z1t);
        var tp2 = rotProject(x2t, h, z2t);

        var v0 = [x1b, 0, z1b], v1 = [x2b, 0, z2b], v2 = [x2t, h, z2t];
        var norm = faceNormal(v0, v1, v2);
        var light = vecNorm([0.3, 0.8, 0.5]);
        var brightness = Math.max(0, vecDot(vecNorm(norm), light)) * 0.5 + 0.3;
        var alpha = brightness * 0.22;

        ctx.fillStyle = 'rgba(34,211,238,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(bp1.x, bp1.y); ctx.lineTo(bp2.x, bp2.y); ctx.lineTo(tp2.x, tp2.y); ctx.lineTo(tp1.x, tp1.y); ctx.closePath();
        ctx.fill();

        // bottom base
        var bc = rotProject(0, 0, 0);
        ctx.fillStyle = 'rgba(34,211,238,' + (alpha * 0.35).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(bc.x, bc.y); ctx.lineTo(bp1.x, bp1.y); ctx.lineTo(bp2.x, bp2.y); ctx.closePath(); ctx.fill();

        // top base
        var tc = rotProject(0, h, 0);
        ctx.fillStyle = 'rgba(34,211,238,' + (alpha * 0.35).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(tc.x, tc.y); ctx.lineTo(tp1.x, tp1.y); ctx.lineTo(tp2.x, tp2.y); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bp1.x, bp1.y); ctx.lineTo(bp2.x, bp2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tp1.x, tp1.y); ctx.lineTo(tp2.x, tp2.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(34,211,238,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(bp1.x, bp1.y); ctx.lineTo(tp1.x, tp1.y); ctx.stroke();
      }
    }
  }

  function drawRotSphere(ctx, angle, radius) {
    var steps = 64;
    var angleRad = angle * Math.PI / 180;

    // 2D semicircle
    ctx.save();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    var pts = [];
    for (var i = 0; i <= 32; i++) {
      var t = (i / 32) * Math.PI;
      pts.push(rotProject(radius * Math.cos(t), radius * Math.sin(t), 0));
    }
    ctx.beginPath();
    pts.forEach(function(p, j) { j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    // diameter line
    var dp0 = rotProject(-radius, 0, 0);
    var dp1 = rotProject(radius, 0, 0);
    ctx.beginPath(); ctx.moveTo(dp0.x, dp0.y); ctx.lineTo(dp1.x, dp1.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (angle > 0) {
      // latitude rings
      var latCount = 8;
      for (var li = 1; li < latCount; li++) {
        var latAngle = (li / latCount) * Math.PI;
        var lr = radius * Math.sin(latAngle);
        var ly = radius * Math.cos(latAngle);
        for (var i = 0; i < steps; i++) {
          var t1 = (i / steps) * angleRad;
          var t2 = ((i + 1) / steps) * angleRad;
          var x1 = lr * Math.cos(t1), z1 = lr * Math.sin(t1);
          var x2 = lr * Math.cos(t2), z2 = lr * Math.sin(t2);
          var pp1 = rotProject(x1, ly, z1);
          var pp2 = rotProject(x2, ly, z2);
          ctx.strokeStyle = COLORS.primary;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pp1.x, pp1.y); ctx.lineTo(pp2.x, pp2.y); ctx.stroke();
        }
      }

      // longitude lines
      var lonCount = 12;
      for (var lj = 0; lj < Math.ceil((angle / 360) * lonCount); lj++) {
        var lonAngle = (lj / lonCount) * 2 * Math.PI;
        if ((lj / lonCount) * 360 > angle) break;
        for (var i = 0; i < steps; i++) {
          var t1 = (i / steps) * Math.PI;
          var t2 = ((i + 1) / steps) * Math.PI;
          var px1 = radius * Math.sin(t1) * Math.cos(lonAngle);
          var py1 = radius * Math.cos(t1);
          var pz1 = radius * Math.sin(t1) * Math.sin(lonAngle);
          var px2 = radius * Math.sin(t2) * Math.cos(lonAngle);
          var py2 = radius * Math.cos(t2);
          var pz2 = radius * Math.sin(t2) * Math.sin(lonAngle);
          var sp1 = rotProject(px1, py1, pz1);
          var sp2 = rotProject(px2, py2, pz2);
          ctx.strokeStyle = 'rgba(34,211,238,0.5)';
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
        }
      }

      // surface patches for lighting effect
      for (var i = 0; i < steps; i++) {
        var t1 = (i / steps) * angleRad;
        var t2 = ((i + 1) / steps) * angleRad;
        for (var j = 0; j < 6; j++) {
          var phi1 = (j / 6) * Math.PI;
          var phi2 = ((j + 1) / 6) * Math.PI;
          var v0 = [radius * Math.sin(phi1) * Math.cos(t1), radius * Math.cos(phi1), radius * Math.sin(phi1) * Math.sin(t1)];
          var v1 = [radius * Math.sin(phi1) * Math.cos(t2), radius * Math.cos(phi1), radius * Math.sin(phi1) * Math.sin(t2)];
          var v2 = [radius * Math.sin(phi2) * Math.cos(t2), radius * Math.cos(phi2), radius * Math.sin(phi2) * Math.sin(t2)];
          var norm = faceNormal(v0, v1, v2);
          var light = vecNorm([0.3, 0.8, 0.5]);
          var brightness = Math.max(0, vecDot(vecNorm(norm), light)) * 0.5 + 0.3;
          var alpha = brightness * 0.1;
          var sp0 = rotProject(v0[0], v0[1], v0[2]);
          var sp1 = rotProject(v1[0], v1[1], v1[2]);
          var sp2 = rotProject(v2[0], v2[1], v2[2]);
          ctx.fillStyle = 'rgba(34,211,238,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(sp0.x, sp0.y); ctx.lineTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  var rotCtrlDefs = {
    cylinder: [
      { label: '\u5bbd a (\u5e95\u9762\u534a\u5f84)', key: 'a', min: 0.3, max: 2.5, step: 0.1, def: 1.2 },
      { label: '\u9ad8 h', key: 'gh', min: 0.5, max: 4, step: 0.1, def: 2.4 }
    ],
    cone: [
      { label: '\u5e95\u8fb9 a (\u5e95\u9762\u534a\u5f84)', key: 'a', min: 0.3, max: 2.5, step: 0.1, def: 1.2 },
      { label: '\u9ad8 h', key: 'gh', min: 0.5, max: 4, step: 0.1, def: 2.4 }
    ],
    frustum: [
      { label: '\u4e0b\u5e95 a (\u4e0b\u5e95\u534a\u5f84 R)', key: 'a', min: 0.3, max: 2.5, step: 0.1, def: 1.2 },
      { label: '\u4e0a\u5e95 r (\u4e0a\u5e95\u534a\u5f84)', key: 'rTop', min: 0.1, max: 2.5, step: 0.1, def: 0.7 },
      { label: '\u9ad8 h', key: 'gh', min: 0.5, max: 4, step: 0.1, def: 2.4 }
    ],
    sphere: [
      { label: '\u534a\u5f84 a', key: 'a', min: 0.3, max: 2.5, step: 0.1, def: 1.2 }
    ]
  };

  function buildRotControls(type) {
    var area = document.getElementById('rotCtrlArea');
    if (!area) return;
    area.innerHTML = '';

    var defs = rotCtrlDefs[type] || [];
    defs.forEach(function(d) {
      var group = document.createElement('div');
      group.className = 'control-group';
      var label = document.createElement('label');
      label.textContent = d.label + ': ';
      var valSpan = document.createElement('span');
      valSpan.className = 'value';
      valSpan.textContent = rot[d.key] !== undefined ? parseFloat(rot[d.key].toFixed(1)) : d.def;
      label.appendChild(valSpan);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = d.min;
      input.max = d.max;
      input.step = d.step;
      input.value = rot[d.key] !== undefined ? rot[d.key] : d.def;
      input.addEventListener('input', function() {
        rot[d.key] = parseFloat(input.value);
        valSpan.textContent = parseFloat(input.value).toFixed(1);
      });
      group.appendChild(label);
      group.appendChild(input);
      area.appendChild(group);
    });
  }

  function drawRotationScene() {
    if (!rot.ctx) return;
    var ctx = rot.ctx;
    ctx.clearRect(0, 0, rot.w, rot.h);
    // Center the shape by offsetting world coords so geometric center is at origin
    if (rot.type === 'sphere') { rotOffX = 0; rotOffY = 0; }
    else { rotOffX = rot.a / 2; rotOffY = rot.gh / 2; }
    drawRotAxis(ctx);

    var a = rot.a, gh = rot.gh;
    switch (rot.type) {
      case 'cylinder':
        drawRotCylinder(ctx, rot.angle, a, gh);
        break;
      case 'cone':
        drawRotCone(ctx, rot.angle, a, gh);
        break;
      case 'frustum':
        drawRotFrustum(ctx, rot.angle, a, rot.rTop, gh);
        break;
      case 'sphere':
        drawRotSphere(ctx, rot.angle, a);
        break;
    }

    // Update info
    var info = rotShapes[rot.type];
    var elShape = document.getElementById('infoRotShape');
    var elAxis = document.getElementById('infoRotAxis');
    var elResult = document.getElementById('infoRotResult');
    if (elShape) elShape.textContent = info.name2d;
    if (elAxis) elAxis.textContent = info.axis;
    if (elResult) elResult.textContent = info.result + (rot.angle < 360 ? ' (\u65cb\u8f6c ' + Math.round(rot.angle) + '\u00b0)' : ' (\u5b8c\u6574)');
  }

  function rotAnimate() {
    if (rot.autoRotate) {
      rot.angle += 1;
      if (rot.angle > 360) rot.angle = 0;
      var slider = document.getElementById('rotAngleSlider');
      var valEl = document.getElementById('valRotAngle');
      if (slider) slider.value = rot.angle;
      if (valEl) valEl.textContent = Math.round(rot.angle) + '\u00b0';
    }
    drawRotationScene();
    rot.animId = requestAnimationFrame(rotAnimate);
  }

  function initRotation() {
    rot.canvas = document.getElementById('rotCanvas');
    if (!rot.canvas) return;
    var info = setupCanvas(rot.canvas);
    rot.ctx = info.ctx;
    rot.w = info.w;
    rot.h = info.h;

    // type buttons
    var typeGroup = document.getElementById('rotTypeGroup');
    if (typeGroup) {
      typeGroup.addEventListener('click', function(e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        typeGroup.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        rot.type = btn.dataset.shape || 'cylinder';
        buildRotControls(rot.type);
        drawRotationScene();
      });
    }

    // angle slider
    var slider = document.getElementById('rotAngleSlider');
    var valEl = document.getElementById('valRotAngle');
    if (slider) {
      slider.addEventListener('input', function() {
        rot.angle = parseFloat(slider.value);
        if (valEl) valEl.textContent = Math.round(rot.angle) + '\u00b0';
        drawRotationScene();
      });
    }

    // auto rotate — sync with checkbox initial state
    var check = document.getElementById('rotAutoCheck');
    if (check) {
      rot.autoRotate = check.checked;
      check.addEventListener('change', function() {
        rot.autoRotate = check.checked;
      });
    }

    // mouse drag
    rot.canvas.addEventListener('mousedown', function(e) {
      rot.dragging = true;
      rot.lastMX = e.clientX;
      rot.lastMY = e.clientY;
    });
    window.addEventListener('mousemove', function(e) {
      if (!rot.dragging) return;
      var dx = e.clientX - rot.lastMX;
      var dy = e.clientY - rot.lastMY;
      rot.rotY += dx * 0.01;
      rot.rotX += dy * 0.01;
      rot.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rot.rotX));
      rot.lastMX = e.clientX;
      rot.lastMY = e.clientY;
    });
    window.addEventListener('mouseup', function() { rot.dragging = false; });

    buildRotControls(rot.type);
    rot.animId = requestAnimationFrame(rotAnimate);
  }

  // ==================== Section 2: 多面体探索 ====================
  var solid = {
    canvas: null, ctx: null, w: 0, h: 0,
    type: 'cube',
    rotX: -0.4, rotY: 0.6,
    dragging: false, lastMX: 0, lastMY: 0,
    animId: null,
    scale: 50,
    params: {}
  };

  function solidProject(x, y, z) {
    var v = rotateY([x, y, z], solid.rotY);
    v = rotateX(v, solid.rotX);
    return project(v, solid.w / 2, solid.h / 2, solid.scale);
  }

  function getSolidData(type, params) {
    var p = params || solid.params;
    var a, b, c, h, r;
    switch (type) {
      case 'cube':
        a = p.a !== undefined ? p.a : 2;
        a = a / 2;
        return {
          vertices: [
            [-a,-a,-a],[a,-a,-a],[a,a,-a],[-a,a,-a],
            [-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]
          ],
          edges: [
            [0,1],[1,2],[2,3],[3,0],
            [4,5],[5,6],[6,7],[7,4],
            [0,4],[1,5],[2,6],[3,7]
          ],
          faces: [
            [0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]
          ],
          V: 8, E: 12, F: 6,
          vol: (a * 2) * (a * 2) * (a * 2),
          sa: 6 * (a * 2) * (a * 2)
        };
      case 'cuboid':
        a = p.a !== undefined ? p.a : 3;
        b = p.b !== undefined ? p.b : 2;
        c = p.c !== undefined ? p.c : 1.5;
        a = a / 2; b = b / 2; c = c / 2;
        return {
          vertices: [
            [-a,-c,-b],[a,-c,-b],[a,c,-b],[-a,c,-b],
            [-a,-c,b],[a,-c,b],[a,c,b],[-a,c,b]
          ],
          edges: [
            [0,1],[1,2],[2,3],[3,0],
            [4,5],[5,6],[6,7],[7,4],
            [0,4],[1,5],[2,6],[3,7]
          ],
          faces: [
            [0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]
          ],
          V: 8, E: 12, F: 6,
          vol: (a * 2) * (b * 2) * (c * 2),
          sa: 2 * ((a * 2) * (b * 2) + (b * 2) * (c * 2) + (a * 2) * (c * 2))
        };
      case 'tetra':
        a = p.a !== undefined ? p.a : 2.5;
        h = p.h !== undefined ? p.h : 3;
        var ha = a / Math.sqrt(3);
        return {
          vertices: [
            [-ha, 0, -a / 2], [ha, 0, -a / 2], [ha, 0, a / 2],
            [0, h, 0]
          ],
          edges: [[0,1],[1,2],[2,0],[0,3],[1,3],[2,3]],
          faces: [[0,1,2],[0,1,3],[1,2,3],[2,0,3]],
          V: 4, E: 6, F: 4,
          vol: (1 / 3) * (Math.sqrt(3) / 4 * a * a) * h,
          sa: Math.sqrt(3) / 4 * a * a * 4
        };
      case 'pyramid':
        a = p.a !== undefined ? p.a : 2;
        h = p.h !== undefined ? p.h : 3;
        var ha2 = a / 2;
        return {
          vertices: [
            [-ha2, 0, -ha2], [ha2, 0, -ha2], [ha2, 0, ha2], [-ha2, 0, ha2],
            [0, h, 0]
          ],
          edges: [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]],
          faces: [[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]],
          V: 5, E: 8, F: 5,
          vol: (1 / 3) * a * a * h,
          sa: a * a + 2 * a * Math.sqrt(h * h + a * a / 4)
        };
      case 'hexpyramid':
        a = p.a !== undefined ? p.a : 1.5;
        h = p.h !== undefined ? p.h : 3;
        var verts = [];
        var edgs = [];
        var fcs = [[0,1,2,3,4,5]]; // base
        for (var i = 0; i < 6; i++) {
          var angle = (i / 6) * 2 * Math.PI;
          verts.push([a * Math.cos(angle), 0, a * Math.sin(angle)]);
          edgs.push([i, (i + 1) % 6]);
          fcs.push([i, (i + 1) % 6, 6]);
        }
        verts.push([0, h, 0]);
        return {
          vertices: verts,
          edges: edgs,
          faces: fcs,
          V: 7, E: 12, F: 7,
          vol: (1 / 3) * (3 * Math.sqrt(3) / 2 * a * a) * h,
          sa: (3 * Math.sqrt(3) / 2 * a * a) + 3 * a * Math.sqrt(h * h + a * a * 0.75)
        };
      case 'sphere':
        r = p.r !== undefined ? p.r : 2;
        // generate wireframe sphere
        var sVerts = [], sEdges = [];
        var seg = 16;
        // latitude
        for (var lat = 0; lat <= seg; lat++) {
          var phi = (lat / seg) * Math.PI;
          for (var lon = 0; lon < seg; lon++) {
            var theta = (lon / seg) * 2 * Math.PI;
            sVerts.push([
              r * Math.sin(phi) * Math.cos(theta),
              r * Math.cos(phi),
              r * Math.sin(phi) * Math.sin(theta)
            ]);
            var idx = lat * seg + lon;
            if (lon < seg - 1) sEdges.push([idx, idx + 1]);
            if (lat < seg) sEdges.push([idx, idx + seg]);
            if (lon === seg - 1 && lat < seg) sEdges.push([idx, lat * seg]);
          }
        }
        var sFaces = [];
        for (var lat = 0; lat < seg; lat++) {
          for (var lon = 0; lon < seg; lon++) {
            var i0 = lat * seg + lon;
            var i1 = lat * seg + (lon + 1) % seg;
            var i2 = (lat + 1) * seg + (lon + 1) % seg;
            var i3 = (lat + 1) * seg + lon;
            sFaces.push([i0, i1, i2, i3]);
          }
        }
        return {
          vertices: sVerts,
          edges: sEdges,
          faces: sFaces,
          V: (seg + 1) * seg,
          E: seg * seg * 2,
          F: seg * seg,
          vol: (4 / 3) * Math.PI * r * r * r,
          sa: 4 * Math.PI * r * r,
          theoretical: true
        };
    }
    return { vertices: [], edges: [], faces: [], V: 0, E: 0, F: 0, vol: 0, sa: 0 };
  }

  function drawSolidScene() {
    if (!solid.ctx) return;
    var ctx = solid.ctx;
    ctx.clearRect(0, 0, solid.w, solid.h);

    var data = getSolidData(solid.type, solid.params);

    // transform vertices
    var transformed = data.vertices.map(function(v) {
      var rv = rotateY(v, solid.rotY);
      rv = rotateX(rv, solid.rotX);
      return rv;
    });

    // project vertices
    var projected = transformed.map(function(v) {
      return project(v, solid.w / 2, solid.h / 2, solid.scale);
    });

    // sort faces by average z
    var facesWithZ = data.faces.map(function(face, fi) {
      var avgZ = 0;
      face.forEach(function(vi) { avgZ += transformed[vi][2]; });
      avgZ /= face.length;
      return { face: face, z: avgZ, idx: fi };
    });
    facesWithZ.sort(function(a, b) { return a.z - b.z; });

    // painter algorithm: draw faces
    var lightDir = vecNorm([0.3, 0.8, 0.5]);
    facesWithZ.forEach(function(item) {
      var face = item.face;
      if (face.length < 3) return;
      var v0 = transformed[face[0]], v1 = transformed[face[1]], v2 = transformed[face[2]];
      var norm = faceNormal(v0, v1, v2);
      var nNorm = vecNorm(norm);
      var brightness = Math.max(0, vecDot(nNorm, lightDir)) * 0.5 + 0.35;

      ctx.beginPath();
      face.forEach(function(vi, i) {
        i === 0 ? ctx.moveTo(projected[vi].x, projected[vi].y) : ctx.lineTo(projected[vi].x, projected[vi].y);
      });
      ctx.closePath();

      // fill
      var alpha = brightness * 0.25;
      ctx.fillStyle = 'rgba(34,211,238,' + alpha.toFixed(3) + ')';
      ctx.fill();

      // stroke
      ctx.strokeStyle = 'rgba(34,211,238,' + (brightness * 0.8 + 0.2).toFixed(3) + ')';
      ctx.lineWidth = solid.type === 'sphere' ? 0.5 : 1.5;
      ctx.stroke();
    });

    // draw edges (glow effect)
    if (solid.type !== 'sphere') {
      ctx.shadowColor = COLORS.primary;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = COLORS.primary;
      ctx.lineWidth = 1.5;
      data.edges.forEach(function(e) {
        ctx.beginPath();
        ctx.moveTo(projected[e[0]].x, projected[e[0]].y);
        ctx.lineTo(projected[e[1]].x, projected[e[1]].y);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    // draw vertices
    if (solid.type !== 'sphere') {
      projected.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.vertex;
        ctx.fill();
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // update info
    var elV = document.getElementById('infoV');
    var elE = document.getElementById('infoE');
    var elF = document.getElementById('infoF');
    var elEuler = document.getElementById('infoEuler');
    var elVol = document.getElementById('infoVol');
    var elSA = document.getElementById('infoSA');
    if (elV) elV.textContent = data.V;
    if (elE) elE.textContent = data.E;
    if (elF) elF.textContent = data.F;
    if (elEuler) elEuler.textContent = (data.V - data.E + data.F);
    if (elVol) elVol.textContent = data.vol.toFixed(3);
    if (elSA) elSA.textContent = data.sa.toFixed(3);
  }

  function solidAnimate() {
    drawSolidScene();
    solid.animId = requestAnimationFrame(solidAnimate);
  }

  function buildSolidControls(type) {
    var area = document.getElementById('solidCtrlArea');
    if (!area) return;
    area.innerHTML = '';

    var controlsDef = {
      cube: [{ label: '\u8fb9\u957f a', key: 'a', min: 1, max: 5, step: 0.1, def: 2 }],
      cuboid: [
        { label: '\u957f a', key: 'a', min: 1, max: 5, step: 0.1, def: 3 },
        { label: '\u5bbd b', key: 'b', min: 1, max: 5, step: 0.1, def: 2 },
        { label: '\u9ad8 c', key: 'c', min: 1, max: 5, step: 0.1, def: 1.5 }
      ],
      tetra: [
        { label: '\u5e95\u9762\u8fb9\u957f a', key: 'a', min: 1, max: 5, step: 0.1, def: 2.5 },
        { label: '\u9ad8 h', key: 'h', min: 1, max: 5, step: 0.1, def: 3 }
      ],
      pyramid: [
        { label: '\u5e95\u9762\u8fb9\u957f a', key: 'a', min: 1, max: 5, step: 0.1, def: 2 },
        { label: '\u9ad8 h', key: 'h', min: 1, max: 5, step: 0.1, def: 3 }
      ],
      hexpyramid: [
        { label: '\u5e95\u9762\u8fb9\u957f a', key: 'a', min: 0.5, max: 4, step: 0.1, def: 1.5 },
        { label: '\u9ad8 h', key: 'h', min: 0.5, max: 4, step: 0.1, def: 3 }
      ],
      sphere: [{ label: '\u534a\u5f84 r', key: 'r', min: 0.5, max: 4, step: 0.1, def: 2 }]
    };

    var defs = controlsDef[type] || [];
    solid.params = {};
    defs.forEach(function(d) {
      solid.params[d.key] = d.def;

      var group = document.createElement('div');
      group.className = 'control-group';
      var label = document.createElement('label');
      label.textContent = d.label + ': ';
      var valSpan = document.createElement('span');
      valSpan.className = 'value';
      valSpan.textContent = d.def;
      label.appendChild(valSpan);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = d.min;
      input.max = d.max;
      input.step = d.step;
      input.value = d.def;
      input.addEventListener('input', function() {
        solid.params[d.key] = parseFloat(input.value);
        valSpan.textContent = parseFloat(input.value).toFixed(1);
      });
      group.appendChild(label);
      group.appendChild(input);
      area.appendChild(group);
    });
  }

  function initSolid() {
    solid.canvas = document.getElementById('solidCanvas');
    if (!solid.canvas) return;
    var info = setupCanvas(solid.canvas);
    solid.ctx = info.ctx;
    solid.w = info.w;
    solid.h = info.h;

    // type buttons
    var typeGroup = document.getElementById('solidTypeGroup');
    if (typeGroup) {
      typeGroup.addEventListener('click', function(e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        typeGroup.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        solid.type = btn.dataset.solid || 'cube';
        buildSolidControls(solid.type);
        drawSolidScene();
      });
    }

    buildSolidControls(solid.type);

    // mouse drag
    solid.canvas.addEventListener('mousedown', function(e) {
      solid.dragging = true;
      solid.lastMX = e.clientX;
      solid.lastMY = e.clientY;
    });
    window.addEventListener('mousemove', function(e) {
      if (!solid.dragging) return;
      var dx = e.clientX - solid.lastMX;
      var dy = e.clientY - solid.lastMY;
      solid.rotY += dx * 0.01;
      solid.rotX += dy * 0.01;
      solid.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, solid.rotX));
      solid.lastMX = e.clientX;
      solid.lastMY = e.clientY;
    });
    window.addEventListener('mouseup', function() { solid.dragging = false; });

    solid.animId = requestAnimationFrame(solidAnimate);
  }

  // ==================== Section 3: 体积与表面积 ====================
  var vol = {
    type: 'vcube',
    params: { a: 2, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 },
    chart: null
  };

  function volFormula(type, p) {
    var a, b, c, r, h, R, r2, l;
    switch (type) {
      case 'vcube':
        a = p.a; return 'V = a&sup3; = ' + a.toFixed(1) + '&sup3; = ' + (a * a * a).toFixed(2) + ' , S = 6a&sup2; = 6\u00d7' + a.toFixed(1) + '&sup2; = ' + (6 * a * a).toFixed(2);
      case 'vcuboid':
        a = p.a; b = p.b; c = p.c;
        return 'V = abc = ' + a.toFixed(1) + '\u00d7' + b.toFixed(1) + '\u00d7' + c.toFixed(1) + ' = ' + (a * b * c).toFixed(2) +
          ' , S = 2(ab+bc+ac) = 2(' + (a * b).toFixed(1) + '+' + (b * c).toFixed(1) + '+' + (a * c).toFixed(1) + ') = ' + (2 * (a * b + b * c + a * c)).toFixed(2);
      case 'vcylinder':
        r = p.r; h = p.h;
        return 'V = &pi;r&sup2;h = &pi;\u00d7' + r.toFixed(1) + '&sup2;\u00d7' + h.toFixed(1) + ' = ' + (Math.PI * r * r * h).toFixed(2) +
          ' , S = 2&pi;r(r+h) = 2&pi;\u00d7' + r.toFixed(1) + '\u00d7(' + r.toFixed(1) + '+' + h.toFixed(1) + ') = ' + (2 * Math.PI * r * (r + h)).toFixed(2);
      case 'vcone':
        r = p.r; h = p.h; l = Math.sqrt(r * r + h * h);
        return 'V = \u2153&pi;r&sup2;h = \u2153&pi;\u00d7' + r.toFixed(1) + '&sup2;\u00d7' + h.toFixed(1) + ' = ' + (1 / 3 * Math.PI * r * r * h).toFixed(2) +
          ' , S = &pi;r(r+l) = &pi;\u00d7' + r.toFixed(1) + '\u00d7(' + r.toFixed(1) + '+' + l.toFixed(2) + ') = ' + (Math.PI * r * (r + l)).toFixed(2);
      case 'vsphere':
        r = p.r;
        return 'V = \u2074\u2044\u2083&pi;r&sup3; = \u2074\u2044\u2083&pi;\u00d7' + r.toFixed(1) + '&sup3; = ' + (4 / 3 * Math.PI * r * r * r).toFixed(2) +
          ' , S = 4&pi;r&sup2; = 4&pi;\u00d7' + r.toFixed(1) + '&sup2; = ' + (4 * Math.PI * r * r).toFixed(2);
      case 'vfrustum':
        R = p.R; r2 = p.r2; h = p.h; l = Math.sqrt(h * h + (R - r2) * (R - r2));
        return 'V = \u2153&pi;h(R&sup2;+Rr+r&sup2;) = \u2153&pi;\u00d7' + h.toFixed(1) + '\u00d7(' + R.toFixed(1) + '&sup2;+' + R.toFixed(1) + '\u00d7' + r2.toFixed(1) + '+' + r2.toFixed(1) + '&sup2;) = ' + (1 / 3 * Math.PI * h * (R * R + R * r2 + r2 * r2)).toFixed(2) +
          ' , S = &pi;(R&sup2;+r&sup2;+Rl+rl) = ' + (Math.PI * (R * R + r2 * r2 + R * l + r2 * l)).toFixed(2);
    }
    return '';
  }

  function calcVol(type, p) {
    switch (type) {
      case 'vcube': return p.a * p.a * p.a;
      case 'vcuboid': return p.a * p.b * p.c;
      case 'vcylinder': return Math.PI * p.r * p.r * p.h;
      case 'vcone': return (1 / 3) * Math.PI * p.r * p.r * p.h;
      case 'vsphere': return (4 / 3) * Math.PI * p.r * p.r * p.r;
      case 'vfrustum': return (1 / 3) * Math.PI * p.h * (p.R * p.R + p.R * p.r2 + p.r2 * p.r2);
    }
    return 0;
  }

  function calcSA(type, p) {
    switch (type) {
      case 'vcube': return 6 * p.a * p.a;
      case 'vcuboid': return 2 * (p.a * p.b + p.b * p.c + p.a * p.c);
      case 'vcylinder': return 2 * Math.PI * p.r * (p.r + p.h);
      case 'vcone': return Math.PI * p.r * (p.r + Math.sqrt(p.r * p.r + p.h * p.h));
      case 'vsphere': return 4 * Math.PI * p.r * p.r;
      case 'vfrustum':
        var l = Math.sqrt(p.h * p.h + (p.R - p.r2) * (p.R - p.r2));
        return Math.PI * (p.R * p.R + p.r2 * p.r2 + p.R * l + p.r2 * l);
    }
    return 0;
  }

  function buildVolControls(type) {
    var area = document.getElementById('volCtrlArea');
    if (!area) return;
    area.innerHTML = '';

    var controlsDef = {
      vcube: [{ label: '\u8fb9\u957f a', key: 'a', min: 1, max: 10, step: 0.5, def: 2 }],
      vcuboid: [
        { label: '\u957f a', key: 'a', min: 1, max: 10, step: 0.5, def: 3 },
        { label: '\u5bbd b', key: 'b', min: 1, max: 10, step: 0.5, def: 2 },
        { label: '\u9ad8 c', key: 'c', min: 1, max: 10, step: 0.5, def: 2 }
      ],
      vcylinder: [
        { label: '\u5e95\u9762\u534a\u5f84 r', key: 'r', min: 0.5, max: 5, step: 0.1, def: 1.5 },
        { label: '\u9ad8 h', key: 'h', min: 1, max: 10, step: 0.5, def: 3 }
      ],
      vcone: [
        { label: '\u5e95\u9762\u534a\u5f84 r', key: 'r', min: 0.5, max: 5, step: 0.1, def: 1.5 },
        { label: '\u9ad8 h', key: 'h', min: 1, max: 10, step: 0.5, def: 3 }
      ],
      vsphere: [{ label: '\u534a\u5f84 r', key: 'r', min: 0.5, max: 5, step: 0.1, def: 1.5 }],
      vfrustum: [
        { label: '\u4e0b\u5e95\u534a\u5f84 R', key: 'R', min: 1, max: 5, step: 0.1, def: 2 },
        { label: '\u4e0a\u5e95\u534a\u5f84 r', key: 'r2', min: 0.5, max: 4, step: 0.1, def: 1 },
        { label: '\u9ad8 h', key: 'h', min: 1, max: 10, step: 0.5, def: 3 }
      ]
    };

    var defs = controlsDef[type] || [];
    defs.forEach(function(d) {
      vol.params[d.key] = d.def;

      var group = document.createElement('div');
      group.className = 'control-group';
      var label = document.createElement('label');
      label.textContent = d.label + ': ';
      var valSpan = document.createElement('span');
      valSpan.className = 'value';
      valSpan.textContent = d.def;
      label.appendChild(valSpan);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = d.min;
      input.max = d.max;
      input.step = d.step;
      input.value = d.def;
      input.addEventListener('input', function() {
        vol.params[d.key] = parseFloat(input.value);
        valSpan.textContent = parseFloat(input.value).toFixed(1);
        updateVolInfo();
      });
      group.appendChild(label);
      group.appendChild(input);
      area.appendChild(group);
    });
  }

  function updateVolInfo() {
    var formulaEl = document.getElementById('volFormula');
    var volEl = document.getElementById('infoVolCalc');
    var saEl = document.getElementById('infoSACalc');

    if (formulaEl) formulaEl.innerHTML = volFormula(vol.type, vol.params);
    if (volEl) volEl.textContent = calcVol(vol.type, vol.params).toFixed(3);
    if (saEl) saEl.textContent = calcSA(vol.type, vol.params).toFixed(3);

    updateVolChart();
  }

  function updateVolChart() {
    if (!vol.chart) return;
    var types = ['vcube', 'vcuboid', 'vcylinder', 'vcone', 'vsphere', 'vfrustum'];
    var names = ['\u6b63\u65b9\u4f53', '\u957f\u65b9\u4f53', '\u5706\u67f1', '\u5706\u9525', '\u7403', '\u5706\u53f0'];
    var defaultParams = {
      vcube: { a: 2, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 },
      vcuboid: { a: 3, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 },
      vcylinder: { a: 2, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 },
      vcone: { a: 2, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 },
      vsphere: { a: 2, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 },
      vfrustum: { a: 2, b: 2, c: 2, r: 1.5, h: 3, R: 2, r2: 1 }
    };

    var p = vol.params;
    var dataArr = types.map(function(t) {
      var tp = (t === vol.type) ? p : defaultParams[t];
      return { value: parseFloat(calcVol(t, tp).toFixed(3)), itemStyle: { color: t === vol.type ? COLORS.barColors[types.indexOf(t)] : 'rgba(148,163,184,0.35)' } };
    });

    vol.chart.setOption({
      yAxis: { data: names },
      series: [{ data: dataArr }]
    });
  }

  function initVolume() {
    var dom = document.getElementById('chartVolume');
    if (!dom) return;

    if (vol.chart) vol.chart.dispose();
    vol.chart = echarts.init(dom, null, { renderer: 'svg' });

    var names = ['\u6b63\u65b9\u4f53', '\u957f\u65b9\u4f53', '\u5706\u67f1', '\u5706\u9525', '\u7403', '\u5706\u53f0'];

    vol.chart.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Outfit, sans-serif' },
      tooltip: tooltipStyle(),
      grid: { left: 80, right: 40, top: 20, bottom: 30 },
      xAxis: Object.assign({ type: 'value', name: 'V' }, axisStyle()),
      yAxis: Object.assign({ type: 'category', data: names, inverse: false }, axisStyle()),
      series: [{
        type: 'bar',
        data: names.map(function(n, i) { return { value: 0, itemStyle: { color: COLORS.barColors[i] } }; }),
        barMaxWidth: 28,
        label: { show: true, position: 'right', color: '#4A3B2E', fontSize: 10, fontFamily: 'JetBrainsMono, monospace' }
      }]
    });

    // type buttons
    var typeGroup = document.getElementById('volTypeGroup');
    if (typeGroup) {
      typeGroup.addEventListener('click', function(e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        typeGroup.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        vol.type = btn.dataset.vol || 'vcube';
        buildVolControls(vol.type);
        updateVolInfo();
      });
    }

    buildVolControls(vol.type);
    updateVolInfo();
  }

  // ==================== 初始化与 resize ====================
  function initAll() {
    initRotation();
    initSolid();
    initVolume();
  }

  function resizeAll() {
    // Section 1
    if (rot.canvas) {
      var info1 = setupCanvas(rot.canvas);
      rot.ctx = info1.ctx;
      rot.w = info1.w;
      rot.h = info1.h;
      drawRotationScene();
    }
    // Section 2
    if (solid.canvas) {
      var info2 = setupCanvas(solid.canvas);
      solid.ctx = info2.ctx;
      solid.w = info2.w;
      solid.h = info2.h;
      drawSolidScene();
    }
    // Section 3 ECharts
    if (vol.chart) {
      vol.chart.resize();
    }
  }

  document.addEventListener('DOMContentLoaded', initAll);
  window.addEventListener('resize', resizeAll);
})();
