import { t } from "@rbxts/t";
import { ErrorCode, Result, ok, err, HandshakePayload, DoActionPayload } from "@rbx/shared-types";

const doActionSchema = t.strictInterface({
  actionId: (v: unknown): v is string => t.string(v) && v.size() >= 1 && v.size() <= 50,
  timestamp: t.number,
});

export function validateDoActionPayload(value: unknown): Result<DoActionPayload> {
  if (!doActionSchema(value)) {
    return err(ErrorCode.InvalidType);
  }
  return ok(value);
}

const handshakeSchema = t.strictInterface({
  protocolVersion: t.number,
  buildId: t.string,
  deviceClass: t.union(t.literal("kbm"), t.literal("gamepad"), t.literal("touch")),
});

export function validateHandshakePayload(value: unknown): Result<HandshakePayload> {
  if (!handshakeSchema(value)) {
    return err(ErrorCode.InvalidPayload);
  }
  return ok(value);
}
