// src/types/chatTypes.ts

export type ChatRole = 'user' | 'ai' | 'system';

export interface ChatMessage {
  id?: number | string;
  role: ChatRole;
  text: string;
  isError?: boolean;
}
