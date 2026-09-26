import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, say, lifeOf } from "../support/players.mjs";

test("captions: status, asking, lisp matching, voice commands, voice lookup, and captioning a friend from their audio", async () => {
  const b1 = await launchBrowser(), b2 = await launchBrowser({ mic:"phrases" });
  const a = await newPlayer(b1), b = await newPlayer(b2, { lisp:true });
  const room = await sitDown(a, "Luke", { deck:"1 Sol Ring" }); await settle(a);
  await sitDown(b, "Rick", { room, deck:"1 Gamma Card" }); await settle(b, 2000);

  // Rick has a lisp: "Thol Ring" links Sol Ring on Luke's screen, and "take thix" is 6 damage
  await say(b, "I cast Thol Ring and I take thix from Luke");
  await expect(a.locator("#captions .cardlink", { hasText:"Thol Ring" })).toHaveAttribute("title", "Sol Ring");
  expect(await lifeOf(b, 2)).toBe(34);

  // Rick's speech service fails (as in Brave): Luke's screen says why his captions aren't arriving
  await b.evaluate(() => { window.__speechError = "network"; });
  await b.click("#capBtn"); await b.click("#capBtn");
  await expect(a.locator("#capPeers")).toContainText("can't reach its speech service");

  // Clicking a caption card link switches to the Card tab and scrolls the side panel up to the card
  await a.$eval("aside", e => { e.scrollTop = e.scrollHeight; });
  await a.click("#tab-captions");
  await a.locator("#captions .cardlink").first().click();
  await expect(a.locator("#cardView h2").first()).toHaveText("Sol Ring");
  await expect(a.locator("#tab-card")).toHaveAttribute("aria-selected", "true");
  // (the panel scrolls smoothly, so wait for it to arrive)
  await expect.poll(() => a.evaluate(() => { const s = document.querySelector("#cardSec").getBoundingClientRect(), p = document.querySelector("aside").getBoundingClientRect(); return s.top >= p.top - 1 && s.top < p.bottom; })).toBe(true);

  // Voice lookup, and a question that isn't about a card is ignored
  await say(a, "what does rhystic study do");
  await expect(a.locator("#cardView h2").first()).toHaveText("Rhystic Study");
  await say(a, "what is my life");
  await expect(a.locator("#cardView h2").first()).toHaveText("Rhystic Study");

  // Rick turns his captions off: Luke's screen says so, can ask, and captions Rick from his audio meanwhile
  await b.click("#capBtn");
  await expect(a.locator("#capPeers")).toContainText("captions are off");
  await expect.poll(() => a.$$eval("#captions li[title]", l => l.length), { timeout:20000 }).toBeGreaterThan(0);
  await expect(a.locator("#capPeers .caplive")).toContainText(/Their audio: \u25AE+\. Phrases heard [1-9]/);
  // The diagnostics button copies a report covering both sides
  await a.click("#tab-captions");  // showing the card switched to the Card tab
  await a.click("#capDiag");
  const report = await a.evaluate(() => navigator.clipboard.readText());
  expect(report).toContain("Rick: their captions off");
  expect(report).toMatch(/captioning here on \(audio running/);
  await a.locator("#capPeers button", { hasText:"Ask them" }).click();
  await expect(b.locator("#toast")).toContainText("asked you to turn on captions");
  // His own captions come back and arrive: Luke's screen stops captioning him
  await b.evaluate(() => { window.__say = "hello from my own browser"; });
  await b.locator("#toast button", { hasText:"Turn on" }).click();
  await expect(a.locator("#capPeers")).toContainText("when their captions aren't coming through", { timeout:10000 });
  expect([...a.errors, ...b.errors]).toEqual([]);
  await b1.close(); await b2.close();
});
