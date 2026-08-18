import { z } from "zod";

export const runtimeEnvironmentSchema = z.enum(["development", "test", "staging", "production"]);

export const responseMetaSchema = z.object({
  correlationId: z.string().min(1).max(128),
});

export const healthResponseSchema = z.object({
  data: z.object({
    status: z.literal("ok"),
    service: z.literal("api"),
    environment: runtimeEnvironmentSchema,
    version: z.string().min(1),
    timestamp: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "timestamp must be an ISO date",
    }),
  }),
  meta: responseMetaSchema,
});

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
  meta: responseMetaSchema,
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
