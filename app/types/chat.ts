export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  type?: 'text' | 'image' | 'file' | 'system' | 'poll';
  isEdited?: boolean;
  attachment?: {
    name: string;
    url: string;
    type: string;
    size?: number;
  };
  poll?: Poll;
  linkPreview?: LinkPreview;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters?: string[];
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface User {
  id: string;
  name: string;
  isHost?: boolean;
  isTyping?: boolean;
}

export interface Room {
  id: string;
  name: string;
  creatorId: string;
  creator?: {
    id: string;
    name: string;
  };
  isLocked: boolean;
  announcement?: string;
  activeUsers?: User[];
}
