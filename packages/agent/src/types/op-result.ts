export type OpErrorCode =
  | "not_found"
  | "validation_failed"
  | "read_only"
  | "invalid_argument"
  | "conflict"
  | "unsupported"
  | "detached"
  | "internal";

export type OpResult<T = void> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: OpErrorCode;
      message: string;
      details?: unknown;
    };

export function ok<T>(value: T): OpResult<T> {
  return { ok: true, value };
}

export function fail(
  code: OpErrorCode,
  message: string,
  details?: unknown,
): OpResult<never> {
  return { ok: false, code, message, details };
}
