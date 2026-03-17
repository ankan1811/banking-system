import { apiRequest } from './client';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function sendChatMessage(message: string, history: ChatMessage[]) {
  return apiRequest<{ reply: string }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}
