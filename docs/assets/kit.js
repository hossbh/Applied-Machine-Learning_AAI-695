/* Project pages kit: theme, navigation, seeded random numbers, a little statistics, and small SVG charts.
   Shared by the four project pages; each page adds its own script after this one. No dependencies. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var K = (window.K = {});

  /* ------------------------------------------------------------ helpers */
  K.$ = function (s, r) { return (r || d).querySelector(s); };
  K.$$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  K.clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  K.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  K.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  K.fmt = function (v, dp) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    dp = dp === undefined ? 2 : dp;
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  };
  K.pct = function (v, dp) { return K.fmt(v * 100, dp === undefined ? 1 : dp) + ' %'; };
  K.compact = function (v) {
    var a = Math.abs(v);
    if (a >= 1e9) return K.trim(v / 1e9) + 'B';
    if (a >= 1e6) return K.trim(v / 1e6) + 'M';
    if (a >= 1e4) return K.trim(v / 1e3) + 'K';
    return K.trim(v);
  };
  K.trim = function (v) { var s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v === 0 ? '0' : v.toPrecision(3); return String(+s); };
  K.rangeFill = function (inp) { var p = (inp.value - inp.min) / (inp.max - inp.min) * 100; inp.style.setProperty('--p', p + '%'); };

  /* ------------------------------------------------------------ random numbers: seeded, so a result can be repeated */
  K.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  K.randn = function (r) { var u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  // triangular(min, mode, max)
  K.tri = function (r, a, c, b) {
    if (b <= a) return a;
    var u = r(), f = (c - a) / (b - a);
    return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
  };

  /* ------------------------------------------------------------ linear algebra and least squares */
  K.solve = function (A, b) {
    var n = b.length, M = A.map(function (r, i) { return r.slice().concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-300) return null;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (r = 0; r < n; r++) {
        if (r === c) continue;
        var f = M[r][c] / M[c][c];
        for (var k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map(function (r, i) { return r[n] / r[i]; });
  };
  // rows: the features of each observation (include a 1 for the intercept); returns the coefficients
  K.lstsq = function (rows, y) {
    var p = rows[0].length, A = [], b = [], i, j, k;
    for (i = 0; i < p; i++) { A.push(new Array(p).fill(0)); b.push(0); }
    for (k = 0; k < rows.length; k++) for (i = 0; i < p; i++) { b[i] += rows[k][i] * y[k]; for (j = 0; j < p; j++) A[i][j] += rows[k][i] * rows[k][j]; }
    return K.solve(A, b);
  };
  K.r2 = function (y, yh) {
    var m = y.reduce(function (s, v) { return s + v; }, 0) / y.length, sr = 0, st = 0;
    for (var i = 0; i < y.length; i++) { sr += (y[i] - yh[i]) * (y[i] - yh[i]); st += (y[i] - m) * (y[i] - m); }
    return st > 0 ? 1 - sr / st : 1;
  };
  // polynomial of order m by least squares, with x scaled to [-1, 1] so high orders stay well conditioned
  K.polyfit = function (x, y, m) {
    var s = Math.max.apply(null, x.map(Math.abs)) || 1;
    var rows = x.map(function (v) { var r = [], t = 1; for (var i = 0; i <= m; i++) { r.push(t); t *= v / s; } return r; });
    var c = K.lstsq(rows, y);
    return function (v) { if (!c) return NaN; var t = 1, out = 0; for (var i = 0; i <= m; i++) { out += c[i] * t; t *= v / s; } return out; };
  };
  K.mean = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
  K.variance = function (a) { var m = K.mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return s / (a.length - 1); };
  K.quantile = function (sorted, q) { var p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); };

  /* ------------------------------------------------------------ distributions */
  var LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  K.lgamma = function (x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - K.lgamma(1 - x);
    x -= 1; var a = 0.99999999999980993, t = x + 7.5;
    for (var i = 0; i < 8; i++) a += LG[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };
  K.erfc = function (x) { // Numerical Recipes erfcc, |error| < 1.2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  };
  K.normCdf = function (x, mu, s) { mu = mu || 0; s = s || 1; return 0.5 * K.erfc(-(x - mu) / (s * Math.SQRT2)); };
  K.normPdf = function (x, mu, s) { mu = mu || 0; s = s || 1; var z = (x - mu) / s; return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI)); };
  K.normInv = function (p) { // Acklam
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      e = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  // regularised lower incomplete gamma P(a, x)
  K.gammaP = function (a, x) {
    if (x <= 0) return 0;
    var gln = K.lgamma(a), n, ap, sum, del;
    if (x < a + 1) {
      ap = a; sum = del = 1 / a;
      for (n = 0; n < 500; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    var b = x + 1 - a, c = 1e300, dd = 1 / b, h = dd, an, i;
    for (i = 1; i < 500; i++) {
      an = -i * (i - a); b += 2; dd = an * dd + b; if (Math.abs(dd) < 1e-300) dd = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; dd = 1 / dd; del = dd * c; h *= del; if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  };
  // regularised incomplete beta I_x(a, b)
  K.betaI = function (a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(K.lgamma(a + b) - K.lgamma(a) - K.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    var cf = function (a, b, x) {
      var qab = a + b, qap = a + 1, qam = a - 1, c = 1, dd = 1 - qab * x / qap, m, m2, aa, del, h;
      if (Math.abs(dd) < 1e-300) dd = 1e-300; dd = 1 / dd; h = dd;
      for (m = 1; m <= 300; m++) {
        m2 = 2 * m; aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        dd = 1 + aa * dd; if (Math.abs(dd) < 1e-300) dd = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; dd = 1 / dd; h *= dd * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        dd = 1 + aa * dd; if (Math.abs(dd) < 1e-300) dd = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; dd = 1 / dd; del = dd * c; h *= del;
        if (Math.abs(del - 1) < 1e-14) break;
      }
      return h;
    };
    return x < (a + 1) / (a + b + 2) ? bt * cf(a, b, x) / a : 1 - bt * cf(b, a, 1 - x) / b;
  };
  K.tCdf = function (t, df) { var x = df / (df + t * t), p = 0.5 * K.betaI(df / 2, 0.5, x); return t > 0 ? 1 - p : p; };
  K.chi2Cdf = function (x, k) { return K.gammaP(k / 2, x / 2); };
  K.fCdf = function (x, d1, d2) { return x <= 0 ? 0 : K.betaI(d1 / 2, d2 / 2, d1 * x / (d1 * x + d2)); };
  K.invert = function (cdf, p, lo, hi) { for (var i = 0; i < 200; i++) { var m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  K.tInv = function (p, df) { return K.invert(function (t) { return K.tCdf(t, df); }, p, -1e3, 1e3); };
  K.chi2Inv = function (p, k) { return K.invert(function (x) { return K.chi2Cdf(x, k); }, p, 0, Math.max(1e3, k * 10)); };
  K.poissonPmf = function (k, l) { return l <= 0 ? (k === 0 ? 1 : 0) : Math.exp(k * Math.log(l) - l - K.lgamma(k + 1)); };
  K.poissonCdf = function (k, l) { var s = 0; for (var i = 0; i <= k; i++) s += K.poissonPmf(i, l); return Math.min(1, s); };
  K.binomPmf = function (k, n, p) {
    if (p <= 0) return k === 0 ? 1 : 0; if (p >= 1) return k === n ? 1 : 0;
    return Math.exp(K.lgamma(n + 1) - K.lgamma(k + 1) - K.lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  };
  K.binomCdf = function (k, n, p) { var s = 0; for (var i = 0; i <= k; i++) s += K.binomPmf(i, n, p); return Math.min(1, s); };

  /* ------------------------------------------------------------ charts (SVG, themed by CSS variables) */
  K.ticks = function (min, max, n) {
    var span = max - min; if (!(span > 0)) return [min];
    var step = Math.pow(10, Math.floor(Math.log(span / n) / Math.LN10)), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(min / step - 1e-9) * step;
    for (; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(12));
    return out;
  };
  var niceDom = function (lo, hi, n, pad) {
    if (!(hi > lo)) { hi = lo + 1; lo = lo - 1; }
    if (pad) { var p = (hi - lo) * pad; lo -= p; hi += p; }
    var t = K.ticks(lo, hi, n), step = t.length > 1 ? t[1] - t[0] : 1;
    return [Math.floor(lo / step + 1e-9) * step, Math.ceil(hi / step - 1e-9) * step];
  };
  var col = function (c) { return c || 'var(--acc)'; };
  var extent = function (series, axis) {
    var lo = Infinity, hi = -Infinity, push = function (v) { if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } };
    series.forEach(function (s) {
      if (s.type === 'hline') { if (axis === 'y') push(s.y); return; }
      if (s.type === 'vline') { if (axis === 'x') push(s.x); return; }
      if (s.type === 'bins') { s.data.forEach(function (b) { if (axis === 'x') { push(b[0]); push(b[1]); } else { push(0); push(b[2]); } }); return; }
      if (s.type === 'circle') { if (axis === 'x') { push(s.cx - s.r); push(s.cx + s.r); } else { push(s.cy - s.r); push(s.cy + s.r); } return; }
      (s.data || []).forEach(function (p) { push(axis === 'x' ? p[0] : p[1]); if (s.type === 'cols' && axis === 'y') push(0); });
    });
    return [lo, hi];
  };

  // K.chart(el, spec): x/y chart. spec = { height, x: {min,max,label,fmt,ticks}, y: {...}, series: [...], legend, tip(xv, yv, near), aria, equal }
  // series types: line, area, dots, cols (bars centred on x, width in x units), bins ([x0,x1,y]), hline, vline, circle
  K.chart = function (el, spec) {
    el._spec = spec; el.classList.add('chart');
    if (!el._ro && 'ResizeObserver' in window) {
      var w0 = 0;
      el._ro = new ResizeObserver(function () { var w = el.clientWidth; if (Math.abs(w - w0) > 2) { w0 = w; draw(el); } });
      el._ro.observe(el);
    }
    draw(el);
  };
  var draw = function (el) {
    var s = el._spec, W = Math.max(260, el.clientWidth || 600), H = s.height || 260;
    var xs = s.x || {}, ys = s.y || {};
    var xe = extent(s.series, 'x'), ye = extent(s.series, 'y');
    var xd = [xs.min !== undefined ? xs.min : xe[0], xs.max !== undefined ? xs.max : xe[1]];
    var yd = [ys.min !== undefined ? ys.min : ye[0], ys.max !== undefined ? ys.max : ye[1]];
    if (xs.min === undefined || xs.max === undefined) { var nx = niceDom(xd[0], xd[1], 6, xs.pad); if (xs.min === undefined) xd[0] = nx[0]; if (xs.max === undefined) xd[1] = nx[1]; }
    if (ys.min === undefined || ys.max === undefined) { var ny = niceDom(yd[0], yd[1], 5, ys.pad === undefined ? 0.04 : ys.pad); if (ys.min === undefined) yd[0] = ny[0]; if (ys.max === undefined) yd[1] = ny[1]; }
    var xf = xs.fmt || K.compact, yf = ys.fmt || K.compact;
    var yt = ys.ticks || K.ticks(yd[0], yd[1], H < 200 ? 3 : 5);
    var lw = yt.length ? Math.max.apply(null, yt.map(function (v) { return String(yf(v)).length; })) * 6.8 + 12 : 10;
    var m = { l: lw + (ys.label ? 16 : 0), r: 14, t: 12, b: 28 + (xs.label ? 18 : 0) };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    if (s.equal) { var sx = pw / (xd[1] - xd[0]), sy = ph / (yd[1] - yd[0]), sc = Math.min(sx, sy); pw = sc * (xd[1] - xd[0]); ph = sc * (yd[1] - yd[0]); m.l += ((W - m.l - m.r) - pw) / 2; H = ph + m.t + m.b; }
    var X = function (v) { return m.l + (v - xd[0]) / (xd[1] - xd[0]) * pw; };
    var Y = function (v) { return m.t + ph - (v - yd[0]) / (yd[1] - yd[0]) * ph; };
    var xt = xs.ticks || K.ticks(xd[0], xd[1], Math.max(2, Math.floor(pw / 80)));
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="' + K.esc(s.aria || '') + '"><g class="ax">'];
    yt.forEach(function (v) { var y = Y(v); if (y < m.t - .5 || y > m.t + ph + .5) return; o.push('<line class="gl" x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (m.l - 8) + '" y="' + (y + 3.5) + '" text-anchor="end">' + K.esc(yf(v)) + '</text>'); });
    xt.forEach(function (v) { var x = X(v); if (x < m.l - .5 || x > m.l + pw + .5) return; o.push('<text x="' + x + '" y="' + (m.t + ph + 17) + '" text-anchor="middle">' + K.esc(xf(v)) + '</text>'); });
    var base = yd[0] <= 0 && yd[1] >= 0 ? Y(0) : m.t + ph;
    o.push('<line class="bl" x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + base + '" y2="' + base + '"/>');
    if (xs.label) o.push('<text class="t" x="' + (m.l + pw / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + K.esc(xs.label) + '</text>');
    if (ys.label) o.push('<text class="t" transform="translate(11 ' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">' + K.esc(ys.label) + '</text>');
    o.push('</g><g clip-path="none">');
    s.series.forEach(function (se) {
      var c = col(se.color), op = se.opacity !== undefined ? se.opacity : 1;
      if (se.type === 'line' || se.type === 'area') {
        var pts = se.data.filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
        if (!pts.length) return;
        var dpath = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + K.clamp(Y(p[1]), m.t - 2, m.t + ph + 2).toFixed(1); }).join('');
        if (se.type === 'area') o.push('<path d="' + dpath + 'L' + X(pts[pts.length - 1][0]) + ' ' + base + 'L' + X(pts[0][0]) + ' ' + base + 'Z" style="fill:' + c + ';opacity:.12"/>');
        o.push('<path d="' + dpath + '" style="fill:none;stroke:' + c + ';stroke-width:' + (se.width || 2) + ';opacity:' + op + '" stroke-linejoin="round" stroke-linecap="round"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + '/>');
      } else if (se.type === 'dots') {
        var r = se.r || 4;
        se.data.forEach(function (p) { if (!isFinite(p[0]) || !isFinite(p[1])) return; o.push('<circle class="' + (se.ring === false ? '' : 'ring') + '" cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="' + r + '" style="fill:' + (p[2] || c) + ';opacity:' + op + '"/>'); });
      } else if (se.type === 'cols') {
        var bw = Math.max(1, Math.min(24, Math.abs(X(se.width || 1) - X(0)) - 2));
        se.data.forEach(function (p) { var x = X(p[0]) - bw / 2, y = Y(p[1]), h = base - y; o.push(bar(x, Math.min(y, base), bw, Math.abs(h), c, h >= 0)); });
      } else if (se.type === 'bins') {
        se.data.forEach(function (b) { var x0 = X(b[0]) + 1, x1 = X(b[1]) - 1, y = Y(b[2]); if (x1 - x0 < .5) x1 = x0 + .5; o.push(bar(x0, y, x1 - x0, base - y, c, true)); });
      } else if (se.type === 'hline') {
        var y = Y(se.y); if (y < m.t - 1 || y > m.t + ph + 1) return;
        o.push('<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + y + '" y2="' + y + '" style="stroke:' + c + ';stroke-width:' + (se.width || 1.5) + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + '/>');
        if (se.label) o.push('<text class="lbl2" x="' + (m.l + pw - 4) + '" y="' + (y - 5) + '" text-anchor="end">' + K.esc(se.label) + '</text>');
      } else if (se.type === 'vline') {
        var x = X(se.x); if (x < m.l - 1 || x > m.l + pw + 1) return;
        o.push('<line x1="' + x + '" x2="' + x + '" y1="' + m.t + '" y2="' + (m.t + ph) + '" style="stroke:' + c + ';stroke-width:' + (se.width || 1.5) + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + '/>');
        if (se.label) o.push('<text class="lbl2" x="' + (x + 5) + '" y="' + (m.t + 11) + '">' + K.esc(se.label) + '</text>');
      } else if (se.type === 'circle') {
        o.push('<circle cx="' + X(se.cx) + '" cy="' + Y(se.cy) + '" r="' + Math.abs(X(se.r) - X(0)) + '" style="fill:' + (se.fill || 'none') + ';stroke:' + c + ';stroke-width:' + (se.width || 1.5) + '"/>');
      } else if (se.type === 'rect') {
        o.push('<rect x="' + X(se.x0) + '" y="' + Y(se.y1) + '" width="' + (X(se.x1) - X(se.x0)) + '" height="' + (Y(se.y0) - Y(se.y1)) + '" style="fill:' + (se.fill || 'none') + ';stroke:' + c + ';stroke-width:' + (se.width || 1.5) + '"/>');
      }
      if (se.endLabel && se.data && se.data.length) { var lp = se.data[se.data.length - 1]; o.push('<text class="lbl" x="' + (X(lp[0]) - 4) + '" y="' + (Y(lp[1]) - 8) + '" text-anchor="end">' + K.esc(se.endLabel) + '</text>'); }
    });
    (s.labels || []).forEach(function (l) { o.push('<text class="' + (l.cls || 'lbl') + '" x="' + (X(l.x) + (l.dx || 0)) + '" y="' + (Y(l.y) + (l.dy || 0)) + '" text-anchor="' + (l.anchor || 'middle') + '">' + K.esc(l.text) + '</text>'); });
    o.push('</g><line class="xh" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" style="display:none"/><rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '"/></svg>');
    var leg = '';
    var named = s.series.filter(function (se) { return se.name && !se.noLegend; });
    if (s.legend !== false && named.length >= 2) leg = '<ul class="legend">' + named.map(function (se) { return '<li><i class="' + (se.type === 'line' || se.type === 'hline' || se.type === 'vline' ? (se.dash ? 'dash' : 'ln') : '') + '" style="--c:' + col(se.color) + '"></i>' + K.esc(se.name) + '</li>'; }).join('') + '</ul>';
    el.innerHTML = o.join('') + '<div class="tip" role="presentation"></div>' + leg;
    // hover: a crosshair and a read-out
    var svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh'), hit = el.querySelector('.hit');
    var inv = function (px) { return xd[0] + (px - m.l) / pw * (xd[1] - xd[0]); }, invY = function (py) { return yd[0] + (m.t + ph - py) / ph * (yd[1] - yd[0]); };
    var move = function (ev) {
      var r = svg.getBoundingClientRect(), k = W / r.width, px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k;
      var xv = inv(px), yv = invY(py), html = s.tip ? s.tip(xv, yv, near(s, xv, yv, X, Y, px, py)) : defTip(s, xv, yf, xf);
      if (!html) { tip.classList.remove('on'); xh.style.display = 'none'; return; }
      var snap = s.snap ? s.snap(xv) : null, sx = snap !== null && snap !== undefined ? X(snap) : px;
      if (s.crosshair !== false) { xh.setAttribute('x1', sx); xh.setAttribute('x2', sx); xh.style.display = ''; }
      tip.innerHTML = html; tip.classList.add('on');
      var tw = tip.offsetWidth, th = tip.offsetHeight, left = sx / k + 14, top = py / k - th - 10;
      if (left + tw > r.width) left = sx / k - tw - 14;
      if (top < 0) top = py / k + 14;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = top + 'px';
    };
    var leave = function () { tip.classList.remove('on'); xh.style.display = 'none'; };
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move); hit.addEventListener('pointerleave', leave);
  };
  var bar = function (x, y, w, h, c, up) {
    var r = Math.min(4, w / 2, Math.abs(h));
    if (h <= 0.5) return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + Math.max(0, h) + '" style="fill:' + c + '"/>';
    // rounded at the data end, square at the baseline
    var p = up ? 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z'
      : 'M' + x + ' ' + y + 'V' + (y + h - r) + 'Q' + x + ' ' + (y + h) + ' ' + (x + r) + ' ' + (y + h) + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w) + ' ' + (y + h - r) + 'V' + y + 'Z';
    return '<path d="' + p + '" style="fill:' + c + '"/>';
  };
  var near = function (s, xv, yv, X, Y, px, py) {
    var best = null, bd = 18 * 18;
    s.series.forEach(function (se, si) {
      if (se.type !== 'dots' && se.type !== 'line') return;
      se.data.forEach(function (p, pi) { var dx = X(p[0]) - px, dy = Y(p[1]) - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = { s: se, si: si, p: p, i: pi }; } });
    });
    return best;
  };
  var defTip = function (s, xv, yf, xf) {
    var rows = [];
    s.series.forEach(function (se) {
      if (se.type === 'line' || se.type === 'area') {
        var dd = se.data, best = null, bd = Infinity;
        for (var i = 0; i < dd.length; i++) { var q = Math.abs(dd[i][0] - xv); if (q < bd) { bd = q; best = dd[i]; } }
        if (best && se.name) rows.push('<div class="r"><span><i class="k" style="--c:' + col(se.color) + '"></i>' + K.esc(se.name) + '</span><span>' + K.esc((s.y && s.y.tfmt || yf)(best[1])) + '</span></div>');
      } else if (se.type === 'bins') {
        se.data.forEach(function (b) { if (xv >= b[0] && xv < b[1]) rows.push('<div class="r"><span><i class="k" style="--c:' + col(se.color) + '"></i>' + K.esc(se.name || (xf(b[0]) + '–' + xf(b[1]))) + '</span><span>' + K.esc((s.y && s.y.tfmt || yf)(b[2])) + '</span></div>'); });
      } else if (se.type === 'cols') {
        se.data.forEach(function (p) { if (Math.abs(p[0] - xv) <= (se.width || 1) / 2) rows.push('<div class="r"><span><i class="k" style="--c:' + col(se.color) + '"></i>' + K.esc(se.name || '') + '</span><span>' + K.esc((s.y && s.y.tfmt || yf)(p[1])) + '</span></div>'); });
      }
    });
    if (!rows.length) return null;
    return '<b>' + K.esc((s.x && s.x.label ? s.x.label + ' ' : '') + (s.x && s.x.tfmt || xf)(xv)) + '</b>' + rows.join('');
  };

  // K.hbars(el, { items: [{ label, value, color, lo, hi, sub }], min, max, fmt, tip(item) }): one bar per row, label above,
  // value at the tip, optional lo–hi whisker
  K.hbars = function (el, spec) {
    el._hb = spec; el.classList.add('chart');
    if (!el._ro2 && 'ResizeObserver' in window) { var w0 = 0; el._ro2 = new ResizeObserver(function () { var w = el.clientWidth; if (Math.abs(w - w0) > 2) { w0 = w; drawBars(el); } }); el._ro2.observe(el); }
    drawBars(el);
  };
  var drawBars = function (el) {
    var s = el._hb, W = Math.max(240, el.clientWidth || 500), rowH = s.rowH || 46, H = s.items.length * rowH + 6, f = s.fmt || function (v) { return K.fmt(v, 3); };
    var lo = s.min !== undefined ? s.min : Math.min(0, Math.min.apply(null, s.items.map(function (i) { return i.lo !== undefined ? i.lo : i.value; })));
    var hi = s.max !== undefined ? s.max : Math.max.apply(null, s.items.map(function (i) { return i.hi !== undefined ? i.hi : i.value; }));
    if (!(hi > lo)) hi = lo + 1;
    var vw = 64, pw = W - vw - 4, X = function (v) { return (v - lo) / (hi - lo) * pw; };
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="' + K.esc(s.aria || '') + '">'];
    s.items.forEach(function (it, i) {
      var y = i * rowH, by = y + 22, bh = 14, x0 = X(Math.max(lo, 0)), x1 = X(it.value), c = col(it.color);
      o.push('<text class="lbl" x="0" y="' + (y + 14) + '">' + K.esc(it.label) + (it.sub ? '<tspan class="lbl2" dx="8">' + K.esc(it.sub) + '</tspan>' : '') + '</text>');
      o.push('<rect x="0" y="' + by + '" width="' + pw + '" height="' + bh + '" rx="3" style="fill:var(--panel-2)"/>');
      var w = Math.max(0, x1 - x0);
      if (w > 0) o.push(w > 4 ? '<path d="M' + x0 + ' ' + by + 'H' + (x1 - 4) + 'Q' + x1 + ' ' + by + ' ' + x1 + ' ' + (by + 4) + 'V' + (by + bh - 4) + 'Q' + x1 + ' ' + (by + bh) + ' ' + (x1 - 4) + ' ' + (by + bh) + 'H' + x0 + 'Z" style="fill:' + c + '"/>' : '<rect x="' + x0 + '" y="' + by + '" width="' + w + '" height="' + bh + '" style="fill:' + c + '"/>');
      if (it.lo !== undefined && it.hi !== undefined) { var a = X(it.lo), b = X(it.hi), cy = by + bh / 2; o.push('<path d="M' + a + ' ' + (cy - 5) + 'V' + (cy + 5) + 'M' + a + ' ' + cy + 'H' + b + 'M' + b + ' ' + (cy - 5) + 'V' + (cy + 5) + '" style="stroke:var(--ink);stroke-width:1.5;fill:none;opacity:.75"/>'); }
      o.push('<text class="lbl2" x="' + (pw + vw) + '" y="' + (by + 11) + '" text-anchor="end">' + K.esc(f(it.value)) + '</text>');
      o.push('<rect class="hit" data-i="' + i + '" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '"/>');
    });
    o.push('</svg>');
    el.innerHTML = o.join('') + '<div class="tip" role="presentation"></div>';
    var tip = el.querySelector('.tip'), svg = el.querySelector('svg');
    if (!s.tip) return;
    K.$$('.hit', el).forEach(function (h) {
      h.addEventListener('pointermove', function (ev) {
        var it = s.items[+h.getAttribute('data-i')], r = svg.getBoundingClientRect();
        tip.innerHTML = s.tip(it); tip.classList.add('on');
        var left = ev.clientX - r.left + 14, top = ev.clientY - r.top - tip.offsetHeight - 10;
        if (left + tip.offsetWidth > r.width) left = ev.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = Math.max(0, left) + 'px'; tip.style.top = Math.max(0, top) + 'px';
      });
      h.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
    });
  };
  // histogram helper: values -> [[x0, x1, count]]
  K.hist = function (vals, lo, hi, n) {
    var w = (hi - lo) / n, b = []; for (var i = 0; i < n; i++) b.push([lo + i * w, lo + (i + 1) * w, 0]);
    vals.forEach(function (v) { var k = Math.floor((v - lo) / w); if (k === n) k = n - 1; if (k >= 0 && k < n) b[k][2]++; });
    return b;
  };

  /* ------------------------------------------------------------ page behaviour */
  root.classList.add('js');
  var modes = ['auto', 'light', 'dark'], names = { auto: 'follow system', light: 'light', dark: 'dark' };
  K.onTheme = [];
  var setMode = function (m, tb) {
    if (m === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    try { if (m === 'auto') localStorage.removeItem('hb-theme'); else localStorage.setItem('hb-theme', m); } catch (e) {}
    if (tb) { tb.setAttribute('data-mode', m); tb.title = 'Theme: ' + names[m]; tb.setAttribute('aria-label', 'Theme: ' + names[m] + '. Click to change.'); }
    K.onTheme.forEach(function (f) { f(); });
  };
  var init = function () {
    var tb = d.getElementById('themeBtn');
    if (tb) {
      var cur = root.getAttribute('data-theme');
      setMode(cur === 'light' || cur === 'dark' ? cur : 'auto', tb);
      tb.addEventListener('click', function () { setMode(modes[(modes.indexOf(tb.getAttribute('data-mode')) + 1) % 3], tb); });
    }
    // tabs (click or arrow keys)
    K.$$('[role="tablist"]').forEach(function (tl) {
      var ts = K.$$('[role="tab"]', tl);
      var pick = function (t, focus) {
        ts.forEach(function (x) { var on = x === t, p = d.getElementById(x.getAttribute('aria-controls')); x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; if (p) p.classList.toggle('on', on); });
        if (focus) t.focus();
        tl.dispatchEvent(new CustomEvent('tabchange', { detail: t }));
      };
      ts.forEach(function (t, i) {
        t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
        t.addEventListener('click', function () { pick(t); });
        t.addEventListener('keydown', function (e) {
          var n = ts.length, k = e.key, j = k === 'ArrowRight' ? (i + 1) % n : k === 'ArrowLeft' ? (i + n - 1) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
          if (j < 0) return; e.preventDefault(); pick(ts[j], true);
        });
      });
    });
    // the projects menu closes on a click outside or Escape
    K.$$('details.launch').forEach(function (dt) {
      d.addEventListener('click', function (e) { if (dt.open && !dt.contains(e.target)) dt.open = false; });
      dt.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dt.open) { dt.open = false; dt.querySelector('summary').focus(); } });
    });
    // the menu on small screens
    var nav = K.$('.nav'), mb = d.getElementById('menuBtn');
    if (nav && mb) {
      var close = function () { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); };
      mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); });
      K.$$('.links a', nav).forEach(function (a) { a.addEventListener('click', close); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); mb.focus(); } });
    }
    // highlight the section being read
    if (nav && 'IntersectionObserver' in window) {
      var map = {};
      K.$$('.links a[href^="#"]', nav).forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting) return; Object.keys(map).forEach(function (k) { map[k].removeAttribute('aria-current'); }); if (map[e.target.id]) map[e.target.id].setAttribute('aria-current', 'true'); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      K.$$('main > section[id]').forEach(function (s) { spy.observe(s); });
    }
    // range inputs show their fill
    K.$$('input[type="range"]').forEach(function (r) { K.rangeFill(r); r.addEventListener('input', function () { K.rangeFill(r); }); });
    // fade sections in as they scroll into view; everything shows after a few seconds regardless
    var els = K.$$('.rv');
    setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 2500);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
      els.forEach(function (e) { io.observe(e); });
    } else els.forEach(function (e) { e.classList.add('in'); });
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
