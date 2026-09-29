#!/usr/bin/env node
/* Builds precons.json for the digital table's deck picker: every official preconstructed Commander deck and every
   official 60-card deck (starter kits, challenger decks, planeswalker decks, theme decks and so on) from MTGJSON,
   each with a description written from its cards (Scryfall's oracle data): colors, commander, main themes, the
   main creature type, land count, average mana value, and whether it's legal in Standard right now.

   node tools/build-precons.mjs <out.json> [--decks <folder of MTGJSON deck files>] [--oracle <Scryfall oracle-cards .json>]

   Without --decks, MTGJSON's deck list and each deck file are downloaded; without --oracle, Scryfall's oracle cards
   bulk file is downloaded. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2), out = args[0];
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : ""; };
if (!out) { console.error("Usage: node tools/build-precons.mjs <out.json> [--decks <dir>] [--oracle <file>]"); process.exit(2); }
const UA = { "User-Agent":"KitchenTable/1.0 (precon builder)", Accept:"application/json" };
async function getJson(url, tries = 3){
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { headers:UA }); if (!r.ok) throw new Error(`${r.status} ${url}`); return await r.json(); }
    catch (e) { if (i >= tries) throw e; await new Promise(r => setTimeout(r, 1500 * i)); }
  }
}

/* ---------- The decks ---------- */
// Products that aren't a whole deck (half decks, boosters, sample packs, box sets, Secret Lair drops). Every other
// official deck is kept if it's a Commander deck (about 100 cards) or a 60-card deck (55 to 80 cards).
// Also left out: land packs (only lands), Shandalar's computer opponents (from the 1997 video game, never sold), and
// challenge decks (a boss deck played by rules of its own, like fighting the Hydra).
const SKIP = /jumpstart|box set|secret lair|sample|halfdeck|half deck|spellbook|welcome booster|demo|land pack|shandalar|challenge deck/i;
const BEGINNER = /starter|welcome|game night|intro|planeswalker deck|theme deck|challenger/i;
async function loadDecks(){
  const dir = opt("--decks");
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes:true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".json")) files.push(p); } };
  if (dir && fs.existsSync(dir)) walk(dir);
  if (files.length) return files.map(f => { try { return JSON.parse(fs.readFileSync(f, "utf8")).data; } catch { return null; } }).filter(d => d?.mainBoard);
  if (dir) console.log(`No deck files in ${dir}; downloading them one by one.`);
  const list = (await getJson("https://mtgjson.com/api/v5/DeckList.json")).data.filter(d => !SKIP.test(d.type || ""));
  console.log(`Downloading ${list.length} deck files from MTGJSON...`);
  const decks = []; let next = 0;
  await Promise.all(Array.from({ length:6 }, async () => {
    while (next < list.length) {
      const d = list[next++];
      try { decks.push((await getJson(`https://mtgjson.com/api/v5/decks/${encodeURIComponent(d.fileName)}.json`)).data); }
      catch (e) { console.warn(`  skipped ${d.name}: ${e.message}`); }
    }
  }));
  return decks;
}

/* ---------- The cards ---------- */
async function loadOracle(){
  const file = opt("--oracle");
  let cards;
  if (file) cards = JSON.parse(fs.readFileSync(file, "utf8"));
  else {
    // (as in build-index.mjs: the link may not be called download_uri, and the file may be gzipped JSON Lines)
    const bulk = await getJson("https://api.scryfall.com/bulk-data");
    const entry = (bulk?.data || []).find(b => b.type === "oracle_cards");
    if (!entry) throw new Error(`Scryfall's bulk data list has no oracle_cards entry (types: ${(bulk?.data || []).map(b => b.type).join(", ") || "none"})`);
    const find = e => {
      const urls = [];
      const walk = v => { if (typeof v === "string" && /^https?:\/\//.test(v) && !/^https:\/\/api\.scryfall\.com\//.test(v)) urls.push(v); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
      if (e?.download_uri) urls.push(e.download_uri); else walk(e);
      return urls.find(u => /\.json(l)?(\.gz)?(\?|$)/.test(u)) || urls[0];
    };
    let url = find(entry);
    if (!url && /^https:\/\/api\.scryfall\.com\//.test(entry.uri || "")) url = find(await getJson(entry.uri));
    if (!url) throw new Error(`Scryfall's oracle_cards entry has no download link. Its fields: ${JSON.stringify(entry).slice(0, 800)}`);
    console.log(`Downloading Scryfall's oracle cards from ${url}...`);
    const r = await fetch(url, { headers:UA }); if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    let buf = Buffer.from(await r.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
    const t = buf.toString("utf8").trimStart();
    cards = t.startsWith("[") ? JSON.parse(t) : t.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l));
  }
  const byName = new Map();
  for (const c of cards) {
    if (!c?.name || c.layout === "art_series" || c.layout === "token" || c.layout === "double_faced_token") continue;
    byName.set(c.name.toLowerCase(), c);
    if (c.name.includes(" // ")) { const front = c.name.split(" // ")[0].toLowerCase(); if (!byName.has(front)) byName.set(front, c); }
  }
  return byName;
}

/* ---------- Describing a deck ---------- */
const COLOR_WORD = { W:"white", U:"blue", B:"black", R:"red", G:"green" };
const PAIRS = { WU:"Azorius", UB:"Dimir", BR:"Rakdos", RG:"Gruul", WG:"Selesnya", WB:"Orzhov", UR:"Izzet", BG:"Golgari", WR:"Boros", UG:"Simic",
  WUG:"Bant", WUB:"Esper", UBR:"Grixis", BRG:"Jund", WRG:"Naya", WBG:"Abzan", WUR:"Jeskai", UBG:"Sultai", WBR:"Mardu", URG:"Temur" };
const ORDER = "WUBRG";
function colorName(cs){
  const k = [...new Set(cs)].filter(c => ORDER.includes(c)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join("");
  if (!k) return "Colorless";
  if (k.length === 1) return `Mono-${COLOR_WORD[k]}`;
  if (k.length === 5) return "Five-color";
  const words = [...k].map(c => COLOR_WORD[c]).join("-");
  if (k.length === 4) return `Four-color (${words})`;
  return `${PAIRS[k] || words} (${words})`;
}
// What a deck is about, from its cards' rules text; [phrase, test, how many cards it takes]
const THEMES = [
  ["making tokens", c => /\bcreate[s]?\b[^.]*\btokens?\b/i.test(c.text), 6],
  ["+1/+1 counters", c => /\+1\/\+1 counter/i.test(c.text), 6],
  ["the graveyard", c => /from (your|a|their) graveyard|\bmill\b|into (your|their) graveyard/i.test(c.text), 6],
  ["sacrificing creatures", c => /sacrifice (a|another|two|x)?\s*(creature|permanent|artifact)/i.test(c.text), 5],
  ["drawing cards", c => /\bdraws? (a|two|three|x|that many) cards?/i.test(c.text), 9],
  ["gaining life", c => /\bgain(s)? (\d+|x|that much) life|\blifelink\b/i.test(c.text), 6],
  ["artifacts", c => /\bArtifact\b/.test(c.type) || /\bartifacts?\b/i.test(c.text), 12],
  ["enchantments", c => /\bEnchantment\b/.test(c.type) || /\benchantments?\b/i.test(c.text), 12],
  ["instants and sorceries", c => /\b(Instant|Sorcery)\b/.test(c.type), 16],
  ["flying creatures", c => /\bCreature\b/.test(c.type) && c.keywords.includes("Flying"), 8],
  ["ramp (extra mana)", c => !/\bLand\b/.test(c.type) && (/\badd \{|add (one|two|three) mana/i.test(c.text) || /search your library for [^.]*\bland/i.test(c.text)), 8],
  ["direct damage", c => /deals? (\d+|x) damage to (any target|each opponent|target player|each creature|target creature)/i.test(c.text), 6],
  ["removal", c => /\b(destroy|exile) target\b/i.test(c.text), 7],
  ["big creatures", c => /\bCreature\b/.test(c.type) && +c.power >= 5, 7],
  ["spells from exile and copying", c => /\bcopy (target|that|it)\b|cast [^.]* from exile/i.test(c.text), 5],
  ["attacking", c => /whenever [^.]*attacks|\b(haste|double strike|menace|trample)\b/i.test(c.text), 10]];
const GENERIC_TYPES = new Set(["Human", "Soldier", "Warrior", "Wizard", "Cleric", "Rogue", "Shaman", "Knight", "Scout", "Advisor", "Citizen", "Peasant", "Druid", "Monk", "Artificer", "Noble", "Berserker", "Assassin", "Mercenary", "Pirate"]);
const plural = t => /(f|fe)$/.test(t) ? t.replace(/fe?$/, "ves") : /(s|x|ch|sh)$/.test(t) ? t + "es" : /[^aeiou]y$/.test(t) ? t.slice(0, -1) + "ies" : /^(Elf|Dwarf)$/.test(t) ? t.slice(0, -1) + "ves" : t + "s";

function describe(deck, info){
  const all = [];
  for (const { c, count } of deck.main) if (c) for (let k = 0; k < count; k++) all.push(c);
  const nonland = all.filter(c => !/\bLand\b/.test(c.type)), creatures = nonland.filter(c => /\bCreature\b/.test(c.type));
  const lands = all.length - nonland.length, mv = nonland.length ? nonland.reduce((a, c) => a + c.mv, 0) / nonland.length : 0;
  const colors = deck.cmdr.length ? deck.cmdr.flatMap(c => c?.ci || []) : all.flatMap(c => c.ci);
  const lines = [];
  if (deck.fmt === "cmdr") {
    const cmdrs = deck.cmdr.filter(Boolean);
    lines.push(`${colorName(colors)} Commander deck${deck.year ? ` (${deck.year})` : ""}${cmdrs.length ? `, led by ${cmdrs.map(c => c.name).join(" and ")}` : ""}.`);
    // (its first real ability: not a line of keywords like "Flying, vigilance", reminder text or Partner)
    const t = cmdrs[0]?.text?.split("\n").find(l => /[.:]/.test(l) && l.length > 20 && !/^\(|^(Partner|Choose a Background)/.test(l));
    if (t) lines.push(`Commander: ${t.length > 170 ? t.slice(0, 167).replace(/\s+\S*$/, "") + "..." : t}`);
  } else lines.push(`${colorName(colors)} ${deck.type} (60-card${deck.year ? `, ${deck.year}` : ""}).`);
  // Themes (distinct cards, not copies)
  const uniq = [...new Map(nonland.map(c => [c.name, c])).values()];
  const themes = THEMES.map(([p, test, need]) => [p, uniq.filter(test).length, need]).filter(([, n, need]) => n >= Math.max(3, Math.round(need * (deck.fmt === "cmdr" ? 1 : 0.6))))
    .sort((a, b) => b[1] / b[2] - a[1] / a[2]).slice(0, 3).map(([p]) => p);
  if (themes.length) lines.push(`Focus: ${themes.join(", ")}.`);
  const tribe = new Map();
  for (const c of creatures) for (const t of (c.type.split(" — ")[1] || "").split(/\s+/).filter(Boolean)) tribe.set(t, (tribe.get(t) || 0) + 1);
  const top = [...tribe.entries()].filter(([t]) => !GENERIC_TYPES.has(t)).sort((a, b) => b[1] - a[1])[0];
  const tribal = top && top[1] >= Math.max(6, creatures.length * 0.3) ? ` (mostly ${plural(top[0])})` : "";
  lines.push(`${creatures.length} creatures${tribal}, ${lands} lands, average mana value ${mv.toFixed(1)}.`);
  if (/mtgo|arena|digital|duel of the planeswalkers|enhanced deck|advanced deck/i.test(deck.type)) lines.push("First released as a digital-only deck.");
  if (/world championship|pro tour/i.test(deck.type)) lines.push("A championship deck (gold-bordered in paper, so not tournament legal there).");
  if (/planechase/i.test(deck.type)) lines.push("Its planes aren't part of the deck here.");
  if (/archenemy/i.test(deck.type)) lines.push("Its schemes aren't part of the deck here.");
  if (deck.fmt === "sixty") lines.push(info.std ? "Legal in Standard." : "Not legal in Standard any more (fine for casual games).");
  return lines.join(" ");
}

/* ---------- Build ---------- */
const [raw, oracle] = await Promise.all([loadDecks(), loadOracle()]);
const find = n => oracle.get(String(n || "").toLowerCase()) || oracle.get(String(n || "").split(" // ")[0].toLowerCase());
const slim = c => c && {
  name:c.name, type:String(c.type_line || c.card_faces?.[0]?.type_line || ""), mv:+c.cmc || 0, ci:c.color_identity || [], keywords:c.keywords || [],
  text:String(c.oracle_text ?? c.card_faces?.map(f => f.oracle_text).join("\n") ?? ""), power:c.power ?? c.card_faces?.[0]?.power,
  std:c.legalities?.standard === "legal", rarity:c.rarity,
  art:(c.image_uris || c.card_faces?.[0]?.image_uris)?.art_crop || "" };
const names = [], nameIx = new Map();
const ix = n => { if (!nameIx.has(n)) { nameIx.set(n, names.length); names.push(n); } return nameIx.get(n); };
const decks = [], missing = new Set(), seen = new Set();
for (const d of raw) {
  if (!d?.name || SKIP.test(d.type || "")) continue;
  const board = list => (Array.isArray(list) ? list : []).filter(c => c?.name && +c.count > 0).map(c => ({ name:c.name, count:+c.count, c:slim(find(c.name)) }));
  const cmdr = board(d.commander), main = board(d.mainBoard), side = board(d.sideBoard);
  const size = main.reduce((a, x) => a + x.count, 0) + cmdr.reduce((a, x) => a + x.count, 0);
  const isC = /commander/i.test(d.type || "") || (cmdr.length > 0 && size >= 95);
  if (isC ? size < 95 || size > 101 : size < 55 || size > 80) continue;
  const key = `${d.name}|${d.code}|${size}`; if (seen.has(key)) continue; seen.add(key);
  for (const x of [...cmdr, ...main, ...side]) if (!x.c) missing.add(x.name);
  const std = !isC && [...main, ...side].every(x => x.c?.std);
  const face = isC ? cmdr[0]?.c : [...main.map(x => x.c)].filter(c => c && !/\bLand\b/.test(c.type) && /mythic|rare/.test(c.rarity || "")).sort((a, b) => b.mv - a.mv)[0];
  const info = { fmt:isC ? "cmdr" : "sixty", std, type:d.type || "Deck", year:String(d.releaseDate || "").slice(0, 4), cmdr:cmdr.map(x => x.c) };
  const colors = isC ? cmdr.flatMap(x => x.c?.ci || []) : main.flatMap(x => x.c?.ci || []);
  decks.push({
    name:d.name, set:String(d.code || "").toUpperCase(), date:d.releaseDate || "", type:d.type || "Deck", fmt:info.fmt, std,
    beginner:!isC && BEGINNER.test(d.type || ""), colors:ORDER.split("").filter(c => colors.includes(c)).join(""), size,
    art:String(face?.art || "").replace(/^https:\/\/cards\.scryfall\.io\//, ""),
    cmdr:cmdr.map(x => ix(x.name)), main:main.flatMap(x => [ix(x.name), x.count]), side:side.flatMap(x => [ix(x.name), x.count]),
    desc:describe({ ...info, main }, { std }) });
}
decks.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive:true });
fs.writeFileSync(out, JSON.stringify({ built:new Date().toISOString().slice(0, 10), names, decks }));
const count = f => decks.filter(f).length;
console.log(`${decks.length} decks: ${count(d => d.fmt === "cmdr")} Commander, ${count(d => d.std)} Standard-legal, ${count(d => d.fmt === "sixty" && !d.std)} other 60-card. ${names.length} card names, ${Math.round(fs.statSync(out).size / 1024)} KB.`);
if (missing.size) console.log(`Cards Scryfall didn't match (${missing.size}): ${[...missing].slice(0, 20).join(", ")}${missing.size > 20 ? "..." : ""}`);
for (const d of [decks.find(d => d.fmt === "cmdr"), decks.find(d => d.std), decks.find(d => d.fmt === "sixty" && !d.std)].filter(Boolean)) console.log(`- ${d.name}: ${d.desc}`);
if (!decks.length) process.exit(1);
