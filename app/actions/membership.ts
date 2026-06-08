'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import type { ActionResult } from '@/app/actions/group'
import type { GroupRole } from '@prisma/client'

export async function joinGroup(
  inviteCode: string
): Promise<ActionResult<{ groupId: string; role: GroupRole }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  try {
    const group = await prisma.group.findUnique({
      where: { inviteCode },
      select: { id: true },
    })
    if (!group) return { success: false, error: 'Invalid invite link' }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: session.user.id! } },
      select: { role: true },
    })

    if (existing) return { success: true, data: { groupId: group.id, role: existing.role } }

    const member = await prisma.groupMember.create({
      data: { groupId: group.id, userId: session.user.id!, role: 'player' },
      select: { groupId: true, role: true },
    })

    return { success: true, data: member }
  } catch (err) {
    console.error('[joinGroup]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function updateMemberRole(
  groupId: string,
  targetUserId: string,
  newRole: 'admin' | 'player'
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner'])
  if (!member) return { success: false, error: 'Forbidden' }

  // Owner cannot demote themselves
  if (targetUserId === session.user.id) return { success: false, error: 'Cannot change your own role' }

  try {
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { role: newRole },
    })
    return { success: true, data: null }
  } catch (err) {
    console.error('[updateMemberRole]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function removeMember(
  groupId: string,
  targetUserId: string
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  // Only owner can remove admins
  if (member.role === 'admin') {
    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      select: { role: true },
    })
    if (target?.role !== 'player') return { success: false, error: 'Forbidden' }
  }

  try {
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    })
    return { success: true, data: null }
  } catch (err) {
    console.error('[removeMember]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
