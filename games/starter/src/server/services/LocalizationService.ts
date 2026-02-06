/**
 * Localization Service — Starter Game
 *
 * Multi-language string management with interpolation and pluralization.
 */

import { Service, createLogger } from "@rbx/core";
import { LocalizationService as I18nService } from "@rbx/localization";

const logger = createLogger("LocalizationService");

const i18n = new I18nService();

export function getI18n(): I18nService {
  return i18n;
}

export const LocalizationService: Service = {
  onInit() {
    // Register default English strings
    i18n.registerStrings(
      "en",
      "ui",
      new Map<string, string>([
        ["welcome_title", "Welcome!"],
        ["welcome_message", "Welcome to Starter Game, {{name}}!"],
        ["coins_display", "Coins: {{amount}}"],
        ["level_display", "Level {{level}}"],
        ["items_count", "{{count}} item|{{count}} items"],
        ["settings_title", "Settings"],
        ["play_button", "Play"],
        ["shop_button", "Shop"],
        ["inventory_button", "Inventory"],
      ])
    );

    i18n.registerStrings(
      "en",
      "gameplay",
      new Map<string, string>([
        ["kill_message", "{{killer}} eliminated {{victim}}"],
        ["round_start", "Round {{round}} begins!"],
        ["round_end", "Round Over!"],
        ["victory", "Victory!"],
        ["defeat", "Defeat"],
        ["respawn_timer", "Respawning in {{seconds}}s"],
      ])
    );

    // Register Spanish strings
    i18n.registerStrings(
      "es",
      "ui",
      new Map<string, string>([
        ["welcome_title", "¡Bienvenido!"],
        ["welcome_message", "¡Bienvenido a Starter Game, {{name}}!"],
        ["coins_display", "Monedas: {{amount}}"],
        ["level_display", "Nivel {{level}}"],
        ["items_count", "{{count}} objeto|{{count}} objetos"],
        ["settings_title", "Configuración"],
        ["play_button", "Jugar"],
        ["shop_button", "Tienda"],
        ["inventory_button", "Inventario"],
      ])
    );

    logger.info("Localization initialized with en, es");
  },

  onStart() {
    logger.info("LocalizationService started");
  },
};
