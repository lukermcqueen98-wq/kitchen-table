import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, logLines } from "../support/players.mjs";

// The webcam table's Coin button: a spinning coin everyone sees, landing on heads or tails
test("webcam table: the Coin button flips a coin for everyone", async () => {
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room }); await settle(b, 2000);
  await a.click("#coinBtn");
  for (const p of [a, b]) {
    await expect(p.locator(".modal-card h2")).toHaveText("Luke is flipping a coin");
    await expect(p.locator(".modal-card .die.coin")).toHaveCount(1);
  }
  await expect(b.locator(".rollstatus")).toHaveText(/^Luke flipped a coin: (Heads|Tails)\.$/, { timeout:5000 });
  const said = await b.locator(".rollstatus").textContent();
  await expect(b.locator(".modal-card .die.coin text")).toHaveText(said.includes("Heads") ? "Heads" : "Tails");
  await expect.poll(() => logLines(a)).toContainEqual(expect.stringContaining(said));
  await browser.close();
});
