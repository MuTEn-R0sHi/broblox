/**
 * Global test setup for the monorepo.
 *
 * All Roblox/roblox-ts runtime polyfills live in `@rbx/testing`'s
 * `mockRobloxGlobals()`.  This file is the sole call-site — do NOT add
 * polyfills here.
 */

import { mockRobloxGlobals } from "@rbx/testing";

mockRobloxGlobals();
