import React, { useState, useEffect } from "react";
import { Plus, Trash2, Users, ChevronRight, AlertCircle, CheckSquare, Square, DollarSign } from "lucide-react";
import { ExpenseItem, Participant } from "../types";
import { translations } from "../lib/translations";
import SettlementModal from "./SettlementModal";
import {
  getExpenseActualTotal,
  getExpenseShareForUser,
  calculateSettleMatrix,
  calculatePersonalMetrics,
  getParticipantAdjustedSpent,
  getTotalSpent
} from "../utils/expensecalculator";

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
  const [ocrInput, setOcrInput] = useState<string>("");
  const [ocrParsing, setOcrParsing] = useState<boolean>(false);

  // Collapsible state metrics for the right-column auxiliary elements
  const [isBudgetCollapsed, setIsBudgetCollapsed] = useState<boolean>(false);
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState<boolean>(false);
  const [isMemberLimitsCollapsed, setIsMemberLimitsCollapsed] = useState<boolean>(false);
  const [isSettlementCollapsed, setIsSettlementCollapsed] = useState<boolean>(false);
  const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false);

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

  const [splitType, setSplitType] = useState<'equal' | 'individual'>('equal');
  const [individualAmounts, setIndividualAmounts] = useState<Record<string, string>>({});
  const [taxRefundPercent, setTaxRefundPercent] = useState<string>("");
  const [taxRefundTotalAmount, setTaxRefundTotalAmount] = useState<string>("");

  // Derive evaluated expenses list
  const activeExpenses = expenses.filter(exp => !uncheckedExpenseIds.includes(exp.id));

  const totalSpent = activeExpenses.reduce((sum, exp) => sum + getExpenseActualTotal(exp), 0);
  const remainingBudget = editableBudget - totalSpent;
  const percentageSpent = Math.min((totalSpent / editableBudget) * 100, 100);

  // Split calculations via central utility
  const { balances, transactions } = calculateSettleMatrix(expenses, participants, new Set(uncheckedExpenseIds));

  // Personal metrics logic via central utility
  const { paidByMe, myOwedShare, netOwed, netSpentAdjusted } = calculatePersonalMetrics(
    expenses,
    activeUserId,
    balances,
    new Set(uncheckedExpenseIds)
  );

  const getParticipantAdjustedSpentLocal = (userId: string) => {
    return getParticipantAdjustedSpent(expenses, userId, new Set(uncheckedExpenseIds));
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

  const handleReceiptOcrSubmit = async () => {
    if (!ocrInput.trim()) return;
    setOcrParsing(true);
    try {
      const res = await fetch("/api/ai/ocr-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptText: ocrInput })
      });
      const data = await res.json();
      if (data && data.amount != null) {
        setDescription(data.description || "🧾 OCR Receipt Expense");
        setAmount(data.amount.toString());
        setCategory(data.category || "food");
        setOcrInput("");
      }
    } catch (err) {
      console.error("Receipt OCR failed:", err);
    } finally {
      setOcrParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let numAmt = parseFloat(amount) || 0;
    const finalIndividualAmounts: Record<string, number> = {};
    
    if (splitType === 'individual') {
      let sum = 0;
      splitAmong.forEach(id => {
        const val = parseFloat(individualAmounts[id]) || 0;
        finalIndividualAmounts[id] = val;
        sum += val;
      });
      numAmt = sum;
    }

    if (!description || numAmt <= 0) {
      return;
    }

    onAddExpense({
      amount: numAmt,
      description,
      paidById: paidBy,
      splitAmongIds: splitAmong,
      category,
      date: new Date().toISOString().split("T")[0],
      splitType,
      individualAmounts: splitType === 'individual' ? finalIndividualAmounts : undefined,
      taxRefundPercent: taxRefundPercent ? parseFloat(taxRefundPercent) : undefined,
      taxRefundTotalAmount: taxRefundTotalAmount ? parseFloat(taxRefundTotalAmount) : undefined
    });

    setDescription("");
    setAmount("");
    setIndividualAmounts({});
    setTaxRefundPercent("");
    setTaxRefundTotalAmount("");
    setSplitType("equal");
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

              {/* 🧾 AI Receipt Scanner OCR Panel */}
              <div className="bg-white/4 border border-white/5 rounded-xl p-3.5 mb-2.5 text-xs text-left select-none animate-fadeIn flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <span>🧾</span>
                    <span>{lang === "zh" ? "AI 智慧實體收據辨識 (OCR)" : "AI Smart Receipt OCR Scanner"}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Powered by Gemini</span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  {lang === "zh" 
                    ? "在國外拿到實體紙本發票時，可在此貼上收據明細、貼上 base64 圖片，AI 將自動辨識總金額、品項、消費類別，快速完成記帳！" 
                    : "When you get physical receipts in Japan or Europe, paste details or mock-upload below. AI will auto-extract total amount, currency, and category!"}
                </p>

                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <input
                    type="text"
                    placeholder={lang === "zh" ? "貼上收據文字或簡介..." : "Paste receipt text details..."}
                    value={ocrInput}
                    onChange={(e) => setOcrInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white outline-none"
                  />

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleReceiptOcrSubmit}
                      disabled={ocrParsing || !ocrInput.trim()}
                      className="py-1.5 px-3 bg-emerald-600/90 hover:bg-emerald-650 border border-emerald-500/15 text-white font-semibold rounded-lg text-[10.5px] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1 shrink-0"
                    >
                      {ocrParsing ? (
                        <>
                          <span className="animate-spin text-white">⏳</span>
                          <span>{lang === "zh" ? "辨識中..." : "Extracting..."}</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>{lang === "zh" ? "智慧一鍵辨識" : "Scan Receipt"}</span>
                        </>
                      )}
                    </button>

                    {/* Presets dropdown to easily mock receipt uploads! */}
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "izakaya") {
                          setOcrInput("居酒屋 志ん宿 (Shinjuku Izakaya Bill)\n生ビール x4: JPY 2,200\n刺身盛り合わせ x1: JPY 3,500\n串焼き 12本: JPY 2,400\n消費税 10%\nTOTAL AMOUNT: JPY 8,650");
                        } else if (val === "train") {
                          setOcrInput("JR東日本 東海道新幹線 (Tokaido Shinkansen Ticket)\n東京 -> 京都 (Tokyo to Kyoto Adult Regular)\n席位: 指定席 Car 4 Row 12-A\nFARE PRICE: JPY 14,500");
                        } else if (val === "starbucks") {
                          setOcrInput("STARBUCKS COFFEE SHIBUYA TSUTAYA\n1x Caramel Macchiato: JPY 650\n1x Matcha Frappuccino: JPY 600\nSUBTOTAL: JPY 1,250\nTAX 8%: JPY 100\nTOTAL JPY 1,250");
                        }
                      }}
                      className="bg-slate-950 border border-white/10 hover:border-white/25 rounded-xl px-2 text-[10.5px] text-slate-400 cursor-pointer outline-none shrink-0"
                    >
                      <option value="">📋 {lang === "zh" ? "載入真實收據範例" : "Load Receipt Template"}</option>
                      <option value="izakaya">🍣 {lang === "zh" ? "新宿居酒屋細目 (8,650日圓)" : "Shinjuku Izakaya (8,650 JPY)"}</option>
                      <option value="train">🚄 {lang === "zh" ? "新幹線單程票 (14,500日圓)" : "Shinkansen fare (14,500 JPY)"}</option>
                      <option value="starbucks">☕ {lang === "zh" ? "澀谷星巴克咖啡 (1,250日圓)" : "Starbucks Coffee (1,250 JPY)"}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Calc values for preview */}
              {(() => {
                const rawTotalVal = splitType === 'equal' 
                  ? (parseFloat(amount) || 0)
                  : splitAmong.reduce((acc, id) => acc + (parseFloat(individualAmounts[id]) || 0), 0);

                let refundVal = 0;
                if (taxRefundTotalAmount) {
                  refundVal = parseFloat(taxRefundTotalAmount) || 0;
                } else if (taxRefundPercent) {
                  refundVal = rawTotalVal * ((parseFloat(taxRefundPercent) || 0) / 100);
                }

                const finalPriceVal = Math.max(0, rawTotalVal - refundVal);
                const ratioVal = rawTotalVal > 0 ? (finalPriceVal / rawTotalVal) : 0;

                return (
                  <>
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
                        <label className="block text-slate-300 font-medium mb-1">
                          {lang === "zh" ? "拆分方式" : "Split Method"}
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSplitType('equal')}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                              splitType === 'equal'
                                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                : 'bg-slate-950 border-white/5 hover:border-white/20 text-slate-400'
                            }`}
                          >
                            {lang === "zh" ? "🍱 人頭等額平分" : "Equal Split"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitType('individual')}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                              splitType === 'individual'
                                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                : 'bg-slate-950 border-white/5 hover:border-white/20 text-slate-400'
                            }`}
                          >
                            {lang === "zh" ? "🏷️ 個別消費自付" : "Individual Split"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Amount or Individual Entry depending on Split Type */}
                    {splitType === 'equal' ? (
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">{t.costAmount}</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
                          <input
                            id="expense-amount-input"
                            type="number"
                            step="0.01"
                            required={splitType === 'equal'}
                            placeholder="e.g., 45.50"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 pl-7 pr-3 py-2 rounded-xl text-white font-mono outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
                        <div className="font-bold text-slate-300 border-b border-white/5 pb-1 mb-2">
                          {lang === "zh" ? "✍️ 請輸入各成員個人原始消費額 (美金)" : "✍️ Input individual raw purchase amount for each:"}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {participants.map(p => {
                            const isSelected = splitAmong.includes(p.id);
                            if (!isSelected) {
                              return (
                                <div key={p.id} className="flex items-center gap-2 justify-between border-b border-white/5 pb-2 opacity-35">
                                  <span className="text-slate-500 truncate">{p.name} ({lang === "zh" ? "未參與分攤" : "Not sharing"})</span>
                                </div>
                              );
                            }
                            return (
                              <div key={p.id} className="flex items-center gap-2 justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-300 flex items-center gap-1.5 truncate">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.avatarColor }} />
                                  {p.name}
                                </span>
                                <div className="relative w-28">
                                  <span className="absolute inset-y-0 left-2 flex items-center text-slate-400 font-mono">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={individualAmounts[p.id] || ""}
                                    onChange={(e) => {
                                      setIndividualAmounts({
                                        ...individualAmounts,
                                        [p.id]: e.target.value
                                      });
                                    }}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg pl-5 pr-2 py-1 text-white font-mono text-xs outline-none focus:border-slate-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

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

                    {/* Tax Refund & Discount input area */}
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-3">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span>🛍️ {lang === "zh" ? "免稅退稅 & 折扣比例調整 (可填單項或不填)" : "Tax Refund & Discount Adjustment (Optional)"}</span>
                        <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.5 rounded border border-amber-500/10 font-mono">
                          {lang === "zh" ? "後續自動等比扣減" : "Proportional adjustment"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {lang === "zh" ? "收據往往只有一個退稅總額，在此輸入後，系統會自動在各個成員的自付款項中，按原始金額比例分減扣除，計算出極致精準的實際付款額！" 
                                     : "Enter overall discount or tax back total; the ledger automatically distributes deductions according to individual raw ratios for precise splits!"}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">{lang === "zh" ? "折減退稅金額 $" : "Deduction/Refund ($ Amount)"}</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 15.00"
                              value={taxRefundTotalAmount}
                              disabled={!!taxRefundPercent}
                              onChange={(e) => setTaxRefundTotalAmount(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-white font-mono outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">{lang === "zh" ? "或是退稅比例 %" : "Or Refund Percent (%)"}</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 10"
                              value={taxRefundPercent}
                              disabled={!!taxRefundTotalAmount}
                              onChange={(e) => setTaxRefundPercent(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-3 pr-6 py-1.5 text-white font-mono outline-none focus:border-amber-500"
                            />
                            <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-500">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Dynamically calculated share preview box */}
                      {rawTotalVal > 0 && (
                        <div className="bg-slate-950 border border-white/5 rounded-lg p-3 space-y-2 mt-2">
                          <div className="font-bold text-blue-300 border-b border-white/5 pb-1 text-[11px] flex items-center justify-between">
                            <span>📊 {lang === "zh" ? "即時試算分攤預覽" : "Live Share Preview"}</span>
                            <span className="font-mono text-slate-450 text-[10px]">
                              {lang === "zh" ? `退稅比例: ${(ratioVal * 100).toFixed(1)}% 實付` : `Refund ratio: ${(ratioVal * 100).toFixed(1)}% act`}
                            </span>
                          </div>
                          <div className="space-y-1 font-mono text-[10.5px]">
                            <div className="flex justify-between text-slate-400">
                              <span>{lang === "zh" ? "原始原價總金額：" : "Raw total sum:"}</span>
                              <span>${rawTotalVal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-rose-400">
                              <span>{lang === "zh" ? "免稅/退稅/折扣額：" : "Refund reduction:"}</span>
                              <span>-${refundVal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-bold border-b border-white/5 pb-1.5 mb-1.5">
                              <span>{lang === "zh" ? "折實總付款額：" : "Actual total cost:"}</span>
                              <span>${finalPriceVal.toFixed(2)}</span>
                            </div>
                            
                            <div className="space-y-1 pt-1">
                              {participants.map(p => {
                                if (!splitAmong.includes(p.id)) return null;
                                
                                let pRaw = 0;
                                if (splitType === 'equal') {
                                  pRaw = rawTotalVal / splitAmong.length;
                                } else {
                                  pRaw = parseFloat(individualAmounts[p.id]) || 0;
                                }
                                const pFinal = pRaw * ratioVal;
                                const pSaved = pRaw - pFinal;

                                return (
                                  <div key={p.id} className="flex justify-between text-slate-300 text-[10px]">
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.avatarColor }} />
                                      {p.name}:
                                    </span>
                                    <span className="shrink-0">
                                      <span className="text-slate-500 font-normal">${pRaw.toFixed(2)} {lang === "zh" ? "原價" : "raw"}</span>
                                      <span className="text-slate-600 font-normal mx-1">→</span>
                                      <span className="text-emerald-400 font-bold">${pFinal.toFixed(2)}</span>
                                      {pSaved > 0 && <span className="text-amber-400 text-[9px] ml-1.5">({lang === "zh" ? `減$${pSaved.toFixed(1)}` : `-$${pSaved.toFixed(1)}`})</span>}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

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
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <h4 className={`font-extrabold truncate ${isChecked ? "text-white" : "text-slate-500 line-through"} text-[12.5px]`}>
                            {expenseData.description}
                          </h4>
                          {expenseData.splitType === 'individual' && (
                            <span className="bg-purple-500/15 text-purple-300 border border-purple-500/10 text-[9px] px-1 py-0.2 rounded shrink-0">
                              {lang === "zh" ? "個別自付" : "Individual Split"}
                            </span>
                          )}
                          {(expenseData.taxRefundTotalAmount || expenseData.taxRefundPercent) && (
                            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/10 text-[9px] px-1 py-0.2 rounded font-mono shrink-0">
                              {lang === "zh" ? "已退稅" : "Tax Off"} {expenseData.taxRefundTotalAmount ? `$${expenseData.taxRefundTotalAmount}` : `${expenseData.taxRefundPercent}%`}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {t.paidBy}{" "}
                          <span className="font-bold text-slate-300">{getParticipantName(expenseData.paidById)}</span> • {t.dividedAmong} {expenseData.splitAmongIds.length}
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
                              <span className={`font-black font-mono text-xs sm:text-sm block ${isChecked ? "text-white" : "text-slate-500 line-through"}`}>
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
                  const spent = getParticipantAdjustedSpentLocal(p.id);
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
              <p className="text-[11px] text-slate-400 mb-1 leading-relaxed font-sans">
                {lang === "zh" ? "以左側勾選的帳目計出的自動化費用拆帳結算書：" : "Reconciliation settlement calculated live based on checked ledger entries:"}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl mb-3">
                <div className="text-[10.5px] text-indigo-300 font-bold leading-relaxed max-w-[75%]">
                  {lang === "zh"
                    ? "✨ 結算完成！可一鍵導出精美 HTML/PDF 結帳收據，並為台灣(街口/LINE Pay)與香港(FPS)自動生成還款二維碼。"
                    : "✨ Settlement complete! Generate printable receipts & customized payment links (LINE Pay, Jkopay, FPS) for your companions."}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-lg text-[10.5px] flex items-center gap-1 shrink-0 self-end sm:self-auto"
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

      {/* Interactive Settlement Receipt Modal Overlay */}
      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        expenses={activeExpenses}
        participants={participants}
        transactions={transactions}
        balances={balances}
        totalBudget={editableBudget}
        totalSpent={totalSpent}
        lang={lang}
      />
    </div>
  );
}
