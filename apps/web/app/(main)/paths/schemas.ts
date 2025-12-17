import * as z from "zod";
import { EnumLabStatus } from "./enum";

export const labFormSchema = z.object({
  title: z.string().min(1, "Lab title is required"),
  description: z.string().optional(),
  estimatedTime: z.string().optional(),
  difficulty: z.enum(["intro", "intermediate", "advanced"]),
  labType: z.enum(["concept", "practice", "exploration"]).optional(),
  status: z.enum(Object.values(EnumLabStatus) as [EnumLabStatus, ...EnumLabStatus[]])
});

export type LabFormValues = z.infer<typeof labFormSchema>;