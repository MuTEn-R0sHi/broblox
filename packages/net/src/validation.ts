import { t } from "@rbxts/t";
import { ErrorCode, Result, ok, err, HandshakePayload, DoActionPayload } from "@rbx/shared-types";

export type ValidationResult<T> = Result<T>;

export function validate<T>(guard: t.check<T>, value: unknown): ValidationResult<T> {
  if (!guard(value)) {
    return err(ErrorCode.InvalidPayload);
  }
  return ok(value);
}

export const bounded = {
  number:
    (min: number, max: number) =>
    (v: unknown): v is number =>
      t.number(v) && v >= min && v <= max,
  string:
    (maxLength: number, minLength = 0) =>
    (v: unknown): v is string =>
      t.string(v) && v.size() >= minLength && v.size() <= maxLength,
  array:
    <T>(itemGuard: t.check<T>, maxLength: number) =>
    (v: unknown): v is T[] => {
      if (typeOf(v) !== "table") return false;
      const arr = v as T[];
      if (arr.size() > maxLength) return false;
      for (const item of arr) {
        if (!itemGuard(item)) return false;
      }
      return true;
    },
  vector3:
    (maxMagnitude: number) =>
    (v: unknown): v is Vector3 =>
      typeOf(v) === "Vector3" && (v as Vector3).Magnitude <= maxMagnitude,
};

const doActionSchema = t.strictInterface({
  actionId: bounded.string(50, 1),
  timestamp: t.number,
});

export function validateDoActionPayload(value: unknown): Result<DoActionPayload> {
  return validate(doActionSchema, value);
}

const handshakeSchema = t.strictInterface({
  protocolVersion: t.number,
  buildId: t.string,
  deviceClass: t.union(t.literal("kbm"), t.literal("gamepad"), t.literal("touch")),
});

export function validateHandshakePayload(value: unknown): Result<HandshakePayload> {
  return validate(handshakeSchema, value);
}
