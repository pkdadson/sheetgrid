import { useEffect, useState } from "react";
import { MatrixDemo } from "./pages/MatrixDemo";
import { ObjectsDemo } from "./pages/ObjectsDemo";
import { PerfDemo } from "./pages/PerfDemo";

export type Page = "objects" | "matrix" | "perf";
export type Theme = "light" | "dark";
export type Density = "comfortable" | "compact";

function pageFromHash(): Page {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  if (raw === "matrix" || raw === "perf" || raw === "objects") return raw;
  return "objects";
}

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem("sheetgrid-demo-theme");
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function readStoredDensity(): Density {
  try {
    const v = localStorage.getItem("sheetgrid-demo-density");
    if (v === "compact" || v === "comfortable") return v;
  } catch {
    /* ignore */
  }
  return "comfortable";
}

export function App() {
  const [page, setPage] = useState<Page>(() =>
    typeof window !== "undefined" ? pageFromHash() : "objects",
  );
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" ? readStoredTheme() : "light",
  );
  const [density, setDensity] = useState<Density>(() =>
    typeof window !== "undefined" ? readStoredDensity() : "comfortable",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("sheetgrid-demo-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("sheetgrid-demo-density", density);
    } catch {
      /* ignore */
    }
  }, [density]);

  useEffect(() => {
    const desired = `#${page}`;
    if (window.location.hash !== desired) {
      window.history.replaceState(null, "", desired);
    }
  }, [page]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (next: Page) => {
    setPage(next);
    window.location.hash = next;
  };

  return (
    <div className="app" data-theme={theme}>
      <a className="skip-link" href="#demo-main">
        Skip to grid
      </a>
      <nav className="nav" data-testid="demo-nav" aria-label="Demo">
        <h1>SheetGrid</h1>
        <div className="nav-tabs" role="tablist" aria-label="Demo pages">
          <button
            type="button"
            role="tab"
            aria-selected={page === "objects"}
            className={page === "objects" ? "active" : ""}
            data-testid="nav-objects"
            onClick={() => go("objects")}
          >
            Objects
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={page === "matrix"}
            className={page === "matrix" ? "active" : ""}
            data-testid="nav-matrix"
            onClick={() => go("matrix")}
          >
            2D Matrix
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={page === "perf"}
            className={page === "perf" ? "active" : ""}
            data-testid="nav-perf"
            onClick={() => go("perf")}
          >
            10k Perf
          </button>
        </div>
        <div className="nav-actions">
          <button
            type="button"
            data-testid="toggle-density"
            aria-pressed={density === "compact"}
            onClick={() =>
              setDensity((d) =>
                d === "compact" ? "comfortable" : "compact",
              )
            }
          >
            {density === "compact" ? "Comfortable" : "Compact"}
          </button>
          <button
            type="button"
            data-testid="toggle-theme"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>
      <main className="main" data-testid="demo-main" id="demo-main">
        {page === "objects" && (
          <ObjectsDemo density={density} theme={theme} />
        )}
        {page === "matrix" && <MatrixDemo density={density} theme={theme} />}
        {page === "perf" && <PerfDemo density={density} theme={theme} />}
      </main>
    </div>
  );
}
