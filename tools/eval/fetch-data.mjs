/* Downloads what the matching benchmark needs into one folder, so it can also run on a computer that can't reach
   Scryfall or Hugging Face (the bench-data workflow commits the folder to the bench-data branch):
     cards/<n>.jpg       whole cards (Scryfall's "normal" pictures) to draw onto made-up webcam pictures
     art/<n>.jpg         their art crops, 240 pixels wide
     extra/<n>.jpg       art crops of other cards, 240 pixels wide (a stand-in index, playmats)
     list.json           { tests:[{ name, id }], extra:[{ name, id }] } in the same order as the files
     model/...           the DINOv2-small model the page uses, as served by Hugging Face
   Usage: node tools/eval/fetch-data.mjs <out-dir> [tests=300] [extra=2700]   (reads site/index/cards.json) */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve(process.argv[2] || "bench-data"), NT = +(process.argv[3] || 300), NE = +(process.argv[4] || 2700);
const UA = "KitchenTable-benchmark/1.0 (+https://github.com/lukermcqueen98-wq/kitchen-table)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const meta = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "..", "..", "site", "index", "cards.json"), "utf8"));
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const seen = new Set(), pick = () => { for (;;) { const c = meta.cards[Math.floor(rnd() * meta.cards.length)]; if (!seen.has(c[1])) { seen.add(c[1]); return c; } } };
for (const d of ["cards", "art", "extra", "model/onnx"]) fs.mkdirSync(path.join(OUT, d), { recursive:true });

async function get(url, tries = 4){
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers:{ "User-Agent":UA, Accept:"*/*" } }); if (r.ok) return Buffer.from(await r.arrayBuffer()); if (r.status === 404) return null; } catch {}
    await sleep(1000 * 2 ** i);
  }
  return null;
}
async function card([id, name, face]){
  await sleep(110);  // Scryfall asks for 10 requests a second at most
  const j = await get(`https://api.scryfall.com/cards/${id}`); if (!j) return null;
  const c = JSON.parse(j), f = c.card_faces?.[face || 0]?.image_uris ? c.card_faces[face || 0] : c, iu = f.image_uris || c.image_uris;
  return iu ? { name, id, iu } : null;
}
const small = buf => sharp(buf).resize({ width:240 }).jpeg({ quality:92 }).toBuffer();

const list = { tests:[], extra:[] };
while (list.tests.length < NT) {
  const c = await card(pick()); if (!c) continue;
  const [whole, art] = await Promise.all([get(c.iu.normal), get(c.iu.art_crop)]); if (!whole || !art) continue;
  const n = list.tests.length;
  fs.writeFileSync(path.join(OUT, "cards", `${n}.jpg`), whole);
  fs.writeFileSync(path.join(OUT, "art", `${n}.jpg`), await small(art));
  list.tests.push({ name:c.name, id:c.id });
  if (n % 50 === 0) console.log(`${n} test cards`);
}
while (list.extra.length < NE) {
  const c = await card(pick()); if (!c) continue;
  const art = await get(c.iu.art_crop); if (!art) continue;
  fs.writeFileSync(path.join(OUT, "extra", `${list.extra.length}.jpg`), await small(art));
  list.extra.push({ name:c.name, id:c.id });
  if (list.extra.length % 250 === 0) console.log(`${list.extra.length} other cards`);
}
fs.writeFileSync(path.join(OUT, "list.json"), JSON.stringify(list));

// The model, under the name the published index was built with
const repo = meta.model, files = ["config.json", "preprocessor_config.json", "onnx/model_quantized.onnx", "onnx/model.onnx"];
for (const f of files) {
  const b = await get(`https://huggingface.co/${repo}/resolve/main/${f}`);
  if (b) { fs.writeFileSync(path.join(OUT, "model", f), b); console.log(`model ${f}: ${(b.length / 1e6).toFixed(1)} MB`); }
  else console.log(`model ${f}: not found`);
}
fs.writeFileSync(path.join(OUT, "model", "name.txt"), repo);
console.log(`Done: ${list.tests.length} test cards, ${list.extra.length} others, model ${repo}.`);
