import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, dragTo } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

const DECK = "12 Gamma Card\n18 Forest";
async function table(n = 2){
  const browser = await launchBrowser(), ps = []; let room = "";
  for (const name of ["Luke", "Rick", "Sam"].slice(0, n)) {
    const p = await newPlayer(browser); ps.push(p);
    await p.goto(`${BASE}/play.html?kt-test${room ? "&room=" + room : ""}`);
    await p.fill("#nameIn", name); await p.selectOption("#fmtSel", "sixty"); await p.fill("#deckIn", DECK); await p.click("#joinBtn");
    await expect(p.locator("#table")).toBeVisible({ timeout:15000 });
    if (!room) { room = new URL(p.url()).searchParams.get("room"); await settle(p); }
  }
  for (const p of ps) await expect(p.locator(".opp")).toHaveCount(n - 1, { timeout:20000 });
  await ps[0].click("#startBtn"); await ps[0].locator(".modal").getByRole("button", { name:"Start the game" }).click();
  for (const p of ps) await p.locator(".modal").getByRole("button", { name:"Keep", exact:true }).click();
  const turn = await ps[0].evaluate(() => ktPlay.table.turnSeat);
  return { browser, ps, a:ps[turn - 1], d:ps.find((p, i) => i !== turn - 1) };
}
// A test creature on your battlefield: { name, pt:"3/3", kw:["Trample"], colors:["R"], text, etb (came in this turn) }
let n = 0;
const put = (page, o) => page.evaluate(([o, n]) => {
  const [p, t] = o.pt.split("/"), id = `kw-${n}`;
  ktPlay.cards.set(id, { id, name:o.name, type_line:"Creature — Test", power:p, toughness:t, keywords:o.kw || [], colors:o.colors || [], oracle_text:o.text || "",
    image_uris:{ small:"https://cards.scryfall.io/small/0.png", normal:"https://cards.scryfall.io/normal/0.png" } });
  const iid = `kwc${n}`;
  ktPlay.me.zones.bf.push({ iid, id, x:0.05 + (n % 8) * 0.1, y:0.05, tapped:false, fd:false, face:0, ctr:{}, ...(o.etb ? { etb:ktPlay.table.turnNum } : {}) });
  ktPlay.changed(); return iid;
}, [o, ++n]);

test("combat rules: every key term on the list, worked out the way Magic does", async () => {
  const { browser, ps } = await table(1 + 1), p = ps[0];
  const r = await p.evaluate(() => {
    const { fight, cantBlock } = ktPlay;
    let k = 0;
    const C = (pt, ck = [], col = "", extra = {}) => ({ iid:`u${++k}`, name:`C${k}`, pt, ck, col, ...extra });
    const one = (A, B = [], d = 2) => fight([{ a:{ c:A, s:1, d }, blockers:B.map(c => ({ c, s:d })) }]);
    const out = {};
    let A, B, B2, x;
    // plain: unblocked hits the player; blocked deals nothing to the player
    A = C("3/3"); out.plain = one(A).player[2].life;
    A = C("3/3"); B = C("2/2"); x = one(A, [B]); out.blockedNoTrample = [x.player[2]?.life || 0, x.dies.includes(B.iid), x.dies.includes(A.iid)];
    // trample: lethal to the blocker, the rest to the player
    A = C("5/5", ["trample"]); B = C("2/2"); x = one(A, [B]); out.trample = [x.player[2].life, x.dies.includes(B.iid), x.dies.includes(A.iid)];
    A = C("6/6", ["trample"]); B = C("2/2"); B2 = C("1/3"); x = one(A, [B, B2]); out.trampleTwo = [x.player[2].life, x.dies.length];
    A = C("3/3", ["trample", "deathtouch"]); B = C("5/5"); x = one(A, [B]); out.trampleDeathtouch = [x.player[2].life, x.dies.includes(B.iid)];
    A = C("5/5", ["trample"]); B = C("1/1", ["indestructible"]); x = one(A, [B]); out.trampleIndestructible = [x.player[2].life, x.dies.includes(B.iid)];
    // menace: two blockers share the damage
    A = C("3/3", ["menace"]); B = C("2/2"); B2 = C("2/2"); x = one(A, [B, B2]); out.menace = [x.dies.includes(B.iid), x.dies.includes(B2.iid), x.dies.includes(A.iid)];
    // flying / reach
    out.flyGround = cantBlock(C("2/2"), C("2/2", ["flying"]));
    out.flyReach = cantBlock(C("2/2", ["reach"]), C("2/2", ["flying"]));
    out.flyFly = cantBlock(C("2/2", ["flying"]), C("2/2", ["flying"]));
    out.reachAttacker = cantBlock(C("2/2"), C("2/2", ["reach"]));
    // lifelink: what it deals, to a player or a blocker; a blocker's lifelink too
    A = C("3/3", ["lifelink"]); out.lifelink = one(A).gain[1];
    A = C("3/3", ["lifelink"]); B = C("1/1"); out.lifelinkBlocked = one(A, [B]).gain[1];
    A = C("2/2"); B = C("4/4", ["lifelink"]); out.lifelinkBlocker = one(A, [B]).gain[2];
    // deathtouch
    A = C("1/1", ["deathtouch"]); B = C("6/6"); x = one(A, [B]); out.deathtouch = [x.dies.includes(B.iid), x.dies.includes(A.iid)];
    A = C("6/6"); B = C("1/1", ["deathtouch"]); x = one(A, [B]); out.deathtouchBlocker = [x.dies.includes(A.iid), x.dies.includes(B.iid)];
    // first strike: kills first, takes nothing back
    A = C("2/2", ["first strike"]); B = C("2/2"); x = one(A, [B]); out.firstStrike = [x.dies.includes(B.iid), x.dies.includes(A.iid)];
    A = C("2/2", ["first strike"]); B = C("2/3"); x = one(A, [B]); out.firstStrikeSurvived = [x.dies.includes(B.iid), x.dies.includes(A.iid)];
    A = C("3/3"); B = C("2/2", ["first strike"]); x = one(A, [B]); out.firstStrikeBlocker = [x.dies.includes(A.iid), x.dies.includes(B.iid)];
    // double strike: twice, unblocked and blocked
    A = C("2/2", ["double strike"]); out.doubleStrike = one(A).player[2].life;
    A = C("2/2", ["double strike"]); B = C("3/3"); x = one(A, [B]); out.doubleStrikeBlocked = [x.dies.includes(B.iid), x.dies.includes(A.iid)];
    A = C("3/3", ["double strike", "trample"]); B = C("2/2"); x = one(A, [B]); out.doubleStrikeTrample = x.player[2].life;
    // indestructible
    A = C("5/5"); B = C("2/2", ["indestructible"]); x = one(A, [B]); out.indestructible = x.dies.includes(B.iid);
    // infect: poison to players, -1/-1 counters to creatures
    A = C("2/2", ["infect"]); x = one(A); out.infect = [x.player[2].life, x.player[2].poison];
    A = C("2/2", ["infect"]); B = C("3/3"); x = one(A, [B]); out.infectBlocked = [x.minus[B.iid], x.dies.includes(B.iid), x.dies.includes(A.iid)];
    A = C("3/3", ["infect"]); B = C("2/2", ["indestructible"]); x = one(A, [B]); out.infectIndestructible = x.dies.includes(B.iid);  // (0 toughness)
    // wither: -1/-1 counters to creatures, damage to players as usual
    A = C("2/2", ["wither"]); B = C("3/3"); x = one(A, [B]); out.wither = [x.minus[B.iid], x.dies.includes(B.iid)];
    A = C("2/2", ["wither"]); out.witherPlayer = one(A).player[2].life;
    // can't be blocked / can't block / defender has no effect on blocking
    out.unblockable = cantBlock(C("2/2"), C("2/2", ["can't be blocked"]));
    out.cantBlock = cantBlock(C("2/2", ["can't block"]), C("2/2"));
    out.defenderBlocks = cantBlock(C("0/4", ["defender"]), C("2/2"));
    // hexproof, shroud, ward: nothing to do with combat
    out.targeting = ["hexproof", "shroud", "ward"].map(k => [cantBlock(C("2/2", [k]), C("2/2")), cantBlock(C("2/2"), C("2/2", [k])), one(C("3/3", [k])).player[2].life]);
    // protection from each color: can't be blocked by that color, no damage from it
    out.pro = { W:"white", U:"blue", B:"black", R:"red", G:"green" };
    out.pro = Object.entries(out.pro).map(([c, w]) => {
      const blockedBy = cantBlock(C("2/2", [], c), C("2/2", [`protection from ${w}`]));
      const other = cantBlock(C("2/2", [], c === "W" ? "U" : "W"), C("2/2", [`protection from ${w}`]));
      const Bk = C("2/2", [`protection from ${w}`]), Ak = C("5/5", [], c), y = one(Ak, [Bk]);
      return [blockedBy, other, y.dies.includes(Bk.iid), y.dies.includes(Ak.iid) ];
    });
    // dividing damage among several blockers, as the attacker's player chose
    A = C("4/4"); B = C("2/2"); B2 = C("2/2"); x = fight([{ a:{ c:A, s:1, d:2 }, blockers:[{ c:B, s:2 }, { c:B2, s:2 }] }], { [A.iid]:{ [B.iid]:4, [B2.iid]:0 } });
    out.divided = [x.dies.includes(B.iid), x.dies.includes(B2.iid)];
    A = C("5/5", ["trample"]); B = C("2/2"); B2 = C("2/2"); x = fight([{ a:{ c:A, s:1, d:2 }, blockers:[{ c:B, s:2 }, { c:B2, s:2 }] }], { [A.iid]:{ [B.iid]:2, [B2.iid]:2 } });
    out.dividedTrample = [x.player[2].life, x.dies.length];
    out.lethal = [ktPlay.lethalTo(C("3/3"), C("2/5")), ktPlay.lethalTo(C("3/3", ["deathtouch"]), C("2/5"))];
    // commander damage
    A = C("4/4", [], "", { cmdr:true }); out.cmdr = one(A).player[2].cmd;
    return out;
  });
  expect(r.plain).toBe(3);
  expect(r.blockedNoTrample).toEqual([0, true, false]);
  expect(r.trample).toEqual([3, true, false]);                        // 5/5 trample blocked by a 2/2: 3 tramples over
  expect(r.trampleTwo).toEqual([1, 2]);                               // 6 power: 2 + 3 lethal, 1 through
  expect(r.trampleDeathtouch).toEqual([2, true]);                     // deathtouch: 1 is lethal
  expect(r.trampleIndestructible).toEqual([4, false]);
  expect(r.menace).toEqual([true, false, true]);
  expect(r.flyGround).toMatch(/flying/); expect(r.flyReach).toBe(""); expect(r.flyFly).toBe(""); expect(r.reachAttacker).toBe("");
  expect(r.lifelink).toBe(3); expect(r.lifelinkBlocked).toBe(3); expect(r.lifelinkBlocker).toBe(4);
  expect(r.deathtouch).toEqual([true, true]); expect(r.deathtouchBlocker).toEqual([true, true]);
  expect(r.firstStrike).toEqual([true, false]); expect(r.firstStrikeSurvived).toEqual([false, true]); expect(r.firstStrikeBlocker).toEqual([false, true]);  // (3/3 survives 2 first-strike damage, then kills the 2/2)
  expect(r.doubleStrike).toBe(4); expect(r.doubleStrikeBlocked).toEqual([true, true]); expect(r.doubleStrikeTrample).toBe(4);
  expect(r.indestructible).toBe(false);
  expect(r.infect).toEqual([0, 2]); expect(r.infectBlocked).toEqual([2, false, true]); expect(r.infectIndestructible).toBe(true);
  expect(r.wither).toEqual([2, false]); expect(r.witherPlayer).toBe(2);
  expect(r.unblockable).toMatch(/can't be blocked/); expect(r.cantBlock).toMatch(/can't block/); expect(r.defenderBlocks).toBe("");
  expect(r.targeting).toEqual([["", "", 3], ["", "", 3], ["", "", 3]]);
  for (const [blockedBy, other, dies, atkDies] of r.pro) { expect(blockedBy).toMatch(/protection/); expect(other).toBe(""); expect(dies).toBe(false); expect(atkDies).toBe(false); }
  expect(Object.values(r.cmdr)).toEqual([4]);
  expect(r.divided).toEqual([true, false]); expect(r.dividedTrample).toEqual([1, 2]); expect(r.lethal).toEqual([5, 1]);
  await browser.close();
});

test("combat in a game: trample, menace, flying and reach, haste, defender, vigilance, lifelink, infect and deathtouch", async () => {
  test.setTimeout(240000);
  const { browser, a, d } = await table(2);
  const box = d.locator("#defendBox");
  const attack = async (iids) => {
    await a.click("#attackBtn");
    for (const iid of iids) await dragTo(a, a.locator(`#bf .card[data-iid="${iid}"]`), a.locator("#atkBar .atkdrop").first());
    await a.locator("#atkBar").getByRole("button", { name:`Attack (${iids.length})`, exact:true }).click();
    await expect(box).toBeVisible();
  };
  const block = async (...names) => {
    await box.getByRole("button", { name:"Respond", exact:true }).click();
    for (const nm of names) await box.getByRole("button", { name:new RegExp(`^Block with ${nm} `) }).first().click();
  };
  const done = () => box.getByRole("button", { name:"Done: take the damage", exact:true }).click();
  const life = p => p.locator("#lifeOut");
  const settleCombat = async () => { await expect(box).toBeHidden(); await a.waitForTimeout(1600); };

  // Trample: a 5/5 trampler blocked by a 2/2 deals 3 to the player, and the 2/2 dies
  const tr = await put(a, { name:"Trampler", pt:"5/5", kw:["Trample"] }), wall = await put(d, { name:"Small Wall", pt:"2/2" });
  await attack([tr]); await expect(box).toContainText("trample");
  await block("Small Wall"); await expect(box).toContainText("3 damage to you with these blocks");
  await done(); await settleCombat();
  await expect(life(d)).toHaveText("17");
  await expect(d.locator(`#bf .card[data-iid="${wall}"]`)).toHaveCount(0);
  await expect(d.locator("#log")).toContainText("Small Wall died in combat.");
  await expect(a.locator(`#bf .card[data-iid="${tr}"]`)).toHaveCount(1);
  await expect(a.locator("#bf .card.attacking")).toHaveCount(0);

  // Menace: one blocker isn't allowed; two are
  await a.evaluate(() => { for (const c of ktPlay.me.zones.bf) c.tapped = false; ktPlay.changed(); });
  const men = await put(a, { name:"Menacer", pt:"3/3", kw:["Menace"] });
  const g1 = await put(d, { name:"Guard One", pt:"2/2" }), g2 = await put(d, { name:"Guard Two", pt:"2/2" });
  await a.evaluate(t => { ktPlay.me.zones.bf.find(c => c.iid === t).tapped = true; ktPlay.changed(); }, tr);
  await attack([men]);
  await block("Guard One"); await done();
  await expect(d.locator(".toast, #toast").last()).toContainText("menace");
  await box.getByRole("button", { name:/^Block with Guard Two / }).click();
  await expect(box).toContainText("0 damage to you");
  await done();
  // (two blockers: Luke divides the 3 damage; the starting split is lethal to the first, the rest to the second)
  await a.locator("#assignBox").getByRole("button", { name:"Done: deal the damage" }).click(); await settleCombat();
  await expect(life(d)).toHaveText("17");
  await expect(a.locator(`#bf .card[data-iid="${men}"]`)).toHaveCount(0);   // (4 damage back: it died)
  await expect(d.locator(`#bf .card[data-iid="${g1}"]`)).toHaveCount(0);     // (lethal to the first)
  await expect(d.locator(`#bf .card[data-iid="${g2}"]`)).toHaveCount(1);

  // Flying: a ground creature can't block it, one with reach can
  const fl = await put(a, { name:"Flyer", pt:"2/2", kw:["Flying"] }), sp = await put(d, { name:"Spider", pt:"1/4", kw:["Reach"] });
  await attack([fl]);
  await box.getByRole("button", { name:"Respond", exact:true }).click();
  await expect(box.getByRole("button", { name:/^Block with Guard Two / })).toBeDisabled();
  await expect(box.getByRole("button", { name:/^Block with Spider / })).toBeEnabled();
  await box.getByRole("button", { name:/^Block with Spider / }).click();
  await done(); await settleCombat();
  await expect(life(d)).toHaveText("17");

  // Haste and defender: a creature that just came in can't attack without haste; defender never can; vigilance doesn't tap
  const fresh = await put(a, { name:"Fresh", pt:"2/2", etb:true }), quick = await put(a, { name:"Quick", pt:"2/2", kw:["Haste", "Vigilance"], etb:true }), def = await put(a, { name:"Post", pt:"0/5", kw:["Defender"] });
  await a.click("#attackBtn");
  await dragTo(a, a.locator(`#bf .card[data-iid="${fresh}"]`), a.locator("#atkBar .atkdrop").first());
  await expect(a.locator("#toast, .toast").last()).toContainText("doesn't have haste");
  await dragTo(a, a.locator(`#bf .card[data-iid="${def}"]`), a.locator("#atkBar .atkdrop").first());
  await expect(a.locator("#toast, .toast").last()).toContainText("defender");
  await dragTo(a, a.locator(`#bf .card[data-iid="${quick}"]`), a.locator("#atkBar .atkdrop").first());
  await a.locator("#atkBar").getByRole("button", { name:"Attack (1)", exact:true }).click();
  await expect(a.locator(`#bf .card[data-iid="${quick}"].tapped`)).toHaveCount(0);   // (vigilance)
  await box.getByRole("button", { name:"Take the damage", exact:true }).click(); await settleCombat();
  await expect(life(d)).toHaveText("15");

  // Lifelink and infect: the attacker's player gains what it dealt; infect gives poison counters, not damage
  const ll = await put(a, { name:"Leech", pt:"3/3", kw:["Lifelink"] }), inf = await put(a, { name:"Plague", pt:"2/2", kw:["Infect"] });
  await attack([ll, inf]);
  await expect(box).toContainText("3 damage and 2 poison counters to you if you take it.");
  await box.getByRole("button", { name:"Take the damage", exact:true }).click(); await settleCombat();
  await expect(life(d)).toHaveText("12");
  await expect(d.locator("#side")).toContainText("2");
  expect(await d.evaluate(() => ktPlay.me.poison)).toBe(2);
  await expect(life(a)).toHaveText("23");

  // Deathtouch: a 1/1 deathtouch blocker kills a big attacker
  await a.evaluate(() => { for (const c of ktPlay.me.zones.bf) c.tapped = false; ktPlay.changed(); });
  const big = await put(a, { name:"Big One", pt:"7/7" }), dt = await put(d, { name:"Viper", pt:"1/1", kw:["Deathtouch"] });
  await attack([big]); await block("Viper"); await done(); await settleCombat();
  await expect(a.locator(`#bf .card[data-iid="${big}"]`)).toHaveCount(0);
  await expect(d.locator(`#bf .card[data-iid="${dt}"]`)).toHaveCount(0);

  // Two blockers on one attacker: its player divides the damage (here all 4 to one), and the other blocker lives
  await a.evaluate(() => { for (const c of ktPlay.me.zones.bf) c.tapped = false; ktPlay.changed(); });
  const sp4 = await put(a, { name:"Splitter", pt:"4/4" }), lg = await put(d, { name:"Left Guard", pt:"2/2" }), rg = await put(d, { name:"Right Guard", pt:"2/2" });
  await attack([sp4]); await block("Left Guard", "Right Guard"); await done();
  const asg = a.locator("#assignBox");
  await expect(asg).toBeVisible(); await expect(asg).toContainText("Divide your damage");
  await expect(box).toContainText("to divide damage");
  await expect(asg.getByLabel("Damage to Left Guard", { exact:true })).toHaveText("2"); await expect(asg.getByLabel("Damage to Right Guard", { exact:true })).toHaveText("2");
  for (let i = 0; i < 2; i++) await asg.getByRole("button", { name:"Less damage to Right Guard" }).click();
  await expect(asg.getByRole("button", { name:"Done: deal the damage" })).toBeDisabled();
  for (let i = 0; i < 2; i++) await asg.getByRole("button", { name:"More damage to Left Guard" }).click();
  await asg.getByRole("button", { name:"Done: deal the damage" }).click(); await settleCombat();
  await expect(d.locator(`#bf .card[data-iid="${lg}"]`)).toHaveCount(0);
  await expect(d.locator(`#bf .card[data-iid="${rg}"]`)).toHaveCount(1);
  await expect(a.locator(`#bf .card[data-iid="${sp4}"]`)).toHaveCount(0);   // (both blockers hit back: 2 + 2 on a 4/4)
  for (const p of [a, d]) expect(p.errors).toEqual([]);
  await browser.close();
});
