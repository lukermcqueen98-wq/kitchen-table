import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, say } from "../support/players.mjs";

// Newer Chrome can be given a list of phrases to expect. A speech service that fails on that list (with an error that
// doesn't say why) must not stop captions: they carry on without the list.
test("captions keep working when the speech service rejects the phrase list", async () => {
  const browser = await launchBrowser(), a = await newPlayer(browser, { rejectPhrases:true });
  await sitDown(a, "Luke");
  await say(a, "I cast Sol Ring");
  await expect(a.locator("#captions li", { hasText:"Sol Ring" })).toHaveCount(1, { timeout:8000 });
  await expect(a.locator("#capBtn")).toHaveText("Captions on");
  await browser.close();
});
