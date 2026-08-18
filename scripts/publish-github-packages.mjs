#!/usr/bin/env node
import { execSync } from "node:child_process";
/**
 * Publish packages to GitHub Packages (npm.pkg.github.com).
 *
 * GitHub requires package scope === owner login, so we publish as:
 *   @pkdadson/sheetgrid-tokens
 *   @pkdadson/sheetgrid-core
 *   @pkdadson/sheetgrid-react
 *
 * Source packages remain @sheetgrid/* for the public npm registry.
 * Versions are taken from each package's package.json.
 *
 * Requires: NODE_AUTH_TOKEN with packages:write (GITHUB_TOKEN in Actions).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
      "@sheetgrid/core": {
        ghName: `@${owner}/sheetgrid-core`,
        versionFrom: "packages/core",
      },
      "@sheetgrid/tokens": {
        ghName: `@${owner}/sheetgrid-tokens`,
        versionFrom: "packages/tokens",
      },
    },
  },
];

function run(cmd, cwd, { ignoreError = false } = {}) {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: "inherit", env: process.env });
    return true;
  } catch (err) {
    if (ignoreError) return false;
    throw err;
  }
}

function readVersion(relDir) {
  const pkgJson = JSON.parse(
    readFileSync(join(root, relDir, "package.json"), "utf8"),
  );
  return pkgJson.version;
}

function alreadyPublished(name, version, outDir) {
  // Uses package-local .npmrc with auth
  try {
    const out = execSync(
      `npm view ${name}@${version} version --registry=${registry}`,
      {
        cwd: outDir,
        encoding: "utf8",
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
    return out === version;
  } catch {
    return false;
  }
}

function prepareOne(pkg) {
  const srcDir = join(root, pkg.dir);
  const pkgJson = JSON.parse(
    readFileSync(join(srcDir, "package.json"), "utf8"),
  );
  const version = pkgJson.version;

  const outDir = join(staging, pkg.dir.replace("packages/", ""));
  mkdirSync(outDir, { recursive: true });

  for (const item of pkg.copy) {
    const from = join(srcDir, item);
    const to = join(outDir, item);
    if (!existsSync(from)) {
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
    scripts: {
      ...(pkgJson.scripts || {}),
      prepublishOnly: 'node -e "process.exit(0)"',
    },
  };

  if (pkg.mapDeps && next.dependencies) {
    const deps = { ...next.dependencies };
    for (const [from, mapping] of Object.entries(pkg.mapDeps)) {
      if (deps[from] != null) {
        delete deps[from];
        deps[mapping.ghName] = readVersion(mapping.versionFrom);
      }
    }
    next.dependencies = deps;
  }

  next.devDependencies = undefined; // omitted by JSON.stringify below

  writeFileSync(
    join(outDir, "package.json"),
    `${JSON.stringify(next, null, 2)}\n`,
  );
  writeFileSync(
    join(outDir, ".npmrc"),
    `@${owner}:registry=${registry}\n//npm.pkg.github.com/:_authToken=${process.env.NODE_AUTH_TOKEN}\n`,
  );

  return { outDir, version, ghName: pkg.ghName };
}

function main() {
  if (!process.env.NODE_AUTH_TOKEN) {
    console.error(
      "NODE_AUTH_TOKEN is required (GitHub token with packages:write).",
    );
    process.exit(1);
  }

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  run("pnpm --filter @sheetgrid/core build", root);
  run("pnpm --filter @sheetgrid/react build", root);

  for (const pkg of packages) {
    const { outDir, version, ghName } = prepareOne(pkg);

    if (alreadyPublished(ghName, version, outDir)) {
      console.log(`\nSkip ${ghName}@${version} (already on GitHub Packages)`);
      continue;
    }

    console.log(`\nPublishing ${ghName}@${version} …`);
    const ok = run("npm publish --access public", outDir, {
      ignoreError: true,
    });
    if (!ok) {
      // Race or "cannot publish over previously published"
      if (alreadyPublished(ghName, version, outDir)) {
        console.log(
          `OK — ${ghName}@${version} already present after publish attempt`,
        );
      } else {
        console.error(`Failed to publish ${ghName}@${version}`);
        process.exit(1);
      }
    }
  }

  console.log("\nGitHub Packages publish complete.");
  console.log(`Packages: https://github.com/${owner}?tab=packages`);
}

main();
