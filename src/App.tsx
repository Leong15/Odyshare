import React, { useState, useEffect } from "react";
import { 
  Calendar, Map, Plane, DollarSign, Lock, Users, RefreshCw, UserPlus, X
} from "lucide-react";
import { Trip, ItineraryItem, ExpenseItem, DocumentItem, ChatMessage } from "./types";
import { translations } from "./lib/translations";

// Modular Subcomponents
import LoginTerminal from "./components/LoginTerminal";
import HeaderWorkspace from "./components/HeaderWorkspace";
import CreateTripModal from "./components/CreateTripModal";
import TripDashboard from "./components/TripDashboard";

// Tab Subcomponents
import ItineraryPlanner from "./components/ItineraryPlanner";
import ExpenseTracker from "./components/ExpenseTracker";
import OfflineMapSimulator from "./components/OfflineMapSimulator";
import DocumentVault from "./components/DocumentVault";
import FlightHub from "./components/FlightHub";
import EncryptedWorkspaceChat from "./components/EncryptedWorkspaceChat";

// Custom Hooks for Modular Architecture
import { useAuth } from "./hook/useAuth";
import { useTripSync } from "./hook/useTripSync";
import { useTripActions } from "./hook/useTripActions";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "map" | "itinerary" | "flights" | "budget" | "vault" | "chat" | "ai">("dashboard");
  const [lang, setLang] = useState<"en" | "zh">("zh"); // Defaulting to zh (Traditional Chinese)
  
  // Theme Switching
  const [theme, setTheme] = useState<"light" | "dark" | any>(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  // 1. Initialize Auth State Engine
  const auth = useAuth(lang);

  // 2. Initialize Trip Synchronization Engine (Interval polling, pending invitation notifications)
  const sync = useTripSync({
    loggedInUserId: auth.loggedInUserId,
    onUserResolved: auth.setCurrentUser,
  });

  // 3. Initialize Trip Actions Engine (Shared trip level CRUD operations)
  const actions = useTripActions({
    fetchWithAuth: sync.fetchWithAuth,
    postTripUpdate: sync.postTripUpdate,
    fetchTripData: sync.fetchTripData,
    setTrip: sync.setTrip,
    currentUser: auth.currentUser,
    lang,
  });

  // Modal overlays setup
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [newTripName, setNewTripName] = useState<string>("");
  const [newTripDestination, setNewTripDestination] = useState<string>("");
  const [newTripBudget, setNewTripBudget] = useState<string>("");
  const [isCreatingTrip, setIsCreatingTrip] = useState<boolean>(false);
  const [createTripError, setCreateTripError] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteUsername, setInviteUsername] = useState<string>("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState<boolean>(false);

  // Sync dark/light class on body
  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Form Submission handlers
  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim()) return;
    setIsCreatingTrip(true);
    setCreateTripError(null);
    const res = await actions.handleCreateTrip(newTripName, newTripDestination, newTripBudget);
    setIsCreatingTrip(false);
    if (res.success) {
      setShowCreateTripModal(false);
      setNewTripName("");
      setNewTripDestination("");
      setNewTripBudget("");
    } else {
      setCreateTripError(res.error || null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);
    const res = await actions.handleInviteUser(inviteUsername.trim());
    setIsInviting(false);
    if (res.success) {
      setInviteSuccess(lang === "zh" ? "🎉 邀請成功送出！受邀人需接受邀請才能進入此專案。" : "🎉 Invite sent! Invitee must accept to access project.");
      setInviteUsername("");
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 3000);
    } else {
      setInviteError(res.error || (lang === "zh" ? "找不到此成員帳號" : "User not found"));
    }
  };

  const handleKickParticipant = async (userIdToKick: string) => {
    const res = await actions.handleKickParticipant(userIdToKick);
    if (res.success) {
      setInviteSuccess(lang === "zh" ? "✔️ 成員已成功踢除/移除。" : "✔️ Member kicked successfully.");
      setTimeout(() => setInviteSuccess(null), 2500);
    } else {
      setInviteError(res.error || "Failed to kick participant");
      setTimeout(() => setInviteError(null), 3500);
    }
  };

  const handleRestoreItineraries = () => {
    if (sync.trip?.backupItineraries && sync.trip.backupItineraries.length > 0) {
      actions.handleRestoreItineraries(sync.trip.itineraries, sync.trip.backupItineraries);
      handlePostAISystemMessage(
        lang === "zh"
          ? "↩️ 行程已成功復原到優化前的原創配置！"
          : "↩️ Schedule successfully restored to previous original state!"
      );
    }
  };

  const handlePostAISystemMessage = (text: string) => {
    const systemMsg: ChatMessage = {
      id: "msg-ai-ref-" + Date.now(),
      senderId: "system",
      senderName: "WanderSmart AI",
      avatarColor: "#8b5cf6",
      messageEncrypted: "",
      messageDecrypted: text,
      timestamp: new Date().toISOString(),
      isTripUpdate: true
    };
    if (sync.trip) {
      sync.postTripUpdate({ chats: [...sync.trip.chats, systemMsg] });
    }
  };

  const handleAIRecFlights = async (from: string, to: string, date: string, type?: string, returnDate?: string) => {
    await actions.handleAIRecFlights(from, to, date, type, returnDate, sync.trip?.flightEstimates || []);
  };

  // If not authenticated, render Login/Register Terminal
  if (!auth.currentUser) {
    return (
      <LoginTerminal
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        authMode={auth.authMode}
        setAuthMode={auth.setAuthMode}
        authUsername={auth.authUsername}
        setAuthUsername={auth.setAuthUsername}
        authPassword={auth.authPassword}
        setAuthPassword={auth.setAuthPassword}
        authName={auth.authName}
        setAuthName={auth.setAuthName}
        authEmail={auth.authEmail}
        setAuthEmail={auth.setAuthEmail}
        authError={auth.authError}
        setAuthError={auth.setAuthError}
        onAuthSubmit={auth.handleAuthSubmit}
      />
    );
  }

  const isLight = theme === "light";
  const { trip, syncing, errorState, pendingInvitations, isOffline } = sync;

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600/35 antialiased overflow-x-hidden relative transition-colors duration-300 ${
      isLight ? "bg-transparent text-slate-950" : "bg-[#0b0e14] text-slate-100"
    }`}>
      {/* Background glowing ambient blobs for Glassmorphism */}
      <div id="orb-left" className={`ambient-orb w-[450px] h-[450px] bg-blue-600/10 -top-20 -left-20 pointer-events-none transition-opacity duration-300 ${isLight ? "opacity-10" : "opacity-35"}`} />
      <div id="orb-right" className={`ambient-orb w-[420px] h-[420px] bg-indigo-600/10 bottom-20 -right-20 pointer-events-none transition-opacity duration-300 ${isLight ? "opacity-10" : "opacity-35"}`} />
      
      <div className="z-10 flex flex-col min-h-screen">
        
        {isOffline && (
          <div className="bg-amber-500 text-slate-900 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-fadeIn z-50 transition-all border-b border-amber-600">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
            </span>
            <span>
              {lang === "zh" 
                ? "✈️ 飛航離線模式：您已中斷網際網路連線。所有變更皆會保存在本地，並在連線後自動同步至雲端資料庫。"
                : "✈️ Offline Airplane Mode: You are currently disconnected from the Internet. Your edits will be saved locally and sync automatically when connected."}
            </span>
          </div>
        )}

        {/* 1. Header Workspace */}
        {trip && (
          <HeaderWorkspace
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            syncing={syncing}
            trip={trip}
            currentUser={auth.currentUser}
            onSelectTrip={sync.handleSelectTrip}
            onShowCreateTripModal={() => setShowCreateTripModal(true)}
            onDeleteTrip={actions.handleDeleteTrip}
            onLogout={auth.handleLogout}
            onOpenInviteModal={() => {
              setInviteError(null);
              setInviteSuccess(null);
              setInviteUsername("");
              setShowInviteModal(true);
            }}
          />
        )}

        {/* 2. Create Trip Overlay Modal Dialog */}
        {showCreateTripModal && (
          <CreateTripModal
            lang={lang}
            newTripName={newTripName}
            setNewTripName={setNewTripName}
            newTripDestination={newTripDestination}
            setNewTripDestination={setNewTripDestination}
            newTripBudget={newTripBudget}
            setNewTripBudget={setNewTripBudget}
            onSubmit={handleCreateTripSubmit}
            onClose={() => {
              setCreateTripError(null);
              setShowCreateTripModal(false);
            }}
            isCreating={isCreatingTrip}
            error={createTripError}
          />
        )}

        {/* 2.5. Root-level Invitation Modal Dialog for perfect screen-centering */}
        {showInviteModal && trip && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowInviteModal(false);
              }
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          >
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-scaleIn">
              
              {/* Close button */}
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    {lang === "zh" ? "拉入旅伴加入當前專案" : "Pull Traveler into Project"}
                  </h3>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 leading-none">
                    {lang === "zh" ? "立刻實現多瀏覽器/多帳號即時協同規劃" : "Enable multi-device real-time sync planning"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    {lang === "zh" ? "旅群組員的帳號名稱 (Username)" : "Team Member's Username"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder={lang === "zh" ? "輸入組員帳號，例如：chloe" : "e.g. chloe, david"}
                      className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/50 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/35 transition"
                      disabled={isInviting}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Suggestions Box to optimize user testing experience */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-[11px] text-emerald-350 space-y-1.5">
                  <p className="font-extrabold flex items-center gap-1">
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
                  <p className="text-[9.5px] text-slate-450 mt-1 leading-normal italic">
                    {lang === "zh" ? "* 點擊上方帳號快速填寫！你也可以在登出後註冊新帳號來邀請對帳。" : "* Click to select! You can also log out, register new users, and invite them."}
                  </p>
                </div>

                {/* 👥 Current Team / Kick Members Section */}
                <div className="border-t border-white/5 pt-4 mt-2">
                  <label className="block text-[11px] font-extrabold text-slate-450 uppercase tracking-wider mb-2">
                    {lang === "zh" ? "📋 管理組員 / 踢除組員" : "📋 Current Team Members (Kick / Remove)"}
                  </label>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 select-none">
                    {(trip.participants || []).map((p) => {
                      const isSelf = auth.currentUser && p.id === auth.currentUser.id;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/3 border border-white/5 text-xs">
                          <div className="flex items-center gap-2">
                            <div style={{ backgroundColor: p.avatarColor }} className="w-5 h-5 rounded-full text-[9px] font-black text-white flex items-center justify-center uppercase">
                              {p.name ? p.name[0] : "?"}
                            </div>
                            <span className="font-bold text-white">
                              {p.name} {isSelf && <span className="text-[9px] text-slate-400 font-mono">(You)</span>}
                            </span>
                          </div>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleKickParticipant(p.id)}
                              className="text-[10.5px] text-rose-400 hover:text-rose-200 font-bold underline cursor-pointer"
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
                    <span>{inviteError}</span>
                  </div>
                )}

                {inviteSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-emerald-300 text-[11px] font-bold flex items-center gap-2 animate-pulse">
                    <span className="shrink-0 text-xs">✔️</span>
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-bold text-slate-350 cursor-pointer transition border border-white/5"
                  >
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteUsername.trim()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-555 border border-emerald-500/30 text-[11px] font-bold text-white rounded-xl cursor-pointer transition shadow-lg shadow-emerald-600/15 flex items-center gap-1 disabled:opacity-50"
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
        )}

        {/* 3. Error warnings */}
        {errorState && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 p-3.5 text-center text-xs text-rose-300 font-sans tracking-wide flex items-center justify-center gap-2 animate-fadeIn z-30">
            <RefreshCw size={13} className="animate-spin text-rose-400" />
            <span>{errorState}</span>
            <button
              onClick={() => sync.fetchTripData(true)}
              className="ml-3 px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/35 text-white font-bold rounded cursor-pointer transition text-[10.5px]"
            >
              {translations[lang].retryGateway}
            </button>
          </div>
        )}

        {/* Pending Invitations Banner */}
        {pendingInvitations.length > 0 && (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-4">
            <div className="bg-gradient-to-r from-indigo-600/30 via-indigo-505/20 to-indigo-600/30 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl animate-bounce">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30">
                  <Users size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white">
                    {lang === "zh" ? "📬 收到新的旅伴專案合作邀請！" : "📬 New Project Sync Invitation!"}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
                    {lang === "zh"
                      ? `旅伴「${pendingInvitations[0].inviterName}」邀請你加入共同規劃的新旅程專案：「${pendingInvitations[0].tripName}」`
                      : `Traveler "${pendingInvitations[0].inviterName}" invited you to co-plan the project: "${pendingInvitations[0].tripName}"`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => sync.handleRespondInvitation(pendingInvitations[0].id, "decline")}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl text-[10.5px] font-bold text-rose-300 transition cursor-pointer"
                >
                  {lang === "zh" ? "拒絕" : "Decline"}
                </button>
                <button
                  onClick={() => sync.handleRespondInvitation(pendingInvitations[0].id, "accept")}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-550 border border-emerald-500/30 rounded-xl text-[10.5px] font-bold text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  {lang === "zh" ? "接受邀請" : "Accept Group"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Navigation Tabs */}
        {trip && (
          <nav className="glass-container border-b border-white/10 py-2 sm:py-3 px-4 shadow sticky top-[73px] lg:top-[69px] z-30 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex overflow-x-auto gap-1.5 scrollbar-none pb-1 text-xs">
              <button
                id="tab-btn-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "dashboard" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>📊</span>
                <span>{lang === "zh" ? "首頁控制台" : "Dashboard"}</span>
              </button>

              <button
                id="tab-btn-itinerary"
                onClick={() => setActiveTab("itinerary")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "itinerary" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <Calendar size={13} className="text-blue-400" />
                <span>{translations[lang].tabItinerary}</span>
              </button>

              <button
                id="tab-btn-map"
                onClick={() => setActiveTab("map")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "map" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <Map size={13} className="text-blue-400" />
                <span>{translations[lang].tabMap}</span>
              </button>

              <button
                id="tab-btn-flights"
                onClick={() => setActiveTab("flights")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "flights" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <Plane size={14} className="text-blue-400" />
                <span>{translations[lang].tabFlights}</span>
              </button>

              <button
                id="tab-btn-budget"
                onClick={() => setActiveTab("budget")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "budget" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <DollarSign size={13} className="text-blue-400" />
                <span>{translations[lang].tabBudget}</span>
              </button>

              <button
                id="tab-btn-vault"
                onClick={() => setActiveTab("vault")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "vault" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <Lock size={13} className="text-blue-400" />
                <span>{translations[lang].tabVault}</span>
              </button>

              <button
                id="tab-btn-chat"
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2 rounded-xl font-extrabold cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "chat" ? "bg-white/10 text-white shadow-inner font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <Users size={13} className="text-blue-400" />
                <span>{translations[lang].tabChat}</span>
              </button>
            </div>
          </nav>
        )}

        {/* 5. Main Panel Body */}
        <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 text-sm">
          {trip && auth.currentUser && (
            <div className="space-y-6 animate-fadeIn">
              {activeTab === "dashboard" && (
                <TripDashboard
                  trip={trip}
                  trips={trip.tripsList || []}
                  lang={lang}
                  onSwitchTrip={sync.handleSelectTrip}
                  onCreateTrip={() => setShowCreateTripModal(true)}
                  onEditTripMeta={actions.handleEditTripMeta}
                  onDeleteTrip={actions.handleDeleteTrip}
                />
              )}

              {activeTab === "itinerary" && (
                <ItineraryPlanner
                  itineraries={trip.itineraries}
                  participants={trip.participants}
                  currentUser={auth.currentUser.id}
                  onVoteItinerary={(itemId) => actions.handleVote("itinerary", itemId)}
                  onCommentItinerary={actions.handleAddComment}
                  onAddItineraryItem={actions.handleAddItineraryItem}
                  lang={lang}
                  onApplyAIOptimization={actions.handleApplyAIOptimization}
                  onPostAISystemMessage={handlePostAISystemMessage}
                  backupItineraries={trip.backupItineraries || []}
                  onRestoreItineraries={handleRestoreItineraries}
                  onDeleteItineraryItem={actions.handleDeleteItineraryItem}
                  onUpdateItineraryItem={actions.handleUpdateItineraryItem}
                />
              )}

              {activeTab === "map" && (
                <OfflineMapSimulator
                  destination={trip.destination}
                  itineraries={trip.itineraries}
                  participants={trip.participants}
                  currentUserId={auth.currentUser.id}
                  onSelectLocation={(item) => {
                    console.log("Selected map checkpoint:", item);
                  }}
                  onAddItineraryItem={actions.handleAddItineraryItem}
                  onUpdateItineraryItem={actions.handleUpdateItineraryItem}
                  onDeleteItineraryItem={actions.handleDeleteItineraryItem}
                  lang={lang}
                  tripLat={trip.lat}
                  tripLng={trip.lng}
                />
              )}

              {activeTab === "flights" && (
                <FlightHub
                  tripId={trip.id}
                  flightEstimates={trip.flightEstimates}
                  participants={trip.participants}
                  currentUser={auth.currentUser.id}
                  onVoteFlight={(flightId) => actions.handleVote("flight", flightId)}
                  onFetchAIRec={handleAIRecFlights}
                  lang={lang}
                />
              )}

              {activeTab === "budget" && (
                <ExpenseTracker
                  expenses={trip.expenses}
                  participants={trip.participants}
                  totalBudget={trip.totalBudget}
                  onAddExpense={actions.handleAddExpense}
                  onDeleteExpense={actions.handleDeleteExpense}
                  onUpdateBudget={(num) => sync.postTripUpdate({ totalBudget: num })}
                  onUpdateParticipants={(updatedParts) => sync.postTripUpdate({ participants: updatedParts })}
                  activeUserId={auth.currentUser.id}
                  lang={lang}
                  onInviteUser={actions.handleInviteUser}
                />
              )}

              {activeTab === "vault" && (
                <DocumentVault
                  documents={trip.documents}
                  currentUser={auth.currentUser.name}
                  onUploadDocument={actions.handleUploadDocument}
                  lang={lang}
                />
              )}

              {activeTab === "chat" && (
                <EncryptedWorkspaceChat
                  chats={trip.chats}
                  participants={trip.participants}
                  currentUser={auth.currentUser.id}
                  onSendMessage={actions.handleSendChatMessage}
                  lang={lang}
                />
              )}
            </div>
          )}
        </main>

        {/* 6. Minimal Human Footer */}
        <footer className="bg-slate-950/60 border-t border-white/5 py-4 px-4 text-center text-[10.5px] text-slate-400 font-mono tracking-wide backdrop-blur-md select-none">
          {translations[lang].footerText}
        </footer>
      </div>
    </div>
  );
}
