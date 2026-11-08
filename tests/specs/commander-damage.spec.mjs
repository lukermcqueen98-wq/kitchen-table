import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const seat = (page, n) => page.locator(`.opp[data-seat="${n}"]`);

test("Commander on the digital table: everyone sees the commander damage each player has taken, on their mat", async () => {
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
  // Rick has taken 5 from Sam's commander and 18 from Luke's (his own counters)
  await rick.evaluate(() => { const cz = s => ktPlay.players[s].cz[0].iid; ktPlay.me.cmd[`3:${cz(3)}`] = 5; ktPlay.me.cmd[`1:${cz(1)}`] = 18; ktPlay.changed(); });
  // Luke sees it on Rick's mat: Sam's 5, and his own 18 ("You"), red as it's close to 21
  const onLuke = seat(luke, 2).locator(".ocmd");
  await expect(onLuke).toContainText("Sam 5", { timeout:15000 });
  await expect(onLuke.locator("b", { hasText:"You 18" })).toHaveClass(/danger/);
  // ...and so does Sam
  await expect(seat(sam, 2).locator(".ocmd")).toContainText("Luke 18", { timeout:15000 });
  await expect(seat(sam, 2).locator(".ocmd")).toContainText("You 5");
  // Nobody else has taken any: no chips on their mats
  await expect(seat(luke, 3).locator(".ocmd")).toHaveCount(0);
  await luke.screenshot({ path:`${process.env.SHOT_DIR || "test-results"}/commander-damage.png` }).catch(() => {});
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
