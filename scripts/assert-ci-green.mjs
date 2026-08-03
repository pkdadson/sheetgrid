#!/usr/bin/env node
/**
 * Refuse to publish unless the current commit (or main tip) has a green CI run.
 *
 * Usage:
 *   node scripts/assert-ci-green.mjs
 *   node scripts/assert-ci-green.mjs --sha <commit>
 *   CI=1 node scripts/assert-ci-green.mjs   # skip (already inside Actions quality job)
 *
 * Requires: gh CLI authenticated with repo access.
 */
import { execSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function main() {
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    console.log("assert-ci-green: running inside CI — skip (quality job is the gate).");
    return;
  }

  const args = process.argv.slice(2);
  let sha = null;
  const shaIdx = args.indexOf("--sha");
  if (shaIdx >= 0) sha = args[shaIdx + 1];
  if (!sha) {
    try {
      sha = run("git rev-parse HEAD");
    } catch {
      console.error("assert-ci-green: not a git repo / cannot resolve HEAD");
      process.exit(1);
    }
  }

  let branch = "";
  try {
    branch = run("git rev-parse --abbrev-ref HEAD");
  } catch {
    /* ignore */
  }

  console.log(`assert-ci-green: checking CI for ${sha.slice(0, 7)} (${branch || "detached"})…`);

  let runsJson;
  try {
    runsJson = run(
      `gh run list --commit ${sha} --workflow ci.yml --limit 20 --json conclusion,status,databaseId,url,displayTitle,headSha`,
    );
  } catch (err) {
    console.error(
      "assert-ci-green: failed to query GitHub Actions (is `gh` logged in?).\n",
      err?.message || err,
    );
    process.exit(1);
  }

  const runs = JSON.parse(runsJson || "[]");
  const success = runs.find((r) => r.conclusion === "success");
  const pending = runs.find((r) => r.status === "in_progress" || r.status === "queued");
  const failed = runs.find((r) => r.conclusion === "failure" || r.conclusion === "cancelled");

  if (success) {
    console.log(`assert-ci-green: OK — green CI\n  ${success.url}`);
    return;
  }

  if (pending) {
    console.error(
      `assert-ci-green: CI still running for this commit.\n  ${pending.url}\nWait for green, then publish.`,
    );
    process.exit(1);
  }

  if (failed) {
    console.error(
      `assert-ci-green: CI failed for this commit — do not publish.\n  ${failed.url}`,
    );
    process.exit(1);
  }

  console.error(
    `assert-ci-green: no CI run found for ${sha.slice(0, 7)}.\n` +
      "Push to origin and wait for CI on main, or open a PR first.",
  );
  process.exit(1);
}

main();
