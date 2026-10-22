import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, dragTo, tool } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// Gamma Card is a 3/4 creature in the test cards
const DECK = `12 Gamma Card
18 Forest`;
const NAMES = ["Luke", "Rick", "Sam"];
const fetchTo = (page, name, zone) => page.evaluate(([name, zone]) => { const c = ktPlay.me.zones.lib.find(c => ktPlay.cards.get(c.id)?.name === name); ktPlay.move(c.iid, zone); delete c.etb; return c.iid;  /* (as if it had been there since last turn) */ }, [name, zone]);

test("digital table: combat damage waits for everyone attacked, Interrupt calls the attack off, and a new attack lands all at once", async () => {
  test.setTimeout(180000);
  const browser = await launchBrowser(); const ps = [];
  let room = "";
  for (const name of NAMES) {
    const p = await newPlayer(browser); ps.push(p);
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", name); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", DECK); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  for (const p of ps) await expect(p.locator(".opp")).toHaveCount(2, { timeout:20000 });
  await ps[0].click("#startBtn"); await ps[0].locator(".modal").getByRole("button", { name:"Start the game" }).click();
  for (const p of ps) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  // Whoever's turn it is attacks the other two, one creature each
  const turn = await ps[0].evaluate(() => ktPlay.table.turnSeat), a = ps[turn - 1];
  const [d1, d2] = ps.filter(p => p !== a), [n1, n2] = [NAMES[ps.indexOf(d1)], NAMES[ps.indexOf(d2)]];
  const x = await fetchTo(a, "Gamma Card", "bf"), y = await fetchTo(a, "Gamma Card", "bf");
  await a.click("#attackBtn");
  await dragTo(a, a.locator(`#bf .card[data-iid="${x}"]`), a.locator("#atkBar .atkdrop", { hasText:`Attack ${n1}` }));
  await dragTo(a, a.locator(`#bf .card[data-iid="${y}"]`), a.locator("#atkBar .atkdrop", { hasText:`Attack ${n2}` }));
  await a.locator("#atkBar").getByRole("button", { name:"Attack (2)", exact:true }).click();
  // The first takes the damage: nothing happens yet, his box waits for the other
  const box1 = d1.locator("#defendBox"), box2 = d2.locator("#defendBox");
  await box1.getByRole("button", { name:"Take the damage", exact:true }).click();
  await expect(box1).toContainText(`Waiting for ${n2}`);
  await expect(d1.locator("#lifeOut")).toHaveText("20");
  // The second interrupts: the whole attack is called off on every screen, with no damage, to be sorted out by hand
  await box2.getByRole("button", { name:"Interrupt", exact:true }).click();
  await expect(box1).toBeHidden(); await expect(box2).toBeHidden();
  await expect(a.locator("#bf .card.attacking")).toHaveCount(0);
  for (const p of ps) await expect(p.locator("#arrows > path")).toHaveCount(0);
  await expect(a.locator("#log")).toContainText(`${n2} interrupted the attack`);
  await a.waitForTimeout(1500);
  await expect(d1.locator("#lifeOut")).toHaveText("20");
  await expect(d2.locator("#lifeOut")).toHaveText("20");
  // A new attack after that works as usual (the attackers stayed tapped: untap them first): both answer and the
  // damage lands at once
  await tool(a, "#untapAllBtn");
  await a.click("#attackBtn");
  await dragTo(a, a.locator(`#bf .card[data-iid="${x}"]`), a.locator("#atkBar .atkdrop", { hasText:`Attack ${n1}` }));
  await dragTo(a, a.locator(`#bf .card[data-iid="${y}"]`), a.locator("#atkBar .atkdrop", { hasText:`Attack ${n2}` }));
  await a.locator("#atkBar").getByRole("button", { name:"Attack (2)", exact:true }).click();
  await box1.getByRole("button", { name:"Take the damage", exact:true }).click();
  await expect(box1).toContainText(`Waiting for ${n2}`);
  await box2.getByRole("button", { name:"Take the damage", exact:true }).click();
  await expect(d1.locator("#lifeOut")).toHaveText("17");
  await expect(d2.locator("#lifeOut")).toHaveText("17");
  await expect(a.locator("#bf .card.attacking")).toHaveCount(0);
  for (const p of ps) expect(p.errors).toEqual([]);
  await browser.close();
});
