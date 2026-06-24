/**
 * useTripSync
 * Owns the 4-second polling loop, trip fetch, and pending invitations check.
 * Previously these lived inline in App.tsx's useEffect + fetchTripData function.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Trip } from "../types";

const POLL_INTERVAL_MS = 4_000;

interface UseTripSyncOptions {
  loggedInUserId: string | null;
  /** Called when the fetched trip contains user data we can populate currentUser from. */
  onUserResolved?: (participant: any) => void;
}

export function useTripSync({ loggedInUserId, onUserResolved }: UseTripSyncOptions) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  // Keep a ref so the interval callback always sees the latest tripId
  const tripIdRef = useRef<string | undefined>(undefined);
  tripIdRef.current = trip?.id;

  // ---------------------------------------------------------------------------
  // Core fetch helpers
  // ---------------------------------------------------------------------------

  const buildHeaders = useCallback(
    (overrideTripId?: string): Record<string, string> => {
      const uid = localStorage.getItem("loggedInUserId") || loggedInUserId || "";
      const tid =
        overrideTripId ||
        localStorage.getItem("activeTripId") ||
        tripIdRef.current ||
        "";
      return { "x-user-id": uid, "x-trip-id": tid };
    },
    [loggedInUserId]
  );

  const fetchInvitations = useCallback(async () => {
    const uid = localStorage.getItem("loggedInUserId") || loggedInUserId;
    if (!uid) return;
    try {
      const res = await fetch("/api/trip/invitations", {
        headers: buildHeaders(),
      });
      if (!res.ok) return;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return;
      setPendingInvitations(await res.json());
    } catch {
      // Silently ignore — invitations are non-critical
    }
  }, [loggedInUserId, buildHeaders]);

  const fetchTripData = useCallback(
    async (showSpinner = false, overrideTripId?: string) => {
      const uid = localStorage.getItem("loggedInUserId") || loggedInUserId;
      if (!uid) {
        return;
      }

      if (showSpinner) setSyncing(true);
      if (overrideTripId) localStorage.setItem("activeTripId", overrideTripId);

      // Fire-and-forget invitations check alongside main request
      fetchInvitations();

      try {
        const tid =
          overrideTripId ||
          localStorage.getItem("activeTripId") ||
          tripIdRef.current ||
          "";

        const res = await fetch("/api/trip", {
          headers: { "x-user-id": uid, "x-trip-id": tid },
        });

        if (!res.ok) throw new Error("Server responded with error status");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json"))
          throw new Error("Backend server is booting up or returned HTML.");

        const data: Trip = await res.json();
        setTrip(data);
        if (data?.id) localStorage.setItem("activeTripId", data.id);
        setErrorState(null);

        // Let the parent resolve currentUser from the participant list
        const found = data.participants.find((p) => p.id === uid);
        if (found && onUserResolved) {
          onUserResolved({
            ...found,
            username:
              localStorage.getItem("loggedInUserUsername") || found.username || "",
          });
        }
      } catch {
        setErrorState(
          "Synchronization connection offline. Re-routing through local gateway..."
        );
      } finally {
        if (showSpinner) setSyncing(false);
      }
    },
    [loggedInUserId, fetchInvitations, onUserResolved]
  );

  // ---------------------------------------------------------------------------
  // Start polling when a user is logged in
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const uid = localStorage.getItem("loggedInUserId") || loggedInUserId;
    if (!uid) return;

    fetchTripData(true);
    const id = setInterval(() => {
      const currentUid = localStorage.getItem("loggedInUserId") || loggedInUserId;
      if (currentUid) fetchTripData(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
    // fetchTripData is stable (useCallback with stable deps), safe to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUserId]);

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

  /** Post a partial trip update and refresh local state from server response. */
  const postTripUpdate = useCallback(
    async (updatedFields: Partial<Trip>) => {
      try {
        const res = await fetchWithAuth("/api/trip/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedFields),
        });
        if (res.ok) {
          const data = await res.json();
          setTrip(data.trip);
        }
      } catch (err) {
        console.error("postTripUpdate failed:", err);
      }
    },
    [fetchWithAuth]
  );

  const handleSelectTrip = useCallback(
    async (id: string) => {
      localStorage.setItem("activeTripId", id);
      try {
        const res = await fetch("/api/trip/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: id }),
        });
        if (res.ok) {
          const data = await res.json();
          setTrip(data.trip);
          await fetchTripData(true, data.trip?.id);
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
  };
}