'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createGroupSchema, updateGroupSchema } from '@/lib/validators/group'

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createGroup(
  input: unknown
): Promise<ActionResult<{ id: string; slug: string; inviteCode: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const parsed = createGroupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const slug = generateSlug(parsed.data.name)
  const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.group.findUnique({ where: { slug }, select: { id: true } })
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug

      const group = await tx.group.create({
        data: {
          name: parsed.data.name,
          slug: finalSlug,
          inviteCode,
          description: parsed.data.description,
          visibility: parsed.data.visibility,
          createdBy: session.user!.id!,
        },
        select: { id: true, slug: true, inviteCode: true },
      })

      await tx.groupMember.create({
        data: { groupId: group.id, userId: session.user!.id!, role: 'owner' },
      })

      return group
    })

    return { success: true, data: result }
  } catch (err) {
    console.error('[createGroup]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function updateGroup(
  groupId: string,
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = updateGroupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const result = await prisma.group.update({
      where: { id: groupId },
      data: parsed.data,
      select: { id: true, name: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[updateGroup]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function regenerateInviteCode(
  groupId: string
): Promise<ActionResult<{ inviteCode: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const newCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()

  try {
    const result = await prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newCode },
      select: { inviteCode: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[regenerateInviteCode]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
