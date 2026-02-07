/**
 * Localization Service — Obby Game
 *
 * Multi-language string management for the obstacle course game.
 */

import { createLocalizationService } from "@rbx/localization";

const handle = createLocalizationService({
  strings: [
    {
      locale: "en",
      namespace: "ui",
      entries: {
        welcome_title: "Welcome!",
        welcome_message: "Welcome to the Obby, {{name}}!",
        stage_display: "Stage {{stage}} / {{total}}",
        checkpoint_reached: "Checkpoint Reached!",
        best_time: "Best Time: {{time}}s",
        play_button: "Play",
        shop_button: "Shop",
        leaderboard_button: "Leaderboard",
      },
    },
    {
      locale: "en",
      namespace: "gameplay",
      entries: {
        stage_complete: "Stage {{stage}} Complete!",
        new_record: "New Record! {{time}}s",
        fall_message: "You fell! Try again.",
        course_complete: "Course Complete! Time: {{time}}s",
      },
    },
    {
      locale: "es",
      namespace: "ui",
      entries: {
        welcome_title: "¡Bienvenido!",
        welcome_message: "¡Bienvenido al Obby, {{name}}!",
        stage_display: "Etapa {{stage}} / {{total}}",
        checkpoint_reached: "¡Punto de control alcanzado!",
        best_time: "Mejor tiempo: {{time}}s",
        play_button: "Jugar",
        shop_button: "Tienda",
        leaderboard_button: "Clasificación",
      },
    },
  ],
});

export const LocalizationService = handle.Service;
export const getI18n = () => handle.getI18n();
