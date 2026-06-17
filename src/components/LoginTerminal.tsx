import React from "react";

interface LoginTerminalProps {
  lang: "en" | "zh";
  setLang: (l: "en" | "zh") => void;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<any>>;
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  authUsername: string;
  setAuthUsername: (u: string) => void;
  authPassword: string;
  setAuthPassword: (p: string) => void;
  authName: string;
  setAuthName: (n: string) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  onAuthSubmit: (e: React.FormEvent) => void;
}

export default function LoginTerminal({
  lang,
  setLang,
  theme,
  setTheme,
  authMode,
  setAuthMode,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authError,
  setAuthError,
  onAuthSubmit,
}: LoginTerminalProps) {
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center font-sans tracking-tight transition-colors duration-350 p-6 relative ${
      isLight ? "bg-slate-50 text-slate-900" : "bg-[#0b0e14] text-slate-100"
    }`}>
      {/* Background glowing ambient blobs */}
      <div id="orb-left" className={`ambient-orb w-[420px] h-[420px] bg-blue-600/15 top-10 left-10 pointer-events-none transition-opacity duration-300 ${isLight ? "opacity-15" : "opacity-35"}`} />
      <div id="orb-right" className={`ambient-orb w-[380px] h-[380px] bg-indigo-600/15 bottom-10 right-10 pointer-events-none transition-opacity duration-300 ${isLight ? "opacity-15" : "opacity-35"}`} />

      <div className={`w-full max-w-md glass-container rounded-3xl p-6 sm:p-8 shadow-2xl border z-10 animate-fadeIn space-y-6 ${
        isLight ? "bg-white/95 border-slate-200" : "bg-slate-950/75 border-white/10"
      }`}>
        {/* Brand Heading */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto border border-white/10">
            <span className="font-extrabold text-sm tracking-widest">W/S</span>
          </div>
          <h2 className={`text-lg sm:text-xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>
            {lang === "zh" ? "WanderSync 旅伴協作平台" : "WanderSync Travel System"}
          </h2>
          <p className={`text-[11px] font-medium ${isLight ? "text-slate-500" : "text-slate-450"}`}>
            {lang === "zh" ? "專屬獨立帳號加密登入管理 • 旅伴行程對帳終端" : "Secure independent accounts workspace term"}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className={`flex p-1 rounded-2xl gap-1 ${isLight ? "bg-slate-100" : "bg-white/5"}`}>
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthError(null);
            }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-xl cursor-pointer transition ${
              authMode === "login"
                ? (isLight ? "bg-white text-blue-600 shadow-sm" : "bg-white/10 text-white")
                : (isLight ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
            }`}
          >
            🔑 {lang === "zh" ? "登入帳號" : "Login"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setAuthError(null);
            }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-xl cursor-pointer transition ${
              authMode === "register"
                ? (isLight ? "bg-white text-blue-600 shadow-sm" : "bg-white/10 text-white")
                : (isLight ? "text-slate-400 hover:text-slate-100" : "text-slate-400 hover:text-slate-200")
            }`}
          >
            📝 {lang === "zh" ? "註冊新帳號" : "Register"}
          </button>
        </div>

        {/* Credential Auth Form */}
        <form onSubmit={onAuthSubmit} className="space-y-4">
          {/* Display Name (Only for registration) */}
          {authMode === "register" && (
            <div className="space-y-1">
              <label className={`block text-[10.5px] font-black uppercase tracking-wider font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {lang === "zh" ? "旅伴顯示名字 *" : "Display Traveler Name *"}
              </label>
              <input
                type="text"
                required
                placeholder={lang === "zh" ? "e.g. 小明 / Leo Chen" : "e.g. Leo Chen"}
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${
                  isLight 
                    ? "bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-500/70" 
                    : "bg-[#141b26] text-white border-white/10 focus:border-blue-500/60"
                }`}
              />
            </div>
          )}

          {/* Username / Login ID */}
          <div className="space-y-1">
            <label className={`block text-[10.5px] font-black uppercase tracking-wider font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              {lang === "zh" ? "登入帳號 (Login ID) *" : "Login ID / Username *"}
            </label>
            <input
              type="text"
              required
              placeholder={lang === "zh" ? "請輸入帳號英文或數字..." : "Enter your username..."}
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-all font-mono ${
                isLight 
                  ? "bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-500/70" 
                  : "bg-[#141b26] text-white border-white/10 focus:border-blue-500/60"
              }`}
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className={`block text-[10.5px] font-black uppercase tracking-wider font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              {lang === "zh" ? "安全密碼 *" : "Security Password *"}
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${
                isLight 
                  ? "bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-500/70" 
                  : "bg-[#141b26] text-white border-white/10 focus:border-blue-500/60"
              }`}
            />
          </div>

          {/* Error Message */}
          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[11px] font-semibold flex items-center gap-2 animate-shake">
              ⚠️ <span>{authError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full glass-button-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {authMode === "login" 
              ? (lang === "zh" ? "解鎖進入系統" : "Unlock Workspace")
              : (lang === "zh" ? "創建帳號並進入" : "Create Account & Unlock")
            }
          </button>
        </form>

        {/* Quick System Helpers */}
        <div className={`pt-4 border-t flex items-center justify-between text-[10px] font-mono ${
          isLight ? "border-slate-200 text-slate-500" : "border-white/5 text-slate-450"
        }`}>
          {/* Lang switcher on login page */}
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className={`hover:scale-105 transition-all cursor-pointer border rounded-lg px-2 py-1 ${
              isLight ? "border-slate-300 text-slate-700 bg-white" : "border-white/10 text-slate-300 bg-white/5"
            }`}
          >
            🌐 {lang === "en" ? "繁體中文" : "English"}
          </button>

          {/* Theme switcher on login page */}
          <button
            type="button"
            onClick={() => setTheme((prev: any) => prev === "light" ? "dark" : "light")}
            className={`hover:scale-105 transition-all cursor-pointer border rounded-lg px-2.5 py-1 flex items-center gap-1 ${
              isLight ? "border-slate-300 text-slate-700 bg-white" : "border-white/10 text-slate-300 bg-white/5"
            }`}
          >
            {isLight ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}
