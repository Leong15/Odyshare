/**
 * Expense calculation utilities
 * Extracted from ExpenseTracker.tsx so logic can be tested independently
 * and reused across components (e.g. TripDashboard summary widgets).
 */

import type { ExpenseItem, Participant } from "../types";

// ---------------------------------------------------------------------------
// Per-expense helpers
// ---------------------------------------------------------------------------

/**
 * Returns the actual total cost of an expense after applying any tax refund
 * or discount that was recorded at the time of entry.
 */
export function getExpenseActualTotal(exp: ExpenseItem): number {
  const parsedAmt = Number(exp.amount) || 0;
  const splitAmongIds = exp.splitAmongIds || [];

  let rawTotal = parsedAmt;

  if (exp.splitType === "individual") {
    const indAmts = exp.individualAmounts || {};
    const specifiedSum = splitAmongIds.reduce((s, id) => s + (Number(indAmts[id]) || 0), 0);
    if (specifiedSum > 0) rawTotal = specifiedSum;
  }

  const refundAmt = getRefundAmount(rawTotal, exp);
  return Math.max(0, rawTotal - refundAmt);
}

/**
 * Returns the share of an expense owed by a specific user, after refunds.
 */
export function getExpenseShareForUser(exp: ExpenseItem, uid: string): number {
  const splitAmongIds = exp.splitAmongIds || [];
  if (!splitAmongIds.includes(uid)) return 0;

  const parsedAmt = Number(exp.amount) || 0;

  let rawTotal = parsedAmt;
  let individualRawAmt = 0;

  if (exp.splitType === "individual") {
    const indAmts = exp.individualAmounts || {};
    const specifiedSum = splitAmongIds.reduce((s, id) => s + (Number(indAmts[id]) || 0), 0);
    if (specifiedSum > 0) {
      rawTotal = specifiedSum;
      individualRawAmt = Number(indAmts[uid]) || 0;
    } else {
      individualRawAmt = parsedAmt / splitAmongIds.length;
    }
  } else {
    individualRawAmt = parsedAmt / splitAmongIds.length;
  }

  const refundAmt = getRefundAmount(rawTotal, exp);
  const actualTotal = Math.max(0, rawTotal - refundAmt);
  if (rawTotal <= 0) return 0;

  return individualRawAmt * (actualTotal / rawTotal);
}

/** Helper — calculates refund/discount amount from expense metadata. */
export function getRefundAmount(rawTotal: number, exp: Partial<ExpenseItem>): number {
  if (exp.taxRefundTotalAmount !== undefined && Number(exp.taxRefundTotalAmount) > 0) {
    return Number(exp.taxRefundTotalAmount);
  }
  if (exp.taxRefundPercent !== undefined && Number(exp.taxRefundPercent) > 0) {
    // VAT-exclusive Tax-Free Refund: use the total after tax-refund (pre-tax amount B) as the base:
    // B = rawTotal / (1 + percent / 100)
    // Refund = rawTotal - B
    const pct = Number(exp.taxRefundPercent);
    const postRefundTotal = rawTotal / (1 + pct / 100);
    let refund = rawTotal - postRefundTotal;

    if (exp.taxRefundDeductFee) {
      const feePct = exp.taxRefundFeePercent !== undefined ? Number(exp.taxRefundFeePercent) : 1.5;
      refund = refund * (1 - feePct / 100);
    }
    return refund;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Settlement matrix
// ---------------------------------------------------------------------------

export interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface SettlementResult {
  balances: Record<string, number>;
  transactions: SettlementTransaction[];
}

/**
 * Calculates the minimum set of peer-to-peer transfers needed to settle all
 * shared expenses among the given participants.
 *
 * Uses a greedy creditor-vs-debtor matching algorithm:
 * repeatedly pair the largest creditor with the largest debtor until balanced.
 */
export function calculateSettleMatrix(
  expenses: ExpenseItem[],
  participants: Participant[],
  excludedIds: Set<string> = new Set()
): SettlementResult {
  const balances: Record<string, number> = {};
  participants.forEach((p) => (balances[p.id] = 0));

  const activeExpenses = expenses.filter((e) => !excludedIds.has(e.id));

  activeExpenses.forEach((exp) => {
    const actualTotal = getExpenseActualTotal(exp);
    if (actualTotal <= 0) return;

    balances[exp.paidById] = (balances[exp.paidById] || 0) + actualTotal;

    exp.splitAmongIds.forEach((uid) => {
      const share = getExpenseShareForUser(exp, uid);
      balances[uid] = (balances[uid] || 0) - share;
    });
  });

  // 1. Adjust initial balances to sum to exactly 0 (absorb rounding/floating discrepancies)
  // We attribute any tiny residue to the person who paid the most net (largest creditor)
  let largestCreditorId = "";
  let maxBal = -Infinity;
  Object.entries(balances).forEach(([uid, bal]) => {
    if (bal > maxBal) {
      maxBal = bal;
      largestCreditorId = uid;
    }
  });

  let sumOfBalances = 0;
  Object.values(balances).forEach((bal) => {
    sumOfBalances += bal;
  });

  if (largestCreditorId && Math.abs(sumOfBalances) > 0.0001) {
    balances[largestCreditorId] -= sumOfBalances;
  }

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([uid, bal]) => {
    if (bal > 0.01) creditors.push({ id: uid, amount: bal });
    else if (bal < -0.01) debtors.push({ id: uid, amount: Math.abs(bal) });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];
  const cList = creditors.map((c) => ({ ...c }));
  const dList = debtors.map((d) => ({ ...d }));

  let ci = 0;
  let di = 0;
  while (ci < cList.length && di < dList.length) {
    const creditor = cList[ci];
    const debtor = dList[di];

    const isLastPair = (cList.length - ci === 1) && (dList.length - di === 1);
    let deal = Math.min(creditor.amount, debtor.amount);

    if (isLastPair) {
      const diff = Math.abs(creditor.amount - debtor.amount);
      if (diff <= 1.0) {
        // Automatically reconcile rounding/tail-end error (<= 1.0) by matching the final debtor and creditor perfectly
        deal = creditor.amount;
      }
    }

    transactions.push({ from: debtor.id, to: creditor.id, amount: Math.round(deal * 100) / 100 });

    creditor.amount -= deal;
    debtor.amount -= deal;

    if (isLastPair && Math.abs(creditor.amount - debtor.amount) <= 1.0) {
      creditor.amount = 0;
      debtor.amount = 0;
    }

    if (creditor.amount <= 0.01) ci++;
    if (debtor.amount <= 0.01) di++;
  }

  return { balances, transactions };
}

// ---------------------------------------------------------------------------
// Personal balance helpers
// ---------------------------------------------------------------------------

export interface PersonalMetrics {
  paidByMe: number;
  myOwedShare: number;
  netOwed: number;
  netSpentAdjusted: number;
}

export function calculatePersonalMetrics(
  expenses: ExpenseItem[],
  activeUserId: string,
  balances: Record<string, number>,
  excludedIds: Set<string> = new Set()
): PersonalMetrics {
  let paidByMe = 0;
  let myOwedShare = 0;

  expenses
    .filter((e) => !excludedIds.has(e.id))
    .forEach((exp) => {
      const actualTotal = getExpenseActualTotal(exp);
      const share = getExpenseShareForUser(exp, activeUserId);

      if (exp.paidById === activeUserId) paidByMe += actualTotal;
      myOwedShare += share;
    });

  const netOwed = balances[activeUserId] || 0;

  return { paidByMe, myOwedShare, netOwed, netSpentAdjusted: myOwedShare };
}

export function getParticipantAdjustedSpent(
  expenses: ExpenseItem[],
  userId: string,
  excludedIds: Set<string> = new Set()
): number {
  return expenses
    .filter((e) => !excludedIds.has(e.id))
    .reduce((sum, exp) => sum + getExpenseShareForUser(exp, userId), 0);
}

// ---------------------------------------------------------------------------
// Total spent (respects excluded entries)
// ---------------------------------------------------------------------------

export function getTotalSpent(
  expenses: ExpenseItem[],
  excludedIds: Set<string> = new Set()
): number {
  return expenses
    .filter((e) => !excludedIds.has(e.id))
    .reduce((sum, exp) => sum + getExpenseActualTotal(exp), 0);
}