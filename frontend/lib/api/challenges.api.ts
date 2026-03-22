import { apiRequest } from './client';
import type { SpendingChallenge, ChallengesOverview, AiChallengeSuggestion } from '@shared/types';

export async function getChallengesOverview(bankRecordId: string) {
  return apiRequest<{ overview: ChallengesOverview }>(
    `/api/challenges/overview?bankRecordId=${bankRecordId}`
  );
}

export async function getAiSuggestions(bankRecordId: string, useAi: boolean = false) {
  const aiParam = useAi ? '&ai=true' : '';
  return apiRequest<{ suggestions: AiChallengeSuggestion[]; source?: 'ai' | 'formula' }>(
    `/api/challenges/suggestions?bankRecordId=${bankRecordId}${aiParam}`
  );
}

export async function createChallenge(data: {
  title: string;
  description: string;
  type: 'category_limit' | 'no_spend' | 'savings_target';
  category?: string;
  targetAmount?: number;
  duration: 'weekly' | 'monthly';
  isAiGenerated?: boolean;
}) {
  return apiRequest<{ challenge: SpendingChallenge }>('/api/challenges', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function abandonChallenge(id: string) {
  return apiRequest<{ challenge: SpendingChallenge }>(`/api/challenges/${id}/abandon`, {
    method: 'PATCH',
  });
}
