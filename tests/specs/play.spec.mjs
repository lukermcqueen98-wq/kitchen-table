import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const DECK_A = `Commander
1 Gamma Card

Deck
1 Sol Ring
1 Rhystic Study
20 Forest
10 Alpha Card
10 Beta Card
1 Nonexistent Card

Sideboard
1 Commander's Sphere`;
const DECK_B = `4 Sol Ring
4 Alpha Card
4 Beta Card
24 Forest`;
const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn) => page.evaluate(fn);

test("digital table: first-visit choice, decklists, dealing and mulligans, playing cards, turns, and coming back", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser, { choose:true }), b = await newPlayer(browser);

  // First visit: the site asks how you want to play; the digital table is its own page
  await a.goto(`${BASE}/index.html`);
  await expect(a.locator("#choose")).toBeVisible();
  await a.click("#chooseDigital");
  await expect(a).toHaveURL(/play\.html/);
  await a.goto(`${BASE}/play.html?kt-test`);

  // Luke pastes a Commander list: sections and a commander heading are read, the sideboard is left out, and names
  // Scryfall doesn't know are listed
  await a.fill("#nameIn", "Luke");
  await a.fill("#deckIn", DECK_A);
  await a.fill("#deckName", "Gamma deck"); await a.click("#saveDeck");
  await a.click("#loadDeck");
  await expect(a.locator("#deckInfo")).toContainText("43 cards found");
  await expect(a.locator("#deckInfo")).toContainText("Not found (left out): Nonexistent Card");
  await expect(a.locator("#deckInfo")).toContainText("Commander: Gamma Card");
  await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  // Sitting down at a Commander table asks who your commander is (the list's commander is already picked)
  await expect(a.locator(".modal-card h2")).toHaveText("Who is your commander?");
  await expect(a.locator(".modal .chips")).toContainText("Gamma Card");
  await a.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
  const room = new URL(a.url()).searchParams.get("room");
  await expect(a.locator("#czone .card")).toHaveCount(1);
  await settle(a);

  // Rick joins with a 60-card list; the table's format (Commander) is the first player's
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.fill("#deckIn", DECK_B);
  await b.click("#joinBtn");
  await expect(b.locator("#table")).toBeVisible({ timeout:15000 });
  // Rick's list has no commander: he types one that's in his deck, and it comes out of his library
  await expect(b.locator(".modal-card h2")).toHaveText("Who is your commander?");
  await b.fill(".modal input[type=text]", "Sol Ring"); await b.locator(".modal").getByRole("button", { name:"Add", exact:true }).click();
  await expect(b.locator(".modal .chips")).toContainText("Sol Ring");
  await b.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
  await expect(b.locator("#czone .card")).toHaveCount(1);
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });
  await expect(opp(b, "Luke")).toBeVisible();
  await expect(b.locator("#lifeOut")).toHaveText("40");
  // Luke's commander shows in his command zone on Rick's screen
  await expect(opp(b, "Luke").locator(".ocz .card")).toHaveCount(1);

  // Start: everyone is dealt 7 and asked to keep or mulligan (London: draw 7, put one on the bottom per mulligan)
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game" }).click();  // (house rules first)
  for (const p of [a, b]) await expect(p.locator(".modal-card h2")).toHaveText("Keep this hand?", { timeout:10000 });
  await expect(a.locator(".modal .gcard")).toHaveCount(7);
  await a.locator(".modal").getByRole("button", { name:"Mulligan", exact:true }).click();
  await a.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await expect(a.locator(".modal-card h2")).toHaveText("Put 1 on the bottom");
  await a.locator(".modal .gcard button", { hasText:"To bottom" }).first().click();
  await a.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
  await b.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await expect(a.locator("#hand .card")).toHaveCount(6);
  expect(await ktp(a, () => ktPlay.me.zones.lib.length)).toBe(42 - 6);
  await expect(opp(b, "Luke")).toContainText("Hand 6");
  // (Rick's 36 cards, less the Sol Ring in his command zone)
  expect(await ktp(b, () => ktPlay.me.zones.lib.length + ktPlay.me.zones.hand.length)).toBe(35);

  // Playing a card (double-click) puts it on the battlefield for everyone; clicking it taps it
  await a.locator("#hand .card").first().dblclick();
  await expect(a.locator("#bf .card")).toHaveCount(1);
  await expect(opp(b, "Luke").locator(".obf .card")).toHaveCount(1);
  await a.locator("#bf .card").first().click();
  await expect(opp(b, "Luke").locator(".obf .card.tapped")).toHaveCount(1);
  await expect(b.locator("#log li").last()).toContainText("Luke played");

  // Dragging a card from hand onto the graveyard discards it
  const card = a.locator("#hand .card").first(), gy = a.locator("#gyPile");
  const cb = await card.boundingBox(), gb = await gy.boundingBox();
  await a.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await a.mouse.down();
  await a.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2, { steps:10 }); await a.mouse.up();
  await expect(a.locator("#gyPile")).toContainText("Graveyard 1");
  await expect(opp(b, "Luke")).toContainText("Graveyard 1");

  // Life: clicks sync, and a burst is one log line
  for (let i = 0; i < 3; i++) await a.click("#lifeMinus");
  await expect(opp(b, "Luke").locator(".olife")).toHaveText("37");
  await expect(b.locator("#log li", { hasText:"Luke lost 3 life (40 → 37)" })).toHaveCount(1, { timeout:5000 });

  // Turns: passing to the other player untaps their permanents and draws them a card
  const first = await ktp(a, () => ktPlay.table.turnSeat);
  const [active, other] = first === 1 ? [a, b] : [b, a];
  const libBefore = await ktp(other, () => ktPlay.me.zones.lib.length);
  await active.click("#nextTurn");
  await expect.poll(() => ktp(other, () => ktPlay.me.zones.lib.length)).toBe(libBefore - 1);
  await expect(other.locator("#turnInfo")).toContainText("Your turn (2)");
  if (other === a) await expect(a.locator("#bf .card.tapped")).toHaveCount(0);

  // Library tools: scry 2, keeping both on top in a new order
  await a.locator("#libPile").click({ button:"right" });
  await a.getByRole("menuitem", { name:"Scry..." }).click();
  await a.fill(".modal input[type=number]", "2"); await a.locator(".modal").getByRole("button", { name:"OK", exact:true }).click();
  await expect(a.locator(".modal-card h2")).toHaveText("Scry 2");
  await a.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
  await expect(b.locator("#log li").last()).toContainText("Luke scried 2: 2 on top");

  // Arrows: Luke points his card at Rick's card; both see the arrow
  await b.locator("#hand .card").first().dblclick();
  await expect(opp(a, "Rick").locator(".obf .card")).toHaveCount(1);
  await a.locator("#bf .card").first().click({ button:"right" });
  await a.getByRole("menuitem", { name:"Target with an arrow..." }).click();
  await opp(a, "Rick").locator(".obf .card").first().click();
  for (const p of [a, b]) await expect(p.locator("#arrows > path")).toHaveCount(1);
  await expect(b.locator("#log li").last()).toContainText("Luke pointed");

  // Attaching: Luke plays another card and attaches it to his first; it tucks behind it, on both screens
  await a.locator("#hand .card").first().dblclick();
  await expect(a.locator("#bf .card")).toHaveCount(2);
  const second = await a.locator("#bf .card").nth(1).getAttribute("data-iid");
  await a.locator(`#bf .card[data-iid="${second}"]`).click({ button:"right" });
  await a.getByRole("menuitem", { name:"Attach to..." }).click();
  await a.locator("#bf .card:not(.attached)").first().click();
  await expect(a.locator("#bf .card.attached")).toHaveCount(1);
  await expect(opp(b, "Luke").locator(".obf .card.attached")).toHaveCount(1);

  // Another player's cards: Rick takes control of Luke's first card, then destroys it; it goes to Luke's graveyard
  const host = await a.locator("#bf .card:not(.attached)").first().getAttribute("data-iid");
  await opp(b, "Luke").locator(`.obf .card[data-iid="${host}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"Gain control of it" }).click();
  await expect(b.locator(`#bf .card.theirs[data-iid="${host}"]`)).toHaveCount(1);
  await expect(a.locator(`#bf .card[data-iid="${host}"]`)).toHaveCount(0);
  await expect(a.locator("#bf .card.attached")).toHaveCount(0);  // (the equipment stays behind on Luke's side)
  const gyBefore = +(await a.locator("#gyPile").textContent()).match(/\d+/)[0];
  await b.locator(`#bf .card[data-iid="${host}"]`).click({ button:"right" });
  await b.getByRole("menuitem", { name:"To graveyard" }).click();
  await expect(a.locator("#gyPile")).toContainText(`Graveyard ${gyBefore + 1}`);
  await expect(b.locator(`#bf .card[data-iid="${host}"]`)).toHaveCount(0);
  // ...and Rick can tap Luke's remaining card from his screen
  await opp(b, "Luke").locator(".obf .card").first().click({ button:"right" });
  await b.getByRole("menuitem", { name:/^(Tap|Untap) it$/ }).click();
  await expect.poll(() => ktp(a, () => ktPlay.me.zones.bf[0].tapped)).toBeDefined();
  await expect(a.locator("#log li").last()).toContainText(/Rick (tapped|untapped) Luke's/);

  // Coming back: a refresh offers to continue, and the game is as it was
  const bfCount = await a.locator("#bf .card").count(), handCount = await a.locator("#hand .card").count();
  await a.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await expect(a.locator("#resume")).toBeVisible();
  await a.click("#resumeBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  await expect(a.locator("#bf .card")).toHaveCount(bfCount);
  await expect(a.locator("#hand .card")).toHaveCount(handCount);
  await expect(a.locator("#lifeOut")).toHaveText("37");
  await expect(opp(b, "Luke").locator(".obf .card")).toHaveCount(bfCount, { timeout:15000 });

  // Saved decks are there next time
  await a.goto(`${BASE}/play.html`);
  await expect(a.locator("#savedSel option", { hasText:"Gamma deck" })).toHaveCount(1);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
