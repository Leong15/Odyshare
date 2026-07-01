/**
 * Shared Type Definitions for OdyShareSync Travel Planner & Group Workspace
 */

export interface Participant {
  id: string; // user UID
  name: string;
  email: string;
  avatarColor: string;
  publicKey: string; // Mock Encryption key
  budgetLimit?: number; // Personal budget limit
  username?: string; // Persistent login username
  lat?: number;
  lng?: number;
}

export interface FlightEstimate {
  id: string;
  carrier: string;
  carrierLogo?: string;
  from: string;
  to: string;
  price: number;
  stops: number;
  duration: string; // e.g. "12h 45m"
  departureTime: string;
  returnDepartureTime?: string;
  rating: number; // e.g. 8.4
  votes: string[]; // List of user IDs who voted
  isCheapest?: boolean;
  bookingUrl?: string;
  currency?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ItineraryItem {
  id: string;
  dayIndex: number; // 0-indexed day
  time: string; // e.g. "09:00"
  title: string;
  description: string;
  locationName: string;
  category: 'restaurant' | 'shop' | 'sight' | 'transit' | 'hotel' | 'other';
  address?: string;
  cost: number;
  votes: string[]; // List of user IDs who voted
  comments: Comment[];
  coordinates?: { x: number; y: number }; // Relative position on the offline map canvas
  trafficStatus?: 'smooth' | 'moderate' | 'congested'; // real-time map traffic simulation
  lat?: number;
  lng?: number;
}

export interface ExpenseItem {
  id: string;
  amount: number;
  description: string;
  paidById: string; // who paid
  splitAmongIds: string[]; // shared expenses
  category: 'flight' | 'lodging' | 'food' | 'activities' | 'transit' | 'shopping' | 'other';
  date: string;
  splitType?: 'equal' | 'individual';
  individualAmounts?: Record<string, number>;
  taxRefundPercent?: number;
  taxRefundTotalAmount?: number;
  taxRefundDeductFee?: boolean;
  taxRefundFeePercent?: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: string; // e.g., "1.2 MB"
  type: string; // e.g., "application/pdf"
  uploadedAt: string;
  url: string; // local or mock download link
  accessKey: string; // Mock Encrypted verification key
  uploadedBy: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatarColor: string;
  messageEncrypted: string; // Simulated encryption payload
  messageDecrypted?: string; // Unwrapped in UI using local key
  timestamp: string;
  isTripUpdate?: boolean; // system notification flag
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status?: "active" | "inactive";
  lat?: number;
  lng?: number;
  participants: Participant[];
  flightEstimates: FlightEstimate[];
  itineraries: ItineraryItem[];
  backupItineraries?: ItineraryItem[];
  flightSubscription?: any;
  pushNotifications?: any[];
  expenses: ExpenseItem[];
  documents: DocumentItem[];
  chats: ChatMessage[];
  tripsList?: Trip[];
  updatedAt?: string;
}

