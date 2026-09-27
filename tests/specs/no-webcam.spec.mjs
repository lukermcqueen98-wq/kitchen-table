import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, tile } from "../support/players.mjs";

// A player with no webcam (their phone is their camera) who sits down after everyone else still sees everyone's camera
test("a player without a webcam who joins last sees the others' cameras", async () => {
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser), c = await newPlayer(browser, { noWebcam:true });
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room }); await settle(b);
  await sitDown(c, "Sam", { room });
  for (const s of [1, 2]) await expect.poll(() => tile(c, s).locator("video").evaluate(v => v.videoWidth), { timeout:20000 }).toBeGreaterThan(0);
  await browser.close();
});
