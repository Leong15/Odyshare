import React, { useState } from "react";
import { FolderLock, FolderPlus, Trash, MapPin, LogOut, Moon, Sun, Languages, Users, UserPlus, X, Check } from "lucide-react";
import { Trip, Participant } from "../types";
import { translations } from "../lib/translations";

interface HeaderWorkspaceProps {
  lang: "en" | "zh";
  setLang: (l: "en" | "zh") => void;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<any>>;
  syncing: boolean;
  trip: Trip;
  currentUser: Participant | null;
  onSelectTrip: (id: string) => void;
  onShowCreateTripModal: () => void;
  onDeleteTrip: (id: string) => void;
  onLogout: () => void;
  onOpenInviteModal?: () => void;
}

export default function HeaderWorkspace({
  lang,
  setLang,
  theme,
  setTheme,
  syncing,
  trip,
  currentUser,
  onSelectTrip,
  onShowCreateTripModal,
  onDeleteTrip,
  onLogout,
  onOpenInviteModal,
}: HeaderWorkspaceProps) {
  const isLight = theme === "light";

  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (!currentPwd.trim() || !newPwd.trim()) {
      setPwdError(lang === "zh" ? "請填寫所有欄位" : "Please fill in all fields");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser?.username || localStorage.getItem("loggedInUserUsername") || "",
          currentPassword: currentPwd,
          newPassword: newPwd
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || (lang === "zh" ? "目前密碼錯誤或新密碼不符強度限制" : "Incorrect current password or strength invalid"));
        return;
      }
      setPwdSuccess(lang === "zh" ? "密碼更新成功！" : "Password updated successfully!");
      setCurrentPwd("");
      setNewPwd("");
      setTimeout(() => {
        setShowChangePwdModal(false);
        setPwdSuccess("");
      }, 1500);
    } catch (err) {
      setPwdError(lang === "zh" ? "連線失敗，請稍後重試" : "Network error, please retry.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <>
      <header className="glass-container border-b border-white/15 py-4 px-4 sm:px-6 sticky top-0 z-40 shadow-xl backdrop-blur-md font-sans">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Brand Block & Project Switcher List */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 border border-white/10 shrink-0">
              <span className="font-extrabold text-xs tracking-wider leading-none select-none">W/S</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-xs tracking-tight leading-none sm:text-sm">{translations[lang].brandTitle}</h1>
                {syncing && (
                  <span className="p-0.5 px-1 bg-blue-500/20 border border-blue-400/30 rounded text-[7px] text-blue-300 animate-pulse uppercase select-none">
                    {translations[lang].syncing}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-450 mt-1 flex items-center gap-1.5 leading-none select-none">
                <MapPin size={9} className="text-blue-400" />
                <span>
                  {translations[lang].destination}: <span className="font-bold text-slate-200">{trip.destination}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Trip Project Dropdown */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl backdrop-blur-md text-xs">
              <div className="flex items-center pl-2.5 pr-2 py-0.5">
                <FolderLock size={12} className="text-blue-300 mr-2" />
                <span className="text-[9.5px] font-extrabold text-slate-400 mr-1.5 uppercase tracking-wide select-none">
                  {lang === "zh" ? "旅程專案" : "Workspace:"}
                </span>
                
                <select
                  id="trip-project-dropdown"
                  value={trip.id}
                  onChange={(e) => onSelectTrip(e.target.value)}
                  className="bg-transparent border-0 font-bold text-white text-xs leading-none focus:outline-none focus:ring-0 cursor-pointer p-0 select-none outline-none mr-1.5 pr-1"
                >
                  {(trip.tripsList || []).map(tOpt => (
                    <option key={tOpt.id} value={tOpt.id} className="bg-slate-900 text-slate-100 font-extrabold text-xs">
                      {tOpt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4.5 w-[1px] bg-white/15 mx-1" />

              {/* Create project button inside capsule */}
              <button
                id="create-new-trip-btn"
                onClick={onShowCreateTripModal}
                className="p-1 px-2.5 hover:bg-white/10 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition text-[11px] text-blue-300 hover:text-white"
              >
                <FolderPlus size={11.5} />
                <span>{lang === "zh" ? "新增" : "+ New"}</span>
              </button>

              {/* Delete current project inside capsule */}
              {(trip.tripsList || []).length > 1 && (
                <>
                  <div className="h-4.5 w-[1px] bg-white/15 mx-1" />
                  <button
                    id="delete-trip-btn"
                    onClick={() => onDeleteTrip(trip.id)}
                    className="p-1 px-2 hover:bg-rose-500/20 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition text-[11px] text-rose-300"
                    title={lang === "zh" ? "刪除此專案" : "Delete folder"}
                  >
                    <Trash size={11} />
                  </button>
                </>
              )}
            </div>

            {/* Dynamic Traveler Avatars Stack with Highlight Invite Button */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur-md">
              <span className="text-[9.5px] font-extrabold text-slate-405 uppercase tracking-wide select-none leading-none pt-0.5">
                👥 {lang === "zh" ? "協同成員" : "Team"}:
              </span>
              <div className="flex items-center -space-x-1.5 shrink-0 select-none">
                {(trip.participants || []).map((p) => (
                  <div
                    key={p.id}
                    style={{ backgroundColor: p.avatarColor }}
                    className="w-5 h-5 rounded-full text-[8.5px] font-black text-white flex items-center justify-center border border-slate-900 shadow-sm shrink-0 uppercase"
                    title={`${p.name} (${p.email})`}
                  >
                    {p.name ? p.name[0] : "?"}
                  </div>
                ))}
              </div>

              {/* Master Invite trigger for pulling/adding members directly from anywhere */}
              <button
                id="header-invite-member-btn"
                onClick={onOpenInviteModal}
                className="p-0.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[10.5px] font-bold cursor-pointer transition flex items-center gap-1 outline-none ml-1 shadow-sm font-sans"
                title={lang === "zh" ? "快速拉人加入專案" : "Pull collaborator into project"}
              >
                <span className="leading-none text-xs">+</span>
                <span className="leading-none">{lang === "zh" ? "拉人/邀請" : "Invite"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active profile controls, Light Mode Toggle & Language switcher (Absolute top-right on mobile) */}
        <div className="absolute top-4 right-4 lg:relative lg:top-0 lg:right-0 flex items-center gap-2.5 z-40">
          
          {/* Profile Display Box */}
          {currentUser && (
            <div 
              className="relative"
              onMouseEnter={() => setShowUserDropdown(true)}
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 p-1.5 px-3 rounded-xl text-xs backdrop-blur-md cursor-pointer transition select-none"
              >
                <div
                  style={{ backgroundColor: currentUser.avatarColor }}
                  className="w-5.5 h-5.5 rounded-full text-[9.5px] font-black text-white flex items-center justify-center border border-white/20 shadow-sm shrink-0 uppercase"
                >
                  {currentUser.name[0]}
                </div>
                <span id="user-profile-display" className="font-bold text-white text-[11.5px] leading-none font-sans max-w-[100px] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[7.5px] text-slate-400">▼</span>
              </button>

              {/* Popover actions dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-1.5 w-44 lg:w-36 bg-slate-950 border border-white/15 rounded-xl shadow-2xl py-1 z-50 text-[11px] flex flex-col backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-100">
                  
                  {/* Mobile-only theme/mode and language integration */}
                  <div className="px-3 py-1.5 text-slate-400 font-extrabold uppercase text-[9px] border-b border-white/10 lg:hidden block">
                    {lang === "zh" ? "設定" : "System preferences"}
                  </div>

                  {/* Mode switcher inside list only for mobile */}
                  <button
                    type="button"
                    onClick={() => setTheme((prev: any) => prev === "light" ? "dark" : "light")}
                    className="lg:hidden w-full text-left px-3 py-2 text-slate-200 hover:bg-white/10 transition flex items-center justify-between cursor-pointer font-bold leading-none"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🌓</span>
                      <span>{lang === "zh" ? "日間/夜間" : "Theme Mode"}</span>
                    </span>
                    <span className="text-amber-300">
                      {theme === "light" ? <Moon size={11} /> : <Sun size={11} className="animate-spin-slow" />}
                    </span>
                  </button>

                  {/* Language Selector inside list only for mobile */}
                  <div className="lg:hidden w-full px-3 py-1.5 hover:bg-white/10 transition flex items-center justify-between font-bold leading-none">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <Languages size={11.5} className="text-blue-400" />
                      <span>{lang === "zh" ? "語言" : "Language"}</span>
                    </span>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as "en" | "zh")}
                      className="bg-transparent border-0 font-bold text-white text-[10px] focus:outline-none focus:ring-0 cursor-pointer p-0 select-none outline-none mr-1"
                    >
                      <option value="zh" className="bg-slate-900 text-slate-100">繁中</option>
                      <option value="en" className="bg-slate-900 text-slate-100">EN</option>
                    </select>
                  </div>

                  <div className="h-[1px] bg-white/10 my-0.5 lg:hidden" />

                  <button
                    id="header-change-password-btn"
                    type="button"
                    onClick={() => {
                      setPwdError("");
                      setPwdSuccess("");
                      setCurrentPwd("");
                      setNewPwd("");
                      setShowChangePwdModal(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-white/10 transition flex items-center gap-1.5 cursor-pointer font-bold leading-none"
                  >
                    <span>🔑</span>
                    <span>{lang === "zh" ? "修改密碼" : "Password"}</span>
                  </button>

                  <div className="h-[1px] bg-white/10 my-0.5" />

                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1.5 cursor-pointer font-bold leading-none"
                  >
                    <LogOut size={11} className="text-rose-455" />
                    <span>{lang === "zh" ? "登出系統" : "Log out"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Consolidated System Settings Capsule - Desktop-Only */}
          <div className="hidden lg:flex items-center bg-white/5 border border-white/10 p-1 rounded-xl text-xs backdrop-blur-md">
            {/* Light vs Dark Theme Selection */}
            <button
              id="theme-switch-btn"
              type="button"
              onClick={() => setTheme((prev: any) => prev === "light" ? "dark" : "light")}
              className="p-1 px-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition-all flex items-center justify-center text-amber-300 select-none text-xs"
              title={lang === "zh" ? "日間/夜間主題切換" : "Toggle theme mode"}
            >
              {theme === "light" ? (
                <Moon size={12.5} className="text-indigo-400" />
              ) : (
                <Sun size={12.5} className="text-amber-400 animate-spin-slow" />
              )}
            </button>

            <div className="h-4 w-[1px] bg-white/15 mx-1" />

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-1">
              <Languages size={11.5} className="text-blue-400" />
              <select
                id="language-selector"
                value={lang}
                onChange={(e) => setLang(e.target.value as "en" | "zh")}
                className="bg-transparent border-0 font-bold text-white text-[11.5px] focus:outline-none focus:ring-0 cursor-pointer p-0 select-none outline-none pr-1"
              >
                <option value="zh" className="bg-slate-900 text-slate-100">繁中 (ZH)</option>
                <option value="en" className="bg-slate-900 text-slate-100">EN</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Change Password Backdrop Closable Dialog Modal */}
    {showChangePwdModal && (
      <div
        id="change-password-backdrop"
        onClick={() => setShowChangePwdModal(false)}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
      >
        <div
          onClick={(e) => e.stopPropagation()} // Satisfies non-dialog click ignore
          className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/10 text-white"
          } relative animate-scaleUp`}
        >
          {/* Close Button Button */}
          <button
            type="button"
            onClick={() => setShowChangePwdModal(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xs font-black"
          >
            ✕
          </button>

          <h3 className="text-sm font-black mb-1.5 flex items-center gap-1.5">
            🔑 {lang === "zh" ? "變更協作密碼" : "Change Account Password"}
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">
            {lang === "zh" ? "請輸入原本密碼及符合高強度的安全新密碼" : "Input your legacy credentials and robust new key."}
          </p>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-405 uppercase font-mono">{lang === "zh" ? "當前安全密碼" : "Current Password"}</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                  isLight ? "bg-slate-50 text-slate-900 border-slate-300" : "bg-slate-950 text-slate-100 border-white/5"
                }`}
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-450 uppercase font-mono">
                {lang === "zh" ? "高強度新密碼" : "New Secure Password"}
              </span>
              <input
                type="password"
                required
                placeholder={lang === "zh" ? "包含大、小寫及符號" : "Upper, lower & symbols required"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                  isLight ? "bg-slate-50 text-slate-900 border-slate-300" : "bg-slate-950 text-slate-100 border-white/5"
                }`}
              />
              <p className="text-[9px] text-slate-450 leading-tight">
                {lang === "zh" ? "（必備: 1個大寫字母, 1個小寫字母, 1個特殊符號）" : "(Constraint: 1 uppercase, 1 lowercase, 1 symbol)"}
              </p>
            </div>

            {pwdError && <p className="text-[10px] text-rose-400 font-bold leading-relaxed">⚠️ {pwdError}</p>}
            {pwdSuccess && <p className="text-[10px] text-emerald-400 font-bold leading-relaxed">✓ {pwdSuccess}</p>}

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full mt-2 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] text-white font-extrabold text-xs rounded-xl shadow transition duration-200 cursor-pointer disabled:opacity-50"
            >
              {pwdLoading ? (lang === "zh" ? "更新中..." : "Updating password...") : (lang === "zh" ? "儲存新密碼" : "Save New Password")}
            </button>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
