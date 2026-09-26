import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";
const N = +(process.env.SCENES || 80);

// The card finder traces the outline of the card you clicked on made-up webcam pictures: busy playmats, other cards
// touching it, turned and tapped cards, the camera at an angle, glare, blur, noise, and compression
test("the card finder outlines the clicked card on made-up webcam pictures", async () => {
  test.setTimeout(600000);
  const browser = await launchBrowser(), page = await newPlayer(browser);
  await page.goto(`${BASE}/index.html#kt-eval`);
  await page.addScriptTag({ url:`${BASE}/tools/eval/scene.js` });
  const r = await page.evaluate(async n => {
    await window.ktEval.ready();
    // How far a four-cornered outline is from another (in any of its four turns), as a share of size
    const off = (a, b, size) => Math.min(...[0, 1, 2, 3].map(s => Math.max(...a.map((p, j) => Math.hypot(p.x - b[(j + s) % 4].x, p.y - b[(j + s) % 4].y))))) / size;
    const lerp = (a, b, t) => a + (b - a) * t, at = (q, u, v) => ({ x:lerp(lerp(q[0].x, q[1].x, u), lerp(q[3].x, q[2].x, u), v), y:lerp(lerp(q[0].y, q[1].y, u), lerp(q[3].y, q[2].y, u), v) });
    // The art box an outline gives the AI when read as a whole card (taller than wide, either way up)
    const artOf = q => { const tall = Math.hypot(q[0].x - q[3].x, q[0].y - q[3].y) > Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y), c = tall ? q : [q[1], q[2], q[3], q[0]];
      return [at(c, 0.085, 0.113), at(c, 0.915, 0.113), at(c, 0.915, 0.555), at(c, 0.085, 0.555)]; };
    const others = [1, 2, 3, 4, 5, 6].map(k => window.ktScene.fakeCard(100 + k));
    const res = [];
    for (let i = 0; i < n; i++) {
      const sc = window.ktScene.make(window.ktScene.fakeCard(i), { seed:i, others });
      const pic = await window.ktScene.compress(sc.canvas, sc.quality);
      const artH = Math.hypot(sc.art[0].x - sc.art[3].x, sc.art[0].y - sc.art[3].y), t0 = performance.now();
      const qs = await window.ktEval.findQuads(pic, sc.click.x, sc.click.y);
      // the best art box any outline gives, read as a card or as the art itself
      const best = Math.min(9, ...qs.flatMap(q => [off(artOf(q.q), sc.art, artH), off(q.q, sc.art, artH)]));
      res.push({ i, n:qs.length, best:+best.toFixed(3), ms:Math.round(performance.now() - t0) });
    }
    return res;
  }, N);
  const hit = r.filter(x => x.best < 0.12);
  console.log(`art box found within 12% on ${hit.length} of ${r.length} pictures; misses ${JSON.stringify(r.filter(x => x.best >= 0.12).map(x => x.i))}; ${Math.round(r.reduce((a, x) => a + x.ms, 0) / r.length)} ms each`);
  // The share it finds today, with a little room: a drop means a change made the card finder worse
  expect(hit.length / r.length).toBeGreaterThanOrEqual(0.45);
  await browser.close();
});
