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

  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const [forgotStep, setForgotStep] = React.useState(1);
  const [recoveryUsername, setRecoveryUsername] = React.useState("");
  const [recoveryAnswer, setRecoveryAnswer] = React.useState("");
  const [recoveryError, setRecoveryError] = React.useState("");
  const [recoverySuccess, setRecoverySuccess] = React.useState("");

  const handleStartRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");
    if (!recoveryUsername.trim()) {
      setRecoveryError(lang === "zh" ? "請輸入帳號" : "Please input account ID");
      return;
    }
    try {
      const res = await fetch(`/api/auth/reset-question?username=${encodeURIComponent(recoveryUsername)}`);
      if (!res.ok) {
        const errData = await res.json();
        setRecoveryError(errData.message || (lang === "zh" ? "帳號不存在" : "Account not found"));
        return;
      }
      const data = await res.json();
      setForgotStep(2);
    } catch (err) {
      setRecoveryError(lang === "zh" ? "連線連線錯誤，請稍後重試" : "Network error, please retry.");
    }
  };

  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");
    try {
      const res = await fetch(`/api/auth/reset-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername,
          answer: recoveryAnswer
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRecoveryError(data.message || (lang === "zh" ? "答案不正確" : "Answer incorrect"));
        return;
      }
      setRecoverySuccess(lang === "zh" 
        ? `驗證成功！您的原密碼為：[ ${data.password} ]。請複製並妥善保管。` 
        : `Success! Your password is: [ ${data.password} ]. Please save it safely.`
      );
      setForgotStep(3);
    } catch (err) {
      setRecoveryError(lang === "zh" ? "更新密碼錯誤，請稍後重試" : "Error resetting, please retry.");
    }
  };

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
            {lang === "zh" ? "OdyShareSync 旅伴協作平台" : "OdyShareSync Travel System"}
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
            <div className="flex justify-between items-center">
              <label className={`block text-[10.5px] font-black uppercase tracking-wider font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {lang === "zh" ? "安全密碼 *" : "Security Password *"}
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setRecoveryUsername("");
                  setRecoveryAnswer("");
                  setRecoveryError("");
                  setRecoverySuccess("");
                }}
                className="text-[10px] text-blue-500 hover:text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {lang === "zh" ? "忘記密碼？" : "Forgot Password?"}
              </button>
            </div>
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

      {/* Forgot Password Backdrop Closable Dialog Modal */}
      {showForgotModal && (
        <div
          id="forgot-password-backdrop"
          onClick={() => setShowForgotModal(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()} // Satisfies outer click ignore
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/10 text-white"
            } relative animate-scaleUp`}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xs font-black"
            >
              ✕
            </button>

            <h3 className="text-sm font-black mb-3">
              🔑 {lang === "zh" ? "密碼安全找回與重置" : "Password Security Recovery"}
            </h3>

            {forgotStep === 1 && (
              <form onSubmit={handleStartRecovery} className="space-y-3.5">
                <p className="text-[11px] text-slate-400 leading-normal">
                  {lang === "zh" 
                    ? "請輸入您註冊的帳號 (Login ID)，系統將為您調取密碼找回安全核驗問題：" 
                    : "Please enter your Login ID / Username to fetch the backup recovery validation question:"}
                </p>
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">{lang === "zh" ? "帳號 (Login ID)" : "Login ID"}</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. leochau"
                    value={recoveryUsername}
                    onChange={(e) => setRecoveryUsername(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                      isLight ? "bg-slate-50 text-slate-900 border-slate-300" : "bg-slate-950 text-slate-100 border-white/5"
                    }`}
                  />
                </div>
                {recoveryError && <p className="text-[10px] text-rose-400 font-bold">⚠️ {recoveryError}</p>}
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  {lang === "zh" ? "下一步：驗證安全問題" : "Next: Verify Security Question"}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleConfirmRecovery} className="space-y-3.5">
                <p className="text-[11px] text-slate-400 leading-normal">
                  {lang === "zh"
                    ? "【安全問題核驗】為了安全，所有協作客體重置默認安全問題答案為您的『登記顯示名字』。請輸入對應的登記顯示名字來解鎖密碼："
                    : "【Security Check】To verify ownership, type your 'Display Name' to reveal your security password:"}
                </p>
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">
                    {lang === "zh" ? "安全驗證答案 (登記名字)" : "Verification Answer (Display Name)"}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={lang === "zh" ? "請輸入您的登記顯示名字" : "Enter your Display Name"}
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                      isLight ? "bg-slate-50 text-slate-900 border-slate-300" : "bg-slate-950 text-slate-100 border-white/5"
                    }`}
                  />
                </div>
                {recoveryError && <p className="text-[10px] text-rose-400 font-bold">⚠️ {recoveryError}</p>}
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  {lang === "zh" ? "驗證並找回密碼" : "Verify & Retrieve Password"}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl text-[11px] text-emerald-400 font-medium leading-relaxed">
                  ✓ {recoverySuccess}
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  {lang === "zh" ? "登入帳號" : "Login Now"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
