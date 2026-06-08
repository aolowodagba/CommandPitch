import { auth, signIn } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { joinGroup } from "@/app/actions/membership"

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const session = await auth()

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, description: true, slug: true },
  })
  if (!group) notFound()

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{group.name}</CardTitle>
            {group.description && <CardDescription>{group.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-muted">Sign in to join this group.</p>
            <form
              action={async () => {
                "use server"
                await signIn("google", { redirectTo: `/join/${code}` })
              }}
            >
              <Button type="submit" className="w-full">Sign in with Google</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const result = await joinGroup(code)

  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{group.name}</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  redirect(`/groups/${result.data.groupId}`)
}
