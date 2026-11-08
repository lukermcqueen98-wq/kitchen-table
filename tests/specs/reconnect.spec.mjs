import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const DECK = "12 Gamma Card\n18 Forest", NAMES = ["Luke", "Rick", "Sam"];
const opp = (page, name) => page.locator(".opp", { hasText:name });

test("digital table: a player whose connection dies quietly is shown reconnecting and comes back by itself; one who leaves rejoins their seat", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser(), ps = []; let room = "";
  for (const name of NAMES) {
    const p = await newPlayer(browser); ps.push(p);
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", name); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", DECK); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  for (const p of ps) await expect(p.locator(".opp")).toHaveCount(2, { timeout:20000 });
  const [luke, rick] = ps; let sam = ps[2];
  await luke.click("#startBtn"); await luke.locator(".modal").getByRole("button", { name:"Start the game" }).click();
  for (const p of ps) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();

  await luke.waitForTimeout(4000);  // (a few heartbeats first)
  // A. Sam's links go dead without closing (a laptop lid, lost Wi-Fi): nothing in or out on them
  await sam.evaluate(() => { for (const c of Object.values(ktPlay.conns)) { c.send = () => {}; c.removeAllListeners("data"); } });
  // (the quiet links are noticed within 12 seconds and replaced: what he does reaches everyone again, both ways)
  const dead = await luke.evaluate(() => ktPlay.conns[3]);
  await expect.poll(() => luke.evaluate(d => ktPlay.conns[3] && ktPlay.conns[3].open && Date.now() - ktPlay.conns[3].seen < 5000 && ktPlay.conns[3].connectionId !== d, dead?.connectionId), { timeout:40000 }).toBe(true);
  await expect.poll(() => rick.evaluate(() => !!ktPlay.conns[3]?.open && Date.now() - ktPlay.conns[3].seen < 5000), { timeout:40000 }).toBe(true);
  await sam.locator("#lifeMinus").click();
  for (const p of [luke, rick]) await expect(opp(p, "Sam").locator(".olife")).toHaveText("19", { timeout:15000 });
  await luke.locator("#lifeMinus").click();
  await expect(opp(sam, "Luke").locator(".olife")).toHaveText("19", { timeout:15000 });

  // B. Sam closes the page and opens the table link again: Rejoin puts him back in his seat with his cards
  const handBefore = await sam.evaluate(() => ktPlay.me.zones.hand.length), ctx = sam.context();
  await sam.close();
  for (const p of [luke, rick]) await expect(opp(p, "Sam").locator(".badge.away")).toBeVisible({ timeout:30000 });
  sam = await ctx.newPage(); sam.errors = [];
  await sam.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await expect(sam.locator("#resumeBtn")).toHaveText("Rejoin as Sam");
  await expect(sam.locator("#resumeText")).toContainText("seat 3");
  await sam.click("#resumeBtn");
  await expect(sam.locator("#table")).toBeVisible({ timeout:40000 });
  expect(await sam.evaluate(() => [ktPlay.me.zones.hand.length, ktPlay.me.life])).toEqual([handBefore, 19]);
  for (const p of [luke, rick]) await expect(opp(p, "Sam").locator(".badge.away")).toHaveCount(0, { timeout:40000 });
  await expect(sam.locator(".opp")).toHaveCount(2, { timeout:30000 });
  expect(await luke.evaluate(() => Object.keys(ktPlay.players).sort())).toEqual(["1", "2", "3"]);  // (the same seat, not a new one)
  await sam.locator("#lifeMinus").click();
  for (const p of [luke, rick]) await expect(opp(p, "Sam").locator(".olife")).toHaveText("18", { timeout:15000 });

  // C. Sam's save is gone (another device, or storage was full): he sits down again with his name and deck, and the
  // table offers his old seat back, rebuilt from what everyone can see of it
  await sam.locator("#hand .card").first().dblclick();  // (a card on the battlefield to come back)
  await expect(opp(luke, "Sam").locator(".obf .card")).toHaveCount(1, { timeout:15000 });
  const handC = await sam.evaluate(() => ktPlay.me.zones.hand.length);
  await sam.close();
  for (const p of [luke, rick]) await expect(opp(p, "Sam").locator(".badge.away")).toBeVisible({ timeout:30000 });
  sam = await ctx.newPage(); sam.errors = [];
  // (old saves from other tables are cleared out when the page opens: only the newest two are kept)
  await sam.goto(`${BASE}/play.html?kt-test`);
  await sam.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("kt-dig-save:")) localStorage.removeItem(k); });  // (his save is gone)
  await sam.evaluate(() => { for (let i = 0; i < 4; i++) localStorage.setItem(`kt-dig-save:old${i}`, JSON.stringify({ at:Date.now() - i * 1000 })); localStorage.setItem("kt-dig-save:ancient", JSON.stringify({ at:Date.now() - 13 * 3600e3 })); });
  await sam.goto(`${BASE}/play.html?kt-test&room=${room}`);
  expect(await sam.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("kt-dig-save:")).sort())).toEqual(["kt-dig-save:old0", "kt-dig-save:old1"]);
  await expect(sam.locator("#resume")).toBeHidden();
  await sam.fill("#nameIn", "Sam"); await sam.selectOption("#fmtSel", "sixty"); await sam.fill("#deckIn", DECK); await sam.click("#joinBtn");
  await expect(sam.locator("#table")).toBeVisible({ timeout:20000 });
  const keep = sam.locator(".modal").getByRole("button", { name:"Keep", exact:true });
  await keep.click({ timeout:15000 }).catch(() => {});
  await expect(sam.locator(".modal-card h2")).toHaveText("Take your seat back?", { timeout:20000 });
  await expect(sam.locator(".modal")).toContainText("seat 3");
  await sam.locator(".modal").getByRole("button", { name:"Take it back", exact:true }).click();
  await sam.waitForURL(/rejoin=1/, { timeout:15000 });
  await expect(sam.locator("#table")).toBeVisible({ timeout:40000 });
  await expect.poll(() => sam.evaluate(() => ktPlay?.me && [ktPlay.me.life, ktPlay.me.zones.bf.length, ktPlay.me.zones.hand.length]).catch(() => null), { timeout:20000 }).toEqual([18, 1, handC]);  // (the same number of cards in hand as before)
  for (const p of [luke, rick]) await expect(opp(p, "Sam").locator(".badge.away")).toHaveCount(0, { timeout:40000 });
  for (const p of [luke, rick]) await expect(p.locator(".opp")).toHaveCount(2, { timeout:20000 });  // (no extra seat left behind)
  expect(await luke.evaluate(() => Object.keys(ktPlay.players).sort())).toEqual(["1", "2", "3"]);
  for (const p of [luke, rick]) expect(p.errors).toEqual([]);
  await browser.close();
});
