import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, logLines, tile } from "../support/players.mjs";

test("three players all see each other, including the table's first player", async () => {
  // Regression: seat 1 used to keep dead connection attempts to empty seats and turn away later players
  const browser = await launchBrowser();
  const [a, b, c] = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room }); await settle(b);
  await sitDown(c, "Cam", { room });
  for (const [p, others] of [[a, ["Rick", "Cam"]], [b, ["Luke", "Cam"]], [c, ["Luke", "Rick"]]])
    for (const n of others) await expect.poll(() => logLines(p), { timeout:15000 }).toContainEqual(expect.stringContaining(`${n} sat down`));
  // and video arrives
  await expect.poll(() => tile(a, 2).locator("video").evaluate(v => v.videoWidth)).toBeGreaterThan(0);
  expect([...a.errors, ...b.errors, ...c.errors]).toEqual([]);
  await browser.close();
});
