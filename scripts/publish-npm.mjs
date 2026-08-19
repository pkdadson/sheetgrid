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
import { dirname, join } from "node:path";
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
const dirty = execSync("git status --porcelain", {
  cwd: root,
  encoding: "utf8",
}).trim();
if (dirty) {
  console.error("publish-npm: working tree is dirty. Commit or stash first.");
  process.exit(1);
}

// Gate: CI must be green on this commit
run("node scripts/assert-ci-green.mjs");

const otp = process.env.NPM_OTP;
const otpFlag = otp ? ` --otp=${otp}` : "";

// Publish order matters — dependencies before dependents.
// Stable packages publish to the default (latest) dist-tag; alpha
// packages publish to `next` so they aren't picked up by @^0.1.0-style
// consumers accidentally.
const ALL_PACKAGES = [
  { name: "@sheetgrid/tokens", tag: null },
  { name: "@sheetgrid/core", tag: null },
  { name: "@sheetgrid/agent", tag: "next" },
  { name: "@sheetgrid/react", tag: null },
  { name: "@sheetgrid/vue", tag: "next" },
  { name: "@sheetgrid/nuxt", tag: "next" },
];

const packages = filter
  ? ALL_PACKAGES.filter((p) => p.name === filter)
  : ALL_PACKAGES;

if (packages.length === 0) {
  console.error(`publish-npm: filter "${filter}" matched no known packages.`);
  process.exit(1);
}

// Build + unit tests again locally (belt and suspenders)
run("pnpm build");
run("pnpm test");

function localVersion(name) {
  const dir = name.replace("@sheetgrid/", "");
  const pkg = JSON.parse(
    execSync(`cat packages/${dir}/package.json`, { cwd: root, encoding: "utf8" }),
  );
  return pkg.version;
}

function isPublished(name, version) {
  try {
    // Some npm versions exit 0 with empty output for a missing version of
    // an existing package, so the check must be on output, not exit code.
    const out = execSync(`npm view ${name}@${version} version`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

for (const { name, tag } of packages) {
  const version = localVersion(name);
  // A release rarely bumps every package; registry versions are immutable,
  // so republishing an existing one would abort the run mid-sequence.
  if (isPublished(name, version)) {
    console.log(`\n=== Skipping ${name}@${version} (already on registry) ===`);
    continue;
  }
  console.log(
    `\n=== Publishing ${name}@${version}${tag ? ` (--tag ${tag})` : ""} ===`,
  );
  const tagFlag = tag ? ` --tag ${tag}` : "";
  run(
    `pnpm --filter ${name} publish --access public --no-git-checks${tagFlag}${otpFlag}`,
  );
}

console.log("\npublish-npm: done.");
