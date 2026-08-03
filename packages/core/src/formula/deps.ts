import type { AstNode } from "./ast.js";
import { getFunction } from "./functions/index.js";
import { cellRefKey } from "./refs.js";

export interface DepInfo {
  deps: string[];
  volatile: boolean;
}

export function collectDeps(ast: AstNode, maxRangeCells = 100_000): DepInfo {
  const deps = new Set<string>();
  let volatile = false;

  const walk = (node: AstNode): void => {
    switch (node.type) {
      case "cell":
        deps.add(cellRefKey(node.row, node.col));
        break;
      case "range": {
        const cells =
          (node.r2 - node.r1 + 1) * (node.c2 - node.c1 + 1);
        if (cells > maxRangeCells) {
          // still record corners for dependency tracking
          deps.add(cellRefKey(node.r1, node.c1));
          deps.add(cellRefKey(node.r2, node.c2));
          break;
        }
        for (let r = node.r1; r <= node.r2; r++) {
          for (let c = node.c1; c <= node.c2; c++) {
            deps.add(cellRefKey(r, c));
          }
        }
        break;
      }
      case "unary":
      case "percent":
        walk(node.arg);
        break;
      case "binary":
        walk(node.left);
        walk(node.right);
        break;
      case "call": {
        const def = getFunction(node.name);
        if (def?.volatile) volatile = true;
        // INDIRECT deps unknown statically
        for (const a of node.args) walk(a);
        break;
      }
      default:
        break;
    }
  };

  walk(ast);
  return { deps: [...deps], volatile };
}
