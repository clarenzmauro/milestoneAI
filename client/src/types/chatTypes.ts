// src/types/chatTypes.ts

export type ChatRole = 'user' | 'ai' | 'system'; // Add system if needed

export interface ChatMessage {
  // Assuming 'id' was used for React keys, keep it if needed for rendering
  id?: number | string; // Optional if not stored in DB
  role: ChatRole;
  text: string;
  isError?: boolean; // Optional flag for displaying errors in chat
  // Add timestamp if you want to store/display message times
  // timestamp?: Date | firebase.firestore.Timestamp;
}
