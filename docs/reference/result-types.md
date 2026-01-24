# Result Types Reference

The `Result<T>` type provides explicit error handling across the platform. This pattern ensures errors are visible in types and cannot be accidentally ignored.

## Why Result Types?

- **Explicit errors**: No hidden exceptions crossing network boundaries
- **Type safety**: Compiler enforces handling of both success and failure cases
- **Stable error codes**: Documented, versioned codes for client handling
- **Network safe**: Serializable across remote boundaries

## Basic Usage

```typescript
import { ok, err, isOk, isErr, Result } from "@rbx/shared-types";
import { ErrorCode } from "@rbx/shared-types";

// Creating results
const success = ok({ userId: "123", name: "Player" });
const failure = err(ErrorCode.NotFound, "User not found");

// Checking results
if (isOk(success)) {
  print(success.value.name); // Type-safe access
}

if (isErr(failure)) {
  print(failure.code); // ErrorCode.NotFound (2004)
  print(failure.message); // "User not found"
}
```

## Result Type Definition

```typescript
interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

interface Err {
  readonly ok: false;
  readonly code: ErrorCode;
  readonly message?: string;
  readonly retryAfterMs?: number;
  readonly field?: string;
}

type Result<T> = Ok<T> | Err;
```

## Helper Functions

### `ok<T>(value: T): Ok<T>`

Creates a successful result containing a value.

```typescript
const result = ok({ items: ["sword", "shield"] });
// { ok: true, value: { items: ["sword", "shield"] } }
```

### `err(code, message?, options?): Err`

Creates an error result with a stable error code.

```typescript
const result = err(ErrorCode.RateLimited, "Too many requests", {
  retryAfterMs: 5000,
});
// { ok: false, code: 2001, message: "Too many requests", retryAfterMs: 5000 }
```

### `isOk<T>(result: Result<T>): result is Ok<T>`

Type guard that narrows to the success case.

```typescript
function handleResult(result: Result<User>) {
  if (isOk(result)) {
    // TypeScript knows result.value is User
    return result.value.name;
  }
  // TypeScript knows result is Err
  return `Error: ${result.code}`;
}
```

### `isErr(result: Result<T>): result is Err`

Type guard that narrows to the error case.

```typescript
if (isErr(result)) {
  logger.warn(`Operation failed: ${result.code}`);
  if (result.retryAfterMs) {
    scheduleRetry(result.retryAfterMs);
  }
}
```

## Error Fields

| Field          | Type        | Description                         |
| -------------- | ----------- | ----------------------------------- |
| `code`         | `ErrorCode` | Stable numeric error code           |
| `message`      | `string?`   | Human-readable description          |
| `retryAfterMs` | `number?`   | Suggested retry delay               |
| `field`        | `string?`   | Which field caused validation error |

## Pattern: Remote Response

```typescript
// Server
const fetchInventory: RemoteCallback<void, Result<Inventory>> = (player) => {
  const inventory = getInventory(player);
  if (!inventory) {
    return err(ErrorCode.NotFound, "Inventory not found");
  }
  return ok(inventory);
};

// Client
const result = await Remotes.fetchInventory();
if (isErr(result)) {
  showError(getErrorMessage(result.code));
  return;
}
displayInventory(result.value);
```

## Pattern: Validation Chain

```typescript
function validatePurchase(request: PurchaseRequest): Result<ValidatedPurchase> {
  if (!request.itemId) {
    return err(ErrorCode.MissingField, "itemId is required", { field: "itemId" });
  }

  if (request.quantity < 1 || request.quantity > 99) {
    return err(ErrorCode.OutOfBounds, "Quantity must be 1-99", { field: "quantity" });
  }

  const item = getItem(request.itemId);
  if (!item) {
    return err(ErrorCode.NotFound, "Item does not exist");
  }

  return ok({ item, quantity: request.quantity });
}
```

## See Also

- [Error Codes Reference](./error-codes.md) - Complete list of error codes
- [Networking Architecture](../architecture/networking.md) - How Results work with remotes
