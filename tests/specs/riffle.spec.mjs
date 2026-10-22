import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

test("digital table: shuffling riffles the library, on your screen and on everyone else's", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser(); const [a, b] = [await newPlayer(browser), await newPlayer(browser)];
  let room = "";
  for (const [i, p] of [a, b].entries()) {
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", ["Luke", "Rick"][i]); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", "30 Gamma Card\n30 Forest"); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  await expect(a.locator(".opp")).toHaveCount(1, { timeout:20000 });
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game", exact:true }).click();
  for (const p of [a, b]) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await expect(a.locator("#libPile.riffling")).toHaveCount(0, { timeout:5000 });  // (the deal's shuffle is over)
  // Luke shuffles: his library riffles, and Rick sees Luke's library riffle too; then it settles
  await a.locator("#libPile").click({ button:"right" });
  await a.getByRole("menuitem", { name:"Shuffle", exact:true }).click();
  await expect(a.locator("#libPile")).toHaveClass(/\briffling\b/);
  await expect(b.locator(".opp .p-lib")).toHaveClass(/\briffling\b/);
  await expect(a.locator("#libPile")).not.toHaveClass(/\briffling\b/, { timeout:3000 });
  await expect(b.locator(".opp .p-lib")).not.toHaveClass(/\briffling\b/, { timeout:3000 });
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
