"use client"

import { useRouter } from "next/navigation"
import { updateGoal } from "@/app/actions/scoreboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Scoreboard({
  stats,
  playerMap,
  groupId,
  sessionId,
  isFrozen,
}: {
  stats: { playerId: string; goals: number; teamLabel: string }[]
  playerMap: Map<string, string>
  groupId: string
  sessionId: string
  isFrozen: boolean
}) {
  const router = useRouter()

  const handleGoal = async (playerId: string, action: "add" | "remove") => {
    const result = await updateGoal({ groupId, sessionId, playerId, action })
    if (result.success) router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoreboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {stats.map((s) => (
            <div
              key={s.playerId}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{playerMap.get(s.playerId)?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-text-primary">{playerMap.get(s.playerId) ?? "Unknown"}</p>
                  <p className="text-xs text-text-muted">{s.teamLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="min-w-[2rem] text-center text-xl font-bold text-text-primary">{s.goals}</span>
                {!isFrozen && (
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="outline" onClick={() => handleGoal(s.playerId, "add")}>
                      +
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => handleGoal(s.playerId, "remove")}>
                      &minus;
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
