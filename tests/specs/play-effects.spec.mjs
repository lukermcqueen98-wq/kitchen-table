import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// "Commander's Sphere" is a sorcery in the test cards with Cut a Deal's text: "Each opponent draws a card, then you
// draw a card for each opponent who drew a card this way."
const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const hand = page => ktp(page, () => ktPlay.me.zones.hand.length);
const fetchTo = (page, name, zone) => ktp(page, ([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); return c.iid; }, [name, zone]);
const button = (page, name) => page.locator(".modal").getByRole("button", { name, exact:true }).click();

test("digital table: effects on other players (Cut a Deal and the like), from the card, when it's cast, and Group effects", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  for (const [p, name, deck] of [[a, "Luke", "20 Commander's Sphere\n5 Rhystic Study\n35 Forest"], [b, "Rick", "20 Gamma Card\n40 Forest"]]) {
    const room = p === b ? new URL(a.url()).searchParams.get("room") : "";
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", name); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", deck); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (p === a) await settle(a);
  }
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of [a, b]) await button(p, "Keep");
  await expect(a.locator("#hand .card")).toHaveCount(7);

  // From the card's menu: each opponent draws a card, then Luke draws one for each
  const deal = await fetchTo(a, "Commander's Sphere", "hand");
  const [ha, hb] = [await hand(a), await hand(b)];
  await a.locator(`#hand .card[data-iid="${deal}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Each opponent draws 1 card, then you draw 1 for each" }).click();
  await expect.poll(() => hand(b)).toBe(hb + 1);
  await expect.poll(() => hand(a)).toBe(ha + 1);
  await expect(a.locator("#log")).toContainText("Rick drew a card (Luke's Commander's Sphere).");

  // Casting it (a sorcery: to the graveyard): the table offers to do it
  await a.locator(`#hand .card[data-iid="${deal}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Cast it (then to the graveyard)" }).click();
  await expect(a.locator(".modal-card h2")).toHaveText("Commander's Sphere");
  await button(a, "Each opponent draws 1 card, then you draw 1 for each");
  await expect.poll(() => hand(b)).toBe(hb + 2);

  // "Target player draws two cards": Luke picks Rick
  const study = await fetchTo(a, "Rhystic Study", "hand");
  const hb2 = await hand(b);
  await a.locator(`#hand .card[data-iid="${study}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Target player draws 2 cards..." }).click();
  await expect(a.locator(".modal-card h2")).toHaveText("Rhystic Study: target player");
  await button(a, "Rick");
  await expect.poll(() => hand(b)).toBe(hb2 + 2);
  await expect(b.locator("#log")).toContainText("Luke made Rick draw 2 cards (Rhystic Study).");

  // Casting a spell with a target: click the target (Rick's area); it flashes and chimes for him, and the spell's
  // effect is offered with the player to pick
  const bolt = await fetchTo(a, "Rhystic Study", "hand");
  await a.locator(`#hand .card[data-iid="${bolt}"]`).dblclick();
  await expect(a.locator("#toast")).toContainText("Click its target");
  await opp(a, "Rick").locator(".ohead").click();
  await expect(b.locator("#log")).toContainText("Luke cast Rhystic Study targeting Rick.");
  await expect(b.locator("#me.pinged")).toHaveCount(1);
  expect(await ktp(b, () => ktPlay.cues)).toContain("target");
  await expect(a.locator(".modal-card h2")).toHaveText("Rhystic Study");
  await button(a, "Not now");
  await expect(a.locator("#gyPile")).toContainText("Graveyard 2");

  // Group effects: Rick makes each opponent discard 2 (Luke chooses: at random) and Luke makes Rick lose 3 life
  await b.click("#fxBtn");
  await b.locator(".modal select[aria-label='What happens']").selectOption("discard");
  await b.fill(".modal input[aria-label='How many']", "2");
  await button(b, "Do it");
  await expect(a.locator(".modal-card h2")).toHaveText("Discard 2 cards (Rick)");
  const before = await hand(a);
  await button(a, "At random");
  await expect.poll(() => hand(a)).toBe(before - 2);
  await expect(a.locator("#gyPile")).toContainText("Graveyard 4");  // (the two spells cast and the two discards)
  await a.click("#fxBtn");
  await a.locator(".modal select[aria-label='What happens']").selectOption("lose");
  await a.fill(".modal input[aria-label='How many']", "3");
  await button(a, "Do it");
  await expect(b.locator("#lifeOut")).toHaveText("17");
  await expect(b.locator("#log")).toContainText("Luke made each opponent lose 3 life.");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
