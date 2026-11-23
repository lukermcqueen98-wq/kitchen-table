import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const boards = page => page.evaluate(() => [...document.querySelectorAll("#myFrame, .oframe")].map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(","); }));

test("digital table: the steps of the turn in the middle, and the tools, log and chat beside the table on a wide screen", async () => {
  test.setTimeout(120000);
  const browser = await launchBrowser(), ps = []; let room = "";
  for (const name of ["Luke", "Rick", "Sam"]) {
    const p = await newPlayer(browser); ps.push(p);
    await p.goto(`${BASE}/play.html?kt-test&dock${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", name); await p.selectOption("#fmtSel", "cmdr");
    await p.fill("#deckIn", "Commander\n1 Gamma Card\n\nDeck\n1 Sol Ring\n98 Forest"); await p.click("#joinBtn");
    await expect(p.locator(".modal-card h2")).toHaveText("Who is your commander?", { timeout:15000 });
    await p.locator(".modal").getByRole("button", { name:"Done", exact:true }).click();
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  for (const p of ps) await expect(p.locator(".opp")).toHaveCount(2, { timeout:30000 });
  const a = ps[0];
  // A screen with no room beside the table: the Table and Game menus and the Log button, as before
  await expect(a.locator("details.tmenu > summary")).toHaveText(["Table", "Game"]);
  await expect(a.locator("#logBtn")).toBeVisible(); await expect(a.locator("#dock")).toBeHidden();
  // A wide screen: the menus open out as buttons on the left, and the log and chat stay open on the right
  await a.setViewportSize({ width:1920, height:910 });
  await expect(a.locator("#dock #rollBtn")).toBeVisible();
  await expect(a.locator("#dock .mitem:visible")).not.toHaveCount(0);
  for (const id of ["#drawBtn", "#untapAllBtn", "#undoBtn", "#orderBtn", "#copyLink", "#termsBtn", "#leaveBtn"]) await expect(a.locator(`#dock ${id}`)).toBeVisible();
  await expect(a.locator("details.tmenu").first()).toBeHidden(); await expect(a.locator("#logBtn")).toBeHidden();
  await expect(a.locator("aside#panel #log")).toBeVisible(); await expect(a.locator("#chatIn")).toBeVisible();
  // (neither panel touches the table)
  expect(await a.evaluate(() => { const d = document.querySelector("#dock").getBoundingClientRect(), p = document.querySelector("#panel").getBoundingClientRect(), fr = [...document.querySelectorAll("#myFrame, .oframe")].map(e => e.getBoundingClientRect());
    return d.right < Math.min(...fr.map(r => r.left)) && p.left > Math.max(...fr.map(r => r.right)); })).toBe(true);
  // The game starts: the steps of the turn light up in the middle, for everyone; only the player whose turn it is moves them
  await a.locator("#startBtn").click(); await a.locator(".modal").getByRole("button", { name:"Start the game" }).click();
  for (const p of ps) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  const turn = await ktp(a, () => ktPlay.table.turnSeat), me = ps[turn - 1], other = ps[turn % 3];
  await me.setViewportSize({ width:1920, height:910 }); await other.setViewportSize({ width:1920, height:910 });
  await expect(me.locator("#phaseRow button.on")).toHaveText("Main 1");
  await expect(other.locator("#phaseRow button").first()).toBeDisabled(); await expect(other.locator("#endTurnBtn")).toBeHidden();
  await expect(other.locator("#turnToken")).toContainText("is up");
  const before = await boards(me);
  // Draw a card from the dock, and with D
  const hand = await me.locator("#hand .card").count();
  await me.locator("#dock #drawBtn").click(); await expect(me.locator("#hand .card")).toHaveCount(hand + 1);
  await me.keyboard.press("d"); await expect(me.locator("#hand .card")).toHaveCount(hand + 2);
  // Go to combat: the Combat step lights up on every screen, and the attack panel fills the middle beside your life
  await me.locator("#attackBtn").click();
  await expect(me.locator("#phaseRow button.on")).toHaveText("Combat"); await expect(other.locator("#phaseRow button.on")).toHaveText("Combat", { timeout:15000 });
  await expect(me.locator("#atkBar .atksteps .on")).toHaveText(/Pick attackers/);
  await expect(me.locator(".opp.atkt")).toHaveCount(2);
  await expect.poll(() => me.evaluate(() => { const l = document.querySelector("#side .lifebox").getBoundingClientRect(), p = document.querySelector("#atkBar .atkside").getBoundingClientRect(), s = document.querySelector("#side").getBoundingClientRect();
    return p.left > l.right && p.top >= s.top - 1 && p.bottom <= s.bottom + 1; })).toBe(true);  // (once it has slid in)
  await me.locator("#atkBar").getByRole("button", { name:"Cancel", exact:true }).click(); await expect(me.locator("#atkBar")).toBeHidden();
  // A step is a click away, and End my turn passes the turn
  await me.locator("#phaseRow button", { hasText:"Main 2" }).click(); await expect(other.locator("#phaseRow button.on")).toHaveText("Main 2", { timeout:15000 });
  expect(await boards(me)).toEqual(before);  // (none of it moved the boards)
  await ktp(me, () => { while (ktPlay.me.zones.hand.length > 7) ktPlay.move(ktPlay.me.zones.hand[0].iid, "lib"); });  // (no discarding down to seven first)
  await me.locator("#endTurnBtn").click();
  await expect.poll(() => ktp(a, () => ktPlay.table.turnSeat), { timeout:15000 }).not.toBe(turn);
  // Full screen, where the table fills the width: a tab on each edge slides the same panels out over the table's ends
  await a.evaluate(() => { window.__ktFull = true; }); await a.setViewportSize({ width:1920, height:1080 });
  await expect(a.locator("#dockTab")).toBeVisible(); await expect(a.locator("#logTab")).toBeVisible();
  await expect(a.locator("#dock #rollBtn")).toBeHidden(); await expect(a.locator("details.tmenu").first()).toBeHidden();
  const full = await boards(a);
  await a.locator("#dockTab").click(); await expect(a.locator("#dock #rollBtn")).toBeVisible();
  await a.locator("#dock #termsBtn").click(); await expect(a.locator(".modal-card h2")).toHaveText("Magic terms");
  await expect(a.locator("#dock #rollBtn")).toBeHidden();  // (picking a tool puts the panel away)
  await a.keyboard.press("Escape");
  await a.locator("#logTab").click(); await expect(a.locator("aside#panel #chatIn")).toBeVisible();
  await a.locator("#logTab").click(); await expect(a.locator("aside#panel #chatIn")).toBeHidden();
  expect(await boards(a)).toEqual(full);  // (the table stays as it is)
  if (process.env.SHOT) { await a.locator("#dockTab").click(); await a.locator("#logTab").click(); await a.waitForTimeout(500); await a.screenshot({ path:process.env.SHOT }); await a.keyboard.press("Escape"); }
  await a.evaluate(() => { window.__ktFull = false; });
  // Back on a narrow screen the buttons go back into their menus
  await a.setViewportSize({ width:1400, height:900 });
  await expect(a.locator("#dock")).toBeHidden(); await expect(a.locator("details.tmenu > summary")).toHaveText(["Table", "Game"]);
  await a.locator("details.tmenu > summary").first().click(); await expect(a.locator(".tmenu-pop #rollBtn")).toBeVisible();
  await browser.close();
});
