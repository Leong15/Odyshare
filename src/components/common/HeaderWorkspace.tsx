import React, { useState } from "react";
import { FolderLock, FolderPlus, Trash, MapPin, LogOut, Moon, Sun, Languages, Users, UserPlus, X, Check } from "lucide-react";
import { Trip, Participant } from "../../types";
import { translations } from "../../lib/translations";

interface HeaderWorkspaceProps {
  lang: "en" | "zh";
  setLang: (l: "en" | "zh") => void;
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
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
        const errMsg = typeof data.error === "object" && data.error !== null
          ? (data.error.message || data.error.code || (lang === "zh" ? "目前密碼錯誤或新密碼不符強度限制" : "Incorrect current password or strength invalid"))
          : (data.error || (lang === "zh" ? "目前密碼錯誤或新密碼不符強度限制" : "Incorrect current password or strength invalid"));
        setPwdError(errMsg);
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="glass-container border-b border-white/5 py-3 px-4 sm:px-6 sticky top-0 z-40 shadow-lg backdrop-blur-none font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left Block: Logo & Trip Details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md border border-blue-500/30 shrink-0">
              <span className="font-bold text-xs tracking-wider select-none">W/S</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white text-[14px] leading-tight sm:text-[15px]">{translations[lang].brandTitle}</h1>
                {syncing && (
                  <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-[9px] text-blue-300 animate-pulse uppercase select-none font-medium">
                    {translations[lang].syncing}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1.5 leading-none select-none">
                <MapPin size={11} className="text-blue-500" />
                <span>
                  {translations[lang].destination}: <span className="font-semibold text-slate-200">{trip.destination}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Content */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            
            {/* Trip Project Dropdown Container */}
            <div className="flex items-center bg-white/5 border border-white/10 p-1.5 rounded-xl text-xs overflow-x-auto min-w-0">
              <div className="flex items-center pl-2 pr-1.5 py-0.5 min-w-0">
                <FolderLock size={13} className="text-blue-400 mr-2 shrink-0" />
                <span className="text-xs font-semibold text-slate-400 mr-1.5 uppercase tracking-wide select-none shrink-0">
                  {lang === "zh" ? "旅程專案" : "Workspace:"}
                </span>
                
                <select
                  id="trip-project-dropdown"
                  value={trip.id}
                  onChange={(e) => onSelectTrip(e.target.value)}
                  className="bg-transparent border-0 font-semibold text-white text-xs focus:outline-none focus:ring-0 cursor-pointer p-0 select-none outline-none mr-1.5 min-w-0"
                >
                  {(trip.tripsList || []).map(tOpt => (
                    <option key={tOpt.id} value={tOpt.id} className="bg-slate-900 text-slate-100 font-semibold text-xs">
                      {tOpt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-5 w-[1px] bg-white/10 mx-1.5 shrink-0" />

              {/* Create project button */}
              <button
                id="create-new-trip-btn"
                onClick={onShowCreateTripModal}
                className="p-1 px-3 hover:bg-white/5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition text-xs text-blue-400 hover:text-white min-w-0 shrink-0"
              >
                <FolderPlus size={12} />
                <span>{lang === "zh" ? "新增" : "+ New"}</span>
              </button>

              {/* Delete current project */}
              {(trip.tripsList || []).length > 1 && (
                <>
                  <div className="h-5 w-[1px] bg-white/10 mx-1.5 shrink-0" />
                  <button
                    id="delete-trip-btn"
                    onClick={() => onDeleteTrip(trip.id)}
                    className="p-1 px-2.5 hover:bg-rose-500/20 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition text-xs text-rose-300 min-w-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    title={lang === "zh" ? "刪除此專案" : "Delete folder"}
                    aria-label={lang === "zh" ? "刪除此專案" : "Delete folder"}
                  >
                    <Trash size={12} />
                  </button>
                </>
              )}
            </div>

            {/* Dynamic Traveler Avatars Stack - Cleansed with More Spacing */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl overflow-x-auto min-w-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide select-none leading-none min-w-0 shrink-0">
                {lang === "zh" ? "協同成員" : "Team"}:
              </span>
              <div className="flex items-center -space-x-1 select-none min-w-0">
                {(trip.participants || []).map((p) => (
                  <div
                    key={p.id}
                    style={{ backgroundColor: p.avatarColor }}
                    className="w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center border border-slate-900 shadow-sm shrink-0 uppercase transition-transform hover:scale-110"
                    title={`${p.name} (${p.email})`}
                  >
                    {p.name ? p.name[0] : "?"}
                  </div>
                ))}
              </div>

              {/* Master Invite with more space */}
              <button
                id="header-invite-member-btn"
                onClick={onOpenInviteModal}
                className="ml-2 h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md border border-blue-400/35 min-w-0 shrink-0"
                title={lang === "zh" ? "快速拉人加入專案" : "Pull collaborator into project"}
              >
                <UserPlus size={12} />
                <span>{lang === "zh" ? "邀請成員" : "Invite"}</span>
              </button>
            </div>

            {/* Profile Dropdown & Controls */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2.5 bg-white/5 border border-white/10 hover:bg-white/10 p-2 px-3.5 rounded-xl text-[13px] cursor-pointer transition select-none"
                >
                  <div
                    style={{ backgroundColor: currentUser.avatarColor }}
                    className="w-6 h-6 rounded-full text-[10px] font-black text-white flex items-center justify-center border border-white/20 shadow-sm shrink-0 uppercase"
                  >
                    {currentUser.name[0]}
                  </div>
                  <span id="user-profile-display" className="font-medium text-white leading-none max-w-[110px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[8px] text-slate-400">▼</span>
                </button>

                {/* Popover actions dropdown */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-xl py-1.5 z-50 text-[12px] flex flex-col animate-fade-in-scale">
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
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-white/5 transition flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <span>🔑</span>
                      <span>{lang === "zh" ? "修改密碼" : "Password"}</span>
                    </button>

                    <div className="h-[1px] bg-white/5 my-1" />

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <LogOut size={12} className="text-rose-400" />
                      <span>{lang === "zh" ? "登出系統" : "Log out"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Settings capsule */}
            <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl text-[13px]">
              <button
                id="theme-switch-btn"
                type="button"
                onClick={() => setTheme((prev: any) => prev === "light" ? "dark" : "light")}
                className="p-1 px-3 hover:bg-white/5 rounded-lg cursor-pointer transition-all flex items-center justify-center text-amber-300 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={lang === "zh" ? "日間/夜間主題切換" : "Toggle theme mode"}
                aria-label={lang === "zh" ? "日間/夜間主題切換" : "Toggle theme mode"}
              >
                {theme === "light" ? (
                  <Moon size={14} className="text-indigo-400" />
                ) : (
                  <Sun size={14} className="text-amber-400" />
                )}
              </button>

              <div className="h-4.5 w-[1px] bg-white/10 mx-1" />

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 pl-2 pr-2 py-1">
                <Languages size={13} className="text-blue-400" />
                <select
                  id="language-selector"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as "en" | "zh")}
                  className="bg-transparent border-0 font-medium text-white text-[13px] focus:outline-none focus:ring-0 cursor-pointer p-0 select-none outline-none pr-1"
                >
                  <option value="zh" className="bg-slate-900 text-slate-100">繁中 (ZH)</option>
                  <option value="en" className="bg-slate-900 text-slate-100 font-sans">EN</option>
                </select>
              </div>
            </div>

          </div>

          {/* Mobile Right Block: Active User Avatar + Hamburger toggle */}
          <div className="flex md:hidden items-center gap-2.5">
            {currentUser && (
              <div
                style={{ backgroundColor: currentUser.avatarColor }}
                className="w-8 h-8 rounded-full text-xs font-black text-white flex items-center justify-center border border-white/20 shadow-sm shrink-0 uppercase"
                title={currentUser.name}
              >
                {currentUser.name[0]}
              </div>
            )}
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={lang === "zh" ? "切換手機版導航選單" : "Toggle mobile navigation menu"}
              title={lang === "zh" ? "切換手機版導航選單" : "Toggle mobile menu"}
            >
              {mobileMenuOpen ? <X size={20} /> : <span className="block w-5 h-4.5 relative">
                <span className="block w-5 h-0.5 bg-current rounded absolute top-0"></span>
                <span className="block w-5 h-0.5 bg-current rounded absolute top-2"></span>
                <span className="block w-5 h-0.5 bg-current rounded absolute top-4"></span>
              </span>}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer Slide-in Panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          
          <div className="relative w-72 h-full bg-[#0f111a] border-l border-white/10 shadow-2xl p-6 flex flex-col gap-6 overflow-y-auto animate-fade-in-scale">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-[15px] font-semibold text-white">{lang === "zh" ? "旅程選單" : "Menu Options"}</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Mobile Project switcher */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider block">
                {lang === "zh" ? "旅程專案" : "Workspace:"}
              </label>
              <div className="flex flex-col bg-white/5 border border-white/5 p-3 rounded-xl gap-3">
                <select
                  id="trip-project-dropdown-mobile"
                  value={trip.id}
                  onChange={(e) => {
                    onSelectTrip(e.target.value);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 font-semibold text-white text-[13px]"
                >
                  {(trip.tripsList || []).map(tOpt => (
                    <option key={tOpt.id} value={tOpt.id} className="bg-slate-900 text-slate-100">
                      {tOpt.name}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onShowCreateTripModal();
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 text-[12px]"
                  >
                    <FolderPlus size={13} />
                    <span>{lang === "zh" ? "新增" : "New"}</span>
                  </button>

                  {(trip.tripsList || []).length > 1 && (
                    <button
                      onClick={() => {
                        onDeleteTrip(trip.id);
                        setMobileMenuOpen(false);
                      }}
                      className="px-3 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-lg flex items-center justify-center"
                    >
                      <Trash size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Travelers Stack */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider block">
                {lang === "zh" ? "協同成員" : "Team members"}
              </label>
              <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl space-y-3.5">
                <div className="flex flex-wrap gap-2">
                  {(trip.participants || []).map((p) => (
                    <div
                      key={p.id}
                      style={{ backgroundColor: p.avatarColor }}
                      className="w-7 h-7 rounded-full text-[11px] font-bold text-white flex items-center justify-center border border-slate-900 uppercase"
                      title={`${p.name} (${p.email})`}
                    >
                      {p.name ? p.name[0] : "?"}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    onOpenInviteModal?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[12px] font-medium transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus size={13} />
                  <span>{lang === "zh" ? "邀請協同成員" : "Invite Members"}</span>
                </button>
              </div>
            </div>

            {/* Settings & Extras */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-400">{lang === "zh" ? "介面主題" : "Interface Mode"}</span>
                <button
                  type="button"
                  onClick={() => setTheme((prev: any) => prev === "light" ? "dark" : "light")}
                  className="p-1 px-3 bg-white/5 border border-white/10 rounded-lg text-amber-300 flex items-center gap-1.5"
                >
                  {theme === "light" ? <Moon size={13} className="text-indigo-400" /> : <Sun size={13} className="text-amber-400" />}
                  <span className="text-[12px] text-slate-300">{theme === "light" ? "日間" : "夜間"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-400">{lang === "zh" ? "系統語言" : "Language"}</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as "en" | "zh")}
                  className="bg-slate-900 border border-white/10 rounded-lg p-1.5 text-white text-[12px]"
                >
                  <option value="zh">繁中 (ZH)</option>
                  <option value="en">EN</option>
                </select>
              </div>
            </div>

            {/* Account Password & Sign Out */}
            <div className="mt-auto space-y-2.5 border-t border-white/5 pt-4">
              <button
                onClick={() => {
                  setPwdError("");
                  setPwdSuccess("");
                  setCurrentPwd("");
                  setNewPwd("");
                  setShowChangePwdModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 rounded-lg flex items-center justify-center gap-1.5 text-[12px]"
              >
                🔑 {lang === "zh" ? "變更密碼" : "Change Password"}
              </button>

              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-bold"
              >
                <LogOut size={13} />
                <span>{lang === "zh" ? "登出系統" : "Log out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Backdrop Closable Dialog Modal */}
      {showChangePwdModal && (
        <div
          id="change-password-backdrop"
          onClick={() => setShowChangePwdModal(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-none z-50 flex items-center justify-center p-4 animate-fade-in-scale"
        >
          <div
            onClick={(e) => e.stopPropagation()} // Satisfies non-dialog click ignore
            className={`w-full max-w-sm rounded-2xl p-6 shadow-xl border ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/8 text-white animate-fade-in-scale"
            } relative`}
          >
            {/* Close Button Button */}
            <button
              type="button"
              onClick={() => setShowChangePwdModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xs font-black cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
              🔑 {lang === "zh" ? "變更協作密碼" : "Change Account Password"}
            </h3>
            <p className="text-[12px] text-slate-400 mb-4">
              {lang === "zh" ? "請輸入原本密碼及符合高強度的安全新密碼" : "Input your legacy credentials and robust new key."}
            </p>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase font-sans">{lang === "zh" ? "當前安全密碼" : "Current Password"}</span>
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
                <span className="block text-[11px] font-semibold text-slate-400 uppercase font-sans font-sans">
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
                <p className="text-[11px] text-slate-400 leading-tight">
                  {lang === "zh" ? "（必備: 1個大寫字母, 1個小寫字母, 1個特殊符號）" : "(Constraint: 1 uppercase, 1 lowercase, 1 symbol)"}
                </p>
              </div>

              {pwdError && <p className="text-[12px] text-rose-400 font-bold leading-relaxed">⚠️ {pwdError}</p>}
              {pwdSuccess && <p className="text-[12px] text-emerald-400 font-bold leading-relaxed">✓ {pwdSuccess}</p>}

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition duration-200 cursor-pointer disabled:opacity-50"
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
