import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, tool, dragTo } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// Gamma Card is a 3/4 creature in the test cards
const DECK = `12 Gamma Card
18 Forest`;
const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
// Put a card from the library straight into a zone (so the test doesn't depend on the shuffle)
const fetchTo = (page, name, zone) => ktp(page, ([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); delete c.etb; return c.iid;  /* (as if it had been there since last turn) */ }, [name, zone]);

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
  await tool(a, "#undoBtn");
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
  // (it came in this turn, so without haste it couldn't attack yet: say it's been there since last turn)
  await ktp(a, iid => { delete ktPlay.me.zones.bf.find(c => c.iid === iid).etb; }, bear);

  // Attacking: on his turn Luke has an Attack button at the top; he sends the creature at Rick. It taps (no vigilance),
  // and an arrow points at Rick on both screens
  const turn = await ktp(a, () => ktPlay.table.turnSeat);
  if (turn !== 1) { await b.click("#nextTurn"); await expect(a.locator("#turnInfo")).toContainText("Your turn"); }
  await expect(b.locator("#attackBtn")).toBeHidden();
  const wall = await fetchTo(b, "Gamma Card", "bf");
  // Attacking is by hand: Go to combat, drag the creature onto Rick's mat, Send the attack. That marks it and draws its
  // arrow on both screens, and nothing else: it isn't tapped for him, and no damage is worked out
  const attack = async () => {
    await a.click("#attackBtn");
    await dragTo(a, a.locator(`#bf .card[data-iid="${bear}"]`), a.locator("#atkBar .atkdrop", { hasText:"Attack Rick" }));
    await expect(a.locator("#atkBar .atkdrop", { hasText:"Attack Rick" })).toContainText("Gamma Card");
    await a.locator("#atkBar").getByRole("button", { name:"Send the attack (1)", exact:true }).click();
    await expect(a.locator("#atkBar")).toBeHidden();
  };
  await attack();
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);
  await expect(a.locator(`#bf .card[data-iid="${bear}"].tapped`)).toHaveCount(0);
  for (const p of [a, b]) await expect(p.locator("#arrows > path:not(.blockline)")).toHaveCount(1);
  await expect(b.locator("#combatNote")).toContainText("1 attacking you");
  await expect(b.locator("#log")).toContainText("Luke attacked Rick with Gamma Card.");
  // Rick sees who's coming, with how to block; the notice has no choices that do anything for him
  const box = b.locator("#defendBox");
  await expect(box).toContainText("You're being attacked"); await expect(box).toContainText("Gamma Card"); await expect(box).toContainText("right-click an attacker");
  await expect(box.getByRole("button")).toHaveText(["Got it"]);
  // He blocks by hand: right-click the attacker, Block it with his creature (a dashed line on both screens)
  await opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Gamma Card", exact:true }).click();
  await expect(b.locator("#log")).toContainText("You blocked Luke's Gamma Card with Gamma Card.");
  await expect(b.locator(`#bf .card[data-iid="${wall}"].blocking`)).toHaveCount(1);
  for (const p of [a, b]) await expect(p.locator("#arrows > path.blockline")).toHaveCount(1);
  await expect(box).toContainText("blocked by Gamma Card");
  await box.getByRole("button", { name:"Got it", exact:true }).click(); await expect(box).toBeHidden();
  // Nothing happens by itself: no damage, nobody dies, the marks stay until Luke ends combat
  await a.waitForTimeout(1500);
  await expect(b.locator("#lifeOut")).toHaveText("20"); await expect(a.locator("#lifeOut")).toHaveText("20");
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);
  await expect(a.locator("#endTurnBtn")).toBeHidden();
  await a.locator("#endCombatBtn").click();
  await expect(b.locator("#log")).toContainText("Luke ended combat.");
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(0);
  await expect(b.locator(`#bf .card.blocking`)).toHaveCount(0);  // (its attacker left combat, so it isn't blocking any more)
  for (const p of [a, b]) await expect(p.locator("#arrows > path")).toHaveCount(0);
  await expect(a.locator("#endCombatBtn")).toBeHidden(); await expect(a.locator("#endTurnBtn")).toBeVisible();
  // A tapped creature, or one that just came in, can be sent too: the table doesn't check the rules
  await a.locator(`#bf .card[data-iid="${bear}"]`).click(); await expect(a.locator(`#bf .card[data-iid="${bear}"].tapped`)).toHaveCount(1);
  await attack();
  await expect(a.locator(`#bf .card[data-iid="${bear}"].attacking`)).toHaveCount(1);
  // Rick takes it: he changes his own life
  // (the notice for the new attack sits beside his life and counters, never over them)
  await expect(b.locator("#defendBox")).toBeVisible();
  await expect.poll(() => b.evaluate(() => document.querySelector("#defendBox").getBoundingClientRect().left > Math.max(document.querySelector("#side .lifebox").getBoundingClientRect().right, document.querySelector("#ctrlBox").getBoundingClientRect().right))).toBe(true);
  await b.locator("#lifeMinus").click(); await b.locator("#lifeMinus").click(); await b.locator("#lifeMinus").click();
  await expect(b.locator("#lifeOut")).toHaveText("17");
  // A */* creature is 0/0 plus its counters: with three +1/+1 counters it shows 3/3
  await ktp(a, () => {
    ktPlay.cards.set("elder-0000", { id:"elder-0000", name:"Test Elder", type_line:"Creature — Treefolk", power:"*", toughness:"*",
      oracle_text:"Test Elder's power and toughness are each equal to the number of Forests you control.", image_uris:{ small:"https://cards.scryfall.io/small/0.png", normal:"https://cards.scryfall.io/normal/0.png" } });
    ktPlay.me.zones.bf.push({ iid:"eldercard", id:"elder-0000", x:0.6, y:0.3, tapped:false, fd:false, face:0, ctr:{} }); ktPlay.changed();
  });
  await a.locator('#bf .card[data-iid="eldercard"]').click({ button:"right" });
  await expect(a.locator(".modal .cp-sec", { hasText:"Base power/toughness" })).toContainText("*/*");
  await a.locator(".modal").getByRole("button", { name:"+1/+1", exact:true }).first().click();
  for (let i = 0; i < 2; i++) await a.locator(".modal").getByRole("button", { name:"Add a +1/+1 counter" }).click();
  await a.locator(".modal").getByRole("button", { name:"Close", exact:true }).click();
  await expect(a.locator('#bf .card[data-iid="eldercard"] .pt')).toHaveText("3/3");
  // Passing the turn takes everything out of combat; nothing untaps and nobody draws by itself, and there's no discarding down to 7
  const [handA, handB] = [await a.locator("#hand .card").count(), await b.locator("#hand .card").count()];
  await a.click("#nextTurn");
  await expect(b.locator("#turnInfo")).toContainText("Your turn");
  await expect(b.locator("#log")).toContainText("You started their turn (turn");
  await expect(opp(b, "Luke").locator(".obf .card.attacking")).toHaveCount(0);
  await expect(a.locator("#arrows > path")).toHaveCount(0);
  await a.waitForTimeout(600);
  await expect(a.locator("#hand .card")).toHaveCount(handA); await expect(b.locator("#hand .card")).toHaveCount(handB);
  await expect(a.locator(".modal")).toBeHidden();
  await expect(a.locator(`#bf .card[data-iid="${bear}"].tapped`)).toHaveCount(1);

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
