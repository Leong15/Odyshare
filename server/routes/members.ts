import { Router, Request, Response } from "express";
import type { Participant } from "../../src/types";
import { getDB, readTripsDB, writeTripsDB } from "../db/index.js";
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

// Upgrade/Merge an external (temporary) traveler to a registered user
router.post("/upgrade-external", async (req: Request, res: Response) => {
  try {
    const { externalId, targetUsername } = req.body;
    if (!externalId || !targetUsername || !targetUsername.trim()) {
      return res.status(400).json(fail("BAD_REQUEST", "External traveler ID and registered username are required (請提供外部旅伴ID與註冊帳號)。"));
    }

    const db = getDB();
    const user = db.users.find(
      (u: any) => u.username.toLowerCase() === targetUsername.trim().toLowerCase()
    );

    if (!user) {
      return res.status(404).json(fail("NOT_FOUND", "Registered user not found (該註冊帳號不存在)。"));
    }

    const current = readTripsDB(req);
    if (!current.participants) current.participants = [];

    const externalIdx = current.participants.findIndex((p: Participant) => p.id === externalId);
    if (externalIdx === -1) {
      return res.status(404).json(fail("NOT_FOUND", "External traveler not found in this trip (找不到該臨時旅伴)。"));
    }

    const extName = current.participants[externalIdx].name;

    // Check if the registered user is already a participant in the trip
    const alreadyParticipant = current.participants.some((p: Participant) => p.id === user.id);

    if (alreadyParticipant) {
      // Remove external from participants list
      current.participants.splice(externalIdx, 1);
    } else {
      // Replace external traveler entry with the registered user's real entry
      current.participants[externalIdx] = {
        id: user.id,
        name: user.name,
        email: user.email || `${user.username}@example.com`,
        avatarColor: user.avatarColor || "#3b82f6",
        publicKey: "pub_key_" + Math.random().toString(36).substring(7),
        budgetLimit: current.participants[externalIdx].budgetLimit || 1500,
      };
    }

    // Merge history: rewrite expenses referencing externalId to user.id
    if (!current.expenses) current.expenses = [];
    current.expenses.forEach((exp: any) => {
      // Who paid
      if (exp.paidById === externalId) {
        exp.paidById = user.id;
      }
      // Who split among
      if (exp.splitAmongIds && exp.splitAmongIds.includes(externalId)) {
        exp.splitAmongIds = exp.splitAmongIds.map((id: string) => id === externalId ? user.id : id);
        exp.splitAmongIds = Array.from(new Set(exp.splitAmongIds));
      }
      // Individual amounts
      if (exp.individualAmounts && exp.individualAmounts[externalId] !== undefined) {
        const val = exp.individualAmounts[externalId];
        delete exp.individualAmounts[externalId];
        if (exp.individualAmounts[user.id] !== undefined) {
          exp.individualAmounts[user.id] += val;
        } else {
          exp.individualAmounts[user.id] = val;
        }
      }
    });

    // Add trip system update chat message
    if (!current.chats) current.chats = [];
    current.chats.push({
      id: "msg-upgrade-ext-" + Date.now(),
      senderId: "system",
      senderName: "System",
      avatarColor: "#10b981",
      messageEncrypted: "",
      messageDecrypted: `🎉 臨時旅伴「${extName}」已成功綁定/升級為正式帳號「${user.name}」！歷史代墊與應付帳目已無縫合併。`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true,
    });

    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Upgrade failed"));
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
