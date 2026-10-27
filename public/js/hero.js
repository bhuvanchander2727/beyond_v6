(function(){
  var cv = document.getElementById('c');
  if (!cv) return;
  var cx = cv.getContext('2d'), hero = cv.parentNode;
  var off = document.createElement('canvas'), oc = off.getContext('2d', { willReadFrequently: true });
  var layerA = document.createElement('canvas'), cxA = layerA.getContext('2d');
  var layerB = document.createElement('canvas'), cxB = layerB.getContext('2d');
  var TEXT = 'Beyond the Ordinary', GAP = ' \u00A0 \u00A0 ';
  var W, H, dpr, fs, rx, ry, RW, RH, G, ROWS, col, base, gradA, gradB;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastW = 0, lastH = 0;

  function css(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }

  function makeGradients() {
    cxA.setTransform(dpr, 0, 0, dpr, 0, 0);
    cxB.setTransform(dpr, 0, 0, dpr, 0, 0);

    var ga = cxA.createLinearGradient(0, 0, W, 0);
    var gb = cxB.createLinearGradient(0, 0, W, 0);

    function addStops(p, aVal, bVal) {
      ga.addColorStop(p, 'rgba(0,0,0,' + aVal + ')');
      gb.addColorStop(p, 'rgba(0,0,0,' + bVal + ')');
    }

    // 0 until 20%: Layer A alpha 0, Layer B alpha 1
    addStops(0, 0, 1);
    addStops(0.20, 0, 1);

    // 20% to 42%: smoothstep up to 1 for A, down to 0 for B
    var steps = 10, i, u, s;
    for (i = 1; i < steps; i++) {
      u = i / steps;
      s = 3 * u * u - 2 * u * u * u;
      addStops(0.20 + 0.22 * u, +s.toFixed(4), +(1 - s).toFixed(4));
    }

    // 42% until 58%: hold A at 1, B at 0
    addStops(0.42, 1, 0);
    addStops(0.58, 1, 0);

    // 58% down to 80%: smoothstep down to 0 for A, up to 1 for B
    for (i = 1; i < steps; i++) {
      u = i / steps;
      s = 3 * u * u - 2 * u * u * u;
      addStops(0.58 + 0.22 * u, +(1 - s).toFixed(4), +s.toFixed(4));
    }

    // 80% to 100%: Layer A alpha 0, Layer B alpha 1
    addStops(0.80, 0, 1);
    addStops(1, 0, 1);

    gradA = ga;
    gradB = gb;
  }

  function layout() {
    W = hero.clientWidth;
    H = hero.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;

    layerA.width = cv.width;
    layerA.height = cv.height;
    layerB.width = cv.width;
    layerB.height = cv.height;

    var mob = W < 700;

    // Sizing: mobile fs = W * 0.26, desktop fs = min(W * 0.115, 180)
    if (mob) {
      fs = W * 0.26;
    } else {
      fs = Math.min(W * 0.115, 180);
    }

    G = mob ? 2.5 : 3;

    // 2. Full-width sampling region
    RW = W;
    rx = 0;
    RH = Math.round(fs * 1.4);

    ROWS = Math.floor(RH / G);
    off.width = Math.round(RW / 2);
    off.height = ROWS;

    // Position: 0.74*H with .cap clearance (shift up only as needed, never above 0.62*H)
    var centerY = H * 0.74;
    ry = centerY - RH / 2;

    var cap = hero.querySelector('.cap');
    if (cap) {
      var capRect = cap.getBoundingClientRect();
      var heroRect = hero.getBoundingClientRect();
      var capTopInHero = capRect.top - heroRect.top;
      var maxBottom = capTopInHero - 16;
      if (ry + RH > maxBottom) {
        ry = maxBottom - RH;
      }
    }
    var minRy = H * 0.62 - RH / 2;
    if (ry < minRy) {
      ry = minRy;
    }

    centerY = ry + RH / 2;
    base = centerY + fs * 0.34;

    col = {
      ink: css('--ink')
    };

    makeGradients();
  }

  // Font: weight 200 (raised to 300 only for W < 400 for crisp rendering)
  function setFont(c) {
    var fw = (W < 400) ? '300 ' : '200 ';
    c.font = fw + fs + 'px Outfit, system-ui, sans-serif';
    if ('letterSpacing' in c) c.letterSpacing = (-0.035 * fs) + 'px';
    c.textBaseline = 'alphabetic';
  }

  function frame(t) {
    // 3. Reset offscreen canvases every frame: clear, then setTransform(dpr, 0, 0, dpr, 0, 0)
    cxA.setTransform(1, 0, 0, 1, 0, 0);
    cxA.clearRect(0, 0, layerA.width, layerA.height);
    cxA.setTransform(dpr, 0, 0, dpr, 0, 0);

    cxB.setTransform(1, 0, 0, 1, 0, 0);
    cxB.clearRect(0, 0, layerB.width, layerB.height);
    cxB.setTransform(dpr, 0, 0, dpr, 0, 0);

    setFont(cxB);
    var unit = cxB.measureText(TEXT + GAP).width;
    var shift = reduce ? 0 : (t * 0.001 * Math.max(90, W * 0.09)) % unit;

    // 5. Layer B: draw solid headline text in col.ink, then apply inverse mask
    cxB.fillStyle = col.ink;
    var x;
    for (x = -shift; x < W; x += unit) {
      cxB.fillText(TEXT, x, base);
    }
    cxB.globalCompositeOperation = 'destination-in';
    cxB.fillStyle = gradB;
    cxB.fillRect(0, 0, W, H);
    cxB.globalCompositeOperation = 'source-over';

    // 4. Layer A: sample text glyphs and draw thick woven thread strokes
    var sx = off.width / RW, ow = off.width;
    var xx, yy, j, i, y0, al, run, xa, xb;
    var k = t * 0.0016;
    var amp = G * 0.2;

    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.clearRect(0, 0, ow, ROWS);
    oc.setTransform(sx, 0, 0, 1 / G, 0, -ry / G);
    setFont(oc);
    oc.fillStyle = '#000';
    for (x = -shift; x < W; x += unit) {
      oc.fillText(TEXT, x, base);
    }
    var d = oc.getImageData(0, 0, ow, ROWS).data;

    function wy(px, r) {
      return Math.sin(px * 0.03 + r * 0.55 + k) * amp;
    }

    cxA.strokeStyle = col.ink;
    cxA.lineCap = 'round';
    cxA.lineJoin = 'round';
    cxA.lineWidth = G * 0.5;

    for (j = 0; j < ROWS; j++) {
      y0 = ry + (j + 0.5) * G;
      run = -1;
      for (i = 0; i <= ow; i++) {
        al = i < ow ? d[(j * ow + i) * 4 + 3] : 0;
        if (al > 90) {
          if (run < 0) run = i;
        } else if (run >= 0) {
          if (i - run >= 2) {
            xa = run / sx;
            xb = i / sx;
            if (xb >= 0.19 * W && xa <= 0.81 * W) {
              cxA.beginPath();
              cxA.moveTo(xa, y0 + wy(xa, j));
              for (xx = xa + 5; xx < xb; xx += 5) {
                cxA.lineTo(xx, y0 + wy(xx, j));
              }
              cxA.lineTo(xb, y0 + wy(xb, j));
              cxA.stroke();
            }
          }
          run = -1;
        }
      }
    }

    cxA.globalCompositeOperation = 'destination-in';
    cxA.fillStyle = gradA;
    cxA.fillRect(0, 0, W, H);
    cxA.globalCompositeOperation = 'source-over';

    // 6. Composite onto main canvas: clear, drawImage(layerB), drawImage(layerA)
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.drawImage(layerB, 0, 0);
    cx.drawImage(layerA, 0, 0);

    if (!reduce) requestAnimationFrame(frame);
  }

  function start() {
    lastW = hero.clientWidth;
    lastH = hero.clientHeight;
    layout();
    requestAnimationFrame(frame);
  }

  // Address-bar aware resize handling: recompute on real width change or significant orientation shift
  var rt;
  addEventListener('resize', function() {
    clearTimeout(rt);
    rt = setTimeout(function() {
      var newW = hero.clientWidth;
      var newH = hero.clientHeight;
      if (newW !== lastW || Math.abs(newH - lastH) > 120) {
        lastW = newW;
        lastH = newH;
        layout();
        if (reduce) requestAnimationFrame(frame);
      }
    }, 100);
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    col = {
      ink: css('--ink')
    };
    if (reduce) requestAnimationFrame(frame);
  });

  (document.fonts && document.fonts.load ? document.fonts.load('200 100px Outfit').catch(function(){}) : Promise.resolve()).then(start);
})();
