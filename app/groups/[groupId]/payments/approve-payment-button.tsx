"use client"

import { useRouter } from "next/navigation"
import { approvePayment, rejectPayment } from "@/app/actions/payment"
import { Button } from "@/components/ui/button"

export function ApprovePaymentButton({ groupId, paymentId }: { groupId: string; paymentId: string }) {
  const router = useRouter()

  const handleApprove = async () => {
    const result = await approvePayment(groupId, paymentId)
    if (result.success) router.refresh()
  }

  const handleReject = async () => {
    if (!confirm("Reject this payment?")) return
    const result = await rejectPayment(groupId, paymentId, { reason: "Rejected by admin" })
    if (result.success) router.refresh()
  }

  return (
    <div className="flex gap-1">
      <Button type="button" size="sm" variant="primary" onClick={handleApprove}>Approve</Button>
      <Button type="button" size="sm" variant="ghost" onClick={handleReject} className="text-destructive">Reject</Button>
    </div>
  )
}
