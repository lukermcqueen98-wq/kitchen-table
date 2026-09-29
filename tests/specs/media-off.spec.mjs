import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown } from "../support/players.mjs";
import { BASE } from "../support/global-setup.mjs";

test("mics and cameras start off when you sit down (webcam and digital tables), and the buttons turn them on", async () => {
  const browser = await launchBrowser();
  const a = await newPlayer(browser, { mediaOff:true }), b = await newPlayer(browser, { mediaOff:true });
  // Webcam table: mic muted, camera hidden (the lobby preview still shows it)
  await sitDown(a, "Luke");
  await expect(a.locator("#micBtn")).toHaveText("Mic muted");
  await expect(a.locator("#camBtn")).toHaveText("Camera hidden");
  const tracks = () => a.evaluate(() => { const v = [...document.querySelectorAll("video")].find(v => v.srcObject?.getAudioTracks?.().length)?.srcObject; return v ? [v.getAudioTracks()[0].enabled, v.getVideoTracks()[0]?.enabled] : null; });
  expect(await tracks()).toEqual([false, false]);
  await a.click("#micBtn"); await a.click("#camBtn");
  await expect(a.locator("#micBtn")).toHaveText("Mic on");
  await expect(a.locator("#camBtn")).toHaveText("Camera on");
  expect(await tracks()).toEqual([true, true]);
  // Digital table: mic muted
  await b.goto(`${BASE}/play.html?kt-test`);
  await b.fill("#nameIn", "Rick"); await b.selectOption("#fmtSel", "sixty"); await b.fill("#deckIn", "60 Forest"); await b.click("#joinBtn");
  await expect(b.locator("#table")).toBeVisible({ timeout:15000 });
  await expect(b.locator("#micBtn")).toHaveText("Mic muted");
  await b.click("#micBtn");
  await expect(b.locator("#micBtn")).toHaveText("Mic on");
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
