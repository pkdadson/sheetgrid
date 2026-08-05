import { expect, test } from "@playwright/test";
import { goToMatrix, goToObjects, goToPerf, grid, openDemo } from "./helpers";

// One spec, two Playwright projects: `docs-shots` (desktop) and
// `docs-shots-mobile` (Pixel 5). Each test pins itself to one project via
// `test.skip` and writes to a hardcoded path under `docs/assets/`.
// Regenerate all shots: `pnpm docs:shots`.

const DESKTOP = "docs-shots";
const MOBILE = "docs-shots-mobile";

test.describe("docs screenshots", () => {
  // Tasks 2-5 add tests here.
});
