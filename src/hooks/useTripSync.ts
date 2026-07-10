/**
 * useTripSync
 * Owns the 4-second polling loop, trip fetch, and pending invitations check.
 * Previously these lived inline in App.tsx's useEffect + fetchTripData function.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Trip } from "../types";
import { decryptMessage } from "../utils/crypto";
import { STORAGE_KEYS } from "../lib/constants";

const POLL_INTERVAL_MS = 4_000;

interface UseTripSyncOptions {
  loggedInUserId: string | null;
  /** Called when the fetched trip contains user data we can populate currentUser from. */
  onUserResolved?: (participant: any) => void;
  onSessionExpired?: () => void;
}

type ConnectionState = 'connecting' | 'connected' | 'polling' | 'reconnecting';

export function useTripSync({ loggedInUserId, onUserResolved, onSessionExpired }: UseTripSyncOptions) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  // Track SSE/polling state machine
  const connectionStateRef = useRef<ConnectionState>("connecting");
  const retryDelayRef = useRef(5000);
  const MAX_RETRY_DELAY = 60000;

  // Keep a ref so the interval callback always sees the latest tripId
  const tripIdRef = useRef<string | undefined>(undefined);
  tripIdRef.current = trip?.id;

  // ---------------------------------------------------------------------------
  // Core fetch helpers
  // ---------------------------------------------------------------------------

  const buildHeaders = useCallback(
    (overrideTripId?: string): Record<string, string> => {
      const uid = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_ID) || loggedInUserId || "";
      const tid =
        overrideTripId ||
        localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_ID) ||
        tripIdRef.current ||
        "";
      const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || "";
      const headers: Record<string, string> = {
        "x-user-id": uid,
        "x-trip-id": tid,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    },
    [loggedInUserId]
  );

  const fetchInvitations = useCallback(async () => {
    const uid = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_ID) || loggedInUserId;
    if (!uid) return;
    try {
      const res = await fetch("/api/trip/invitations", {
        headers: buildHeaders(),
      });
      if (res.status === 401 && onSessionExpired) {
        onSessionExpired();
        return;
      }
      if (!res.ok) return;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return;
      setPendingInvitations(await res.json());
    } catch {
      // Silently ignore — invitations are non-critical
    }
  }, [loggedInUserId, buildHeaders, onSessionExpired]);

  const fetchTripData = useCallback(
    async (showSpinner = false, overrideTripId?: string) => {
      const uid = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_ID) || loggedInUserId;
      if (!uid) {
        return;
      }

      if (showSpinner) setSyncing(true);
      if (overrideTripId) localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, overrideTripId);

      try {
        const tid =
          overrideTripId ||
          localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_ID) ||
          tripIdRef.current ||
          "";

        const res = await fetch("/api/trip", {
          headers: buildHeaders(overrideTripId),
        });

        if (res.status === 401 && onSessionExpired) {
          onSessionExpired();
          return;
        }

        if (!res.ok) throw new Error("Server responded with error status");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json"))
          throw new Error("Backend server is booting up or returned HTML.");

        const responseData = await res.json();
        if (responseData.success) {
          const data: Trip = responseData.data;
          setTrip(data);
          if (data?.id) localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, data.id);
          setErrorState(null);

          // Let the parent resolve currentUser from the participant list
          const found = data.participants.find((p) => p.id === uid);
          if (found && onUserResolved) {
            onUserResolved({
              ...found,
              username:
                localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_USERNAME) || found.username || "",
            });
          }
        } else {
          throw new Error(responseData.error?.message || "Server responded with error");
        }
      } catch {
        setErrorState(
          "Synchronization connection offline. Re-routing through local gateway..."
        );
      } finally {
        if (showSpinner) setSyncing(false);
      }
    },
    [loggedInUserId, onUserResolved, buildHeaders, onSessionExpired]
  );

  // ---------------------------------------------------------------------------
  // Start Server-Sent Events (SSE) live connection with robust fallback polling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const uid = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_ID) || loggedInUserId;
    if (!uid) return;

    // Run initial fetch on mount
    fetchTripData(true);

    let eventSource: EventSource | null = null;
    let fallbackInterval: any = null;
    let reconnectTimeout: any = null;

    const startFallbackPolling = (ms: number) => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      fallbackInterval = setInterval(() => {
        const currentUid = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_ID) || loggedInUserId;
        if (currentUid) fetchTripData(false);
      }, ms);
    };

    const setupSSE = () => {
      const activeTripId = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_ID) || tripIdRef.current;
      if (!activeTripId) {
        connectionStateRef.current = 'polling';
        startFallbackPolling(4000);
        return;
      }

      if (connectionStateRef.current !== 'reconnecting') {
        connectionStateRef.current = 'connecting';
      }

      console.log("[SSE] Establishing live stream connection for active trip:", activeTripId);
      
      // Close previous eventSource if any
      if (eventSource) {
        eventSource.close();
      }

      const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || "";
      eventSource = new EventSource(`/api/trip/events?tripId=${activeTripId}&token=${token}`);

      eventSource.onmessage = (event) => {
        try {
          if (event.data === ": keepalive") return;
          const data = JSON.parse(event.data);
          if (data.type === "update") {
            console.log("[SSE] Live modification detected on server, triggering dynamic refresh...");
            fetchTripData(false);
            fetchInvitations();
          }
        } catch (err) {
          console.error("[SSE] Failed to parse SSE message payload:", err);
        }
      };

      eventSource.onerror = () => {
        console.warn("[SSE] Live stream connection interrupted. Falling back to background polling...");
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Clear existing reconnect timeout first
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }

        // Set state to polling and start fallback polling
        connectionStateRef.current = 'polling';
        startFallbackPolling(10000);

        // Schedule SSE reconnection attempt with exponential backoff
        const currentDelay = retryDelayRef.current;
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY);
        reconnectTimeout = setTimeout(() => {
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
          connectionStateRef.current = "reconnecting";
          setupSSE();
        }, currentDelay);
      };

      // When SSE connects, we can slow down or clear the background polling entirely (rely on pushes)
      eventSource.onopen = () => {
        console.log("[SSE] Live stream connected successfully. Silencing periodic polling.");
        retryDelayRef.current = 5000; // reset on successful connection
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
        connectionStateRef.current = 'connected';
      };
    };

    setupSSE();

    return () => {
      if (eventSource) {
        console.log("[SSE] Tearing down connection.");
        eventSource.close();
      }
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [loggedInUserId, trip?.id, fetchTripData]);


  // ---------------------------------------------------------------------------
  // Automatic Decryption of Secured Group Chat Messages
  // ---------------------------------------------------------------------------
  const chatsSerialized = trip?.chats?.map(c => c.id + ":" + c.messageEncrypted).join(",") || "";
  
  useEffect(() => {
    if (!trip) return;
    
    // Check if there are any chats that are NOT decrypted yet
    const hasUndecrypted = trip.chats?.some(msg => 
      msg.senderId !== "system" && 
      !msg.isTripUpdate && 
      (!msg.messageDecrypted || msg.messageDecrypted === "[Decrypted payload secure - key verified]")
    );
    
    if (!hasUndecrypted) return;

    let active = true;
    const runDecryption = async () => {
      const decryptedChats = await Promise.all(
        (trip.chats || []).map(async (msg) => {
          if (msg.senderId === "system" || msg.isTripUpdate) {
            return { ...msg, messageDecrypted: msg.messageDecrypted || msg.messageEncrypted };
          }
          if (msg.messageDecrypted && !msg.messageDecrypted.startsWith("[Decrypted payload")) {
            return msg;
          }
          try {
            const decrypted = await decryptMessage(msg.messageEncrypted, trip.id);
            return { ...msg, messageDecrypted: decrypted };
          } catch (e) {
            return { ...msg, messageDecrypted: "[Decryption failed]" };
          }
        })
      );
      
      if (active) {
        setTrip(prev => {
          if (!prev || prev.id !== trip.id) return prev;
          const changed = prev.chats?.some((c, idx) => c.messageDecrypted !== decryptedChats[idx]?.messageDecrypted);
          if (!changed) return prev;
          return { ...prev, chats: decryptedChats };
        });
      }
    };

    runDecryption();
    return () => {
      active = false;
    };
  }, [chatsSerialized, trip?.id]);


  // ---------------------------------------------------------------------------
  // Helpers exposed to consumers
  // ---------------------------------------------------------------------------

  /** Generic authenticated fetch — attaches x-user-id and x-trip-id headers. */
  const fetchWithAuth = useCallback(
    (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          ...buildHeaders(),
          ...(options.headers as Record<string, string> | undefined),
        },
      });
    },
    [buildHeaders]
  );

  // ---------------------------------------------------------------------------
  // Offline State Tracking & Local-First Queue Sync
  // ---------------------------------------------------------------------------
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const flushOfflineQueue = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_OFFLINE_QUEUE) || "[]");
    if (queue.length === 0) return;

    // Aggregate all queued partial updates in sequence
    let mergedFields: Partial<Trip> = {};
    queue.forEach((fields: Partial<Trip>) => {
      mergedFields = { ...mergedFields, ...fields };
    });

    try {
      console.log("[PWA] Flushing aggregated local updates to cloud server:", mergedFields);
      const res = await fetchWithAuth("/api/trip/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedFields),
      });
      if (res.ok) {
        const responseData = await res.json();
        if (responseData.success) {
          setTrip(responseData.data.trip);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_OFFLINE_QUEUE);
          console.log("[PWA] Offline queue successfully synchronized and cleared!");
        }
      }
    } catch (err) {
      console.error("[PWA] Synchronizing offline queue failed, keeping queue items.", err);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log("[PWA] Back online! Syncing local operations queue...");
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
      console.log("[PWA] Working in local-first offline/airplane mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushOfflineQueue]);

  // Fetch invitations once on login or mount, then rely on SSE pushes to trigger refreshes
  useEffect(() => {
    const uid = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER_ID) || loggedInUserId;
    if (uid) {
      fetchInvitations();
    }
  }, [loggedInUserId, fetchInvitations]);

  /** Post a partial trip update and refresh local state from server response. */
  const postTripUpdate = useCallback(
    async (updatedFields: Partial<Trip>) => {
      // 1. Optimistic UI: Apply updates locally immediately
      setTrip(prev => {
        if (!prev) return null;
        return { ...prev, ...updatedFields };
      });

      // 2. If currently offline, queue and return
      if (!navigator.onLine) {
        const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_OFFLINE_QUEUE) || "[]");
        queue.push(updatedFields);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_OFFLINE_QUEUE, JSON.stringify(queue));
        console.log("[PWA] Queued partial update in local storage due to offline state.");
        return;
      }

      try {
        const res = await fetchWithAuth("/api/trip/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedFields),
        });
        if (res.ok) {
          const responseData = await res.json();
          if (responseData.success) {
            setTrip(responseData.data.trip);
          }
        }
      } catch (err) {
        console.warn("postTripUpdate connection failed, enqueuing local update.", err);
        const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_OFFLINE_QUEUE) || "[]");
        queue.push(updatedFields);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_OFFLINE_QUEUE, JSON.stringify(queue));
      }
    },
    [fetchWithAuth]
  );

  const handleSelectTrip = useCallback(
    async (id: string) => {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, id);
      try {
        const res = await fetchWithAuth("/api/trip/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: id }),
        });
        if (res.ok) {
          const responseData = await res.json();
          if (responseData.success) {
            const trip = responseData.data.trip;
            setTrip(trip);
            await fetchTripData(true, trip?.id);
          }
        }
      } catch (err) {
        console.error("handleSelectTrip failed:", err);
      }
    },
    [fetchTripData]
  );

  const handleRespondInvitation = useCallback(
    async (invitationId: string, action: "accept" | "decline") => {
      try {
        const res = await fetchWithAuth("/api/trip/invitations/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId, action }),
        });
        if (res.ok) await fetchTripData(true);
      } catch (err) {
        console.error("handleRespondInvitation failed:", err);
      }
    },
    [fetchWithAuth, fetchTripData]
  );

  return {
    trip,
    setTrip,
    syncing,
    errorState,
    pendingInvitations,
    fetchTripData,
    fetchWithAuth,
    postTripUpdate,
    handleSelectTrip,
    handleRespondInvitation,
    isOffline,
  };
}
