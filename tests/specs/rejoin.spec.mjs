import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, tile, lifeOf, logLines } from "../support/players.mjs";

test("rejoining restores life, counters and the turn: same browser, new device, and the host alone", async () => {
  const b1 = await launchBrowser(), b2 = await launchBrowser();
  const a = await newPlayer(b1); let b = await newPlayer(b2);
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room }); await settle(b);
  const minus = tile(b, 2).locator('.life button[data-d="-1"]');
  for (let i = 0; i < 9; i++) await minus.click();
  await b.locator(".dmgask .skip").click();
  await tile(b, 2).locator(".ctr.add").click(); await b.getByText("Poison counters").click();
  await tile(b, 2).locator(".ctr", { hasText:"Poison" }).locator("button", { hasText:"+" }).click();
  await a.click("#passBtn"); await a.waitForTimeout(600); await b.click("#passBtn"); await a.waitForTimeout(600); await a.click("#passBtn");
  await expect(tile(a, 2).locator(".turnflag")).toHaveText("Their turn 2");

  // 1. Same browser: reload and sit back down
  await b.reload(); await b.click("#joinBtn");
  await expect.poll(() => logLines(b), { timeout:15000 }).toContainEqual(expect.stringContaining("Welcome back"));
  expect(await lifeOf(b, 2)).toBe(31);
  await expect(tile(b, 2).locator(".ctrs")).toContainText("Poison");
  await expect(tile(b, 2).locator(".turnflag")).toHaveText("Your turn 2");

  // 2. New device (fresh storage): the other player's screen hands the numbers back
  await b.context().close();
  b = await newPlayer(b2);
  await sitDown(b, "Rick", { room });
  await expect.poll(() => logLines(b), { timeout:15000 }).toContainEqual(expect.stringContaining("restored from the table"));
  expect(await lifeOf(b, 2)).toBe(31);

  // 3. Everyone leaves; the host comes back alone and gets the game back from their browser
  await b.context().close();
  await a.reload(); await a.click("#joinBtn");
  await expect.poll(() => logLines(a), { timeout:15000 }).toContainEqual(expect.stringContaining("Welcome back"));
  await expect(a.locator("#gameClock")).toHaveText(/Game \d/);
  expect(a.errors).toEqual([]);
  await b1.close(); await b2.close();
});
