"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { createSession } from "@/app/actions/session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateSessionForm({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await createSession(groupId, {
      date: new Date(formData.get("date") as string).toISOString(),
      teamSize: Number(formData.get("teamSize")),
    })
    if (result.success) {
      router.push(`/groups/${groupId}/sessions/${result.data.id}`)
    }
    return result
  }, null)

  return (
    <form action={action} className="flex items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="date" className="text-xs">Date</Label>
        <Input id="date" name="date" type="date" required className="h-9" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamSize" className="text-xs">Team Size</Label>
        <select
          id="teamSize"
          name="teamSize"
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm text-text-primary"
          defaultValue="5"
        >
          <option value="5">5v5</option>
          <option value="6">6v6</option>
          <option value="7">7v7</option>
          <option value="11">11v11</option>
        </select>
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Creating..." : "Create"}
      </Button>
      {state && !state.success && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  )
}
