export type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "^"
  | "&"
  | "="
  | "<>"
  | ">"
  | ">="
  | "<"
  | "<=";

export type AstNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "bool"; value: boolean }
  | {
      type: "cell";
      row: number;
      col: number;
      rowAbs: boolean;
      colAbs: boolean;
    }
  | { type: "range"; r1: number; c1: number; r2: number; c2: number }
  | { type: "unary"; op: "+" | "-"; arg: AstNode }
  | { type: "percent"; arg: AstNode }
  | { type: "binary"; op: BinaryOp; left: AstNode; right: AstNode }
  | { type: "call"; name: string; args: AstNode[] };
