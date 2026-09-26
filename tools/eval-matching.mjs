/* Matching benchmark: how often a click on a card finds the right card, on webcam-like pictures of real cards.

   Picks random cards from the published all-cards index, downloads them from Scryfall, and draws each onto a made-up
   webcam picture (tools/eval/scene.js: a busy playmat made from another card's art, other cards around it, turned,
   tapped and tilted cards, glare, blur, color cast, noise, compression). Then runs the page's own click matcher,
   with the real AI model and index, on every picture:
     before   the way clicks worked before the card finder (boxes of guessed sizes around the click)
     finder   the card finder (outlines around the click, straightened out)
     perfect  the card's true corners handed to the matcher: the best the AI can do once the card is found
   plus a clean check: Scryfall's own art crop, which should always find itself in the index.

   Usage (from the repo root, with the index in site/index):
     node tools/eval-matching.mjs [cards=100] [dtype]     dtype: q8 (what browsers without WebGPU use) or fp32
   Needs the web (Scryfall, Hugging Face, jsDelivr). Writes eval-results/summary.md, results.json, and pictures of misses. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "../tests/node_modules/@playwright/test/index.js";

const ROOT = path.resolve(import.meta.dirname, ".."), OUT = path.join(ROOT, "eval-results");
const N = +(process.argv[2] || 100), DTYPE = process.argv[3] || "q8", PORT = 8790;
const TYPES = { ".html":"text/html", ".js":"application/javascript", ".json":"application/json", ".bin":"application/octet-stream" };
fs.mkdirSync(path.join(OUT, "misses"), { recursive:true });

// The page and the index, from this checkout
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = url.startsWith("/index/") ? path.join(ROOT, "site", url) : path.join(ROOT, url === "/" ? "index.html" : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type":TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(PORT, "127.0.0.1", r));

// Random cards from the index (seeded, so runs compare), and more for playmats and neighbors
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "index", "cards.json"), "utf8"));
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const pickCards = n => Array.from({ length:n }, () => meta.cards[Math.floor(rnd() * meta.cards.length)]);
const tests = pickCards(N), mats = pickCards(12), others = pickCards(16);
console.log(`Index: ${meta.cards.length} artworks, model ${meta.model}. Testing ${N} cards with ${DTYPE}.`);

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", m => { if (m.type() === "error" || /Card finder|AI matcher/.test(m.text())) console.log("page:", m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html#kt-eval&dtype=${DTYPE}`);
await page.addScriptTag({ url:`http://127.0.0.1:${PORT}/tools/eval/scene.js` });
const ready = await page.evaluate(() => window.ktEval.ready());
console.log("Ready:", JSON.stringify(ready));
if (!ready.index || !ready.cv || !ready.model) throw new Error("the page isn't ready: " + JSON.stringify(ready));

// Load card pictures in the page (Scryfall allows that): whole cards, and art crops for the clean check and playmats
await page.evaluate(async ({ tests, mats, others }) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const img = url => new Promise(res => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
  const get = async ([id, name, face]) => {
    await sleep(110);  // Scryfall asks for no more than 10 requests a second
    const c = await (await fetch(`https://api.scryfall.com/cards/${id}`)).json().catch(() => null); if (!c) return null;
    const f = c.card_faces?.[face || 0]?.image_uris ? c.card_faces[face || 0] : c;
    const iu = f.image_uris || c.image_uris; if (!iu) return null;
    const [card, art] = await Promise.all([img(iu.normal), img(iu.art_crop)]);
    return card && art ? { name, card, art } : null;
  };
  const all = async list => { const out = []; for (const x of list) out.push(await get(x)); return out; };
  window.bench = { tests:await all(tests), mats:(await all(mats)).filter(Boolean).map(x => x.art), others:(await all(others)).filter(Boolean).map(x => x.card) };
}, { tests, mats, others });

const results = [];
for (let i = 0; i < N; i++) {
  const r = await page.evaluate(async i => {
    const b = window.bench, t = b.tests[i]; if (!t) return null;
    const sc = window.ktScene.make(t.card, { seed:i + 1, mat:b.mats, others:b.others });
    const pic = await window.ktScene.compress(sc.canvas, sc.quality);
    const art = document.createElement("canvas"); art.width = 240; art.height = Math.round(240 * t.art.naturalHeight / t.art.naturalWidth);
    art.getContext("2d").drawImage(t.art, 0, 0, art.width, art.height);
    const clean = await window.ktEval.matchArt(art);
    const before = await window.ktEval.match(pic, sc.click.x, sc.click.y, { finder:false });
    const finder = await window.ktEval.match(pic, sc.click.x, sc.click.y, { finder:true });
    const perfect = await window.ktEval.match(pic, sc.click.x, sc.click.y, { card:sc.quad });
    const res = { i, name:t.name, h:Math.round(Math.hypot(sc.quad[0].x - sc.quad[3].x, sc.quad[0].y - sc.quad[3].y)), blur:+sc.blur.toFixed(1) };
    const add = (k, m) => { res[k] = m ? { ok:m.name === t.name, top4:(m.top || []).some(x => x.name === t.name), name:m.name, score:+m.score.toFixed(3), margin:+(m.margin ?? 0).toFixed(3), sure:!!m.ok, ms:Math.round(m.ms || 0) } : null; };
    add("clean", clean); add("before", before); add("finder", finder); add("perfect", perfect);
    // A picture of a miss, with the true outline in green and where it clicked
    if (!res.finder?.ok) {
      const x = pic.getContext("2d"); x.strokeStyle = "lime"; x.lineWidth = 2; x.beginPath(); sc.quad.forEach((p, j) => j ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)); x.closePath(); x.stroke();
      if (finder?.quad) { x.strokeStyle = "red"; x.beginPath(); finder.quad.forEach((p, j) => j ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)); x.closePath(); x.stroke(); }
      x.fillStyle = "magenta"; x.fillRect(sc.click.x - 5, sc.click.y - 5, 10, 10);
      res.pic = pic.toDataURL("image/jpeg", 0.8);
    }
    return res;
  }, i);
  if (!r) { console.log(`${i}: couldn't load the card`); continue; }
  if (r.pic) { fs.writeFileSync(path.join(OUT, "misses", `${String(i).padStart(3, "0")}.jpg`), Buffer.from(r.pic.split(",")[1], "base64")); delete r.pic; }
  results.push(r);
  const mark = k => r[k]?.ok ? "✓" : r[k]?.top4 ? "~" : "✗";
  console.log(`${i} ${r.name}: clean ${mark("clean")} before ${mark("before")} finder ${mark("finder")} (${r.finder?.name}, ${r.finder?.score}) perfect ${mark("perfect")}`);
}
await browser.close(); server.close();

const pct = (k, f) => { const v = results.filter(r => r[k]); return v.length ? Math.round(100 * v.filter(r => f(r[k])).length / v.length) : 0; };
const avg = (k, f) => { const v = results.filter(r => r[k]).map(r => f(r[k])); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : 0; };
const rows = ["clean", "before", "finder", "perfect"].map(k =>
  `| ${k} | ${pct(k, m => m.ok)}% | ${pct(k, m => m.top4)}% | ${pct(k, m => m.sure)}% | ${pct(k, m => m.sure && !m.ok)}% | ${avg(k, m => m.score).toFixed(3)} | ${Math.round(avg(k, m => m.ms))} ms |`);
const summary = [`## Matching benchmark: ${results.length} cards, model ${ready.model} (${DTYPE} on ${ready.device}), index of ${ready.index}`, "",
  "| method | right card first | in top 4 | called sure | sure but wrong | mean score | time |", "|---|---|---|---|---|---|---|", ...rows, "",
  "clean: Scryfall's own art crop (should be about 100%). before: clicks before the card finder. finder: with the card finder. perfect: the card's true corners."].join("\n");
fs.writeFileSync(path.join(OUT, "summary.md"), summary + "\n");
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 1));
console.log("\n" + summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
