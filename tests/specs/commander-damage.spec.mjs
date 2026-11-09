import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const boards = page => page.evaluate(() => [...document.querySelectorAll("#myFrame, .oframe")].map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(","); }));

test("Commander on the digital table: everyone sees the commander damage each player has taken, in the middle of the table", async () => {
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
  const [luke, rick, sam] = ps;
  for (const p of ps) await expect(p.locator(".opp")).toHaveCount(2, { timeout:30000 });
  // (once the table has settled after everyone sat down)
  let before = ""; await expect.poll(async () => { const now = JSON.stringify(await boards(luke)); const same = now === before; before = now; return same; }, { timeout:15000, intervals:[700] }).toBe(true);
  before = JSON.parse(before);
  // (a grid in the middle: a row for each player, a column for each commander)
  const cell = (page, label) => page.locator(`#cmdGrid [title^="${label}"]`);
  await expect(luke.locator("#cmdGrid .cg-name")).toHaveText(["You", "Rick", "Sam"]);
  await expect(cell(luke, "Rick took 0 from your Gamma Card")).toHaveCount(1);
  // Rick has taken 5 from Sam's commander and 18 from Luke's (his own counters)
  await rick.evaluate(() => { const cz = s => ktPlay.players[s].cz[0].iid; ktPlay.me.cmd[`3:${cz(3)}`] = 5; ktPlay.me.cmd[`1:${cz(1)}`] = 18; ktPlay.changed(); });
  // Luke sees it in Rick's row: 5 under Sam's commander, 18 under his own, red as it's close to 21
  await expect(cell(luke, "Rick took 5 from Sam's Gamma Card")).toHaveText("5", { timeout:15000 });
  await expect(cell(luke, "Rick took 18 from your Gamma Card")).toHaveClass(/danger/);
  // ...and so does Sam
  await expect(cell(sam, "Rick took 18 from Luke's Gamma Card")).toHaveText("18", { timeout:15000 });
  await expect(cell(sam, "Rick took 5 from your Gamma Card")).toHaveText("5");
  // The boards didn't move or change size: the grid fills the space the middle already had
  expect(await boards(luke)).toEqual(before);
  await expect(luke.locator(".opp .ocmd")).toHaveCount(0);  // (not on the mats at the long table)
  // Luke changes his own (a number in his row): it changes his life too, and everyone sees it
  await cell(luke, "You took 0 from Sam's Gamma Card").click();
  await luke.locator(".modal").getByRole("button", { name:"One more" }).click();
  await luke.locator(".modal").getByRole("button", { name:"One more" }).click();
  await luke.locator(".modal").getByRole("button", { name:"Done" }).click();
  await expect(luke.locator("#lifeOut")).toHaveText("38");
  await expect(cell(rick, "Luke took 2 from Sam's Gamma Card")).toHaveText("2", { timeout:15000 });
  await luke.screenshot({ path:`${process.env.SHOT_DIR || "test-results"}/commander-damage.png` }).catch(() => {});
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
