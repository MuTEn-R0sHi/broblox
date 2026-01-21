/**
 * @rbx/net
 * Networking utilities for the platform.
 * Compatible with roblox-ts.
 */
import { type Result } from "@rbx/shared-types";
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
export interface DoActionPayload {
    actionId: string;
    timestamp: number;
}
export interface HandshakePayload {
    protocolVersion: number;
    buildId: string;
    deviceClass: "kbm" | "gamepad" | "touch";
}
export declare function validateDoActionPayload(value: unknown): Result<DoActionPayload>;
export declare function validateHandshakePayload(value: unknown): Result<HandshakePayload>;
export declare class RateLimiter {
    private buckets;
    private config;
    constructor(config: RateLimitConfig);
    check(playerId: number): Result<{
        remaining: number;
    }>;
    reset(playerId: number): void;
}
export declare const REMOTES: {
    readonly Handshake: {
        readonly name: "Net_Handshake";
        readonly rateLimit: {
            readonly windowMs: 60000;
            readonly maxRequests: 3;
        };
    };
    readonly DoAction: {
        readonly name: "Intent_DoAction";
        readonly rateLimit: {
            readonly windowMs: 1000;
            readonly maxRequests: 5;
        };
    };
};
export type RemoteName = keyof typeof REMOTES;
