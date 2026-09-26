/* Test fixtures, generated in plain Node so the tests need nothing from outside the repo:
   three card artworks (PNG, served as Scryfall art), a fake webcam video showing one of those cards on a playmat
   (Y4M, for Chromium's --use-file-for-fake-video-capture), a fake microphone with speech-length sounds (WAV), and
   a small Scryfall-style card list for the index builder. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const OUT = path.resolve(import.meta.dirname, "..", ".fixtures");
export const NAMES = ["Alpha Card", "Beta Card", "Gamma Card", "Sol Ring", "Rhystic Study"];
export const cardId = k => `0000000${k}-0000-4000-8000-00000000000${k}`;
export const ART_W = 626, ART_H = 457;  // Scryfall art_crop size

// Seeded random numbers, so every run draws the same pictures
function rng(seed){ return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }

// An artwork: a solid background with overlapping colored circles (distinct enough for the matcher to tell apart)
function drawArt(k){
  const r = rng(1234 + k * 99), bg = [[200, 60, 40], [40, 90, 200], [60, 160, 70]][k % 3];
  const px = new Uint8Array(ART_W * ART_H * 3);
  for (let i = 0; i < ART_W * ART_H; i++) px.set(bg, i * 3);
  for (let n = 0; n < 14; n++) {
    const cx = r() * ART_W, cy = r() * ART_H, rad = 20 + r() * 90, col = [r() * 255 | 0, r() * 255 | 0, r() * 255 | 0];
    for (let y = Math.max(0, cy - rad | 0); y < Math.min(ART_H, cy + rad); y++)
      for (let x = Math.max(0, cx - rad | 0); x < Math.min(ART_W, cx + rad); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) px.set(col, (y * ART_W + x) * 3);
  }
  return px;
}
function png(px, w, h){
  const crcTable = Array.from({ length:256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = ~0; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, px.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// Nearest-neighbor scaling, optionally turned a quarter clockwise (a tapped card)
function scaled(px, w, h, W, H){ const o = new Uint8Array(W * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) o.set(px.subarray(((y * h / H | 0) * w + (x * w / W | 0)) * 3, ((y * h / H | 0) * w + (x * w / W | 0)) * 3 + 3), (y * W + x) * 3); return o; }

// A card: dark border, light name bar, the art in the art box, light text box (standard frame proportions)
function drawCard(art, W = 300, H = 419){
  const px = new Uint8Array(W * H * 3).fill(20);
  const fill = (x0, y0, x1, y1, col) => { for (let y = y0 | 0; y < y1; y++) for (let x = x0 | 0; x < x1; x++) px.set(col, (y * W + x) * 3); };
  fill(0.045 * W, 0.035 * H, 0.955 * W, 0.105 * H, [225, 215, 190]);
  fill(0.045 * W, 0.57 * H, 0.955 * W, 0.93 * H, [230, 225, 210]);
  const aw = Math.round(0.83 * W), ah = Math.round(0.442 * H), a = scaled(art, ART_W, ART_H, aw, ah), ax = Math.round(0.085 * W), ay = Math.round(0.113 * H);
  for (let y = 0; y < ah; y++) px.set(a.subarray(y * aw * 3, (y + 1) * aw * 3), ((ay + y) * W + ax) * 3);
  return { px, W, H };
}
function y4m(frame, W, H, frames = 30){
  const Y = Buffer.alloc(W * H), U = Buffer.alloc(W * H / 4), V = Buffer.alloc(W * H / 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = frame[i], g = frame[i + 1], b = frame[i + 2];
    Y[y * W + x] = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
    if (!(y & 1) && !(x & 1)) { const j = (y / 2) * (W / 2) + x / 2; U[j] = Math.max(0, Math.min(255, 128 - 0.1687 * r - 0.3313 * g + 0.5 * b)); V[j] = Math.max(0, Math.min(255, 128 + 0.5 * r - 0.4187 * g - 0.0813 * b)); }
  }
  const one = Buffer.concat([Buffer.from("FRAME\n"), Y, U, V]);
  return Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`), ...Array(frames).fill(one)]);
}
// Speech-length sounds: 2 seconds of a warbling tone, 1.5 seconds of silence, repeated
function wav(){
  const sr = 48000, s = [];
  for (let k = 0; k < 8; k++) {
    for (let i = 0; i < sr * 2; i++) { const t = i / sr; s.push(9000 * Math.sin(2 * Math.PI * (220 + 60 * Math.sin(2 * Math.PI * 3 * t)) * t)); }
    for (let i = 0; i < sr * 1.5; i++) s.push(0);
  }
  const data = Buffer.alloc(s.length * 2); s.forEach((v, i) => data.writeInt16LE(Math.round(v), i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

export function makeFixtures(base){
  fs.mkdirSync(OUT, { recursive:true });
  const arts = [0, 1, 2].map(drawArt);
  arts.forEach((a, k) => fs.writeFileSync(path.join(OUT, `art${k}.png`), png(a, ART_W, ART_H)));
  // The camera: a 1280x720 playmat with the Gamma Card (art 2) upright in the middle
  const W = 1280, H = 720, frame = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) frame.set([35, 50, 40], i * 3);
  const c = drawCard(arts[2]);
  for (let y = 0; y < c.H; y++) frame.set(c.px.subarray(y * c.W * 3, (y + 1) * c.W * 3), ((150 + y) * W + 490) * 3);
  fs.writeFileSync(path.join(OUT, "camera.y4m"), y4m(frame, W, H));
  fs.writeFileSync(path.join(OUT, "phrases.wav"), wav());
  // Scryfall-style bulk list for the index builder: the three artworks, a double-faced card, and cards it must skip
  const art = k => `${base}/fixtures/art${k}.png`;
  const cards = [0, 1, 2].map(k => ({ id:cardId(k), name:NAMES[k], games:["paper"], layout:"normal", image_uris:{ art_crop:art(k) } }));
  cards.push({ id:cardId(4), name:"Front Face // Back Face", games:["paper"], layout:"transform", card_faces:[{ name:"Front Face", image_uris:{ art_crop:art(1) } }, { name:"Back Face", image_uris:{ art_crop:art(0) } }] });
  cards.push({ id:cardId(5), name:"Digital Only", games:["arena"], digital:true, layout:"normal", image_uris:{ art_crop:art(2) } });
  cards.push({ id:cardId(6), name:"Art Card", games:["paper"], layout:"art_series", image_uris:{ art_crop:art(2) } });
  cards.push({ id:cardId(7), name:"Missing Art", games:["paper"], layout:"normal", image_uris:{ art_crop:`${base}/fixtures/missing.png` } });
  fs.writeFileSync(path.join(OUT, "bulk.jsonl"), cards.map(c => JSON.stringify(c)).join("\n") + "\n");
}
