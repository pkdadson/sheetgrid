import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// jsdom does not implement ResizeObserver; composable falls back without it,
// but a stub keeps observe/unobserve call sites stable in tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

enableAutoUnmount(afterEach);
