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
  // Life totals don't change by voice: only the buttons change them
  await b.waitForTimeout(800);
  expect(await lifeOf(b, 2)).toBe(40);
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
  // Only what players do and the cards they name are captioned (not small talk), unless that's turned off.
  // A card named without "I play" pops up too, but not an everyday word that's also a card name ("order")
  await say(a, "we should order pizza after this");
  await say(a, "remember when Sol Ring was banned");
  await expect(a.locator("#captions li", { hasText:"pizza" })).toHaveCount(0);
  await expect(a.locator("#captions li", { hasText:"banned" })).toHaveCount(0);
  await expect(a.locator("#captions li").last()).toHaveText("You:Sol Ring");
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Sol Ring", { timeout:20000 });
  // ...once a minute: saying it again right away doesn't pop it up again
  await say(a, "that Sol Ring though");
  await expect(a.locator("#captions li").last()).toHaveText("You:Sol Ring");
  await expect.poll(() => logLines(a).then(l => l.filter(x => x.includes("You played Sol Ring")).length)).toBe(1);
  const lifeBefore = await lifeOf(a, 1);
  await say(a, "I gain 2 life");
  await expect(a.locator("#captions li", { hasText:"I gain 2 life" })).toHaveCount(1);
  await a.waitForTimeout(800);
  expect(await lifeOf(a, 1)).toBe(lifeBefore);
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
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Gwenom, Remorseless (+1 more)", { timeout:20000 });
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Commander's Sphere", { timeout:10000 });
  await expect(b.locator("#captions li", { hasText:"Commander's Sphere" }).last()).toContainText("Gwenom, Remorseless");
  await say(a, "I cast commander spear");
  await expect(a.locator("#captions li", { hasText:"I cast Commander's Sphere" })).toHaveCount(1);

  // A short name two cards share ("Krenko"), with neither at the table: nothing is guessed. Luke's camera asks
  // "Which Krenko?" with both, Rick's caption has a "Krenko?" link, and Luke's pick pops up for everyone
  await say(a, "krenko is out of control");
  const which = tile(a, 1).locator(".whichrow");
  await expect(which).toContainText("Which Krenko?");
  await expect(which.locator("button.which")).toHaveCount(2);
  await expect(b.locator("#captions .cardlink", { hasText:"Krenko?" })).toHaveCount(1);
  await which.locator("button.which", { hasText:"Krenko, Mob Boss" }).click();
  await expect(which).toHaveCount(0);
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Krenko, Mob Boss", { timeout:30000 });
  // ...and now that it's been seen, "Krenko" means that one
  await say(a, "krenko is out of control again");
  await expect(a.locator("#captions .cardlink", { hasText:"Krenko, Mob Boss" })).toHaveCount(1);
  await expect(tile(a, 1).locator(".whichrow")).toHaveCount(0);
  // Rick's "Krenko?" link opens the choice on his screen too
  await b.click("#tab-captions");
  await b.locator("#captions .cardlink", { hasText:"Krenko?" }).click();
  await tile(b, 1).locator(".whichrow button.which", { hasText:"Krenko, Tin Street Kingpin" }).click();
  await expect(b.locator("#cardView h2").first()).toHaveText("Krenko, Tin Street Kingpin");

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

  // "What card is that?": a mangled name alone doesn't pop up in table talk, but as the answer to that question it does
  const pops = () => logLines(a).then(l => l.filter(x => x.includes("You played Rhystic Study")).length);
  const before = await pops();
  await say(a, "it's ristic study");
  await a.waitForTimeout(800);
  expect(await pops()).toBe(before);
  await say(b, "what card is that");
  await a.waitForTimeout(500);
  await say(a, "oh it's ristic study");
  await expect.poll(pops).toBe(before + 1);
  for (const p of [a, b]) await expect(tile(p, 1).locator(".played")).toContainText("Rhystic Study", { timeout:20000 });

  // Nothing but card lookups works by voice: saying "I pass my turn" doesn't pass the turn
  await say(a, "okay I pass my turn");
  await a.waitForTimeout(800);
  expect((await logLines(b)).filter(l => /'s turn \d/.test(l))).toHaveLength(0);

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
