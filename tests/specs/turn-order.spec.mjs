import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, tool } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

test("digital table: the turn order (and whose turn it is) can be changed any time, for everyone", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser(), ps = []; let room = "";
  for (const name of ["Luke", "Rick", "Sam"]) {
    const p = await newPlayer(browser); ps.push(p);
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", name); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", "12 Gamma Card\n18 Forest"); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  for (const p of ps) await expect(p.locator(".opp")).toHaveCount(2, { timeout:20000 });
  const [luke] = ps;
  await luke.click("#startBtn"); await luke.locator(".modal").getByRole("button", { name:"Start the game" }).click();
  for (const p of ps) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  const start = await luke.evaluate(() => ktPlay.table.order);
  // Luke moves the last player to the front, and makes it the second player's turn
  await tool(luke, "#orderBtn");
  const rows = luke.locator(".modal .orderlist li");
  await expect(rows).toHaveCount(3);
  const names = { 1:"Luke", 2:"Rick", 3:"Sam" };
  await expect(rows.nth(0)).toContainText(names[start[0]]);
  for (let i = 0; i < 2; i++) await luke.locator(".modal").getByRole("button", { name:`Move ${names[start[2]]} earlier` }).click();
  await expect(rows.nth(0)).toContainText(names[start[2]]);
  const want = [start[2], start[0], start[1]], up = await luke.evaluate(() => ktPlay.table.turnSeat);
  const next = want.findIndex(s => s !== up);  // (someone whose turn it isn't)
  await rows.nth(next).getByRole("button", { name:/^Their turn/ }).click();
  await luke.locator(".modal").getByRole("button", { name:"Save", exact:true }).click();
  // Everyone has the new order, and it's that player's turn
  for (const p of ps) {
    await expect.poll(() => p.evaluate(() => ktPlay.table.order), { timeout:15000 }).toEqual(want);
    await expect.poll(() => p.evaluate(() => ktPlay.table.turnSeat)).toBe(want[next]);
  }
  await expect(ps[1].locator("#log")).toContainText(`Luke changed the turn order: ${want.map(s => names[s]).join(", ")}. It's ${names[want[next]]}'s turn.`);
  // (and Next turn follows it: the next one down the list)
  await ps[want[next] - 1].click("#nextTurn");
  const keep = ps[want[next] - 1].locator(".modal").getByRole("button", { name:"Keep them (no maximum hand size)" }); if (await keep.isVisible().catch(() => false)) await keep.click();
  await expect.poll(() => luke.evaluate(() => ktPlay.table.turnSeat), { timeout:15000 }).toBe(want[(next + 1) % 3]);
  // Everyone's lands played this turn show on their name plate, by their hand count (red past one)
  const plate = (p, n) => p.locator(`.opp[data-seat="${n}"] .ohead`);
  await expect(plate(ps[1], 1).locator(".ocount.lands")).toHaveText("Lands 0");
  await luke.evaluate(() => { ktPlay.me.lands = 2; ktPlay.changed(); });
  for (const p of [ps[1], ps[2]]) {
    await expect(plate(p, 1).locator(".ocount.lands")).toHaveText("Lands 2", { timeout:15000 });
    await expect(plate(p, 1).locator(".ocount.lands")).toHaveClass(/warn/);
    await expect(plate(p, 1).locator(".ocount.lands")).toBeVisible();
    await expect(plate(p, 1)).toContainText("Hand");
  }
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
