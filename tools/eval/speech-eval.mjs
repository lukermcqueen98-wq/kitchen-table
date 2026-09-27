/* How well spoken card names are recognized: misheard names (as speech recognition writes them) against the card
   names in the benchmark data plus some staples, old matching (caption linking) versus the closest-sounding search.
   Usage: node tools/eval/speech-eval.mjs <bench-data dir> [hard]   (hard: hard-to-pronounce names; see tools/eval/fetch-data.mjs) */
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const ROOT = path.resolve(import.meta.dirname, "..", ".."), DATA = process.argv[2] || "bench-data";
const list = JSON.parse(fs.readFileSync(path.join(DATA, "list.json"), "utf8"));
const STAPLES = ["Sol Ring","Rhystic Study","Smothering Tithe","Dark Ritual","Counterspell","Swords to Plowshares","The Ur-Dragon","Atraxa, Praetors' Voice","Cyclonic Rift","Demonic Tutor","Lightning Bolt","Arcane Signet","Command Tower","Esper Sentinel","Llanowar Elves","Birds of Paradise","Wrath of God","Path to Exile","Brainstorm","Ponder","Mystic Remora","Fierce Guardianship","Deflecting Swat","Jeweled Lotus","Mana Crypt","Chrome Mox","Gwenom, Remorseless","Commander's Sphere","Talisman of Dominance","Kodama's Reach","Cultivate","Beast Within","Chaos Warp","Teferi's Protection","Heroic Intervention","Eternal Witness","Sakura-Tribe Elder","Farseek","Nature's Lore","Three Visits","Skullclamp","Sensei's Divining Top","Kenrith, the Returned King","Edgar Markov","Krenko, Mob Boss","Yuriko, the Tiger's Shadow","Korvold, Fae-Cursed King","Sheoldred, the Apocalypse","Toxic Deluge","Blasphemous Act","Feed the Swarm","Rampant Growth","Harmonize","Phyrexian Arena","Necropotence","Bolas's Citadel","Doubling Season","Parallel Lives","Anointed Procession","Craterhoof Behemoth","Avenger of Zendikar","Rogue's Passage","Reliquary Tower","Exotic Orchard","Path of Ancestry","Evolving Wilds","Terramorphic Expanse","Beast","Cyclone","Wraith, Vicious Vigilante",
  // hard to pronounce
  "Xenagos, God of Revels","Chandra, Torch of Defiance","Ghave, Guru of Spores","Thassa's Oracle","Yawgmoth, Thran Physician","Phyrexian Altar",
  "Jhoira, Weatherlight Captain","Thrasios, Triton Hero","Tymna the Weaver","Kinnan, Bonder Prodigy","Najeela, the Blade-Blossom","Kaalia of the Vast",
  "Muldrotha, the Gravetide","Aesi, Tyrant of Gyre Strait","Niv-Mizzet, Parun","Urza, Lord High Artificer","Ulamog, the Infinite Gyre",
  "Kozilek, Butcher of Truth","Emrakul, the Aeons Torn","Tergrid, God of Fright","The Gitrog Monster","Brago, King Eternal","Oloro, Ageless Ascetic",
  "Syr Konrad, the Grim","Chulane, Teller of Tales","Lathril, Blade of the Elves","Jodah, the Unifier","Omnath, Locus of Creation","Tasigur, the Golden Fang",
  "Nekusar, the Mindrazer","Xyris, the Writhing Storm","Sythis, Harvest's Hand","Anhelo, the Painter","Isshin, Two Heavens as One","Ghalta, Primal Hunger",
  "Kykar, Wind's Fury","Tatyova, Benthic Druid","Queza, Augur of Agonies","Yuriko, the Tiger's Shadow","Teferi, Time Raveler","Liliana of the Veil"];
const NAMES = [...new Set([...list.tests, ...list.extra].map(x => x.name).concat(STAPLES))].sort();
const { chromium } = createRequire(path.join(ROOT, "tests") + "/")("@playwright/test");
// Hard-to-pronounce names, spelled the way speech recognition writes an American saying them
const HARD = [
 ["zen a goes god of revels","Xenagos, God of Revels"],["zena goes","Xenagos, God of Revels"],["shandra torch of defiance","Chandra, Torch of Defiance"],
 ["gav guru of spores","Ghave, Guru of Spores"],["gahv","Ghave, Guru of Spores"],["tassa's oracle","Thassa's Oracle"],["thasa oracle","Thassa's Oracle"],
 ["yog moth","Yawgmoth, Thran Physician"],["yog moth thran physician","Yawgmoth, Thran Physician"],["fire exian altar","Phyrexian Altar"],
 ["joy ra weatherlight captain","Jhoira, Weatherlight Captain"],["thrash e ohs","Thrasios, Triton Hero"],["tim na the weaver","Tymna the Weaver"],
 ["kin an bonder prodigy","Kinnan, Bonder Prodigy"],["na jeela","Najeela, the Blade-Blossom"],["kali a of the vast","Kaalia of the Vast"],
 ["mold rotha","Muldrotha, the Gravetide"],["ay see tyrant of gyre strait","Aesi, Tyrant of Gyre Strait"],["niv mizzet","Niv-Mizzet, Parun"],
 ["ursa lord high artificer","Urza, Lord High Artificer"],["you la mog","Ulamog, the Infinite Gyre"],["cozy leck butcher of truth","Kozilek, Butcher of Truth"],
 ["em ra cool","Emrakul, the Aeons Torn"],["ter grid god of fright","Tergrid, God of Fright"],["git rock monster","The Gitrog Monster"],
 ["brah go king eternal","Brago, King Eternal"],["o lorro","Oloro, Ageless Ascetic"],["sir conrad","Syr Konrad, the Grim"],["chew lane","Chulane, Teller of Tales"],
 ["la thrill blade of the elves","Lathril, Blade of the Elves"],["jo da the unifier","Jodah, the Unifier"],["om nath locus of creation","Omnath, Locus of Creation"],
 ["tazzy gur","Tasigur, the Golden Fang"],["neck user the mind razor","Nekusar, the Mindrazer"],["zeiris the writhing storm","Xyris, the Writhing Storm"],
 ["sith is harvest's hand","Sythis, Harvest's Hand"],["an hello the painter","Anhelo, the Painter"],["is shin two heavens as one","Isshin, Two Heavens as One"],
 ["gall ta primal hunger","Ghalta, Primal Hunger"],["kai car","Kykar, Wind's Fury"],["tat yova","Tatyova, Benthic Druid"],["kay za augur of agonies","Queza, Augur of Agonies"],
 ["your eco","Yuriko, the Tiger's Shadow"],["tef ferry time raveler","Teferi, Time Raveler"],["lily ana of the veil","Liliana of the Veil"],
];
const cases = process.argv[3] === "hard" ? HARD : [
 ["rhythmic study","Rhystic Study"],["sold ring","Sol Ring"],["soul ring","Sol Ring"],["smothering tie the","Smothering Tithe"],["smothering tides","Smothering Tithe"],
 ["counter spell","Counterspell"],["swords to plow shares","Swords to Plowshares"],["sword to plowshare","Swords to Plowshares"],["the ur dragon","The Ur-Dragon"],
 ["a tracks a","Atraxa, Praetors' Voice"],["cyclonic rip","Cyclonic Rift"],["lightning bold","Lightning Bolt"],["arcane cygnet","Arcane Signet"],["lana war elves","Llanowar Elves"],
 ["pat to exile","Path to Exile"],["mystic ramora","Mystic Remora"],["fierce guardian ship","Fierce Guardianship"],["jewel lotus","Jeweled Lotus"],["manna crypt","Mana Crypt"],
 ["code ama reach","Kodama's Reach"],["tafari's protection","Teferi's Protection"],["sakura tribe elder","Sakura-Tribe Elder"],["sensei divining top","Sensei's Divining Top"],
 ["can wreath","Kenrith, the Returned King"],["crank o mob boss","Krenko, Mob Boss"],["core vold","Korvold, Fae-Cursed King"],["shield red","Sheoldred, the Apocalypse"],
 ["toxic della rouge","Toxic Deluge"],["blast famous act","Blasphemous Act"],["crater hoof behemoth","Craterhoof Behemoth"],["rogues passage","Rogue's Passage"],
 ["necro potence","Necropotence"],["doubling seasons","Doubling Season"],["tree visits","Three Visits"],["skull clamp","Skullclamp"],["gwen um","Gwenom, Remorseless"],
 ["commander sphere","Commander's Sphere"],["esper sentinel and attack","Esper Sentinel"],["demonic tutor for a land","Demonic Tutor"],["dark ritual into","Dark Ritual"],
 ["beast within on your","Beast Within"],["chaos warp targeting","Chaos Warp"],["eternal witness to get back","Eternal Witness"],["rampant grow","Rampant Growth"],
 ["phyrexian arena","Phyrexian Arena"],["bowl lasses citadel","Bolas's Citadel"],
 ["a big green guy",""],["the thing from before",""],["this one now",""],["a creature that flies",""],
];
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname); const f = path.join(ROOT, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type":f.endsWith(".html") ? "text/html" : "application/javascript" }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(8798, "127.0.0.1", r));
const b = await chromium.launch(), page = await b.newPage();
await page.route(/api\.scryfall\.com/, r => r.request().url().includes("/catalog/card-names") ? r.fulfill({ status:200, contentType:"application/json", body:JSON.stringify({ data:NAMES }) })
  : r.request().url().includes("/catalog/") ? r.fulfill({ status:200, contentType:"application/json", body:'{"data":[]}' }) : r.fulfill({ status:404, body:"" }));
await page.route(/cdn\.jsdelivr|huggingface|fonts\.g|index\/cards/, r => r.fulfill({ status:404, body:"" }));
await page.goto("http://127.0.0.1:8798/index.html#kt-eval");
const out = await page.evaluate(async cases => {
  const E = window.ktEval, res = [];
  for (const [said, want] of cases) {
    const t0 = performance.now(), nc = await E.nearestCard(said), ms = performance.now() - t0, old = await E.linkCard(said);
    const newPick = nc && nc.score >= 0.72 && nc.margin >= 0.04 ? nc.name : "";
    res.push({ said, want, old:old?.card || "", neu:newPick, top:nc && `${nc.name} ${nc.score.toFixed(2)} (+${nc.margin.toFixed(2)} over ${nc.second})`, ms:Math.round(ms) });
  }
  return res;
}, cases);
let o = 0, n = 0;
for (const r of out) { const ok1 = r.old === r.want, ok2 = r.neu === r.want; o += ok1; n += ok2; console.log(`${ok1 ? "✓" : "✗"} ${ok2 ? "✓" : "✗"}  "${r.said}" -> old: ${r.old || "-"} | new: ${r.neu || "-"}   [${r.top}] ${r.ms}ms`); }
console.log(`old ${o}/${out.length}, new ${n}/${out.length}`);
await b.close(); server.close();
