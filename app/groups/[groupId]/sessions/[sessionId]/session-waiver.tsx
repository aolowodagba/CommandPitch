"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { issueWaiver } from "@/app/actions/session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SessionWaiver({
  groupId,
  sessionId,
  waiverReason,
  isFrozen,
}: {
  groupId: string
  sessionId: string
  waiverReason: string | null
  isFrozen: boolean
}) {
  const router = useRouter()
  const [reason, setReason] = useState(waiverReason ?? "")
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: "CARRY_FORWARD" | "WAIVE") => {
    if (!reason.trim()) return
    setLoading(true)
    const result = await issueWaiver(groupId, sessionId, reason, action)
    if (result.success) router.refresh()
    setLoading(false)
  }

  if (isFrozen && !waiverReason) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Session Waiver</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {waiverReason && (
          <p className="text-sm text-text-muted">Current waiver: {waiverReason}</p>
        )}
        {!isFrozen && (
          <>
            <Input
              placeholder="Waiver reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || !reason.trim()}
                onClick={() => handleAction("CARRY_FORWARD")}
              >
                Carry Forward
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || !reason.trim()}
                onClick={() => handleAction("WAIVE")}
              >
                Waive
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
