import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId: string = session.user.id
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  })
  if (!member) redirect("/")

  const stats = await prisma.playerStats.findMany({
    where: { groupId },
    orderBy: [{ totalGoals: "desc" }, { totalSessionsPlayed: "desc" }],
    select: { playerId: true, totalGoals: true, totalSessionsPlayed: true },
  })

  const playerIds = stats.map((s) => s.playerId)
  const players = playerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, name: true },
      })
    : []

  const playerMap = new Map(players.map((p) => [p.id, p.name]))

  const maxGoals = stats.length > 0 ? Math.max(...stats.map((s) => s.totalGoals)) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="py-8 text-center text-text-muted">No stats yet. Complete a session to see the leaderboard.</p>
        ) : (
          <div className="space-y-2">
            {stats.map((s, i) => {
              const pct = maxGoals > 0 ? (s.totalGoals / maxGoals) * 100 : 0
              return (
                <div key={s.playerId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="w-6 text-center text-sm font-bold text-text-muted">#{i + 1}</span>
                  <Avatar>
                    <AvatarFallback>{playerMap.get(s.playerId)?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{playerMap.get(s.playerId) ?? "Unknown"}</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary">{s.totalGoals}</p>
                    <p className="text-xs text-text-muted">{s.totalSessionsPlayed} sessions</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
