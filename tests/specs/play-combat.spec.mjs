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

test("digital table: undo, casting, and combat", async () => {
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

  // Combat: Luke attacks Rick with the button; the attacker is marked on both screens and taps
  const turn = await ktp(a, () => ktPlay.table.turnSeat);
  if (turn !== 1) { await b.click("#nextTurn"); await expect(a.locator("#turnInfo")).toContainText("Your turn"); }
  await a.click("#attackBtn");
  await a.locator(`#bf .card[data-iid="${bear}"]`).click();
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking.tapped`)).toHaveCount(1);
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(1);
  await expect(b.locator("#combatNote")).toContainText("1 attacking you");
  await a.click("#attackBtn");  // done attacking
  // Unblocked: Luke asks for combat damage; only Rick, the defender, decides, on his combat screen
  await a.click("#dmgBtn");
  await expect(b.locator(".modal-card h2")).toHaveText("Combat: you're being attacked");
  await expect(b.locator(".modal .frow")).toContainText("Unblocked: 3 to you.");
  await expect(b.locator("#lifeOut")).toHaveText("20");
  await b.locator(".modal").getByRole("button", { name:"Take 3 damage" }).click();
  await expect(b.locator("#lifeOut")).toHaveText("17");
  await expect(a.locator("#log")).toContainText("Rick took 3 combat damage");
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(0);

  // Blocked from the attacker's menu (right-click): a 3/4 into a 3/4, both survive and nothing gets through
  const wall = await fetchTo(b, "Gamma Card", "bf");
  const untap = () => ktp(a, iid => { ktPlay.me.zones.bf.find(c => c.iid === iid).tapped = false; }, bear);
  await untap();
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await expect(opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);  // (Rick sees the attack first)
  await opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Gamma Card" }).click();
  await expect(b.locator(`#bf .card[data-iid="${wall}"].blocking`)).toHaveCount(1);
  await expect(a.locator("#arrows > path.blockline")).toHaveCount(1);
  // (Rick doesn't have to wait to be asked: Take or block on the combat bar)
  await b.click("#defendBtn");
  await expect(b.locator(".modal .frow")).toContainText("Gamma Card survives. Your Gamma Card survives.");
  await b.locator(".modal").getByRole("button", { name:"Apply (no damage to you)" }).click();
  await expect(b.locator(`#bf .card.blocking`)).toHaveCount(0);
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(0);
  await expect(b.locator("#lifeOut")).toHaveText("17");

  // Blocking on the combat screen: Luke's creature is pumped to 5/6, so Rick's blocker dies (and goes to his graveyard)
  await untap();
  await ktp(a, iid => { ktPlay.me.zones.bf.find(c => c.iid === iid).eot = [2, 2]; }, bear);
  await a.click("#attackBtn"); await a.click("#allInBtn");  // (Attack with all: his only creature)
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);
  await a.click("#attackBtn");
  await a.click("#dmgBtn");
  await expect(b.locator(".modal .frow")).toContainText("Unblocked: 5 to you.");
  await b.locator(".modal select[aria-label='Block Gamma Card with']").selectOption(wall);
  await expect(b.locator(".modal .frow")).toContainText("Gamma Card survives. Your Gamma Card dies.");
  await expect(b.locator(".modal .fsum")).toContainText("You take 0. Your Gamma Card dies.");
  await b.locator(".modal").getByRole("button", { name:"Apply (no damage to you)" }).click();
  await expect(b.locator(`#bf .card[data-iid="${wall}"]`)).toHaveCount(0);
  await expect(b.locator("#gyPile")).toContainText("Graveyard 1");
  await expect(a.locator(`#bf .card[data-iid="${bear}"]`)).toHaveCount(1);

  // A fourth attack: Rick takes none (as with a fog); and Luke can call off an attack
  await untap();
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await b.locator("#defendBtn").click();
  await b.locator(".modal").getByRole("button", { name:"Take no damage" }).click();
  await expect(b.locator("#lifeOut")).toHaveText("17");
  await expect(a.locator("#log")).toContainText("Rick took no combat damage.");
  await untap();
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await a.click("#calloffBtn");
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(0);

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

  // The fight rules the combat screen works out
  const f = (att, ...bl) => ktp(a, ([att, bl]) => { const r = ktPlay.fight(att, bl); return [r.toYou, r.attDies, r.deadBlockers.length, r.attGain, r.blkGain]; }, [att, bl]);
  const C = (p, t, ...kw) => ({ p, t, kw });
  expect(await f(C(5, 5, "Trample"), C(2, 2))).toEqual([3, false, 1, 0, 0]);           // trample: the excess gets through
  expect(await f(C(1, 1, "Deathtouch"), C(5, 5))).toEqual([0, true, 1, 0, 0]);        // deathtouch kills the big blocker
  expect(await f(C(3, 3, "First strike"), C(2, 3))).toEqual([0, false, 1, 0, 0]);     // first strike: the blocker dies before hitting back
  expect(await f(C(2, 2, "Double strike"))).toEqual([4, false, 0, 0, 0]);             // double strike, unblocked
  expect(await f(C(4, 4), C(2, 2, "Indestructible"))).toEqual([0, false, 0, 0, 0]);   // indestructible survives
  expect(await f(C(3, 3, "Lifelink"))).toEqual([3, false, 0, 3, 0]);                  // lifelink: the attacker's player gains
  expect(await f(C(4, 4), C(2, 2), C(2, 2))).toEqual([0, true, 2, 0, 0]);             // two blockers share the damage
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
