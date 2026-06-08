'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { submitPaymentSchema, rejectPaymentSchema } from '@/lib/validators/payment'
import type { ActionResult } from '@/app/actions/group'

export async function submitPayment(
  groupId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  // Verify user is a member
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    select: { role: true },
  })
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = submitPaymentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const result = await prisma.payment.create({
      data: {
        groupId,
        userId: session.user.id,
        type: parsed.data.type,
        status: 'PENDING',
      },
      select: { id: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[submitPayment]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function approvePayment(
  groupId: string,
  paymentId: string
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId, groupId },
        select: { userId: true, type: true, status: true },
      })

      if (payment.status === 'APPROVED') throw new Error('ALREADY_APPROVED')

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      })

      const isMonthly = payment.type === 'MONTHLY'

      await tx.paymentEligibility.upsert({
        where: { groupId_userId_type: { groupId, userId: payment.userId, type: payment.type } },
        update: {
          status: isMonthly ? 'APPROVED_MONTHLY' : 'APPROVED_WEEKLY',
          validFrom: new Date(),
          validUntil: isMonthly ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        },
        create: {
          groupId,
          userId: payment.userId,
          type: payment.type,
          status: isMonthly ? 'APPROVED_MONTHLY' : 'APPROVED_WEEKLY',
          validFrom: new Date(),
          validUntil: isMonthly ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        },
      })
    })

    return { success: true, data: null }
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_APPROVED') {
      return { success: false, error: 'Payment is already approved' }
    }
    console.error('[approvePayment]', err)
    return { success: false, error: 'Something went wrong' }
  }
}

export async function rejectPayment(
  groupId: string,
  paymentId: string,
  input: unknown
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  const parsed = rejectPaymentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId, groupId },
      select: { status: true },
    })
    if (!payment) return { success: false, error: 'Not found' }
    if (payment.status === 'APPROVED') return { success: false, error: 'Cannot reject an approved payment' }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REJECTED' },
    })

    return { success: true, data: null }
  } catch (err) {
    console.error('[rejectPayment]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
