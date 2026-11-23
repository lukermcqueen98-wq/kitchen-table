import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// Gamma Card is a 3/4 creature in the test cards; Sol Ring is an artifact
const DECK = `12 Gamma Card
4 Sol Ring
14 Forest`;
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const fetchTo = (page, name, zone) => ktp(page, ([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); delete c.etb; return c.iid; }, [name, zone]);
const button = (page, name) => page.locator(".modal").getByRole("button", { name, exact:true }).click();

test("buffs that aren't counters: from a card while it's out, and lasting on one card", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser();
  const a = await newPlayer(browser), b = await newPlayer(browser);
  await a.goto(`${BASE}/play.html?kt-test`);
  await a.fill("#nameIn", "Luke"); await a.selectOption("#fmtSel", "sixty"); await a.fill("#deckIn", DECK); await a.click("#joinBtn");
  await expect(a.locator("#table")).toBeVisible({ timeout:15000 });
  const room = new URL(a.url()).searchParams.get("room"); await settle(a);
  await b.goto(`${BASE}/play.html?kt-test&room=${room}`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", DECK); await b.click("#joinBtn");
  await expect(a.locator(".opp", { hasText:"Rick" })).toBeVisible({ timeout:15000 });
  await a.click("#startBtn"); await a.locator(".modal").getByRole("button", { name:"Start the game" }).click();
  for (const p of [a, b]) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();

  // A buff from a card while it's out (Patchwork Banner and the like): not counters, shown apart from them, gone when it leaves
  const x = await fetchTo(a, "Gamma Card", "bf"), y = await fetchTo(a, "Gamma Card", "bf"), ring = await fetchTo(a, "Sol Ring", "bf");
  const pt = iid => a.locator(`#bf .card[data-iid="${iid}"] .pt`), theirs = iid => b.locator(`.opp .obf .card[data-iid="${iid}"]`);
  await expect(pt(x)).toHaveText("3/4");
  await a.locator(`#bf .card[data-iid="${ring}"]`).click({ button:"right" });
  await a.locator(".modal .cp-aura").getByRole("button", { name:"Buff your creatures while this is out..." }).click();
  await button(a, "Save");  // (+1/+1 to all your other creatures)
  await button(a, "Close");
  await expect(pt(x)).toHaveText("4/5"); await expect(pt(y)).toHaveText("4/5");
  await expect(a.locator(`#bf .card[data-iid="${x}"] .buffs`)).toHaveText("+1/+1 Sol Ring");
  await expect(a.locator(`#bf .card[data-iid="${x}"] .ctrs`)).toHaveCount(0);  // (no counters)
  expect(await ktp(a, iid => Object.keys(ktPlay.me.zones.bf.find(c => c.iid === iid).ctr || {}).length, x)).toBe(0);
  await expect(theirs(x).locator(".pt")).toHaveText("4/5", { timeout:15000 }); await expect(theirs(x).locator(".buffs")).toHaveText("+1/+1 Sol Ring");
  await expect(b.locator("#log")).toContainText("Sol Ring gives your other creatures +1/+1 for as long as it's out (not counters).");
  // (a creature that comes in later gets it too)
  const z = await fetchTo(a, "Gamma Card", "bf"); await expect(pt(z)).toHaveText("4/5");
  // (a lasting buff on one card, also not a counter)
  await a.locator(`#bf .card[data-iid="${y}"]`).click({ button:"right" });
  await a.locator(".modal .cp-mod").getByRole("button", { name:"+2/+2", exact:true }).click(); await button(a, "Close");
  await expect(pt(y)).toHaveText("6/7"); await expect(a.locator(`#bf .card[data-iid="${y}"] .buffs span`)).toHaveText(["+1/+1 Sol Ring", "+2/+2 while it's out"]);
  // (the card leaves: its buff is gone at once, everywhere)
  await ktp(a, iid => ktPlay.move(iid, "gy"), ring);
  await expect(pt(x)).toHaveText("3/4"); await expect(pt(y)).toHaveText("5/6"); await expect(a.locator(`#bf .card[data-iid="${x}"] .buffs`)).toHaveCount(0);
  await expect(theirs(x).locator(".pt")).toHaveText("3/4", { timeout:15000 }); await expect(theirs(x).locator(".buffs")).toHaveCount(0);

  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
