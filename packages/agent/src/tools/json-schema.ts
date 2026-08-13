import type { GridSchema } from "../types/controller.js";

export type JSONSchema = Record<string, unknown> & {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  oneOf?: JSONSchema[];
  items?: JSONSchema;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
};

export function columnValueSchema(col: GridSchema["columns"][number]): JSONSchema {
  const desc = col.description ? { description: col.description } : {};
  // Special-case: select columns may carry an `options` list.
  if (col.type === "select") {
    const options = (col as unknown as { options?: unknown[] }).options ?? [];
    return { ...desc, enum: [...options, null] };
  }
  switch (col.type) {
    case "text":
      return { ...desc, type: ["string", "null"] };
    case "number":
      return { ...desc, type: ["number", "null"] };
    case "boolean":
      return { ...desc, type: ["boolean", "null"] };
    default:
      return { ...desc };
  }
}

export function whereClauseSchema(): JSONSchema {
  return filterClauseSchema();
}

export function filterClauseSchema(): JSONSchema {
  const leaf: JSONSchema = {
    type: "object",
    required: ["column", "op"],
    properties: {
      column: { type: "string", description: "column id" },
      op: {
        type: "string",
        enum: [
          "eq", "neq", "lt", "lte", "gt", "gte",
          "contains", "starts_with", "ends_with",
          "in", "not_in",
          "is_null", "is_not_null",
        ],
      },
      value: {},
    },
  };
  return {
    oneOf: [
      leaf,
      {
        type: "object",
        required: ["and"],
        properties: {
          and: { type: "array", items: { $ref: "#" } },
        },
      },
      {
        type: "object",
        required: ["or"],
        properties: {
          or: { type: "array", items: { $ref: "#" } },
        },
      },
      {
        type: "object",
        required: ["not"],
        properties: {
          not: { $ref: "#" },
        },
      },
    ],
  };
}

export function sortSpecSchema(): JSONSchema {
  return {
    type: "array",
    items: {
      type: "object",
      required: ["columnId", "direction"],
      properties: {
        columnId: { type: "string" },
        direction: { type: "string", enum: ["asc", "desc"] },
      },
    },
  };
}
