import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MemberActions } from "./member-actions"

export default async function GroupMembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId: string = session.user.id
  const currentMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  })
  if (!currentMember) notFound()

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true, role: true, joinedAt: true },
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
  })

  const userIds = members.map((m) => m.userId)
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : []

  const userMap = new Map(users.map((u) => [u.id, u]))
  const canManage = currentMember.role === "owner" || currentMember.role === "admin"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((m) => {
          const user = userMap.get(m.userId)
          if (!user) return null
          return (
            <div key={m.userId} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{user.name?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-text-primary">{user.name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === "owner" ? "default" : m.role === "admin" ? "secondary" : "outline"}>
                  {m.role}
                </Badge>
                {canManage && m.userId !== userId && (
                  <MemberActions groupId={groupId} targetUserId={m.userId} currentRole={m.role} />
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
