import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { OUT } from "../support/fixtures.mjs";

const builder = path.resolve(import.meta.dirname, "..", "..", "tools", "build-index.mjs");
// The fixture art is served by the test web server in the main process, so this runs the builder as a separate process
const run = async dir => (await promisify(execFile)(process.execPath, [builder, dir, "--fake-model"], { env:{ ...process.env, SCRYFALL_BULK_FILE:path.join(OUT, "bulk.jsonl") }, encoding:"utf8", timeout:120000 })).stdout;

test("the index builder skips what it should, keeps both faces, and only adds new cards on a re-run", async () => {
  const dir = path.join(OUT, "index-test"); fs.rmSync(dir, { recursive:true, force:true });
  const first = await run(dir);
  expect(first).toContain("0 already indexed, 6 to add");
  expect(first).toContain("Added 5 artworks, 1 couldn't be downloaded");
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "cards.json"), "utf8"));
  expect(meta.cards.map(c => c[1])).toEqual(["Alpha Card", "Beta Card", "Gamma Card", "Front Face", "Back Face"]);
  expect(fs.statSync(path.join(dir, "cards.bin")).size).toBe(meta.n * 4 + meta.n * meta.dims);
  expect(await run(dir)).toContain("5 already indexed, 1 to add");
});
