"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { createSchedule } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateScheduleForm({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await createSchedule(groupId, {
      name: formData.get("name") as string,
      recurrenceRule: formData.get("recurrenceRule") as string,
      teamSize: Number(formData.get("teamSize")),
      venue: formData.get("venue") as string,
      defaultTime: new Date(formData.get("defaultTime") as string).toISOString(),
      defaultFee: formData.get("defaultFee") ? Number(formData.get("defaultFee")) : undefined,
    })
    if (result.success) router.refresh()
    return result
  }, null)

  return (
    <form action={action} className="rounded-lg border border-border p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Name</Label>
          <Input id="name" name="name" placeholder="e.g. Saturday Morning" required className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="recurrenceRule" className="text-xs">Recurrence</Label>
          <Input id="recurrenceRule" name="recurrenceRule" placeholder="e.g. WEEKLY on SAT" required className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="venue" className="text-xs">Venue</Label>
          <Input id="venue" name="venue" placeholder="e.g. Central Park" required className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultTime" className="text-xs">Default Time</Label>
          <Input id="defaultTime" name="defaultTime" type="datetime-local" required className="h-9" />
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
        <div className="space-y-1">
          <Label htmlFor="defaultFee" className="text-xs">Fee (optional)</Label>
          <Input id="defaultFee" name="defaultFee" type="number" step="0.01" min="0" className="h-9" />
        </div>
      </div>
      {state && !state.success && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Creating..." : "Create Schedule"}
      </Button>
    </form>
  )
}
