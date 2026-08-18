import type { Command, GridEvent, GridStore } from "@sheetgrid/core";
import type { AgentOp } from "../types/agent-op.js";
import { type OpResult, fail } from "../types/op-result.js";
import type { EventBus } from "./event-bus.js";

export interface DispatcherOptions {
  getStore(): GridStore | null;
  bus: EventBus;
  notify(): void;
  /** Auth checkpoint — invoked before Command dispatch. */
  auth(op: AgentOp): OpResult;
}

export type Dispatcher = (op: AgentOp, cmd: Command) => OpResult;

export function createDispatcher(o: DispatcherOptions): Dispatcher {
  return (op, cmd): OpResult => {
    o.bus.checkReentrancy();
    const store = o.getStore();
    if (!store)
      return fail("detached", "GridController is not attached to a grid");
    const authRes = o.auth(op);
    if (!authRes.ok) return authRes;
    const res = store.__history.dispatch(cmd);
    if (!res.ok)
      return {
        ok: false,
        code: res.code as any,
        message: res.message,
        details: (res as any).details,
      };
    // Emit each event on the controller bus.
    for (const event of (res as { events: GridEvent[] }).events) {
      o.bus.emit(event as any);
    }
    o.notify();
    return { ok: true, value: undefined };
  };
}
