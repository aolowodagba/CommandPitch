import { z } from 'zod'

export const createSessionSchema = z.object({
  scheduleId: z.string().cuid().optional(),
  date: z.string().datetime(),
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]),
})

export const updateSessionSchema = z.object({
  date: z.string().datetime().optional(),
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]).optional(),
  waiverReason: z.string().optional(),
})
