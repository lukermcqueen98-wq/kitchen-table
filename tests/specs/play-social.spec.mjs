import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const DECK = `12 Gamma Card
18 Forest`;
const opp = (page, name) => page.locator(".opp", { hasText:name });
async function join(page, name, room, { watch = false, deckName = "" } = {}){
  await page.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
  await page.fill("#nameIn", name); await page.selectOption("#fmtSel", "sixty");
  if (watch) await page.check("#watchIn"); else { await page.fill("#deckIn", DECK); if (deckName) await page.fill("#deckName", deckName); }
  await page.click("#joinBtn");
  await expect(page.locator("#table")).toBeVisible({ timeout:15000 });
  return new URL(page.url()).searchParams.get("room");
}

test("digital table: chat, watching, a dropped connection, and game records", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser), c = await newPlayer(browser);
  const room = await join(a, "Luke", "", { deckName:"Gammas" }); await settle(a);
  await join(b, "Rick", room, { deckName:"Forests" });
  await expect(opp(a, "Rick")).toBeVisible({ timeout:15000 });

  // Watching: Sam joins without a deck; he sees both players and has no side of his own
  await join(c, "Sam", room, { watch:true });
  await expect(c.locator(".opp")).toHaveCount(2, { timeout:15000 });
  await expect(c.locator("#me")).toBeHidden();
  await expect(c.locator("#startBtn")).toBeHidden();
  await expect(a.locator("#watchers")).toHaveText("Watching: Sam", { timeout:10000 });
  await expect(a.locator(".opp")).toHaveCount(1);  // (people watching aren't players)

  // Chat reaches everyone, including people watching
  await b.fill("#chatIn", "good luck"); await b.press("#chatIn", "Enter");
  for (const p of [a, c]) await expect(p.locator("#log li.chat").last()).toHaveText(/Rick:good luck$/);
  await c.fill("#chatIn", "have fun"); await c.click("#chatForm button");
  await expect(a.locator("#log li.chat").last()).toHaveText(/Sam:have fun$/);

  // A game: Sam watches the cards arrive
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game" }).click();  // (house rules first)
  for (const p of [a, b]) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  await expect(c.locator(".modal")).toBeHidden();
  await a.locator("#hand .card").first().dblclick();
  await expect(opp(c, "Luke").locator(".obf .card")).toHaveCount(1);

  // Rick's connection drops (every WebRTC link of his closes, as when the internet cuts out); it comes back by itself
  await b.evaluate(() => window.__pcs.forEach(pc => pc.close()));
  await expect(opp(a, "Rick")).toContainText("(away)", { timeout:15000 });
  await expect(opp(a, "Rick")).not.toContainText("(away)", { timeout:30000 });
  await b.locator("#hand .card").first().dblclick();
  await expect(opp(a, "Rick").locator(".obf .card")).toHaveCount(1, { timeout:10000 });
  await expect(opp(c, "Rick").locator(".obf .card")).toHaveCount(1, { timeout:30000 });

  // Ending the game records who won, in every player's browser, and Stats sums it up
  const lukeFirst = await a.evaluate(() => ktPlay.table.firstSeat === 1);
  await a.click("#startBtn");
  await expect(a.locator(".modal-card h2")).toHaveText("Who won this game?");
  await a.locator(".modal").getByRole("button", { name:"Luke", exact:true }).click();
  for (const p of [a, b]) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  for (const p of [a, b]) {
    await p.click("#statsBtn");
    await expect(p.locator(".modal")).toContainText("1 game recorded");
    await expect(p.locator(".modal")).toContainText(`The first player won ${lukeFirst ? 1 : 0} of 1`);
    await expect(p.locator(".modal table.stats").first().locator("tr", { hasText:"Luke" })).toContainText("100%");
    await expect(p.locator(".modal table.stats tr", { hasText:"Gammas" })).toHaveCount(1);
    await p.locator(".modal").getByRole("button", { name:"Close", exact:true }).click();
  }
  // Records on another device: a backup file restores them, and sitting down with the group shares them
  const [dl] = await Promise.all([a.waitForEvent("download"), (async () => { await a.click("#statsBtn"); await a.locator(".modal").getByRole("button", { name:"Back up (file)" }).click(); })()]);
  const backup = await dl.path();
  const d = await newPlayer(browser);  // (a new device, at a table of its own: nothing recorded yet)
  await join(d, "Luke", "");
  await d.click("#statsBtn");
  await expect(d.locator(".modal")).toContainText("No games recorded yet");
  const [chooser] = await Promise.all([d.waitForEvent("filechooser"), d.locator(".modal").getByRole("button", { name:"Restore from a file" }).click()]);
  await chooser.setFiles(backup);
  await expect(d.locator("#toast")).toContainText("Restored 1 game.");
  const e = await newPlayer(browser);  // (another new device, sitting down with Rick: his records of games with Luke come over)
  await join(e, "Luke", room);
  await expect(e.locator("#log")).toContainText("Added 1 of your past games", { timeout:15000 });
  await e.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();  // (a game is on: this Luke gets a hand)
  await e.click("#statsBtn");
  await expect(e.locator(".modal")).toContainText("1 game recorded");
  await e.locator(".modal").getByRole("button", { name:"Close", exact:true }).click();

  // On a phone: nothing scrolls sideways, and the log and chat open from the Log button
  await a.setViewportSize({ width:390, height:844 });
  expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(a.locator("#chatIn")).toBeHidden();
  await a.click("#logBtn");
  await expect(a.locator("#chatIn")).toBeVisible();
  await a.click("#panelClose");
  await expect(a.locator("#chatIn")).toBeHidden();
  expect([...a.errors, ...b.errors, ...c.errors]).toEqual([]);
  await browser.close();
});
