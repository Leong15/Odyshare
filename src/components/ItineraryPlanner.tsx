import React, { useState, useEffect } from "react";
import { Clock, MapPin, MessageSquare, ThumbsUp, Plus, Eye, Send, Landmark, ShoppingBag, Utensils, Route, Bed, Sparkles, RefreshCw } from "lucide-react";
import { ItineraryItem, Participant } from "../types";
import { translations } from "../lib/translations";

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
      <div className="lg:col-span-2 space-y-4">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4 text-xs">
            {/* Days Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
              {daysToShow.map((dayIdx) => (
                <button
                  key={dayIdx}
                  id={`day-tab-${dayIdx}`}
                  onClick={() => {
                    setActiveDay(dayIdx);
                    setActiveCommentDrawerId(null);
                  }}
                  className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all ${
                    activeDay === dayIdx
                      ? "bg-white/10 text-white border border-white/10 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.day} {dayIdx + 1} {lang === "zh" ? "天" : ""}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTotalDays(prev => prev + 1)}
                className="px-2.5 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 border border-transparent hover:border-blue-500/20"
                title={lang === "zh" ? "增加日數" : "Add Day"}
              >
                <Plus size={13} />
                <span>{lang === "zh" ? "增加天數" : "Add Day"}</span>
              </button>

              {totalDays > 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (onDeleteItineraryItem) {
                      // Delete all items that fall into the activeDay index
                      const itemsOnDay = itineraries.filter(item => item.dayIndex === activeDay);
                      for (const item of itemsOnDay) {
                        await onDeleteItineraryItem(item.id);
                      }
                      // Shift all items on subsequent days down by 1 day index
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
                    // Decrement days count safely 
                    setTotalDays(prev => Math.max(1, prev - 1));
                    setActiveDay(prev => Math.max(0, Math.min(totalDays - 2, prev)));
                    setActiveCommentDrawerId(null);
                  }}
                  className="px-2.5 py-1.5 text-rose-450 hover:text-rose-400 hover:bg-rose-500/10 font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 border border-transparent hover:border-rose-500/15"
                  title={lang === "zh" ? "刪除此天所有行程 & 移除這天" : "Delete active day and shift schedule"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  <span>{lang === "zh" ? "刪除此天" : "Remove Day"}</span>
                </button>
              )}
            </div>

            <button
              id="add-itinerary-trigger"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 glass-button-primary text-white font-semibold py-2 px-3.5 rounded-xl cursor-pointer"
            >
              <Plus size={14} /> {t.addDailyActivity}
            </button>
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

          {/* Timeline View */}
          <div className="flex-grow space-y-3 pr-1 max-h-[460px] overflow-y-auto overflow-x-hidden scrollbar-thin">
            {filteredItems.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center p-6 bg-white/3 border border-white/5 rounded-2xl border-dashed">
                <Clock className="text-indigo-400 mb-2" size={24} />
                <p className="text-xs text-slate-400 max-w-md">{t.vacantMessage}</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const voterMetas = getVoterMeta(item.votes);
                const userVoted = item.votes.includes(currentUser);

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

                      <div className="space-y-1">
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Slide Drawer comments & AI assistant sidebar */}
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
                <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                  {/* Optimizer input */}
                  <div className="bg-white/3 border border-white/5 p-3.5 rounded-xl space-y-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="p-0.5 px-1.5 bg-blue-500/15 text-blue-300 rounded border border-blue-500/25 text-[9px] font-mono font-bold leading-none flex items-center">
                        {t.geminiEngine}
                      </span>
                      <h4 className="font-extrabold text-white text-xs">{t.optimizerTitle}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t.optimizerDesc}
                    </p>
                    
                    <div className="space-y-2 pt-1 text-xs">
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t.groupVibe}</label>
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
                        className="w-full py-1.5 glass-button-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
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

                  {/* Conversation Box */}
                  <div className="flex-1 flex flex-col justify-between pb-1 min-h-[160px]">
                    <div>
                      <h5 className="font-extrabold text-white text-[11px] mb-2 flex items-center gap-1">
                        <MessageSquare size={13} className="text-blue-400" />
                        <span>{t.OdyShareSmartConc}</span>
                      </h5>

                      <div className="overflow-y-auto mb-2 space-y-2 p-2.5 bg-white/3 border border-white/5 rounded-xl h-[120px] scrollbar-thin text-xs">
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
    </div>
  );
}
