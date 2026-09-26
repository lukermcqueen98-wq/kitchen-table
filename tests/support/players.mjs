/* Test players: each one is a Chromium browser with a fake camera and microphone, pointed at the local signaling
   server, with stand-ins for the CDN libraries, Scryfall, deck sites, the AI models, and speech recognition. */
import { chromium, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { OUT, NAMES, cardId } from "./fixtures.mjs";
import { BASE, PEER_PORT } from "./global-setup.mjs";

const MODULES = path.resolve(import.meta.dirname, "..", "node_modules");
const LIBS = { "peerjs.min.js":"peerjs/dist/peerjs.min.js", "qrcode.min.js":"qrcodejs/qrcode.min.js", "opencv.js":"@techstark/opencv-js/dist/opencv.js" };
const card = k => ({ object:"card", id:cardId(k), name:NAMES[k], type_line:"Artifact", oracle_text:"Test card.", scryfall_uri:"https://scryfall.com",
  image_uris:{ small:`https://cards.scryfall.io/small/${k % 3}.png`, normal:`https://cards.scryfall.io/normal/${k % 3}.png`, art_crop:`https://cards.scryfall.io/art_crop/${k % 3}.png` } });
const json = (route, body, status = 200) => route.fulfill({ status, contentType:"application/json", headers:{ "access-control-allow-origin":"*" }, body:JSON.stringify(body) });

// camera: "card" shows the Gamma Card on a playmat; otherwise Chromium's default test pattern. mic: "phrases" plays speech-length sounds.
export async function launchBrowser({ camera, mic } = {}){
  const args = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];
  if (camera === "card") args.push(`--use-file-for-fake-video-capture=${path.join(OUT, "camera.y4m")}`);
  if (mic === "phrases") args.push(`--use-file-for-fake-audio-capture=${path.join(OUT, "phrases.wav")}`);
  return chromium.launch({ args });
}

export async function newPlayer(browser, { lisp = false } = {}){
  const ctx = await browser.newContext({ permissions:["camera", "microphone", "clipboard-read", "clipboard-write"], viewport:{ width:1400, height:900 } });
  await ctx.route(/fonts\.g/, r => r.fulfill({ status:200, body:"" }));
  await ctx.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, r => {
    const url = r.request().url();
    if (/transformers@/.test(url)) return r.fulfill({ path:path.join(import.meta.dirname, "fake-transformers.js"), contentType:"application/javascript" });
    const lib = Object.keys(LIBS).find(k => url.endsWith(k));
    return lib ? r.fulfill({ path:path.join(MODULES, LIBS[lib]), contentType:"application/javascript" }) : r.fulfill({ status:404, body:"" });
  });
  await ctx.route(/cards\.scryfall\.io/, r => r.fulfill({ path:path.join(OUT, `art${/\/(\d)\.png/.exec(r.request().url())[1]}.png`), contentType:"image/png", headers:{ "access-control-allow-origin":"*" } }));
  await ctx.route(/api\.scryfall\.com/, r => {
    const u = decodeURIComponent(r.request().url()).toLowerCase(), byId = /\/cards\/(0{7}\d)/.exec(u);
    const k = NAMES.findIndex(n => u.includes(n.toLowerCase()));
    if (u.includes("/catalog/")) return json(r, { data:NAMES });
    if (byId) return json(r, card(+byId[1].slice(-1)));
    if (k >= 0) return json(r, u.includes("/search") ? { data:[card(k)] } : card(k));
    return json(r, {}, 404);
  });
  await ctx.route(/api2\.moxfield\.com/, r => json(r, { name:"Mox Test", boards:{ commanders:{ cards:{ a:{ quantity:1, card:{ name:"Gamma Card" } } } },
    mainboard:{ cards:{ b:{ quantity:1, card:{ name:"Sol Ring" } }, c:{ quantity:30, card:{ name:"Mountain" } } } } } }));
  await ctx.route(/archidekt\.com\/api/, r => r.abort("failed"));  // a site that blocks other pages from reading its decks
  await ctx.addInitScript(([peerPort, lisp]) => {
    // Point PeerJS at the local signaling server
    let P; Object.defineProperty(window, "Peer", { configurable:true, get(){ return P; },
      set(v){ P = class extends v { constructor(id, o = {}){ super(id, { ...o, host:"127.0.0.1", port:peerPort, path:"/", secure:false }); } }; } });
    // Speech recognition stand-in: whatever the test puts in window.__say is "heard" the next time captions start
    // and an error the test puts in window.__speechError is reported the next time it starts (like Brave's "network")
    class FakeSR { start(){
      const t = window.__say, err = window.__speechError;
      if (err) { window.__speechError = null; setTimeout(() => this.onerror?.({ error:err }), 200); }
      if (t) { window.__say = null; setTimeout(() => this.onresult?.({ resultIndex:0, results:[Object.assign([{ transcript:t }], { isFinal:true })] }), 400); }
    } stop(){} }
    window.SpeechRecognition = FakeSR;
    if (lisp) try { localStorage.setItem("kt-lisp-me", "1"); } catch {}
  }, [PEER_PORT, lisp]);
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("dialog", d => d.accept());
  return page;
}

// Open the lobby (optionally for a table code), fill in the name and deck, and sit down
export async function sitDown(page, name, { room = "", deck, mode } = {}){
  await page.goto(`${BASE}/index.html${room ? "?room=" + room : ""}`);
  await expect(page.locator("#lobby")).toBeVisible();
  await page.fill("#nameIn", name);
  if (deck !== undefined) await page.fill("#deckIn", deck);
  if (mode) await page.selectOption("#modeSel", mode);
  await page.click("#joinBtn");
  await expect(page.locator("#table")).toBeVisible({ timeout:15000 });
  await page.waitForTimeout(700);
  await page.keyboard.press("Escape");  // skip the commander question
  return new URL(page.url()).searchParams.get("room");
}
// The table code's first player needs a few seconds before the table is "theirs" to share with joiners
export const settle = (page, ms = 3500) => page.waitForTimeout(ms);

export const tile = (page, seat) => page.locator(`#grid .tile[data-seat="${seat}"]`);
export const logLines = page => page.$$eval("#log li", l => l.map(x => x.textContent));
export async function lifeOf(page, seat){ return +(await tile(page, seat).locator(".life output").textContent()); }

// Click (or drag a box) on a point of a player's camera, given in the camera's own 1280x720 pixels
export async function clickCamera(page, seat, x, y, dragTo){
  const r = await tile(page, seat).locator("video").evaluate(v => { const b = v.getBoundingClientRect(); return { x:b.x, y:b.y, w:b.width, h:b.height, vw:v.videoWidth, vh:v.videoHeight }; });
  const sc = Math.min(r.w / r.vw, r.h / r.vh), q = r.vw / 1280, ox = r.x + (r.w - r.vw * sc) / 2, oy = r.y + (r.h - r.vh * sc) / 2;
  const at = (px, py) => [ox + px * q * sc, oy + py * q * sc];
  await page.$eval("#cardView", e => { e.innerHTML = ""; });
  if (dragTo) { await page.mouse.move(...at(x, y)); await page.mouse.down(); await page.mouse.move(...at(...dragTo), { steps:5 }); await page.mouse.up(); }
  else await page.mouse.click(...at(x, y));
  await expect(page.locator("#status")).not.toHaveText(/\.\.\.$|^$/, { timeout:20000 });
  return { shown:await page.locator("#cardView h2").first().textContent().catch(() => ""), status:await page.textContent("#status") };
}

// Say something to a player's own speech recognition (turning captions off and on makes it listen again)
export async function say(page, text){
  await page.evaluate(t => { window.__say = t; }, text);
  await page.click("#capBtn"); await page.click("#capBtn");
  await page.waitForTimeout(1200);
}
export { BASE, fs };
