import { Router, Request, Response } from "express";
import type { Participant } from "../../src/types";
import { getDB, readTripsDB, writeTripsDB } from "../db.js";
import { ok, fail } from "../utils/apiResponse.js";

const router = Router();

// Invite a collaborator to a trip project
router.post("/invite", async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const db = getDB();

    const user = db.users.find(
      (u: any) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
      return res.status(404).json(fail("NOT_FOUND", "User not found (該帳號不存在)。"));
    }

    const current = readTripsDB(req);
    if (!current.participants) current.participants = [];

    if (current.participants.some((p: Participant) => p.id === user.id)) {
      return res.status(400).json(fail("BAD_REQUEST", "User is already a participant in this trip (該用戶已在協同旅伴名單中)。"));
    }

    // Add new participant
    current.participants.push({
      id: user.id,
      name: user.name,
      email: user.email || `${user.username}@example.com`,
      avatarColor: user.avatarColor || "#3b82f6",
      publicKey: "pub_key_" + Math.random().toString(36).substring(7),
      budgetLimit: 1500,
    });

    // Post a welcome system chat alert
    if (!current.chats) current.chats = [];
    current.chats.push({
      id: "msg-invite-" + Date.now(),
      senderId: "system",
      senderName: "System",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `🎉 ${user.name} has joined the travel workspace!`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true,
    });

    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Invitation failed"));
  }
});

// Add an external (non-registered) participant to a trip project for splitting bills
router.post("/invite-external", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json(fail("BAD_REQUEST", "Name is required (請輸入姓名)。"));
    }

    const current = readTripsDB(req);
    if (!current.participants) current.participants = [];

    // Check if duplicate name
    if (current.participants.some((p: Participant) => p.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json(fail("BAD_REQUEST", "A participant with this name already exists (已有名稱相同的成員)。"));
    }

    // Create custom external participant
    const externalId = "ext-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const colors = ["#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#06b6d4", "#ef4444", "#3b82f6", "#10b981"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newParticipant: Participant = {
      id: externalId,
      name: name.trim(),
      email: `${name.trim().toLowerCase().replace(/\s+/g, "")}@external.com`,
      avatarColor,
      publicKey: "pub_key_external_" + Math.random().toString(36).substring(7),
      budgetLimit: 1500,
    };

    current.participants.push(newParticipant);

    // Post system message
    if (!current.chats) current.chats = [];
    current.chats.push({
      id: "msg-invite-ext-" + Date.now(),
      senderId: "system",
      senderName: "System",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `➕ 已新增臨時外部旅伴：${name.trim()} (僅用於此旅程的拆帳與預算管理)！`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true,
    });

    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to add external traveler"));
  }
});

// Kick a collaborator from a trip project
router.post("/kick", async (req: Request, res: Response) => {
  try {
    const { userIdToKick } = req.body;
    const current = readTripsDB(req);

    if (current.participants) {
      current.participants = current.participants.filter((p: Participant) => p.id !== userIdToKick);
    }

    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to kick participant"));
  }
});

export default router;
