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

  // Mana Luke has floating shows on his panel for Rick
  await a.locator("#manaBox button[aria-label^='G mana']").click();
  await a.locator("#manaBox button[aria-label^='G mana']").click();
  await a.locator("#manaBox button[aria-label^='R mana']").click();
  await expect(opp(b, "Luke").locator(".omana")).toHaveAttribute("aria-label", "Mana: 1 R, 2 G");

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
