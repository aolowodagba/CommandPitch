'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createScheduleSchema, updateScheduleSchema, createOverrideSchema } from '@/lib/validators/schedule'
import type { ActionResult } from '@/app/actions/group'

export async function createSchedule(
  groupId: string,
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = createScheduleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const result = await prisma.schedule.create({
      data: {
        groupId,
        name: parsed.data.name,
        recurrenceRule: parsed.data.recurrenceRule,
        teamSize: parsed.data.teamSize,
        venue: parsed.data.venue,
        defaultTime: new Date(parsed.data.defaultTime),
        defaultFee: parsed.data.defaultFee,
        createdBy: member.userId,
      },
      select: { id: true, name: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[createSchedule]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function updateSchedule(
  groupId: string,
  scheduleId: string,
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = updateScheduleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const result = await prisma.schedule.update({
      where: { id: scheduleId, groupId },
      data: {
        ...parsed.data,
        defaultTime: parsed.data.defaultTime ? new Date(parsed.data.defaultTime) : undefined,
      },
      select: { id: true, name: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[updateSchedule]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function createOverride(
  groupId: string,
  scheduleId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = createOverrideSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    // Verify schedule exists and is active
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, groupId, isActive: true },
      select: { id: true },
    })
    if (!schedule) return { success: false, error: 'Schedule not found or inactive' }

    const result = await prisma.scheduleOverride.create({
      data: {
        scheduleId,
        groupId,
        date: new Date(parsed.data.date),
        venue: parsed.data.venue,
        teamSize: parsed.data.teamSize,
        time: parsed.data.time ? new Date(parsed.data.time) : undefined,
        note: parsed.data.note,
      },
      select: { id: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[createOverride]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
