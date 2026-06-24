import { Router, Request, Response } from "express";
import { getDB, writeDB, readTripsDB, writeTripsDB } from "../db.js";

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
      return res.status(404).json({ error: "User not found (該帳號不存在)。" });
    }

    const current = readTripsDB(req);
    if (!current.participants) current.participants = [];

    if (current.participants.some((p: any) => p.id === user.id)) {
      return res.status(400).json({ error: "User is already a participant in this trip (該用戶已在協同旅伴名單中)。" });
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
    res.json({ success: true, trip: current });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Invitation failed" });
  }
});

// Kick a collaborator from a trip project
router.post("/kick", async (req: Request, res: Response) => {
  try {
    const { userIdToKick } = req.body;
    const current = readTripsDB(req);

    if (current.participants) {
      current.participants = current.participants.filter((p: any) => p.id !== userIdToKick);
    }

    writeTripsDB(current, req);
    res.json({ success: true, trip: current });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to kick participant" });
  }
});

export default router;
