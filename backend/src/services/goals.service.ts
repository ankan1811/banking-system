import { prisma } from '../lib/db.js';

export async function getGoals(userId: string) {
  return prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { targetDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createGoal(
  userId: string,
  data: {
    name: string;
    targetAmount: number;
    targetDate?: string;
    emoji?: string;
    color?: string;
  }
) {
  return prisma.savingsGoal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      emoji: data.emoji || null,
      color: data.color || null,
    },
  });
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: {
    name?: string;
    targetAmount?: number;
    targetDate?: string | null;
    emoji?: string | null;
    color?: string | null;
    status?: string;
  }
) {
  const updated = await prisma.savingsGoal.updateMany({
    where: { id: goalId, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
      ...(data.emoji !== undefined && { emoji: data.emoji }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
  if (updated.count === 0) throw new Error('Goal not found');
  return prisma.savingsGoal.findUnique({ where: { id: goalId } });
}

export async function deleteGoal(userId: string, goalId: string) {
  const deleted = await prisma.savingsGoal.deleteMany({ where: { id: goalId, userId } });
  if (deleted.count === 0) throw new Error('Goal not found');
  return deleted;
}

export async function addContribution(
  userId: string,
  goalId: string,
  amount: number,
  note?: string
) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new Error('Goal not found');

  const newSaved = parseFloat(goal.savedAmount.toString()) + amount;
  const targetAmount = parseFloat(goal.targetAmount.toString());
  const autoComplete = newSaved >= targetAmount;

  const [contribution, updatedGoal] = await prisma.$transaction([
    prisma.goalContribution.create({
      data: { goalId, amount, note: note || null },
    }),
    prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        savedAmount: newSaved,
        ...(autoComplete && goal.status === 'active' && { status: 'completed' }),
      },
    }),
  ]);

  return { contribution, goal: updatedGoal };
}

export async function getContributions(userId: string, goalId: string) {
  const goalExists = await prisma.savingsGoal.count({ where: { id: goalId, userId } });
  if (!goalExists) throw new Error('Goal not found');

  return prisma.goalContribution.findMany({
    where: { goalId },
    orderBy: { createdAt: 'desc' },
  });
}
