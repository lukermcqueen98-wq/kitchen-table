import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// Gamma Card is a 3/4 creature in the test cards
const DECK = `12 Gamma Card
18 Forest`;
const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
// Put a card from the library straight into a zone (so the test doesn't depend on the shuffle)
const fetchTo = (page, name, zone) => ktp(page, ([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); return c.iid; }, [name, zone]);

test("digital table: undo, casting, and combat by hand (arrows)", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", DECK); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", DECK); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game" }).click();  // (house rules first)
  for (const p of [a, b]) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await expect(a.locator("#hand .card")).toHaveCount(7);

  // Undo: playing a card and undoing it puts it back in hand, on both screens
  await a.locator("#hand .card").first().dblclick();
  await expect(opp(b, "Luke").locator(".obf .card")).toHaveCount(1);
  await a.click("#undoBtn");
  await expect(a.locator("#hand .card")).toHaveCount(7);
  await expect(a.locator("#bf .card")).toHaveCount(0);
  await expect(opp(b, "Luke").locator(".obf .card")).toHaveCount(0);
  await expect(b.locator("#log li").last()).toContainText("Luke undid their last move");
  // ...and Ctrl+Z works too
  await a.locator("#hand .card").first().dblclick(); await expect(a.locator("#bf .card")).toHaveCount(1);
  await a.keyboard.press("Control+z"); await expect(a.locator("#bf .card")).toHaveCount(0);

  // Casting (no stack): a creature cast from hand goes straight onto the battlefield; the combat bar only shows in combat
  await expect(a.locator("#stackCards")).toHaveCount(0);
  await expect(a.locator("#combatBar")).toBeHidden();
  const bear = await fetchTo(a, "Gamma Card", "hand");
  await a.locator(`#hand .card[data-iid="${bear}"]`).dblclick();
  await expect(a.locator(`#bf .card[data-iid="${bear}"]`)).toHaveCount(1);
  await expect(opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`)).toHaveCount(1);

  // Combat by hand: Luke attacks Rick from the creature's menu; an arrow points at Rick on both screens, nothing taps
  const turn = await ktp(a, () => ktPlay.table.turnSeat);
  if (turn !== 1) { await b.click("#nextTurn"); await expect(a.locator("#turnInfo")).toContainText("Your turn"); }
  await expect(a.locator("#attackBtn")).toHaveCount(0); await expect(a.locator("#dmgBtn")).toHaveCount(0); await expect(a.locator("#combatBtn")).toHaveCount(0);
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);
  await expect(a.locator(`#bf .card[data-iid="${bear}"].tapped`)).toHaveCount(0);
  for (const p of [a, b]) await expect(p.locator("#arrows > path:not(.blockline)")).toHaveCount(1);
  await expect(b.locator("#combatNote")).toContainText("1 attacking you");
  await expect(b.locator("#log")).toContainText("Luke attacked Rick with Gamma Card.");
  // Rick blocks from the attacker's menu: an arrow from his creature to it; damage and life are by hand
  const wall = await fetchTo(b, "Gamma Card", "bf");
  await opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Gamma Card" }).click();
  await expect(b.locator(`#bf .card[data-iid="${wall}"].blocking`)).toHaveCount(1);
  for (const p of [a, b]) await expect(p.locator("#arrows > path.blockline")).toHaveCount(1);
  await expect(b.locator("#lifeOut")).toHaveText("20");
  // Clear arrows takes back Luke's attack; a new one, then the turn passing clears it
  await a.click("#clearArrowsBtn");
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(0);
  await expect(a.locator("#arrows > path:not(.blockline)")).toHaveCount(0);
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await expect(b.locator("#combatNote")).toContainText("1 attacking you");
  // ...a blocker can also pick the attacker by clicking it (Block...)
  await b.locator(`#bf .card[data-iid="${wall}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Block... (click the attacker)" }).click();
  await opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`).click();
  await expect(b.locator(`#bf .card[data-iid="${wall}"].blocking`)).toHaveCount(1);
  await a.click("#nextTurn");
  // (ending the turn with more than 7 cards asks for discards: keep them)
  const keep = a.locator(".modal").getByRole("button", { name:"Keep them (no maximum hand size)" }); if (await keep.isVisible().catch(() => false)) await keep.click();
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(0);
  await expect(b.locator(`#bf .card.blocking`)).toHaveCount(0);
  await expect(a.locator("#arrows > path")).toHaveCount(0);

  // The library: a single click doesn't draw (it says how); a double-click does
  const before = await a.locator("#hand .card").count();
  await a.locator("#libPile").click();
  await expect(a.locator("#toast")).toContainText("Double-click your library to draw");
  await expect(a.locator("#hand .card")).toHaveCount(before);
  await a.locator("#libPile").dblclick();
  await expect(a.locator("#hand .card")).toHaveCount(before + 1);

  // Looking at the top 3: take one into hand, the rest to the bottom in a random order
  const [hand0, lib0] = await ktp(a, () => [ktPlay.me.zones.hand.length, ktPlay.me.zones.lib.length]);
  const top3 = await ktp(a, () => ktPlay.me.zones.lib.slice(0, 3).map(c => c.iid));
  await a.locator("#libPile").click({ button:"right" });
  await a.getByRole("menuitem", { name:"Look at the top cards (take some, the rest to the bottom or top)..." }).click();
  await a.fill(".modal input[type=number]", "3"); await a.locator(".modal").getByRole("button", { name:"OK", exact:true }).click();
  await expect(a.locator(".modal-card h2")).toHaveText("Top 3 cards");
  await a.locator(".modal .gcard").first().getByRole("button", { name:"Hand" }).click();
  await expect(a.locator(".modal .gcard").first().getByRole("button", { name:"✓ Hand" })).toHaveCount(1);
  await a.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
  expect(await ktp(a, () => [ktPlay.me.zones.hand.length, ktPlay.me.zones.lib.length])).toEqual([hand0 + 1, lib0 - 1]);
  expect(await ktp(a, t => ktPlay.me.zones.hand.some(c => c.iid === t[0]) && ktPlay.me.zones.lib.slice(-2).every(c => t.slice(1).includes(c.iid)), top3)).toBe(true);
  await expect(b.locator("#log li").last()).toContainText("Luke looked at the top 3 cards of their library, put 1 card into their hand, and put the rest (2) on the bottom in a random order.");

  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
