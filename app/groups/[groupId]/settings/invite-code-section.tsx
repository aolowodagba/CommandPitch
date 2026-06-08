"use client"

import { useState } from "react"
import { regenerateInviteCode } from "@/app/actions/group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InviteCodeSection({ groupId, inviteCode: initialCode }: { groupId: string; inviteCode: string }) {
  const [code, setCode] = useState(initialCode)
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${code}`

  const handleRegenerate = async () => {
    const result = await regenerateInviteCode(groupId)
    if (result.success) setCode(result.data.inviteCode)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={inviteUrl} readOnly className="flex-1 text-sm" />
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={handleRegenerate}>
        Regenerate Code
      </Button>
    </div>
  )
}
