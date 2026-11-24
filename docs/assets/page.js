/* Applied machine learning labs: polynomial model order, gradient descent and K-means, computed in the browser. */
(function () {
  'use strict';
  var K = window.K, $ = K.$, $$ = K.$$, f = K.fmt;
  var S = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
  var kv = function (k, v, sub) { return '<div><span class="k">' + k + '</span><span class="v">' + v + (sub ? ' <small>' + sub + '</small>' : '') + '</span></div>'; };
  var val = function (id) { return +$('#' + id).value; };
  var wire = function (map, fn) {
    Object.keys(map).forEach(function (id) {
      var el = $('#' + id), o = $('#' + id + 'O'), upd = function () { if (o && map[id]) o.textContent = map[id](+el.value); };
      upd(); el.addEventListener('input', function () { upd(); fn(id); });
    });
  };
  var nf = function (v) { if (!isFinite(v)) return '–'; var a = Math.abs(v); return a >= 1e4 ? K.compact(v) : a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2); };
  var lg = function (v) { return Math.log(Math.max(v, 1e-12)) / Math.LN10; };
  var logAxis = function (vals, label) {
    var lo = Math.floor(Math.min.apply(null, vals)), hi = Math.ceil(Math.max.apply(null, vals)); if (hi === lo) hi = lo + 1;
    var t = []; for (var i = lo; i <= hi; i++) t.push(i);
    return { min: lo, max: hi, ticks: t, label: label, fmt: function (v) { return K.compact(Math.pow(10, v)); }, tfmt: function (v) { return nf(Math.pow(10, v)); } };
  };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- results in the hero */
  K.hbars($('#heroRes'), {
    items: [['Neural network · MNIST test', 0.976], ['K-means, K = 256 · MNIST', 0.8871], ['Random forest · CAD parts', 0.81], ['Random forest · Titanic', 0.78], ['Keras network · diabetes', 0.649]].map(function (r) { return { label: r[0], value: r[1], color: 'var(--acc)' }; }),
    min: 0, max: 1, rowH: 42, fmt: function (v) { return K.pct(v, 1); }, aria: 'Accuracy reached in each notebook'
  });

  /* ---------------------------------------------------------------- polynomial model order */
  var pSeed = 1;
  var truth = function (x) { return 2 * x + 11 * x * x + 3 * x * x * x; };
  function gen(n, noise, seed) { var r = K.rng(seed), x = [], y = []; for (var i = 0; i < n; i++) { var v = 30 * (r() - 0.5); x.push(v); y.push(truth(v) + noise * K.randn(r)); } return { x: x, y: y }; }
  function mse(d, p) { var s = 0; for (var i = 0; i < d.x.length; i++) { var e = d.y[i] - p(d.x[i]); s += e * e; } return s / d.x.length; }
  function order() { var b = $('#pOrder button[aria-pressed="true"]'); return b ? +b.dataset.m : 3; }
  function poly() {
    var m = order(), noise = val('pNoise'), n = val('pN'), tr = gen(n, noise, pSeed), te = gen(400, noise, pSeed + 7919);
    var fits = [], trE = [], teE = [];
    for (var o = 1; o <= 8; o++) { fits[o] = K.polyfit(tr.x, tr.y, o); trE.push([o, lg(mse(tr, fits[o]))]); teE.push([o, lg(mse(te, fits[o]))]); }
    var curve = [], tc = []; for (var i = 0; i <= 200; i++) { var x = -15 + 30 * i / 200; curve.push([x, fits[m](x)]); tc.push([x, truth(x)]); }
    var ys = tr.y.concat(tc.map(function (p) { return p[1]; })), ylo = Math.min.apply(null, ys), yhi = Math.max.apply(null, ys), pad = (yhi - ylo) * 0.12;
    K.chart($('#pFit'), {
      height: 300, aria: 'Training samples, the true cubic and the order ' + m + ' fit',
      x: { min: -15, max: 15, label: 'x', fmt: function (v) { return String(Math.round(v)); }, tfmt: function (v) { return v.toFixed(2); } },
      y: { min: ylo - pad, max: yhi + pad, fmt: K.compact, tfmt: nf },
      series: [
        { type: 'dots', name: 'Training samples', color: 'var(--ink-3)', data: tr.x.map(function (x, i) { return [x, tr.y[i]]; }), r: 3.5 },
        { type: 'line', name: 'True cubic', color: 'var(--ink-2)', data: tc, dash: '5 4', width: 1.5 },
        { type: 'line', name: 'Order ' + m + ' fit', color: 'var(--acc)', data: curve, width: 2.5 }
      ]
    });
    var all = trE.concat(teE).map(function (p) { return p[1]; });
    K.chart($('#pMse'), {
      height: 300, aria: 'Mean squared error against polynomial order',
      x: { min: 0.6, max: 8.4, ticks: [1, 2, 3, 4, 5, 6, 7, 8], label: 'Order, m', fmt: String, tfmt: function (v) { return 'order ' + Math.round(v); } },
      y: logAxis(all, 'MSE'),
      series: [
        { type: 'line', name: 'Training data', color: S[0], data: trE }, { type: 'dots', color: S[0], data: trE, r: 4 },
        { type: 'line', name: 'New data', color: S[1], data: teE }, { type: 'dots', color: S[1], data: teE, r: 4 },
        { type: 'vline', x: m, color: 'var(--ink-3)', dash: '3 3', width: 1 }
      ],
      snap: Math.round
    });
    var best = teE.reduce(function (a, b) { return b[1] < a[1] ? b : a; })[0];
    $('#pOut').innerHTML = kv('Training MSE', nf(Math.pow(10, trE[m - 1][1]))) + kv('MSE on new data', nf(Math.pow(10, teE[m - 1][1]))) + kv('Best order on new data', best);
  }
  $('#pOrder').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $$('#pOrder button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); poly(); });
  $('#pNew').addEventListener('click', function () { pSeed++; poly(); });
  wire({ pNoise: String, pN: String }, K.debounce(poly, 60));
  poly();

  /* ---------------------------------------------------------------- gradient descent */
  var gSeed = 3;
  // most x between 5 and 10 with a long tail to 22.5, like the notebook's data (city populations, in 10,000s)
  function gdata(noise, seed) { var r = K.rng(seed), x = [], y = []; for (var i = 0; i < 97; i++) { var v = 5 + Math.min(17.5, -3.2 * Math.log(1 - r())); x.push(v); y.push(-3.9 + 1.19 * v + noise * K.randn(r)); } return { x: x, y: y }; }
  function lmse(x, y, w0, w1) { var s = 0; for (var i = 0; i < x.length; i++) { var e = y[i] - w0 - w1 * x[i]; s += e * e; } return s / x.length; }
  function descent() {
    var alpha = +$('#gAlpha').value, iters = val('gIter'), noise = val('gNoise'), d = gdata(noise, gSeed), cut = Math.floor(0.8 * 97);
    var xt = d.x.slice(0, cut), yt = d.y.slice(0, cut), xs = d.x.slice(cut), ys = d.y.slice(cut), n = xt.length, every = Math.max(1, Math.ceil(iters / 300));
    var ne = K.lstsq(xt.map(function (x) { return [1, x]; }), yt), neMse = lmse(xs, ys, ne[0], ne[1]);
    // batch: every step uses all the training points
    var r = K.rng(gSeed + 11), b0 = K.randn(r), b1 = K.randn(r), s0 = K.randn(r), s1 = K.randn(r), bh = [], sh = [], bDiv = false, sDiv = false, it, j;
    for (it = 1; it <= iters; it++) {
      var g0 = 0, g1 = 0;
      for (j = 0; j < n; j++) { var e = yt[j] - b0 - b1 * xt[j]; g0 += -2 * e; g1 += -2 * xt[j] * e; }
      b0 -= alpha * g0 / n; b1 -= alpha * g1 / n;
      var m = lmse(xs, ys, b0, b1);
      if (!isFinite(m) || m > 1e12) { bDiv = true; break; }
      if (it % every === 0 || it === 1) bh.push([it, lg(m)]);
    }
    // stochastic: each epoch makes one update per training point, picked at random
    for (it = 1; it <= iters && !sDiv; it++) {
      for (j = 0; j < n; j++) { var k = Math.floor(r() * n), e2 = yt[k] - s0 - s1 * xt[k]; s0 -= alpha * -2 * e2; s1 -= alpha * -2 * xt[k] * e2; }
      var m2 = lmse(xs, ys, s0, s1);
      if (!isFinite(m2) || m2 > 1e12) { sDiv = true; break; }
      if (it % every === 0 || it === 1) sh.push([it, lg(m2)]);
    }
    var bM = bDiv ? NaN : lmse(xs, ys, b0, b1), sM = sDiv ? NaN : lmse(xs, ys, s0, s1);
    var line = function (w0, w1) { return [[4, w0 + w1 * 4], [23, w0 + w1 * 23]]; };
    var series = [
      { type: 'dots', name: 'Training points', color: 'var(--ink-3)', data: xt.map(function (x, i) { return [x, yt[i]]; }), r: 3.5 },
      { type: 'dots', name: 'Test points', color: S[1], data: xs.map(function (x, i) { return [x, ys[i]]; }), r: 3.5 },
      { type: 'line', name: 'Normal equation', color: 'var(--ink)', data: line(ne[0], ne[1]), dash: '5 4', width: 1.5 }
    ];
    if (!bDiv) series.push({ type: 'line', name: 'Batch GD', color: S[0], data: line(b0, b1), width: 2.5 });
    if (!sDiv) series.push({ type: 'line', name: 'Stochastic GD', color: S[2], data: line(s0, s1), width: 2.5 });
    var yv = d.y, ylo = Math.min.apply(null, yv), yhi = Math.max.apply(null, yv);
    K.chart($('#gFit'), { height: 300, aria: 'Data and the three fitted lines', x: { min: 4, max: 23, label: 'x', fmt: String, tfmt: function (v) { return v.toFixed(1); } }, y: { min: ylo - 3, max: yhi + 3, label: 'y', fmt: nf, tfmt: nf }, series: series, crosshair: false, tip: function (xv, yv, near) { return near && near.s.type === 'dots' ? '<b>' + near.s.name + '</b><div class="r"><span>x, y</span><span>' + near.p[0].toFixed(2) + ', ' + near.p[1].toFixed(2) + '</span></div>' : null; } });
    var vals = bh.concat(sh).map(function (p) { return p[1]; }).concat([lg(neMse)]);
    K.chart($('#gMse'), {
      height: 300, aria: 'Test error during training',
      x: { min: 0, max: iters, label: 'Iteration', fmt: K.compact, tfmt: function (v) { return 'iteration ' + Math.round(v); } },
      y: logAxis(vals, 'Test MSE'),
      series: [{ type: 'line', name: 'Batch GD', color: S[0], data: bh }, { type: 'line', name: 'Stochastic GD', color: S[2], data: sh }, { type: 'hline', y: lg(neMse), name: 'Normal equation', color: 'var(--ink)', dash: '5 4', width: 1.5 }]
    });
    $('#gOut').innerHTML = kv('Normal equation', 'w₀ ' + ne[0].toFixed(2) + ', w₁ ' + ne[1].toFixed(3), 'test MSE ' + nf(neMse)) + kv('Batch GD test MSE', bDiv ? 'diverged' : nf(bM)) + kv('Stochastic GD test MSE', sDiv ? 'diverged' : nf(sM));
    var s;
    if (bDiv || sDiv) s = 'With a learning rate of ' + alpha + ', ' + (bDiv && sDiv ? 'both methods diverge' : (bDiv ? 'batch' : 'stochastic') + ' gradient descent diverges') + ': each step overshoots the minimum and the error grows. Lower the learning rate.';
    else s = 'Batch gradient descent reaches a test MSE of <b>' + nf(bM) + '</b>, stochastic <b>' + nf(sM) + '</b>, and the closed-form normal equation <b>' + nf(neMse) + '</b>. ' + (sM > bM ? 'Single-point updates keep the stochastic weights jumping around the minimum, so they end further from it.' : 'Here the stochastic run happens to finish closer to the minimum.');
    $('#gSay').innerHTML = s + ' On the notebook\'s real data, batch reached 6.6 and stochastic 73.9.';
  }
  $('#gAlpha').addEventListener('change', descent);
  $('#gNew').addEventListener('click', function () { gSeed++; descent(); });
  wire({ gIter: function (v) { return v.toLocaleString('en-US'); }, gNoise: function (v) { return v.toFixed(2); } }, K.debounce(descent, 80));
  descent();

  /* ---------------------------------------------------------------- K-means */
  var CEN = [[1, 1], [5, 5], [1, 6], [6, 1], [3.5, 3.5]];
  var kSeed = 42, start = 0, km = null, timer = null;
  function kdata() { var r = K.rng(kSeed), b = val('kBlobs'), s = val('kSpread'), per = val('kPer'), pts = []; for (var g = 0; g < b; g++) for (var i = 0; i < per; i++) pts.push([CEN[g][0] + s * K.randn(r), CEN[g][1] + s * K.randn(r)]); return pts; }
  function initC(pts, k, r) { var c = pts.slice(); for (var i = c.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = c[i]; c[i] = c[j]; c[j] = t; } return c.slice(0, k).map(function (p) { return p.slice(); }); }
  function d2(a, b) { var x = a[0] - b[0], y = a[1] - b[1]; return x * x + y * y; }
  function assign(pts, cents) { return pts.map(function (p) { var b = 0, bd = Infinity; cents.forEach(function (c, i) { var d = d2(p, c); if (d < bd) { bd = d; b = i; } }); return b; }); }
  function update(pts, as, cents) { return cents.map(function (c, i) { var sx = 0, sy = 0, n = 0; pts.forEach(function (p, j) { if (as[j] === i) { sx += p[0]; sy += p[1]; n++; } }); return n ? [sx / n, sy / n] : c; }); }
  function inertia(pts, as, cents) { var s = 0; pts.forEach(function (p, j) { s += d2(p, cents[as[j]]); }); return s; }
  function kmeans(pts, k, r) { var c = initC(pts, k, r), a = null; for (var it = 0; it < 100; it++) { var na = assign(pts, c); var same = a && na.every(function (v, i) { return v === a[i]; }); a = na; c = update(pts, a, c); if (same) break; } return inertia(pts, a, c); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } $('#kRun').disabled = false; }
  function reset(newData) {
    stop();
    var fresh = newData || !km, pts = fresh ? kdata() : km.pts, keep = fresh ? null : km.elbow, r = K.rng(kSeed * 31 + start);
    km = { pts: pts, cents: initC(pts, val('kK'), r), as: null, iter: 0, done: false, inertia: NaN, elbow: keep };
    drawK(); if (!km.elbow) elbow(); else drawElbow();
  }
  function step() {
    if (km.done) return;
    var na = assign(km.pts, km.cents), same = km.as && na.every(function (v, i) { return v === km.as[i]; });
    km.as = na; km.cents = update(km.pts, na, km.cents); km.iter++; km.inertia = inertia(km.pts, na, km.cents);
    if (same) { km.done = true; stop(); }
    drawK();
  }
  function drawK() {
    var pts = km.pts, k = km.cents.length, series = [];
    if (!km.as) series.push({ type: 'dots', name: 'Points', color: 'var(--ink-3)', data: pts, r: 3, ring: false, opacity: 0.8 });
    else for (var c = 0; c < k; c++) series.push({ type: 'dots', name: 'Cluster ' + (c + 1), color: S[c], data: pts.filter(function (p, j) { return km.as[j] === c; }), r: 3, ring: false, opacity: 0.85 });
    series.push({ type: 'dots', name: 'Centroids', color: 'var(--ink)', data: km.cents, r: 7 });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    K.chart($('#kPlot'), {
      height: 340, equal: true, crosshair: false, aria: 'Points coloured by cluster, with the centroids',
      x: { min: Math.floor(Math.min.apply(null, xs)) - 0.5, max: Math.ceil(Math.max.apply(null, xs)) + 0.5, label: 'Feature 1', fmt: String },
      y: { min: Math.floor(Math.min.apply(null, ys)) - 0.5, max: Math.ceil(Math.max.apply(null, ys)) + 0.5, label: 'Feature 2', fmt: String },
      series: series,
      labels: km.cents.map(function (c, i) { return { x: c[0], y: c[1], dy: -12, text: 'C' + (i + 1) }; }),
      tip: function (xv, yv, near) { if (!near) return null; return '<b>' + near.s.name + '</b><div class="r"><span>Position</span><span>' + near.p[0].toFixed(2) + ', ' + near.p[1].toFixed(2) + '</span></div>'; }
    });
    $('#kOut').innerHTML = kv('Iteration', km.iter) + kv('Inertia', isFinite(km.inertia) ? f(km.inertia, 1) : '–') + kv('Status', km.done ? 'Converged' : km.as ? 'Moving' : 'Centroids picked');
    $('#kStep').disabled = km.done;
  }
  function elbow() {
    var pts = km.pts, out = [];
    for (var k = 1; k <= 8; k++) { var best = Infinity; for (var t = 0; t < 5; t++) best = Math.min(best, kmeans(pts, k, K.rng(1000 * k + t))); out.push([k, best]); }
    km.elbow = out; drawElbow();
  }
  function drawElbow() {
    K.chart($('#kElbow'), {
      height: 300, aria: 'Inertia against the number of clusters',
      x: { min: 0.6, max: 8.4, ticks: [1, 2, 3, 4, 5, 6, 7, 8], label: 'Clusters, K', fmt: String, tfmt: function (v) { return 'K = ' + Math.round(v); } },
      y: { min: 0, label: 'Inertia', fmt: K.compact, tfmt: function (v) { return f(v, 1); } },
      series: [{ type: 'line', name: 'Inertia', color: 'var(--acc)', data: km.elbow }, { type: 'dots', color: 'var(--acc)', data: km.elbow, r: 4.5 }, { type: 'vline', x: val('kK'), color: 'var(--ink-3)', dash: '3 3', width: 1, label: 'K now' }],
      legend: false, snap: Math.round
    });
  }
  $('#kStep').addEventListener('click', step);
  $('#kRun').addEventListener('click', function () {
    if (km.done) reset(false);
    if (reduced) { while (!km.done && km.iter < 100) step(); return; }
    $('#kRun').disabled = true; step();
    timer = setInterval(function () { if (km.done || km.iter >= 100) stop(); else step(); }, 450);
  });
  $('#kInit').addEventListener('click', function () { start++; reset(false); });
  wire({ kBlobs: String, kSpread: function (v) { return v.toFixed(1); }, kPer: String, kK: String }, K.debounce(function (id) { if (id === 'kK') { reset(false); drawElbow(); } else reset(true); }, 120));
  reset(true);

  K.hbars($('#kMnist'), {
    items: [[10, 0.5240], [16, 0.6388], [64, 0.8031], [256, 0.8871]].map(function (r) { return { label: 'K = ' + r[0], value: r[1], color: 'var(--acc)' }; }),
    min: 0, max: 1, rowH: 40, fmt: function (v) { return K.pct(v, 1); }, aria: 'Labelling accuracy of Mini-Batch K-means on MNIST for each K'
  });
})();
