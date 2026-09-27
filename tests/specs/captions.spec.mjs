import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, say, lifeOf, tile, logLines } from "../support/players.mjs";

test("captions: status, asking, lisp matching, voice commands, voice lookup, and captioning a friend from their audio", async () => {
  const b1 = await launchBrowser(), b2 = await launchBrowser({ mic:"phrases" });
  const a = await newPlayer(b1), b = await newPlayer(b2, { lisp:true });
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room }); await settle(b, 2000);

  // Rick has a lisp: "Thol Ring" links Sol Ring on Luke's screen, and "take thix" is 6 damage
  await say(b, "I cast Thol Ring and I take thix from Luke");
  await expect(a.locator(`#captions .cardlink[title='Heard "thol ring"']`)).toHaveText("Sol Ring");
  // (a caption is just what he did: "I cast Sol Ring · I take 6")
  await expect(a.locator("#captions li", { hasText:"I cast Sol Ring" })).toContainText("I take 6");
  // A life change heard by voice waits for Rick to accept it, on his own screen only
  const ask = tile(b, 2).locator(".lifeask");
  await expect(ask).toContainText("take 6 from Luke (life 40 → 34)");
  await expect(tile(a, 2).locator(".lifeask")).toHaveCount(0);
  expect(await lifeOf(b, 2)).toBe(40);
  await ask.getByRole("button", { name:"Accept" }).click();
  await expect(ask).toHaveCount(0);
  expect(await lifeOf(b, 2)).toBe(34);
  // ...and saying he cast it pops Sol Ring up on Rick's camera on Luke's screen
  await expect(tile(a, 2).locator(".played")).toContainText("Sol Ring");
  await expect.poll(() => logLines(a)).toContainEqual(expect.stringContaining("Rick played Sol Ring"));

  // A name the recognizer turned into other words: the closest-sounding card
  await say(a, "I cast rhythmic study");
  await expect(tile(a, 1).locator(".played")).toContainText("Rhystic Study");

  // "I play my commander" names the commander that player set, and pops it up too
  await tile(a, 1).locator(".cmdr.ask").click();
  await a.locator('.modal-card input[placeholder="Start typing a card name"]').first().fill("Gamma Card");
  await a.locator(".modal-card button.primary").click();
  await say(a, "I play my commander");
  await expect(b.locator("#captions li", { hasText:"I play Gamma Card" })).toHaveCount(1);
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Gamma Card", { timeout:20000 });

  // Lands aren't popped up, and a card name that can't be made out gets "Please repeat"
  await say(a, "I play a Forest");
  await a.waitForTimeout(800);
  await expect(tile(a, 1).locator(".played")).toHaveCount(0);
  await say(a, "I play blorptastic wizzlequark");
  await expect(a.locator("#captions li", { hasText:"I play _" })).toHaveCount(1);
  await expect(tile(a, 1).locator(".repeatask")).toHaveText("Please repeat what card you played");

  // Misheard names of cards nobody has in their deck still link, and every Magic keyword (from Scryfall's lists) does too,
  // but not everyday words that happen to be keywords
  // (captions start at the action phrase and link only cards; Magic terms live in the Terms tab)
  await say(a, "ok so now I cast ristic study with offspring and trample");
  await expect(a.locator("#captions li").last()).toHaveText("You:I cast Rhystic Study");
  await expect(a.locator("#captions .kwlink")).toHaveCount(0);
  await a.click("#tab-terms"); await a.fill("#termSearch", "offspring");
  await expect(a.locator("#termList summary")).toHaveText(["Offspring"]);
  await a.fill("#termSearch", "trample");
  await expect(a.locator("#termList p").first()).toContainText("combat damage beyond");
  // Only what players do is captioned (not small talk, not a card mentioned in passing), unless that's turned off
  await say(a, "we should order pizza after this");
  await say(a, "remember when Sol Ring was banned");
  await expect(a.locator("#captions li", { hasText:"pizza" })).toHaveCount(0);
  await expect(a.locator("#captions li", { hasText:"banned" })).toHaveCount(0);
  await say(a, "I gain 2 life");
  await expect(a.locator("#captions li", { hasText:"I gain 2 life" })).toHaveCount(1);
  // ...and Cancel leaves the life total alone
  const before = await lifeOf(a, 1);
  await tile(a, 1).locator(".lifeask").getByRole("button", { name:"Cancel" }).click();
  await expect(tile(a, 1).locator(".lifeask")).toHaveCount(0);
  expect(await lifeOf(a, 1)).toBe(before);
  await a.click("#tab-captions"); await a.uncheck("#gameOnly");
  await say(a, "we should order pizza after this");
  await expect(a.locator("#captions li", { hasText:"pizza" })).toHaveCount(1);
  await a.check("#gameOnly");

  // Names as people say them: a legend's short name, split up by the recognizer ("Gwen um" for Gwenom), and a
  // possessive without its 's ("commander sphere")
  await say(a, "I cast gwen um and a commander sphere");
  await expect(a.locator("#captions .cardlink", { hasText:"Gwenom, Remorseless" })).toHaveCount(1);
  await expect(a.locator("#captions .cardlink", { hasText:"Commander's Sphere" })).toHaveCount(1);
  // every card in a caption pops up on the speaker's camera, on every screen, one after another
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Gwenom, Remorseless (+1 more)");
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Commander's Sphere", { timeout:10000 });
  await expect(b.locator("#captions li", { hasText:"Commander's Sphere" }).last()).toContainText("Gwenom, Remorseless");
  await say(a, "I cast commander spear");
  await expect(a.locator("#captions li", { hasText:"I cast Commander's Sphere" })).toHaveCount(1);

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

  // "I pass my turn" passes the turn, only for the player whose turn it is, and not for passing priority
  await say(a, "okay I pass my turn");
  await expect.poll(() => logLines(b)).toContainEqual(expect.stringContaining("Rick's turn 1"));
  await say(a, "I pass my turn");
  await say(b, "I pass priority");
  await a.waitForTimeout(800);
  expect((await logLines(b)).filter(l => /'s turn \d/.test(l))).toHaveLength(1);
  await say(b, "I'm done");
  await expect.poll(() => logLines(a)).toContainEqual(expect.stringContaining("Luke's turn 1"));

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
