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

  return prisma.splitGroup.create({
    data: {
      userId,
      title: data.title,
      totalAmount: data.totalAmount,
      transactionId: data.transactionId || null,
      splitType: data.splitType,
      participants: {
        createMany: {
          data: participantData.map((p) => ({
            email: p.email,
            name: p.name,
            amount: p.amount,
          })),
        },
      },
    },
    include: { participants: true },
  });
}

export async function updateParticipantStatus(
  userId: string,
  splitId: string,
  participantId: string,
  isPaid: boolean
) {
  return prisma.$transaction(async (tx) => {
    const split = await tx.splitGroup.findFirst({ where: { id: splitId, userId } });
    if (!split) throw new Error('Split not found');

    await tx.splitParticipant.update({
      where: { id: participantId },
      data: { isPaid, paidAt: isPaid ? new Date() : null },
    });

    // Check if all participants are paid -> auto-settle
    const unpaidCount = await tx.splitParticipant.count({
      where: { splitGroupId: splitId, isPaid: false, id: { not: participantId } },
    });
    const allPaid = isPaid && unpaidCount === 0;

    if (allPaid && split.status === 'pending') {
      await tx.splitGroup.update({ where: { id: splitId }, data: { status: 'settled' } });
    } else if (!allPaid && split.status === 'settled') {
      await tx.splitGroup.update({ where: { id: splitId }, data: { status: 'pending' } });
    }

    return tx.splitGroup.findUnique({
      where: { id: splitId },
      include: { participants: true },
    });
  });
}

export async function deleteSplit(userId: string, splitId: string) {
  const deleted = await prisma.splitGroup.deleteMany({
    where: { id: splitId, userId },
  });
  if (deleted.count === 0) throw new Error('Split not found');
  return deleted;
}

export async function getSplitSummary(userId: string) {
  const [pendingCount, settledCount, owedResult] = await Promise.all([
    prisma.splitGroup.count({ where: { userId, status: 'pending' } }),
    prisma.splitGroup.count({ where: { userId, status: 'settled' } }),
    prisma.splitParticipant.aggregate({
      _sum: { amount: true },
      where: {
        isPaid: false,
        splitGroup: { userId, status: 'pending' },
      },
    }),
  ]);

  return {
    totalOwedToYou: Math.round(parseFloat(owedResult._sum.amount?.toString() || '0') * 100) / 100,
    pendingCount,
    settledCount,
  };
}
