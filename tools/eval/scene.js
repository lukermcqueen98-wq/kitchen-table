/* Made-up webcam pictures of Magic cards on a playmat, for measuring the click matcher (tools/eval-matching.mjs)
   and testing the card finder (tests/specs/card-finder.spec.mjs). Runs in the page, after OpenCV has loaded.

   Each picture copies what makes real webcams hard: a busy playmat with other cards nearby (some touching or
   overlapping), the card turned a little, tapped, or upside down, the camera looking at the table at an angle,
   sleeve glare, and then the camera itself: soft focus, a color cast, uneven brightness, sensor noise, and
   compression. Everything is drawn from a seeded random number generator, so a seed always gives the same picture.

   window.ktScene.make(card, opts) -> { canvas, quad, art, click }
     card: an image or canvas of a whole card, upright
     opts: { seed, width:1280, height:720, mat:[images for the playmat], others:[images of other cards] }
     quad: the card's corners in the picture (clockwise from its top left, as the card reads)
     art:  the corners of its art box, click: where a player clicks (on the art, or sometimes anywhere on the card) */
(() => {
  const rngOf = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const ART = [0.085, 0.113, 0.915, 0.555];
  const lerp = (a, b, t) => a + (b - a) * t;
  const at = (q, u, v) => ({ x:lerp(lerp(q[0].x, q[1].x, u), lerp(q[3].x, q[2].x, u), v), y:lerp(lerp(q[0].y, q[1].y, u), lerp(q[3].y, q[2].y, u), v) });

  // Draw an image onto ctx through four corners (a perspective warp done by OpenCV), with rounded card corners
  function warpOnto(ctx, img, quad, W, H){
    const cv = window.cv;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const c = document.createElement("canvas"); c.width = iw; c.height = ih;
    const cx = c.getContext("2d"); cx.drawImage(img, 0, 0);
    const src = cv.matFromImageData(cx.getImageData(0, 0, iw, ih)), dst = new cv.Mat();
    const from = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, iw, 0, iw, ih, 0, ih]), to = cv.matFromArray(4, 1, cv.CV_32FC2, quad.flatMap(p => [p.x, p.y]));
    const M = cv.getPerspectiveTransform(from, to);
    cv.warpPerspective(src, dst, M, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 0));
    const out = document.createElement("canvas"); out.width = W; out.height = H;
    out.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(dst.data), W, H), 0, 0);
    [src, dst, from, to, M].forEach(m => m.delete());
    // Rounded corners: clip to the quad with its corners cut a little
    ctx.save(); ctx.beginPath();
    const r = 0.045;
    const pts = [[r, 0], [1 - r, 0], [1, r], [1, 1 - r * 0.72], [1 - r, 1], [r, 1], [0, 1 - r * 0.72], [0, r]];
    pts.forEach(([u, v], i) => { const p = at(quad, u, v); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath(); ctx.clip(); ctx.drawImage(out, 0, 0); ctx.restore();
  }
  // Corners of a card of height h centered at (cx, cy), turned by ang (radians), with the camera's perspective (tilt)
  function cardQuad(rnd, cx, cy, h, ang, tilt){
    const w = h * 63 / 88, co = Math.cos(ang), si = Math.sin(ang);
    return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => ({
      x:cx + x * co - y * si + (rnd() - 0.5) * tilt * h, y:cy + x * si + y * co + (rnd() - 0.5) * tilt * h }));
  }

  function make(card, { seed = 1, width:W = 1280, height:H = 720, mat = [], others = [] } = {}){
    const rnd = rngOf(seed * 7919 + 17), pick = a => a[Math.floor(rnd() * a.length)];
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently:true });

    // The playmat: a big, busy artwork (or random color shapes when none is given), sometimes with a zone grid
    ctx.fillStyle = `hsl(${rnd() * 360},${30 + rnd() * 40}%,${15 + rnd() * 30}%)`; ctx.fillRect(0, 0, W, H);
    if (mat.length) {
      const m = pick(mat), iw = m.naturalWidth || m.width, ih = m.naturalHeight || m.height, k = Math.max(W / iw, H / ih) * (1 + rnd() * 0.6);
      ctx.drawImage(m, (W - iw * k) * rnd(), (H - ih * k) * rnd(), iw * k, ih * k);
    } else {
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `hsla(${rnd() * 360},${40 + rnd() * 60}%,${20 + rnd() * 60}%,${0.4 + rnd() * 0.6})`;
        ctx.beginPath(); ctx.ellipse(rnd() * W, rnd() * H, 10 + rnd() * 160, 10 + rnd() * 160, rnd() * 3, 0, 7); ctx.fill();
      }
    }
    if (rnd() < 0.3) {  // printed zone lines
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + rnd() * 0.4})`; ctx.lineWidth = 2 + rnd() * 3;
      for (let i = 0; i < 3; i++) { ctx.strokeRect(rnd() * W * 0.8, rnd() * H * 0.8, 120 + rnd() * 300, 150 + rnd() * 300); }
    }

    // The card's size, angle, and the camera's tilt
    const h = 110 + rnd() * 170, kind = rnd();
    const ang = (kind < 0.7 ? 0 : kind < 0.9 ? Math.PI / 2 : Math.PI) + (rnd() - 0.5) * 0.4;
    const cx = W * (0.25 + rnd() * 0.5), cy = H * (0.3 + rnd() * 0.4);
    const quad = cardQuad(rnd, cx, cy, h, ang, 0.08 * rnd());

    // Other cards around it: some well apart, some touching or overlapping it (a row of lands, a stack)
    const others2 = others.length ? others : [];
    for (let i = 0; i < 5 && others2.length; i++) {
      const near = rnd() < 0.5, d = h * (near ? 0.75 + rnd() * 0.3 : 1.3 + rnd() * 1.5), a = rnd() * 6.283;
      const oq = cardQuad(rnd, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, h * (0.95 + rnd() * 0.1), (rnd() < 0.8 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.3, 0.1 * rnd());
      warpOnto(ctx, pick(others2), oq, W, H);
    }
    warpOnto(ctx, card, quad, W, H);

    // Sleeve glare: a soft bright patch over part of the card
    if (rnd() < 0.35) {
      const g = at(quad, rnd(), rnd()), r = h * (0.15 + rnd() * 0.3), grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
      grd.addColorStop(0, `rgba(255,255,255,${0.35 + rnd() * 0.4})`); grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd; ctx.fillRect(g.x - r, g.y - r, 2 * r, 2 * r);
    }

    // The camera: uneven light, soft focus, color cast, noise, then compression (done by the caller via toBlob)
    const light = ctx.createLinearGradient(rnd() * W, 0, rnd() * W, H);
    light.addColorStop(0, `rgba(0,0,0,${rnd() * 0.35})`); light.addColorStop(1, `rgba(255,240,210,${rnd() * 0.12})`);
    ctx.fillStyle = light; ctx.fillRect(0, 0, W, H);
    const blur = 0.6 + rnd() * 1.6;
    const soft = document.createElement("canvas"); soft.width = W; soft.height = H;
    const sx = soft.getContext("2d", { willReadFrequently:true });
    sx.filter = `blur(${blur}px) contrast(${0.8 + rnd() * 0.3}) saturate(${0.75 + rnd() * 0.45}) brightness(${0.85 + rnd() * 0.3})`;
    sx.drawImage(canvas, 0, 0);
    const im = sx.getImageData(0, 0, W, H), d = im.data, cast = [0.88 + rnd() * 0.24, 0.9 + rnd() * 0.2, 0.85 + rnd() * 0.3], noise = 2 + rnd() * 7;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() + rnd() + rnd() - 1.5) * noise;
      d[i] = d[i] * cast[0] + n; d[i + 1] = d[i + 1] * cast[1] + n; d[i + 2] = d[i + 2] * cast[2] + n;
    }
    ctx.putImageData(im, 0, 0);

    // Where a player clicks: usually the art, sometimes anywhere on the card
    const click = rnd() < 0.75 ? at(quad, lerp(ART[0], ART[2], 0.15 + rnd() * 0.7), lerp(ART[1], ART[3], 0.15 + rnd() * 0.7))
                               : at(quad, 0.1 + rnd() * 0.8, 0.1 + rnd() * 0.8);
    const art = [at(quad, ART[0], ART[1]), at(quad, ART[2], ART[1]), at(quad, ART[2], ART[3]), at(quad, ART[0], ART[3])];
    return { canvas, quad, art, click, blur, quality:0.55 + rnd() * 0.3 };
  }
  // Compress like a video call does (the caller awaits this before matching)
  async function compress(canvas, quality){
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    const bmp = await createImageBitmap(blob), c = document.createElement("canvas"); c.width = canvas.width; c.height = canvas.height;
    c.getContext("2d").drawImage(bmp, 0, 0); return c;
  }

  // A made-up card for tests that can't download real ones: black border, colored frame, name bar, art, text box
  function fakeCard(seed, art){
    const rnd = rngOf(seed * 31 + 5), W = 488, H = 680, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), hue = rnd() * 360;
    x.fillStyle = "#111"; x.fillRect(0, 0, W, H);
    x.fillStyle = `hsl(${hue},${30 + rnd() * 50}%,${35 + rnd() * 30}%)`; x.fillRect(W * 0.04, H * 0.03, W * 0.92, H * 0.94);
    x.fillStyle = `hsl(${hue},25%,82%)`; x.fillRect(W * 0.06, H * 0.045, W * 0.88, H * 0.06); x.fillRect(W * 0.06, H * 0.565, W * 0.88, H * 0.055);
    const [u0, v0, u1, v1] = ART;
    if (art) x.drawImage(art, W * u0, H * v0, W * (u1 - u0), H * (v1 - v0));
    else for (let i = 0; i < 30; i++) {
      x.fillStyle = `hsl(${rnd() * 360},${50 + rnd() * 50}%,${20 + rnd() * 60}%)`;
      x.save(); x.beginPath(); x.rect(W * u0, H * v0, W * (u1 - u0), H * (v1 - v0)); x.clip();
      x.beginPath(); x.ellipse(W * (u0 + rnd() * (u1 - u0)), H * (v0 + rnd() * (v1 - v0)), 10 + rnd() * 120, 10 + rnd() * 120, rnd() * 3, 0, 7); x.fill(); x.restore();
    }
    x.fillStyle = "#e9e3d3"; x.fillRect(W * 0.07, H * 0.63, W * 0.86, H * 0.3);
    x.fillStyle = "#555"; for (let l = 0; l < 6; l++) x.fillRect(W * 0.1, H * (0.66 + l * 0.04), W * (0.4 + rnd() * 0.4), 5);
    x.fillStyle = "#222"; x.fillRect(W * 0.1, H * 0.06, W * (0.3 + rnd() * 0.3), 14);
    return c;
  }
  window.ktScene = { make, compress, fakeCard };
})();
