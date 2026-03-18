import { prisma } from '../lib/db.js';

export async function getSplits(userId: string, status?: string) {
  return prisma.splitGroup.findMany({
    where: { userId, ...(status && { status }) },
    include: { participants: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSplitById(userId: string, splitId: string) {
  const split = await prisma.splitGroup.findFirst({
    where: { id: splitId, userId },
    include: { participants: true },
  });
  if (!split) throw new Error('Split not found');
  return split;
}

export async function createSplit(
  userId: string,
  data: {
    title: string;
    totalAmount: number;
    transactionId?: string;
    splitType: 'equal' | 'custom';
    participants: { email: string; name: string; amount?: number }[];
  }
) {
  const participantData = data.participants.map((p) => {
    const amount =
      data.splitType === 'equal'
        ? Math.round((data.totalAmount / (data.participants.length + 1)) * 100) / 100
        : p.amount || 0;
    return { email: p.email, name: p.name, amount };
  });

  const [group] = await prisma.$transaction(async (tx) => {
    const group = await tx.splitGroup.create({
      data: {
        userId,
        title: data.title,
        totalAmount: data.totalAmount,
        transactionId: data.transactionId || null,
        splitType: data.splitType,
      },
    });

    await tx.splitParticipant.createMany({
      data: participantData.map((p) => ({
        splitGroupId: group.id,
        email: p.email,
        name: p.name,
        amount: p.amount,
      })),
    });

    const full = await tx.splitGroup.findUnique({
      where: { id: group.id },
      include: { participants: true },
    });

    return [full!];
  });

  return group;
}

export async function updateParticipantStatus(
  userId: string,
  splitId: string,
  participantId: string,
  isPaid: boolean
) {
  const split = await prisma.splitGroup.findFirst({ where: { id: splitId, userId } });
  if (!split) throw new Error('Split not found');

  await prisma.splitParticipant.update({
    where: { id: participantId },
    data: { isPaid, paidAt: isPaid ? new Date() : null },
  });

  // Check if all participants are paid -> auto-settle
  const participants = await prisma.splitParticipant.findMany({
    where: { splitGroupId: splitId },
  });
  const allPaid = participants.every((p) => p.id === participantId ? isPaid : p.isPaid);

  if (allPaid && split.status === 'pending') {
    await prisma.splitGroup.update({
      where: { id: splitId },
      data: { status: 'settled' },
    });
  } else if (!allPaid && split.status === 'settled') {
    await prisma.splitGroup.update({
      where: { id: splitId },
      data: { status: 'pending' },
    });
  }

  return prisma.splitGroup.findUnique({
    where: { id: splitId },
    include: { participants: true },
  });
}

export async function deleteSplit(userId: string, splitId: string) {
  const split = await prisma.splitGroup.findFirst({ where: { id: splitId, userId } });
  if (!split) throw new Error('Split not found');
  return prisma.splitGroup.delete({ where: { id: splitId } });
}

export async function getSplitSummary(userId: string) {
  const splits = await prisma.splitGroup.findMany({
    where: { userId },
    include: { participants: true },
  });

  let totalOwedToYou = 0;
  let pendingCount = 0;
  let settledCount = 0;

  for (const split of splits) {
    if (split.status === 'pending') {
      pendingCount++;
      for (const p of split.participants) {
        if (!p.isPaid) {
          totalOwedToYou += parseFloat(p.amount.toString());
        }
      }
    } else {
      settledCount++;
    }
  }

  return {
    totalOwedToYou: Math.round(totalOwedToYou * 100) / 100,
    pendingCount,
    settledCount,
  };
}
