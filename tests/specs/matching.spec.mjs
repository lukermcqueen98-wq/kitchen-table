import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, clickCamera } from "../support/players.mjs";

test("picture matching finds a card on another player's camera from the all-cards index, and learns from corrections", async () => {
  const b1 = await launchBrowser(), b2 = await launchBrowser({ camera:"card" });
  const a = await newPlayer(b1), b = await newPlayer(b2);
  a.on("download", d => (a.downloads ||= []).push(d.suggestedFilename()));
  await a.addInitScript(() => { const f = window.createImageBitmap; window.__stills = 0; window.createImageBitmap = (...x) => { window.__stills++; return f(...x); }; });
  const room = await sitDown(a, "Luke", { deck:"" }); await settle(a);
  await sitDown(b, "Rick", { room, deck:"" });
  await expect(a.locator("#artStat")).toHaveText(/ready for all 5/, { timeout:30000 });

  // No decklists anywhere: the index finds it, using a full-quality still from Rick's browser
  let r = await clickCamera(a, 2, 640, 290);
  expect(r.shown).toBe("Gamma Card");
  expect(r.status).toMatch(/AI picture match/);
  expect(await a.evaluate(() => window.__stills)).toBeGreaterThan(0);
  // A box around the whole card works too
  r = await clickCamera(a, 2, 488, 148, [792, 571]);
  expect(r.shown).toBe("Gamma Card");

  // Correcting to a runner-up is recorded in the matching log, and teaching sticks
  await a.locator("#alts button").first().click();
  await expect(a.locator("#status")).toHaveText(/Got it/);
  await a.click("#matchStats summary");
  await expect(a.locator("#msText")).toHaveText(/You corrected 1/);
  await a.click("#msExport");
  await expect.poll(() => a.downloads?.[0]).toMatch(/matching-log/);

  // Recent cards lists what was looked at
  await expect(a.locator("#histList button").first()).toBeVisible();
  expect(a.errors).toEqual([]);
  await b1.close(); await b2.close();
});
