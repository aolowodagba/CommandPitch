"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { createGroup } from "@/app/actions/group"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function NewGroupPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await createGroup({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      visibility: formData.get("visibility") as "PUBLIC" | "PRIVATE",
    })
    if (result.success) {
      router.push(`/groups/${result.data.id}`)
    }
    return result
  }, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create Group</CardTitle>
          <CardDescription>Set up a new football group for your community</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input id="name" name="name" placeholder="e.g. Saturday Ballers" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" placeholder="A short description of your group" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                name="visibility"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-text-primary"
                defaultValue="PRIVATE"
              >
                <option value="PRIVATE">Private — invite only</option>
                <option value="PUBLIC">Public — anyone can find</option>
              </select>
            </div>
            {state && !state.success && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating..." : "Create Group"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
