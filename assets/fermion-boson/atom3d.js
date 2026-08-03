/* 氯原子 3D 概率电子云模型
 * 原理：对氯原子 (Z=17) 各轨道按氢样径向波函数 |R_nl|² · r² 做拒绝采样，
 *       角向按 |Y_l^m|² 采样，得到电子出现的概率分布点云。
 * 交互：按住拖动旋转，滑杆缩放，空闲时缓慢自转。
 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return;
  var container = document.getElementById('clStage');
  var zoomInput = document.getElementById('clZoom');
  if (!container) return;

  /* ================= 基础场景 ================= */
  var W = container.clientWidth, H = container.clientHeight;
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);

  var atom = new THREE.Group();
  scene.add(atom);

  /* ================= 写实光照 ================= */
  scene.add(new THREE.AmbientLight(0x8899cc, 0.55));
  var keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);
  var rimBlue = new THREE.PointLight(0x35a0ff, 1.2, 40);
  rimBlue.position.set(-6, 3, -4);
  scene.add(rimBlue);
  var rimRed = new THREE.PointLight(0xe62429, 0.9, 30);
  rimRed.position.set(5, -4, -3);
  scene.add(rimRed);
  var coreGlow = new THREE.PointLight(0xffd0a0, 1.4, 6);
  atom.add(coreGlow);

  /* ================= 原子核：17 质子 + 18 中子 ================= */
  var nucGroup = new THREE.Group();
  var nucGeo = new THREE.SphereGeometry(0.06, 18, 18);
  var protonMat = new THREE.MeshStandardMaterial({ color: 0xe62429, roughness: 0.28, metalness: 0.2, emissive: 0x550000 });
  var neutronMat = new THREE.MeshStandardMaterial({ color: 0xe9edf8, roughness: 0.42, metalness: 0.08 });
  var i, v;
  for (i = 0; i < 35; i++) {
    var m = new THREE.Mesh(nucGeo, i < 17 ? protonMat : neutronMat);
    v = new THREE.Vector3();
    do { v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1); } while (v.lengthSq() > 1);
    v.multiplyScalar(0.155);
    m.position.copy(v);
    nucGroup.add(m);
  }
  atom.add(nucGroup);

  /* ================= 电子云采样（氢样轨道近似） ================= */
  function radialR(n, l, rho) {
    if (n === 1) return Math.exp(-rho);
    if (n === 2 && l === 0) return (2 - rho) * Math.exp(-rho / 2);
    if (n === 2 && l === 1) return rho * Math.exp(-rho / 2);
    if (n === 3 && l === 0) return (27 - 18 * rho + 2 * rho * rho) * Math.exp(-rho / 3);
    if (n === 3 && l === 1) return rho * (6 - rho) * Math.exp(-rho / 3);
    return 0;
  }
  function findMaxP(n, l, rmax) {
    var max = 0;
    for (var k = 0; k <= 800; k++) {
      var rho = rmax * k / 800;
      var R = radialR(n, l, rho);
      var P = rho * rho * R * R;
      if (P > max) max = P;
    }
    return max;
  }
  function sampleRho(n, l, rmax, pmax) {
    for (;;) {
      var rho = Math.random() * rmax;
      var R = radialR(n, l, rho);
      if (Math.random() * pmax < rho * rho * R * R) return rho;
    }
  }
  function sampleDir(l, axis) {
    for (;;) {
      var u = Math.random() * 2 - 1;               // cosθ
      var phi = Math.random() * Math.PI * 2;
      var s = Math.sqrt(Math.max(0, 1 - u * u));
      var x = s * Math.cos(phi), y = s * Math.sin(phi), z = u, w = 1;
      if (l === 1) {
        if (axis === 0) w = x * x;                 // px
        else if (axis === 1) w = y * y;            // py
        else w = z * z;                            // pz
      }
      if (Math.random() < w) return [x, y, z];
    }
  }

  // 氯原子壳层（Slater 屏蔽近似 Z_eff；count 为每个轨道的采样点数）
  var SHELLS = [
    { n: 1, l: 0, axes: [-1], zEff: 16.7, count: 1500, rmax: 14, color: new THREE.Color(0xff5566) }, // 1s²  红
    { n: 2, l: 0, axes: [-1], zEff: 12.85, count: 1500, rmax: 20, color: new THREE.Color(0xffb020) }, // 2s²  橙
    { n: 2, l: 1, axes: [0, 1, 2], zEff: 12.85, count: 1700, rmax: 20, color: new THREE.Color(0x3fa8ff) }, // 2p⁶ 蓝
    { n: 3, l: 0, axes: [-1], zEff: 6.1, count: 1500, rmax: 30, color: new THREE.Color(0x2fe08c) },  // 3s²  绿
    { n: 3, l: 1, axes: [0, 1, 2], zEff: 6.1, count: 1600, rmax: 30, color: new THREE.Color(0xb07cff) }  // 3p⁵ 紫
  ];

  var positions = [], colors = [];
  SHELLS.forEach(function (sh) {
    var pmax = findMaxP(sh.n, sh.l, sh.rmax);
    sh.axes.forEach(function (ax) {
      for (var k = 0; k < sh.count; k++) {
        var rho = sampleRho(sh.n, sh.l, sh.rmax, pmax);
        var r = rho / sh.zEff;                       // 物理半径（玻尔半径单位）
        var rvis = 3.0 * Math.pow(r, 0.6);           // 显示映射：压缩内外层差距
        var d = sampleDir(sh.l, ax);
        positions.push(d[0] * rvis, d[1] * rvis, d[2] * rvis);
        var b = 0.45 + 0.55 * Math.random();         // 明度抖动，增强体积感
        colors.push(sh.color.r * b, sh.color.g * b, sh.color.b * b);
      }
    });
  });

  var cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  cloudGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  var cloudMat = new THREE.PointsMaterial({
    size: 0.028, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  var cloud = new THREE.Points(cloudGeo, cloudMat);
  atom.add(cloud);

  /* ================= 交互：拖拽旋转 + 滑杆缩放 ================= */
  var rotX = 0.25, rotY = 0.6, dragging = false, lastX = 0, lastY = 0;
  var el = container; // 事件绑定在容器上，避免被覆盖层拦截

  function onDown(x, y) { dragging = true; lastX = x; lastY = y; }
  function onMove(x, y) {
    if (!dragging) return;
    rotY += (x - lastX) * 0.006;
    rotX += (y - lastY) * 0.006;
    rotX = Math.max(-1.4, Math.min(1.4, rotX));
    lastX = x; lastY = y;
  }
  function onUp() { dragging = false; }

  el.addEventListener('mousedown', function (e) { onDown(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', onUp);
  el.addEventListener('touchstart', function (e) { var t = e.touches[0]; onDown(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  el.addEventListener('touchmove', function (e) { var t = e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  el.addEventListener('touchend', onUp);

  var dist = 9, targetDist = 9;
  if (zoomInput) {
    zoomInput.addEventListener('input', function () {
      targetDist = 900 / parseFloat(zoomInput.value); // 100% → 9，最大放大至 ~3.6
    });
  }

  /* ================= 渲染循环 ================= */
  var t0 = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    var t = (performance.now() - t0) / 1000;
    if (!dragging) rotY += 0.0022;                  // 空闲缓慢自转
    atom.rotation.x += (rotX - atom.rotation.x) * 0.12;
    atom.rotation.y += (rotY - atom.rotation.y) * 0.12;
    dist += (targetDist - dist) * 0.1;
    camera.position.set(0, 0.6 * (dist / 9), dist);
    camera.lookAt(0, 0, 0);
    var pulse = 1 + 0.045 * Math.sin(t * 3.2);      // 原子核轻微脉动
    nucGroup.scale.set(pulse, pulse, pulse);
    coreGlow.intensity = 1.2 + 0.5 * Math.sin(t * 3.2);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function () {
    var w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
