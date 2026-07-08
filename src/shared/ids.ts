export const SYSTEM_SENDER_ID = "system" as const;
export const SYSTEM_SENDER_NAME = "OdyShareSmart AI" as const;

export const ITEM_ID_PREFIXES = {
  ITINERARY: "it-",
  SPOT: "spot-",
  AI_OPTIMIZED: "it-opt-",
  EXPENSE: "exp-",
  DOCUMENT: "doc-",
  MESSAGE: "msg-",
  FLIGHT: "fl-ai-",
} as const;

export type ItemIdPrefix = typeof ITEM_ID_PREFIXES[keyof typeof ITEM_ID_PREFIXES];

export function isItineraryItem(id: string): boolean {
  return id.startsWith(ITEM_ID_PREFIXES.ITINERARY);
}

export function isSystemMessage(senderId: string): boolean {
  return senderId === SYSTEM_SENDER_ID;
}
