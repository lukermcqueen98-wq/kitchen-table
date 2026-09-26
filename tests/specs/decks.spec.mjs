import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, BASE } from "../support/players.mjs";

test("saved decks, and importing from deck links", async () => {
  const browser = await launchBrowser(), a = await newPlayer(browser);
  await a.goto(`${BASE}/index.html`);
  await a.fill("#deckIn", "Commander\n1 Alpha Card\n\n1 Beta Card\n1 Sol Ring");
  await a.fill("#deckName", "Alpha deck"); await a.click("#deckSave");
  await expect(a.locator("#deckMsg")).toHaveText('Saved "Alpha deck".');

  await a.fill("#deckUrl", "https://moxfield.com/decks/AbC123xyz"); await a.click("#deckImport");
  await expect(a.locator("#deckMsg")).toHaveText(/Imported and saved "Mox Test"/);
  await expect(a.locator("#deckIn")).toHaveValue("Commander\n1 Gamma Card\n\nDeck\n1 Sol Ring\n30 Mountain");

  await a.fill("#deckUrl", "https://archidekt.com/decks/123456/x"); await a.click("#deckImport");
  await expect(a.locator("#deckMsg")).toHaveText(/Archidekt didn't let this page read the deck/);

  // The picked deck is remembered
  await a.selectOption("#deckSel", { label:"Alpha deck" });
  await a.reload();
  await expect(a.locator("#deckSel option:checked")).toHaveText("Alpha deck");
  await expect(a.locator("#deckIn")).toHaveValue(/^Commander\n1 Alpha Card/);
  expect(a.errors).toEqual([]);
  await browser.close();
});
