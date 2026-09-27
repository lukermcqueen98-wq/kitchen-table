/* The matching benchmark, run offline from the bench-data branch (see tools/eval/fetch-data.mjs), on all of this
   computer's cores. Same made-up webcam pictures and the page's own matcher as tools/eval-matching.mjs, against a
   stand-in index made from the data's cards, prepared the page's current way.

   Usage: node tools/eval/local-bench.mjs <data-dir> [cards=100] [--finder-only] [--workers=4] [--methods=before,finder,perfect]
     --finder-only  just check the card finder's outlines against the true ones (no AI; a few seconds)
   Writes eval-results/local-summary.md and local-results.json, and pictures of the finder's misses. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..", ".."), OUT = path.join(ROOT, "eval-results");
const args = process.argv.slice(2), flag = (k, d) => { const a = args.find(x => x.startsWith(`--${k}`)); return a ? (a.includes("=") ? a.split("=")[1] : true) : d; };
const DATA = path.resolve(args[0] || "bench-data"), N = +(args.find((a, i) => i > 0 && /^\d+$/.test(a)) || 100);
const FINDER_ONLY = !!flag("finder-only", false), WORKERS = +flag("workers", Math.min(4, os.cpus().length));
const METHODS = String(flag("methods", "before,finder,perfect")).split(",");
const { chromium } = createRequire(import.meta.url)("../../tests/node_modules/@playwright/test");
const TJS = path.join(ROOT, "tools", "node_modules", "@huggingface", "transformers", "dist");
const CV = path.join(ROOT, "tests", "node_modules", "@techstark", "opencv-js", "dist", "opencv.js");
const list = JSON.parse(fs.readFileSync(path.join(DATA, "list.json"), "utf8"));
const MODEL = fs.readFileSync(path.join(DATA, "model", "name.txt"), "utf8").trim();
fs.mkdirSync(path.join(OUT, "local-misses"), { recursive:true });

const TYPES = { ".html":"text/html", ".js":"application/javascript", ".mjs":"application/javascript", ".json":"application/json", ".jpg":"image/jpeg", ".wasm":"application/wasm" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = url.startsWith("/data/") ? path.join(DATA, url.slice(6)) : path.join(ROOT, url === "/" ? "index.html" : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type":TYPES[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
async function openPage(){
  const page = await browser.newPage();
  // Everything the page would download comes from here instead
  await page.route(/cdn\.jsdelivr\.net/, r => {
    const u = r.request().url();
    if (/transformers@/.test(u)) return r.fulfill({ path:path.join(TJS, u.split("/dist/")[1].split("?")[0]), contentType:u.endsWith(".wasm") ? "application/wasm" : "application/javascript" });
    if (u.endsWith("opencv.js")) return r.fulfill({ path:CV, contentType:"application/javascript" });
    return r.fulfill({ status:404, body:"" });
  });
  await page.route(/huggingface\.co/, r => {
    const m = /resolve\/[^/]+\/(.+?)(\?|$)/.exec(r.request().url()), f = m && path.join(DATA, "model", m[1]);
    return f && fs.existsSync(f) ? r.fulfill({ path:f, contentType:"application/octet-stream" }) : r.fulfill({ status:404, body:"" });
  });
  await page.route(/scryfall|fonts\.g|index\/cards/, r => r.fulfill({ status:404, body:"" }));
  page.on("console", m => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) console.log("page:", m.text()); });
  await page.goto(`${BASE}/index.html#kt-eval&dtype=q8`);
  await page.addScriptTag({ url:`${BASE}/tools/eval/scene.js` });
  const ready = await page.evaluate(() => window.ktEval.ready());
  // Pictures: the test cards (whole and art), others for neighbors and playmats
  await page.evaluate(async ({ nt, ne }) => {
    const img = url => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
    const tests = []; for (let i = 0; i < nt; i++) tests.push({ card:await img(`/data/cards/${i}.jpg`), art:await img(`/data/art/${i}.jpg`) });
    const extra = []; for (let i = 0; i < ne; i++) extra.push(await img(`/data/extra/${i}.jpg`));
    window.bench = { tests, extra, mats:extra.slice(0, 12), others:tests.slice(-16).map(t => t.card) };
  }, { nt:list.tests.length, ne:FINDER_ONLY ? 12 : list.extra.length });
  return { page, ready };
}

// Workers: one page each (the AI runs on one core per page without a graphics card)
const pages = await Promise.all(Array.from({ length:FINDER_ONLY ? 1 : WORKERS }, openPage));
const { ready } = pages[0];
console.log(`Model ${ready.model} on ${ready.device}, OpenCV ${ready.cv}. ${N} cards${FINDER_ONLY ? ", card finder only" : ""}.`);

// The stand-in index, fingerprinted once and kept on disk (per model and page prep)
if (!FINDER_ONLY) {
  const prep = await pages[0].page.evaluate(() => `shrink${window.ktEval.prepWidth()}`);
  const cacheFile = path.join(DATA, `index-${MODEL.replace(/\W+/g, "_")}-${prep}.json`);
  let vecs = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : null;
  const names = [...list.tests.map(t => t.name), ...list.extra.map(t => t.name)];
  if (!vecs || vecs.length !== names.length) {
    console.log(`Fingerprinting the ${names.length}-card stand-in index (${prep}); saved for next time...`);
    const t0 = Date.now(), per = Math.ceil(names.length / pages.length);
    const parts = await Promise.all(pages.map(({ page }, w) => page.evaluate(async ([a, b]) => {
      const B = window.bench, pics = [...B.tests.map(t => t.art), ...B.extra].slice(a, b), out = [];
      const c240 = src => { const c = document.createElement("canvas"); c.width = 240; c.height = Math.round(240 * src.naturalHeight / src.naturalWidth); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c; };
      for (let i = 0; i < pics.length; i += 16) out.push(...(await window.ktEval.embed(pics.slice(i, i + 16).map(c240))).map(v => Array.from(v, x => +x.toFixed(5))));
      return out;
    }, [w * per, (w + 1) * per])));
    vecs = parts.flat(); fs.writeFileSync(cacheFile, JSON.stringify(vecs));
    console.log(`  done in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  await Promise.all(pages.map(({ page }) => page.evaluate(([names, vecs, prep]) => window.ktEval.useIndex(names.map((name, i) => ({ name, v:vecs[i] })), prep), [names, vecs, prep])));
}

// The pictures, shared out among the workers
const results = [], t0 = Date.now();
let next = 0;
await Promise.all(pages.map(async ({ page }) => {
  while (next < N) {
    const i = next++;
    const r = await page.evaluate(async ({ i, finderOnly, methods }) => {
      const b = window.bench, t = b.tests[i], E = window.ktEval;
      const sc = window.ktScene.make(t.card, { seed:i + 1, mat:b.mats, others:b.others });
      const pic = await window.ktScene.compress(sc.canvas, sc.quality);
      const lerp = (a, z, u) => a + (z - a) * u, at = (q, u, v) => ({ x:lerp(lerp(q[0].x, q[1].x, u), lerp(q[3].x, q[2].x, u), v), y:lerp(lerp(q[0].y, q[1].y, u), lerp(q[3].y, q[2].y, u), v) });
      const off = (a, z, size) => Math.min(...[0, 1, 2, 3].map(s => Math.max(...a.map((p, j) => Math.hypot(p.x - z[(j + s) % 4].x, p.y - z[(j + s) % 4].y))))) / size;
      const artOf = q => { const tall = Math.hypot(q[0].x - q[3].x, q[0].y - q[3].y) > Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y), c = tall ? q : [q[1], q[2], q[3], q[0]];
        return [at(c, 0.085, 0.113), at(c, 0.915, 0.113), at(c, 0.915, 0.555), at(c, 0.085, 0.555)]; };
      const artH = Math.hypot(sc.art[0].x - sc.art[3].x, sc.art[0].y - sc.art[3].y);
      const qs = await E.findQuads(pic, sc.click.x, sc.click.y);
      const fits = qs.map(q => Math.min(off(artOf(q.q), sc.art, artH), off(q.q, sc.art, artH)));
      const res = { i, h:Math.round(Math.hypot(sc.quad[0].x - sc.quad[3].x, sc.quad[0].y - sc.quad[3].y)), blur:+sc.blur.toFixed(1), quads:qs.length,
                    found:Math.min(9, ...fits) < 0.12, bestFit:+Math.min(9, ...fits).toFixed(3), rank:fits.findIndex(f => f < 0.12) };
      if (!finderOnly) for (const k of methods) {
        const m = k === "perfect" ? await E.match(pic, 0, 0, { card:sc.quad }) : await E.match(pic, sc.click.x, sc.click.y, { finder:k === "finder" });
        res[k] = m ? { name:m.name, score:+m.score.toFixed(3), sure:!!m.ok, ms:Math.round(m.ms) } : null;
      }
      if (!res.found) {  // a picture of the miss: true outline green, found ones red, the click magenta
        const x = pic.getContext("2d"), poly = (q, c) => { x.strokeStyle = c; x.lineWidth = 2; x.beginPath(); q.forEach((p, j) => j ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)); x.closePath(); x.stroke(); };
        poly(sc.quad, "lime"); qs.forEach(q => poly(q.q, "red")); x.fillStyle = "magenta"; x.fillRect(sc.click.x - 5, sc.click.y - 5, 10, 10);
        res.pic = pic.toDataURL("image/jpeg", 0.8);
      }
      return res;
    }, { i, finderOnly:FINDER_ONLY, methods:METHODS });
    r.name = list.tests[i].name;
    for (const k of METHODS) if (r[k]) r[k].ok = r[k].name === r.name;
    if (r.pic) { fs.writeFileSync(path.join(OUT, "local-misses", `${String(i).padStart(3, "0")}.jpg`), Buffer.from(r.pic.split(",")[1], "base64")); delete r.pic; }
    results.push(r);
    if (!FINDER_ONLY) console.log(`${i} ${r.name}: finder found it ${r.found ? "✓" : "✗"}` + METHODS.map(k => ` ${k} ${r[k]?.ok ? "✓" : "✗"}`).join(""));
  }
}));
await browser.close(); server.close();

const pct = f => Math.round(100 * results.filter(f).length / results.length);
const lines = [`## Local benchmark: ${results.length} cards, ${MODEL}${FINDER_ONLY ? "" : `, stand-in index of ${list.tests.length + list.extra.length}`}, ${Math.round((Date.now() - t0) / 1000)} s`, "",
  `Card finder: art found within 12% on ${pct(r => r.found)}% (first outline ${pct(r => r.rank === 0)}%)`];
if (!FINDER_ONLY) {
  lines.push("", "| method | right card first | called sure | sure but wrong | time |", "|---|---|---|---|---|");
  for (const k of METHODS) lines.push(`| ${k} | ${pct(r => r[k]?.ok)}% | ${pct(r => r[k]?.sure)}% | ${pct(r => r[k]?.sure && !r[k]?.ok)}% | ${Math.round(results.reduce((a, r) => a + (r[k]?.ms || 0), 0) / results.length)} ms |`);
  lines.push("", `finder when it found the art: ${pct(r => r.found && r.finder?.ok)}% of all, when it didn't: ${pct(r => !r.found && r.finder?.ok)}% of all`);
}
console.log("\n" + lines.join("\n"));
fs.writeFileSync(path.join(OUT, "local-summary.md"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "local-results.json"), JSON.stringify(results, null, 1));
