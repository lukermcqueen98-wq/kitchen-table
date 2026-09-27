import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, settle, tile } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

// How bright a player's camera looks on a screen: the phone's picture is bright (the fake camera's pattern); a webcam
// paused while the phone is the camera sends black
const brightness = (page, seat) => tile(page, seat).locator("video").evaluate(v => {
  if (!v.videoWidth) return 0;
  const c = document.createElement("canvas"); c.width = 64; c.height = 36; const x = c.getContext("2d"); x.drawImage(v, 0, 0, 64, 36);
  const d = x.getImageData(0, 0, 64, 36).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += d[i] + d[i + 1] + d[i + 2]; return t / (d.length / 4) / 3;
});

test("phone camera: a start-up option, and a viewer who loses its video gets it back", async () => {
  test.setTimeout(180000);
  const b1 = await launchBrowser(), b2 = await launchBrowser(), b3 = await launchBrowser();
  const a = await newPlayer(b1), b = await newPlayer(b2), phone = await newPlayer(b3);
  // Luke picks "My phone" in the lobby's Camera list: after sitting down, the phone's code comes up
  await a.goto(`${BASE}/index.html`); await a.fill("#nameIn", "Luke");
  await expect(a.locator("#camSel option[value=phone]")).toHaveCount(1);
  await a.selectOption("#camSel", "phone"); await expect(a.locator("#phoneNote")).toBeVisible();
  await a.click("#joinBtn");
  await expect(a.locator(".modal-card h2")).toHaveText("Use your phone as your camera", { timeout:15000 });
  const url = await a.textContent(".camurl"), room = new URL(a.url()).searchParams.get("room");
  await settle(a);
  // Rick joins; the phone starts: Rick sees the phone's picture on Luke's seat, and Luke's dialog closes by itself
  await b.goto(`${BASE}/index.html?room=${room}`); await b.fill("#nameIn", "Rick"); await b.click("#joinBtn");
  await expect(b.locator("#table")).toBeVisible({ timeout:15000 }); await b.waitForTimeout(700); await b.keyboard.press("Escape");
  await phone.goto(url); await phone.click("#phStart");
  await expect(phone.locator("#phStatus")).toContainText("Live", { timeout:20000 });
  await expect.poll(() => brightness(b, 1), { timeout:20000 }).toBeGreaterThan(40);
  await expect(a.locator(".modal-card h2")).not.toHaveText("Use your phone as your camera", { timeout:10000 });
  // Rick's page reloads (his link to Luke drops and comes back): the phone's picture comes back without anyone doing anything
  await b.reload(); await b.click("#joinBtn");
  await expect(b.locator("#table")).toBeVisible({ timeout:15000 }); await b.waitForTimeout(700); await b.keyboard.press("Escape");
  await expect.poll(() => brightness(b, 1), { timeout:40000 }).toBeGreaterThan(40);
  for (const br of [b1, b2, b3]) await br.close();
});
