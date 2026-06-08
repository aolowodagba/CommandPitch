import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { visibility: true },
  })

  if (!group) return Response.json({ success: false, error: 'Not found' }, { status: 404 })

  if (group.visibility === 'PRIVATE') {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ success: false, error: 'Unauthorised' }, { status: 401 })
    }
    // Verify group membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id! } },
      select: { role: true },
    })
    if (!member) return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const leaderboard = await prisma.playerStats.findMany({
      where: { groupId },
      orderBy: { totalGoals: 'desc' },
      select: {
        playerId: true,
        totalGoals: true,
        totalSessionsPlayed: true,
      },
    })
    return Response.json({ success: true, data: leaderboard })
  } catch (err) {
    console.error('[GET /api/groups/[groupId]/leaderboard]', err)
    return Response.json({ success: false, error: 'Something went wrong' }, { status: 500 })
  }
}
