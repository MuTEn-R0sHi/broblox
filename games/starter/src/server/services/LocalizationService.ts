/**
 * Localization Service — Starter Game
 *
 * Multi-language string management with interpolation and pluralization.
 */

import { createLocalizationService } from "@rbx/localization";

const handle = createLocalizationService({
  strings: [
    {
      locale: "en",
      namespace: "ui",
      entries: {
        welcome_title: "Welcome!",
        welcome_message: "Welcome to Starter Game, {{name}}!",
        coins_display: "Coins: {{amount}}",
        level_display: "Level {{level}}",
        items_count: "{{count}} item|{{count}} items",
        settings_title: "Settings",
        play_button: "Play",
        shop_button: "Shop",
        inventory_button: "Inventory",
      },
    },
    {
      locale: "en",
      namespace: "gameplay",
      entries: {
        kill_message: "{{killer}} eliminated {{victim}}",
        round_start: "Round {{round}} begins!",
        round_end: "Round Over!",
        victory: "Victory!",
        defeat: "Defeat",
        respawn_timer: "Respawning in {{seconds}}s",
      },
    },
    {
      locale: "es",
      namespace: "ui",
      entries: {
        welcome_title: "¡Bienvenido!",
        welcome_message: "¡Bienvenido a Starter Game, {{name}}!",
        coins_display: "Monedas: {{amount}}",
        level_display: "Nivel {{level}}",
        items_count: "{{count}} objeto|{{count}} objetos",
        settings_title: "Configuración",
        play_button: "Jugar",
        shop_button: "Tienda",
        inventory_button: "Inventario",
      },
    },
  ],
  defaultLocale: "en",
});

export const LocalizationService = handle.Service;
export const getI18n = () => handle.getI18n();
