#!/usr/bin/env node
/* Builds popular-names.json for the webcam table's card popups: for each short name several cards share ("Atraxa",
   "Sheoldred", "Krenko"), the one people play by far the most (EDHREC rank from Scryfall's oracle cards), so table
   talk that only says the short name can pop that one up when nobody at the table has shown which they mean.
   A short name is only listed when its most-played card is clearly ahead (ranked at least twice as high as the next).

   node tools/build-popular-names.mjs <out.json> [--oracle <Scryfall oracle-cards .json or .jsonl(.gz)>] */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2), out = args[0];
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : ""; };
if (!out) { console.error("Usage: node tools/build-popular-names.mjs <out.json> [--oracle <file>]"); process.exit(2); }
const UA = { "User-Agent":"KitchenTable/1.0 (popular names builder)", Accept:"application/json" };
const parse = buf => { if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf); const t = buf.toString("utf8").trimStart(); return t.startsWith("[") ? JSON.parse(t) : t.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l)); };
async function oracle(){
  if (opt("--oracle")) return parse(fs.readFileSync(opt("--oracle")));
  const bulk = await (await fetch("https://api.scryfall.com/bulk-data", { headers:UA })).json();
  const entry = (bulk?.data || []).find(b => b.type === "oracle_cards");
  const urls = []; const walk = v => { if (typeof v === "string" && /^https?:\/\//.test(v) && !/^https:\/\/api\.scryfall\.com\//.test(v)) urls.push(v); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  if (entry?.download_uri) urls.push(entry.download_uri); else walk(entry);
  const url = urls.find(u => /\.json(l)?(\.gz)?(\?|$)/.test(u)) || urls[0];
  if (!url) throw new Error("Scryfall's bulk data list has no oracle cards file.");
  console.log(`Downloading ${url}...`);
  const r = await fetch(url, { headers:UA }); if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return parse(Buffer.from(await r.arrayBuffer()));
}
// (the same as norm() in index.html)
const norm = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9/]+/g, " ").trim();

const cards = await oracle();
const groups = new Map();
for (const c of cards) {
  if (!c?.name || c.layout === "art_series" || /token/.test(c.layout || "") || !c.games?.includes("paper") && c.digital) continue;
  for (const face of c.name.split(" // ")) {
    const keys = new Set([norm(face)]);
    if (face.includes(",")) { const sh = norm(face.split(",")[0]); if (sh.length >= 4) keys.add(sh); }
    for (const k of keys) { if (!groups.has(k)) groups.set(k, new Map()); groups.get(k).set(face, Math.min(groups.get(k).get(face) ?? Infinity, c.edhrec_rank ?? Infinity)); }
  }
}
const names = {};
for (const [k, faces] of groups) {
  if (faces.size < 2) continue;
  const ranked = [...faces].sort((a, b) => a[1] - b[1]);
  const [best, next] = ranked;
  if (best[1] === Infinity || !(best[1] * 2 <= next[1])) continue;
  names[k] = best[0];
}
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive:true });
fs.writeFileSync(out, JSON.stringify({ built:new Date().toISOString().slice(0, 10), names }));
console.log(`${Object.keys(names).length} short names with a clear favorite. ${["atraxa", "sheoldred", "krenko", "korvold", "urza", "yuriko"].map(k => `${k}: ${names[k] || "-"}`).join("; ")}`);
