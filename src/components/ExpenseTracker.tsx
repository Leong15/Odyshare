import React, { useState, useEffect } from "react";
import { Plus, Trash2, Users, ChevronRight, CheckSquare, Square, DollarSign } from "lucide-react";
import { ExpenseItem, Participant } from "../types";
import { translations } from "../lib/translations";
import SettlementModal from "./SettlementModal";
import { getCategoryLabel, getCategoryBadgeClasses } from "../utils/categoryUtils";
import {
  getExpenseActualTotal,
  calculateSettleMatrix,
  calculatePersonalMetrics,
  getParticipantAdjustedSpent,
} from "../utils/expensecalculator";

import ExpenseForm from "./expense/ExpenseForm";
import BudgetSummaryWidget from "./expense/BudgetSummaryWidget";
import MemberLimitsWidget from "./expense/MemberLimitsWidget";

interface ExpenseTrackerProps {
  expenses: ExpenseItem[];
  participants: Participant[];
  totalBudget: number;
  onAddExpense: (expense: Omit<ExpenseItem, "id">) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateBudget?: (newBudget: number) => void;
  onUpdateParticipants?: (updated: Participant[]) => void;
  activeUserId?: string;
  lang?: "en" | "zh";
  onInviteUser?: (username: string) => Promise<{ success: boolean; error?: string }>;
  onInviteExternalUser?: (name: string) => Promise<{ success: boolean; error?: string }>;
  onUpgradeExternalUser?: (externalId: string, targetUsername: string) => Promise<{ success: boolean; error?: string }>;
}

export default function ExpenseTracker({
  expenses,
  participants,
  totalBudget,
  onAddExpense,
  onDeleteExpense,
  onUpdateBudget,
  onUpdateParticipants,
  activeUserId = "u1",
  lang = "en",
  onInviteUser,
  onInviteExternalUser,
  onUpgradeExternalUser,
}: ExpenseTrackerProps) {
  const t = translations[lang];

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState<boolean>(false);
  const [isSettlementCollapsed, setIsSettlementCollapsed] = useState<boolean>(false);
  const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false);
  const [uncheckedExpenseIds, setUncheckedExpenseIds] = useState<string[]>([]);

  interface SettleSnapshot {
    balances: Record<string, number>;
    transactions: Array<{ from: string; to: string; amount: number }>;
    uncheckedExpenseIds: string[];
    timestamp: string;
  }

  const [lockedSnapshot, setLockedSnapshot] = useState<SettleSnapshot | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsPersonalCollapsed(true);
      setIsSettlementCollapsed(true);
    }
  }, []);

  const handleToggleExpenseCheck = (id: string) => {
    if (uncheckedExpenseIds.includes(id)) {
      setUncheckedExpenseIds(uncheckedExpenseIds.filter((x) => x !== id));
    } else {
      setUncheckedExpenseIds([...uncheckedExpenseIds, id]);
    }
  };

  // Live split calculations
  const liveCalculations = calculateSettleMatrix(expenses, participants, new Set(uncheckedExpenseIds));

  // Determine active parameters based on whether we are viewing a locked simulation snapshot
  const balances = lockedSnapshot ? lockedSnapshot.balances : liveCalculations.balances;
  const transactions = lockedSnapshot ? lockedSnapshot.transactions : liveCalculations.transactions;
  const effectiveUncheckedIds = lockedSnapshot ? lockedSnapshot.uncheckedExpenseIds : uncheckedExpenseIds;

  const activeExpenses = expenses.filter((exp) => !effectiveUncheckedIds.includes(exp.id));
  const totalSpent = activeExpenses.reduce((sum, exp) => sum + getExpenseActualTotal(exp), 0);

  // Personal metrics
  const { paidByMe, myOwedShare, netOwed, netSpentAdjusted } = calculatePersonalMetrics(
    expenses,
    activeUserId,
    balances,
    new Set(effectiveUncheckedIds)
  );

  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || "Group Friend";
  };

  const getActiveUserFriendlyName = () => {
    return participants.find((p) => p.id === activeUserId)?.name || "You";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[repeat(3,minmax(0,1fr))] gap-6">
      {/* Primary Action Panel: Transaction Ledger */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-container rounded-2xl p-6 md:p-8 shadow-lg border border-white/10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4 text-left">
            <div>
              <h3 className="font-extrabold text-white text-sm">{t.groupTransactionLedger}</h3>
              <p className="text-xs text-slate-400">
                {lang === "zh"
                  ? "勾選/取消勾選任意帳目，即時重新計算右側預算與拆帳結算書"
                  : "Check/uncheck entries to recalculate splits & budgets dynamically"}
              </p>
            </div>
            <button
              id="add-expense-trigger"
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] md:text-xs h-12 md:h-9 px-4 rounded-xl cursor-pointer shadow transition-all active:scale-[0.98]"
            >
              <Plus size={14} /> {t.addNewCost}
            </button>
          </div>

          {/* Add expense form Overlay */}
          {showAddForm && (
            <ExpenseForm
              participants={participants}
              activeUserId={activeUserId}
              lang={lang}
              onSubmit={(expense) => onAddExpense(expense)}
              onClose={() => setShowAddForm(false)}
            />
          )}

          {/* Ledger Items List */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[450px] scrollbar-thin pr-1">
            {expenses.length === 0 ? (
              <div className="text-center py-16 bg-white/3 rounded-2xl border border-dashed border-white/5 p-4">
                <p className="text-xs text-slate-400">
                  No active shared bills found. Click 'Add New Cost' to log some!
                </p>
              </div>
            ) : (
              [...expenses]
                .reverse()
                .map((expenseData) => {
                  const isChecked = !uncheckedExpenseIds.includes(expenseData.id);
                  return (
                    <div
                      key={expenseData.id}
                      id={`expense-item-${expenseData.id}`}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all text-xs ${
                        isChecked
                          ? "bg-white/3 border-white/5 hover:bg-white/6"
                          : "bg-white/1 border-dashed border-white/3 opacity-55 hover:bg-white/3"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                        {/* Checkbox Selector */}
                        <button
                          type="button"
                          onClick={() => handleToggleExpenseCheck(expenseData.id)}
                          className="text-slate-400 hover:text-white shrink-0 p-1 rounded hover:bg-white/5 cursor-pointer"
                          title={isChecked ? "Remove from calculations" : "Include in calculations"}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-blue-400" />
                          ) : (
                            <Square size={16} className="text-slate-500" />
                          )}
                        </button>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border text-center font-mono shrink-0 ${getCategoryBadgeClasses(
                            expenseData.category
                          )}`}
                        >
                          {getCategoryLabel(expenseData.category, lang)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <h4
                              className={`font-extrabold truncate ${
                                isChecked ? "text-white" : "text-slate-500 line-through"
                              } text-[12.5px]`}
                            >
                              {expenseData.description}
                            </h4>
                            {expenseData.splitType === "individual" && (
                              <span className="bg-purple-500/15 text-purple-300 border border-purple-500/10 text-[9px] px-1 py-0.2 rounded shrink-0">
                                {lang === "zh" ? "個別自付" : "Individual Split"}
                              </span>
                            )}
                            {(expenseData.taxRefundTotalAmount || expenseData.taxRefundPercent) && (
                              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/10 text-[9px] px-1 py-0.2 rounded font-mono shrink-0">
                                {lang === "zh" ? "已退稅" : "Tax Off"}{" "}
                                {expenseData.taxRefundTotalAmount
                                  ? `$${expenseData.taxRefundTotalAmount}`
                                  : `${expenseData.taxRefundPercent}%`}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {t.paidBy}{" "}
                            <span className="font-bold text-slate-300">
                              {getParticipantName(expenseData.paidById)}
                            </span>{" "}
                            • {t.dividedAmong} {expenseData.splitAmongIds.length}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                        <div className="text-left sm:text-right">
                          {(() => {
                            const actTotal = getExpenseActualTotal(expenseData);
                            const hasBonus = actTotal !== Number(expenseData.amount);
                            return (
                              <>
                                <span
                                  className={`font-black font-mono text-xs sm:text-sm block ${
                                    isChecked ? "text-white" : "text-slate-500 line-through"
                                  }`}
                                >
                                  ${actTotal.toFixed(2)}
                                </span>
                                {hasBonus && (
                                  <span className="block text-[10px] text-slate-500 line-through font-mono">
                                    ${Number(expenseData.amount).toFixed(2)}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                            {expenseData.date}
                          </span>
                        </div>

                        <button
                          id={`delete-expense-btn-${expenseData.id}`}
                          onClick={() => onDeleteExpense(expenseData.id)}
                          className="p-1 px-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg cursor-pointer transition-all"
                          title={t.deleteExpense}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Auxiliary Widgets */}
      <div className="lg:col-span-1 space-y-4">
        {/* Widget 1: Dynamic Budget Tracker */}
        <BudgetSummaryWidget
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          lang={lang}
          onUpdateBudget={onUpdateBudget}
        />

        {/* Widget 2: Personal Balance Tracker */}
        <div className="glass-container rounded-2xl border border-white/10 shadow-lg animate-fadeIn overflow-hidden bg-gradient-to-br from-white/2 to-white/0">
          <div
            onClick={() => setIsPersonalCollapsed(!isPersonalCollapsed)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
              <ChevronRight
                size={16}
                className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${
                  isPersonalCollapsed ? "" : "rotate-90"
                }`}
              />
              <DollarSign size={14} className="text-blue-400 shrink-0" />
              <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
                <span>
                  {lang === "zh"
                    ? `${getActiveUserFriendlyName()} 的個人對帳與實付`
                    : `${getActiveUserFriendlyName()}'s Net Balances`}
                </span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {lang === "zh" ? "計入代付還款後的實付支出" : "Personal consumption & peer refund matrix"}
                </span>
              </h3>
            </div>

            {isPersonalCollapsed && (
              <span className="text-[10.5px] font-bold text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/15 rounded-lg px-2 py-0.5 shrink-0 ml-2 animate-fadeIn">
                ${netSpentAdjusted.toFixed(1)}
              </span>
            )}
          </div>

          {!isPersonalCollapsed && (
            <div className="p-4 space-y-3 animate-fadeIn text-left">
              <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "zh" ? "你代付的共享總額:" : "Total You Paid:"}</span>
                  <span className="text-slate-200">${paidByMe.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {lang === "zh" ? "你的個人應付分攤:" : "Your Fair Share Count:"}
                  </span>
                  <span className="text-slate-200">${myOwedShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
                  <span className="text-slate-350">{lang === "zh" ? "對等友人結算差額:" : "Group Friend Balance:"}</span>
                  <span
                    className={netOwed > 0.01 ? "text-emerald-400" : netOwed < -0.01 ? "text-rose-400" : "text-slate-400"}
                  >
                    {netOwed > 0.01
                      ? `+${lang === "zh" ? "應收" : "Owed"} $${netOwed.toFixed(2)}`
                      : netOwed < -0.01
                      ? `-${lang === "zh" ? "應還" : "Owe"} $${Math.abs(netOwed).toFixed(2)}`
                      : "$0"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/15 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-200">
                    {lang === "zh" ? "調整還錢後實際負擔額：" : "Your Adjusted Net Spent:"}
                  </span>
                  <span className="text-sm font-black text-emerald-300 font-mono">${netSpentAdjusted.toFixed(2)}</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-relaxed mt-1 font-sans">
                  {lang === "zh"
                    ? "💡 這是計入代付返還/收取款項後的實際旅費消費額 (合計支出總額)。"
                    : "💡 This represents your absolute actual expenditure after accounting for friend reimbursements."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Widget 3: Member Limits Manager */}
        <MemberLimitsWidget
          participants={participants}
          expenses={expenses}
          uncheckedExpenseIds={uncheckedExpenseIds}
          activeUserId={activeUserId}
          lang={lang}
          onUpdateParticipants={onUpdateParticipants}
          onInviteUser={onInviteUser}
          onInviteExternalUser={onInviteExternalUser}
          onUpgradeExternalUser={onUpgradeExternalUser}
        />

        {/* Widget 4: Automatic Settlements */}
        <div className="glass-container rounded-2xl border border-white/10 shadow-lg flex flex-col animate-fadeIn overflow-hidden bg-gradient-to-br from-white/2 to-white/0">
          <div
            onClick={() => setIsSettlementCollapsed(!isSettlementCollapsed)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
              <ChevronRight
                size={16}
                className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${
                  isSettlementCollapsed ? "" : "rotate-90"
                }`}
              />
              <Users size={14} className="text-emerald-400 shrink-0" />
              <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
                <span>{t.automaticExpenseSplits}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {lang === "zh" ? "點擊展開自動拆帳還款方案" : "Minimized peer repayment route map"}
                </span>
              </h3>
            </div>

            {isSettlementCollapsed && (
              <span
                className={`text-[10px] font-bold rounded-lg px-2 py-0.5 shrink-0 ml-2 animate-fadeIn ${
                  transactions.length === 0 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-300 bg-amber-500/10"
                }`}
              >
                {transactions.length === 0 ? lang === "zh" ? "無欠款" : "Settled" : `${transactions.length} items`}
              </span>
            )}
          </div>

          {!isSettlementCollapsed && (
            <div className="p-4 space-y-4 animate-fadeIn text-left">
              {/* Simulation Mode / Settlement Snapshot Filter */}
              <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-300 ${
                lockedSnapshot 
                  ? "bg-amber-500/10 border-amber-500/20" 
                  : "bg-white/3 border-white/5"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${lockedSnapshot ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                    <span className="text-[11px] font-extrabold text-slate-200">
                      {lockedSnapshot 
                        ? (lang === "zh" ? "模擬鎖定模式 (Simulation Snapshot)" : "Simulation Snapshot Locked")
                        : (lang === "zh" ? "即時拆帳模式 (Real-time Split)" : "Real-time Split Mode")
                      }
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-[280px] sm:max-w-[420px]">
                    {lockedSnapshot
                      ? (lang === "zh" 
                          ? `已鎖定於 ${lockedSnapshot.timestamp} 的結算快照。後續記帳異動不會干擾此還款方案。`
                          : `Snapshot locked on ${lockedSnapshot.timestamp}. Subsequent ledger edits won't disrupt this view.`)
                      : (lang === "zh"
                          ? "記帳、退稅或勾選狀態若有異動，下方拆帳矩陣將會即時動態重新計算。"
                          : "Calculated dynamically in real-time as you check/uncheck ledger items or add new bills.")
                    }
                  </p>
                </div>

                {lockedSnapshot ? (
                  <button
                    type="button"
                    onClick={() => setLockedSnapshot(null)}
                    className="h-8 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 font-bold rounded-lg text-[10.5px] cursor-pointer flex items-center gap-1 transition shrink-0"
                  >
                    <span>🔓 {lang === "zh" ? "解除鎖定" : "Unlock Live"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      setLockedSnapshot({
                        balances: { ...balances },
                        transactions: [...transactions],
                        uncheckedExpenseIds: [...uncheckedExpenseIds],
                        timestamp: timeStr,
                      });
                    }}
                    className="h-8 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-lg text-[10.5px] cursor-pointer flex items-center gap-1 transition shrink-0"
                  >
                    <span>🔒 {lang === "zh" ? "鎖定快照" : "Save Snapshot"}</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mb-1 leading-relaxed font-sans">
                {lang === "zh"
                  ? "以左側勾選的帳目計出的自動化費用拆帳結算書："
                  : "Reconciliation settlement calculated live based on checked ledger entries:"}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl mb-3">
                <div className="text-[10.5px] text-indigo-300 font-bold leading-relaxed max-w-[75%]">
                  {lang === "zh"
                    ? "結算完成！可一鍵導出精美 HTML/PDF 結帳收據，並為台灣(街口/LINE Pay)與香港(FPS)自動生成還款二維碼。"
                    : "Settlement complete! Generate printable receipts & customized payment links (LINE Pay, Jkopay, FPS) for your companions."}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(true)}
                  className="h-12 sm:h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-lg text-[10.5px] flex items-center justify-center gap-1 shrink-0 self-end sm:self-auto"
                >
                  <Users size={12} />
                  <span>{lang === "zh" ? "匯出結算與繳費" : "Export & Repay"}</span>
                </button>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="py-6 text-center bg-white/3 rounded-xl border border-dashed border-white/5">
                    <p className="text-xs text-slate-400 font-sans">{t.ledgerReconciled}</p>
                  </div>
                ) : (
                  transactions.map((transaction, idx) => (
                    <div
                      key={idx}
                      className="bg-white/3 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs animate-fadeIn text-left"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <span className="text-white">{getParticipantName(transaction.from)}</span>
                        <ChevronRight size={12} className="text-slate-500" />
                        <span className="text-white">{getParticipantName(transaction.to)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-white font-mono">${transaction.amount.toFixed(2)}</span>
                        <span className="block text-xs text-slate-500 uppercase tracking-wider font-extrabold">
                          {t.reimburse}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 text-center text-xs">
                {participants.map((p) => {
                  const b = balances[p.id] || 0;
                  return (
                    <div key={p.id} className="p-2 bg-white/3 rounded-lg border border-white/5 font-sans">
                      <span className="font-bold text-slate-400 block truncate">{p.name}</span>
                      <span
                        className={`font-mono font-bold ${
                          b > 0.01 ? "text-emerald-400" : b < -0.01 ? "text-rose-400" : "text-slate-500"
                        }`}
                      >
                        {b > 0.01 ? `+$${b.toFixed(0)}` : b < -0.01 ? `-$${Math.abs(b).toFixed(0)}` : "$0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        expenses={activeExpenses}
        participants={participants}
        transactions={transactions}
        balances={balances}
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        lang={lang}
      />
    </div>
  );
}
