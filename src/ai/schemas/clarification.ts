import { z } from "zod";

export const ClarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.boolean(), z.number()]),
  isDefault: z.boolean().optional(),
});

export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  attribute: z.string(),
  question: z.string(),
  options: z.array(ClarificationOptionSchema).min(2),
  context: z.string().optional(),
});

export const ClarificationAnswerSchema = z.object({
  questionId: z.string(),
  selectedOptionId: z.string(),
});

export type ClarificationOption = z.infer<typeof ClarificationOptionSchema>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type ClarificationAnswer = z.infer<typeof ClarificationAnswerSchema>;
