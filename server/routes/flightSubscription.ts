import { Router, Request, Response } from "express";
import { readTripsDB, writeTripsDB } from "../db/index.js";
import { ok, fail } from "../utils/apiResponse.js";
import { createSystemMessage } from "../utils/message.js";
import type { Trip } from "../../src/types";

const router = Router();

// ── POST /api/trip/:tripId/flight-subscription ──────────────────────────────
router.post("/:tripId/flight-subscription", (req: Request, res: Response) => {
  const { tripId } = req.params;
  const { from, to, date, price, carrier, stops, currency } = req.body;

  if (!from || !to || !price) {
    return res.status(400).json(fail("BAD_REQUEST", "Missing required subscription parameters."));
  }

  // Set the request's header so readTripsDB knows which trip we are updating
  req.headers["x-trip-id"] = tripId;
  const trip = readTripsDB(req);

  if (!trip || trip.id !== tripId) {
    return res.status(404).json(fail("NOT_FOUND", "Trip not found"));
  }

  const baselinePrice = Number(price);
  const currentStops = stops !== undefined ? Number(stops) : 0;
  const currentCarrier = carrier || "Airline";
  const currencyCode = currency || "USD";

  // Initial CP rating (Base: 75)
  const isDirect = currentStops === 0;
  const score = isDirect ? 75 : 55;

  const subscription = {
    isActive: true,
    from,
    to,
    date: date || trip.startDate || new Date().toISOString().split("T")[0],
    baselinePrice,
    currentPrice: baselinePrice,
    lastCheckedPrice: baselinePrice,
    carrier: currentCarrier,
    stops: currentStops,
    score,
    currency: currencyCode,
    history: [
      {
        price: baselinePrice,
        score,
        checkedAt: new Date().toISOString(),
        message: `🚀 [訂閱啟動] 啟動航班價格監控，基準票價為 ${currencyCode} $${baselinePrice} (${currentCarrier})`
      }
    ]
  };

  trip.flightSubscription = subscription;

  // Append a chat alert to notify the team
  if (!trip.chats) trip.chats = [];
  trip.chats.push(
    createSystemMessage(`🔔 航班監控已啟動：正在監控從 ${from} 飛往 ${to} (${date}) 的航班票價，目標基準價格為 ${currencyCode} $${baselinePrice}。`, {
      idPrefix: "sub",
      avatarColor: "#8b5cf6"
    })
  );

  writeTripsDB(trip, req);

  // Return ok payload conforming to API responses
  res.json(ok({ trip }));
});

// ── DELETE /api/trip/:tripId/flight-subscription ────────────────────────────
router.delete("/:tripId/flight-subscription", (req: Request, res: Response) => {
  const { tripId } = req.params;

  req.headers["x-trip-id"] = tripId;
  const trip = readTripsDB(req);

  if (!trip || trip.id !== tripId) {
    return res.status(404).json(fail("NOT_FOUND", "Trip not found"));
  }

  if (trip.flightSubscription) {
    trip.flightSubscription.isActive = false;

    // Log cancellation in history
    if (!trip.flightSubscription.history) {
      trip.flightSubscription.history = [];
    }
    trip.flightSubscription.history.push({
      price: trip.flightSubscription.currentPrice,
      score: trip.flightSubscription.score,
      checkedAt: new Date().toISOString(),
      message: `🛑 [監控取消] 已停用定時航班監控。`
    });

    if (!trip.chats) trip.chats = [];
    trip.chats.push(
      createSystemMessage(`🔕 航班價格監控已停止（${trip.flightSubscription.from} ➔ ${trip.flightSubscription.to}）。`, {
        idPrefix: "unsub",
        avatarColor: "#8b5cf6"
      })
    );
  }

  writeTripsDB(trip, req);
  res.json(ok({ trip }));
});

// ── POST /api/trip/:tripId/simulate-price-check ──────────────────────────────
router.post("/:tripId/simulate-price-check", (req: Request, res: Response) => {
  const { tripId } = req.params;
  const { simulatedPrice, simulatedStops, checkTime } = req.body;

  if (simulatedPrice === undefined) {
    return res.status(400).json(fail("BAD_REQUEST", "Missing simulatedPrice."));
  }

  req.headers["x-trip-id"] = tripId;
  const trip = readTripsDB(req);

  if (!trip || trip.id !== tripId) {
    return res.status(404).json(fail("NOT_FOUND", "Trip not found"));
  }

  const sub = trip.flightSubscription;
  if (!sub || !sub.isActive) {
    return res.status(400).json(fail("BAD_REQUEST", "No active flight subscription on this trip."));
  }

  const baseline = sub.baselinePrice;
  const newPrice = Number(simulatedPrice);
  const newStops = simulatedStops !== undefined ? Number(simulatedStops) : 0;
  const currencyCode = sub.currency || "USD";

  // Calculate high fidelity comparison
  const isDirect = newStops === 0;
  const scoreOfDirect = isDirect ? 70 : 45;
  const pctDiff = ((baseline - newPrice) / baseline) * 100;
  const priceAdjust = pctDiff * 1.5;
  const checkScore = Math.min(100, Math.max(10, Math.round(scoreOfDirect + priceAdjust)));

  sub.lastCheckedPrice = sub.currentPrice;
  sub.currentPrice = newPrice;
  sub.score = checkScore;
  sub.stops = newStops;

  const timeLabel = checkTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  let pushMsg = "";
  const isMegaDrop = pctDiff >= 10;

  if (isMegaDrop && newStops <= sub.stops) {
    pushMsg = `🔥 降價即時通知（手動模擬 ${timeLabel}）！您監控的${sub.from}機票已跌至 ${currencyCode} $${newPrice}（降幅達 $${baseline - newPrice}），直飛不變，創下近期 CP 值新高 (${checkScore}/100)！`;
  } else if (newStops > sub.stops) {
    pushMsg = `⚠️ 航班轉機警報（手動模擬 ${timeLabel}）：雖然當前報價 ${currencyCode} $${newPrice}，但轉機次數增加至 ${newStops} 次，性價比略低（得分 ${checkScore}）。`;
  } else if (newPrice < baseline) {
    pushMsg = `✈️ 航班價格下調（手動模擬 ${timeLabel}）：票價微幅調降至 ${currencyCode} $${newPrice}。直飛不變，性價比上升至 (${checkScore}/100)，可以準備出手。`;
  } else if (newPrice > baseline) {
    pushMsg = `📈 航班價格上升（手動模擬 ${timeLabel}）：當前報價為 ${currencyCode} $${newPrice}，相較初始價格 $${baseline} 有所上漲。性價比降為 (${checkScore}/100)，建議觀望。`;
  } else {
    pushMsg = `✈️ 航班價格持平（手動模擬 ${timeLabel}）：當前票價與初始價格 $${baseline} 一致，性價比評估為中等 (${checkScore}/100)。`;
  }

  sub.history.push({
    price: newPrice,
    score: checkScore,
    checkedAt: new Date().toISOString(),
    message: `[手動模擬 ${timeLabel}] 即時航班比價：最新報價為 ${currencyCode} $${newPrice}, 轉機 (${newStops}次)。AI 得分: ${checkScore}/100。`
  });

  // Push notification inside notification board
  if (!trip.pushNotifications) {
    trip.pushNotifications = [];
  }
  trip.pushNotifications.push({
    id: `notif-sim-${Date.now()}-${Math.random()}`,
    title: isMegaDrop ? "🔥 模擬超低票價通知" : "✈️ 模擬航班票價變動",
    message: pushMsg,
    createdAt: new Date().toISOString(),
    isRead: false
  });

  // Append a chat alert to notify the team
  if (!trip.chats) trip.chats = [];
  trip.chats.push(
    createSystemMessage(`📢 [手動模擬機票更新] ${pushMsg}`, {
      idPrefix: "sim",
      avatarColor: "#8b5cf6"
    })
  );

  writeTripsDB(trip, req);
  res.json(ok({ trip }));
});

export default router;
