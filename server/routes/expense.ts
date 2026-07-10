import { Router, Request, Response } from "express";
import { readTripsDB, writeTripsDBAndConfirm } from "../db/index.js";
import { ok, fail } from "../utils/apiResponse.js";
import { createSystemMessage } from "../utils/message.js";
import { ITEM_ID_PREFIXES } from "../../src/shared/ids.js";

const router = Router();

// Add new expense
router.post("/add", async (req: Request, res: Response) => {
  try {
    const expense = req.body;
    const current = readTripsDB(req);
    const newExpense = {
      id: ITEM_ID_PREFIXES.EXPENSE + Date.now(),
      ...expense,
      amount: Number(expense.amount) || 0,
    };

    if (!current.expenses) current.expenses = [];
    current.expenses.push(newExpense);

    // Send a system message indicating expense was added
    if (!current.chats) current.chats = [];
    current.chats.push(
      createSystemMessage(`📌 ${expense.paidByName || "Someone"} added expense '${expense.description}' ($${newExpense.amount})`, {
        idPrefix: "exp",
        avatarColor: "#64748b"
      })
    );

    await writeTripsDBAndConfirm(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to add expense (儲存花費失敗)"));
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
    await writeTripsDBAndConfirm(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to delete expense (刪除花費失敗)"));
  }
});

export default router;
