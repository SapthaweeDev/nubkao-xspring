import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const entries = await prisma.stepEntry.findMany({ orderBy: { date: 'asc' } });
    return NextResponse.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch entries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Create or update an entry (upsert)
export async function POST(req: NextRequest) {
  try {
    const { memberId, date, steps, proofDriveFileId, proofDriveUrl, hasLocalProof } = await req.json();

    if (!memberId || !date || steps === undefined) {
      return NextResponse.json({ error: 'Missing required fields: memberId, date, steps' }, { status: 400 });
    }

    const entry = await prisma.stepEntry.upsert({
      where: { memberId_date: { memberId, date } },
      update: {
        steps,
        ...(proofDriveFileId !== undefined && { proofDriveFileId }),
        ...(proofDriveUrl !== undefined && { proofDriveUrl }),
        ...(hasLocalProof !== undefined && { hasLocalProof }),
      },
      create: {
        memberId,
        date,
        steps,
        proofDriveFileId: proofDriveFileId ?? null,
        proofDriveUrl: proofDriveUrl ?? null,
        hasLocalProof: hasLocalProof ?? false,
      },
    });

    return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Update proof fields only (no steps change)
export async function PATCH(req: NextRequest) {
  try {
    const { memberId, date, proofDriveFileId, proofDriveUrl, hasLocalProof } = await req.json();

    if (!memberId || !date) {
      return NextResponse.json({ error: 'Missing required fields: memberId, date' }, { status: 400 });
    }

    const entry = await prisma.stepEntry.update({
      where: { memberId_date: { memberId, date } },
      data: {
        ...(proofDriveFileId !== undefined && { proofDriveFileId }),
        ...(proofDriveUrl !== undefined && { proofDriveUrl }),
        ...(hasLocalProof !== undefined && { hasLocalProof }),
      },
    });

    return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update entry proof';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete an entry
export async function DELETE(req: NextRequest) {
  try {
    const { memberId, date } = await req.json();

    if (!memberId || !date) {
      return NextResponse.json({ error: 'Missing memberId or date' }, { status: 400 });
    }

    await prisma.stepEntry.deleteMany({ where: { memberId, date } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
