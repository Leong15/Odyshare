import React, { useState, useEffect, lazy, Suspense } from "react";
import { 
  Calendar, Map, Plane, DollarSign, Lock, Users, RefreshCw, UserPlus, X
} from "lucide-react";
import { Trip, ItineraryItem, ExpenseItem, DocumentItem, ChatMessage } from "./types";
import { translations } from "./lib/translations";

// Modular Subcomponents
import LoginTerminal from "./components/LoginTerminal";
import HeaderWorkspace from "./components/common/HeaderWorkspace";
import CreateTripModal from "./components/CreateTripModal";
import InviteMemberModal from "./components/common/InviteMemberModal";
// Tab Subcomponents (Lazy Loaded)
const TripDashboard = lazy(() => import("./components/TripDashboard"));
const ItineraryPlanner = lazy(() => import("./components/ItineraryPlanner"));
const ExpenseTracker = lazy(() => import("./components/ExpenseTracker"));
const OfflineMapSimulator = lazy(() => import("./components/map/OfflineMapSimulator"));
const DocumentVault = lazy(() => import("./components/DocumentVault"));
const EncryptedWorkspaceChat = lazy(() => import("./components/chat/EncryptedWorkspaceChat"));

// Custom Hooks for Modular Architecture
import { useAuth } from "./hooks/useAuth";
import { useTripSync } from "./hooks/useTripSync";
import { useTripActions } from "./hooks/useTripActions";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "map" | "itinerary" | "budget" | "vault" | "chat" | "ai">("dashboard");
  const [lang, setLang] = useState<"en" | "zh">("zh"); // Defaulting to zh (Traditional Chinese)
  
  // Theme Switching
  const [theme, setTheme] = useState<"light" | "dark" | any>(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  // Local state for actions error reporting
  const [errorState, setErrorState] = useState<string | null>(null);

  // 1. Initialize Auth State Engine
  const auth = useAuth(lang);

  // 2. Initialize Trip Synchronization Engine (Interval polling, pending invitation notifications)
  const sync = useTripSync({
    loggedInUserId: auth.loggedInUserId,
    onUserResolved: auth.setCurrentUser,
    onSessionExpired: auth.handleLogout,
  });

  // 3. Initialize Trip Actions Engine (Shared trip level CRUD operations)
  const actions = useTripActions({
    fetchWithAuth: sync.fetchWithAuth,
    postTripUpdate: sync.postTripUpdate,
    fetchTripData: sync.fetchTripData,
    setTrip: sync.setTrip,
    currentUser: auth.currentUser,
    lang,
    onError: (msg) => setErrorState(msg),
  });

  // Modal overlays setup
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [newTripName, setNewTripName] = useState<string>("");
  const [newTripDestination, setNewTripDestination] = useState<string>("");
  const [newTripBudget, setNewTripBudget] = useState<string>("");
  const [isCreatingTrip, setIsCreatingTrip] = useState<boolean>(false);
  const [createTripError, setCreateTripError] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);

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

  // Invite and kick functions are passed directly to InviteMemberModal

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
    if (sync.trip) {
      actions.handlePostAISystemMessage(text, sync.trip.chats);
    }
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
  const { trip, syncing, errorState: syncErrorState, pendingInvitations, isOffline } = sync;

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
            onOpenInviteModal={() => setShowInviteModal(true)}
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
          <InviteMemberModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            participants={trip.participants || []}
            currentUser={auth.currentUser}
            onInviteUser={actions.handleInviteUser}
            onKickParticipant={actions.handleKickParticipant}
            lang={lang}
          />
        )}

        {/* 3. Error warnings */}
        {(errorState || syncErrorState) && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 p-3.5 text-center text-xs text-rose-300 font-sans tracking-wide flex items-center justify-center gap-2 animate-fadeIn z-30">
            <RefreshCw size={13} className="animate-spin text-rose-400" />
            <span>{errorState || syncErrorState}</span>
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
          <nav className="glass-container border-b border-white/5 py-3 px-5 sticky top-[73px] lg:top-[69px] z-30 backdrop-blur-none">
            <div className="max-w-7xl mx-auto flex overflow-x-auto gap-2 scrollbar-none pb-1 text-[13px] scroll-smooth">
              <button
                id="tab-btn-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`nav-tab ${activeTab === "dashboard" ? "nav-tab-active" : "nav-tab-inactive"}`}
              >
                <span>📊</span>
                <span>{lang === "zh" ? "首頁控制台" : "Dashboard"}</span>
              </button>

              <button
                id="tab-btn-itinerary"
                onClick={() => setActiveTab("itinerary")}
                className={`nav-tab ${activeTab === "itinerary" ? "nav-tab-active" : "nav-tab-inactive"}`}
              >
                <Calendar size={14} className="shrink-0" />
                <span>{translations[lang].tabItinerary}</span>
              </button>

              <button
                id="tab-btn-map"
                onClick={() => setActiveTab("map")}
                className={`nav-tab ${activeTab === "map" ? "nav-tab-active" : "nav-tab-inactive"}`}
              >
                <Map size={14} className="shrink-0" />
                <span>{translations[lang].tabMap}</span>
              </button>

              <button
                id="tab-btn-budget"
                onClick={() => setActiveTab("budget")}
                className={`nav-tab ${activeTab === "budget" ? "nav-tab-active" : "nav-tab-inactive"}`}
              >
                <DollarSign size={14} className="shrink-0" />
                <span>{translations[lang].tabBudget}</span>
              </button>

              <button
                id="tab-btn-vault"
                onClick={() => setActiveTab("vault")}
                className={`nav-tab ${activeTab === "vault" ? "nav-tab-active" : "nav-tab-inactive"}`}
              >
                <Lock size={14} className="shrink-0" />
                <span>{translations[lang].tabVault}</span>
              </button>

              <button
                id="tab-btn-chat"
                onClick={() => setActiveTab("chat")}
                className={`nav-tab ${activeTab === "chat" ? "nav-tab-active" : "nav-tab-inactive"}`}
              >
                <Users size={14} className="shrink-0" />
                <span>{translations[lang].tabChat}</span>
              </button>
            </div>
          </nav>
        )}

        {/* 5. Main Panel Body */}
        <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 text-sm">
          {trip && auth.currentUser && (
            <div className="space-y-6 animate-fadeIn">
              <Suspense fallback={
                <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3 bg-slate-900/50 border border-white/5 rounded-2xl backdrop-blur-sm animate-pulse">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Loading Secure Workspace Module...</span>
                </div>
              }>
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
                    onApplyAIOptimization={(items) =>
                      actions.handleApplyAIOptimization(items, trip.itineraries)
                    }
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
                    onInviteExternalUser={actions.handleInviteExternalUser}
                    onUpgradeExternalUser={actions.handleUpgradeExternalUser}
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
              </Suspense>
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
