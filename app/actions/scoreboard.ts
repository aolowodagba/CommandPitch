'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import type { ActionResult } from '@/app/actions/group'

export async function updateGoal(input: {
  groupId: string
  sessionId: string
  playerId: string
  action: 'add' | 'remove'
}): Promise<ActionResult<{ goals: number }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const { groupId, sessionId, playerId, action } = input

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId, groupId },
      select: { status: true },
    })
    if (!gameSession) return { success: false, error: 'Not found' }
    if (gameSession.status === 'LOCKED' || gameSession.status === 'COMPLETED') {
      return { success: false, error: 'This record cannot be modified' }
    }

    const existing = await prisma.sessionPlayerStats.findUnique({
      where: { sessionId_playerId: { sessionId, playerId } },
      select: { goals: true },
    })

    const currentGoals = existing?.goals ?? 0
    const newGoals = action === 'add' ? currentGoals + 1 : Math.max(0, currentGoals - 1)

    const updated = await prisma.sessionPlayerStats.update({
      where: { sessionId_playerId: { sessionId, playerId } },
      data: { goals: newGoals },
      select: { goals: true },
    })

    return { success: true, data: { goals: updated.goals } }
  } catch (err) {
    console.error('[updateGoal]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
