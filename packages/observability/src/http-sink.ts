/**
 * HTTP Sink
 *
 * Batches telemetry events and metrics, then sends them to the
 * dashboard API via Roblox HttpService.
 */

import { TelemetryEvent, TelemetrySink, MetricPoint, MetricSink } from "./types";
import { rbxSize } from "./runtime";

declare const game: {
  GetService(name: "HttpService"): {
    JSONEncode(value: unknown): string;
    PostAsync(url: string, body: string, contentType?: string, compress?: boolean): string;
    RequestAsync(options: {
      Url: string;
      Method: string;
      Headers?: Record<string, string>;
      Body?: string;
    }): { Success: boolean; StatusCode: number; Body: string };
  };
};

export interface HttpSinkConfig {
  /** Base URL of the dashboard API (e.g. "https://dashboard.example.com"). */
  baseUrl: string;
  /** API key for the `x-api-key` header. */
  apiKey: string;
  /** Max events per batch (default 50, API limit 100). */
  maxBatchSize?: number;
  /** Flush interval in seconds (default 10). */
  flushIntervalSec?: number;
}

// ============================================================================
// Telemetry HTTP Sink
// ============================================================================

export class HttpTelemetrySink implements TelemetrySink {
  private buffer: TelemetryEvent[] = [];
  private flushThread?: thread;
  private readonly maxBatchSize: number;
  private readonly flushIntervalSec: number;
  private readonly url: string;
  private readonly apiKey: string;

  constructor(config: HttpSinkConfig) {
    this.url = `${config.baseUrl}/api/telemetry`;
    this.apiKey = config.apiKey;
    this.maxBatchSize = config.maxBatchSize ?? 50;
    this.flushIntervalSec = config.flushIntervalSec ?? 10;
    this.startAutoFlush();
  }

  emit(event: TelemetryEvent): void {
    this.buffer.push(event);
    if (rbxSize(this.buffer) >= this.maxBatchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (rbxSize(this.buffer) === 0) return;

    const events = this.buffer;
    this.buffer = [];

    const HttpService = game.GetService("HttpService");
    const body = HttpService.JSONEncode({ events });

    const [success, result] = pcall(() =>
      HttpService.RequestAsync({
        Url: this.url,
        Method: "POST",
        Headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        Body: body,
      })
    );

    if (!success) {
      warn(`[HttpTelemetrySink] Failed to send telemetry: ${result}`);
    } else if (!result.Success) {
      warn(`[HttpTelemetrySink] API returned ${result.StatusCode}: ${result.Body}`);
    }
  }

  stop(): void {
    if (this.flushThread) {
      task.cancel(this.flushThread);
      this.flushThread = undefined;
    }
    this.flush();
  }

  private startAutoFlush(): void {
    this.flushThread = task.spawn(() => {
      while (this.flushThread !== undefined) {
        task.wait(this.flushIntervalSec);
        this.flush();
      }
    });
  }
}

// ============================================================================
// Metric HTTP Sink
// ============================================================================

export class HttpMetricSink implements MetricSink {
  private buffer: MetricPoint[] = [];
  private flushThread?: thread;
  private readonly maxBatchSize: number;
  private readonly flushIntervalSec: number;
  private readonly url: string;
  private readonly apiKey: string;

  constructor(config: HttpSinkConfig) {
    this.url = `${config.baseUrl}/api/metrics`;
    this.apiKey = config.apiKey;
    this.maxBatchSize = config.maxBatchSize ?? 100;
    this.flushIntervalSec = config.flushIntervalSec ?? 10;
    this.startAutoFlush();
  }

  record(point: MetricPoint): void {
    this.buffer.push(point);
    if (rbxSize(this.buffer) >= this.maxBatchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (rbxSize(this.buffer) === 0) return;

    const metrics = this.buffer;
    this.buffer = [];

    const HttpService = game.GetService("HttpService");
    const body = HttpService.JSONEncode({ metrics });

    const [success, result] = pcall(() =>
      HttpService.RequestAsync({
        Url: this.url,
        Method: "POST",
        Headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        Body: body,
      })
    );

    if (!success) {
      warn(`[HttpMetricSink] Failed to send metrics: ${result}`);
    } else if (!result.Success) {
      warn(`[HttpMetricSink] API returned ${result.StatusCode}: ${result.Body}`);
    }
  }

  stop(): void {
    if (this.flushThread) {
      task.cancel(this.flushThread);
      this.flushThread = undefined;
    }
    this.flush();
  }

  private startAutoFlush(): void {
    this.flushThread = task.spawn(() => {
      while (this.flushThread !== undefined) {
        task.wait(this.flushIntervalSec);
        this.flush();
      }
    });
  }
}
