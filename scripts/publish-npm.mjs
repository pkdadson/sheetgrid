#!/usr/bin/env node
/**
 * Publish @sheetgrid/* packages to the public npm registry only if CI is green.
 *
 * Env:
 *   NPM_OTP          optional 2FA code (--otp)
 *   PUBLISH_FILTER   optional pnpm filter (default: all three packages)
 *
 * Usage:
 *   node scripts/publish-npm.mjs
 *   NPM_OTP=123456 node scripts/publish-npm.mjs
 *   node scripts/publish-npm.mjs --filter @sheetgrid/react
 */
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env, ...opts });
}

const args = process.argv.slice(2);
let filter = null;
const fIdx = args.indexOf("--filter");
if (fIdx >= 0) filter = args[fIdx + 1];

// Gate: refuse dirty tree for publish
const dirty = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim();
if (dirty) {
  console.error("publish-npm: working tree is dirty. Commit or stash first.");
  process.exit(1);
}

// Gate: CI must be green on this commit
run("node scripts/assert-ci-green.mjs");

const otp = process.env.NPM_OTP;
const otpFlag = otp ? ` --otp=${otp}` : "";

const packages = filter
  ? [filter]
  : ["@sheetgrid/tokens", "@sheetgrid/core", "@sheetgrid/react"];

// Build + unit tests again locally (belt and suspenders)
run("pnpm build");
run("pnpm test");

for (const pkg of packages) {
  console.log(`\n=== Publishing ${pkg} ===`);
  run(
    `pnpm --filter ${pkg} publish --access public --no-git-checks${otpFlag}`,
  );
}

console.log("\npublish-npm: done.");
