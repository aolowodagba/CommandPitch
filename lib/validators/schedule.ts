import { z } from 'zod'

export const createScheduleSchema = z.object({
  name: z.string().min(2).max(100),
  recurrenceRule: z.string().min(1),
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]),
  venue: z.string().min(2),
  defaultTime: z.string().datetime(),
  defaultFee: z.number().nonnegative().optional(),
})

export const updateScheduleSchema = createScheduleSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const createOverrideSchema = z.object({
  date: z.string().datetime(),
  venue: z.string().optional(),
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]).optional(),
  time: z.string().datetime().optional(),
  note: z.string().optional(),
})
