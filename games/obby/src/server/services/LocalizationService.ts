/**
 * Localization Service — Obby Game
 *
 * Multi-language string management for the obstacle course game.
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
    i18n.registerStrings(
      "en",
      "ui",
      new Map<string, string>([
        ["welcome_title", "Welcome!"],
        ["welcome_message", "Welcome to the Obby, {{name}}!"],
        ["stage_display", "Stage {{stage}} / {{total}}"],
        ["checkpoint_reached", "Checkpoint Reached!"],
        ["best_time", "Best Time: {{time}}s"],
        ["play_button", "Play"],
        ["shop_button", "Shop"],
        ["leaderboard_button", "Leaderboard"],
      ])
    );

    i18n.registerStrings(
      "en",
      "gameplay",
      new Map<string, string>([
        ["stage_complete", "Stage {{stage}} Complete!"],
        ["new_record", "New Record! {{time}}s"],
        ["fall_message", "You fell! Try again."],
        ["course_complete", "Course Complete! Time: {{time}}s"],
      ])
    );

    i18n.registerStrings(
      "es",
      "ui",
      new Map<string, string>([
        ["welcome_title", "¡Bienvenido!"],
        ["welcome_message", "¡Bienvenido al Obby, {{name}}!"],
        ["stage_display", "Etapa {{stage}} / {{total}}"],
        ["checkpoint_reached", "¡Punto de control alcanzado!"],
        ["best_time", "Mejor tiempo: {{time}}s"],
        ["play_button", "Jugar"],
        ["shop_button", "Tienda"],
        ["leaderboard_button", "Clasificación"],
      ])
    );

    logger.info("Localization initialized with en, es");
  },

  onStart() {
    logger.info("LocalizationService started");
  },
};
