"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { updateGroup } from "@/app/actions/group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function UpdateGroupForm({
  groupId,
  defaultValues,
}: {
  groupId: string
  defaultValues: { name: string; description: string; visibility: "PUBLIC" | "PRIVATE" }
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await updateGroup(groupId, {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      visibility: formData.get("visibility") as "PUBLIC" | "PRIVATE",
    })
    if (result.success) router.refresh()
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Group Name</Label>
        <Input id="name" name="name" defaultValue={defaultValues.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={defaultValues.description} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          name="visibility"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-text-primary"
          defaultValue={defaultValues.visibility}
        >
          <option value="PRIVATE">Private</option>
          <option value="PUBLIC">Public</option>
        </select>
      </div>
      {state && !state.success && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
