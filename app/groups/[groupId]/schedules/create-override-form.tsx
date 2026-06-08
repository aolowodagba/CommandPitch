"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createOverride } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateOverrideForm({
  groupId,
  scheduleId,
}: {
  groupId: string
  scheduleId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Override
      </Button>
    )
  }

  const handleSubmit = async (formData: FormData) => {
    setPending(true)
    setError(null)
    const result = await createOverride(groupId, scheduleId, {
      date: new Date(formData.get("date") as string).toISOString(),
      venue: (formData.get("venue") as string) || undefined,
      teamSize: formData.get("teamSize") ? Number(formData.get("teamSize")) as 5 | 6 | 7 | 11 : undefined,
      time: formData.get("time") ? new Date(formData.get("time") as string).toISOString() : undefined,
      note: (formData.get("note") as string) || undefined,
    })
    setPending(false)
    if (result.success) {
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form action={handleSubmit} className="rounded-lg border border-border p-3 space-y-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="ov-date" className="text-xs">Date</Label>
          <Input id="ov-date" name="date" type="date" required className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ov-time" className="text-xs">Time (optional)</Label>
          <Input id="ov-time" name="time" type="time" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ov-venue" className="text-xs">Venue (optional)</Label>
          <Input id="ov-venue" name="venue" placeholder="e.g. North Field" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ov-teamSize" className="text-xs">Team Size (optional)</Label>
          <select
            id="ov-teamSize"
            name="teamSize"
            className="flex h-8 rounded-lg border border-input bg-background px-2 py-1 text-xs text-text-primary"
          >
            <option value="">Default</option>
            <option value="5">5v5</option>
            <option value="6">6v6</option>
            <option value="7">7v7</option>
            <option value="11">11v11</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ov-note" className="text-xs">Note (optional)</Label>
        <Input id="ov-note" name="note" placeholder="e.g. Holiday schedule change" className="h-8 text-xs" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Creating..." : "Create Override"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
