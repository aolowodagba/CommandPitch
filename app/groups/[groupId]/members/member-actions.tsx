"use client"

import { useRouter } from "next/navigation"
import { updateMemberRole, removeMember } from "@/app/actions/membership"
import { Button } from "@/components/ui/button"

export function MemberActions({
  groupId,
  targetUserId,
  currentRole,
}: {
  groupId: string
  targetUserId: string
  currentRole: string
}) {
  const router = useRouter()

  const handleToggleRole = async () => {
    const newRole = currentRole === "admin" ? "player" : "admin"
    const result = await updateMemberRole(groupId, targetUserId, newRole)
    if (result.success) router.refresh()
  }

  const handleRemove = async () => {
    if (!confirm("Remove this member from the group?")) return
    const result = await removeMember(groupId, targetUserId)
    if (result.success) router.refresh()
  }

  return (
    <div className="flex gap-1">
      {currentRole !== "owner" && (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={handleToggleRole}>
            {currentRole === "admin" ? "Demote" : "Promote"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="text-destructive">
            Remove
          </Button>
        </>
      )}
    </div>
  )
}
