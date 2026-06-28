import { Response } from "express";

// Global memory map to hold Server-Sent Events (SSE) active client response sockets
export const sseClients = new Map<string, Response[]>();

export function registerSSEClient(tripId: string, res: Response) {
  if (!sseClients.has(tripId)) {
    sseClients.set(tripId, []);
  }
  sseClients.get(tripId)!.push(res);
  console.log(`[SSE] Client registered for trip ${tripId}. Total active listeners: ${sseClients.get(tripId)!.length}`);
}

export function unregisterSSEClient(tripId: string, res: Response) {
  const clients = sseClients.get(tripId);
  if (clients) {
    const updated = clients.filter(c => c !== res);
    sseClients.set(tripId, updated);
    console.log(`[SSE] Client unregistered for trip ${tripId}. Remaining listeners: ${updated.length}`);
  }
}


export function broadcastTripChange(tripId: string) {
  const clients = sseClients.get(tripId);
  if (clients && clients.length > 0) {
    console.log(`[SSE] Broadcasting live trip update event to ${clients.length} active listeners for: ${tripId}`);
    clients.forEach(res => {
      try {
        res.write(`data: ${JSON.stringify({ type: "update", tripId })}\n\n`);
      } catch (err) {
        // Ignored; closed connections are cleaned up on req.close
      }
    });
  }
}
