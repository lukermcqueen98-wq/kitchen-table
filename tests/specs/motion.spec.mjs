import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, tool } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// (does the card with this id have a flight running: it lifts and arcs, so its keyframes carry a shadow)
const flying = (page, iid) => page.evaluate(i => [...document.querySelectorAll(`.card[data-iid="${i}"]`)].some(e => e.getAnimations().some(x => x.effect.getKeyframes().some(k => k.boxShadow))), iid);

test("digital table: played and drawn cards fly into place, on every screen; Game › Animations turns it off", async () => {
  const browser = await launchBrowser(); const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test&dock`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 }); await settle(a);
  const room = new URL(a.url()).searchParams.get("room");
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`); await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "30 Gamma Card\n30 Forest"); await b.click("#joinBtn");
  await expect(a.locator(".opp")).toHaveCount(1, { timeout:20000 });
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game", exact:true }).click();
  for (const p of [a, b]) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await a.waitForTimeout(800);
  // Playing a card: it flies from Luke's hand onto his mat, and on Rick's screen out of Luke's side of the table
  const iid = await a.locator("#hand .card").first().getAttribute("data-iid");
  await a.locator(`#hand .card[data-iid="${iid}"]`).dblclick();
  await expect.poll(() => flying(a, iid), { timeout:2000, intervals:[20] }).toBe(true);
  await expect.poll(() => flying(b, iid), { timeout:4000, intervals:[20] }).toBe(true);
  // Drawing: the card flies off the library into the hand
  await a.waitForTimeout(900);
  const top = await a.evaluate(() => ktPlay.me.zones.lib[0].iid);
  await a.locator("#libPile").dblclick();
  await expect.poll(() => flying(a, top), { timeout:2000, intervals:[20] }).toBe(true);
  // Off: nothing flies
  await tool(a, "#motionBtn"); await expect(a.locator("#motionBtn")).toHaveText("Animations: Off");
  await a.waitForTimeout(900);
  const next = await a.evaluate(() => ktPlay.me.zones.lib[0].iid);
  await a.locator("#libPile").dblclick();
  await expect(a.locator(`#hand .card[data-iid="${next}"]`)).toHaveCount(1);
  expect(await flying(a, next)).toBe(false);
  for (const p of [a, b]) expect(p.errors).toEqual([]);
  await browser.close();
});
