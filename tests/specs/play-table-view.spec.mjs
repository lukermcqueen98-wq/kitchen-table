import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const button = (page, name) => page.locator(".modal").getByRole("button", { name, exact:true }).click();

test("digital table: one Roll dice button with every die, rolls everyone sees, other players' graveyards, exile and mana, readable drop-downs, no D to draw", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");

  // A d20: it tumbles over Luke's side on both screens, then lands on the number the log shows
  // One "Roll dice" button with every die
  await a.click("#rollBtn");
  for (const d of ["Flip a coin", "Roll a d3", "Roll a d4", "Roll a d6", "Roll a d8", "Roll a d10", "Roll a d12", "Roll a d20", "Roll a d100", "Several dice...", "Roll the planar die (Planechase)"])
    await expect(a.getByRole("menuitem", { name:d, exact:true })).toBeVisible();
  await a.getByRole("menuitem", { name:"Roll a d20", exact:true }).click();
  for (const p of [a, b]) await expect(p.locator(".rollfx")).toBeVisible();
  await expect(b.locator(".rollfx .rolllabel")).toContainText("Luke rolled a d20");
  await expect(b.locator(".rollfx.landed .rolllabel")).toHaveText(/^Luke rolled \d+$/, { timeout:5000 });
  const rolled = (await b.locator(".rollfx .rolllabel").textContent()).match(/\d+$/)[0];
  await expect(b.locator("#log")).toContainText(`Luke rolled a d20: ${rolled}.`);
  const onRick = await b.evaluate(() => { const f = document.querySelector(".rollfx").getBoundingClientRect(), o = document.querySelector('.opp[data-seat="1"]').getBoundingClientRect();
    const x = f.left + f.width / 2; return x >= o.left && x <= o.right; });
  expect(onRick).toBe(true);
  await expect(b.locator(".rollfx")).toHaveCount(0, { timeout:8000 });
  // ...and a coin
  await b.click("#rollBtn"); await b.getByRole("menuitem", { name:"Flip a coin", exact:true }).click();
  await expect(a.locator(".rollfx.landed .rolllabel")).toHaveText(/^Rick flipped (heads|tails)$/, { timeout:5000 });
  await expect(a.locator(".rollfx")).toHaveCount(0, { timeout:8000 });
  // Several dice at once: 3d6 shows three dice and the total
  await b.click("#rollBtn"); await b.getByRole("menuitem", { name:"Several dice...", exact:true }).click();
  await b.fill(".modal input[aria-label='How many']", "3"); await b.selectOption(".modal select[aria-label='Which die']", "d6");
  await button(b, "Roll");
  await expect(a.locator(".rollfx .rolldie")).toHaveCount(3);
  await expect(a.locator(".rollfx.landed .rolllabel")).toHaveText(/^Rick rolled [1-6] \+ [1-6] \+ [1-6] = \d+$/, { timeout:5000 });
  const [, x, y, z, sum] = (await a.locator(".rollfx .rolllabel").textContent()).match(/(\d) \+ (\d) \+ (\d) = (\d+)/).map(Number);
  expect(x + y + z).toBe(sum);
  await expect(a.locator("#log")).toContainText(`Rick rolled 3d6: ${x} + ${y} + ${z} = ${sum}.`);
  await expect(a.locator(".rollfx")).toHaveCount(0, { timeout:8000 });
  // The planar die
  await b.click("#rollBtn"); await b.getByRole("menuitem", { name:"Roll the planar die (Planechase)", exact:true }).click();
  await expect(a.locator("#log")).toContainText(/Rick rolled the planar die: (blank|chaos|planeswalk)\./, { timeout:5000 });

  // Luke's graveyard and exile show their top card on Rick's screen, with counts; a click shows them all
  const [g1, g2, x1] = await ktp(a, () => ktPlay.me.zones.hand.slice(0, 3).map(c => c.iid));
  await ktp(a, ([g1, g2, x1]) => { ktPlay.move(g1, "gy"); ktPlay.move(g2, "gy"); ktPlay.move(x1, "ex"); }, [g1, g2, x1]);
  const piles = opp(b, "Luke").locator(".opile");
  await expect(piles.nth(0)).toContainText("Graveyard 2");
  await expect(piles.nth(1)).toContainText("Exile 1");
  await expect(piles.nth(0).locator(".card img")).toHaveCount(1);
  await piles.nth(0).click();
  await expect(b.locator(".modal-card h2")).toHaveText("Luke's graveyard (2)");
  await button(b, "Close");

  // No mana pool counters (players keep track of their own mana)
  await expect(a.locator("#manaBox")).toHaveCount(0);
  await expect(b.locator(".omana")).toHaveCount(0);

  // Drop-downs are dark with light words (the Group effects ones were light on light)
  await a.click("#fxBtn");
  const colors = await a.locator(".modal select").first().evaluate(e => { const s = getComputedStyle(e); return [s.color, s.backgroundColor]; });
  expect(colors).toEqual(["rgb(239, 230, 207)", "rgb(13, 32, 29)"]);
  await button(a, "Cancel");

  // D no longer draws a card
  const hand = await ktp(a, () => ktPlay.me.zones.hand.length);
  await a.locator("#bf").click({ position:{ x:5, y:5 } }); await a.keyboard.press("d"); await a.waitForTimeout(300);
  expect(await ktp(a, () => ktPlay.me.zones.hand.length)).toBe(hand);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: the initiative's Undercity card for everyone, and day and night that follow the rules", async () => {
  test.setTimeout(150000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  const keepHand = async page => { const k = page.locator(".modal").getByRole("button", { name:"Keep them (no maximum hand size)" }); if (await k.isVisible()) await k.click(); };
  const turn = () => ktp(a, () => ktPlay.table.turnSeat);
  const pass = async page => { const n = await ktp(a, () => ktPlay.table.turnNum); await page.click("#nextTurn"); await keepHand(page); await expect.poll(() => ktp(a, () => ktPlay.table.turnNum)).toBe(n + 1); };
  if (await turn() === 1) await pass(a);  // (Rick's turn)

  // Luke takes the initiative: he ventures into the Undercity (Secret Entrance), and its card shows under his mana and
  // next to his graveyard and exile on Rick's screen
  await a.click("#desigBtn"); await a.getByRole("menuitem", { name:"Take the initiative", exact:true }).click();
  await expect(a.locator(".modal-card h2")).toHaveText("Secret Entrance");
  await expect(a.locator(".modal")).toContainText("Search your library for a basic land card");
  await button(a, "I'll do it myself");
  await expect(a.locator("#dungeonBox .dungeon .droom.here")).toHaveText("Secret Entrance");
  await expect(a.locator("#dungeonBox .dungeon")).toContainText("🗝 Initiative");
  const hisCard = opp(b, "Luke").locator(".dungeon");
  await expect(hisCard.locator(".droom.here")).toHaveText("Secret Entrance");
  await expect(hisCard).toContainText("🗝 Initiative");
  expect(await a.evaluate(() => { const l = document.querySelector("#landChip").getBoundingClientRect(), d = document.querySelector("#dungeonBox .dungeon").getBoundingClientRect(); return d.top >= l.bottom; })).toBe(true);

  // Day and night: it's day; Rick casts nothing on his turn, so as the next turn begins it becomes night
  await a.click("#desigBtn"); await a.getByRole("menuitem", { name:"It becomes day", exact:true }).click();
  await expect(b.locator("#dayChip")).toHaveText("☀ Day");
  await pass(b);
  await expect(a.locator("#log")).toContainText("It becomes night (Rick cast no spells last turn).");
  for (const p of [a, b]) await expect(p.locator("#dayChip")).toHaveText("☾ Night");

  // Luke's upkeep with the initiative: venture again, choosing where the map splits
  await expect(a.locator(".modal-card h2")).toHaveText("Venture into the Undercity");
  await button(a, "Lost Well");
  await expect(a.locator(".modal-card h2")).toHaveText("Lost Well");
  await button(a, "I'll do it myself");
  await expect(hisCard.locator(".droom.here")).toHaveText("Lost Well");

  // Luke casts two spells this turn, so as the next turn begins it becomes day again
  for (let i = 0; i < 2; i++) await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "hand"); ktPlay.move(c.iid, "bf"); });
  await expect.poll(() => ktp(b, () => ktPlay.table.spells)).toBe(2);
  await pass(a);
  await expect(b.locator("#log")).toContainText("It becomes day (Luke cast 2 spells last turn).");
  await expect(b.locator("#dayChip")).toHaveText("☀ Day");

  // Rick hits Luke in combat: the initiative moves to Rick, and he ventures into his own Undercity
  const wolf = await ktp(b, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "bf"); return c.iid; });
  await b.locator(`#bf .card[data-iid="${wolf}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Attack Luke", exact:true }).click();
  await b.click("#dmgBtn");
  await button(a, "Take 3 damage");
  await expect(b.locator(".modal-card h2")).toHaveText("Secret Entrance");
  await button(b, "I'll do it myself");
  await expect(b.locator("#dungeonBox .dungeon")).toContainText("🗝 Initiative");
  await expect(opp(a, "Rick").locator(".dungeon .droom.here")).toHaveText("Secret Entrance");
  // A daybound card turns to its nightbound side at night (and back by day)
  await ktp(a, () => {
    const face = (name, text) => ({ name, oracle_text:text, type_line:"Creature — Werewolf", image_uris:{ small:"https://cards.scryfall.io/small/0.png", normal:"https://cards.scryfall.io/normal/0.png" } });
    ktPlay.cards.set("dayb-0000", { id:"dayb-0000", name:"Test Pup // Test Wolf", layout:"transform", type_line:"Creature — Werewolf // Creature — Werewolf",
      card_faces:[face("Test Pup", "Daybound"), face("Test Wolf", "Nightbound")] });
    ktPlay.me.zones.bf.push({ iid:"daybcard", id:"dayb-0000", x:0.5, y:0.5, tapped:false, fd:false, face:0, ctr:{} });
  });
  await a.click("#desigBtn"); await a.getByRole("menuitem", { name:"It becomes night", exact:true }).click();
  await expect.poll(() => ktp(a, () => ktPlay.me.zones.bf.find(c => c.iid === "daybcard").face)).toBe(1);
  await a.click("#desigBtn"); await a.getByRole("menuitem", { name:"It becomes day", exact:true }).click();
  await expect.poll(() => ktp(a, () => ktPlay.me.zones.bf.find(c => c.iid === "daybcard").face)).toBe(0);
  // (Luke keeps his place in his own Undercity, without the initiative)
  await expect(a.locator("#dungeonBox .dungeon .droom.here")).toHaveText("Lost Well");
  await expect(a.locator("#dungeonBox .dungeon")).not.toContainText("Initiative");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: library, graveyard and exile options (Magic's usual ones), for your own and other players'", async () => {
  test.setTimeout(150000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "28 Gamma Card\n2 Commander's Sphere\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  const menu = async (page, pile, item) => { await page.locator(pile).click({ button:"right" }); await page.getByRole("menuitem", { name:item, exact:true }).click(); };
  const zone = (page, z) => ktp(page, z => ktPlay.me.zones[z].map(c => ({ iid:c.iid, name:ktPlay.cards.get(c.id)?.name, fd:!!c.fd })), z);
  // (put the library in a known order: Forest, Forest, Gamma Card, then the rest)
  const order = () => ktp(a, () => { const L = ktPlay.me.zones.lib, isF = c => ktPlay.cards.get(c.id)?.name === "Forest";
    const f = L.filter(isF).slice(0, 2), g = L.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.me.zones.lib = [...f, g, ...L.filter(c => !f.includes(c) && c !== g)]; });

  // Library: exile the top card face down; put the top card on the bottom
  await order();
  await menu(a, "#libPile", "Exile the top card face down");
  expect((await zone(a, "ex")).map(c => c.fd)).toEqual([true]);
  const top = (await zone(a, "lib"))[0].iid;
  await menu(a, "#libPile", "Put the top card on the bottom");
  expect((await zone(a, "lib")).at(-1).iid).toBe(top);
  // Reveal until a creature card: Gamma Card is found and goes to Luke's hand; the Forest before it goes to the bottom
  await order();
  await menu(a, "#libPile", "Reveal cards until... (cascade and the like)");
  await a.selectOption(".modal select[aria-label='Until']", "creature"); await button(a, "Reveal");
  await expect(a.locator(".modal-card h2")).toHaveText("Revealed 3: Gamma Card");
  await expect(b.locator("#log")).toContainText("Luke revealed Forest, Forest, Gamma Card from the top of their library.");
  await expect(b.locator(".modal-card h2")).toHaveText("Luke revealed the top of their library"); await button(b, "Close");
  const hand = (await zone(a, "hand")).length;
  await button(a, "Put it into your hand");
  expect((await zone(a, "hand")).length).toBe(hand + 1);
  expect((await zone(a, "lib")).slice(-2).map(c => c.name)).toEqual(["Forest", "Forest"]);
  // Playing with the top card revealed: Rick sees it next to Luke's graveyard
  await menu(a, "#libPile", "Play with the top card revealed (everyone sees it)");
  await expect(opp(b, "Luke").locator(".opile", { hasText:"Library top" })).toHaveCount(1);
  await menu(a, "#libPile", "Stop playing with the top card revealed");
  await expect(opp(b, "Luke").locator(".opile", { hasText:"Library top" })).toHaveCount(0);

  // Graveyard: flashback casts a sorcery from it and exiles it after
  const sphere = await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Commander's Sphere"); ktPlay.move(c.iid, "gy"); return c.iid; });
  await a.locator("#gyPile").click();
  await a.locator(".modal .gcard", { hasText:"" }).first().getByRole("button", { name:"Cast (flashback: then exile)" }).click();
  await expect(a.locator("#log")).toContainText("You cast Commander's Sphere.");
  await button(a, "Not now");
  expect((await zone(a, "ex")).map(c => c.iid)).toContain(sphere);
  // ...exile the whole graveyard
  await ktp(a, () => { for (let i = 0; i < 3; i++) ktPlay.move(ktPlay.me.zones.lib[0].iid, "gy"); });
  const exBefore = (await zone(a, "ex")).length;
  await menu(a, "#gyPile", "Exile your whole graveyard");
  expect((await zone(a, "gy")).length).toBe(0);
  expect((await zone(a, "ex")).length).toBe(exBefore + 3);
  // Exile: suspend's time counters
  await a.locator("#exPile").click();
  await a.locator(".modal .gcard").first().getByRole("button", { name:"Time counter + (0)" }).click();
  await expect(a.locator(".modal .gcard").first().getByRole("button", { name:"Time counter + (1)" })).toBeVisible();
  await button(a, "Close");

  // Another player's graveyard: Rick reanimates Luke's Gamma Card onto his own battlefield, then exiles the rest
  const gamma = await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "gy"); ktPlay.move(ktPlay.me.zones.lib[0].iid, "gy"); return c.iid; });
  await expect(opp(b, "Luke").locator(".opile").first()).toContainText("Graveyard 2");
  await opp(b, "Luke").locator(".opile", { hasText:"Graveyard" }).click();
  await b.locator(".modal .gcard", { has:b.locator(`.card[data-iid="${gamma}"]`) }).getByRole("button", { name:"Onto my battlefield" }).click();
  await expect.poll(() => ktp(b, g => ktPlay.me.zones.bf.some(c => c.iid === g && c.owner === 1), gamma)).toBe(true);
  await opp(b, "Luke").locator(".opile", { hasText:"Graveyard" }).click();
  await button(b, "Exile their whole graveyard");
  await expect.poll(async () => (await zone(a, "gy")).length).toBe(0);
  await expect(a.locator("#log")).toContainText("Rick exiled your graveyard (1 card).");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: game and turn clocks, turn counts, a turn time limit, your turn standing out, and stacked basic lands", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  // A 1-minute turn limit (a house rule), and the turn passes when it runs out
  await a.click("#startBtn");
  await a.fill(".modal input[aria-label='Turn time limit in minutes (0: no limit)']", "1");
  await a.locator("label.rule", { hasText:"When the turn time limit runs out, the turn passes" }).locator("input").check();
  await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  const turn = () => ktp(a, () => ktPlay.table.turnSeat);
  const mine = await turn() === 1 ? a : b, other = mine === a ? b : a;

  // The clocks count up; the turn number and round show; the player whose turn it is sees it clearly
  await expect(a.locator("#clocks")).toBeVisible();
  await expect(a.locator("#turnLimit")).toHaveText("/ 1:00");
  const t0 = await a.locator("#gameClock").textContent();
  await expect.poll(() => a.locator("#gameClock").textContent(), { timeout:5000 }).not.toBe(t0);
  await expect(a.locator("#turnCount")).toHaveText("1"); await expect(a.locator("#roundCount")).toHaveText("1");
  await expect(mine.locator("#turnInfo")).toHaveClass(/mine/);
  await expect(mine.locator("body")).toHaveClass(/myturn/);
  await expect(other.locator("#turnInfo")).not.toHaveClass(/mine/);
  // Time's up: the clock goes red, the table is told, and the turn passes; the next player's "Your turn" pops up
  await ktp(mine, () => { ktPlay.table.turnAt = Date.now() - 61000; });
  await expect(other.locator("#log")).toContainText(/Time's up for (Luke|Rick)'s turn \(1 minute\)\./);
  await expect.poll(turn).toBe(mine === a ? 2 : 1);
  await expect(other.locator("#turnSplash")).toHaveText("Your turn");
  await expect(a.locator("#turnCount")).toHaveText("2");
  await expect(opp(a, "Rick")).toContainText(/Turns [12]/);

  // Basic lands of one kind stack with a count; a click taps one (and adds its mana); right-click taps several
  const forests = await ktp(a, () => { const out = []; for (let i = 0; i < 4; i++) { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Forest"); ktPlay.move(c.iid, "bf"); out.push(c.iid); } return out; });
  const stack = a.locator("#bf .card.landstack"), upPile = a.locator('#bf .card.landstack[data-pile="untapped"]'), downPile = a.locator('#bf .card.landstack[data-pile="tapped"]');
  await expect(stack).toHaveCount(1);
  await expect(upPile.locator(".stackn")).toHaveText("×4"); await expect(upPile.locator(".stackup")).toHaveText("4 untapped");
  await expect(opp(b, "Luke").locator(".card.landstack .stackn")).toHaveText("×4");
  // a click taps one: it moves to a tapped pile beside the untapped one, each with its count
  await upPile.click();
  await expect(upPile.locator(".stackup")).toHaveText("3 untapped");
  await expect(downPile.locator(".stackup")).toHaveText("1 tapped"); await expect(downPile).toHaveClass(/tapped/);
  const [ub, db] = [await upPile.boundingBox(), await downPile.boundingBox()];
  expect(db.x).toBeGreaterThan(ub.x + ub.width * 0.9);
  await expect(opp(b, "Luke").locator('.card.landstack[data-pile="tapped"] .stackn')).toHaveText("×1");
  await upPile.click({ button:"right" }); await a.getByRole("menuitem", { name:"Tap 2", exact:true }).click();
  await expect(upPile.locator(".stackup")).toHaveText("1 untapped"); await expect(downPile.locator(".stackn")).toHaveText("×3");
  // clicking the tapped pile untaps one
  await downPile.click();
  await expect(downPile.locator(".stackn")).toHaveText("×2"); await expect(upPile.locator(".stackn")).toHaveText("×2");
  await downPile.click({ button:"right" }); await a.getByRole("menuitem", { name:"Untap all 2", exact:true }).click();
  await expect(upPile.locator(".stackup")).toHaveText("4 untapped"); await expect(downPile).toHaveCount(0);
  expect(forests.length).toBe(4);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: combat helpers (by hand): exert, goad, attack someone else, ninjutsu, Fog, extra combat", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  const keepHand = async page => { const k = page.locator(".modal").getByRole("button", { name:"Keep them (no maximum hand size)" }); if (await k.isVisible()) await k.click(); };
  if (await ktp(a, () => ktPlay.table.turnSeat) !== 1) { await b.click("#nextTurn"); await keepHand(b); await expect.poll(() => ktp(a, () => ktPlay.table.turnSeat)).toBe(1); }
  const fetch = page => ktp(page, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "bf"); return c.iid; });
  const g1 = await fetch(a), g2 = await fetch(a);
  await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "hand"); });
  const card = (page, iid) => page.locator(`#bf .card[data-iid="${iid}"]`);
  const menu = async (page, loc, item) => { await loc.click({ button:"right" }); await page.getByRole("menuitem", { name:item, exact:true }).click(); };

  // Attack, then exert the attacker: Rick sees the marker
  await menu(a, card(a, g1), "Attack Rick");
  await menu(a, card(a, g1), "Exert it (it won't untap next time)");
  await expect(opp(b, "Luke").locator(`.card[data-iid="${g1}"] .marks`)).toHaveText("Exerted");
  // Rick goads Luke's other creature
  await menu(b, opp(b, "Luke").locator(`.card[data-iid="${g2}"]`), "Goad it (it attacks each combat if able, and not you)");
  await expect(card(a, g2).locator(".marks")).toHaveText("Goaded");
  // A creature put into the attack (it entered tapped and attacking)
  await a.click("#combatBtn"); await a.getByRole("menuitem", { name:"Put a creature into the attack (it entered tapped and attacking)...", exact:true }).click();
  await a.locator(".modal .gcard", { has:a.locator(`.card[data-iid="${g2}"]`) }).getByRole("button", { name:"Pick" }).click(); await button(a, "Done");
  await expect.poll(() => ktp(a, g => { const c = ktPlay.me.zones.bf.find(c => c.iid === g); return [c.atk, c.tapped]; }, g2)).toEqual([2, true]);
  // Ninjutsu: an unblocked attacker back to hand, a card from hand in tapped and attacking
  await a.click("#combatBtn"); await a.getByRole("menuitem", { name:"Ninjutsu (return an unblocked attacker, put a card from your hand in attacking)...", exact:true }).click();
  await a.locator(".modal .gcard", { has:a.locator(`.card[data-iid="${g1}"]`) }).getByRole("button", { name:"Return" }).click(); await button(a, "Done");
  await a.locator(".modal .gcard").first().getByRole("button", { name:"Ninjutsu" }).click(); await button(a, "Done");
  await expect(a.locator("#log")).toContainText("You used ninjutsu: returned Gamma Card to their hand and put Gamma Card onto the battlefield tapped and attacking Rick.");
  expect(await ktp(a, g => ktPlay.me.zones.hand.some(c => c.iid === g), g1)).toBe(true);
  // A Fog: Rick takes no combat damage this turn
  await a.click("#combatBtn"); await a.getByRole("menuitem", { name:"Fog: prevent all combat damage this turn", exact:true }).click();
  const life = await ktp(b, () => ktPlay.me.life);
  await a.click("#dmgBtn");
  await expect(b.locator(".modal-card h2")).toBeVisible();
  await b.locator(".modal").getByRole("button", { name:/^Take/ }).first().click();
  await b.waitForTimeout(500);
  expect(await ktp(b, () => ktPlay.me.life)).toBe(life);
  // An extra combat: the attackers untap and can attack again
  await a.click("#combatBtn"); await a.getByRole("menuitem", { name:"Extra combat: untap the creatures that attacked and attack again", exact:true }).click();
  expect(await ktp(a, () => ktPlay.me.zones.bf.filter(c => c.atk).length)).toBe(0);
  await expect(a.locator("#log")).toContainText("You got an additional combat phase");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: card names in the log and chat are links that pop the card up on hover and open it on click", async () => {
  test.setTimeout(90000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Beta Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  // Luke plays Gamma Card: on Rick's screen (Rick's deck has no Gamma Card) the log line links it
  await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "hand"); ktPlay.move(c.iid, "bf"); });
  const link = b.locator("#log li", { hasText:"Luke played Gamma Card" }).locator("a.clink", { hasText:"Gamma Card" });
  await expect(link).toHaveCount(1);
  await link.hover();
  await expect(b.locator("#pop")).toBeVisible();
  await expect(b.locator("#zoomText")).toContainText("Gamma Card");
  await link.click();
  await expect(b.locator(".modal-card h2")).toHaveText("Gamma Card");
  await button(b, "Close");
  // Chat too
  await a.fill("#chatIn", "watch out for my Gamma Card"); await a.press("#chatIn", "Enter");
  await expect(b.locator("#log li.chat a.clink", { hasText:"Gamma Card" })).toHaveCount(1);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: playmats everyone sees, including players who sit down later", async () => {
  test.setTimeout(90000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  // Luke picks the Island mat before Rick arrives
  await a.click("#matBtn"); await a.locator(".modal .matpick", { hasText:"Island" }).click();
  await expect(a.locator("#bf")).toHaveClass(/mat/);
  expect(await a.locator("#bf").evaluate(e => e.style.background)).toContain("gradient");
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(b, "Luke")).toBeVisible({ timeout:15000 });
  await expect(opp(b, "Luke").locator(".obody")).toHaveClass(/mat/);
  // A picture from a link
  // (the picture is checked, then adjusted: move it and zoom in, with previews of both views)
  await a.click("#matBtn"); await a.fill(".modal input[aria-label='Picture link']", "https://cards.scryfall.io/art_crop/0.png"); await button(a, "Use this picture");
  await expect(a.locator(".modal-card h2")).toHaveText("Adjust your playmat");
  await expect(a.locator(".modal .matprev .matlayer img")).toHaveCount(2);
  await a.locator(".modal").getByRole("button", { name:"Move right" }).click();
  await a.locator(".modal").getByRole("button", { name:"Move down" }).click();
  await a.locator(".modal input[aria-label='Zoom']").fill("150");
  // dragging the big preview moves it too
  const prev = await a.locator(".modal .matprev.big").boundingBox();
  await a.mouse.move(prev.x + prev.width / 2, prev.y + prev.height / 2); await a.mouse.down();
  await a.mouse.move(prev.x + prev.width / 2 - prev.width * 0.15, prev.y + prev.height / 2, { steps:4 }); await a.mouse.up();
  await button(a, "Use this playmat");
  const layer = opp(b, "Luke").locator(".obody > .matlayer img");
  await expect(layer).toHaveAttribute("src", "https://cards.scryfall.io/art_crop/0.png");
  const look = await layer.evaluate(i => [i.style.objectPosition, i.style.transform]);
  expect(look[1]).toBe("scale(1.5)");
  const [x, y] = look[0].match(/\d+/g).map(Number);
  expect(x).toBeGreaterThan(55); expect(y).toBe(55);
  await expect(b.locator("#log")).toContainText("Luke put down a new playmat.");
  expect(await a.locator("#bf > .matlayer img").evaluate(i => i.style.objectPosition)).toBe(look[0]);
  // A link that doesn't load is caught before it's used
  await a.click("#matBtn"); await a.fill(".modal input[aria-label='Picture link']", "https://pictures.example.invalid/mat.png"); await button(a, "Use this picture");
  await expect(a.locator("#toast")).toContainText("That picture didn't load.");
  await button(a, "Close");
  // ...and back to plain felt
  await a.click("#matBtn"); await a.locator(".modal .matpick", { hasText:"Felt (plain)" }).click();
  await expect(opp(b, "Luke").locator(".obody")).not.toHaveClass(/mat/);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: no mana question for lands that make several colors; mana symbols put on a card for everyone", async () => {
  test.setTimeout(90000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  // A land that makes two colors (here, Forest made to say it makes green or blue) just taps: nothing is asked
  const land = await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Forest"); ktPlay.cards.get(c.id).produced_mana = ["G", "U"]; ktPlay.move(c.iid, "bf"); return c.iid; });
  await a.locator(`#bf .card[data-iid="${land}"]`).click();
  await expect.poll(() => ktp(a, l => ktPlay.me.zones.bf.find(c => c.iid === l).tapped, land)).toBe(true);
  await expect(a.locator("#menu")).toBeHidden();
  // Mana symbols on a card: green and blue on Gamma Card, seen by Rick; clicking one taps it
  const gamma = await ktp(a, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "bf"); return c.iid; });
  await a.locator(`#bf .card[data-iid="${gamma}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Mana symbols (what it can make)...", exact:true }).click();
  await a.locator(".modal").getByRole("button", { name:"G mana" }).click();
  await a.locator(".modal").getByRole("button", { name:"U mana" }).click();
  await button(a, "Done");
  await expect(a.locator("#log")).toContainText("You marked Gamma Card as making blue, green mana.");
  await expect(opp(b, "Luke").locator(`.card[data-iid="${gamma}"] .mtag`)).toHaveCount(2);
  await a.locator(`#bf .card[data-iid="${gamma}"] .mtag[data-mana="G"]`).click();
  expect(await ktp(a, g => ktPlay.me.zones.bf.find(c => c.iid === g).tapped, gamma)).toBe(true);
  // ...and the symbols go when it leaves the battlefield
  await ktp(a, g => ktPlay.move(g, "hand"), gamma);
  expect(await ktp(a, g => ktPlay.me.zones.hand.find(c => c.iid === g).mana, gamma)).toBeUndefined();
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: key terms on cards, for everyone, counted in combat, and until end of turn", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  const keepHand = async page => { const k = page.locator(".modal").getByRole("button", { name:"Keep them (no maximum hand size)" }); if (await k.isVisible()) await k.click(); };
  if (await ktp(a, () => ktPlay.table.turnSeat) !== 1) { await b.click("#nextTurn"); await keepHand(b); await expect.poll(() => ktp(a, () => ktPlay.table.turnSeat)).toBe(1); }
  const fetch = page => ktp(page, () => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "bf"); return c.iid; });
  const mine = await fetch(a); await fetch(b);
  const card = a.locator(`#bf .card[data-iid="${mine}"]`);
  // Luke gives his Gamma Card flying until end of turn, and Prowess for good
  await card.click({ button:"right" }); await a.getByRole("menuitem", { name:"Key terms (flying, haste...)...", exact:true }).click();
  await a.locator(".modal").getByRole("button", { name:"Flying", exact:true }).click();
  await a.locator(".modal input[aria-label='Until end of turn']").uncheck();
  await a.fill(".modal input[aria-label='Another key term']", "prowess"); await a.locator(".modal").getByRole("button", { name:"Add", exact:true }).click();
  await button(a, "Done");
  await expect(card.locator(".kwtags span")).toHaveText(["Flying", "Prowess"]);
  await expect(opp(b, "Luke").locator(`.card[data-iid="${mine}"] .kwtags span`)).toHaveText(["Flying", "Prowess"]);
  await expect(b.locator("#log")).toContainText("Luke gave Gamma Card Flying until end of turn.");
  // Rick gives it menace from his side (it shows on Luke's card)
  await opp(b, "Luke").locator(`.card[data-iid="${mine}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Key terms (flying, haste...)...", exact:true }).click();
  await b.locator(".modal").getByRole("button", { name:"Menace", exact:true }).click();
  await expect(card.locator(".kwtags span")).toHaveText(["Flying", "Prowess", "Menace"]);
  // Combat counts it: Rick's Gamma Card (no flying or reach) can't block the flier
  await card.click({ button:"right" }); await a.getByRole("menuitem", { name:"Attack Rick", exact:true }).click();
  await a.click("#dmgBtn");
  await expect(b.locator(".modal")).toContainText("Can't block it: Gamma Card");
  await b.locator(".modal").getByRole("button", { name:/^Take/ }).first().click();
  // The turn ends: flying and menace (until end of turn) wear off; Prowess stays
  await a.click("#nextTurn"); await keepHand(a);
  await expect(card.locator(".kwtags span")).toHaveText(["Prowess"]);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: when a game ends, each player picks the same deck or a new one", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  // The first game uses the decks picked in the lobby: no question
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) { await expect(p.locator(".modal-card h2")).toHaveText("Keep this hand?"); await button(p, "Keep"); }
  // The game ends (Luke won): both are asked
  await a.click("#startBtn"); await expect(a.locator(".modal-card h2")).toHaveText("Who won this game?"); await button(a, "Luke");
  for (const p of [a, b]) await expect(p.locator(".modal-card h2")).toHaveText("Next game: which deck?");
  // While Luke chooses, Rick sees it on Luke's panel
  await expect(opp(b, "Luke")).toContainText("Choosing a deck...");
  // Rick keeps his deck; Luke pastes a new one
  await b.locator(".modal").getByRole("button", { name:/^Same deck/ }).click();
  await expect(b.locator(".modal-card h2")).toHaveText("Keep this hand?");
  await button(a, "New deck...");
  await expect(a.locator(".modal-card h2")).toHaveText("Pick a new deck");
  await a.fill(".modal input[aria-label='Deck name']", "Betas");
  await a.fill(".modal textarea[aria-label='Decklist']", "30 Beta Card\n30 Forest");
  await button(a, "Use this deck");
  await expect(a.locator(".modal-card h2")).toHaveText("Keep this hand?");
  await expect(b.locator("#log")).toContainText("Luke switched decks: Betas.");
  await expect(opp(b, "Luke")).not.toContainText("Choosing a deck...");
  const names = await ktp(a, () => [...new Set([...ktPlay.me.zones.lib, ...ktPlay.me.zones.hand].map(c => ktPlay.cards.get(c.id)?.name))].sort());
  expect(names).toEqual(["Beta Card", "Forest"]);
  expect(await ktp(a, () => ktPlay.me.zones.lib.length + ktPlay.me.zones.hand.length)).toBe(60);
  const rick = await ktp(b, () => [...new Set([...ktPlay.me.zones.lib, ...ktPlay.me.zones.hand].map(c => ktPlay.cards.get(c.id)?.name))].sort());
  expect(rick).toEqual(["Forest", "Gamma Card"]);
  for (const p of [a, b]) await button(p, "Keep");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});

test("digital table: declare attackers, each creature at its own opponent", async () => {
  test.setTimeout(150000);
  const browser = await launchBrowser();
  const [a, b, c] = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  for (const [i, p] of [a, b, c].entries()) {
    const room = i ? new URL(a.url()).searchParams.get("room") : "";
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", ["Luke", "Rick", "Sam"][i]); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", "30 Gamma Card\n30 Forest"); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!i) await settle(a);
  }
  await expect(a.locator(".opp")).toHaveCount(2, { timeout:20000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b, c]) await button(p, "Keep");
  const keepHand = async page => { const k = page.locator(".modal").getByRole("button", { name:"Keep them (no maximum hand size)" }); if (await k.isVisible()) await k.click(); };
  while (await ktp(a, () => ktPlay.table.turnSeat) !== 1) { const s = await ktp(a, () => ktPlay.table.turnSeat), n = await ktp(a, () => ktPlay.table.turnNum); const p = [a, b, c][s - 1]; await p.click("#nextTurn"); await keepHand(p); await expect.poll(() => ktp(a, () => ktPlay.table.turnNum)).toBe(n + 1); }
  const three = await ktp(a, () => [0, 1, 2].map(() => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card"); ktPlay.move(c.iid, "bf"); return c.iid; }));
  // One at Rick, one at Sam, one stays home
  await a.click("#attackBtn");
  const rows = a.locator(".modal .atkrow");
  await expect(rows).toHaveCount(3);
  await rows.nth(0).getByRole("radio", { name:"Rick" }).click();
  await rows.nth(1).getByRole("radio", { name:"Sam" }).click();
  await expect(a.locator(".modal")).toContainText("1 at Rick, 1 at Sam");
  await a.locator(".modal").getByRole("button", { name:"Attack", exact:true }).click();
  expect(await ktp(a, ids => ids.map(i => ktPlay.me.zones.bf.find(c => c.iid === i)).map(c => [c.atk || 0, c.tapped]), three)).toEqual([[2, true], [3, true], [0, false]]);
  await expect(b.locator("#combatNote")).toContainText("1 attacking you");
  await expect(c.locator("#combatNote")).toContainText("1 attacking you");
  await expect(c.locator("#log")).toContainText("Luke attacked Rick with Gamma Card; Sam with Gamma Card.");
  // Change of plan: the one at Sam goes at Rick instead, and the third joins in at Sam
  await a.click("#attackBtn");
  await rows.nth(1).getByRole("radio", { name:"Rick" }).click();
  await rows.nth(2).getByRole("radio", { name:"Sam" }).click();
  await a.locator(".modal").getByRole("button", { name:"Attack", exact:true }).click();
  expect(await ktp(a, ids => ids.map(i => ktPlay.me.zones.bf.find(c => c.iid === i).atk), three)).toEqual([2, 2, 3]);
  await expect(b.locator("#combatNote")).toContainText("2 attacking you");
  // ...and Everyone at Sam
  await a.click("#attackBtn"); await a.locator(".modal").getByRole("button", { name:"Sam", exact:true }).first().click();
  await a.locator(".modal").getByRole("button", { name:"Attack", exact:true }).click();
  expect(await ktp(a, ids => ids.map(i => ktPlay.me.zones.bf.find(c => c.iid === i).atk), three)).toEqual([3, 3, 3]);
  expect([...a.errors, ...b.errors, ...c.errors]).toEqual([]);
  await browser.close();
});

test("digital table: inspecting shows both sides of a two-sided card, and cards in lists can be clicked to inspect", async () => {
  test.setTimeout(90000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  // A two-sided card on Luke's battlefield, turned to its back
  await ktp(a, () => {
    const face = (name, text, n) => ({ name, oracle_text:text, type_line:"Creature — Werewolf", image_uris:{ small:`https://cards.scryfall.io/small/${n}.png`, normal:`https://cards.scryfall.io/normal/${n}.png` } });
    ktPlay.cards.set("00000000-dfc0-4000-8000-000000000000", { id:"00000000-dfc0-4000-8000-000000000000", name:"Test Pup // Test Wolf", layout:"transform", type_line:"Creature — Werewolf // Creature — Werewolf",
      card_faces:[face("Test Pup", "When this enters, draw a card.", 1), face("Test Wolf", "Trample", 2)] });
    ktPlay.me.zones.bf.push({ iid:"dfccard", id:"00000000-dfc0-4000-8000-000000000000", x:0.4, y:0.3, tapped:false, fd:false, face:1, ctr:{} });
    ktPlay.draw(1);  // (anything that redraws the table)
  });
  await a.locator('#bf .card[data-iid="dfccard"]').click({ button:"right" });
  await a.getByRole("menuitem", { name:"View card", exact:true }).click();
  const pics = a.locator(".modal .inspectpics figure");
  await expect(pics).toHaveCount(2);
  await expect(pics.nth(0)).toContainText("Test Pup");
  await expect(pics.nth(1)).toContainText("Test Wolf (face up on the table)");
  await expect(a.locator(".modal .inspecttext")).toHaveCount(2);
  await expect(a.locator(".modal")).toContainText("When this enters, draw a card.");
  await button(a, "Close");
  // Clicking a card in a list (Luke's graveyard) opens it on top; closing goes back to the list
  await ktp(a, () => { for (let i = 0; i < 2; i++) ktPlay.move(ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === "Gamma Card").iid, "gy"); });
  await a.locator("#gyPile").click();
  await expect(a.locator(".modal-card h2").first()).toHaveText("Your graveyard (2)");
  await a.locator(".modal .gcard .card").first().click();
  await expect(a.locator("#inspect h2")).toHaveText("Gamma Card");
  await expect(a.locator("#inspect")).toContainText("{T}: Add {C}{C}.");
  await a.keyboard.press("Escape");
  await expect(a.locator("#inspect")).toHaveCount(0);
  await expect(a.locator("#modal .modal-card h2")).toHaveText("Your graveyard (2)");
  // ...also the top of the library, and another player's graveyard
  await a.locator(".modal").getByRole("button", { name:"Close" }).click();
  await ktp(b, () => ktPlay.move(ktPlay.me.zones.lib[0].iid, "gy"));
  await opp(a, "Rick").locator(".opile", { hasText:"Graveyard 1" }).click();
  await a.locator(".modal .gcard .card").first().click();
  await expect(a.locator("#inspect h2")).toBeVisible();
  await a.locator("#inspect").getByRole("button", { name:"Close" }).click();
  await expect(a.locator("#inspect")).toHaveCount(0);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
