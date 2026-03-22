import { apiRequest } from './client';
import type { SpendingChallenge, ChallengesOverview, AiChallengeSuggestion } from '@shared/types';

export async function getChallengesOverview() {
  return apiRequest<{ overview: ChallengesOverview }>(
    `/api/challenges/overview`
  );
}

export async function getAiSuggestions(useAi: boolean = false) {
  const aiParam = useAi ? '?ai=true' : '';
  return apiRequest<{ suggestions: AiChallengeSuggestion[]; source?: 'ai' | 'formula' }>(
    `/api/challenges/suggestions${aiParam}`
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
