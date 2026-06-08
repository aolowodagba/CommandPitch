import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateScheduleForm } from "./create-schedule-form"
import { CreateOverrideForm } from "./create-override-form"

export default async function SchedulesPage({
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
  if (!member || (member.role !== "owner" && member.role !== "admin")) notFound()

  const schedules = await prisma.schedule.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, recurrenceRule: true, venue: true, teamSize: true, defaultFee: true, isActive: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Schedules</h2>
        <CreateScheduleForm groupId={groupId} />
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-muted">
            No recurring schedules yet. Create one to auto-generate sessions.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{s.name}</p>
                    <p className="text-sm text-text-muted">{s.venue} &middot; {s.recurrenceRule} &middot; {s.teamSize}v{s.teamSize}</p>
                    {s.defaultFee && <p className="text-sm text-text-muted">Fee: ${s.defaultFee.toFixed(2)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    <CreateOverrideForm groupId={groupId} scheduleId={s.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
