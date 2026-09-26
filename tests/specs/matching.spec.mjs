import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, clickCamera } from "../support/players.mjs";

test("picture matching finds a card on another player's camera from the all-cards index, and learns from corrections", async () => {
  const b1 = await launchBrowser(), b2 = await launchBrowser({ camera:"card" });
  const a = await newPlayer(b1), b = await newPlayer(b2);
  a.on("download", d => (a.downloads ||= []).push(d.suggestedFilename()));
  await a.addInitScript(() => { const f = window.createImageBitmap; window.__stills = 0; window.createImageBitmap = (...x) => { window.__stills++; return f(...x); }; });
  let binDownloads = 0; a.on("request", r => { if (r.url().includes("cards.bin")) binDownloads++; });
  const room = await sitDown(a, "Luke", { deck:"" }); await settle(a);
  await sitDown(b, "Rick", { room, deck:"" });
  await expect(a.locator("#artStat")).toHaveText(/ready for all 5/, { timeout:30000 });
  // The matcher downloads right after sitting down, before any click
  expect(await a.evaluate(() => window.__tjs?.task)).toBe("image-feature-extraction");

  // No decklists anywhere: the index finds it, using a full-quality still from Rick's browser
  let r = await clickCamera(a, 2, 640, 290);
  expect(r.shown).toBe("Gamma Card");
  expect(r.status).toMatch(/AI picture match/);
  expect(await a.evaluate(() => window.__stills)).toBeGreaterThan(0);
  // The click's ring became an outline around the card (drawn at 490,150, 300x419 on Rick's 1280x720 camera; the card finder may
  // take its inner frame line, a few pixels in), then goes away
  const outline = await a.evaluate(() => {
    const t = [...document.querySelectorAll(".tile")].find(t => t.querySelector(".sel.card"));
    const s = t.querySelector(".sel.card").getBoundingClientRect(), v = t.querySelector("video"), r = v.getBoundingClientRect();
    const k = Math.min(r.width / v.videoWidth, r.height / v.videoHeight) * v.videoWidth / 1280;
    const ox = r.x + (r.width - v.videoWidth * k * 1280 / v.videoWidth) / 2, oy = r.y + (r.height - v.videoHeight * k * 1280 / v.videoWidth) / 2;
    return { x:(s.x - ox) / k, y:(s.y - oy) / k, w:s.width / k, h:s.height / k, unsure:t.querySelector(".sel").classList.contains("unsure") };
  });
  for (const [got, want] of [[outline.x, 490], [outline.y, 150], [outline.w, 300], [outline.h, 419]]) expect(Math.abs(got - want)).toBeLessThan(16);
  expect(outline.unsure).toBe(false);
  await expect(a.locator(".tile .sel")).toHaveCount(0, { timeout:4000 });
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

  // After a reload the index comes from the browser's storage, not another download
  const before = binDownloads;
  expect(before).toBe(1);
  await a.reload(); await a.click("#joinBtn");
  await expect(a.locator("#artStat")).toHaveText(/ready for all 5/, { timeout:30000 });
  expect(binDownloads).toBe(before);
  expect(a.errors).toEqual([]);
  await b1.close(); await b2.close();
});
