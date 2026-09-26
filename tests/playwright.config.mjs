import { defineConfig } from "@playwright/test";

// One test at a time: every test runs its own set of browsers against one shared signaling server
export default defineConfig({
  testDir:"./specs",
  globalSetup:"./support/global-setup.mjs",
  workers:1,
  timeout:120000,
  expect:{ timeout:10000 },
  retries:0,
  reporter:[["list"]]
});
