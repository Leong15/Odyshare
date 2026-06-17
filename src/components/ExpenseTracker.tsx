import React, { useState, useEffect } from "react";
import { Plus, Trash2, Users, ChevronRight, AlertCircle, CheckSquare, Square, DollarSign } from "lucide-react";
import { ExpenseItem, Participant } from "../types";
import { translations } from "../lib/translations";

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
  onInviteUser
}: ExpenseTrackerProps) {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>(activeUserId || participants[0]?.id || "");
  const [splitAmong, setSplitAmong] = useState<string[]>(participants.map(p => p.id));
  const [category, setCategory] = useState<ExpenseItem["category"]>("food");

  // Collapsible state metrics for the right-column auxiliary elements
  const [isBudgetCollapsed, setIsBudgetCollapsed] = useState<boolean>(false);
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState<boolean>(false);
  const [isMemberLimitsCollapsed, setIsMemberLimitsCollapsed] = useState<boolean>(false);
  const [isSettlementCollapsed, setIsSettlementCollapsed] = useState<boolean>(false);

  useEffect(() => {
    // On cellphones and tablets, default these widgets to collapsed to prevent massive vertical clutter
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsBudgetCollapsed(true);
      setIsPersonalCollapsed(true);
      setIsMemberLimitsCollapsed(true);
      setIsSettlementCollapsed(true);
    }
  }, []);

  // Mini edit state for individual user limits
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<string>("");

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !onInviteUser) return;
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);
    try {
      const res = await onInviteUser(inviteUsername.trim());
      if (res.success) {
        setInviteSuccess(lang === "zh" ? "🎉 成功拉入成員！" : "🎉 Travelers added successfully!");
        setInviteUsername("");
      } else {
        setInviteError(res.error || (lang === "zh" ? "找不到此帳號" : "User not found"));
      }
    } catch (err) {
      setInviteError(lang === "zh" ? "連接失敗" : "Server error");
    } finally {
      setIsInviting(false);
    }
  };

  const handleStartEditLimit = (pId: string, currentLimit: number) => {
    setEditingParticipantId(pId);
    setTempLimit(currentLimit.toString());
  };

  const handleSaveLimit = (pId: string) => {
    const limitNum = parseFloat(tempLimit);
    if (!isNaN(limitNum) && limitNum >= 0) {
      if (onUpdateParticipants) {
        const updated = participants.map(p => {
          if (p.id === pId) {
            return { ...p, budgetLimit: limitNum };
          }
          return p;
        });
        onUpdateParticipants(updated);
      }
    }
    setEditingParticipantId(null);
  };

  // Editable budget limit state
  const [editableBudget, setEditableBudget] = useState<number>(totalBudget);
  
  // Track unchecked expenses for custom split simulation
  const [uncheckedExpenseIds, setUncheckedExpenseIds] = useState<string[]>([]);

  useEffect(() => {
    setEditableBudget(totalBudget);
  }, [totalBudget]);

  const t = translations[lang];

  // Derive evaluated expenses list
  const activeExpenses = expenses.filter(exp => !uncheckedExpenseIds.includes(exp.id));

  const totalSpent = activeExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const remainingBudget = editableBudget - totalSpent;
  const percentageSpent = Math.min((totalSpent / editableBudget) * 100, 100);

  // Split calculations
  const calculateSettleMatrix = () => {
    const balances: { [key: string]: number } = {};
    participants.forEach(p => {
      balances[p.id] = 0;
    });

    activeExpenses.forEach(exp => {
      const parsedAmt = Number(exp.amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) return;

      balances[exp.paidById] = (balances[exp.paidById] || 0) + parsedAmt;

      const splitShare = parsedAmt / exp.splitAmongIds.length;
      exp.splitAmongIds.forEach(uid => {
        balances[uid] = (balances[uid] || 0) - splitShare;
      });
    });

    const creditors: { id: string; amount: number }[] = [];
    const debtors: { id: string; amount: number }[] = [];

    Object.keys(balances).forEach(uid => {
      const bal = balances[uid];
      if (bal > 0.01) {
        creditors.push({ id: uid, amount: bal });
      } else if (bal < -0.01) {
        debtors.push({ id: uid, amount: Math.abs(bal) });
      }
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];
    let cIdx = 0;
    let dIdx = 0;

    const cList = creditors.map(c => ({ ...c }));
    const dList = debtors.map(d => ({ ...d }));

    while (cIdx < cList.length && dIdx < dList.length) {
      const creditor = cList[cIdx];
      const debtor = dList[dIdx];

      const dealAmount = Math.min(creditor.amount, debtor.amount);
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: Math.round(dealAmount * 100) / 100
      });

      creditor.amount -= dealAmount;
      debtor.amount -= dealAmount;

      if (creditor.amount <= 0.01) cIdx++;
      if (debtor.amount <= 0.01) dIdx++;
    }

    return { balances, transactions };
  };

  const { balances, transactions } = calculateSettleMatrix();

  // Personal metrics logic: "合計支出總額要計上友人還錢後的數。"
  const calculatePersonalMetrics = () => {
    let paidByMe = 0;
    let myOwedShare = 0;

    activeExpenses.forEach(exp => {
      const parsedAmt = Number(exp.amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) return;

      if (exp.paidById === activeUserId) {
        paidByMe += parsedAmt;
      }
      if (exp.splitAmongIds.includes(activeUserId)) {
        myOwedShare += parsedAmt / exp.splitAmongIds.length;
      }
    });

    const netOwed = balances[activeUserId] || 0; // if positive, Leo gets back; if negative, Leo pays.
    const netSpentAdjusted = myOwedShare; // net consumption after repayments is exactly my owed share of what I truly consumed!

    return { paidByMe, myOwedShare, netOwed, netSpentAdjusted };
  };

  const { paidByMe, myOwedShare, netOwed, netSpentAdjusted } = calculatePersonalMetrics();

  const getParticipantAdjustedSpent = (userId: string) => {
    let owedShare = 0;
    activeExpenses.forEach(exp => {
      const parsedAmt = Number(exp.amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) return;
      if (exp.splitAmongIds.includes(userId)) {
        owedShare += parsedAmt / exp.splitAmongIds.length;
      }
    });
    return owedShare;
  };

  const handleToggleSplit = (uid: string) => {
    if (splitAmong.includes(uid)) {
      if (splitAmong.length > 1) {
        setSplitAmong(splitAmong.filter(id => id !== uid));
      }
    } else {
      setSplitAmong([...splitAmong, uid]);
    }
  };

  const handleToggleExpenseCheck = (id: string) => {
    if (uncheckedExpenseIds.includes(id)) {
      setUncheckedExpenseIds(uncheckedExpenseIds.filter(x => x !== id));
    } else {
      setUncheckedExpenseIds([...uncheckedExpenseIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!description || isNaN(numAmt) || numAmt <= 0) return;

    onAddExpense({
      amount: numAmt,
      description,
      paidById: paidBy,
      splitAmongIds: splitAmong,
      category,
      date: new Date().toISOString().split("T")[0]
    });

    setDescription("");
    setAmount("");
    setShowAddForm(false);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setEditableBudget(val);
    if (onUpdateBudget && val > 0) {
      onUpdateBudget(val);
    }
  };

  const getLocalizedCategoryName = (cat: string) => {
    switch (cat) {
      case "flight": return lang === "zh" ? "✈️ 機票航空" : "Flight";
      case "lodging": return lang === "zh" ? "🏨 旅宿飯店" : "Lodging";
      case "food": return lang === "zh" ? "🍱 餐飲美食" : "Food";
      case "activities": return lang === "zh" ? "🎡 景點行程" : "Activity";
      case "transit": return lang === "zh" ? "🚇 本地交通" : "Transit";
      case "shopping": return lang === "zh" ? "🛍️ 本地商鋪" : "Shopping";
      default: return lang === "zh" ? "📦 其他雜支" : "Other";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "flight": return "bg-blue-500/15 text-blue-300 border-blue-500/20";
      case "lodging": return "bg-purple-500/15 text-purple-300 border-purple-500/20";
      case "food": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
      case "activities": return "bg-pink-500/15 text-pink-300 border-pink-500/20";
      case "transit": return "bg-sky-500/15 text-sky-300 border-sky-500/20";
      case "shopping": return "bg-amber-500/15 text-amber-300 border-amber-500/20";
      default: return "bg-slate-500/15 text-slate-300 border-slate-500/20";
    }
  };

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || "Group Friend";
  };

  const getActiveUserFriendlyName = () => {
    return participants.find(p => p.id === activeUserId)?.name || "You";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Action Panel: Transaction History & Ledger (Now on the left/top for perfect mobile hierarchy) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-container rounded-2xl p-5 shadow-lg border border-white/10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
            <div>
              <h3 className="font-extrabold text-white text-sm">{t.groupTransactionLedger}</h3>
              <p className="text-xs text-slate-400">
                {lang === "zh" ? "勾選/取消勾選任意帳目，即時重新計算右側預算與拆帳結算書" : "Check/uncheck entries to recalculate splits & budgets dynamically"}
              </p>
            </div>
            <button
              id="add-expense-trigger"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 glass-button-primary text-white font-semibold text-xs py-2 px-3.5 rounded-xl cursor-pointer"
            >
              <Plus size={14} /> {t.addNewCost}
            </button>
          </div>

          {/* Add expense modal form dialog */}
          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-white/3 border border-white/10 p-4 rounded-xl space-y-4 text-xs animate-fadeIn mb-5"
            >
              <h4 className="font-extrabold text-white flex items-center justify-between border-b border-white/5 pb-2">
                <span>{t.inputSharedExpense}</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white font-semibold cursor-pointer"
                >
                  {lang === "zh" ? "取消" : "Cancel"}
                </button>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.expenseDesc}</label>
                  <input
                    id="expense-desc-input"
                    type="text"
                    required
                    placeholder="e.g., Shinjuku Ramen Lunch"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.costAmount}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
                    <input
                      id="expense-amount-input"
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g., 45.50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 pl-7 pr-3 py-2 rounded-xl text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.paidBy}</label>
                  <select
                    id="expense-payer-select"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full bg-slate-955 border border-white/10 rounded-xl px-3 py-2 text-white bg-slate-900 outline-none"
                  >
                    {participants.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.category}</label>
                  <select
                    id="expense-category-select"
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white bg-slate-900 outline-none"
                  >
                    <option value="food" className="bg-slate-900">🍱 {getLocalizedCategoryName("food")}</option>
                    <option value="activities" className="bg-slate-900">🎡 {getLocalizedCategoryName("activities")}</option>
                    <option value="lodging" className="bg-slate-900">🏨 {getLocalizedCategoryName("lodging")}</option>
                    <option value="transit" className="bg-slate-900">🚇 {getLocalizedCategoryName("transit")}</option>
                    <option value="flight" className="bg-slate-900">✈️ {getLocalizedCategoryName("flight")}</option>
                    <option value="shopping" className="bg-slate-900">🛍️ {getLocalizedCategoryName("shopping")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.splitRatioControl}</label>
                  <div className="p-2 border border-white/5 bg-white/5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{t.splittingWith} ({splitAmong.length})</span>
                    <div className="flex gap-1.5 font-sans">
                      {participants.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleToggleSplit(p.id)}
                          style={{ backgroundColor: splitAmong.includes(p.id) ? p.avatarColor : "transparent" }}
                          className={`w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center cursor-pointer transition-all border ${
                            !splitAmong.includes(p.id) ? "text-slate-500 border-white/10 hover:border-white/30" : "border-white/20"
                          }`}
                          title={p.name}
                        >
                          {p.name[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="submit-expense-btn"
                type="submit"
                className="w-full py-2.5 glass-button-primary text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                {t.postSplitLedgerEntry}
              </button>
            </form>
          )}

          {/* Ledger items list */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[450px] scrollbar-thin pr-1">
            {expenses.length === 0 ? (
              <div className="text-center py-16 bg-white/3 rounded-2xl border border-dashed border-white/5 p-4">
                <p className="text-xs text-slate-400">No active shared bills found. Click 'Add New Cost' to log some!</p>
              </div>
            ) : (
              [...expenses].reverse().map((expenseData) => {
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
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Checkbox selector */}
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

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border text-center font-mono shrink-0 ${getCategoryColor(expenseData.category)}`}>
                        {getLocalizedCategoryName(expenseData.category)}
                      </span>
                      
                      <div className="min-w-0 flex-1">
                        <h4 className={`font-extrabold truncate ${isChecked ? "text-white" : "text-slate-500 line-through"} text-[12.5px]`}>
                          {expenseData.description}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {t.paidBy}{" "}
                          <span className="font-bold text-slate-300">{getParticipantName(expenseData.paidById)}</span> • {t.dividedAmong} {expenseData.splitAmongIds.length}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className={`font-black font-mono text-xs sm:text-sm ${isChecked ? "text-white" : "text-slate-500 line-through"}`}>
                          ${Number(expenseData.amount).toFixed(2)}
                        </span>
                        <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{expenseData.date}</span>
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

      {/* Auxiliary Widgets (Now on the right column on desktop, and cleanly stacked/collapsible underneath on mobile) */}
      <div className="lg:col-span-1 space-y-4">
        
        {/* Widget 1: Dynamic Budget configuration summary */}
        <div className="glass-container rounded-2xl border border-white/10 shadow-lg animate-fadeIn overflow-hidden">
          {/* Header */}
          <div 
            onClick={() => setIsBudgetCollapsed(!isBudgetCollapsed)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ChevronRight 
                size={16} 
                className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${isBudgetCollapsed ? "" : "rotate-90"}`}
              />
              <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
                <span>{t.tripBudgetTracking}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {lang === "zh" ? "點擊展開預算與記帳統計" : "Interactive budget tracking limits"}
                </span>
              </h3>
            </div>
            
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="flex items-center gap-1 bg-slate-900/60 p-1 px-2 rounded-lg border border-white/5 shrink-0 ml-2"
            >
              <span className="text-[10px] font-bold text-slate-400 font-mono">Limit:</span>
              <input
                id="budget-limit-editor"
                type="number"
                value={editableBudget || ""}
                onChange={handleBudgetChange}
                className="w-16 bg-transparent border-0 font-extrabold text-blue-300 font-mono text-xs focus:ring-0 focus:outline-none p-0 text-right leading-none"
                placeholder="3000"
              />
            </div>
          </div>

          {/* Content */}
          {!isBudgetCollapsed && (
            <div className="p-4 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {lang === "zh" ? "已勾選總支出" : "Checked Total"}
                  </span>
                  <span className="text-lg font-black text-white font-mono">${totalSpent.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">{t.remaining}</span>
                  <span className={`text-lg font-black font-mono ${remainingBudget < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    ${remainingBudget.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded-full bg-white/5 border border-white/5">
                  <div
                    style={{ width: `${percentageSpent}%` }}
                    className={`flex flex-col text-center justify-center transition-all duration-500 rounded-full ${
                      percentageSpent > 90 ? "bg-rose-500" : percentageSpent > 75 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                  <span>{percentageSpent.toFixed(0)}% {t.utilized}</span>
                  {percentageSpent > 90 && <span className="text-rose-400 font-bold">{t.budgetAlert}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Widget 2: Personal Balance Tracker */}
        <div className="glass-container rounded-2xl border border-white/10 shadow-lg animate-fadeIn overflow-hidden bg-gradient-to-br from-white/2 to-white/0">
          {/* Header */}
          <div 
            onClick={() => setIsPersonalCollapsed(!isPersonalCollapsed)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ChevronRight 
                size={16} 
                className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${isPersonalCollapsed ? "" : "rotate-90"}`}
              />
              <DollarSign size={14} className="text-blue-400 shrink-0" />
              <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
                <span>{lang === "zh" ? `${getActiveUserFriendlyName()} 的個人對帳與實付` : `${getActiveUserFriendlyName()}'s Net Balances`}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {lang === "zh" ? "計入代付還款後的實付支出" : "Personal consumption & peer refund matrix"}
                </span>
              </h3>
            </div>
            
            {/* Minimalist summary indicator */}
            {isPersonalCollapsed && (
              <span className="text-[10.5px] font-bold text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/15 rounded-lg px-2 py-0.5 shrink-0 ml-2">
                ${netSpentAdjusted.toFixed(1)}
              </span>
            )}
          </div>

          {/* Content */}
          {!isPersonalCollapsed && (
            <div className="p-4 space-y-3 animate-fadeIn">
              <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "zh" ? "你代付的共享總額:" : "Total You Paid:"}</span>
                  <span className="text-slate-200">${paidByMe.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "zh" ? "你的個人應付分攤:" : "Your Fair Share Count:"}</span>
                  <span className="text-slate-200">${myOwedShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
                  <span className="text-slate-350">{lang === "zh" ? "對等友人結算差額:" : "Group Friend Balance:"}</span>
                  <span className={netOwed > 0.01 ? "text-emerald-400" : netOwed < -0.01 ? "text-rose-400" : "text-slate-400"}>
                    {netOwed > 0.01 ? `+${lang === "zh" ? "應收" : "Owed"} $${netOwed.toFixed(2)}` : netOwed < -0.01 ? `-${lang === "zh" ? "應還" : "Owe"} $${Math.abs(netOwed).toFixed(2)}` : "$0"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/15 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-200">{lang === "zh" ? "調整還錢後實際負擔額：" : "Your Adjusted Net Spent:"}</span>
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
        <div className="glass-container rounded-2xl border border-white/10 shadow-lg animate-fadeIn overflow-hidden">
          {/* Header */}
          <div 
            onClick={() => setIsMemberLimitsCollapsed(!isMemberLimitsCollapsed)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ChevronRight 
                size={16} 
                className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${isMemberLimitsCollapsed ? "" : "rotate-90"}`}
              />
              <Users size={14} className="text-indigo-400 shrink-0" />
              <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
                <span>{lang === "zh" ? "成員個人預算上限管理" : "Member Budget Limits"}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {lang === "zh" ? "點擊展開並設定個人上限" : "Set personal spending thresholds"}
                </span>
              </h3>
            </div>
            
            {/* Minimalist badging */}
            {isMemberLimitsCollapsed && (
              <span className="text-[10px] text-slate-350 font-bold bg-slate-800 border border-white/5 rounded-lg px-2 py-0.5 shrink-0 ml-2">
                {participants.length} pax
              </span>
            )}
          </div>

          {/* Content */}
          {!isMemberLimitsCollapsed && (
            <div className="p-4 space-y-4 animate-fadeIn">
              {onInviteUser && (
                <form 
                  onSubmit={handleInviteSubmit} 
                  onClick={(e) => e.stopPropagation()} 
                  className="bg-white/4 p-3 rounded-xl border border-white/5 space-y-2"
                >
                  <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                    {lang === "zh" ? "🚀 搜尋並拉入成員帳號 (Login ID)" : "🚀 Pull traveler into your workspace"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder={lang === "zh" ? "請輸入對方的 Login ID / 的用戶名..." : "Enter register username / Login ID..."}
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      className="flex-1 bg-slate-900/60 rounded-xl p-1.5 px-3 text-white text-xs placeholder:text-slate-500 border border-white/10 font-mono text-[11px] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs p-1.5 px-3 rounded-xl cursor-pointer transition-all shrink-0 font-sans"
                    >
                      {isInviting ? "..." : (lang === "zh" ? "邀請" : "Invite")}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-[10px] text-rose-450 font-bold font-mono animate-pulse">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-[10px] text-emerald-400 font-bold font-mono animate-pulse">{inviteSuccess}</p>
                  )}
                </form>
              )}
              
              <div className="space-y-3">
                {participants.map(p => {
                  const spent = getParticipantAdjustedSpent(p.id);
                  const limit = typeof p.budgetLimit === 'number' ? p.budgetLimit : 1500;
                  const ratio = Math.min((spent / limit) * 100, 100);
                  const isOver = spent > limit;
                  const isEditing = editingParticipantId === p.id;

                  return (
                    <div key={p.id} className="p-2.5 bg-white/3 border border-white/5 rounded-xl space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[10px]"
                            style={{ backgroundColor: p.avatarColor }}
                          >
                            {p.name[0]}
                          </div>
                          <span className="font-bold text-[11px] text-slate-200">
                            {p.name} {p.id === activeUserId && (lang === "zh" ? "(你)" : "(You)")}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-slate-400">$</span>
                            <input
                              type="number"
                              value={tempLimit}
                              onChange={(e) => setTempLimit(e.target.value)}
                              className="w-14 bg-slate-900/60 text-white rounded border border-white/20 p-0.5 px-1 font-mono text-[10px] text-center"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLimit(p.id);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveLimit(p.id)}
                              className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-0.5 px-1.5 rounded cursor-pointer"
                            >
                              {lang === "zh" ? "存" : "Ok"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditLimit(p.id, limit);
                            }}
                            className="text-[10.5px] text-blue-400 hover:text-blue-300 font-extrabold flex items-center gap-0.5 cursor-pointer font-sans"
                            title={lang === "zh" ? "點擊修改預算" : "Edit Budget limit"}
                          >
                            <span>${limit}</span>
                            <span className="text-[10px] opacity-70">📝</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9.5px] text-slate-400">
                          <span>{lang === "zh" ? "合計支出:" : "Total Spent:"} <strong className="text-slate-200 font-mono">${spent.toFixed(1)}</strong></span>
                          <span className={isOver ? "text-rose-450 font-bold" : "text-emerald-400 font-bold"}>
                            {ratio.toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="overflow-hidden h-1 text-xs flex rounded-full bg-white/5">
                          <div
                            style={{ width: `${ratio}%` }}
                            className={`rounded-full ${isOver ? "bg-rose-500" : ratio > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                          />
                        </div>
                        {isOver && (
                          <p className="text-[9px] text-rose-400 font-bold flex items-center gap-1 leading-none pt-0.5">
                            ⚠️ {lang === "zh" ? "已超預算上限！" : "Over limit!"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Widget 4: Automatic reimbursement settlements */}
        <div className="glass-container rounded-2xl border border-white/10 shadow-lg flex flex-col animate-fadeIn overflow-hidden">
          {/* Header */}
          <div 
            onClick={() => setIsSettlementCollapsed(!isSettlementCollapsed)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ChevronRight 
                size={16} 
                className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${isSettlementCollapsed ? "" : "rotate-90"}`}
              />
              <Users size={14} className="text-emerald-400 shrink-0" />
              <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
                <span>{t.automaticExpenseSplits}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {lang === "zh" ? "點擊展開自動拆帳還款方案" : "Minimized peer repayment route map"}
                </span>
              </h3>
            </div>
            
            {/* Minimalist summary badging */}
            {isSettlementCollapsed && (
              <span className={`text-[10px] font-bold rounded-lg px-2 py-0.5 shrink-0 ml-2 ${transactions.length === 0 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-300 bg-amber-500/10"}`}>
                {transactions.length === 0 ? (lang === "zh" ? "無欠款" : "Settled") : `${transactions.length} items`}
              </span>
            )}
          </div>

          {/* Content */}
          {!isSettlementCollapsed && (
            <div className="p-4 space-y-3 animate-fadeIn">
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed font-sans">
                {lang === "zh" ? "以左側勾選的帳目計出的自動化費用拆帳結算書：" : "Reconciliation settlement calculated live based on checked ledger entries:"}
              </p>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="py-6 text-center bg-white/3 rounded-xl border border-dashed border-white/5">
                    <p className="text-xs text-slate-400 font-sans">{t.ledgerReconciled}</p>
                  </div>
                ) : (
                  transactions.map((transaction, idx) => (
                    <div
                      key={idx}
                      className="bg-white/3 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs animate-fadeIn"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <span className="text-white">{getParticipantName(transaction.from)}</span>
                        <ChevronRight size={12} className="text-slate-500" />
                        <span className="text-white">{getParticipantName(transaction.to)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-white font-mono">${transaction.amount.toFixed(2)}</span>
                        <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">{t.reimburse}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-center text-[10px]">
                {participants.map(p => {
                  const b = balances[p.id] || 0;
                  return (
                    <div key={p.id} className="p-2 bg-white/3 rounded-lg border border-white/5 font-sans">
                      <span className="font-bold text-slate-400 block truncate">{p.name}</span>
                      <span className={`font-mono font-bold ${b > 0.01 ? "text-emerald-400" : b < -0.01 ? "text-rose-400" : "text-slate-500"}`}>
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
    </div>
  );
}
