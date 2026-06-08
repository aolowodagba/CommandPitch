import { z } from 'zod'

export const generateTeamsSchema = z.object({
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]),
})

export const addPlaceholderSchema = z.object({
  placeholder: z.string().min(1).max(20),
  purpose: z.string().optional(),
})
