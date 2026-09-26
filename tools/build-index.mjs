#!/usr/bin/env node
/* Builds the all-cards picture index that index.html searches when you click a card on camera.

   For every unique paper Magic artwork on Scryfall, it downloads the art crop, runs the same vision model the
   page uses (DINOv2-small), and saves one fingerprint per artwork:
     cards.json  { model, dims, n, built, cards:[[scryfall id, name, face index], ...] }
     cards.bin   n float32 scales, then n * dims int8 values (fingerprint = int8 / scale)

   Runs are incremental: artworks already in the output folder are kept, only new ones are processed, and progress
   is saved every few minutes, so a long first build can be split across runs.

   Usage: node tools/build-index.mjs [out-dir]            (default: site/index)
   Env:   MAX_MINUTES          stop and save after this long (default 300)
          CONCURRENCY          parallel image downloads (default 8)
          SCRYFALL_BULK_FILE   read card data from this local file instead of downloading it (for testing)
   Flag:  --fake-model         a stand-in model, to test the pipeline without downloading the real one */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline, RawImage } from "@huggingface/transformers";

const OUT = path.resolve(process.argv.slice(2).find(a => !a.startsWith("--")) || "site/index");
const FAKE = process.argv.includes("--fake-model");
// DINOv2-small under the names it's published as; same list and order as AI_MODELS in index.html
const MODELS = ["Xenova/dinov2-small", "onnx-community/dinov2-small-ONNX", "onnx-community/dinov2-small"];
let MODEL = FAKE ? MODELS[0] : "";
const MAX_MS = (+process.env.MAX_MINUTES || 300) * 60e3;
const CONC = +process.env.CONCURRENCY || 8;
const BATCH = 16;
const UA = "KitchenTable-card-index/1.0 (+https://github.com/lukermcqueen98-wq/kitchen-table)";
const started = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url){
  for (let i = 0; ; i++) {
    let r;
    try { r = await fetch(url, { headers:{ "User-Agent":UA, Accept:"application/json" } }); }
    catch (e) { if (i >= 4) throw e; await sleep(2000 * 2 ** i); continue; }  // network hiccup: retry
    if (r.ok) return await r.json();
    if ((r.status < 500 && r.status !== 429) || i >= 4) throw new Error(`HTTP ${r.status} for ${url}`);  // retry only busy or server errors
    await sleep(2000 * 2 ** i);
  }
}

// Scryfall's catalog of bulk downloads; the "unique_artwork" one has one entry per illustration
async function artworkListUrl(){
  const bulk = await getJSON("https://api.scryfall.com/bulk-data");
  const entry = (bulk?.data || []).find(b => b.type === "unique_artwork");
  if (!entry) throw new Error(`Scryfall's bulk data list has no unique_artwork entry (types: ${(bulk?.data || []).map(b => b.type).join(", ") || "none"})`);
  // The link has been called download_uri; look for it under any name, preferring a .json file off the API host
  const find = e => {
    const urls = [];
    const walk = v => { if (typeof v === "string" && /^https?:\/\//.test(v) && !/^https:\/\/api\.scryfall\.com\//.test(v)) urls.push(v); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
    if (e?.download_uri) urls.push(e.download_uri); else walk(e);
    return urls.find(u => /\.json(\.gz)?(\?|$)/.test(u)) || urls[0];
  };
  let url = find(entry);
  // No link in the catalog: the entry's own page (its uri) may have it
  if (!url && /^https:\/\/api\.scryfall\.com\//.test(entry.uri || "")) url = find(await getJSON(entry.uri));
  if (!url) throw new Error(`Scryfall's unique_artwork entry has no download link. Its fields: ${JSON.stringify(entry).slice(0, 800)}`);
  console.log(`Downloading Scryfall's artwork list from ${url} (${entry.size ? Math.round(entry.size / 1e6) + " MB, " : ""}updated ${entry.updated_at || "unknown"}).`);
  return url;
}
// A JSON array of cards, or JSON Lines (one card per line, what Scryfall's .jsonl files hold)
function parseCards(text){
  const t = text.trimStart();
  if (t.startsWith("[")) return JSON.parse(t);
  return t.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l));
}
// The artwork list, which may come gzip-compressed
async function getBigJSON(url){
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers:{ "User-Agent":UA, Accept:"application/json" } });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      let buf = Buffer.from(await r.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);  // gzip file, not undone by the transfer
      return parseCards(buf.toString("utf8"));
    } catch (e) { if (i >= 3) throw e; await sleep(5000 * 2 ** i); }
  }
}

// Every unique artwork printed on paper. Double-faced cards get one entry per face.
async function artworks(){
  const list = process.env.SCRYFALL_BULK_FILE
    ? parseCards(fs.readFileSync(process.env.SCRYFALL_BULK_FILE, "utf8"))
    : await getBigJSON(await artworkListUrl());
  if (!Array.isArray(list)) throw new Error(`Scryfall's artwork list isn't a list of cards (got ${typeof list}: ${JSON.stringify(list).slice(0, 300)})`);
  const out = new Map();
  for (const c of list) {
    if (c.digital || c.layout === "art_series" || !(c.games || []).includes("paper")) continue;
    const faces = c.image_uris ? [{ name:c.name, art:c.image_uris.art_crop }]
      : (c.card_faces || []).map(f => ({ name:f.name, art:f.image_uris?.art_crop }));
    faces.forEach((f, i) => { if (f.art && /^https?:\/\//.test(f.art)) out.set(`${c.id}:${i}`, { id:c.id, name:f.name, face:i, art:f.art }); });
  }
  return out;
}

function loadPrevious(){
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(OUT, "cards.json"), "utf8"));
    const bin = fs.readFileSync(path.join(OUT, "cards.bin"));
    const n = meta.cards.length, D = meta.dims;
    if (meta.model !== MODEL || !!meta.fake !== FAKE || bin.length !== n * 4 + n * D) return { dims:0, map:new Map() };
    const scales = new Float32Array(bin.buffer.slice(bin.byteOffset, bin.byteOffset + n * 4));
    const map = new Map();
    meta.cards.forEach((c, i) => map.set(`${c[0]}:${c[2] || 0}`, { s:scales[i], v:new Int8Array(bin.buffer.slice(bin.byteOffset + n * 4 + i * D, bin.byteOffset + n * 4 + (i + 1) * D)) }));
    return { dims:D, map };
  } catch { return { dims:0, map:new Map() }; }
}

function save(entries, dims){
  const list = [...entries.values()].filter(e => e.v);
  const n = list.length, bin = Buffer.alloc(n * 4 + n * dims);
  const scales = new Float32Array(n);
  list.forEach((e, i) => { scales[i] = e.s; bin.set(new Uint8Array(e.v.buffer, e.v.byteOffset, dims), n * 4 + i * dims); });
  bin.set(new Uint8Array(scales.buffer), 0);
  const meta = { model:MODEL, ...(FAKE ? { fake:true } : {}), dims, n, built:new Date().toISOString(), cards:list.map(e => [e.id, e.name, e.face]) };
  fs.mkdirSync(OUT, { recursive:true });
  // Write both files beside the old ones, then swap, so a cut-off run never leaves a half-written index
  fs.writeFileSync(path.join(OUT, "cards.bin.tmp"), bin);
  fs.writeFileSync(path.join(OUT, "cards.json.tmp"), JSON.stringify(meta));
  fs.renameSync(path.join(OUT, "cards.bin.tmp"), path.join(OUT, "cards.bin"));
  fs.renameSync(path.join(OUT, "cards.json.tmp"), path.join(OUT, "cards.json"));
  return n;
}

// Same recipe as fingerprints() in index.html: summary token and mean of the detail tokens, each normalized, summed, normalized
function fingerprints(out){
  const d = out.data, dims = out.dims, n = dims[0], D = dims[dims.length - 1], T = dims.length === 3 ? dims[1] : 1;
  const unit = v => { let ss = 0; for (let j = 0; j < v.length; j++) ss += v[j] * v[j]; const k = 1 / Math.sqrt(ss || 1); for (let j = 0; j < v.length; j++) v[j] *= k; return v; };
  const res = [];
  for (let i = 0; i < n; i++) {
    const base = i * T * D, v = unit(Float32Array.from(d.subarray(base, base + D)));
    if (T >= 2) {
      const mean = new Float32Array(D);
      for (let t = 1; t < T; t++) for (let j = 0; j < D; j++) mean[j] += d[base + t * D + j];
      unit(mean); for (let j = 0; j < D; j++) v[j] += mean[j]; unit(v);
    }
    res.push(v);
  }
  return res;
}
// One byte per value, scaled so this fingerprint's largest value uses the full range
function quantize(v){
  let m = 0; for (const x of v) m = Math.max(m, Math.abs(x));
  const s = 127 / (m || 1);
  return { s, v:Int8Array.from(v, x => Math.round(x * s)) };
}

// Stand-in model for offline tests: the image shrunk to 16x12, minus its average (matches the page's test stub)
async function fakeExtractor(images){
  const D = 16 * 12 * 3, out = new Float32Array(images.length * D);
  for (const [i, img] of images.entries()) {
    const t = await img.resize(16, 12), c = t.channels; let m = 0;
    for (let k = 0; k < 192; k++) for (let ch = 0; ch < 3; ch++) { const x = t.data[k * c + ch]; out[i * D + k * 3 + ch] = x; m += x; }
    m /= D; for (let j = 0; j < D; j++) out[i * D + j] -= m;
  }
  return { data:out, dims:[images.length, 1, D] };
}

// The art crop, shrunk to 240 pixels wide like the page does before fingerprinting
async function loadArt(url){
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers:{ "User-Agent":UA } });
      if (r.ok) { const img = await RawImage.fromBlob(await r.blob()); return await img.resize(240, Math.max(1, Math.round(img.height * 240 / img.width))); }
      if (r.status === 404) return null;
    } catch {}
    await sleep(1000 * 2 ** i);
  }
  return null;
}
async function mapPool(items, limit, fn){
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length:Math.min(limit, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } }));
  return out;
}

async function loadModel(){
  if (FAKE) return fakeExtractor;
  for (const m of MODELS) {
    try { const ext = await pipeline("image-feature-extraction", m, { dtype:"fp32" }); MODEL = m; console.log(`Using model ${m}.`); return ext; }
    catch (e) { console.log(`Model ${m} didn't load: ${e.message}`); }
  }
  throw new Error("None of the DINOv2-small models could be loaded.");
}

const all = await artworks();
const extractor = await loadModel();  // first, so the saved index is only reused if the same model made it
const prev = loadPrevious();
const entries = new Map();
for (const [k, a] of all) { const p = prev.map.get(k); entries.set(k, { ...a, s:p?.s, v:p?.v || null }); }
let dims = prev.dims;
const todo = [...entries.values()].filter(e => !e.v);
console.log(`${all.size} artworks on Scryfall, ${all.size - todo.length} already indexed, ${todo.length} to add.`);

if (todo.length) {
  const fetchChunk = i => mapPool(todo.slice(i, i + BATCH), CONC, e => loadArt(e.art));
  let added = 0, failed = 0, lastSave = Date.now(), nextImgs = fetchChunk(0);
  // A cancelled run gets a few seconds' notice: save what's done so the next run carries on from here
  for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, () => { console.log(`Stopped (${sig}). Saving progress.`); if (dims) save(entries, dims); process.exit(1); });
  for (let i = 0; i < todo.length; i += BATCH) {
    const imgs = await nextImgs;
    if (i + BATCH < todo.length) nextImgs = fetchChunk(i + BATCH);  // download the next batch while this one runs
    const chunk = todo.slice(i, i + BATCH), ok = chunk.map((e, j) => [e, imgs[j]]).filter(x => x[1]);
    failed += chunk.length - ok.length;
    if (ok.length) {
      const vecs = fingerprints(await extractor(ok.map(x => x[1])));
      if (!dims) dims = vecs[0].length;
      ok.forEach(([e], j) => Object.assign(e, quantize(vecs[j])));
      added += ok.length;
    }
    if (Date.now() - lastSave > 5 * 60e3) { save(entries, dims); lastSave = Date.now(); }
    if ((i / BATCH) % 25 === 0) console.log(`${added} added, ${failed} failed, ${todo.length - i - chunk.length} left, ${Math.round((Date.now() - started) / 60e3)} min`);
    if (Date.now() - started > MAX_MS) { console.log("Time limit reached. Saving; the next run continues from here."); break; }
  }
  console.log(`Added ${added} artworks, ${failed} couldn't be downloaded.`);
}
if (dims) console.log(`Index has ${save(entries, dims)} artworks (${dims} values each) in ${OUT}.`);
else console.log("Nothing to index.");
