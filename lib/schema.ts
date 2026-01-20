import { z } from "zod";

export const analyzeSchema = z.object({
  digital: z.object({
    E: z.number().min(0).max(100),
    C: z.number().min(0).max(100),
    H: z.number().min(0).max(100),
    O: z.number().min(0).max(100),
  }),
  commentary: z.string().min(1),
});
