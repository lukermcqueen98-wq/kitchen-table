import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, tile, BASE } from "../support/players.mjs";

const NAMES = ["Luke", "Rick", "Sam", "Ana", "Bo", "Cy"];

test("Commander on the webcam table: six players see each other in two rows of three, and a seventh is turned away", async () => {
  test.setTimeout(240000);
  const browser = await launchBrowser();
  const ps = []; for (let i = 0; i < 7; i++) ps.push(await newPlayer(browser));
  const room = await sitDown(ps[0], NAMES[0], { mode:"cmdr" }); await settle(ps[0]);
  for (let i = 1; i < 6; i++) await sitDown(ps[i], NAMES[i], { room });
  for (const p of ps.slice(0, 6)) await expect(p.locator("#grid .tile")).toHaveCount(6, { timeout:30000 });
  await expect(ps[0].locator("#grid")).toHaveClass(/\bn6\b/);
  await expect(tile(ps[0], 6).locator(".pname")).toHaveText("Cy", { timeout:15000 });
  // Three across: the first and fourth cameras line up on the left, one above the other
  const [t1, t4] = [await tile(ps[0], 1).boundingBox(), await tile(ps[0], 4).boundingBox()];
  expect(Math.abs(t1.x - t4.x)).toBeLessThan(2); expect(t4.y).toBeGreaterThan(t1.y + t1.height - 2);

  await ps[6].goto(`${BASE}/index.html?room=${room}`); await ps[6].fill("#nameIn", "Dee"); await ps[6].click("#joinBtn");
  await expect(ps[6].locator("#lobbyErr")).toHaveText("This table already has 6 players.", { timeout:20000 });
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});

test("Commander on the digital table: six players, each sees five opponents in two rows, plus someone watching", async () => {
  test.setTimeout(240000);
  const browser = await launchBrowser();
  const ps = []; for (let i = 0; i < 7; i++) ps.push(await newPlayer(browser));
  let room = "";
  for (let i = 0; i < 6; i++) {
    const p = ps[i];
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", NAMES[i]); await p.selectOption("#fmtSel", "cmdr");
    await p.fill("#deckIn", "Commander\n1 Gamma Card\n\nDeck\n1 Sol Ring\n98 Forest");
    await p.click("#joinBtn");
    await expect(p.locator(".modal-card h2")).toHaveText("Who is your commander?", { timeout:15000 });
    await p.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  for (const p of ps.slice(0, 6)) await expect(p.locator(".opp")).toHaveCount(5, { timeout:30000 });
  await expect(ps[0].locator("#opps")).toHaveClass(/\bmany\b/);
  await expect(ps[0].locator("#ctrlBox .ctrlhead")).toHaveText("Commander damage you've taken");
  await expect(ps[0].locator("#libPile")).toBeInViewport();  // (the commander damage list for five opponents sits below the piles)
  await expect(ps[5].locator(".opp").first()).toContainText("Luke");
  // Two rows of three: the first and fourth boards line up on the left
  const [o1, o4] = await ps[0].evaluate(() => [...document.querySelectorAll(".opp")].filter((_, i) => i === 0 || i === 3).map(o => o.getBoundingClientRect().toJSON()));
  expect(Math.abs(o1.x - o4.x)).toBeLessThan(2); expect(o4.y).toBeGreaterThan(o1.y + o1.height - 2);

  // Someone watching takes a seat after the six players' and sees all of them
  const w = ps[6];
  await w.goto(`${BASE}/play.html?kt-test&room=${room}`); await w.fill("#nameIn", "Dee"); await w.check("#watchIn"); await w.click("#joinBtn");
  await expect(w.locator(".opp")).toHaveCount(6, { timeout:30000 });
  await expect(ps[0].locator("#watchers")).toHaveText("Watching: Dee", { timeout:15000 });
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
