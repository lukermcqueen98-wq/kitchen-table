import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, tile } from "../support/players.mjs";

// If only the video link between two players drops mid-game (the data link stays up), it comes back by itself
test("a dropped video link reconnects by itself", async () => {
  const browser = await launchBrowser(), a = await newPlayer(browser), b = await newPlayer(browser);
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room });
  // (a received stream keeps the sender's id, so the old one is tagged to tell it from the new one)
  const video = () => tile(b, 1).locator("video").evaluate(v => ({ old:!!v.srcObject?.__old, w:v.videoWidth }));
  await expect.poll(async () => (await video()).w, { timeout:20000 }).toBeGreaterThan(0);
  await tile(b, 1).locator("video").evaluate(v => { v.srcObject.__old = true; });
  // cut Luke's video link (the connections carrying video), leaving the data link alone
  await a.evaluate(() => window.__pcs.filter(pc => pc.getReceivers().some(r => r.track?.kind === "video")).forEach(pc => pc.close()));
  await expect.poll(async () => { const v = await video(); return !v.old && v.w > 0; }, { timeout:30000 }).toBe(true);
  await browser.close();
});
