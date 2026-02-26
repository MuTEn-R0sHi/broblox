# @broblox/localization

Internationalization and localization for Roblox games.

## Purpose

This package provides a full i18n system:

- **18 supported locales** — en, es, fr, de, pt, ja, ko, zh-cn, zh-tw, ru, ar, it, nl, pl, tr, th, vi, id
- **String interpolation** — Template variables in translated strings
- **Pluralization** — Plural forms (zero, one, two, few, many, other)
- **Namespaces** — Organize translations by feature area
- **Missing key handling** — Configurable fallback behavior

## Dependencies

- `@broblox/core` — Service lifecycle, logging

## Architecture

### Single Service

Unlike most packages, localization uses a single `LocalizationService` (no registry/store split) since translations are global, not per-player.

1. **LocalizationService** — Register locale strings, translate keys, manage active locale
2. **`createLocalizationService`** — Factory that pre-loads string tables

### Translation Flow

1. Register string tables per locale → `registerStrings(locale, entries)`
2. Set active locale → `setLocale("es")`
3. Translate keys → `t("ui.play_button")` returns localized string
4. Interpolate → `t("welcome", { name: "Player1" })` → `"¡Hola, Player1!"`

## Usage

```typescript
import { createLocalizationService } from "@broblox/localization";

const i18n = createLocalizationService({
  strings: [
    {
      locale: "en",
      entries: {
        "ui.play": "Play",
        "ui.welcome": "Welcome, {name}!",
        "items.count": { one: "{count} item", other: "{count} items" },
      },
    },
    {
      locale: "es",
      entries: {
        "ui.play": "Jugar",
        "ui.welcome": "¡Bienvenido, {name}!",
      },
    },
  ],
  defaultLocale: "en",
});

const svc = i18n.getI18n();
svc.setLocale("es");
svc.t("ui.play"); // "Jugar"
svc.t("ui.welcome", { name: "Roshi" }); // "¡Bienvenido, Roshi!"
svc.plural("items.count", 3); // "3 items" (falls back to en)
```

## Related Docs

- [Module docs](../../docs/modules/localization.md)
