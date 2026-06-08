import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UpdateGroupForm } from "./update-group-form"
import { InviteCodeSection } from "./invite-code-section"

export default async function GroupSettingsPage({
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
  if (!member || member.role !== "owner") notFound()

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, description: true, visibility: true, inviteCode: true },
  })
  if (!group) notFound()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Group Settings</CardTitle></CardHeader>
        <CardContent>
          <UpdateGroupForm groupId={groupId} defaultValues={{ name: group.name, description: group.description ?? "", visibility: group.visibility }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invite Link</CardTitle></CardHeader>
        <CardContent>
          <InviteCodeSection groupId={groupId} inviteCode={group.inviteCode} />
        </CardContent>
      </Card>
    </div>
  )
}
