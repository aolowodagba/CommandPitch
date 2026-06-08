import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { GroupNav } from "./group-nav"

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode
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
  if (!member) notFound()

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, slug: true, inviteCode: true },
  })
  if (!group) notFound()

  const isAdmin = member.role === "owner" || member.role === "admin"
  const isOwner = member.role === "owner"

  const tabs = [
    { label: "Sessions", href: `/groups/${groupId}`, exact: true },
    ...(isAdmin ? [{ label: "Schedules", href: `/groups/${groupId}/schedules` }] : []),
    { label: "Payments", href: `/groups/${groupId}/payments` },
    { label: "Members", href: `/groups/${groupId}/members` },
    { label: "Leaderboard", href: `/groups/${groupId}/leaderboard` },
    ...(isOwner ? [{ label: "Settings", href: `/groups/${groupId}/settings` }] : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="text-sm text-text-muted hover:text-text-primary">&larr; Dashboard</Link>
          <span className="text-text-muted">/</span>
          <h1 className="text-lg font-bold text-text-primary">{group.name}</h1>
        </div>
        <GroupNav tabs={tabs} />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
