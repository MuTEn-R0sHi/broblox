type Validator = (v: unknown) => boolean;

export const t = {
  strictInterface:
    (schema: Record<string, Validator>) =>
    (val: unknown): boolean => {
      if (typeof val !== "object" || val === null) return false;
      const vObj = val as Record<string, unknown>;
      for (const k in schema) {
        if (typeof schema[k] === "function" && !schema[k](vObj[k])) return false;
      }
      return true;
    },
  string: (v: unknown): boolean => typeof v === "string",
  number: (v: unknown): boolean => typeof v === "number",
  /** Accepts any value, including nil/undefined. */
  any: (_v: unknown): boolean => true,
  /** Accepts undefined/nil or whatever the inner check accepts. */
  optional:
    (check: Validator) =>
    (v: unknown): boolean =>
      v === undefined || check(v),
  union:
    (...args: Validator[]) =>
    (v: unknown): boolean =>
      args.some((fn) => fn(v)),
  literal:
    (lit: unknown) =>
    (v: unknown): boolean =>
      v === lit,
};
