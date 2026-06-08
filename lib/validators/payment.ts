import { z } from 'zod'

export const submitPaymentSchema = z.object({
  type: z.enum(['WEEKLY', 'MONTHLY']),
})

export const rejectPaymentSchema = z.object({
  reason: z.string().min(1).max(500),
})
