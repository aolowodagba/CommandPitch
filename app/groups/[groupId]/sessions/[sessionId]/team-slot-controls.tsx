"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addPlaceholder, addReservedSlot } from "@/app/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TeamSlotControls({
  groupId,
  sessionId,
  teamId,
  eligiblePlayers,
}: {
  groupId: string
  sessionId: string
  teamId: string
  eligiblePlayers: { id: string; name: string | null }[]
}) {
  const router = useRouter()
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const [showReserved, setShowReserved] = useState(false)
  const [pending, setPending] = useState(false)

  const handleAddPlaceholder = async (formData: FormData) => {
    setPending(true)
    const result = await addPlaceholder(groupId, sessionId, teamId, {
      placeholder: formData.get("placeholder") as string,
      purpose: (formData.get("purpose") as string) || undefined,
    })
    setPending(false)
    if (result.success) {
      setShowPlaceholder(false)
      router.refresh()
    }
  }

  const handleAddReserved = async (formData: FormData) => {
    setPending(true)
    const result = await addReservedSlot(
      groupId,
      teamId,
      formData.get("playerId") as string,
      (formData.get("purpose") as string) || "Reserved",
    )
    setPending(false)
    if (result.success) {
      setShowReserved(false)
      router.refresh()
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowPlaceholder(!showPlaceholder)}>
          + Placeholder
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowReserved(!showReserved)}>
          + Reserved
        </Button>
      </div>

      {showPlaceholder && (
        <form action={handleAddPlaceholder} className="flex items-center gap-2">
          <Input
            name="placeholder"
            placeholder="e.g. X1"
            required
            className="h-8 w-20 text-xs"
          />
          <Input
            name="purpose"
            placeholder="Purpose (optional)"
            className="h-8 w-32 text-xs"
          />
          <Button type="submit" disabled={pending} size="sm" variant="outline">
            Add
          </Button>
        </form>
      )}

      {showReserved && (
        <form action={handleAddReserved} className="flex items-center gap-2">
          <select
            name="playerId"
            className="flex h-8 rounded-lg border border-input bg-background px-2 py-1 text-xs text-text-primary"
            required
          >
            <option value="">Select player...</option>
            {eligiblePlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.name ?? "Unknown"}</option>
            ))}
          </select>
          <Input
            name="purpose"
            placeholder="e.g. Goalkeeper"
            className="h-8 w-28 text-xs"
          />
          <Button type="submit" disabled={pending} size="sm" variant="outline">
            Add
          </Button>
        </form>
      )}
    </div>
  )
}
