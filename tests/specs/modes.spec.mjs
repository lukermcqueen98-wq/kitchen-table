import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, lifeOf, BASE } from "../support/players.mjs";

test("1v1 Commander: the host's mode syncs, a third player is turned away, and only the host can switch", async () => {
  const browser = await launchBrowser();
  const [a, b, c] = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  const room = await sitDown(a, "Luke", { mode:"duel" }); await settle(a);
  await sitDown(b, "Rick", { room, mode:"cmdr" });
  await expect(b.locator("#roomLabel")).toHaveText(/1v1 Commander/);
  await expect.poll(() => lifeOf(b, 2)).toBe(20);
  await expect(b.locator("#tblMode")).toBeDisabled();
  await expect(a.locator("#tblMode")).toBeEnabled();

  await c.goto(`${BASE}/index.html?room=${room}`); await c.fill("#nameIn", "Cam"); await c.click("#joinBtn");
  await expect(c).toHaveURL(/full=duel/, { timeout:20000 });
  await expect(c.locator("#lobbyErr")).toHaveText(/1v1 Commander and already has 2 players/);

  // Mid-game switch starts a new game for everyone at the new starting life
  await a.click("#startBtn");
  await a.click("#tab-table");
  await a.selectOption("#tblMode", "cmdr");
  await expect.poll(() => lifeOf(b, 2)).toBe(40);
  await expect(b.locator("#roomLabel")).toHaveText(/Commander/);
  await browser.close();
});
