import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { config as appConfig } from '@/lib/config'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB = 5

// Placeholder — replace with actual S3/R2 SDK upload when storage is configured
async function uploadToStorage(file: File): Promise<string> {
  // TODO: Implement S3/R2 upload using appConfig storage credentials
  // For now returns a placeholder — will not work in production without real storage
  return `https://storage.example.com/${crypto.randomUUID()}-${file.name}`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'Unauthorised' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const paymentId = formData.get('paymentId') as string | null
  const groupId = formData.get('groupId') as string | null

  if (!file || !paymentId || !groupId) {
    return Response.json({ success: false, error: 'Invalid input' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ success: false, error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ success: false, error: 'File too large' }, { status: 400 })
  }

  // Verify user owns this payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId, groupId },
    select: { userId: true },
  })
  if (!payment || payment.userId !== session.user.id) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const fileUrl = await uploadToStorage(file)
    const expiresAt = new Date(Date.now() + appConfig.receiptExpiryHours * 60 * 60 * 1000)

    await prisma.paymentReceipt.create({
      data: { paymentId, groupId, fileUrl, fileType: file.type, expiresAt },
    })

    return Response.json({ success: true, data: { expiresAt } })
  } catch (err) {
    console.error('[POST /api/upload-receipt]', err)
    return Response.json({ success: false, error: 'Something went wrong' }, { status: 500 })
  }
}
