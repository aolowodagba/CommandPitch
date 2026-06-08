import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubmitPaymentForm } from "./submit-payment-form"
import { ApprovePaymentButton } from "./approve-payment-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default async function PaymentsPage({
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

  const payments = await prisma.payment.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, type: true, status: true, createdAt: true },
  })

  const userIds = [...new Set(payments.map((p) => p.userId))]
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u.name]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Payments</h2>
        <SubmitPaymentForm groupId={groupId} />
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-muted">
            No payment records yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{userMap.get(p.userId)?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{userMap.get(p.userId) ?? "Unknown"}</p>
                    <p className="text-xs text-text-muted">{p.type} &middot; {p.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "APPROVED" ? "success" : p.status === "REJECTED" ? "destructive" : "warning"}>
                    {p.status}
                  </Badge>
                  {isAdmin && p.status === "PENDING" && (
                    <ApprovePaymentButton groupId={groupId} paymentId={p.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
