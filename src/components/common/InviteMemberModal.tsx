import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Participant } from "../../types";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  currentUser: Participant | null;
  onInviteUser: (username: string) => Promise<{ success: boolean; error?: string }>;
  onKickParticipant: (userId: string) => Promise<{ success: boolean; error?: string }>;
  lang: "en" | "zh";
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  participants,
  currentUser,
  onInviteUser,
  onKickParticipant,
  lang,
}: InviteMemberModalProps) {
  const [inviteUsername, setInviteUsername] = useState<string>("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);
    const res = await onInviteUser(inviteUsername.trim());
    setIsInviting(false);
    if (res.success) {
      setInviteSuccess(
        lang === "zh"
          ? "🎉 邀請成功送出！受邀人需接受邀請才能進入此專案。"
          : "🎉 Invite sent! Invitee must accept to access project."
      );
      setInviteUsername("");
      setTimeout(() => {
        onClose();
        setInviteSuccess(null);
      }, 3000);
    } else {
      setInviteError(res.error || (lang === "zh" ? "找不到此成員帳號" : "User not found"));
    }
  };

  const handleKickClick = async (userId: string) => {
    setInviteError(null);
    setInviteSuccess(null);
    const res = await onKickParticipant(userId);
    if (res.success) {
      setInviteSuccess(lang === "zh" ? "✔️ 成員已成功踢除/移除。" : "✔️ Member kicked successfully.");
      setTimeout(() => setInviteSuccess(null), 2500);
    } else {
      setInviteError(res.error || (lang === "zh" ? "踢除失敗" : "Failed to kick member"));
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-scaleIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X size={15} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <UserPlus size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white font-sans">
              {lang === "zh" ? "拉入旅伴加入當前專案" : "Pull Traveler into Project"}
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5 leading-none">
              {lang === "zh" ? "立刻實現多瀏覽器/多帳號即時協同規劃" : "Enable multi-device real-time sync planning"}
            </p>
          </div>
        </div>

        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">
              {lang === "zh" ? "旅群組員的帳號名稱 (Username)" : "Team Member's Username"}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder={lang === "zh" ? "輸入組員帳號，例如：chloe" : "e.g. chloe, david"}
                className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/35 transition font-sans"
                disabled={isInviting}
                autoFocus
              />
            </div>
          </div>

          {/* Suggestions Box to optimize user testing experience */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-[11px] text-emerald-350 space-y-1.5">
            <p className="font-extrabold flex items-center gap-1 font-sans">
              💡 {lang === "zh" ? "可以用於協同測試的內建帳號：" : "Built-in accounts for easy sync testing:"}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {["chloe", "david", "sophy"].map((testName) => (
                <button
                  key={testName}
                  type="button"
                  onClick={() => setInviteUsername(testName)}
                  className="p-1 px-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/15 rounded-lg font-mono text-center text-[10px] text-emerald-300 transition cursor-pointer"
                >
                  {testName}
                </button>
              ))}
            </div>
            <p className="text-[9.5px] text-slate-450 mt-1 leading-normal italic font-sans">
              {lang === "zh"
                ? "* 點擊上方帳號快速填寫！你也可以在登出後註冊新帳號來邀請對帳。"
                : "* Click to select! You can also log out, register new users, and invite them."}
            </p>
          </div>

          {/* 👥 Current Team / Kick Members Section */}
          <div className="border-t border-white/5 pt-4 mt-2">
            <label className="block text-[11px] font-extrabold text-slate-450 uppercase tracking-wider mb-2 font-sans">
              {lang === "zh" ? "📋 管理組員 / 踢除組員" : "📋 Current Team Members (Kick / Remove)"}
            </label>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 select-none">
              {(participants || []).map((p) => {
                const isSelf = currentUser && p.id === currentUser.id;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/3 border border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <div style={{ backgroundColor: p.avatarColor }} className="w-5 h-5 rounded-full text-[9px] font-black text-white flex items-center justify-center uppercase">
                        {p.name ? p.name[0] : "?"}
                      </div>
                      <span className="font-bold text-white font-sans">
                        {p.name} {isSelf && <span className="text-[9px] text-slate-400 font-mono">(You)</span>}
                      </span>
                    </div>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleKickClick(p.id)}
                        className="text-[10.5px] text-rose-400 hover:text-rose-200 font-bold underline cursor-pointer font-sans"
                      >
                        {lang === "zh" ? "踢除" : "Kick"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {inviteError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-300 text-[11px] font-bold flex items-center gap-2">
              <span className="shrink-0 text-xs">⚠️</span>
              <span className="font-sans">{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-emerald-300 text-[11px] font-bold flex items-center gap-2 animate-pulse">
              <span className="shrink-0 text-xs">✔️</span>
              <span className="font-sans">{inviteSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-bold text-slate-350 cursor-pointer transition border border-white/5 font-sans"
            >
              {lang === "zh" ? "取消" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isInviting || !inviteUsername.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-555 border border-emerald-500/30 text-[11px] font-bold text-white rounded-xl cursor-pointer transition shadow-lg shadow-emerald-600/15 flex items-center gap-1 disabled:opacity-50 font-sans"
            >
              {isInviting ? (
                <span>{lang === "zh" ? "邀請中..." : "Inviting..."}</span>
              ) : (
                <span>{lang === "zh" ? "確認加入" : "Add Member"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
