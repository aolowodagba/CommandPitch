import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
})

export const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
})
