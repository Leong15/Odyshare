import { Router, Request, Response } from "express";
import { readTripsDB, writeTripsDB } from "../db/index.js";
import { ok, fail } from "../utils/apiResponse.js";

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
      senderName: "OdyShareSmart AI",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `📌 ${expense.paidByName || "Someone"} added expense '${expense.description}' ($${newExpense.amount})`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true,
    });

    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to add expense"));
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
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to delete expense"));
  }
});

export default router;
