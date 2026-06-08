"use client"

import { useRouter } from "next/navigation"
import { openSession, lockSession, completeSession, issueWaiver } from "@/app/actions/session"
import { generateTeams } from "@/app/actions/team"
import { Button } from "@/components/ui/button"

export function SessionActions({
  groupId,
  sessionId,
  status,
}: {
  groupId: string
  sessionId: string
  status: string
}) {
  const router = useRouter()

  const handleOpen = async () => {
    const result = await openSession(groupId, sessionId)
    if (result.success) router.refresh()
  }

  const handleGenerateTeams = async () => {
    // Get the session's team size - we pass it from the server
    const teamSize = prompt("Team size:", "5")
    if (!teamSize) return
    const size = Number(teamSize)
    if (![5, 6, 7, 11].includes(size)) return alert("Invalid team size. Use 5, 6, 7, or 11.")
    const result = await generateTeams(groupId, sessionId, { teamSize: size })
    if (result.success) router.refresh()
  }

  const handleLock = async () => {
    const result = await lockSession(groupId, sessionId)
    if (result.success) router.refresh()
  }

  const handleComplete = async () => {
    if (!confirm("Complete this session? The scoreboard will be frozen and leaderboard will update.")) return
    const result = await completeSession(groupId, sessionId)
    if (result.success) router.refresh()
  }

  return (
    <div className="flex gap-2">
      {status === "DRAFT" && (
        <Button type="button" size="sm" onClick={handleOpen}>Open Session</Button>
      )}
      {status === "OPEN" && (
        <Button type="button" size="sm" onClick={handleGenerateTeams}>Generate Teams</Button>
      )}
      {(status === "OPEN") && (
        <Button type="button" size="sm" variant="secondary" onClick={handleLock}>Lock</Button>
      )}
      {status === "LOCKED" && (
        <Button type="button" size="sm" onClick={handleComplete}>Complete Session</Button>
      )}
    </div>
  )
}
