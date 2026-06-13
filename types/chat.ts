export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  isHost?: boolean;
}
