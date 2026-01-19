export type EndpointName = string;

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface EndpointDefinition {
  name: EndpointName;
  rateLimit: RateLimitConfig;
}

export interface NetRegistry {
  endpoints: EndpointDefinition[];
}
