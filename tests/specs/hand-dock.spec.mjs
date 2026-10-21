import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

test("digital table: your hand docks at the bottom like Arena, and rises when you point at it", async () => {
  const browser = await launchBrowser(); const a = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test&dock`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", "30 Gamma Card\n30 Forest"); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 }); await settle(a);
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game", exact:true }).click();
  await a.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await expect(a.locator("#hand .card")).toHaveCount(7);
  const top = async () => (await a.locator("#handWrap").boundingBox()).y, vh = a.viewportSize().height;
  await a.mouse.move(700, 30);
  await expect.poll(top).toBeGreaterThan(vh - 80);  // (docked: only the tops of the cards show, over the table's edge)
  await a.mouse.move(700, vh - 20);
  await expect.poll(top).toBeLessThan(vh - 150);  // (pointing at it: the whole hand rises)
  await a.mouse.move(700, 30);
  await expect.poll(top).toBeGreaterThan(vh - 80);
  await expect(a.locator("#myPlate")).toHaveCount(0);  // (no name plate on your own mat)
  expect(a.errors).toEqual([]);
  await browser.close();
});
