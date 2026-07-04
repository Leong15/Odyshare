import { describe, it, expect } from "vitest";
import {
  getExpenseActualTotal,
  getExpenseShareForUser,
  calculateSettleMatrix,
  calculatePersonalMetrics,
  getParticipantAdjustedSpent,
} from "./expensecalculator";
import type { ExpenseItem, Participant } from "../types";

describe("Expense Calculator Utilities", () => {
  // Test case participants
  const participants: Participant[] = [
    { id: "u1", name: "Alice", email: "alice@example.com", avatarColor: "red", publicKey: "pub1" },
    { id: "u2", name: "Bob", email: "bob@example.com", avatarColor: "blue", publicKey: "pub2" },
    { id: "u3", name: "Charlie", email: "charlie@example.com", avatarColor: "green", publicKey: "pub3" },
  ];

  describe("Equal Split Scenario", () => {
    it("should correctly compute individual split amounts equally among selected members", () => {
      const expense: ExpenseItem = {
        id: "exp1",
        amount: 300,
        description: "Group Dinner",
        paidById: "u1",
        splitAmongIds: ["u1", "u2", "u3"],
        category: "food",
        date: "2026-07-04",
        splitType: "equal",
      };

      const actualTotal = getExpenseActualTotal(expense);
      expect(actualTotal).toBe(300);

      const u1Share = getExpenseShareForUser(expense, "u1");
      const u2Share = getExpenseShareForUser(expense, "u2");
      const u3Share = getExpenseShareForUser(expense, "u3");

      expect(u1Share).toBe(100);
      expect(u2Share).toBe(100);
      expect(u3Share).toBe(100);
      expect(u1Share + u2Share + u3Share).toBe(actualTotal);
    });

    it("should return 0 share for participants not included in the split", () => {
      const expense: ExpenseItem = {
        id: "exp2",
        amount: 200,
        description: "Shared Ride",
        paidById: "u1",
        splitAmongIds: ["u1", "u2"],
        category: "transit",
        date: "2026-07-04",
        splitType: "equal",
      };

      const u3Share = getExpenseShareForUser(expense, "u3");
      expect(u3Share).toBe(0);

      const u2Share = getExpenseShareForUser(expense, "u2");
      expect(u2Share).toBe(100);
    });
  });

  describe("Individual (Custom) Split Scenario", () => {
    it("should sum individual split amounts to equal getExpenseActualTotal", () => {
      const expense: ExpenseItem = {
        id: "exp3",
        amount: 250, // overall raw reference
        description: "Museum tickets with custom price tiers",
        paidById: "u2",
        splitAmongIds: ["u1", "u2", "u3"],
        category: "activities",
        date: "2026-07-04",
        splitType: "individual",
        individualAmounts: {
          u1: 50,  // Alice's ticket
          u2: 120, // Bob's ticket
          u3: 80,  // Charlie's ticket
        },
      };

      const actualTotal = getExpenseActualTotal(expense);
      expect(actualTotal).toBe(250); // custom sum 50 + 120 + 80 = 250

      const u1Share = getExpenseShareForUser(expense, "u1");
      const u2Share = getExpenseShareForUser(expense, "u2");
      const u3Share = getExpenseShareForUser(expense, "u3");

      expect(u1Share).toBe(50);
      expect(u2Share).toBe(120);
      expect(u3Share).toBe(80);
      expect(u1Share + u2Share + u3Share).toBe(actualTotal);
    });
  });

  describe("Tax Refund Calculations", () => {
    it("should calculate correct refund using absolute amount input", () => {
      const expense: ExpenseItem = {
        id: "exp4",
        amount: 1000,
        description: "Tax-Free Electronics Purchase",
        paidById: "u1",
        splitAmongIds: ["u1", "u2"],
        category: "shopping",
        date: "2026-07-04",
        splitType: "equal",
        taxRefundTotalAmount: 150, // Direct absolute refund
      };

      const actualTotal = getExpenseActualTotal(expense);
      expect(actualTotal).toBe(850); // 1000 - 150

      const u1Share = getExpenseShareForUser(expense, "u1");
      expect(u1Share).toBe(425); // 850 / 2
    });

    it("should calculate correct refund using percentage input with standard formula", () => {
      const expense: ExpenseItem = {
        id: "exp5",
        amount: 1100,
        description: "Duty-Free Shopping",
        paidById: "u1",
        splitAmongIds: ["u1", "u2"],
        category: "shopping",
        date: "2026-07-04",
        splitType: "equal",
        taxRefundPercent: 10, // 10% VAT-exclusive refund
      };

      // Base = 1100 / (1 + 0.1) = 1000
      // Refund = 1100 - 1000 = 100
      const actualTotal = getExpenseActualTotal(expense);
      expect(actualTotal).toBeCloseTo(1000, 2); // 1100 - 100 refund

      const u1Share = getExpenseShareForUser(expense, "u1");
      expect(u1Share).toBeCloseTo(500, 2); // 1000 / 2
    });

    it("should correctly deduct transaction fee if option is enabled", () => {
      const expense: ExpenseItem = {
        id: "exp6",
        amount: 1100,
        description: "Tax-free shopping with processing fee",
        paidById: "u3",
        splitAmongIds: ["u1", "u2", "u3"],
        category: "shopping",
        date: "2026-07-04",
        splitType: "equal",
        taxRefundPercent: 10, // Refund = 100
        taxRefundDeductFee: true,
        taxRefundFeePercent: 10, // 10% handling fee on refund (fee = 10)
      };

      // Base Refund = 1100 - (1100 / 1.1) = 100
      // Refund After Fee = 100 * (1 - 0.10) = 90
      // Actual Total = 1100 - 90 = 1010
      const actualTotal = getExpenseActualTotal(expense);
      expect(actualTotal).toBeCloseTo(1010, 2);
    });
  });

  describe("calculateSettleMatrix (3+ people reconciliation)", () => {
    it("should settle balances to 0 for all participants in multi-person transaction sets", () => {
      // Setup a complex debt circle:
      // Alice (u1) pays $300 for dinner split among Alice, Bob, Charlie (100 each)
      // Bob (u2) pays $150 for cab split among Alice, Bob, Charlie (50 each)
      // Charlie (u3) pays $90 for desserts split among Alice, Bob, Charlie (30 each)
      const expenses: ExpenseItem[] = [
        {
          id: "e1",
          amount: 300,
          description: "Dinner",
          paidById: "u1",
          splitAmongIds: ["u1", "u2", "u3"],
          category: "food",
          date: "2026-07-04",
          splitType: "equal",
        },
        {
          id: "e2",
          amount: 150,
          description: "Cab",
          paidById: "u2",
          splitAmongIds: ["u1", "u2", "u3"],
          category: "transit",
          date: "2026-07-04",
          splitType: "equal",
        },
        {
          id: "e3",
          amount: 90,
          description: "Desserts",
          paidById: "u3",
          splitAmongIds: ["u1", "u2", "u3"],
          category: "food",
          date: "2026-07-04",
          splitType: "equal",
        },
      ];

      // Initial net positions:
      // Alice: paid $300, owes $100 (dinner) + $50 (cab) + $30 (desserts) = $180. Net balance: +$120
      // Bob: paid $150, owes $100 (dinner) + $50 (cab) + $30 (desserts) = $180. Net balance: -$30
      // Charlie: paid $90, owes $100 (dinner) + $50 (cab) + $30 (desserts) = $180. Net balance: -$90

      const result = calculateSettleMatrix(expenses, participants);

      // Verify net initial balances match math
      expect(result.balances["u1"]).toBeCloseTo(120, 2);
      expect(result.balances["u2"]).toBeCloseTo(-30, 2);
      expect(result.balances["u3"]).toBeCloseTo(-90, 2);

      // Simulate peer-to-peer transaction settlements
      const settledBalances = { ...result.balances };

      result.transactions.forEach((tx) => {
        // tx.from pays tx.amount to tx.to
        settledBalances[tx.from] += tx.amount; // debtor reduces negative balance (adding positive)
        settledBalances[tx.to] -= tx.amount;   // creditor reduces positive balance (subtracting)
      });

      // After settling transactions, all balances should be exactly 0 (within 0.01 tolerance)
      participants.forEach((p) => {
        expect(settledBalances[p.id]).toBeLessThanOrEqual(0.01);
        expect(settledBalances[p.id]).toBeGreaterThanOrEqual(-0.01);
      });
    });
  });
});
