import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// Gamma Card is a 3/4 creature in the test cards; Sol Ring is banned in Modern and Gwenom in Commander (test data)
const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const fetchTo = (page, name, zone) => ktp(page, ([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); return c.iid; }, [name, zone]);
const menu = (page, name) => page.getByRole("menuitem", { name, exact:true }).click();
const button = (page, name) => page.locator(".modal").getByRole("button", { name, exact:true }).click();

test("digital table: deck check, house rules, sideboarding, pop-out cards, power/toughness, monarch, day and night, and the turn alert", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);

  // The deck check in the lobby: Commander problems...
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke");
  await a.fill("#deckIn", "Commander\n1 Gamma Card\n\nDeck\n2 Sol Ring\n1 Gwenom, Remorseless\n20 Forest");
  await a.click("#loadDeck");
  const info = a.locator("#deckInfo");
  await expect(info).toContainText("24 cards with the commander: Commander decks have exactly 100.");
  await expect(info).toContainText("More than one copy: Sol Ring (2).");
  await expect(info).toContainText("Outside your commander's colors (GU): Gwenom, Remorseless.");
  await expect(info).toContainText("Banned in Commander: Gwenom, Remorseless.");
  // ...and 60-card problems, checked against a format you pick; the sideboard is kept apart
  await a.selectOption("#fmtSel", "sixty"); await a.selectOption("#legalSel", "modern");
  await a.fill("#deckIn", "30 Gamma Card\n2 Sol Ring\n\nSideboard\n3 Beta Card"); await a.click("#loadDeck");
  await expect(info).toContainText("32 cards found. Sideboard: 3.");
  await expect(info).toContainText("32 cards: 60-card formats need at least 60.");
  await expect(info).toContainText("Banned in Modern: Sol Ring.");
  await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  await expect(a.locator("#log")).toContainText("Deck check (only you see this)");
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "12 Gamma Card\n18 Forest"); await b.click("#joinBtn");
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });

  // House rules come up before the first game: friendly mulligans, no take-backs, 25 life
  await a.click("#startBtn");
  await expect(a.locator(".modal-card h2")).toHaveText("House rules");
  await a.locator("label.rule", { hasText:"Friendly mulligan" }).locator("input").check();
  await a.locator("label.rule", { hasText:"No take-backs" }).locator("input").check();
  await a.locator("label.rule", { hasText:"No infinite combos" }).locator("input").check();
  await a.fill(".modal input[aria-label='Starting life']", "25");
  await button(a, "Start the game");
  await expect(b.locator("#log")).toContainText("House rules: friendly mulligan; no take-backs; no infinite combos; starting life: 25.");
  await expect(b.locator("#rulesBtn")).toHaveText("House rules (4)");

  // Luke's hand has no lands, so a mulligan is free; his hand's cards pop out when he points at them
  await expect(a.locator(".modal-card h2")).toHaveText("Keep this hand?");
  await expect(a.locator(".modal")).toContainText("Friendly mulligan: this hand has 0 lands, so a mulligan is free.");
  await a.locator(".modal .gcard .card").first().hover();
  await expect(a.locator("#pop")).toBeVisible();
  const popW = await a.locator("#pop").evaluate(e => e.getBoundingClientRect().width);
  expect(popW).toBeGreaterThan(300);
  // Sideboarding before this game: one Beta Card comes in, and a new hand is dealt from the new deck
  await button(a, "Sideboard first");
  await expect(a.locator(".modal-card h2")).toHaveText("Sideboard");
  await a.locator(".modal .sbcols button", { hasText:"3 Beta Card" }).click();
  await expect(a.locator(".modal h3", { hasText:"Deck (33)" })).toHaveCount(1);
  await button(a, "Done");
  await expect(a.locator(".modal-card h2")).toHaveText("Keep this hand?");
  expect(await ktp(a, () => ktPlay.me.zones.lib.length + ktPlay.me.zones.hand.length)).toBe(33);
  await button(a, "Mulligan");
  await expect(a.locator("#log")).toContainText("You took a free mulligan (friendly mulligan: 0 lands).");
  await button(a, "Keep");
  await expect(a.locator("#hand .card")).toHaveCount(7);  // (nothing to put on the bottom)
  await button(b, "Keep");
  await expect(a.locator("#lifeOut")).toHaveText("25");
  await expect(a.locator("#undoBtn")).toBeHidden();

  // Power/toughness: a 3/4 shows 3/4; +2/+2 until end of turn makes it 5/6 (green), on both screens
  const bear = await fetchTo(a, "Gamma Card", "bf");
  const pt = a.locator(`#bf .card[data-iid="${bear}"] .pt`);
  await expect(pt).toHaveText("3/4");
  await a.locator(`#bf .card[data-iid="${bear}"]`).hover();
  await expect(a.locator("#pop")).toBeVisible();
  await a.locator(`#bf .card[data-iid="${bear}"]`).click({ button:"right" });
  await menu(a, "Power/toughness...");
  await button(a, "+2/+2");
  await expect(pt).toHaveText("5/6"); await expect(pt).toHaveClass(/up/);
  await expect(opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"] .pt`)).toHaveText("5/6");
  // Rick puts a -1/-1 counter on it from his screen
  await opp(b, "Luke").locator(`.obf .card[data-iid="${bear}"]`).click({ button:"right" });
  await menu(b, "Put a -1/-1 counter on it");
  await expect(pt).toHaveText("4/5");

  // The monarch: Luke takes it; Rick deals combat damage to him and it moves to Rick
  await a.click("#desigBtn"); await menu(a, "Become the monarch");
  await expect(opp(b, "Luke").locator(".badge")).toHaveText("👑 Monarch");
  const wolf = await fetchTo(b, "Gamma Card", "bf");
  await b.locator(`#bf .card[data-iid="${wolf}"]`).click({ button:"right" });
  await menu(b, "Attack Luke");
  await b.click("#dmgBtn");
  await button(a, "Take 3 damage");
  await expect(a.locator("#lifeOut")).toHaveText("22");
  await expect(b.locator("#myBadges .badge")).toHaveText("👑 Monarch");
  await expect(opp(a, "Rick").locator(".badge")).toHaveText("👑 Monarch");
  // Day and night
  await a.click("#desigBtn"); await menu(a, "It becomes night");
  await expect(b.locator("#dayChip")).toHaveText("☾ Night");

  // Turns: Rick's tab is in the background, so his turn starting chimes and notifies; the monarch draws as his turn
  // ends; and "until end of turn" changes wear off
  await ktp(b, () => {
    Object.defineProperty(document, "hidden", { configurable:true, get:() => true });
    window.__notes = []; window.Notification = class { static permission = "granted"; constructor(t){ window.__notes.push(t); } };
  });
  const pass = async (page) => { const n = await ktp(a, () => ktPlay.table.turnNum); await page.click("#nextTurn"); await expect.poll(() => ktp(a, () => ktPlay.table.turnNum)).toBe(n + 1); };
  if (await ktp(a, () => ktPlay.table.turnSeat) === 2) { await pass(b); await expect(a.locator("#log")).toContainText("Rick drew a card for being the monarch (end step)."); }
  await pass(a);
  await expect(pt).toHaveText("2/3");  // (the +2/+2 wore off; the counter stays)
  await expect.poll(() => ktp(b, () => window.__notes)).toEqual(["Your turn"]);
  expect(await ktp(b, () => ktPlay.alerts)).toEqual(["Your turn"]);
  await expect(b).toHaveTitle(/^● Your turn/);
  const hand = await ktp(b, () => ktPlay.me.zones.hand.length);
  await pass(b);
  await expect.poll(() => ktp(b, () => ktPlay.me.zones.hand.length)).toBe(hand + 1);
  // Rick, the monarch, leaves the game: the monarch passes to the player whose turn it is (or the next one)
  await expect(b.locator("#myBadges .badge")).toHaveText("👑 Monarch");
  await b.click("#leaveBtn");
  await expect(a.locator("#myBadges .badge")).toHaveText("👑 Monarch", { timeout:10000 });
  await expect(a.locator("#log")).toContainText("Rick left the game: Luke becomes the monarch.");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
