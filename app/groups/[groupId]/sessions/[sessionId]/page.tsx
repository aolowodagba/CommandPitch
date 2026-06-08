import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SessionActions } from "./session-actions"
import { SessionWaiver } from "./session-waiver"
import { Scoreboard } from "./scoreboard"
import { TeamDisplay } from "./team-display"
import { SubmitPaymentForm } from "../../payments/submit-payment-form"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>
}) {
  const { groupId, sessionId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId: string = session.user.id
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  })
  if (!member) redirect("/")

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: sessionId, groupId },
    select: { id: true, date: true, status: true, teamSize: true, waiverReason: true },
  })
  if (!gameSession) notFound()

  const isAdmin = member.role === "owner" || member.role === "admin"
  const isFrozen = gameSession.status === "LOCKED" || gameSession.status === "COMPLETED"

  const teams = await prisma.team.findMany({
    where: { sessionId, groupId },
    select: { id: true, name: true },
  })

  const teamIds = teams.map((t) => t.id)
  const teamMembers = teamIds.length > 0
    ? await prisma.teamMember.findMany({
        where: { teamId: { in: teamIds } },
        select: { id: true, teamId: true, playerId: true, placeholder: true, isReserved: true, purpose: true },
      })
    : []

  const playerIds = [...new Set(teamMembers.filter((tm) => tm.playerId).map((tm) => tm.playerId!))]
  const players = playerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, name: true },
      })
    : []
  const playerMap = new Map(players.map((p) => [p.id, p.name ?? 'Unknown']))

  const eligiblePlayers = await prisma.paymentEligibility.findMany({
    where: {
      groupId,
      status: { in: ["APPROVED_WEEKLY", "APPROVED_MONTHLY"] },
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    },
    select: { userId: true },
  })
  const eligiblePlayerIds = eligiblePlayers.map((e) => e.userId)
  const eligiblePlayerData = eligiblePlayerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: eligiblePlayerIds } },
        select: { id: true, name: true },
      })
    : []

  const stats = await prisma.sessionPlayerStats.findMany({
    where: { sessionId, groupId },
    select: { playerId: true, goals: true, teamLabel: true },
    orderBy: { goals: "desc" },
  })

  const teamData = teams.map((t) => ({
    ...t,
    members: teamMembers
      .filter((tm) => tm.teamId === t.id)
      .map((tm) => ({
        ...tm,
        playerName: tm.playerId ? playerMap.get(tm.playerId) ?? "Unknown" : tm.placeholder ?? "Open",
      })),
  }))

  const statusColor: Record<string, "default" | "secondary" | "success" | "warning"> = {
    DRAFT: "secondary",
    OPEN: "success",
    LOCKED: "warning",
    COMPLETED: "default",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {gameSession.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <p className="text-sm text-text-muted">{gameSession.teamSize}v{gameSession.teamSize}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColor[gameSession.status] ?? "secondary"}>{gameSession.status}</Badge>
          {isAdmin && !isFrozen && (
            <SessionActions groupId={groupId} sessionId={sessionId} status={gameSession.status} />
          )}
        </div>
      </div>

      {isAdmin && (
        <SessionWaiver
          groupId={groupId}
          sessionId={sessionId}
          waiverReason={gameSession.waiverReason}
          isFrozen={isFrozen}
        />
      )}

      {stats.length > 0 && (
        <>
          <Scoreboard stats={stats} playerMap={playerMap} groupId={groupId} sessionId={sessionId} isFrozen={isFrozen} />
          <Separator />
          <TeamDisplay
            teams={teamData}
            groupId={groupId}
            sessionId={sessionId}
            isAdmin={isAdmin}
            isFrozen={isFrozen}
            eligiblePlayers={eligiblePlayerData}
          />
        </>
      )}

      {gameSession.status === "OPEN" && stats.length === 0 && isAdmin && (
        <Card>
          <CardContent className="py-8 text-center text-text-muted">
            <p>No teams generated yet. Eligible players must submit payments first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
