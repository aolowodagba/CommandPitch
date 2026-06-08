"use client"

import { useActionState, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { submitPayment } from "@/app/actions/payment"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_SIZE_MB = 5

export function SubmitPaymentForm({ groupId }: { groupId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [state, action, pending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const file = fileRef.current?.files?.[0] ?? null

    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or PDF." }
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return { success: false, error: `File too large. Max ${MAX_SIZE_MB}MB.` }
      }
    }

    const result = await submitPayment(groupId, {
      type: formData.get("type") as "WEEKLY" | "MONTHLY",
    })

    if (result.success && file) {
      setUploading(true)
      setUploadError(null)
      try {
        const uploadForm = new FormData()
        uploadForm.set("file", file)
        uploadForm.set("paymentId", result.data.id)
        uploadForm.set("groupId", groupId)

        const res = await fetch("/api/upload-receipt", { method: "POST", body: uploadForm })
        const json = await res.json()
        if (!json.success) {
          setUploadError(json.error ?? "Upload failed")
        }
      } catch {
        setUploadError("Upload failed")
      } finally {
        setUploading(false)
      }
    }

    if (result.success) router.refresh()
    return result
  }, null)

  return (
    <form action={action} className="flex items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="type" className="text-xs">Payment Type</Label>
        <select
          id="type"
          name="type"
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm text-text-primary"
        >
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="receipt" className="text-xs">Receipt (optional)</Label>
        <input
          ref={fileRef}
          id="receipt"
          name="receipt"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="block w-full text-xs text-text-muted file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary"
        />
      </div>
      <Button type="submit" disabled={pending || uploading} size="sm">
        {pending || uploading ? "Submitting..." : "Submit Payment"}
      </Button>
      {state && !state.success && <p className="text-xs text-destructive">{state.error}</p>}
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </form>
  )
}
