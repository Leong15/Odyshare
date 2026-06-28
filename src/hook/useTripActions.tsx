/**
 * useTripActions
 * All trip-level CRUD operations extracted from App.tsx.
 * Each handler follows a consistent pattern:
 *   POST to API → on success, update local trip state from response.
 */

import { useCallback } from "react";
import type { Trip, ItineraryItem, ExpenseItem, DocumentItem, ChatMessage, Participant } from "../types";
import { ITEM_ID_PREFIXES, SYSTEM_SENDER_ID, SYSTEM_SENDER_NAME } from "../lib/constants";

// Safe Base64 encoder that handles non-Latin1 characters (Chinese, emoji)
function safeBtoa(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return btoa(str);
  }
}

interface UseTripActionsOptions {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  postTripUpdate: (fields: Partial<Trip>) => Promise<void>;
  fetchTripData: (showSpinner?: boolean, overrideTripId?: string) => Promise<void>;
  setTrip: (t: Trip) => void;
  currentUser: Participant | null;
  lang: "en" | "zh";
}

export function useTripActions({
  fetchWithAuth,
  postTripUpdate,
  fetchTripData,
  setTrip,
  currentUser,
  lang,
}: UseTripActionsOptions) {

  // ---------------------------------------------------------------------------
  // Trip meta
  // ---------------------------------------------------------------------------

  const handleCreateTrip = useCallback(
    async (
      name: string,
      destination: string,
      totalBudget: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetchWithAuth("/api/trip/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            destination: destination.trim() || undefined,
            totalBudget: totalBudget.trim() ? Number(totalBudget) : undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const trip = data.data.trip;
          if (trip?.id) localStorage.setItem("activeTripId", trip.id);
          setTrip(trip);
          await fetchTripData(true, trip?.id);
          return { success: true };
        }
        return {
          success: false,
          error:
            data.error?.message ||
            (lang === "zh" ? "創立專案失敗，請重試" : "Failed to create trip, please retry."),
        };
      } catch {
        return {
          success: false,
          error: lang === "zh" ? "連線中斷或伺服器錯誤" : "Connection lost or server error.",
        };
      }
    },
    [fetchWithAuth, fetchTripData, setTrip, lang]
  );

  const handleDeleteTrip = useCallback(
    async (id: string) => {
      try {
        const res = await fetchWithAuth("/api/trip/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: id }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const trip = data.data.trip;
            if (trip?.id) localStorage.setItem("activeTripId", trip.id);
            else localStorage.removeItem("activeTripId");
            setTrip(trip);
            await fetchTripData(true, trip?.id);
          }
        }
      } catch (err) {
        console.error("handleDeleteTrip failed:", err);
      }
    },
    [fetchWithAuth, fetchTripData, setTrip]
  );

  const handleEditTripMeta = useCallback(
    async (updatedData: {
      name: string;
      destination: string;
      totalBudget: number;
      status?: "active" | "inactive";
    }) => {
      try {
        const res = await fetchWithAuth("/api/trip/update-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const trip = data.data.trip;
            setTrip(trip);
            await fetchTripData(true, trip?.id);
          }
        }
      } catch (err) {
        console.error("handleEditTripMeta failed:", err);
      }
    },
    [fetchWithAuth, fetchTripData, setTrip]
  );

  // ---------------------------------------------------------------------------
  // Itinerary
  // ---------------------------------------------------------------------------

  const handleAddItineraryItem = useCallback(
    async (item: Omit<ItineraryItem, "id" | "votes" | "comments">) => {
      try {
        const res = await fetchWithAuth("/api/trip/itinerary/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleAddItineraryItem failed:", err);
      }
    },
    [fetchWithAuth, setTrip]
  );

  const handleUpdateItineraryItem = useCallback(
    async (item: ItineraryItem) => {
      try {
        const res = await fetchWithAuth("/api/trip/itinerary/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleUpdateItineraryItem failed:", err);
      }
    },
    [fetchWithAuth, setTrip]
  );

  const handleDeleteItineraryItem = useCallback(
    async (itemId: string) => {
      try {
        const res = await fetchWithAuth("/api/trip/itinerary/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleDeleteItineraryItem failed:", err);
      }
    },
    [fetchWithAuth, setTrip]
  );

  const handleVote = useCallback(
    async (targetType: "itinerary" | "flight", targetId: string) => {
      try {
        const res = await fetchWithAuth("/api/trip/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId, userId: currentUser?.id }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleVote failed:", err);
      }
    },
    [fetchWithAuth, setTrip, currentUser]
  );

  const handleAddComment = useCallback(
    async (itemId: string, text: string) => {
      try {
        const res = await fetchWithAuth("/api/trip/itinerary/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            userId: currentUser?.id,
            userName: currentUser?.name,
            text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleAddComment failed:", err);
      }
    },
    [fetchWithAuth, setTrip, currentUser]
  );

  // ---------------------------------------------------------------------------
  // Expenses
  // ---------------------------------------------------------------------------

  const handleAddExpense = useCallback(
    async (expense: Omit<ExpenseItem, "id">) => {
      try {
        const res = await fetchWithAuth("/api/trip/expense/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expense),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleAddExpense failed:", err);
      }
    },
    [fetchWithAuth, setTrip]
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      try {
        const res = await fetchWithAuth("/api/trip/expense/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expenseId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleDeleteExpense failed:", err);
      }
    },
    [fetchWithAuth, setTrip]
  );

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  const handleUploadDocument = useCallback(
    async (doc: Omit<DocumentItem, "id" | "uploadedAt" | "url" | "accessKey">, fileData?: string) => {
      try {
        const res = await fetchWithAuth("/api/trip/document/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...doc, fileData }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleUploadDocument failed:", err);
      }
    },
    [fetchWithAuth, setTrip]
  );

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  const handleSendChatMessage = useCallback(
    async (msg: string) => {
      const encryptedMsg = "U2FsdGVkX19" + safeBtoa(msg);
      try {
        const res = await fetchWithAuth("/api/trip/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: currentUser?.id,
            senderName: currentUser?.name,
            avatarColor: currentUser?.avatarColor,
            messageDecrypted: msg,
            messageEncrypted: encryptedMsg,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTrip(data.data.trip);
          }
        }
      } catch (err) {
        console.error("handleSendChatMessage failed:", err);
      }
    },
    [fetchWithAuth, setTrip, currentUser]
  );

  const handlePostAISystemMessage = useCallback(
    (text: string) => {
      const systemMsg: ChatMessage = {
        id: ITEM_ID_PREFIXES.MESSAGE + "ai-ref-" + Date.now(),
        senderId: SYSTEM_SENDER_ID,
        senderName: SYSTEM_SENDER_NAME,
        avatarColor: "#8b5cf6",
        messageEncrypted: "",
        messageDecrypted: text,
        timestamp: new Date().toISOString(),
        isTripUpdate: true,
      };
      postTripUpdate({ chats: undefined } as any);
      // We can't easily append without current trip state here,
      // so we expose this for App.tsx to call with trip in scope
      return systemMsg;
    },
    [postTripUpdate]
  );

  // ---------------------------------------------------------------------------
  // AI flights
  // ---------------------------------------------------------------------------

  const handleAIRecFlights = useCallback(
    async (
      from: string,
      to: string,
      date: string,
      type?: string,
      returnDate?: string,
      currentFlightEstimates: any[] = []
    ): Promise<void> => {
      try {
        const res = await fetchWithAuth("/api/ai/recommend-flights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, date, type, returnDate }),
        });
        if (res.ok) {
          const data = await res.json();
          const flights = data.flights || [];
          const updated = [...currentFlightEstimates];
          flights.forEach((f: any, idx: number) => {
            updated.push({
              id: `${ITEM_ID_PREFIXES.FLIGHT}${idx}-${Date.now()}`,
              carrier: f.carrier,
              carrierLogo: "⭐",
              from,
              to,
              price: f.price,
              stops: f.stops,
              duration: f.duration,
              departureTime: f.departureTime,
              rating: f.rating,
              bookingUrl: f.bookingUrl,
              currency: f.currency,
              votes: [],
            });
          });
          await postTripUpdate({ flightEstimates: updated });
        }
      } catch (err) {
        console.error("handleAIRecFlights failed:", err);
      }
    },
    [fetchWithAuth, postTripUpdate]
  );

  // ---------------------------------------------------------------------------
  // Invite / Kick members
  // ---------------------------------------------------------------------------

  const handleInviteUser = useCallback(
    async (username: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetchWithAuth("/api/trip/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        return res.ok && data.success ? { success: true } : { success: false, error: data.error?.message || data.error };
      } catch {
        return { success: false, error: "Connection error" };
      }
    },
    [fetchWithAuth]
  );

  const handleInviteExternalUser = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetchWithAuth("/api/trip/invite-external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          postTripUpdate(data.data.trip);
          return { success: true };
        } else {
          return { success: false, error: data.error?.message || data.error };
        }
      } catch {
        return { success: false, error: "Connection error" };
      }
    },
    [fetchWithAuth, postTripUpdate]
  );

  const handleKickParticipant = useCallback(
    async (
      userIdToKick: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetchWithAuth("/api/trip/kick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIdToKick }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.data?.trip) setTrip(data.data.trip);
            return { success: true };
          }
          return { success: false, error: data.error?.message || "Failed to kick participant" };
        }
        return { success: false, error: "Failed to kick participant" };
      } catch {
        return { success: false, error: "Connection failure" };
      }
    },
    [fetchWithAuth, setTrip]
  );

  // ---------------------------------------------------------------------------
  // AI itinerary optimisation
  // ---------------------------------------------------------------------------

  const handleApplyAIOptimization = useCallback(
    (items: ItineraryItem[]) => {
      postTripUpdate({
        backupItineraries: undefined, // caller must pass current trip.itineraries
        itineraries: items,
      });
    },
    [postTripUpdate]
  );

  const handleRestoreItineraries = useCallback(
    (currentItineraries: ItineraryItem[], backupItineraries: ItineraryItem[]) => {
      if (!backupItineraries?.length) return;
      postTripUpdate({ itineraries: [...backupItineraries], backupItineraries: [] });
    },
    [postTripUpdate]
  );

  return {
    handleCreateTrip,
    handleDeleteTrip,
    handleEditTripMeta,
    handleAddItineraryItem,
    handleUpdateItineraryItem,
    handleDeleteItineraryItem,
    handleVote,
    handleAddComment,
    handleAddExpense,
    handleDeleteExpense,
    handleUploadDocument,
    handleSendChatMessage,
    handlePostAISystemMessage,
    handleAIRecFlights,
    handleInviteUser,
    handleInviteExternalUser,
    handleKickParticipant,
    handleApplyAIOptimization,
    handleRestoreItineraries,
  };
}
