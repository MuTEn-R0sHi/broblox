/**
 * @rbx/localization
 *
 * Internationalization and localization for Roblox games.
 * Provides:
 * - Multi-locale string table registration
 * - Namespace support for organized translations
 * - Interpolation with configurable delimiters
 * - Pluralization (zero/one/other forms)
 * - Locale switching with event callbacks
 * - Missing key tracking and fallback behavior
 */

export { LocalizationService } from "./localization-service";
export { createLocalizationService } from "./create-localization-service";
export type {
  LocalizationServiceConfig,
  LocalizationServiceHandle,
  LocaleStrings,
} from "./create-localization-service";

export type {
  LocaleCode,
  LocaleInfo,
  StringTable,
  NamespacedStrings,
  PluralCategory,
  PluralEntry,
  InterpolationParams,
  LocalizationConfig,
  TranslationStatus,
  TranslationResult,
  LocaleChangedEvent,
  LocaleChangedCallback,
  MissingKeyCallback,
} from "./types";

export { DEFAULT_LOCALIZATION_CONFIG, LOCALE_INFO } from "./types";
