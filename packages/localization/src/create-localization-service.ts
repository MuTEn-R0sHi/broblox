/**
 * Factory for game-level LocalizationService.
 *
 * Encapsulates i18n string table setup with game-specific translations.
 */

import { Service, createLogger } from "@broblox/core";
import { LocalizationConfig, LocaleCode } from "./types";
import { LocalizationService as I18n } from "./localization-service";

export interface LocaleStrings {
  /** Locale code, e.g. "en", "es". */
  locale: LocaleCode;
  /** Optional namespace/category, e.g. "ui", "gameplay". */
  namespace?: string;
  /** Key-value string entries. */
  entries: Record<string, string>;
}

export interface LocalizationServiceConfig {
  /** String tables to register. */
  strings: LocaleStrings[];
  /** Default locale (defaults to "en"). */
  defaultLocale?: LocaleCode;
  /** Extra LocalizationService options. */
  i18nOptions?: Partial<LocalizationConfig>;
}

export interface LocalizationServiceHandle {
  Service: Service;
  getI18n(): I18n;
}

export function createLocalizationService(
  config: LocalizationServiceConfig
): LocalizationServiceHandle {
  const logger = createLogger("LocalizationService");
  const i18n = new I18n({
    defaultLocale: (config.defaultLocale ?? "en") as LocaleCode,
    ...config.i18nOptions,
  });

  return {
    Service: {
      name: "LocalizationService",

      onInit() {
        for (const entry of config.strings) {
          i18n.registerStrings(entry.locale, entry.entries, entry.namespace);
        }
        logger.info("LocalizationService initialized.");
      },

      onStart() {
        logger.info("LocalizationService started.");
      },
    },

    getI18n() {
      return i18n;
    },
  };
}
