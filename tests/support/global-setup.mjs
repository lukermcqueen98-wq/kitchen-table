/* Starts what the tests need: a web server for the page and fixtures, a local PeerJS signaling server (players find
   each other here instead of PeerJS's public server), and a small card index built by the real index builder. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { makeFixtures, OUT } from "./fixtures.mjs";

export const PORT = 8765, PEER_PORT = 9000, BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TYPES = { ".html":"text/html", ".js":"application/javascript", ".mjs":"application/javascript", ".json":"application/json",
  ".png":"image/png", ".jpg":"image/jpeg", ".bin":"application/octet-stream", ".md":"text/markdown" };

export default async function globalSetup(){
  makeFixtures(BASE);
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, BASE).pathname);
    // /fixtures and /index come from the generated fixtures; everything else from the repo (the page itself)
    const file = url.startsWith("/fixtures/") ? path.join(OUT, url.slice(10))
      : url.startsWith("/index/") ? path.join(OUT, "index", url.slice(7))
      : path.join(ROOT, url === "/" ? "index.html" : url);
    if (!file.startsWith(OUT) && !file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type":TYPES[path.extname(file)] || "application/octet-stream", "Access-Control-Allow-Origin":"*" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(PORT, "127.0.0.1", r));
  const { PeerServer } = createRequire(import.meta.url)("peer");
  const peer = PeerServer({ port:PEER_PORT, path:"/", host:"127.0.0.1" });
  // The all-cards index, built with the builder's stand-in model (same fingerprint recipe as the page's test stub)
  // (not execFileSync: the builder downloads the art from the web server above, which has to keep answering)
  fs.rmSync(path.join(OUT, "index"), { recursive:true, force:true });
  await promisify(execFile)(process.execPath, [path.join(ROOT, "tools", "build-index.mjs"), path.join(OUT, "index"), "--fake-model"],
    { env:{ ...process.env, SCRYFALL_BULK_FILE:path.join(OUT, "bulk.jsonl") }, timeout:120000 });
  return async () => { server.close(); peer.close?.(); };
}
