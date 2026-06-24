import { Router, Request, Response } from "express";
import { readTripsDB, writeTripsDB } from "../db.js";

const router = Router();

// Add new expense
router.post("/add", async (req: Request, res: Response) => {
  try {
    const expense = req.body;
    const current = readTripsDB(req);
    const newExpense = {
      id: "exp-" + Date.now(),
      ...expense,
      amount: Number(expense.amount) || 0,
    };

    if (!current.expenses) current.expenses = [];
    current.expenses.push(newExpense);

    // Send a system message indicating expense was added
    if (!current.chats) current.chats = [];
    current.chats.push({
      id: "msg-exp-" + Date.now(),
      senderId: "system",
      senderName: "System Alert",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `📌 ${expense.paidByName || "Someone"} added expense '${expense.description}' ($${newExpense.amount})`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true,
    });

    writeTripsDB(current, req);
    res.json({ success: true, trip: current });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to add expense" });
  }
});

// Delete expense
router.post("/delete", async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.body;
    const current = readTripsDB(req);

    if (current.expenses) {
      current.expenses = current.expenses.filter((e: any) => e.id !== expenseId);
    }
    writeTripsDB(current, req);
    res.json({ success: true, trip: current });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete expense" });
  }
});

export default router;
