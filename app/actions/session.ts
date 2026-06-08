'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createSessionSchema } from '@/lib/validators/session'
import type { ActionResult } from '@/app/actions/group'
import type { GameSessionStatus } from '@prisma/client'

export async function createSession(
  groupId: string,
  input: unknown
): Promise<ActionResult<{ id: string; date: Date; status: GameSessionStatus; teamSize: number }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = createSessionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const result = await prisma.gameSession.create({
      data: {
        groupId,
        date: new Date(parsed.data.date),
        teamSize: parsed.data.teamSize,
        scheduleId: parsed.data.scheduleId ?? null,
      },
      select: { id: true, date: true, status: true, teamSize: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[createSession]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function openSession(
  groupId: string,
  sessionId: string
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    const existing = await prisma.gameSession.findUnique({
      where: { id: sessionId, groupId },
      select: { status: true },
    })
    if (!existing) return { success: false, error: 'Not found' }
    if (existing.status !== 'DRAFT') return { success: false, error: 'Session must be in DRAFT to open' }

    await prisma.gameSession.update({
      where: { id: sessionId, groupId },
      data: { status: 'OPEN' },
    })
    return { success: true, data: null }
  } catch (err) {
    console.error('[openSession]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function lockSession(
  groupId: string,
  sessionId: string
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    const existing = await prisma.gameSession.findUnique({
      where: { id: sessionId, groupId },
      select: { status: true },
    })
    if (!existing) return { success: false, error: 'Not found' }
    if (existing.status !== 'OPEN') return { success: false, error: 'Session must be OPEN to lock' }

    await prisma.gameSession.update({
      where: { id: sessionId, groupId },
      data: { status: 'LOCKED' },
    })
    return { success: true, data: null }
  } catch (err) {
    console.error('[lockSession]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function completeSession(
  groupId: string,
  sessionId: string
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.gameSession.findUniqueOrThrow({
        where: { id: sessionId, groupId },
        select: { status: true },
      })

      if (existing.status === 'COMPLETED') throw new Error('SESSION_IMMUTABLE')

      await tx.gameSession.update({
        where: { id: sessionId, groupId },
        data: { status: 'COMPLETED' },
      })

      const stats = await tx.sessionPlayerStats.findMany({
        where: { sessionId, groupId },
        select: { playerId: true, goals: true },
      })

      for (const stat of stats) {
        await tx.playerStats.upsert({
          where: { groupId_playerId: { groupId, playerId: stat.playerId } },
          update: {
            totalGoals: { increment: stat.goals },
            totalSessionsPlayed: { increment: 1 },
          },
          create: {
            groupId,
            playerId: stat.playerId,
            totalGoals: stat.goals,
            totalSessionsPlayed: 1,
          },
        })
      }
    })

    return { success: true, data: null }
  } catch (err) {
    if (err instanceof Error && err.message === 'SESSION_IMMUTABLE') {
      return { success: false, error: 'This record cannot be modified' }
    }
    console.error('[completeSession]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function issueWaiver(
  groupId: string,
  sessionId: string,
  reason: string,
  action: 'CARRY_FORWARD' | 'WAIVE'
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  if (!reason.trim()) return { success: false, error: 'Waiver reason is required' }

  try {
    const existing = await prisma.gameSession.findUnique({
      where: { id: sessionId, groupId },
      select: { status: true },
    })
    if (!existing) return { success: false, error: 'Not found' }
    if (existing.status === 'COMPLETED' || existing.status === 'LOCKED') {
      return { success: false, error: 'This record cannot be modified' }
    }

    await prisma.gameSession.update({
      where: { id: sessionId, groupId },
      data: { waiverReason: reason },
    })

    return { success: true, data: null }
  } catch (err) {
    console.error('[issueWaiver]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
