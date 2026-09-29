import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// A small stand-in for precons.json (the real one is built from MTGJSON and Scryfall when the site is published)
const names = ["Gamma Card", "Sol Ring", "Forest", "Alpha Card", "Beta Card"];
const PRECONS = { built:"2026-09-01", names, decks:[
  { name:"Gamma Growth", set:"TCM", date:"2026-08-01", type:"Commander Deck", fmt:"cmdr", std:false, beginner:false, colors:"UG", size:100, art:"",
    cmdr:[0], main:[1, 1, 2, 98], side:[], desc:"Simic (blue-green) Commander deck (2026), led by Gamma Card. Focus: ramp (extra mana)." },
  { name:"Alpha Starter", set:"TST", date:"2026-07-01", type:"Starter Kit", fmt:"sixty", std:true, beginner:true, colors:"", size:60, art:"",
    cmdr:[], main:[3, 20, 2, 40], side:[4, 2], desc:"Colorless starter kit (60-card, 2026). Legal in Standard." },
  { name:"Old Beta Theme", set:"OLD", date:"2004-01-01", type:"Theme Deck", fmt:"sixty", std:false, beginner:true, colors:"", size:60, art:"",
    cmdr:[], main:[4, 20, 2, 40], side:[], desc:"Colorless theme deck (60-card, 2004). Not legal in Standard any more (fine for casual games)." }] };

test("digital table: picking an official deck (Commander and 60-card), with descriptions and card lists", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser);
  await a.route("**/precons.json", r => r.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(PRECONS) }));
  await a.goto(`${BASE}/play.html?kt-test`);
  // A new player starts on the official decks: Commander decks first, each with its description
  await expect(a.locator("#tabOfficial")).toHaveAttribute("aria-selected", "true");
  await expect(a.locator("#pcList .pc")).toHaveCount(1);
  await expect(a.locator("#pcList .pc").first()).toContainText("led by Gamma Card");
  // 60-card decks: Standard-legal ones, then all of them, then only good first decks, and searching
  await a.selectOption("#pcKind", "std");
  await expect(a.locator("#pcList .pc h4")).toHaveText(["Alpha Starter"]);
  await expect(a.locator("#pcCount")).toContainText("Standard as of 2026-09-01");
  await a.selectOption("#pcKind", "sixty");
  await expect(a.locator("#pcList .pc")).toHaveCount(2);
  await a.fill("#pcSearch", "alpha card");  // (a card in the deck)
  await expect(a.locator("#pcList .pc h4")).toHaveText(["Alpha Starter"]);
  await a.fill("#pcSearch", "theme deck");  // (its kind)
  await expect(a.locator("#pcList .pc h4")).toHaveText(["Old Beta Theme"]);
  await a.fill("#pcSearch", "");
  await expect(a.locator("#pcList .pc")).toHaveCount(2);
  await a.check("#pcFirst");
  // Its cards, then picking it: the list, name and format are filled in and checked against Standard
  await a.locator(".pc", { hasText:"Alpha Starter" }).getByRole("button", { name:"See the cards" }).click();
  await expect(a.locator(".modal .cardlist").first()).toContainText("20 Alpha Card");
  await a.locator(".modal").getByRole("button", { name:"Use this deck" }).click();
  await expect(a.locator("#fmtSel")).toHaveValue("sixty");
  await expect(a.locator("#legalSel")).toHaveValue("standard");
  await expect(a.locator("#deckName")).toHaveValue("Alpha Starter");
  await expect(a.locator("#deckInfo")).toContainText("60 cards found. Sideboard: 2.");
  await expect(a.locator(".pc.on h4")).toHaveText("Alpha Starter");
  // A Commander precon: its commander is picked when you sit down
  await a.selectOption("#pcKind", "cmdr");
  await a.locator(".pc", { hasText:"Gamma Growth" }).getByRole("button", { name:"Use this deck" }).click();
  await expect(a.locator("#fmtSel")).toHaveValue("cmdr");
  await expect(a.locator("#deckInfo")).toContainText("100 cards found. Commander: Gamma Card.");
  await expect(a.locator("#deckIn")).toHaveValue(/^Commander\n1 Gamma Card\n\nDeck\n1 Sol Ring\n98 Forest$/);
  await a.fill("#nameIn", "Luke"); await a.click("#joinBtn");
  await expect(a.locator(".modal-card h2")).toHaveText("Who is your commander?");
  await expect(a.locator(".modal .chips")).toContainText("Gamma Card");
  // Your own lists are one tab away
  await a.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
  expect(a.errors).toEqual([]);
  await browser.close();
});
