import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  try {
    const group = await prisma.group.findUnique({
      where: { inviteCode: code },
      select: { id: true, name: true, description: true, visibility: true, slug: true },
    })

    if (!group) return Response.json({ success: false, error: 'Invalid invite link' }, { status: 404 })

    return Response.json({ success: true, data: group })
  } catch (err) {
    console.error('[GET /api/invite/[code]]', err)
    return Response.json({ success: false, error: 'Something went wrong' }, { status: 500 })
  }
}
