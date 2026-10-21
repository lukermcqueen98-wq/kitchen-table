import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, tile, tool, BASE } from "../support/players.mjs";

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
  // Long table (the default): you on the near side; the others around it in turn order from your left (left end,
  // across in two, right end) and the fifth beside you; their boards turn to face their seats
  await expect(ps[0].locator("#play")).toHaveClass(/\blt5\b/);
  const slots = await ps[0].evaluate(() => [...document.querySelectorAll(".opp")].map(o => { const r = o.getBoundingClientRect(); return { slot:o.dataset.slot, x:r.x, y:r.y, w:r.width, h:r.height }; }));
  expect(slots.map(o => o.slot)).toEqual(["L", "T1", "T2", "R", "BR"]);
  const [sl, st1, st2, sr, sbr] = slots, mine = await ps[0].locator("#me").boundingBox();
  expect(st1.x).toBeGreaterThan(sl.x + sl.w - 2); expect(st2.x).toBeGreaterThan(st1.x); expect(sr.x).toBeGreaterThan(st2.x + st2.w - 2);
  expect(sl.h).toBeGreaterThan(st1.h * 1.5);  // (the ends run the length of the table)
  expect(mine.y).toBeGreaterThan(st1.y + st1.h - 2); expect(sbr.x).toBeGreaterThan(mine.x);
  const turned = await ps[0].evaluate(() => [...document.querySelectorAll(".opp .oframe")].map(f => getComputedStyle(f).transform !== "none"));
  expect(turned).toEqual([true, true, true, true, true]);
  // ...and every battlefield is the same size, so each looks the way its owner sees it
  const sizes = await ps[0].evaluate(() => [...document.querySelectorAll(".oframe, #myFrame")].map(f => `${f.offsetWidth}x${f.offsetHeight}`));
  expect(sizes).toHaveLength(6); expect(new Set(sizes).size).toBe(1);
  await expect(ps[0].locator("#handWrap")).toBeVisible();
  // Game › Layout switches to the round table (and remembers it)
  await tool(ps[0], "#layoutBtn");
  await expect(ps[0].locator("#play")).toHaveClass(/\bround\b/);
  await expect(ps[0].locator("#layoutBtn")).toHaveText("Layout: Round table");
  // Round table, in turn order clockwise from your left: next player lower left, then upper left, across the top,
  // upper right, lower right; the middle shows the turn order
  const pos = await ps[0].evaluate(() => [...document.querySelectorAll(".opp")].map(o => ({ pos:o.dataset.pos, name:o.querySelector(".ohead b, .ohead strong")?.textContent || o.textContent.slice(0, 20), ...o.getBoundingClientRect().toJSON() })));
  expect(pos.map(p => p.pos)).toEqual(["L1", "L2", "T", "R1", "R2"]);
  const [l1, l2, t, r1, r2] = pos, meBox = await ps[0].locator("#me").boundingBox();
  expect(Math.abs(l1.x - l2.x)).toBeLessThan(2); expect(l1.y).toBeGreaterThan(l2.y);
  expect(t.x).toBeGreaterThan(l2.x + l2.width - 2); expect(r1.x).toBeGreaterThan(t.x + t.width - 2);
  expect(r2.y).toBeGreaterThan(r1.y); expect(meBox.y).toBeGreaterThan(l1.y + l1.height - 2);
  await expect(ps[0].locator("#hub .hubdot")).toHaveCount(6);
  await expect(ps[0].locator("#hub")).toContainText("Waiting to start");
  await expect(ps[0].locator(".opp").first()).toContainText("Rick");
  for (const id of ["#libPile", "#lifeOut", "#logBtn", "#nextTurn"]) await expect(ps[0].locator(id)).toBeVisible();
  await expect(ps[0].locator("details.tmenu > summary")).toHaveText(["Turn", "Table", "Game"]);  // (dice, tokens and the rest are in these)

  // Clicking a board's empty space zooms in on it (over the other boards, your own stays); Esc goes back
  const rick = ps[0].locator(".opp", { hasText:"Rick" });
  await rick.locator(".obf").click({ position:{ x:5, y:5 } });
  await expect(ps[0].locator(".opp.zoomed")).toHaveCount(1);
  await expect(ps[0].locator(".opp.zoomed")).toContainText("Rick");
  const z = await ps[0].locator(".opp.zoomed").boundingBox(), mb = await ps[0].locator("#me").boundingBox();
  expect(z.width).toBeGreaterThan(mb.width - 4); expect(z.y + z.height).toBeLessThan(mb.y + 2);
  await ps[0].keyboard.press("Escape");
  await expect(ps[0].locator(".opp.zoomed")).toHaveCount(0);
  await rick.getByRole("button", { name:"Zoom in" }).click();
  await ps[0].locator(".opp.zoomed").getByRole("button", { name:"Back to the table" }).click();
  await expect(ps[0].locator(".opp.zoomed")).toHaveCount(0);

  // Starting the game shuffles the turn order once; the table is laid out around you in that order
  await ps[0].click("#startBtn"); await ps[0].locator(".modal").getByRole("button", { name:"Start the game" }).click();
  await expect(ps[0].locator("#log")).toContainText("Turn order (chosen at random):");
  for (const p of ps.slice(0, 6)) await expect.poll(() => p.evaluate(() => ktPlay.table.order.length)).toBe(6);
  const order = await ps[0].evaluate(() => ktPlay.table.order);
  expect([...order].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  expect(await ps[0].evaluate(() => ktPlay.table.turnSeat)).toBe(order[0]);
  for (const p of ps.slice(0, 6)) {
    const i = order.indexOf(ps.indexOf(p) + 1);  // (each player took the next free seat as they sat down)
    const want = [...order.slice(i + 1), ...order.slice(0, i)];
    await expect.poll(() => p.evaluate(() => [...document.querySelectorAll(".opp")].map(o => +o.dataset.seat))).toEqual(want);
  }

  // Someone watching takes a seat after the six players' and sees all of them
  const w = ps[6];
  await w.goto(`${BASE}/play.html?kt-test&room=${room}`); await w.fill("#nameIn", "Dee"); await w.check("#watchIn"); await w.click("#joinBtn");
  await expect(w.locator(".opp")).toHaveCount(6, { timeout:30000 });
  await expect(ps[0].locator("#watchers")).toHaveText("Watching: Dee", { timeout:15000 });
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
