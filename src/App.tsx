import React, { useState, useEffect } from "react";
import { 
  Calendar, Map, Plane, DollarSign, Lock, Users, Sparkles, RefreshCw, UserPlus, X
} from "lucide-react";
import { Trip, Participant, ItineraryItem, ExpenseItem, DocumentItem, ChatMessage } from "./types";
import { translations } from "./lib/translations";

// Modular Subcomponents
import LoginTerminal from "./components/LoginTerminal";
import HeaderWorkspace from "./components/HeaderWorkspace";
import CreateTripModal from "./components/CreateTripModal";

// Tab Subcomponents
import ItineraryPlanner from "./components/ItineraryPlanner";
import ExpenseTracker from "./components/ExpenseTracker";
import OfflineMapSimulator from "./components/OfflineMapSimulator";
import DocumentVault from "./components/DocumentVault";
import FlightHub from "./components/FlightHub";
import EncryptedWorkspaceChat from "./components/EncryptedWorkspaceChat";

// Safe Base64 encoder helper supporting non-Latin1 character sets (like Chinese/emojis)
const safeBtoa = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (err) {
    return btoa(str);
  }
};

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => {
    return localStorage.getItem("loggedInUserId") || null;
  });
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "itinerary" | "flights" | "budget" | "vault" | "chat" | "ai">("itinerary");
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "zh">("zh"); // Defaulting to zh (Traditional Chinese)
  
  // Theme Switching
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  // Authentication Fields
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Modal setup to create new trip projects
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [newTripName, setNewTripName] = useState<string>("");
  const [newTripDestination, setNewTripDestination] = useState<string>("");
  const [newTripBudget, setNewTripBudget] = useState<string>("");

  // Invite member modal states at root level for perfect viewport centering
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteUsername, setInviteUsername] = useState<string>("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState<boolean>(false);

  // Pending user project invitations state
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Request-scoper wrapper
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const uId = localStorage.getItem("loggedInUserId") || loggedInUserId || "";
    const headers = {
      ...options.headers,
      "x-user-id": uId,
      "x-trip-id": trip?.id || ""
    } as Record<string, string>;

    return fetch(url, {
      ...options,
      headers
    });
  };

  const fetchInvitations = async () => {
    const uId = localStorage.getItem("loggedInUserId") || loggedInUserId;
    if (!uId) return;
    try {
      const res = await fetchWithAuth("/api/trip/invitations");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server did not return JSON yet. It may be starting up.");
        }
        const invs = await res.json();
        setPendingInvitations(invs);
      }
    } catch (err) {
      console.error("Failed to fetch pending invitations:", err);
    }
  };

  // 1. Initial State pull from server
  const fetchTripData = async (showSyncIndicator = false) => {
    const uId = localStorage.getItem("loggedInUserId") || loggedInUserId;
    if (!uId) {
      setCurrentUser(null);
      return;
    }
    if (showSyncIndicator) setSyncing(true);
    fetchInvitations();
    try {
      const res = await fetchWithAuth("/api/trip");
      if (!res.ok) throw new Error("Server responded with error status");
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Backend server is booting up or returned HTML instead of JSON.");
      }

      const data: Trip = await res.json();
      setTrip(data);
      setErrorState(null);

      const found = data.participants.find(p => p.id === uId);
      if (found) {
        setCurrentUser({
          ...found,
          username: localStorage.getItem("loggedInUserUsername") || found.username || ""
        });
      } else {
        // Fallback or user was deleted from participants list
        setCurrentUser({
          id: uId,
          name: localStorage.getItem("loggedInUserName") || "Traveler",
          email: "traveler@example.com",
          avatarColor: localStorage.getItem("loggedInUserColor") || "#3b82f6",
          publicKey: "pub_key_sec_unresolved",
          budgetLimit: 1500,
          username: localStorage.getItem("loggedInUserUsername") || ""
        });
      }
    } catch (err) {
      console.error("Failed to sync trip data from server:", err);
      setErrorState("Synchronization connection offline. Re-routing through local gateway...");
    } finally {
      if (showSyncIndicator) setSyncing(false);
    }
  };

  useEffect(() => {
    const uId = localStorage.getItem("loggedInUserId") || loggedInUserId;
    if (uId) {
      fetchTripData(true);
    }

    // Dynamic collaborative room sync polling interval every 4 seconds
    const interval = setInterval(() => {
      const currentUid = localStorage.getItem("loggedInUserId") || loggedInUserId;
      if (currentUid) {
        fetchTripData(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [loggedInUserId, trip?.id]);

  // Post changes helper
  const postTripUpdate = async (updatedFields: Partial<Trip>) => {
    try {
      const res = await fetchWithAuth("/api/trip/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auth form submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError(lang === "zh" ? "請填寫所有欄位" : "Please fill in all fields");
      return;
    }
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body: Record<string, string> = {
      username: authUsername.trim().toLowerCase(),
      password: authPassword.trim()
    };
    if (authMode === "register") {
      if (!authName.trim()) {
        setAuthError(lang === "zh" ? "請填寫旅伴顯示名稱" : "Please fill in display name");
        return;
      }
      body.name = authName.trim();
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
      } else {
        // Successful login/register
        const loggedUser = data.user;
        localStorage.setItem("loggedInUserId", loggedUser.id);
        localStorage.setItem("loggedInUserName", loggedUser.name);
        localStorage.setItem("loggedInUserColor", loggedUser.avatarColor || "#3b82f6");
        localStorage.setItem("loggedInUserUsername", loggedUser.username || "");
        setLoggedInUserId(loggedUser.id);
        setCurrentUser(loggedUser);
        
        // Reset auth state
        setAuthUsername("");
        setAuthPassword("");
        setAuthName("");
        setAuthError(null);
      }
    } catch (err) {
      console.error(err);
      setAuthError(lang === "zh" ? "連線伺服器失敗，請稍後再試" : "Connection failed, please try again");
    }
  };

  const handleSelectTrip = async (id: string) => {
    try {
      const res = await fetch("/api/trip/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim()) return;
    try {
      const res = await fetchWithAuth("/api/trip/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTripName.trim(),
          destination: newTripDestination.trim() || undefined,
          totalBudget: newTripBudget.trim() ? Number(newTripBudget) : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
        setShowCreateTripModal(false);
        setNewTripName("");
        setNewTripDestination("");
        setNewTripBudget("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm(lang === "zh" ? "確定要刪除此協作專案嗎？" : "Are you sure you want to delete this trip workspace?")) return;
    try {
      const res = await fetchWithAuth("/api/trip/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItineraryItem = async (item: Omit<ItineraryItem, 'id' | 'votes' | 'comments'>) => {
    try {
      const res = await fetchWithAuth("/api/trip/itinerary/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItineraryItem = async (item: ItineraryItem) => {
    try {
      const res = await fetchWithAuth("/api/trip/itinerary/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItineraryItem = async (itemId: string) => {
    try {
      const res = await fetchWithAuth("/api/trip/itinerary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (targetType: "itinerary" | "flight", targetId: string) => {
    try {
      const res = await fetchWithAuth("/api/trip/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, userId: currentUser?.id })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (itemId: string, text: string) => {
    try {
      const res = await fetchWithAuth("/api/trip/itinerary/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, userId: currentUser?.id, userName: currentUser?.name, text })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExpense = async (expense: Omit<ExpenseItem, 'id'>) => {
    try {
      const res = await fetchWithAuth("/api/trip/expense/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const res = await fetchWithAuth("/api/trip/expense/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDocument = async (doc: Omit<DocumentItem, 'id' | 'uploadedAt' | 'url' | 'accessKey'>) => {
    try {
      const res = await fetchWithAuth("/api/trip/document/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc)
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatMessage = async (msg: string) => {
    const encryptedMsg = "U2FsdGVkX19" + safeBtoa(msg);
    try {
      const res = await fetchWithAuth("/api/trip/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser?.id,
          senderName: currentUser?.name,
          avatarColor: currentUser?.avatarColor,
          messageDecrypted: msg,
          messageEncrypted: encryptedMsg
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyAIOptimization = (items: ItineraryItem[]) => {
    if (trip) {
      postTripUpdate({
        backupItineraries: [...trip.itineraries],
        itineraries: items
      });
    }
  };

  const handleRestoreItineraries = () => {
    if (trip?.backupItineraries && trip.backupItineraries.length > 0) {
      postTripUpdate({
        itineraries: [...trip.backupItineraries],
        backupItineraries: []
      });
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
    if (trip) {
      postTripUpdate({ chats: [...trip.chats, systemMsg] });
    }
  };

  const handleAIRecFlights = async (from: string, to: string, date: string, type?: string, returnDate?: string): Promise<void> => {
    try {
      const res = await fetchWithAuth("/api/ai/recommend-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, date, type, returnDate })
      });
      if (res.ok) {
        const data = await res.json();
        const flights = data.flights || [];
        const updatedEstimates = [...(trip?.flightEstimates || [])];
        flights.forEach((f: any, idx: number) => {
          updatedEstimates.push({
            id: "fl-ai-" + idx + "-" + Date.now(),
            carrier: f.carrier,
            carrierLogo: "⭐",
            from,
            to,
            price: f.price,
            stops: f.stops,
            duration: f.duration,
            departureTime: f.departureTime,
            rating: f.rating,
            bookingUrl: f.bookingUrl,
            currency: f.currency,
            votes: []
          });
        });
        postTripUpdate({ flightEstimates: updatedEstimates });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteUser = async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetchWithAuth("/api/trip/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: "Connection error" };
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);
    try {
      const res = await handleInviteUser(inviteUsername.trim());
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
    } catch (err) {
      setInviteError(lang === "zh" ? "連線失敗" : "Server error");
    } finally {
      setIsInviting(false);
    }
  };

  const handleKickParticipant = async (userIdToKick: string) => {
    try {
      const res = await fetchWithAuth("/api/trip/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdToKick })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.trip) {
          setTrip(data.trip);
        }
        setInviteSuccess(lang === "zh" ? "✔️ 成員已成功踢除/移除。" : "✔️ Member kicked successfully.");
        setTimeout(() => setInviteSuccess(null), 2500);
      } else {
        setInviteError(data.error || "Failed to kick participant");
        setTimeout(() => setInviteError(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setInviteError("Connection failure");
    }
  };

  const handleRespondInvitation = async (invitationId: string, action: "accept" | "decline") => {
    try {
      const res = await fetchWithAuth("/api/trip/invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action })
      });
      if (res.ok) {
        await fetchTripData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedInUserId");
    localStorage.removeItem("loggedInUserName");
    localStorage.removeItem("loggedInUserColor");
    setLoggedInUserId(null);
    setCurrentUser(null);
  };

  // 1. If not logged in, render authentication panel
  if (!currentUser) {
    return (
      <LoginTerminal
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authName={authName}
        setAuthName={setAuthName}
        authError={authError}
        setAuthError={setAuthError}
        onAuthSubmit={handleAuthSubmit}
      />
    );
  }

  const isLight = theme === "light";

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600/35 antialiased overflow-x-hidden relative transition-colors duration-300 ${
      isLight ? "bg-transparent text-slate-950" : "bg-[#0b0e14] text-slate-100"
    }`}>
      {/* Background glowing ambient blobs for Glassmorphism */}
      <div id="orb-left" className={`ambient-orb w-[450px] h-[450px] bg-blue-600/10 -top-20 -left-20 pointer-events-none transition-opacity duration-300 ${isLight ? "opacity-10" : "opacity-35"}`} />
      <div id="orb-right" className={`ambient-orb w-[420px] h-[420px] bg-indigo-600/10 bottom-20 -right-20 pointer-events-none transition-opacity duration-300 ${isLight ? "opacity-10" : "opacity-35"}`} />
      
      <div className="z-10 flex flex-col min-h-screen">
        
        {/* 1. Header workspace */}
        {trip && (
          <HeaderWorkspace
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            syncing={syncing}
            trip={trip}
            currentUser={currentUser}
            onSelectTrip={handleSelectTrip}
            onShowCreateTripModal={() => setShowCreateTripModal(true)}
            onDeleteTrip={handleDeleteTrip}
            onLogout={handleLogout}
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
            onSubmit={handleCreateTrip}
            onClose={() => setShowCreateTripModal(false)}
          />
        )}

        {/* 2.5. Root-level Invitation Modal Dialog for perfect screen-centering */}
        {showInviteModal && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowInviteModal(false);
              }
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          >
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              
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
                      const isSelf = currentUser && p.id === currentUser.id;
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
                      <>
                        <span>{lang === "zh" ? "確認加入" : "Add Member"}</span>
                      </>
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
              onClick={() => fetchTripData(true)}
              className="ml-3 px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/35 text-white font-bold rounded cursor-pointer transition text-[10.5px]"
            >
              {translations[lang].retryGateway}
            </button>
          </div>
        )}

        {/* Pending Invitations Banner - Dynamic acceptance gate for collaborated projects */}
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
                  onClick={() => handleRespondInvitation(pendingInvitations[0].id, "decline")}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl text-[10.5px] font-bold text-rose-300 transition cursor-pointer"
                >
                  {lang === "zh" ? "拒絕" : "Decline"}
                </button>
                <button
                  onClick={() => handleRespondInvitation(pendingInvitations[0].id, "accept")}
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
          {trip && currentUser && (
            <div className="space-y-6 animate-fadeIn">
              {activeTab === "itinerary" && (
                <ItineraryPlanner
                  itineraries={trip.itineraries}
                  participants={trip.participants}
                  currentUser={currentUser.id}
                  onVoteItinerary={(itemId) => handleVote("itinerary", itemId)}
                  onCommentItinerary={handleAddComment}
                  onAddItineraryItem={handleAddItineraryItem}
                  lang={lang}
                  onApplyAIOptimization={handleApplyAIOptimization}
                  onPostAISystemMessage={handlePostAISystemMessage}
                  backupItineraries={trip.backupItineraries || []}
                  onRestoreItineraries={handleRestoreItineraries}
                />
              )}

              {activeTab === "map" && (
                <OfflineMapSimulator
                  destination={trip.destination}
                  itineraries={trip.itineraries}
                  onSelectLocation={(item) => {
                    // Stay inside map tab! Let user explore landmarks smoothly without bouncing out.
                    console.log("Selected map checkpoint:", item);
                  }}
                  onAddItineraryItem={handleAddItineraryItem}
                  onUpdateItineraryItem={handleUpdateItineraryItem}
                  onDeleteItineraryItem={handleDeleteItineraryItem}
                  lang={lang}
                />
              )}

              {activeTab === "flights" && (
                <FlightHub
                  tripId={trip.id}
                  flightEstimates={trip.flightEstimates}
                  participants={trip.participants}
                  currentUser={currentUser.id}
                  onVoteFlight={(flightId) => handleVote("flight", flightId)}
                  onFetchAIRec={handleAIRecFlights}
                  lang={lang}
                />
              )}

              {activeTab === "budget" && (
                <ExpenseTracker
                  expenses={trip.expenses}
                  participants={trip.participants}
                  totalBudget={trip.totalBudget}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onUpdateBudget={(num) => postTripUpdate({ totalBudget: num })}
                  onUpdateParticipants={(updatedParts) => postTripUpdate({ participants: updatedParts })}
                  activeUserId={currentUser.id}
                  lang={lang}
                  onInviteUser={handleInviteUser}
                />
              )}

              {activeTab === "vault" && (
                <DocumentVault
                  documents={trip.documents}
                  currentUser={currentUser.name}
                  onUploadDocument={handleUploadDocument}
                  lang={lang}
                />
              )}

              {activeTab === "chat" && (
                <EncryptedWorkspaceChat
                  chats={trip.chats}
                  participants={trip.participants}
                  currentUser={currentUser.id}
                  onSendMessage={handleSendChatMessage}
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
