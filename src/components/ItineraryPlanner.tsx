import React, { useState, useEffect, useRef } from "react";
import { Clock, MapPin, MessageSquare, ThumbsUp, Plus, Eye, Send, Landmark, ShoppingBag, Utensils, Route, Bed, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { ItineraryItem, Participant } from "../types";
import { translations } from "../lib/translations";
import ItineraryMap from "./ItineraryMap";

interface ItineraryPlannerProps {
  itineraries: ItineraryItem[];
  participants: Participant[];
  currentUser: string;
  onVoteItinerary: (itemId: string) => void;
  onCommentItinerary: (itemId: string, text: string) => void;
  onAddItineraryItem: (item: Omit<ItineraryItem, "id" | "votes" | "comments" | "coordinates" | "trafficStatus">) => void;
  lang?: "en" | "zh";
  onApplyAIOptimization?: (optimizedItems: any[]) => void;
  onPostAISystemMessage?: (text: string) => void;
  backupItineraries?: ItineraryItem[];
  onRestoreItineraries?: () => void;
  onDeleteItineraryItem?: (itemId: string) => void;
  onUpdateItineraryItem?: (item: ItineraryItem) => void;
}

const getTransitIconAndDetails = (itemA: ItineraryItem, itemB: ItineraryItem, lang: "en" | "zh") => {
  const dx = (itemA.coordinates?.x || 30) - (itemB.coordinates?.x || 50);
  const dy = (itemA.coordinates?.y || 40) - (itemB.coordinates?.y || 60);
  const rawDist = Math.sqrt(dx * dx + dy * dy);
  
  let timeMins = Math.max(5, Math.floor(rawDist * 1.5));
  let icon = "🚶";
  let mode = lang === "zh" ? "步行" : "Walk";
  let line = "";

  if (timeMins > 25) {
    icon = "🚇";
    mode = lang === "zh" ? "搭乘地鐵" : "MTR Subway";
    const subways = lang === "zh" ? ["東鐵綫", "丸之內線", "銀座線", "山手線", "新宿線"] : ["East Rail Line", "Marunouchi Line", "Ginza Line", "Yamanote Line", "Shinjuku Line"];
    line = " " + subways[Math.abs(itemA.title.length - itemB.title.length) % subways.length];
  } else if (timeMins > 12) {
    icon = "🚌";
    mode = lang === "zh" ? "搭乘巴士" : "Bus Connection";
    line = " No." + (Math.abs(itemA.title.length + itemB.title.length) % 80 + 1);
  }

  return {
    icon,
    label: lang === "zh" ? `${mode}${line} — ${timeMins}分鐘` : `${mode}${line} — ${timeMins} mins`,
    distText: lang === "zh" ? `距離約 ${(rawDist * 0.15).toFixed(1)} 公里` : `dist approx ${(rawDist * 0.15).toFixed(1)} km`
  };
};

export default function ItineraryPlanner({
  itineraries,
  participants,
  currentUser,
  onVoteItinerary,
  onCommentItinerary,
  onAddItineraryItem,
  lang = "en",
  onApplyAIOptimization,
  onPostAISystemMessage,
  backupItineraries = [],
  onRestoreItineraries,
  onDeleteItineraryItem,
  onUpdateItineraryItem
}: ItineraryPlannerProps) {
  const [activeDay, setActiveDay] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("Tsukiji Morning Seafood Tasting");
  const [description, setDescription] = useState<string>("Taste authentic high grade sashimi and fresh sushi rolls near outer market streets.");
  const [locationName, setLocationName] = useState<string>("Tsukiji Outer Market, Tokyo");
  const [time, setTime] = useState<string>("09:00");
  const [category, setCategory] = useState<ItineraryItem["category"]>("restaurant");
  const [cost, setCost] = useState<string>("35");
  const [showMap, setShowMap] = useState<boolean>(true);

  // Edit states for modifying exist itinerary items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editLocationName, setEditLocationName] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [editCategory, setEditCategory] = useState<ItineraryItem["category"]>("restaurant");
  const [editCost, setEditCost] = useState<string>("");

  const maxItineraryDay = itineraries.reduce((max, item) => Math.max(max, item.dayIndex), 0);
  const [totalDays, setTotalDays] = useState<number>(() => Math.max(3, maxItineraryDay + 1));

  useEffect(() => {
    const maxIdx = itineraries.reduce((max, item) => Math.max(max, item.dayIndex), 0);
    if (maxIdx >= totalDays) {
      setTotalDays(maxIdx + 1);
    }
  }, [itineraries]);

  const [activeCommentDrawerId, setActiveCommentDrawerId] = useState<string | null>(null);
  const [newCommentInput, setNewCommentInput] = useState<string>("");

  // AI merged states
  const [sidebarTab, setSidebarTab] = useState<"ai" | "discussion">("ai");
  const [prefInput, setPrefInput] = useState<string>("Cuisine focus, cultural shrines, optimal walk distances");
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [chatMsg, setChatMsg] = useState<string>("");
  const [chatLog, setChatLog] = useState<{ sender: "user" | "ai"; text: string }[]>(() => [
    { 
      sender: "ai", 
      text: lang === "zh"
        ? "您好！我是 OdyShareSmart 智慧行程管家。您可以在此處輸入組員度假偏好，讓我為您升級日程；或者在下方詢問我關於東京地鐵乘車指引、當地小眾海鮮居酒屋推薦！"
        : "Konnichiwa! I'm OdyShareSmart, your group's travel assistant. Enter preferences above to let me upgrade your schedule, or ask me anything about subway lines and hidden food corridors!" 
    }
  ]);
  const [submittingChat, setSubmittingChat] = useState<boolean>(false);
  const [voiceInput, setVoiceInput] = useState<string>("");
  const [voiceParsing, setVoiceParsing] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailParsing, setEmailParsing] = useState<boolean>(false);
  const [tspOptimizing, setTspOptimizing] = useState<boolean>(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isOptimizerCollapsed, setIsOptimizerCollapsed] = useState<boolean>(false);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState<boolean>(false);
  const [isEmailCollapsed, setIsEmailCollapsed] = useState<boolean>(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);

  const dayTabsScrollRef = useRef<HTMLDivElement>(null);
  const scrollDayTabs = (direction: "left" | "right") => {
    if (dayTabsScrollRef.current) {
      const scrollAmount = 180;
      dayTabsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    const scrollTabToCenter = () => {
      if (dayTabsScrollRef.current) {
        const activeTabEl = document.getElementById(`day-tab-${activeDay}`);
        if (activeTabEl) {
          const container = dayTabsScrollRef.current;
          const containerWidth = container.offsetWidth;
          const tabWidth = activeTabEl.offsetWidth;
          const tabOffsetLeft = activeTabEl.offsetLeft;
          
          // Calculate target scrollLeft to center the tab
          const targetScrollLeft = tabOffsetLeft - (containerWidth / 2) + (tabWidth / 2);
          
          container.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth"
          });
        }
      }
    };

    // Scroll immediately and also after a short timeout to ensure correct layout rendering
    scrollTabToCenter();
    const timeoutId = setTimeout(scrollTabToCenter, 60);
    return () => clearTimeout(timeoutId);
  }, [activeDay, totalDays]);

  useEffect(() => {
    if (activeCommentDrawerId) {
      setSidebarTab("discussion");
    }
  }, [activeCommentDrawerId]);

  useEffect(() => {
    // Reset initial message if language changes
    setChatLog([
      {
        sender: "ai",
        text: lang === "zh"
          ? "您好！我是 OdyShareSmart 智慧行程管家。您可以在此處輸入組員度假偏好，讓我為您升級日程；或者在下方詢問我關於東京地鐵乘車指引、當地小眾海鮮居酒屋推薦！"
          : "Konnichiwa! I'm OdyShareSmart, your group's travel assistant. Enter preferences above to let me upgrade your schedule, or ask me anything about subway lines and hidden food corridors!"
      }
    ]);
  }, [lang]);

  const handleOptimize = async () => {
    if (!onApplyAIOptimization) return;
    setOptimizing(true);
    try {
      const res = await fetch("/api/ai/optimize-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefInput, currentSchedule: itineraries })
      });
      const data = await res.json();
      if (data.optimizedItems) {
        // Format to valid ItineraryItem values
        const formatted = data.optimizedItems.map((item: any, idx: number) => ({
          id: "it-opt-" + idx + "-" + Date.now(),
          dayIndex: activeDay,
          time: item.time || "12:00",
          title: item.title,
          description: item.description,
          locationName: item.locationName,
          category: item.category || "sight",
          cost: item.cost || 0,
          votes: [],
          comments: [],
          coordinates: { x: Math.floor(Math.random() * 80) + 10, y: Math.floor(Math.random() * 80) + 10 },
          trafficStatus: ["smooth", "moderate", "congested"][Math.floor(Math.random() * 3)] as any
        }));
        onApplyAIOptimization(formatted);
        if (onPostAISystemMessage) {
          onPostAISystemMessage(
            lang === "zh"
              ? `🤖 OdyShareSmart AI 行程智慧升級！套用偏好： "${prefInput}"`
              : `🤖 OdyShareSmart AI optimized schedule for: "${prefInput}"`
          );
        }
      }
    } catch (err) {
      console.error("Itinerary optimization failed:", err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleTSPOptimization = async () => {
    if (!onApplyAIOptimization || filteredItems.length <= 1) return;
    setTspOptimizing(true);
    try {
      const res = await fetch("/api/ai/optimize-tsp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: filteredItems })
      });
      const data = await res.json();
      if (data.optimized) {
        // Merge optimized items back into the rest of the itineraries (which are on OTHER days)
        const otherDaysItems = itineraries.filter(item => item.dayIndex !== activeDay);
        const combined = [...otherDaysItems, ...data.optimized];
        onApplyAIOptimization(combined);
        
        if (onPostAISystemMessage) {
          const namesFlow = data.optimized.map((it: any) => `「${it.title}」(${it.time})`).join(" ➡️ ");
          onPostAISystemMessage(
            lang === "zh"
              ? `🤖 OdyShareSmart AI 順路優化完成！已規劃最短順路路徑，減少折返跑交通時間：\n${namesFlow}`
              : `🤖 OdyShareSmart AI Route (TSP) optimization complete! Rearranged Day ${activeDay + 1} attractions to minimize round-trip travel time:\n${namesFlow}`
          );
        }
      }
    } catch (err) {
      console.error("TSP optimization failed:", err);
    } finally {
      setTspOptimizing(false);
    }
  };

  const handleVoiceScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceInput.trim()) return;
    setVoiceParsing(true);
    try {
      const res = await fetch("/api/ai/parse-voice-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: voiceInput })
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          onAddItineraryItem({
            dayIndex: item.dayIndex != null ? item.dayIndex : activeDay,
            time: item.time || "14:00",
            title: item.title,
            description: item.description,
            locationName: item.locationName,
            category: item.category || "sight",
            cost: item.cost || 0
          });
        }
        
        if (onPostAISystemMessage) {
          const names = data.items.map((it: any) => it.title).join(", ");
          onPostAISystemMessage(
            lang === "zh"
              ? `🎙️ AI 語音排程成功！已自動偵測並排定：${names}`
              : `🎙️ AI Voice Schedule Successful! Auto-parsed and scheduled: ${names}`
          );
        }
        setVoiceInput("");
      }
    } catch (err) {
      console.error("Voice schedule parsing failed:", err);
    } finally {
      setVoiceParsing(false);
    }
  };

  const handleEmailConfirmationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setEmailParsing(true);
    try {
      const res = await fetch("/api/ai/parse-email-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText: emailInput, activeDay })
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          onAddItineraryItem({
            dayIndex: item.dayIndex != null ? item.dayIndex : activeDay,
            time: item.time || "14:00",
            title: item.title,
            description: item.description,
            locationName: item.locationName,
            category: item.category || "other",
            cost: item.cost || 0
          });
        }
        
        if (onPostAISystemMessage) {
          const names = data.items.map((it: any) => it.title).join(", ");
          onPostAISystemMessage(
            lang === "zh"
              ? `📥 智慧確認信解析成功！已自動偵測並匯入日程：${names}`
              : `📥 Smart Confirmation Email Parsed! Automatically imported activities: ${names}`
          );
        }
        setEmailInput("");
      }
    } catch (err) {
      console.error("Email confirmation parsing failed:", err);
    } finally {
      setEmailParsing(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;

    const userText = chatMsg;
    setChatLog((prev) => [...prev, { sender: "user", text: userText }]);
    setChatMsg("");
    setSubmittingChat(true);

    try {
      const res = await fetch("/api/ai/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, chatHistory: [] })
      });
      const data = await res.json();
      if (data.reply) {
        setChatLog((prev) => [...prev, { sender: "ai", text: data.reply }]);
      }
    } catch (err) {
      console.error("AI assistant chat error:", err);
    } finally {
      setSubmittingChat(false);
    }
  };

  const t = translations[lang];
  const daysToShow = Array.from({ length: totalDays }, (_, i) => i);

  const filteredItems = itineraries
    .filter(item => item.dayIndex === activeDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handlePostCommentSubmit = (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;
    onCommentItinerary(itemId, newCommentInput);
    setNewCommentInput("");
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const numCost = parseFloat(cost);
    if (!title || !locationName) return;

    onAddItineraryItem({
      dayIndex: activeDay,
      time,
      title,
      description,
      locationName,
      category,
      cost: isNaN(numCost) ? 0 : numCost
    });

    // Reset fields
    setTitle("");
    setDescription("");
    setLocationName("");
    setCost("");
    setShowAddForm(false);
  };

  const getLocalizedCategoryName = (cat: string) => {
    switch (cat) {
      case "restaurant": return t.restaurant;
      case "shop": return t.shop;
      case "sight": return t.landmark;
      case "transit": return t.transit;
      case "hotel": return t.hotel;
      default: return t.other;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "restaurant": return <Utensils size={14} className="text-emerald-400" />;
      case "shop": return <ShoppingBag size={14} className="text-pink-400" />;
      case "sight": return <Landmark size={14} className="text-amber-400" />;
      case "transit": return <Route size={14} className="text-purple-400" />;
      case "hotel": return <Bed size={14} className="text-blue-400" />;
      default: return <MapPin size={14} className="text-slate-400" />;
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "restaurant": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
      case "shop": return "bg-pink-500/15 text-pink-300 border-pink-500/20";
      case "sight": return "bg-amber-500/15 text-amber-300 border-amber-500/20";
      case "transit": return "bg-purple-500/15 text-purple-300 border-purple-500/20";
      case "hotel": return "bg-blue-500/15 text-blue-300 border-blue-500/20";
      default: return "bg-slate-500/15 text-slate-300 border-slate-500/20";
    }
  };

  const getVoterMeta = (votes: string[]) => {
    return votes.map(uid => participants.find(p => p.id === uid)).filter(Boolean) as Participant[];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List Itineraries */}
      <div className={`${isSidebarOpen ? "lg:col-span-2" : "lg:col-span-3"} space-y-4 transition-all duration-300`}>
        {backupItineraries && backupItineraries.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs animate-fadeIn text-amber-200 gap-2.5 shadow-md">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>
                {lang === "zh"
                  ? "🤖 OdyShareSmart AI 已成功進行網關日程智慧優化！如果您或其他組員不滿意，可隨時還原至優化前的項目配置。"
                  : "🤖 OdyShareSmart AI has optimized details! If you or others dislike this setup, feel free to restore original elements."}
              </span>
            </div>
            <button
              onClick={onRestoreItineraries}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg border border-amber-500/30 transition cursor-pointer flex items-center gap-1 shrink-0 text-xs"
            >
              <span>↩️ {lang === "zh" ? "還原至舊版行程" : "Restore original"}</span>
            </button>
          </div>
        )}
        <div id="itinerary-timeline-container" className="glass-container rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[500px]">
          
          {/* Header Controls */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 mb-5 border-b border-white/10 pb-4">
            
            {/* Day Management Group (Tabs & Buttons) */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              
              {/* Day Scroll Tabs (Constrained and Scrollable) */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md min-w-0 max-w-[280px] xs:max-w-[320px] sm:max-w-[360px] relative">
                {/* Left Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollDayTabs("left")}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title={lang === "zh" ? "向左滾動" : "Scroll left"}
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Scrollable Day Number Buttons */}
                <div 
                  ref={dayTabsScrollRef}
                  className="relative flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth whitespace-nowrap flex-1 py-0.5"
                >
                  {daysToShow.map((dayIdx) => (
                    <button
                      key={dayIdx}
                      id={`day-tab-${dayIdx}`}
                      onClick={() => {
                        setActiveDay(dayIdx);
                        setActiveCommentDrawerId(null);
                      }}
                      className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all text-xs shrink-0 ${
                        activeDay === dayIdx
                          ? "bg-blue-600 text-white shadow-sm font-extrabold"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {t.day} {dayIdx + 1} {lang === "zh" ? "天" : ""}
                    </button>
                  ))}
                </div>

                {/* Right Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollDayTabs("right")}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title={lang === "zh" ? "向右滾動" : "Scroll right"}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Day Management Actions (Add/Remove) - ALWAYS VISIBLE, OUT OF SCROLL CONTAINER */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const newDayIdx = totalDays;
                    setTotalDays(prev => prev + 1);
                    setActiveDay(newDayIdx);
                    setActiveCommentDrawerId(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 hover:border-blue-500/35 text-blue-300 font-bold rounded-xl cursor-pointer transition-all text-xs shadow-md shrink-0"
                  title={lang === "zh" ? "增加天數" : "Add Day"}
                >
                  <Plus size={14} className="shrink-0" />
                  <span>{lang === "zh" ? "增加天數" : "Add Day"}</span>
                </button>

                {totalDays > 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (onDeleteItineraryItem) {
                        const itemsOnDay = itineraries.filter(item => item.dayIndex === activeDay);
                        for (const item of itemsOnDay) {
                          await onDeleteItineraryItem(item.id);
                        }
                        const subsequentItems = itineraries.filter(item => item.dayIndex > activeDay);
                        for (const item of subsequentItems) {
                          if (onUpdateItineraryItem) {
                            await onUpdateItineraryItem({
                              ...item,
                              dayIndex: item.dayIndex - 1
                            });
                          }
                        }
                      }
                      setTotalDays(prev => Math.max(1, prev - 1));
                      setActiveDay(prev => Math.max(0, Math.min(totalDays - 2, prev)));
                      setActiveCommentDrawerId(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 hover:border-rose-500/25 text-rose-400 font-bold rounded-xl cursor-pointer transition-all text-xs shadow-md shrink-0"
                    title={lang === "zh" ? "刪除目前這一天所有行程並移除此天" : "Delete active day and shift schedule"}
                  >
                    <Trash2 size={13} className="shrink-0" />
                    <span>{lang === "zh" ? "刪除此天" : "Remove Day"}</span>
                  </button>
                )}
              </div>

            </div>

            {/* Other Actions Group (Map, TSP, Sidebar, Add Activity) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full xl:w-auto xl:justify-end">
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-1.5 font-semibold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl cursor-pointer transition-all text-xs border shadow-md shrink-0 ${
                  showMap 
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25" 
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
                title={lang === "zh" ? "切換地圖檢視模式" : "Toggle Split Map View"}
              >
                <span>🗺️</span>
                <span>{lang === "zh" ? "行程地圖" : "Map View"} {showMap ? (lang === "zh" ? "開啟" : "ON") : (lang === "zh" ? "關閉" : "OFF")}</span>
              </button>

              {filteredItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleTSPOptimization}
                  disabled={tspOptimizing}
                  className="flex items-center gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/45 text-indigo-300 font-semibold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl cursor-pointer transition-all disabled:opacity-50 text-xs shadow-md shrink-0"
                  title={lang === "zh" ? "計算這天所有景點的最短路徑與搭乘時間" : "Find the shortest circular route among all activities"}
                >
                  <Route size={14} className={tspOptimizing ? "animate-spin shrink-0" : "shrink-0"} />
                  <span>{tspOptimizing ? (lang === "zh" ? "計算中..." : "Optimizing...") : (lang === "zh" ? "AI 順路優化 (TSP)" : "AI Route (TSP)")}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-1.5 font-semibold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl cursor-pointer transition-all text-xs border shadow-md shrink-0 ${
                  isSidebarOpen 
                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25" 
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
                title={lang === "zh" ? "顯示或隱藏 AI 與討論板側邊欄" : "Toggle AI & Chat sidebar"}
              >
                <span>{isSidebarOpen ? "➡️" : "⬅️"}</span>
                <span>{lang === "zh" ? "AI 與討論" : "AI & Chat"}</span>
              </button>

              <button
                id="add-itinerary-trigger"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 glass-button-primary text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-xl cursor-pointer shrink-0 text-xs shadow-md"
              >
                <Plus size={14} /> {t.addDailyActivity}
              </button>
            </div>

          </div>

          {/* Add Activity Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateActivity}
              className="mb-5 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3.5 text-xs animate-fadeIn"
            >
              <h4 className="font-bold text-slate-200 flex justify-between items-center border-b border-white/5 pb-2">
                <span>{t.configureActivityCard} — {t.day} {activeDay + 1} {lang === "zh" ? "天" : ""}</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white font-semibold cursor-pointer"
                >
                  {lang === "zh" ? "關閉" : "Close"}
                </button>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.activityTitle}</label>
                  <input
                    id="itinerary-title-input"
                    type="text"
                    required
                    placeholder="e.g. Asakusa Tsukiji Sushi Roll Tasting"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.placeName}</label>
                  <input
                    id="itinerary-location-input"
                    type="text"
                    required
                    placeholder="e.g. Sukiyabashi Jiro Ginza"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.timeSchedule}</label>
                  <input
                    id="itinerary-time-input"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.categoryType}</label>
                  <select
                    id="itinerary-category-select"
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900"
                  >
                    <option value="sight" className="bg-slate-900">🏛️ {getLocalizedCategoryName("sight")}</option>
                    <option value="restaurant" className="bg-slate-900">🍱 {getLocalizedCategoryName("restaurant")}</option>
                    <option value="shop" className="bg-slate-900">🛍️ {getLocalizedCategoryName("shop")}</option>
                    <option value="transit" className="bg-slate-900">🚇 {getLocalizedCategoryName("transit")}</option>
                    <option value="hotel" className="bg-slate-900">🏨 {getLocalizedCategoryName("hotel")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t.estimatedCost}</label>
                  <input
                    id="itinerary-cost-input"
                    type="number"
                    placeholder="e.g. 15.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    id="submit-itinerary-btn"
                    type="submit"
                    className="w-full py-2.5 glass-button-primary text-white font-semibold rounded-xl text-xs"
                  >
                    {t.addScheduleCard}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t.briefDesc}</label>
                <textarea
                  id="itinerary-desc-input"
                  placeholder="Incorporate local traffic guidelines, ticket information..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-white h-14 resize-none"
                />
              </div>
            </form>
          )}

          {/* Timeline View & Map Split Wrapper */}
          <div className={`flex-grow ${showMap ? "grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[400px]" : "flex flex-col"}`}>
            {/* Timeline List Column */}
            <div className={`flex flex-col justify-between ${showMap ? "lg:col-span-7 h-[460px]" : "flex-grow"}`}>
              <div className="flex-grow space-y-3 pr-1 h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center p-6 bg-white/3 border border-white/5 rounded-2xl border-dashed">
                    <Clock className="text-indigo-400 mb-2" size={24} />
                    <p className="text-xs text-slate-400 max-w-md">{t.vacantMessage}</p>
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                const voterMetas = getVoterMeta(item.votes);
                const userVoted = item.votes.includes(currentUser);

                if (editingItemId === item.id) {
                  return (
                    <form
                      key={item.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (onUpdateItineraryItem) {
                          onUpdateItineraryItem({
                            ...item,
                            title: editTitle,
                            locationName: editLocationName || editTitle,
                            description: editDescription,
                            time: editTime,
                            category: editCategory,
                            cost: parseFloat(editCost) || 0
                          });
                        }
                        setEditingItemId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="p-4 rounded-xl border border-blue-500/50 bg-blue-500/10 space-y-3.5 text-xs animate-fadeIn text-left"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="font-bold text-blue-400">📝 {lang === "zh" ? "編輯行程項目細節" : "Edit Itinerary Activity"}</span>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="text-slate-400 hover:text-white font-semibold cursor-pointer"
                        >
                          {lang === "zh" ? "取消" : "Cancel"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">{t.activityTitle}</label>
                          <input
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">{t.placeName}</label>
                          <input
                            type="text"
                            required
                            value={editLocationName}
                            onChange={(e) => setEditLocationName(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">{t.timeSchedule}</label>
                          <input
                            type="time"
                            required
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-xl text-white font-mono bg-slate-900 border border-white/10"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">{t.categoryType}</label>
                          <select
                            value={editCategory}
                            onChange={(e: any) => setEditCategory(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
                          >
                            <option value="sight">🏛️ {getLocalizedCategoryName("sight")}</option>
                            <option value="restaurant">🍱 {getLocalizedCategoryName("restaurant")}</option>
                            <option value="shop">🛍️ {getLocalizedCategoryName("shop")}</option>
                            <option value="transit">🚇 {getLocalizedCategoryName("transit")}</option>
                            <option value="hotel">🏨 {getLocalizedCategoryName("hotel")}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">{t.estimatedCost}</label>
                          <input
                            type="number"
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">{t.briefDesc}</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full glass-input px-3 py-2 rounded-xl text-white h-14 resize-none bg-slate-900 border border-white/10"
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition cursor-pointer text-[11px] font-semibold text-slate-300"
                        >
                          {lang === "zh" ? "取消" : "Cancel"}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-[11px] font-semibold text-white cursor-pointer"
                        >
                          {lang === "zh" ? "儲存修改" : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={item.id}
                    id={`itinerary-card-${item.id}`}
                    onClick={() => setActiveCommentDrawerId(item.id)}
                    className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all border ${
                      activeCommentDrawerId === item.id
                        ? "border-blue-500 bg-blue-500/10 shadow-md"
                        : "border-white/5 bg-white/3 hover:bg-white/6 hover:border-white/10"
                    }`}
                  >
                    {/* Event item details block */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex flex-col items-center justify-center bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 text-slate-200 font-mono text-xs font-bold leading-none select-none">
                        <Clock size={11} className="text-blue-400 mb-1" />
                        <span>{item.time}</span>
                      </div>

                      <div className="space-y-1 text-left">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-white text-[13.5px] tracking-tight">{item.title}</h4>
                          <span className={`text-[9.5px] font-bold border rounded-md px-2 py-0.5 uppercase tracking-wider flex items-center gap-1 ${getCategoryBadgeColor(item.category)}`}>
                            {getCategoryIcon(item.category)}
                            <span>{getLocalizedCategoryName(item.category)}</span>
                          </span>
                        </div>

                        <p className="text-slate-350 text-xs leading-relaxed max-w-xl">{item.description}</p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">
                            <MapPin size={11} className="text-blue-400" />
                            <span className="text-slate-300 font-medium leading-none">{item.locationName}</span>
                          </span>
                          {item.cost > 0 && (
                            <span className="font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">
                              ${item.cost}
                            </span>
                          )}

                          {item.trafficStatus && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              item.trafficStatus === "smooth"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                : item.trafficStatus === "moderate"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                            }`}>
                              ⚡ {item.trafficStatus === "smooth" ? t.trafficSmooth : item.trafficStatus === "moderate" ? t.trafficModerate : t.trafficCongested}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preference Votings line */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3.5 pt-3 sm:pt-0 border-t sm:border-0 border-white/5 shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Vote Action */}
                        <button
                          id={`vote-activity-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onVoteItinerary(item.id);
                          }}
                          className={`p-2 px-3 rounded-xl transition-all border cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
                            userVoted
                              ? "bg-blue-600 text-white border-blue-500"
                              : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                          }`}
                        >
                          <ThumbsUp size={11} />
                          <span>{item.votes.length}</span>
                        </button>

                        {/* Comments button indicator tooltip */}
                        <div className="p-2 px-3 bg-white/3 text-slate-300 border border-white/5 rounded-xl flex items-center gap-1.5 font-semibold text-[11px] leading-none">
                          <MessageSquare size={11} className="text-slate-400" />
                          <span>{item.comments.length}</span>
                        </div>

                        {/* Edit Activity Action Button */}
                        {onUpdateItineraryItem && (
                          <button
                            id={`edit-activity-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItemId(item.id);
                              setEditTitle(item.title);
                              setEditDescription(item.description || "");
                              setEditLocationName(item.locationName || item.title);
                              setEditTime(item.time);
                              setEditCategory(item.category);
                              setEditCost(item.cost.toString());
                            }}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/10 hover:border-blue-500/20 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                            title={lang === "zh" ? "編輯此日程" : "Edit active itinerary"}
                          >
                            ✏️
                          </button>
                        )}

                        {/* Delete Activity Action Button */}
                        {onDeleteItineraryItem && (
                          <button
                            id={`delete-activity-${item.id}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onDeleteItineraryItem(item.id);
                              if (activeCommentDrawerId === item.id) {
                                setActiveCommentDrawerId(null);
                              }
                            }}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                            title={lang === "zh" ? "刪除此日程" : "Delete active itinerary"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        )}
                      </div>

                      {/* Voter Avatars list */}
                      {voterMetas.length > 0 && (
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {voterMetas.slice(0, 3).map((voter) => (
                            <div
                              key={voter.id}
                              style={{ backgroundColor: voter.avatarColor }}
                              className="w-[18px] h-[18px] rounded-full border border-slate-900 text-[8px] font-bold text-white flex items-center justify-center shadow-xs"
                              title={voter.name}
                            >
                              {voter.name[0]}
                            </div>
                          ))}
                          {voterMetas.length > 3 && (
                            <div className="w-[18px] h-[18px] rounded-full bg-slate-800 border border-slate-900 text-[8px] text-slate-400 flex items-center justify-center font-bold">
                              +{voterMetas.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* 🚗 Transportation Connection Card */}
                    {idx < filteredItems.length - 1 && (
                      <div className="my-2 ml-7 pl-5 border-l border-dashed border-white/15 flex items-center gap-3 py-1 text-[11px] text-slate-400 select-none animate-fadeIn">
                        <div className="flex items-center gap-2 bg-white/4 border border-white/5 hover:bg-white/8 px-2.5 py-0.5 rounded-xl text-slate-200">
                          <span className="text-xs">{getTransitIconAndDetails(item, filteredItems[idx + 1], lang).icon}</span>
                          <span className="font-semibold text-[9px]">{getTransitIconAndDetails(item, filteredItems[idx + 1], lang).label}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {getTransitIconAndDetails(item, filteredItems[idx + 1], lang).distText}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
              </div>
            </div>

            {/* Live Interactive Itinerary Map Column */}
            {showMap && (
              <div className="lg:col-span-5 w-full h-[360px] lg:h-[460px] min-h-[350px] lg:min-h-0 animate-fadeIn flex flex-col">
                <ItineraryMap
                  destination={filteredItems[0]?.locationName || "Tokyo"}
                  items={filteredItems}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide Drawer comments & AI assistant sidebar */}
      {isSidebarOpen && (
        <div className="lg:col-span-1">
          <div className="glass-container rounded-2xl p-5 shadow-lg h-full min-h-[500px] flex flex-col justify-between">
            <div className="flex-grow flex flex-col justify-between h-full">
              <div className="flex flex-col flex-1 h-full">
                {/* Tab selector */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md text-[11px] font-bold leading-none mb-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSidebarTab("ai")}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      sidebarTab === "ai" 
                        ? "bg-blue-600 text-white shadow font-black" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sparkles size={12} className="text-blue-200" />
                    <span>🤖 OdyShareSmart AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("discussion")}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      sidebarTab === "discussion" 
                        ? "bg-blue-600 text-white shadow font-black" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <MessageSquare size={12} />
                    <span>💬 {t.discussionSidebar}</span>
                    {activeCommentDrawerId ? (
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                    ) : null}
                  </button>
                </div>

                {/* Tab Contents: AI Side */}
                {sidebarTab === "ai" ? (
                  <div className="flex-1 flex flex-col justify-between h-full space-y-3">
                    {/* Optimizer input */}
                    <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0">
                      <div 
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setIsOptimizerCollapsed(!isOptimizerCollapsed)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="p-0.5 px-1.5 bg-blue-500/15 text-blue-300 rounded border border-blue-500/25 text-[9px] font-mono font-bold leading-none flex items-center">
                            {t.geminiEngine}
                          </span>
                          <h4 className="font-extrabold text-white text-xs">{t.optimizerTitle}</h4>
                        </div>
                        <span className="text-slate-400 text-[10px] font-bold">{isOptimizerCollapsed ? "＋" : "－"}</span>
                      </div>
                      
                      {!isOptimizerCollapsed && (
                        <div className="space-y-2 pt-1 animate-fadeIn">
                          <p className="text-[10.5px] text-slate-400 leading-relaxed">
                            {t.optimizerDesc}
                          </p>
                          <div className="space-y-1.5 text-xs">
                            <label className="block text-[9px] font-bold text-slate-300 uppercase tracking-widest">{t.groupVibe}</label>
                            <input
                              id="ai-preferences-input"
                              type="text"
                              value={prefInput}
                              onChange={(e) => setPrefInput(e.target.value)}
                              placeholder="e.g. Sushi crawl, cultural shrines..."
                              className="w-full text-xs px-2.5 py-1.5 glass-input rounded-lg text-white font-medium"
                            />
                            <button
                              id="ai-optimize-btn"
                              onClick={handleOptimize}
                              disabled={optimizing || !onApplyAIOptimization}
                              className="w-full py-1.5 glass-button-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {optimizing ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin text-white" />
                                  <span>{t.generatingPath}</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} className="text-blue-200" />
                                  <span>{t.rebuildItinerary}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voice / Natural Language Scheduling Bar */}
                    <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0">
                      <div 
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setIsVoiceCollapsed(!isVoiceCollapsed)}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300">
                          <span>🎙️</span>
                          <span>{lang === "zh" ? "AI 語音/自然語言排班" : "AI Voice / Natural Schedule"}</span>
                        </div>
                        <span className="text-slate-400 text-[10px] font-bold">{isVoiceCollapsed ? "＋" : "－"}</span>
                      </div>
                      
                      {!isVoiceCollapsed && (
                        <div className="space-y-1.5 pt-1 animate-fadeIn">
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {lang === "zh" 
                              ? "輸入口語（例如：『幫我把第三天下午 3 點加進淺草寺』），系統自動拆分日程！" 
                              : "Type naturally (e.g. 'Add Sensoji at 3 PM on Day 3'). AI parses and schedules directly!"}
                          </p>
                          <form onSubmit={handleVoiceScheduleSubmit} className="space-y-1.5 text-xs">
                            <textarea
                              value={voiceInput}
                              onChange={(e) => setVoiceInput(e.target.value)}
                              placeholder={lang === "zh" ? "輸入語音指令或文字..." : "Enter voice command or text schedule..."}
                              className="w-full text-xs p-2.5 bg-slate-900/80 border border-white/10 rounded-lg text-white font-medium h-12 resize-none focus:border-indigo-500/50 focus:ring-0"
                            />
                            <div className="flex gap-1">
                              <button
                                type="submit"
                                disabled={voiceParsing || !voiceInput.trim()}
                                className="flex-1 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/20 text-white font-semibold rounded-lg text-[10.5px] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1 shadow-md"
                              >
                                {voiceParsing ? (
                                  <>
                                    <RefreshCw size={11} className="animate-spin text-white" />
                                    <span>{lang === "zh" ? "解析中..." : "Parsing..."}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>⚡</span>
                                    <span>{lang === "zh" ? "一鍵智慧排程" : "Generate Schedule"}</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setVoiceInput(lang === "zh" ? "幫我把第三天下午 3 點加進淺草寺，順便推薦附近步行 10 分鐘內、預算在 2000 日圓內的拉麵店" : "Add Sensoji temple on Day 3 afternoon, and recommend a ramen shop nearby under 2000 JPY")}
                                className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-400 cursor-pointer transition-all shrink-0"
                                title={lang === "zh" ? "載入語音範例" : "Load Example"}
                              >
                                💡
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Email Confirmation Parser Card */}
                    <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0">
                      <div 
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setIsEmailCollapsed(!isEmailCollapsed)}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300">
                          <span>📥</span>
                          <span>{lang === "zh" ? "一鍵導入機票/酒店確認信" : "Import Flight/Hotel confirmation"}</span>
                        </div>
                        <span className="text-slate-400 text-[10px] font-bold">{isEmailCollapsed ? "＋" : "－"}</span>
                      </div>

                      {!isEmailCollapsed && (
                        <div className="space-y-1.5 pt-1 animate-fadeIn">
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {lang === "zh" 
                              ? "貼上預約確認信，AI 自動解析並匯入日程！" 
                              : "Paste confirmation text, and AI automatically maps to schedule!"}
                          </p>
                          <form onSubmit={handleEmailConfirmationSubmit} className="space-y-1.5 text-xs">
                            <textarea
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              placeholder={lang === "zh" ? "貼上機票或酒店預約信內文..." : "Paste flight details or hotel reservation text..."}
                              className="w-full text-[10.5px] p-2 bg-slate-900/80 border border-white/10 rounded-lg text-white font-medium h-12 resize-none focus:border-teal-500/50 focus:ring-0"
                            />
                            <div className="flex gap-1">
                              <button
                                type="submit"
                                disabled={emailParsing || !emailInput.trim()}
                                className="flex-1 py-1.5 bg-teal-600/90 hover:bg-teal-650 border border-teal-500/20 text-white font-semibold rounded-lg text-[10.5px] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1 shadow-md"
                              >
                                {emailParsing ? (
                                  <>
                                    <RefreshCw size={11} className="animate-spin text-white" />
                                    <span>{lang === "zh" ? "解析中..." : "Parsing..."}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>🚀</span>
                                    <span>{lang === "zh" ? "智慧一鍵導入" : "Import & Parse"}</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailInput(
                                    lang === "zh"
                                      ? `【機票確認】全日空 ANA NH811\n起飛：香港國際機場 HKG 09:30 AM\n抵達：東京成田機場 NRT 02:45 PM\n機型：Boeing 787-9\n訂位代號：#ANA-74D389\n備註：請準備好電子護照辦理入境登記。`
                                      : `Booking.com confirmation:\nReservation: #BK-1849102\nHotel: Ginza Grand Hotel Tokyo\nCheck-in Date: Day 1 at 15:00\nRoom Type: Standard Queen Non-Smoking\nBreakfast: Included\nLocation: 8-6-15 Ginza, Chuo, Tokyo`
                                  );
                                }}
                                className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-400 cursor-pointer transition-all shrink-0"
                                title={lang === "zh" ? "載入機票預約範例" : "Load Booking Example"}
                              >
                                📋
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Conversation Box */}
                    <div className="flex-1 flex flex-col justify-between pb-1 min-h-[160px] bg-white/3 border border-white/5 p-3 rounded-xl">
                      <div 
                        className="flex items-center justify-between cursor-pointer select-none mb-2"
                        onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                      >
                        <h5 className="font-extrabold text-white text-[11px] flex items-center gap-1">
                          <MessageSquare size={13} className="text-blue-400" />
                          <span>{t.OdyShareSmartConc}</span>
                        </h5>
                        <span className="text-slate-400 text-[10px] font-bold">{isChatCollapsed ? "＋" : "－"}</span>
                      </div>

                      {!isChatCollapsed ? (
                        <>
                          <div className="overflow-y-auto mb-2 space-y-2 p-2.5 bg-slate-900/60 border border-white/5 rounded-xl h-[120px] scrollbar-thin text-xs">
                            {chatLog.map((log, idx) => (
                              <div
                                key={idx}
                                className={`flex flex-col max-w-[90%] animate-fadeIn ${
                                  log.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                                }`}
                              >
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 font-mono">
                                  {log.sender === "user" ? (lang === "zh" ? "您" : "You") : "OdyShareSmart AI"}
                                </span>
                                <div
                                  className={`p-2 rounded-xl text-[11px] ${
                                    log.sender === "user"
                                      ? "bg-blue-600/95 border border-blue-500/30 text-white rounded-br-none"
                                      : "bg-white/5 border border-white/5 text-slate-200 rounded-bl-none"
                                  }`}
                                >
                                  {log.text}
                                </div>
                              </div>
                            ))}
                            {submittingChat && (
                              <span className="text-[9px] text-slate-400 font-mono italic animate-pulse">{lang === "zh" ? "OdyShareSmart 智慧響應中..." : "Assistant mapping..."}</span>
                            )}
                          </div>

                          <form onSubmit={handleChatSubmit} className="flex gap-1.5 text-xs">
                            <input
                              id="ai-chat-input"
                              type="text"
                              placeholder={t.askAiPlaceholder}
                              value={chatMsg}
                              onChange={(e) => setChatMsg(e.target.value)}
                              disabled={submittingChat}
                              className="flex-1 px-2.5 py-1.5 glass-input rounded-lg text-[11px]"
                            />
                            <button
                              id="submit-ai-chat"
                              type="submit"
                              disabled={submittingChat}
                              className="p-1 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              <Send size={12} />
                            </button>
                          </form>
                        </>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic text-center py-2">{lang === "zh" ? "對話框已收合" : "Chat log collapsed"}</p>
                      )}
                    </div>
                  </div>
                ) : activeCommentDrawerId ? (
                  (() => {
                    const selectedItem = itineraries.find(i => i.id === activeCommentDrawerId);
                    if (!selectedItem) {
                      return (
                        <div className="text-center py-12 text-slate-400 text-xs flex-1">
                          Activity item not found
                        </div>
                      );
                    }

                    return (
                      <div className="flex-1 flex flex-col justify-between h-full">
                        <div className="flex-1 flex flex-col">
                          <div className="pb-2 border-b border-white/10 mb-3 text-xs">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{t.discussionSidebar}</span>
                            <h4 className="font-extrabold text-white text-[13px] mt-0.5 leading-snug">{selectedItem.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {selectedItem.comments.length} {t.commentsCount}
                            </p>
                          </div>

                          <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 max-h-[220px] scrollbar-thin text-[11px] mb-3">
                            {selectedItem.comments.length === 0 ? (
                              <div className="py-8 text-center bg-white/3 rounded-xl border border-dashed border-white/10 flex flex-col items-center p-3">
                                <MessageSquare size={16} className="text-slate-500 mb-1" />
                                <p className="text-[10px] text-slate-400 leading-relaxed px-1">{t.noCustomPosts}</p>
                              </div>
                            ) : (
                              selectedItem.comments.map((comm) => {
                                const author = participants.find(p => p.id === comm.authorId);
                                return (
                                  <div key={comm.id} className="p-2.5 bg-white/3 border border-white/5 rounded-xl flex items-start gap-2 animate-fadeIn">
                                    <div
                                      style={{ backgroundColor: author?.avatarColor || "#475569" }}
                                      className="w-[20px] h-[20px] text-[9px] rounded-full font-bold text-white flex items-center justify-center shrink-0 border border-white/15"
                                    >
                                      {comm.authorName[0]}
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white text-[11px]">{comm.authorName}</span>
                                        <span className="text-[8px] text-slate-500">
                                          {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="text-slate-300 leading-relaxed text-[11px]">{comm.text}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <form onSubmit={(e) => handlePostCommentSubmit(e, selectedItem.id)} className="flex gap-1.5 text-xs pt-2.5 border-t border-white/10 shrink-0">
                          <input
                            id="itinerary-comment-input"
                            type="text"
                            placeholder={t.postComment}
                            value={newCommentInput}
                            onChange={(e) => setNewCommentInput(e.target.value)}
                            className="flex-1 glass-input px-2.5 py-1.5 rounded-lg text-[11px]"
                          />
                          <button
                            id="submit-comment-btn"
                            type="submit"
                            className="p-1 px-2 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer border border-white/10 shrink-0"
                          >
                            <Send size={11} />
                          </button>
                        </form>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-5 bg-white/3 border border-dashed border-white/5 rounded-2xl">
                    <Eye size={20} className="text-indigo-400 mb-1.5" />
                    <h4 className="font-semibold text-slate-200 text-xs">{t.discussionSidebar}</h4>
                    <p className="text-slate-400 text-[10.5px] leading-relaxed mt-1 max-w-[180px]">
                      {t.commentSidebarDesc}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
