// server/types/db.ts
import type { Trip, Participant, ExpenseItem, ItineraryItem, 
              ChatMessage, DocumentItem } from '../../src/types';

export interface DBUser {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  avatarColor: string;
  emailVerified?: boolean;
  verificationToken?: string;
  budgetLimit?: number;
}

export interface DBInvitation {
  id: string;
  tripId: string;
  tripName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: string;
}

export interface MemoryDB {
  activeTripId: string;
  users: DBUser[];
  trips: Trip[];
  invitations: DBInvitation[];
}
