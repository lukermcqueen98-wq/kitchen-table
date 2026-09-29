import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const opp = (page, name) => page.locator(".opp", { hasText:name });
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const button = (page, name) => page.locator(".modal").getByRole("button", { name, exact:true }).click();

test("digital table: players who are out are skipped in turn order (0 life, or conceding)", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const [a, b, c] = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  const names = ["Luke", "Rick", "Sam"], pages = [a, b, c];
  for (const [i, p] of pages.entries()) {
    const room = i ? new URL(a.url()).searchParams.get("room") : "";
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", names[i]); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", "30 Gamma Card\n30 Forest"); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!i) await settle(a);
  }
  await expect(a.locator(".opp")).toHaveCount(2, { timeout:20000 });
  await expect(c.locator(".opp")).toHaveCount(2, { timeout:20000 });
  await a.click("#startBtn"); await button(a, "Start the game");
  for (const p of pages) await button(p, "Keep");
  const turn = () => ktp(a, () => ktPlay.table.turnSeat);
  const pass = async () => { const s = await turn(), n = await ktp(a, () => ktPlay.table.turnNum); await pages[s - 1].click("#nextTurn"); await expect.poll(() => ktp(a, () => ktPlay.table.turnNum)).toBe(n + 1); };

  // Sam hits 0 life on his own turn: he's asked, says he's out, and his turn passes on by itself
  while (await turn() !== 3) await pass();
  await ktp(c, () => { ktPlay.me.life = 1; });
  await c.click("#lifeMinus");
  await expect(c.locator(".modal-card h2")).toHaveText("Are you out of this game?");
  await expect(c.locator(".modal")).toContainText("You're at 0 life.");
  await button(c, "I'm out");
  await expect.poll(turn).toBe(1);
  for (const p of [a, b]) await expect(opp(p, "Sam").locator(".badge.out")).toHaveText("Out");
  await expect(c.locator("#myBadges")).toContainText("You're out");
  await expect(a.locator("#log")).toContainText("Sam is out of the game (at 0 life).");

  // Turns go Luke, Rick, Luke, Rick... never Sam
  const seen = [];
  for (let k = 0; k < 4; k++) { await pass(); seen.push(await turn()); }
  expect(seen).toEqual([2, 1, 2, 1]);

  // Rick concedes: Luke is the last one standing
  await b.click("#outBtn");
  await expect(opp(a, "Rick").locator(".badge.out")).toHaveText("Out");
  await expect(a.locator("#log")).toContainText("Luke is the last one standing.");
  await pass();
  expect(await turn()).toBe(1);
  expect([...a.errors, ...b.errors, ...c.errors]).toEqual([]);
  await browser.close();
});
