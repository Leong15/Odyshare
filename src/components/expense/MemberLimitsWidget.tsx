import React, { useState, useEffect } from "react";
import { ChevronRight, Users, Pencil, Sparkles } from "lucide-react";
import { ExpenseItem, Participant } from "../../types";
import { translations } from "../../lib/translations";
import { getParticipantAdjustedSpent } from "../../utils/expenseCalculator";

interface MemberLimitsWidgetProps {
  participants: Participant[];
  expenses: ExpenseItem[];
  uncheckedExpenseIds: string[];
  activeUserId: string;
  lang: "en" | "zh";
  onUpdateParticipants?: (updated: Participant[]) => void;
  onInviteUser?: (username: string) => Promise<{ success: boolean; error?: string }>;
  onInviteExternalUser?: (name: string) => Promise<{ success: boolean; error?: string }>;
  onUpgradeExternalUser?: (externalId: string, targetUsername: string) => Promise<{ success: boolean; error?: string }>;
}

export default function MemberLimitsWidget({
  participants,
  expenses,
  uncheckedExpenseIds,
  activeUserId,
  lang,
  onUpdateParticipants,
  onInviteUser,
  onInviteExternalUser,
  onUpgradeExternalUser,
}: MemberLimitsWidgetProps) {
  const t = translations[lang];

  const [isMemberLimitsCollapsed, setIsMemberLimitsCollapsed] = useState<boolean>(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<string>("");

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const [externalName, setExternalName] = useState("");
  const [extError, setExtError] = useState<string | null>(null);
  const [extSuccess, setExtSuccess] = useState<string | null>(null);
  const [isAddingExt, setIsAddingExt] = useState(false);

  // Upgrade / Merge states
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [upgradeUsername, setUpgradeUsername] = useState("");
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMemberLimitsCollapsed(true);
    }
  }, []);

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

  const handleAddExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalName.trim() || !onInviteExternalUser) return;
    setExtError(null);
    setExtSuccess(null);
    setIsAddingExt(true);
    try {
      const res = await onInviteExternalUser(externalName.trim());
      if (res.success) {
        setExtSuccess(lang === "zh" ? "🎉 成功新增臨時虛擬旅伴！" : "🎉 Added external traveler!");
        setExternalName("");
      } else {
        setExtError(res.error || (lang === "zh" ? "新增失敗" : "Failed to add"));
      }
    } catch (err) {
      setExtError(lang === "zh" ? "連接失敗" : "Server error");
    } finally {
      setIsAddingExt(false);
    }
  };

  const handleUpgradeSubmit = async (e: React.FormEvent, externalId: string) => {
    e.preventDefault();
    if (!upgradeUsername.trim() || !onUpgradeExternalUser) return;
    setUpgradeError(null);
    setIsUpgrading(true);
    try {
      const res = await onUpgradeExternalUser(externalId, upgradeUsername.trim());
      if (res.success) {
        setUpgradingId(null);
        setUpgradeUsername("");
      } else {
        setUpgradeError(res.error || (lang === "zh" ? "綁定失敗，請確認該註冊帳號存在且不重複" : "Binding failed"));
      }
    } catch (err) {
      setUpgradeError(lang === "zh" ? "連接失敗" : "Server error");
    } finally {
      setIsUpgrading(false);
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
        const updated = participants.map((p) => {
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

  const getParticipantAdjustedSpentLocal = (userId: string) => {
    return getParticipantAdjustedSpent(expenses, userId, new Set(uncheckedExpenseIds));
  };

  return (
    <div className="glass-container rounded-2xl border border-white/10 shadow-lg animate-fadeIn overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsMemberLimitsCollapsed(!isMemberLimitsCollapsed)}
        className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <ChevronRight
            size={16}
            className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${
              isMemberLimitsCollapsed ? "" : "rotate-90"
            }`}
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
        <div className="p-4 space-y-4 animate-fadeIn text-left">
          {onInviteUser && (
            <form
              onSubmit={handleInviteSubmit}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/4 p-3 rounded-xl border border-white/5 space-y-2 text-left"
            >
              <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                {lang === "zh" ? "🚀 搜尋並拉入成員帳號 (Login ID)" : "🚀 Pull traveler into your workspace"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={
                    lang === "zh" ? "請輸入對方的 Login ID / 的用戶名..." : "Enter register username / Login ID..."
                  }
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="flex-1 bg-slate-900/60 rounded-xl p-1.5 px-3 text-white text-xs placeholder:text-slate-500 border border-white/10 font-mono text-[11px] focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isInviting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs p-1.5 px-3 rounded-xl cursor-pointer transition-all shrink-0 font-sans"
                >
                  {isInviting ? "..." : lang === "zh" ? "邀請" : "Invite"}
                </button>
              </div>
              {inviteError && (
                <p className="text-[10px] text-rose-400 font-bold font-mono animate-pulse">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-[10px] text-emerald-400 font-bold font-mono animate-pulse">{inviteSuccess}</p>
              )}
            </form>
          )}

          {onInviteExternalUser && (
            <form
              onSubmit={handleAddExternalSubmit}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/4 p-3 rounded-xl border border-white/5 space-y-2 text-left"
            >
              <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                {lang === "zh" ? "➕ 新增不在專案中的臨時旅伴 (無帳號直接分攤)" : "➕ Add temporary external traveler (No account split)"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={
                    lang === "zh" ? "請輸入臨時成員姓名 (例如: 媽媽, 小王)..." : "Enter name (e.g. Mom, Tony)..."
                  }
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  className="flex-1 bg-slate-900/60 rounded-xl p-1.5 px-3 text-white text-xs placeholder:text-slate-500 border border-white/10 text-[11px] focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isAddingExt}
                  className="bg-emerald-650 hover:bg-emerald-700 bg-emerald-600 disabled:opacity-50 text-white font-black text-xs p-1.5 px-3 rounded-xl cursor-pointer transition-all shrink-0 font-sans"
                >
                  {isAddingExt ? "..." : lang === "zh" ? "新增" : "Add"}
                </button>
              </div>
              {extError && (
                <p className="text-[10px] text-rose-400 font-bold font-mono animate-pulse">{extError}</p>
              )}
              {extSuccess && (
                <p className="text-[10px] text-emerald-400 font-bold font-mono animate-pulse">{extSuccess}</p>
              )}
            </form>
          )}

          <div className="space-y-3">
            {participants.map((p) => {
              const spent = getParticipantAdjustedSpentLocal(p.id);
              const limit = typeof p.budgetLimit === "number" ? p.budgetLimit : 1500;
              const ratio = Math.min((spent / limit) * 100, 100);
              const isOver = spent > limit;
              const isEditing = editingParticipantId === p.id;

              return (
                <div
                  key={p.id}
                  className="p-2.5 bg-white/3 border border-white/5 rounded-xl space-y-1.5 animate-fadeIn"
                >
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
                      {p.id.startsWith("ext-") && onUpgradeExternalUser && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (upgradingId === p.id) {
                              setUpgradingId(null);
                            } else {
                              setUpgradingId(p.id);
                              setUpgradeUsername("");
                              setUpgradeError(null);
                            }
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-all duration-200 ${
                            upgradingId === p.id
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20"
                          } cursor-pointer`}
                          title={lang === "zh" ? "綁定/升級至註冊帳戶" : "Upgrade to Registered Account"}
                        >
                          <Sparkles size={8} />
                          <span>{lang === "zh" ? "綁定/升級" : "Upgrade"}</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-400">$</span>
                        <input
                          type="number"
                          value={tempLimit}
                          onChange={(e) => setTempLimit(e.target.value)}
                          className="w-14 bg-slate-900/60 text-white rounded border border-white/20 p-0.5 px-1 font-mono text-[10px] text-center outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveLimit(p.id);
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
                        <Pencil size={10} className="opacity-70 text-blue-400" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9.5px] text-slate-400">
                      <span>
                        {lang === "zh" ? "合計支出:" : "Total Spent:"}{" "}
                        <strong className="text-slate-200 font-mono">${spent.toFixed(1)}</strong>
                      </span>
                      <span className={isOver ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                        {ratio.toFixed(0)}%
                      </span>
                    </div>

                    <div className="overflow-hidden h-1 text-xs flex rounded-full bg-white/5">
                      <div
                        style={{ width: `${ratio}%` }}
                        className={`rounded-full ${
                          isOver ? "bg-rose-500" : ratio > 80 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>
                    {isOver && (
                      <p className="text-[9px] text-rose-400 font-bold flex items-center gap-1 leading-none pt-0.5">
                        ⚠️ {lang === "zh" ? "已超預算上限！" : "Over limit!"}
                      </p>
                    )}
                  </div>

                  {/* Inline upgrading collapsible form */}
                  {upgradingId === p.id && (
                    <form
                      onSubmit={(e) => handleUpgradeSubmit(e, p.id)}
                      className="mt-2.5 p-2 bg-slate-950/60 rounded-lg border border-amber-500/15 space-y-2 animate-fade-in text-[10px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-slate-400 leading-normal">
                        {lang === "zh"
                          ? "將此臨時旅伴的歷史全部記帳與代墊、應付細目，無縫移轉合併至另一個註冊會員！"
                          : "Seamlessly merge all transaction history of this temporary traveler to a registered traveler's account!"}
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder={lang === "zh" ? "請輸入註冊帳號 (Username)" : "Registered username"}
                          value={upgradeUsername}
                          onChange={(e) => setUpgradeUsername(e.target.value)}
                          className="flex-1 bg-slate-900 rounded border border-white/10 p-1 px-2 text-white font-mono text-[10px] outline-none focus:border-amber-500"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={isUpgrading || !upgradeUsername.trim()}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] p-1 px-2.5 rounded cursor-pointer disabled:opacity-50"
                        >
                          {isUpgrading ? "..." : lang === "zh" ? "合併" : "Merge"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpgradingId(null)}
                          className="text-slate-400 hover:text-white text-[10px] p-1 cursor-pointer"
                        >
                          {lang === "zh" ? "取消" : "Cancel"}
                        </button>
                      </div>
                      {upgradeError && (
                        <p className="text-rose-400 font-bold font-mono text-[9px] pt-0.5">{upgradeError}</p>
                      )}
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
