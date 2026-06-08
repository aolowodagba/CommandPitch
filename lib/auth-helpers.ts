import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { GroupRole } from '@prisma/client'

export async function requireGroupRole(
  groupId: string,
  allowedRoles: GroupRole[]
): Promise<{ userId: string; role: GroupRole } | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, role: { in: allowedRoles } },
    select: { role: true },
  })

  if (!member) return null
  return { userId: session.user.id, role: member.role }
}
