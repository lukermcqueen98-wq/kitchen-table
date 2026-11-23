import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, tool, dragTo } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// Gamma Card is a 3/4 creature in the test cards
const DECK = `12 Gamma Card
4 Sol Ring
14 Forest`;
const ktp = (page, fn, arg) => page.evaluate(fn, arg);
const fetchTo = (page, name, zone) => ktp(page, ([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); delete c.etb; return c.iid; }, [name, zone]);

test("combat, step by step: the attacker deals the damage after the blocks (spells first), can end it with none, and can attack a planeswalker", async () => {
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
  if (await ktp(a, () => ktPlay.table.turnSeat) !== 1) { await b.click("#nextTurn"); await expect(a.locator("#turnInfo")).toContainText("Your turn"); }
  const x = await fetchTo(a, "Gamma Card", "bf"), y = await fetchTo(a, "Gamma Card", "bf"), w = await fetchTo(b, "Gamma Card", "bf");
  await expect(a.locator(`.opp .obf .card[data-iid="${w}"]`)).toHaveCount(1);
  const box = b.locator("#defendBox"), go = a.locator("#goBox");
  const attack = async (...iids) => {
    await ktp(a, ids => { for (const c of ktPlay.me.zones.bf) if (ids.includes(c.iid)) delete c.etb; }, iids);
    await a.click("#attackBtn");
    for (const iid of iids) await dragTo(a, a.locator(`#bf .card[data-iid="${iid}"]`), a.locator("#atkBar .atkdrop").first());
    await a.locator("#atkBar").getByRole("button", { name:`Send the attack (${iids.length})`, exact:true }).click();
  };

  // 1. Blocks are in: nothing happens until the attacker deals the damage, and a pump before that counts
  await attack(x, y);
  await box.getByRole("button", { name:"Choose blockers", exact:true }).click();
  await box.locator(".atkrow").first().locator(".blkopt:not(.none)").first().click();
  await box.getByRole("button", { name:"Done: take the damage", exact:true }).click();
  await expect(go).toContainText("Blocks are in"); await expect(go).toContainText("1 of your 2 blocked"); await expect(go).toContainText("Rick takes 3");
  await expect(box).toContainText("Waiting for Luke to deal the damage");
  await a.waitForTimeout(1500); await expect(b.locator("#lifeOut")).toHaveText("20");
  // (which one got through? give that one two +1/+1 counters, as a pump spell would)
  const free = await ktp(b, ([x, y]) => (ktPlay.me.cresp.blocks[x] || []).length ? y : x, [x, y]);
  await ktp(a, iid => { const c = ktPlay.me.zones.bf.find(c => c.iid === iid); c.ctr = { ...c.ctr, "+1/+1":2 }; ktPlay.changed(); }, free);
  await expect(go).toContainText("Rick takes 5");
  await go.getByRole("button", { name:"Deal combat damage", exact:true }).click();
  await expect(b.locator("#lifeOut")).toHaveText("15", { timeout:15000 });
  await expect(go).toBeHidden(); await expect(a.locator("#bf .card.attacking")).toHaveCount(0, { timeout:15000 });

  // 2. An attacker destroyed after the answer: the answer stands for the rest; No damage ends combat with none
  await tool(a, "#untapAllBtn");
  await attack(x, y);
  await box.getByRole("button", { name:"Take the damage", exact:true }).click();
  await expect(go).toContainText("Rick takes 8");
  await ktp(a, iid => ktPlay.move(iid, "gy"), free);
  await expect(go).toContainText("Rick takes 3");  // (no second question for Rick: the box on Luke's side is still there, with the new number)
  await expect(box.getByRole("button", { name:"Take the damage", exact:true })).toHaveCount(0);
  await go.getByRole("button", { name:"No damage", exact:true }).click();
  await expect(go).toBeHidden(); await expect(box).toBeHidden();
  await expect(b.locator("#log")).toContainText("Luke ended combat with no combat damage");
  await a.waitForTimeout(1500); await expect(b.locator("#lifeOut")).toHaveText("15");
  await expect(a.locator("#bf .card.attacking")).toHaveCount(0);

  // 3. Attacking a planeswalker: drop the creature on it; the damage comes off its loyalty, not the player's life
  for (const p of [a, b]) await ktp(p, () => { const k = [...ktPlay.cards.values()].find(c => c.name === "Sol Ring"); k.type_line = "Legendary Planeswalker — Test"; });
  const pw = await fetchTo(b, "Sol Ring", "bf");
  await ktp(b, iid => { const c = ktPlay.me.zones.bf.find(c => c.iid === iid); c.ctr = { Loyalty:4 }; ktPlay.changed(); }, pw);
  await expect(a.locator(`.opp .obf .card[data-iid="${pw}"]`)).toHaveCount(1);
  const rest = free === x ? y : x;
  await tool(a, "#untapAllBtn");
  await a.click("#attackBtn");
  await expect(a.locator(`.opp .obf .card.atkw[data-iid="${pw}"]`)).toHaveCount(1);
  await dragTo(a, a.locator(`#bf .card[data-iid="${rest}"]`), a.locator(`.opp .obf .card[data-iid="${pw}"]`));
  await expect(a.locator("#atkBar .atkdrop").first()).toContainText("Gamma Card at Sol Ring");
  await a.locator("#atkBar").getByRole("button", { name:"Send the attack (1)", exact:true }).click();
  await expect(b.locator("#log")).toContainText("Luke attacked Rick's Sol Ring with Gamma Card.");
  await expect(box).toContainText("at your Sol Ring"); await expect(box).toContainText("3 to Sol Ring");
  await box.getByRole("button", { name:"Take the damage", exact:true }).click();
  await expect(go).toContainText("Sol Ring takes 3");
  await go.getByRole("button", { name:"Deal combat damage", exact:true }).click();
  await expect(b.locator("#log")).toContainText("Sol Ring took 3 combat damage: 1 loyalty left", { timeout:15000 });
  expect(await ktp(b, iid => ktPlay.me.zones.bf.find(c => c.iid === iid).ctr.Loyalty, pw)).toBe(1);
  await expect(b.locator("#lifeOut")).toHaveText("15");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
