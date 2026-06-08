import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { signOut } from "@/lib/auth"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    select: { role: true, groupId: true },
    orderBy: { joinedAt: "desc" },
  })

  const groups = memberships.length > 0
    ? await prisma.group.findMany({
        where: { id: { in: memberships.map((m) => m.groupId) } },
        select: { id: true, name: true, slug: true, description: true },
      })
    : []

  const groupMap = new Map(groups.map((g) => [g.id, g]))
  const combined = memberships.map((m) => ({
    role: m.role,
    group: groupMap.get(m.groupId)!,
  }))

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-text-primary">CommandPitch</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{session.user.email}</span>
            <form
              action={async () => {
                "use server"
                await signOut()
              }}
            >
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">My Groups</h2>
            <p className="text-text-secondary">{combined.length} group{combined.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href="/groups/new">
            <Button>Create Group</Button>
          </Link>
        </div>

        {combined.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <p className="text-text-muted">You haven&apos;t joined any groups yet.</p>
              <Link href="/groups/new">
                <Button>Create your first group</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {combined.map((m) => (
              <Link key={m.group.id} href={`/groups/${m.group.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{m.group.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{m.group.name}</CardTitle>
                          {m.group.description && (
                            <CardDescription className="line-clamp-1">{m.group.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
