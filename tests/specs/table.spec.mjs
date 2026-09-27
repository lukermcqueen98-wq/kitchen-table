import { test, expect } from "@playwright/test";
import { launchBrowser, newPlayer, sitDown, settle, tile, logLines } from "../support/players.mjs";

test("life log, counters, dragging cameras, turn numbers, and game records", async () => {
  const browser = await launchBrowser();
  const [a, b] = [await newPlayer(browser), await newPlayer(browser)];
  const room = await sitDown(a, "Luke"); await settle(a);
  await sitDown(b, "Rick", { room });
  await expect.poll(() => logLines(a)).toContainEqual(expect.stringContaining("Rick sat down"));

  // Life clicks are grouped into one log line, on both screens
  const minus = tile(a, 1).locator('.life button[data-d="-1"]');
  for (let i = 0; i < 3; i++) await minus.click();
  await a.locator(".dmgask .skip").click();
  await tile(a, 1).locator('.life button[data-d="1"]').click();
  await expect.poll(() => logLines(b), { timeout:8000 }).toContainEqual(expect.stringContaining("Luke lost 2 life (40 → 38)"));
  await expect.poll(() => logLines(a)).toContainEqual(expect.stringContaining("You lost 2 life (40 → 38)"));
  // The Log tab counts what arrived while you were on another tab; opening it clears the count
  await expect(b.locator("#tab-log .badge")).toHaveText(/^[1-9]/);
  await b.click("#tab-log");
  await expect(b.locator("#tab-log .badge")).toBeHidden();
  await expect(b.locator("#log")).toBeVisible();
  // Hiding the side panel gives the cameras the whole width
  const w0 = (await tile(b, 1).boundingBox()).width;
  await b.click("#panelBtn");
  await expect(b.locator("aside")).toBeHidden();
  expect((await tile(b, 1).boundingBox()).width).toBeGreaterThan(w0 + 100);
  await b.click("#panelBtn");
  await expect(b.locator("aside")).toBeVisible();

  // Other counters sync
  await tile(a, 1).locator(".ctr.add").click();
  await a.getByText("Other counters").click();
  await a.locator(".modal-card button", { hasText:"Charge" }).first().click();
  await a.locator('.modal-card input[placeholder="Start typing a card name"]').fill("Sol Ring");
  await a.locator(".modal-card button", { hasText:"Add counter" }).click();
  await expect(tile(b, 1).locator(".ctrs")).toContainText("Charge on Sol Ring");

  // A commander shows its color identity and base power/toughness under its name, on everyone's screen
  await tile(a, 1).locator(".cmdr.ask").click();
  await a.locator('.modal-card input[placeholder="Start typing a card name"]').first().fill("Gamma Card");
  await a.locator(".modal-card button.primary").click();
  await expect(tile(b, 1).locator(".cmdr").first()).toHaveText("Gamma Card");
  await expect(tile(b, 1).locator(".cmdrinfo img")).toHaveCount(2);
  await expect(tile(b, 1).locator(".cmdrinfo img").first()).toHaveAttribute("alt", "Green");
  await expect(tile(b, 1).locator(".cmdrinfo .pt")).toHaveText("3/4");

  // Drag Rick's camera onto Luke's: they swap places (CSS order), and the videos keep playing
  const grip = await tile(b, 2).locator(".grip").boundingBox(), target = await tile(b, 1).boundingBox();
  await b.mouse.move(grip.x + 5, grip.y + 5); await b.mouse.down();
  await b.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps:8 }); await b.mouse.up();
  await expect.poll(() => tile(b, 2).evaluate(e => e.style.order)).toBe("0");
  expect(await b.$$eval("#grid video", v => v.every(x => !x.paused))).toBe(true);

  // Turn numbers
  await a.click("#passBtn"); await a.waitForTimeout(600);
  await b.click("#passBtn"); await a.waitForTimeout(600);
  await a.click("#passBtn");
  await expect.poll(() => logLines(b)).toContainEqual(expect.stringMatching(/turn 2 \(game turn 3\)/));

  // New game asks who won; the result is saved on both screens
  await a.click("#moreDd summary");
  await a.click("#newBtn");
  await a.locator(".modal-card button", { hasText:"Rick" }).click();
  for (const p of [a, b]) await p.keyboard.press("Escape");
  await expect(b.locator("#recTotals")).toHaveText(/Rick 1/);
  await expect(a.locator("#recList li")).toHaveCount(1);
  expect([...a.errors, ...b.errors]).toEqual([]);
  await browser.close();
});
