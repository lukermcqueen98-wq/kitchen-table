import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown } from "../support/players.mjs";

// The webcam table's card view: mana symbols sit in the line (the cost beside the name, and inside the rules text),
// not each on a line of its own
test("card view: mana symbols stay in the line", async () => {
  const browser = await launchBrowser(), a = await newPlayer(browser);
  await sitDown(a, "Luke");
  await a.fill("#searchIn", "Sol Ring"); await a.click("#searchBtn");
  await expect(a.locator("#cardView h2").first()).toContainText("Sol Ring");
  const rows = await a.evaluate(() => {
    const top = e => Math.round(e.getBoundingClientRect().top), h2 = document.querySelector("#cardView h2");
    return { cost:[...h2.querySelectorAll("img.msym")].map(top), text:[...document.querySelectorAll("#cardView .oracle img.msym")].map(top), name:top(h2) };
  });
  // (the {2} in the cost: two symbols on the name's line; "{T}: Add {C}{C}.": three symbols on one line)
  expect(new Set(rows.cost).size).toBe(1);
  expect(rows.text.length).toBe(3); expect(new Set(rows.text).size).toBe(1);
  expect(Math.abs(rows.cost[0] - rows.name)).toBeLessThan(20);
  await browser.close();
});
