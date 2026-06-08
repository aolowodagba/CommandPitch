'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { generateTeamsSchema, addPlaceholderSchema } from '@/lib/validators/team'
import type { ActionResult } from '@/app/actions/group'

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const TEAM_NAMES = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon']

export async function generateTeams(
  groupId: string,
  sessionId: string,
  input: unknown
): Promise<ActionResult<{ teams: Array<{ id: string; name: string }> }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = generateTeamsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId, groupId },
      select: { status: true, teamSize: true },
    })
    if (!gameSession) return { success: false, error: 'Not found' }
    if (gameSession.status === 'COMPLETED' || gameSession.status === 'LOCKED') {
      return { success: false, error: 'This record cannot be modified' }
    }

    // Get eligible players
    const eligibility = await prisma.paymentEligibility.findMany({
      where: {
        groupId,
        status: { in: ['APPROVED_WEEKLY', 'APPROVED_MONTHLY'] },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      select: { userId: true },
    })

    const playerIds = shuffle(eligibility.map((e) => e.userId))
    const teamSize = parsed.data.teamSize
    const numTeams = Math.ceil(playerIds.length / teamSize)

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing teams for this session
      const existingTeams = await tx.team.findMany({ where: { sessionId, groupId }, select: { id: true } })
      if (existingTeams.length > 0) {
        await tx.teamMember.deleteMany({ where: { teamId: { in: existingTeams.map((t) => t.id) } } })
        await tx.team.deleteMany({ where: { sessionId, groupId } })
      }

      const teams = []
      for (let i = 0; i < numTeams; i++) {
        const teamName = TEAM_NAMES[i] ?? `Team ${i + 1}`
        const team = await tx.team.create({
          data: { sessionId, groupId, name: teamName },
          select: { id: true, name: true },
        })

        const slice = playerIds.slice(i * teamSize, (i + 1) * teamSize)
        for (const playerId of slice) {
          await tx.teamMember.create({
            data: { teamId: team.id, groupId, playerId, isReserved: false },
          })
        }

        // Create or update SessionPlayerStats for each player
        for (const playerId of slice) {
          await tx.sessionPlayerStats.upsert({
            where: { sessionId_playerId: { sessionId, playerId } },
            update: { teamLabel: teamName },
            create: { sessionId, groupId, playerId, teamLabel: teamName, goals: 0 },
          })
        }

        teams.push(team)
      }
      return teams
    })

    return { success: true, data: { teams: result } }
  } catch (err) {
    console.error('[generateTeams]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function addPlaceholder(
  groupId: string,
  sessionId: string,
  teamId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = addPlaceholderSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const result = await prisma.teamMember.create({
      data: {
        teamId,
        groupId,
        placeholder: parsed.data.placeholder,
        purpose: parsed.data.purpose,
        isReserved: false,
      },
      select: { id: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[addPlaceholder]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function addReservedSlot(
  groupId: string,
  teamId: string,
  playerId: string,
  purpose: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    const result = await prisma.teamMember.create({
      data: { teamId, groupId, playerId, isReserved: true, purpose },
      select: { id: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[addReservedSlot]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
