export type Message = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  sentAt?: number;
};

export type Conversation = {
  id: string;
  sellerName: string;
  initials: string;
  sellerPhone: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  origin: 'Local' | 'Dubai' | 'China';
  /** Timestamp of the latest in-app activity. Drives sort order. */
  activity: number;
  messages: Message[];
};
