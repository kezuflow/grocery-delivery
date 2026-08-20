import { z } from "zod";
import { responseMetaSchema } from "./system";

export const supportCaseSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const supportCaseCreateRequestSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(1).max(4_000),
});

export const supportCaseStatusRequestSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

export const supportCasesResponseSchema = z.object({
  data: z.object({ cases: z.array(supportCaseSchema) }),
  meta: responseMetaSchema,
});

export const supportCaseResponseSchema = z.object({
  data: supportCaseSchema,
  meta: responseMetaSchema,
});

export type SupportCasesResponse = z.infer<typeof supportCasesResponseSchema>;
export type SupportCaseResponse = z.infer<typeof supportCaseResponseSchema>;
