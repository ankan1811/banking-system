import { apiRequest } from './client';
import type { SavingsGoal, GoalContribution } from '@shared/types';

export async function getGoals() {
  return apiRequest<{ goals: SavingsGoal[] }>('/api/goals');
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  targetDate?: string;
  emoji?: string;
  color?: string;
}) {
  return apiRequest<{ goal: SavingsGoal }>('/api/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGoal(id: string, data: Partial<SavingsGoal>) {
  return apiRequest<{ goal: SavingsGoal }>(`/api/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(id: string) {
  return apiRequest<{ success: boolean }>(`/api/goals/${id}`, { method: 'DELETE' });
}

export async function addContribution(goalId: string, amount: number, note?: string) {
  return apiRequest<{ contribution: GoalContribution; goal: SavingsGoal }>(
    `/api/goals/${goalId}/contribute`,
    { method: 'POST', body: JSON.stringify({ amount, note }) }
  );
}

export async function getContributions(goalId: string) {
  return apiRequest<{ contributions: GoalContribution[] }>(`/api/goals/${goalId}/contributions`);
}
