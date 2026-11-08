import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// (in the middle of the table, a line for each other player who has taken some)
const took = (page, n) => page.locator(`#cmdAll .ocmd.mid[data-seat="${n}"]`);
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
  await luke.waitForTimeout(800);
  const before = await boards(luke);
  await expect(luke.locator("#cmdAll")).toContainText("No commander damage taken by the others yet");
  // Rick has taken 5 from Sam's commander and 18 from Luke's (his own counters)
  await rick.evaluate(() => { const cz = s => ktPlay.players[s].cz[0].iid; ktPlay.me.cmd[`3:${cz(3)}`] = 5; ktPlay.me.cmd[`1:${cz(1)}`] = 18; ktPlay.changed(); });
  // Luke sees it in the middle: Sam's 5, and his own 18 ("You"), red as it's close to 21
  const onLuke = took(luke, 2);
  await expect(onLuke).toContainText("Rick took:", { timeout:15000 });
  await expect(onLuke).toContainText("Sam 5", { timeout:15000 });
  await expect(onLuke.locator("b", { hasText:"You 18" })).toHaveClass(/danger/);
  // ...and so does Sam
  await expect(took(sam, 2)).toContainText("Luke 18", { timeout:15000 });
  await expect(took(sam, 2)).toContainText("You 5");
  // The boards didn't move or change size: the middle of the table already had the room
  expect(await boards(luke)).toEqual(before);
  // Nobody else has taken any: no chips on their mats
  await expect(took(luke, 3)).toHaveCount(0);
  await expect(luke.locator(".opp .ocmd")).toHaveCount(0);  // (not on the mats at the long table)
  await luke.screenshot({ path:`${process.env.SHOT_DIR || "test-results"}/commander-damage.png` }).catch(() => {});
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
