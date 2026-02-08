# Modules: Localization

Internationalization and localization system (`@rbx/localization`). **Status: Implemented** (35 tests).

## Purpose

- Multi-locale string registry with 18 supported locales.
- Template interpolation: `"Welcome, {name}!"`.
- Pluralization with CLDR-style plural categories (zero, one, two, few, many, other).
- Namespace support for organizing translations by feature.
- Missing key fallback behavior (show key, empty, or bracket notation).

## Core rules

- Translations are registered at startup; no per-player persistence.
- `setLocale()` changes the active locale globally (per-client).
- Missing keys fall back to `defaultLocale` before applying missing key behavior.
- Interpolation parameters are positional via `{key}` syntax.
- Plural forms are resolved based on count following CLDR rules.

## Data model

- `LocaleStrings` — `locale: LocaleCode`, `entries: Record<string, string | PluralEntry>`
- `PluralEntry` — `{ zero?, one?, two?, few?, many?, other }`

No DataStore persistence (locale preference is client-side).

## Config/flags

- `localization.defaultLocale` (default `"en"`)
- `localization.logMissing` — log warnings for missing translation keys
- `localization.missingKeyBehavior` — `"key"` | `"empty"` | `"bracket"`

## Observability

- `i18n.missing_key` — translation key not found for active locale
- `i18n.locale_changed` — player changed locale
