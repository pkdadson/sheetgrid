#!/usr/bin/env node
/**
 * Publish packages to GitHub Packages (npm.pkg.github.com).
 *
 * GitHub requires package scope === owner login, so we publish as:
 *   @pkdadson/sheetgrid-tokens
 *   @pkdadson/sheetgrid-core
 *   @pkdadson/sheetgrid-react
 *
 * Source packages remain @sheetgrid/* for the public npm registry.
 *
 * Requires: NODE_AUTH_TOKEN with packages:write (GITHUB_TOKEN in Actions).
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const owner = process.env.GITHUB_REPOSITORY_OWNER || "pkdadson";
const registry = "https://npm.pkg.github.com";
const staging = join(root, ".gh-publish-staging");

const packages = [
  {
    dir: "packages/tokens",
    ghName: `@${owner}/sheetgrid-tokens`,
    copy: ["variables.css", "src", "README.md", "LICENSE"],
  },
  {
    dir: "packages/core",
    ghName: `@${owner}/sheetgrid-core`,
    copy: ["dist", "README.md", "LICENSE"],
  },
  {
    dir: "packages/react",
    ghName: `@${owner}/sheetgrid-react`,
    copy: ["dist", "README.md", "LICENSE"],
    mapDeps: {
      "@sheetgrid/core": `@${owner}/sheetgrid-core`,
      "@sheetgrid/tokens": `@${owner}/sheetgrid-tokens`,
    },
  },
];

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
}

function prepareOne(pkg) {
  const srcDir = join(root, pkg.dir);
  const pkgJson = JSON.parse(readFileSync(join(srcDir, "package.json"), "utf8"));
  // Align GH package versions with the release line (0.1.0), even if local react is 0.1.1 WIP
  const version = process.env.GH_PKG_VERSION || "0.1.0";

  const outDir = join(staging, pkg.dir.replace("packages/", ""));
  mkdirSync(outDir, { recursive: true });

  for (const item of pkg.copy) {
    const from = join(srcDir, item);
    const to = join(outDir, item);
    if (!existsSync(from)) {
      // LICENSE may live at repo root
      if (item === "LICENSE" && existsSync(join(root, "LICENSE"))) {
        cpSync(join(root, "LICENSE"), to);
        continue;
      }
      console.warn(`skip missing: ${from}`);
      continue;
    }
    cpSync(from, to, { recursive: true });
  }

  const next = {
    ...pkgJson,
    name: pkg.ghName,
    version,
    repository: {
      type: "git",
      url: `https://github.com/${owner}/sheetgrid.git`,
    },
    publishConfig: {
      access: "public",
      registry,
    },
    // Avoid rebuild/test during GH publish (built in CI already)
    scripts: {
      ...(pkgJson.scripts || {}),
      prepublishOnly: "node -e \"process.exit(0)\"",
    },
  };

  if (pkg.mapDeps && next.dependencies) {
    const deps = { ...next.dependencies };
    for (const [from, to] of Object.entries(pkg.mapDeps)) {
      if (deps[from] != null) {
        delete deps[from];
        deps[to] = version;
      }
    }
    next.dependencies = deps;
  }

  // Drop workspace-only / dev tooling from published GH package
  delete next.devDependencies;

  writeFileSync(join(outDir, "package.json"), `${JSON.stringify(next, null, 2)}\n`);
  return outDir;
}

function main() {
  if (!process.env.NODE_AUTH_TOKEN) {
    console.error("NODE_AUTH_TOKEN is required (GitHub token with packages:write).");
    process.exit(1);
  }

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  // Ensure builds exist
  run("pnpm --filter @sheetgrid/core build", root);
  run("pnpm --filter @sheetgrid/react build", root);

  const npmrc = join(staging, ".npmrc");
  writeFileSync(
    npmrc,
    `@${owner}:registry=${registry}\n//npm.pkg.github.com/:_authToken=${process.env.NODE_AUTH_TOKEN}\n`,
  );

  for (const pkg of packages) {
    const outDir = prepareOne(pkg);
    // copy npmrc into package dir for publish
    writeFileSync(
      join(outDir, ".npmrc"),
      `@${owner}:registry=${registry}\n//npm.pkg.github.com/:_authToken=${process.env.NODE_AUTH_TOKEN}\n`,
    );
    console.log(`\nPublishing ${pkg.ghName}@${process.env.GH_PKG_VERSION || "0.1.0"} …`);
    run("npm publish --access public", outDir);
  }

  console.log("\nGitHub Packages publish complete.");
  console.log(`Packages: https://github.com/${owner}?tab=packages`);
}

main();
