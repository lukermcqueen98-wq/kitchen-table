/* Test players: each one is a Chromium browser with a fake camera and microphone, pointed at the local signaling
   server, with stand-ins for the CDN libraries, Scryfall, the AI models, and speech recognition. */
import { chromium, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { OUT, NAMES, cardId } from "./fixtures.mjs";
import { BASE, PEER_PORT } from "./global-setup.mjs";

const MODULES = path.resolve(import.meta.dirname, "..", "node_modules");
const LIBS = { "peerjs.min.js":"peerjs/dist/peerjs.min.js", "qrcode.min.js":"qrcodejs/qrcode.min.js", "opencv.js":"@techstark/opencv-js/dist/opencv.js" };
const card = k => ({ object:"card", id:cardId(k), name:NAMES[k], type_line:k === 2 ? "Legendary Creature — Test" : "Artifact", oracle_text:"{T}: Add {C}{C}.", mana_cost:"{2}{G/U}", scryfall_uri:"https://scryfall.com",
  color_identity:k === 2 ? ["G", "U"] : [], ...(k === 2 ? { power:"3", toughness:"4" } : {}),
  image_uris:{ small:`https://cards.scryfall.io/small/${k % 3}.png`, normal:`https://cards.scryfall.io/normal/${k % 3}.png`, art_crop:`https://cards.scryfall.io/art_crop/${k % 3}.png` } });
const FOREST = { object:"card", id:"00000009-0000-4000-8000-000000000009", name:"Forest", type_line:"Basic Land — Forest", oracle_text:"({T}: Add {G}.)", mana_cost:"",
  produced_mana:["G"], image_uris:{ small:"https://cards.scryfall.io/small/0.png", normal:"https://cards.scryfall.io/normal/0.png" } };
const json = (route, body, status = 200) => route.fulfill({ status, contentType:"application/json", headers:{ "access-control-allow-origin":"*" }, body:JSON.stringify(body) });

// camera: "card" shows the Gamma Card on a playmat; otherwise Chromium's default test pattern. mic: "phrases" plays speech-length sounds.
export async function launchBrowser({ camera, mic } = {}){
  const args = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];
  if (camera === "card") args.push(`--use-file-for-fake-video-capture=${path.join(OUT, "camera.y4m")}`);
  if (mic === "phrases") args.push(`--use-file-for-fake-audio-capture=${path.join(OUT, "phrases.wav")}`);
  return chromium.launch({ args });
}

// noWebcam: the computer has a microphone but no camera (like a player whose phone is their camera)
// rejectPhrases: the speech stand-in takes a phrase list (like newer Chrome) but fails with an unexpected error when given one
// choose: show the first-visit "webcam or digital table?" question (otherwise the webcam table is already picked)
export async function newPlayer(browser, { lisp = false, rejectPhrases = false, noWebcam = false, choose = false } = {}){
  const ctx = await browser.newContext({ permissions:["camera", "microphone", "clipboard-read", "clipboard-write"], viewport:{ width:1400, height:900 } });
  await ctx.route(/fonts\.g/, r => r.fulfill({ status:200, body:"" }));
  await ctx.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, r => {
    const url = r.request().url();
    if (/transformers@/.test(url)) return r.fulfill({ path:path.join(import.meta.dirname, "fake-transformers.js"), contentType:"application/javascript" });
    const lib = Object.keys(LIBS).find(k => url.endsWith(k));
    return lib ? r.fulfill({ path:path.join(MODULES, LIBS[lib]), contentType:"application/javascript" }) : r.fulfill({ status:404, body:"" });
  });
  await ctx.route(/svgs\.scryfall\.io/, r => r.fulfill({ status:200, contentType:"image/svg+xml", body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#ccc"/></svg>' }));
  await ctx.route(/cards\.scryfall\.io/, r => r.fulfill({ path:path.join(OUT, `art${/\/(\d)\.png/.exec(r.request().url())[1]}.png`), contentType:"image/png", headers:{ "access-control-allow-origin":"*" } }));
  await ctx.route(/api\.scryfall\.com/, r => {
    const u = decodeURIComponent(r.request().url()).toLowerCase(), byId = /\/cards\/(0{7}\d)/.exec(u);
    const k = NAMES.findIndex(n => u.includes(n.toLowerCase()));
    if (/named\?(exact|fuzzy)=forest$/.test(u) || u.includes(FOREST.id)) return json(r, FOREST);
    // decklists: up to 75 names at a time
    if (u.includes("/cards/collection")) {
      const ids = JSON.parse(r.request().postData() || "{}").identifiers || [], data = [], not_found = [];
      for (const id of ids) { const n = String(id.name || "").toLowerCase(), i = NAMES.findIndex(x => x.toLowerCase() === n); if (i >= 0) data.push(card(i)); else if (n === "forest") data.push(FOREST); else not_found.push(id); }
      return json(r, { object:"list", data, not_found });
    }
    if (u.includes("/catalog/keyword-abilities")) return json(r, { data:["Flying", "Offspring", "Fear"] });
    if (u.includes("/catalog/keyword-actions")) return json(r, { data:["Forage", "Cast"] });
    if (u.includes("/catalog/ability-words")) return json(r, { data:["Coven", "Eerie"] });
    if (u.includes("/catalog/")) return json(r, { data:NAMES });
    if (byId) return json(r, card(+byId[1].slice(-1)));
    if (k >= 0) return json(r, u.includes("/search") ? { data:[card(k)] } : card(k));
    return json(r, {}, 404);
  });
  await ctx.addInitScript(([peerPort, lisp, rejectPhrases]) => {
    // Point PeerJS at the local signaling server
    let P; Object.defineProperty(window, "Peer", { configurable:true, get(){ return P; },
      set(v){ P = class extends v { constructor(id, o = {}){ super(id, { ...o, host:"127.0.0.1", port:peerPort, path:"/", secure:false }); } }; } });
    // Speech recognition stand-in: whatever the test puts in window.__say is "heard" the next time captions start
    // and an error the test puts in window.__speechError is reported the next time it starts (like Brave's "network")
    class FakeSR { start(){
      if (rejectPhrases && this.phrases?.length) { setTimeout(() => { this.onerror?.({ error:"bad-grammar" }); this.onend?.(); }, 100); return; }
      const t = window.__say, err = window.__speechError;
      if (err) { window.__speechError = null; setTimeout(() => this.onerror?.({ error:err }), 200); }
      if (t) { window.__say = null; setTimeout(() => this.onresult?.({ resultIndex:0, results:[Object.assign([{ transcript:t }], { isFinal:true })] }), 400); }
    } stop(){} }
    if (rejectPhrases) { FakeSR.prototype.phrases = null; window.SpeechRecognitionPhrase = class { constructor(phrase, boost){ this.phrase = phrase; this.boost = boost; } }; }
    window.SpeechRecognition = FakeSR;
    // Every WebRTC connection the page opens, so a test can cut one (like a network hiccup)
    const RPC = window.RTCPeerConnection; window.__pcs = [];
    window.RTCPeerConnection = class extends RPC { constructor(...x){ super(...x); window.__pcs.push(this); } };
    if (lisp) try { localStorage.setItem("kt-lisp-me", "1"); } catch {}
  }, [PEER_PORT, lisp, rejectPhrases]);
  if (!choose) await ctx.addInitScript(() => { try { if (!localStorage.getItem("kt-play-choice")) localStorage.setItem("kt-play-choice", "webcam"); } catch {} });
  if (noWebcam) await ctx.addInitScript(() => {
    const md = navigator.mediaDevices, gum = md.getUserMedia.bind(md), en = md.enumerateDevices.bind(md);
    md.getUserMedia = c => c?.video ? Promise.reject(new DOMException("No camera", "NotFoundError")) : gum(c);
    md.enumerateDevices = async () => (await en()).filter(d => d.kind !== "videoinput");
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("dialog", d => d.accept());
  return page;
}

// Open the lobby (optionally for a table code), fill in the name, and sit down
export async function sitDown(page, name, { room = "", mode } = {}){
  await page.goto(`${BASE}/index.html${room ? "?room=" + room : ""}`);
  await expect(page.locator("#lobby")).toBeVisible({ timeout:10000 });
  await page.fill("#nameIn", name);
  if (mode) await page.selectOption("#modeSel", mode);
  await page.click("#joinBtn");
  // (on failure, say what the lobby showed: its error line and the button's text)
  await expect(page.locator("#table")).toBeVisible({ timeout:15000 }).catch(async e => {
      throw new Error(e.message + `\nAfter waiting: lobby said "${await page.textContent("#lobbyErr")}", button "${await page.textContent("#joinBtn")}"`);
    });
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
