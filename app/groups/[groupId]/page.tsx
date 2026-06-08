import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CreateSessionForm } from "./create-session-form"

const statusColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
  DRAFT: "secondary",
  OPEN: "success",
  LOCKED: "warning",
  COMPLETED: "default",
}

export default async function GroupSessionsPage({
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

  const isAdmin = member.role === "owner" || member.role === "admin"

  const sessions = await prisma.gameSession.findMany({
    where: { groupId },
    orderBy: { date: "desc" },
    select: { id: true, date: true, status: true, teamSize: true },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Sessions</h2>
        {isAdmin && <CreateSessionForm groupId={groupId} />}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-muted">
            No sessions yet. {isAdmin ? "Create one to get started." : "Wait for an admin to create one."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/groups/${groupId}/sessions/${s.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-text-primary">
                      {s.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-sm text-text-muted">Team size: {s.teamSize}</p>
                  </div>
                  <Badge variant={statusColors[s.status] ?? "secondary"}>{s.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
