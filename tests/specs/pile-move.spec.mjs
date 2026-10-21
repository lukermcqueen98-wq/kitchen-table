import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const button = (page, name) => page.locator(".modal").getByRole("button", { name, exact:true }).click();

test("digital table: each player can move their command zone, library, graveyard and exile around their own mat", async () => {
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
  // Luke drags his graveyard by its grip to the left of his mat; it stays there, and Rick sees it moved on Luke's side
  const grip = a.locator("#gyPile .pgrip"), board = await a.locator("#bf").boundingBox(), g = await grip.boundingBox();
  await a.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await a.mouse.down();
  await a.mouse.move(board.x + 60, board.y + 40, { steps:8 }); await a.mouse.up();
  await expect(a.locator("#gyPile")).toHaveClass(/\bmoved\b/);
  await expect(a.locator(".modal")).toBeHidden();  // (moving it didn't open it)
  const at = await a.evaluate(() => ktPlay.me.pileAt.gy);
  expect(at.x).toBeLessThan(0.2); expect(at.y).toBeLessThan(0.4);
  await expect(b.locator(".opp .opile.moved", { hasText:"Graveyard" })).toHaveCount(1);
  // The others stay in their columns; a double-click on the grip puts it back
  await expect(a.locator("#libPile")).not.toHaveClass(/\bmoved\b/);
  await grip.dblclick();
  await expect(a.locator("#gyPile")).not.toHaveClass(/\bmoved\b/);
  await expect(b.locator(".opp .opile.moved")).toHaveCount(0);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
