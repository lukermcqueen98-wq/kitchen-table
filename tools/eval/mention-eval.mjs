/* How well cards named in table talk (without "I play") are picked out: sentences that name a card, and everyday talk
   that happens to contain a card name ("rest in peace", "order pizza"), against the benchmark's card names plus
   staples and card names that are everyday words or phrases.
   Usage: node tools/eval/mention-eval.mjs <bench-data dir> [heldout|all]   (all: tools/eval/mention-phrases.mjs)   (see tools/eval/fetch-data.mjs) */
import { PHRASES, PHRASE_CARDS } from "./mention-phrases.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const ROOT = path.resolve(import.meta.dirname, "..", ".."), DATA = process.argv[2] || "bench-data";
const list = process.env.FULL_NAMES ? { tests:[], extra:[] } : JSON.parse(fs.readFileSync(path.join(DATA, "list.json"), "utf8"));
const STAPLES = ["Sol Ring", "Rhystic Study", "Smothering Tithe", "Dark Ritual", "Counterspell", "Swords to Plowshares", "Atraxa, Praetors' Voice",
  "Cyclonic Rift", "Demonic Tutor", "Arcane Signet", "Mana Crypt", "Doubling Season", "Necropotence", "Craterhoof Behemoth", "Kodama's Reach",
  "Brainstorm", "Ponder", "Blood Moon", "Esper Sentinel", "Teferi's Protection", "Sheoldred, the Apocalypse", "Gwenom, Remorseless", "Skullclamp",
  // card names that are everyday words or phrases
  "Order // Chaos", "Rest in Peace", "Show and Tell", "Take Heart", "Last Chance", "Second Chance", "Hold the Line", "Stand Firm", "Balance", "Silence",
  "Time Walk", "Fact or Fiction", "Wheel of Fortune", "Explore", "Hurricane", "Tornado", "Opportunity", "Fling", "Consume", "Remand", "Pay No Heed",
  "Seize the Day", "Not of This World", "Sign in Blood", "Stone Rain", "Force of Will", "Mind Stone", "Heat Shimmer", "Stroke of Genius", "Deep Analysis",
  "Fire // Ice", "Life // Death", "Night // Day", "Wear // Tear", "Supply // Demand", "Give // Take", "Hit // Run", "Down // Dirty", "Far // Away",
  "Research // Development", "Trial // Error", "Crime // Punishment", "Boom // Bust", "Rough // Tumble", "Start // Finish", "Profit // Loss", "Status // Statue",
  "Turn // Burn", "Catch // Release", "Commit // Memory", "Reason // Believe", "Driven // Despair", "Struggle // Survive", "Heaven // Earth", "Onward // Victory",
  "Good Fortune", "Lucky Clover", "Game Plan", "Fresh Start", "Hard Evidence", "Big Score", "Final Fortune", "Last Stand", "Ancient Grudge", "Fog", "Opt", "Shock",
  "Duress", "Cultivate", "Harmonize", "Upheaval", "Armageddon", "Timetwister", "Doomsday", "Thoughtseize", "Preordain", "Wrath of God", "Living Death",
  "Sneak Attack", "Natural Order", "Past in Flames", "Mana Drain", "Birthing Pod", "Tooth and Nail", "Mind Twist", "Night's Whisper", "Dark Confidant", "Deal Damage", "Target Minotaur", "Combat Medic", "Life Goes On"];
// FULL_NAMES: a saved copy of Scryfall's full list of card names (api.scryfall.com/catalog/card-names), to test
// against every card in Magic instead of the benchmark's few thousand
const FULL = process.env.FULL_NAMES ? JSON.parse(fs.readFileSync(process.env.FULL_NAMES, "utf8")).data : null;
const NAMES = FULL || [...new Set([...list.tests, ...list.extra].map(x => x.name).concat(STAPLES, PHRASE_CARDS))].sort();
console.log(`${NAMES.length} card names${FULL ? " (all of Magic)" : ""}`);
const { chromium } = createRequire(path.join(ROOT, "tests") + "/")("@playwright/test");
// [what was said, cards that should pop up]
const cases = [
  ["that rhystic study is brutal", ["Rhystic Study"]],
  ["remember when sol ring was banned", ["Sol Ring"]],
  ["he tutored up demonic tutor again", ["Demonic Tutor"]],
  ["your smothering tithe is killing me", ["Smothering Tithe"]],
  ["okay swords to plowshares on your commander", ["Swords to Plowshares"]],
  ["with doubling season out this gets silly", ["Doubling Season"]],
  ["atraxa is so annoying", ["Atraxa, Praetors' Voice"]],
  ["cyclonic rift overloaded next turn", ["Cyclonic Rift"]],
  ["is that a mana crypt", ["Mana Crypt"]],
  ["the ristic study trigger", ["Rhystic Study"]],
  ["tapping sol ring and arcane signet", ["Sol Ring", "Arcane Signet"]],
  ["necropotence is nuts", ["Necropotence"]],
  ["he cast balance", ["Balance"]],
  ["tutor for show and tell", ["Show and Tell"]],
  ["my ponder resolves", ["Ponder"]],
  ["brainstorm in response", ["Brainstorm"]],
  ["he has craterhoof behemoth in hand", ["Craterhoof Behemoth"]],
  ["kodamas reach for two lands", ["Kodama's Reach"]],
  ["counterspell that", ["Counterspell"]],
  ["blood moon shuts off your lands", ["Blood Moon"]],
  ["sheoldred is on the battlefield", ["Sheoldred, the Apocalypse"]],
  ["esper sentinel trigger pay one", ["Esper Sentinel"]],
  ["counter it with force of will", ["Force of Will"]],
  ["i'm holding up mana drain", ["Mana Drain"]],
  ["wrath of god clears the board", ["Wrath of God"]],
  ["exile it with rest in peace out", ["Rest in Peace"]],
  ["flashback past in flames", ["Past in Flames"]],
  ["teferis protection saved me", ["Teferi's Protection"]],
  // everyday talk: nothing should pop up
  ["we should order pizza after this", []],
  ["rest in peace grandpa", []],
  ["can you show and tell me what happened", []],
  ["take heart buddy you'll draw out of it", []],
  ["this is your last chance", []],
  ["hold the line guys", []],
  ["stand firm", []],
  ["balance your budget", []],
  ["i need to ponder this", []],
  ["time walk me through it", []],
  ["that's a fact or fiction situation", []],
  ["wheel of fortune is on tv", []],
  ["silence please i can't hear", []],
  ["let's explore the options", []],
  ["we got a hurricane warning", []],
  ["what an opportunity", []],
  ["give me a second chance", []],
  ["that was a fresh start", []],
  ["it's a good fortune cookie", []],
  ["seize the day", []],
  ["night and day difference", []],
  ["research and development costs", []],
  ["trial and error", []],
  ["the game plan is simple", []],
  ["i hit the button and run", []],
  ["he's in the fog of war", []],
  ["what a shock", []],
  ["it's a real upheaval at work", []],
  ["sign in to blood bank", []],
  ["i have hard evidence", []],
  ["that's a big score", []],
  ["let's cultivate some patience", []],
  ["the stone rain came down", []],
  ["sneak attack on the left", []],
  ["deep analysis of the game", []],
  ["it's the natural order of things", []],
  ["my mind stone is broken", ["Mind Stone"]],
  // reported from a real game: rules talk that is also a card name
  ["i deal damage to target creature", []],
  ["deal damage to any target", []],
  ["it deals damage to each player", []],
  ["combat damage to a player", []],
  ["life goes on", []],
];
// Held out: written after the rules were tuned on the cases above, to check they hold on new sentences
const heldOut = [
  ["did you see that sol ring turn one", ["Sol Ring"]],
  ["i'm scared of your cyclonic rift", ["Cyclonic Rift"]],
  ["dark ritual into necropotence", ["Dark Ritual", "Necropotence"]],
  ["skullclamp is so busted", ["Skullclamp"]],
  ["does esper sentinel tax me", ["Esper Sentinel"]],
  ["i'd tutor for doubling season", ["Doubling Season"]],
  ["gwenom keeps drawing him cards", ["Gwenom, Remorseless"]],
  ["watch out for teferis protection", ["Teferi's Protection"]],
  ["he topdecked craterhoof behemoth", ["Craterhoof Behemoth"]],
  ["ponder into brainstorm", ["Ponder", "Brainstorm"]],
  ["kill it with wrath of god", ["Wrath of God"]],
  ["your blood moon wrecks my deck", ["Blood Moon"]],
  ["sheoldred makes me lose two each draw", ["Sheoldred, the Apocalypse"]],
  ["arcane signet for blue", ["Arcane Signet"]],
  ["cast living death", ["Living Death"]],
  ["i can't believe you did that", []],
  ["want another slice of pizza", []],
  ["the natural thing is to wait", []],
  ["my mind is blank", []],
  ["we need a game plan for tonight", []],
  ["that was a real shock to me", []],
  ["hold on let me get a drink", []],
  ["time to go home soon", []],
  ["that's the last stand for him", []],
  ["you have to balance work and life", []],
  ["deep down he knows", []],
  ["it was a trial run", []],
  ["research says coffee is good", []],
  ["what a lucky clover you found", []],
  ["fire and ice in the same storm", []],
  ["we had a fresh start this year", []],
  ["stone cold", []],
  ["the sneak attack worked in the movie", []],
  ["i won't take that chance", []],
  ["in the end he won", []],
];
const RUN = { heldout:heldOut, all:PHRASES }[process.argv[3]] || cases;
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname); const f = path.join(ROOT, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type":f.endsWith(".html") ? "text/html" : "application/javascript" }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(8799, "127.0.0.1", r));
const b = await chromium.launch(), page = await b.newPage();
await page.route(/api\.scryfall\.com/, r => r.request().url().includes("/catalog/card-names") ? r.fulfill({ status:200, contentType:"application/json", body:JSON.stringify({ data:NAMES }) })
  : r.request().url().includes("/catalog/") ? r.fulfill({ status:200, contentType:"application/json", body:'{"data":[]}' }) : r.fulfill({ status:404, body:"" }));
await page.route(/cdn\.jsdelivr|huggingface|fonts\.g|index\/cards/, r => r.fulfill({ status:404, body:"" }));
await page.goto("http://127.0.0.1:8799/index.html#kt-eval");
const out = await page.evaluate(async cases => { const res = []; for (const [said, want] of cases) res.push({ said, want, got:await window.ktEval.mentions(said) }); return res; }, RUN);
let hit = 0, pos = 0, fp = 0, neg = 0, extra = 0;
for (const r of out) {
  const ok = JSON.stringify([...r.got].sort()) === JSON.stringify([...r.want].sort());
  if (r.want.length) { pos++; hit += ok; } else { neg++; fp += r.got.length > 0; }
  if (r.want.length) extra += r.got.filter(g => !r.want.includes(g)).length;
  console.log(`${ok ? "✓" : "✗"}  "${r.said}" -> ${r.got.join(", ") || "-"}${ok ? "" : `   (want ${r.want.join(", ") || "nothing"})`}`);
}
console.log(`\nCard mentions found: ${hit}/${pos}. Everyday talk with a false popup: ${fp}/${neg}. Wrong extra cards on mention lines: ${extra}.`);
await b.close(); server.close();
