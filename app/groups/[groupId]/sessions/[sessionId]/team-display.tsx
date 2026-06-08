import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TeamSlotControls } from "./team-slot-controls"

export function TeamDisplay({
  teams,
  groupId,
  sessionId,
  isAdmin,
  isFrozen,
  eligiblePlayers,
}: {
  teams: {
    id: string
    name: string
    members: {
      id: string
      playerId: string | null
      playerName: string
      placeholder: string | null
      isReserved: boolean
      purpose: string | null
    }[]
  }[]
  groupId: string
  sessionId: string
  isAdmin: boolean
  isFrozen: boolean
  eligiblePlayers: { id: string; name: string | null }[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teams.map((team) => (
        <Card key={team.id}>
          <CardHeader>
            <CardTitle className="text-base">{team.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {team.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{m.playerName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-text-primary">{m.playerName}</span>
                </div>
                {m.isReserved && <Badge variant="warning">Reserved</Badge>}
                {m.purpose && <Badge variant="secondary">{m.purpose}</Badge>}
                {m.placeholder && <Badge variant="outline">{m.placeholder}</Badge>}
              </div>
            ))}
            {isAdmin && !isFrozen && (
              <TeamSlotControls
                groupId={groupId}
                sessionId={sessionId}
                teamId={team.id}
                eligiblePlayers={eligiblePlayers}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
