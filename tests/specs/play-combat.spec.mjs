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
  // Unblocked: Luke asks for combat damage; only Rick, the defender, decides, and takes Gamma Card's 3
  await a.click("#dmgBtn");
  await expect(a.locator(".modal")).toContainText("Rick takes 3");
  await expect(a.locator(".modal").getByRole("button", { name:"Deal the damage" })).toHaveCount(0);  // (the attacker can't put it on him)
  await a.locator(".modal").getByRole("button", { name:"Ask them to take it" }).click();
  await expect(b.locator(".modal-card h2")).toHaveText("You're being attacked (3 unblocked)");
  await expect(b.locator("#lifeOut")).toHaveText("20");
  await b.locator(".modal").getByRole("button", { name:"Take 3 damage" }).click();
  await expect(b.locator("#lifeOut")).toHaveText("17");
  await expect(a.locator("#log")).toContainText("Rick took 3 combat damage");
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(0);

  // Blocked: Rick blocks with his own Gamma Card from Luke's attacker's menu; no damage gets through
  const wall = await fetchTo(b, "Gamma Card", "bf");
  await ktp(a, iid => { ktPlay.me.zones.bf.find(c => c.iid === iid).tapped = false; }, bear);
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await expect(opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);  // (Rick sees the attack first)
  await opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Gamma Card" }).click();
  await expect(b.locator(`#bf .card[data-iid="${wall}"].blocking`)).toHaveCount(1);
  await expect(a.locator("#arrows > path.blockline")).toHaveCount(1);
  await a.click("#dmgBtn");
  await expect(a.locator(".modal")).toContainText("is blocked by Rick's Gamma Card");
  await a.locator(".modal").getByRole("button", { name:"Cancel" }).click();
  // (Rick doesn't have to wait to be asked: Take or block on the combat bar)
  await b.click("#defendBtn");
  await expect(b.locator(".modal")).toContainText("is blocked by your Gamma Card");
  await b.locator(".modal").getByRole("button", { name:"No damage gets through" }).click();
  await expect(b.locator(`#bf .card.blocking`)).toHaveCount(0);
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(0);
  await expect(b.locator("#lifeOut")).toHaveText("17");
  // A third attack: Rick takes none (as with a fog)
  await ktp(a, iid => { ktPlay.me.zones.bf.find(c => c.iid === iid).tapped = false; }, bear);
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attack Rick" }).click();
  await b.locator("#defendBtn").click();
  await b.locator(".modal").getByRole("button", { name:"Take no damage" }).click();
  await expect(b.locator("#lifeOut")).toHaveText("17");
  await expect(a.locator("#log")).toContainText("Rick took no combat damage.");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
