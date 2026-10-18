import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const step = (page, n) => page.locator(`.lstep[data-step="${n}"]`);

test("digital table: the lobby one step at a time (name, host or join, a deck from the gallery)", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const [a, b] = [await newPlayer(browser), await newPlayer(browser)];
  for (const p of [a, b]) {
    await p.goto(`${BASE}/play.html?kt-test&steps`);
    await p.evaluate(() => localStorage.setItem("kt-dig-decks", JSON.stringify({ Elves:"30 Gamma Card\n30 Forest" })));
    await p.reload();
  }

  // Luke hosts: step 1 asks his name, step 2 is Host by default, step 3 shows his saved deck as a tile
  await expect(step(a, 1)).toBeVisible(); await expect(step(a, 2)).toBeHidden(); await expect(step(a, 3)).toBeHidden();
  await a.fill("#nameIn", "Luke");
  await a.getByRole("button", { name:"Next: the table" }).click();
  await expect(step(a, 2)).toBeVisible(); await expect(step(a, 1)).toBeHidden();
  await expect(a.locator("#hostPick")).toHaveAttribute("aria-checked", "true");
  await a.selectOption("#fmtSel", "sixty");
  await a.click("#toDeck");
  await expect(step(a, 3)).toBeVisible();
  await expect(a.locator("#deckGallery .dtile")).toHaveCount(2);  // (Elves, and New deck)
  await a.locator("#deckGallery .dtile", { hasText:"Elves" }).click();
  await expect(a.locator("#deckGallery .dtile.on")).toContainText("60 cards");
  await expect(a.locator("#readyList")).toContainText("Luke");
  await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room");

  // Rick picks Join: sitting down with no code asks for one; a pasted invite link becomes its code
  await b.fill("#nameIn", "Rick");
  await b.getByRole("button", { name:"Next: the table" }).click();
  await b.click("#joinPick");
  await expect(b.locator("#joinPick")).toHaveAttribute("aria-checked", "true");
  await b.click("#joinBtn");
  await expect(b.locator("#lobbyErr")).toHaveText("Type your friend's table code, or pick Host a new table.");
  await expect(b.locator("#lobby")).toBeVisible();
  await b.fill("#roomIn", `${BASE}/play.html?room=${room}`);
  await expect(b.locator("#roomIn")).toHaveValue(room);
  await b.selectOption("#fmtSel", "sixty");
  await b.click("#toDeck");
  await b.locator("#deckGallery .dtile", { hasText:"Elves" }).click();
  await b.click("#joinBtn");
  await expect(b.locator("#table")).toBeVisible({ timeout:15000 });
  await expect(a.locator(".opp", { hasText:"Rick" })).toHaveCount(1, { timeout:20000 });
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
