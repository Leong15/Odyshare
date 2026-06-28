import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  RefreshCw,
  Zap,
  Send,
  Calendar,
  Volume2,
  Square,
  Play,
  Eye,
} from "lucide-react";
import { ItineraryItem, Participant } from "../../types";
import { translations } from "../../lib/translations";
import ItineraryMap from "../ItineraryMap";

interface AISidebarPanelProps {
  lang: "en" | "zh";
  itineraries: ItineraryItem[];
  activeDay: number;
  showMap: boolean;
  filteredItems: ItineraryItem[];
  participants: Participant[];
  currentUser: string;
  activeCommentDrawerId: string | null;
  setActiveCommentDrawerId: (id: string | null) => void;
  onApplyAIOptimization?: (optimizedItems: ItineraryItem[]) => void;
  onPostAISystemMessage?: (text: string) => void;
  onAddItineraryItem: (item: Omit<ItineraryItem, "id" | "votes" | "comments" | "coordinates" | "trafficStatus">) => void;
  onCommentItinerary: (itemId: string, text: string) => void;
}

export default function AISidebarPanel({
  lang,
  itineraries,
  activeDay,
  showMap,
  filteredItems,
  participants,
  currentUser,
  activeCommentDrawerId,
  setActiveCommentDrawerId,
  onApplyAIOptimization,
  onPostAISystemMessage,
  onAddItineraryItem,
  onCommentItinerary,
}: AISidebarPanelProps) {
  const t = translations[lang];

  // AI Tab UI states
  const [sidebarTab, setSidebarTab] = useState<"ai" | "discussion">("ai");
  const [prefInput, setPrefInput] = useState<string>("");
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [chatMsg, setChatMsg] = useState<string>("");
  const [chatLog, setChatLog] = useState<{ sender: "user" | "ai"; text: string }[]>(() => [
    {
      sender: "ai",
      text:
        lang === "zh"
          ? "您好！我是 OdyShareSmart 智慧行程管家。您可以在此處輸入組員度假偏好，讓我為您升級日程；或者在下方詢問我關於東京地鐵乘車指引、當地小眾海鮮居酒屋推薦！"
          : "Konnichiwa! I'm OdyShareSmart, your group's travel assistant. Enter preferences above to let me upgrade your schedule, or ask me anything about subway lines and hidden food corridors!",
    },
  ]);
  const [submittingChat, setSubmittingChat] = useState<boolean>(false);
  const [voiceInput, setVoiceInput] = useState<string>("");
  const [voiceParsing, setVoiceParsing] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailParsing, setEmailParsing] = useState<boolean>(false);
  const [tspOptimizing, setTspOptimizing] = useState<boolean>(false);

  // AI Voice states
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);
  const [lastVoiceSummary, setLastVoiceSummary] = useState<string>("");
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [audioSource, setAudioSource] = useState<any>(null);
  const [audioCtx, setAudioCtx] = useState<any>(null);

  // Collapsed states
  const [isOptimizerCollapsed, setIsOptimizerCollapsed] = useState<boolean>(false);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState<boolean>(false);
  const [isEmailCollapsed, setIsEmailCollapsed] = useState<boolean>(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);

  // Comment input state
  const [newCommentInput, setNewCommentInput] = useState<string>("");

  useEffect(() => {
    if (activeCommentDrawerId) {
      setSidebarTab("discussion");
    }
  }, [activeCommentDrawerId]);

  useEffect(() => {
    setChatLog([
      {
        sender: "ai",
        text:
          lang === "zh"
            ? "您好！我是 OdyShareSmart 智慧行程管家。您可以在此處輸入組員度假偏好，讓我為您升級日程；或者在下方詢問我關於東京地鐵乘車指引、當地小眾海鮮居酒屋推薦！"
            : "Konnichiwa! I'm OdyShareSmart, your group's travel assistant. Enter preferences above to let me upgrade your schedule, or ask me anything about subway lines and hidden food corridors!",
      },
    ]);
  }, [lang]);

  // Audio helpers
  const stopAudio = () => {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      setAudioSource(null);
    }
    setIsAudioPlaying(false);
  };

  const playAudio = (base64Str: string) => {
    stopAudio();
    if (!base64Str) return;

    try {
      const binary = atob(base64Str);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const view = new DataView(buffer);
      for (let i = 0; i < len; i++) {
        view.setUint8(i, binary.charCodeAt(i));
      }

      const numSamples = len / 2;
      const float32Data = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const sample = view.getInt16(i * 2, true);
        float32Data[i] = sample / 32768;
      }

      const context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      const audioBuffer = context.createBuffer(1, numSamples, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);

      source.onended = () => {
        setIsAudioPlaying(false);
        setAudioSource(null);
      };

      source.start(0);
      setAudioCtx(context);
      setAudioSource(source);
      setIsAudioPlaying(true);
    } catch (err) {
      console.error("Failed to play PCM audio:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (audioSource) {
        try {
          audioSource.stop();
        } catch (e) {}
      }
    };
  }, [audioSource]);

  // AI operations
  const handleOptimize = async () => {
    if (optimizing) return;
    setOptimizing(true);
    try {
      const res = await fetch("/api/ai/optimize-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itineraries,
          preferences: prefInput,
          lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const { optimizedItems, voiceSummary, audioBase64 } = json.data;

        // format items
        const formatted = optimizedItems.map((item: any, idx: number) => ({
          ...item,
          id: `item-${Date.now()}-${idx}`,
          votes: [],
          comments: [],
        }));

        if (onApplyAIOptimization) {
          onApplyAIOptimization(formatted);
        }

        if (voiceSummary) {
          setLastVoiceSummary(voiceSummary);
          if (audioBase64) {
            setLastAudioBase64(audioBase64);
            if (autoPlayAudio) {
              playAudio(audioBase64);
            }
          }
        }

        if (onPostAISystemMessage) {
          onPostAISystemMessage(
            lang === "zh"
              ? "🔮 智慧行程升級完畢！已成功根據您的團體旅行偏好與景點熱度重新優化！"
              : "🔮 Intelligent schedule overhaul complete! Restructured using Gemini model based on your vibes."
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleTSPOptimization = async () => {
    if (tspOptimizing) return;
    setTspOptimizing(true);
    try {
      const currentDayItems = itineraries.filter((i) => i.dayIndex === activeDay);
      if (currentDayItems.length < 2) {
        alert(
          lang === "zh"
            ? "當天項目少於 2 個，無須進行 TSP 最短路徑排列！"
            : "Requires at least 2 items on the active day to calculate TSP route!"
        );
        return;
      }

      const res = await fetch("/api/ai/optimize-tsp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: currentDayItems,
          lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const { optimizedItems } = json.data;

        // Replace day items while retaining other days
        const otherDaysItems = itineraries.filter((i) => i.dayIndex !== activeDay);
        const combined = [...otherDaysItems, ...optimizedItems];

        if (onApplyAIOptimization) {
          onApplyAIOptimization(combined);
        }

        if (onPostAISystemMessage) {
          onPostAISystemMessage(
            lang === "zh"
              ? `🗺️ 第 ${activeDay + 1} 天 TSP 地理路徑優化完成！已成功按經緯度距離安排最短出行耗時。`
              : `🗺️ Day ${activeDay + 1} geographical TSP routing complete! Preserved coordinates sequence optimized.`
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTspOptimizing(false);
    }
  };

  const handleVoiceScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voiceParsing || !voiceInput.trim()) return;
    setVoiceParsing(true);
    try {
      const res = await fetch("/api/ai/parse-voice-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceText: voiceInput,
          lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const { parsedItems } = json.data;
        if (parsedItems && parsedItems.length > 0) {
          parsedItems.forEach((item: any) => {
            onAddItineraryItem({
              dayIndex: typeof item.dayIndex === "number" ? item.dayIndex : activeDay,
              time: item.time || "12:00",
              title: item.title,
              description: item.description || "",
              locationName: item.locationName || item.title,
              category: item.category || "sight",
              cost: item.cost || 0,
            });
          });

          if (onPostAISystemMessage) {
            onPostAISystemMessage(
              lang === "zh"
                ? `🎙️ 語音解析成功！已成功添加 ${parsedItems.length} 個日程到您的計畫中。`
                : `🎙️ Voice schedule added! Automatically mapped ${parsedItems.length} parsed items.`
            );
          }
          setVoiceInput("");
        } else {
          alert(
            lang === "zh"
              ? "無法在輸入內容中辨識到明確的時間與項目"
              : "Could not map explicit items or times from the voice input"
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoiceParsing(false);
    }
  };

  const handleEmailConfirmationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailParsing || !emailInput.trim()) return;
    setEmailParsing(true);
    try {
      const res = await fetch("/api/ai/parse-email-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailText: emailInput,
          lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const { parsedItems } = json.data;
        if (parsedItems && parsedItems.length > 0) {
          parsedItems.forEach((item: any) => {
            onAddItineraryItem({
              dayIndex: typeof item.dayIndex === "number" ? item.dayIndex : activeDay,
              time: item.time || "14:00",
              title: item.title,
              description: item.description || "",
              locationName: item.locationName || item.title,
              category: item.category || "sight",
              cost: item.cost || 0,
            });
          });

          if (onPostAISystemMessage) {
            onPostAISystemMessage(
              lang === "zh"
                ? `✉️ 預約信導入成功！已辨識出 ${parsedItems.length} 個行程，並自動加入日程。`
                : `✉️ Confirmation loaded! Automatically mapped ${parsedItems.length} parsed reservations.`
            );
          }
          setEmailInput("");
        } else {
          alert(
            lang === "zh" ? "未能成功解析機票或飯店詳情" : "Could not map explicit reservation fields"
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEmailParsing(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingChat || !chatMsg.trim()) return;

    const userMessage = chatMsg.trim();
    setChatLog((prev) => [...prev, { sender: "user", text: userMessage }]);
    setChatMsg("");
    setSubmittingChat(true);

    try {
      const res = await fetch("/api/ai/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          itineraries,
          lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setChatLog((prev) => [...prev, { sender: "ai", text: json.data.response }]);
      } else {
        setChatLog((prev) => [
          ...prev,
          {
            sender: "ai",
            text:
              lang === "zh"
                ? "抱歉，我的連結似乎有些異常，請稍後再試。"
                : "Sorry, I lost access connection with the Gemini server. Retry.",
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingChat(false);
    }
  };

  const handlePostCommentSubmit = (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;
    onCommentItinerary(itemId, newCommentInput.trim());
    setNewCommentInput("");
  };

  return (
    <div className="glass-container rounded-2xl p-5 shadow-lg h-full min-h-[500px] flex flex-col justify-between">
      <div className="flex-grow flex flex-col justify-between h-full">
        <div className="flex flex-col flex-1 h-full">
          {/* Embedded Interactive Map in Sidebar */}
          {showMap && (
            <div className="w-full h-[220px] min-h-[220px] mb-4 rounded-xl overflow-hidden border border-white/10 dark:border-white/5 shadow-md shrink-0">
              <ItineraryMap
                destination={filteredItems[0]?.locationName || "Tokyo"}
                items={filteredItems}
                lang={lang}
              />
            </div>
          )}

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
              <span>OdyShareSmart AI</span>
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
              <span>{t.discussionSidebar}</span>
              {activeCommentDrawerId ? (
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
              ) : null}
            </button>
          </div>

          {/* Tab Contents: AI Side */}
          {sidebarTab === "ai" ? (
            <div className="flex-1 flex flex-col justify-between h-full space-y-3">
              {/* Optimizer input */}
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0 text-left">
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
                  <span className="text-slate-400 text-[10px] font-bold">
                    {isOptimizerCollapsed ? "＋" : "－"}
                  </span>
                </div>

                {!isOptimizerCollapsed && (
                  <div className="space-y-2 pt-1 animate-fadeIn">
                    <p className="text-[10.5px] text-slate-400 leading-relaxed">
                      {t.optimizerDesc}
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <label className="block text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        {t.groupVibe}
                      </label>
                      <input
                        id="ai-preferences-input"
                        type="text"
                        value={prefInput}
                        onChange={(e) => setPrefInput(e.target.value)}
                        placeholder="e.g. Sushi crawl, cultural shrines..."
                        className="w-full text-xs px-2.5 py-1.5 glass-input rounded-lg text-white font-medium"
                      />
                      <div className="flex gap-1">
                        <button
                          id="ai-optimize-btn"
                          onClick={handleOptimize}
                          disabled={optimizing}
                          className="flex-1 py-1.5 glass-button-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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

                        <button
                          id="ai-tsp-btn"
                          type="button"
                          onClick={handleTSPOptimization}
                          disabled={tspOptimizing}
                          className="py-1.5 px-3 bg-indigo-600/90 hover:bg-indigo-650 border border-indigo-500/10 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shrink-0"
                          title={
                            lang === "zh"
                              ? "TSP 經緯度最短路徑排序"
                              : "Optimize geographical shortest paths"
                          }
                        >
                          {tspOptimizing ? "..." : lang === "zh" ? "最短路徑" : "Shortest Route"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice / Natural Language Scheduling Bar */}
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0 text-left">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setIsVoiceCollapsed(!isVoiceCollapsed)}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                    <Sparkles size={13} className="text-indigo-400 shrink-0" />
                    <span>{lang === "zh" ? "AI 語音/自然語言排班" : "AI Voice / Natural Schedule"}</span>
                  </div>
                  <span className="text-slate-400 text-[10px] font-bold">
                    {isVoiceCollapsed ? "＋" : "－"}
                  </span>
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
                        placeholder={
                          lang === "zh" ? "輸入語音指令或文字..." : "Enter voice command or text schedule..."
                        }
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
                              <Zap size={11} className="text-white shrink-0" />
                              <span>{lang === "zh" ? "一鍵智慧排程" : "Generate Schedule"}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVoiceInput(
                              lang === "zh"
                                ? "幫我把第三天下午 3 點加進淺草寺，順便推薦附近步行 10 分鐘內、預算在 2000 日圓內的拉麵店"
                                : "Add Sensoji temple on Day 3 afternoon, and recommend a ramen shop nearby under 2000 JPY"
                            )
                          }
                          className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-400 cursor-pointer transition-all shrink-0 font-medium"
                          title={lang === "zh" ? "載入語音範例" : "Load Example"}
                        >
                          {lang === "zh" ? "範例" : "Example"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Email Confirmation Parser Card */}
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2 shrink-0 text-left">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setIsEmailCollapsed(!isEmailCollapsed)}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300">
                    <Calendar size={13} className="text-teal-400 shrink-0" />
                    <span>{lang === "zh" ? "一鍵導入機票/酒店確認信" : "Import Flight/Hotel confirmation"}</span>
                  </div>
                  <span className="text-slate-400 text-[10px] font-bold">
                    {isEmailCollapsed ? "＋" : "－"}
                  </span>
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
                        placeholder={
                          lang === "zh"
                            ? "貼上機票或酒店預約信內文..."
                            : "Paste flight details or hotel reservation text..."
                        }
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
                              <Send size={11} className="text-white shrink-0" />
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
                          className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-400 cursor-pointer transition-all shrink-0 font-medium"
                          title={lang === "zh" ? "載入機票預約範例" : "Load Booking Example"}
                        >
                          {lang === "zh" ? "範例" : "Example"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Unified AI Voice Assistant Player Card */}
              {lastVoiceSummary && (
                <div className="bg-indigo-950/20 border border-indigo-500/20 p-3.5 rounded-xl space-y-2.5 shrink-0 animate-fadeIn text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                      <Volume2 size={13} className="text-indigo-400 shrink-0" />
                      <span>{lang === "zh" ? "OdyShareSmart AI 語音播報" : "AI Voice Broadcast"}</span>
                    </div>

                    {/* Pulsing state indicator */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex h-2 w-2">
                        {isAudioPlaying && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            isAudioPlaying ? "bg-indigo-400 animate-pulse" : "bg-slate-500"
                          }`}
                        ></span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {isAudioPlaying
                          ? lang === "zh"
                            ? "播音中"
                            : "Playing"
                          : lang === "zh"
                          ? "已靜音"
                          : "Idle"}
                      </span>
                    </div>
                  </div>

                  {/* Speech content reader box */}
                  <div className="p-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-[10.5px] text-slate-200 leading-relaxed font-sans max-h-24 overflow-y-auto scrollbar-thin">
                    {lastVoiceSummary}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-1.5">
                      {lastAudioBase64 ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAudioPlaying) {
                              stopAudio();
                            } else {
                              playAudio(lastAudioBase64);
                            }
                          }}
                          className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            isAudioPlaying
                              ? "bg-amber-600/90 hover:bg-amber-700 text-white"
                              : "bg-indigo-600/90 hover:bg-indigo-700 text-white"
                          }`}
                        >
                          {isAudioPlaying ? (
                            <>
                              <Square size={10} fill="currentColor" />
                              <span>{lang === "zh" ? "停止" : "Stop"}</span>
                            </>
                          ) : (
                            <>
                              <Play size={10} fill="currentColor" />
                              <span>{lang === "zh" ? "重新播放" : "Replay"}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          ⚠️ {lang === "zh" ? "未連接 API 金鑰" : "API Key Offline"}
                        </span>
                      )}
                    </div>

                    {/* Autoplay setting */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoPlayAudio}
                        onChange={(e) => setAutoPlayAudio(e.target.checked)}
                        className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-0 w-3 h-3 cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-400 font-medium">
                        {lang === "zh" ? "自動播報" : "Autoplay"}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conversation Box */}
              <div className="flex-1 flex flex-col justify-between pb-1 min-h-[160px] bg-white/3 border border-white/5 p-3 rounded-xl text-left">
                <div
                  className="flex items-center justify-between cursor-pointer select-none mb-2"
                  onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                >
                  <h5 className="font-extrabold text-white text-[11px] flex items-center gap-1">
                    <MessageSquare size={13} className="text-blue-400" />
                    <span>{t.OdyShareSmartConc}</span>
                  </h5>
                  <span className="text-slate-400 text-[10px] font-bold">
                    {isChatCollapsed ? "＋" : "－"}
                  </span>
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
                        <span className="text-[9px] text-slate-400 font-mono italic animate-pulse font-medium">
                          {lang === "zh" ? "OdyShareSmart 智慧響應中..." : "Assistant mapping..."}
                        </span>
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
                  <p className="text-[10px] text-slate-500 italic text-center py-2">
                    {lang === "zh" ? "對話框已收合" : "Chat log collapsed"}
                  </p>
                )}
              </div>
            </div>
          ) : activeCommentDrawerId ? (
            (() => {
              const selectedItem = itineraries.find((i) => i.id === activeCommentDrawerId);
              if (!selectedItem) {
                return (
                  <div className="text-center py-12 text-slate-400 text-xs flex-1">
                    Activity item not found
                  </div>
                );
              }

              return (
                <div className="flex-1 flex flex-col justify-between h-full text-left">
                  <div className="flex-1 flex flex-col">
                    <div className="pb-2 border-b border-white/10 mb-3 text-xs">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                        {t.discussionSidebar}
                      </span>
                      <h4 className="font-extrabold text-white text-[13px] mt-0.5 leading-snug">
                        {selectedItem.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedItem.comments.length} {t.commentsCount}
                      </p>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 max-h-[220px] scrollbar-thin text-[11px] mb-3">
                      {selectedItem.comments.length === 0 ? (
                        <div className="py-8 text-center bg-white/3 rounded-xl border border-dashed border-white/10 flex flex-col items-center p-3">
                          <MessageSquare size={16} className="text-slate-500 mb-1" />
                          <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                            {t.noCustomPosts}
                          </p>
                        </div>
                      ) : (
                        selectedItem.comments.map((comm) => {
                          const author = participants.find((p) => p.id === comm.authorId);
                          return (
                            <div
                              key={comm.id}
                              className="p-2.5 bg-white/3 border border-white/5 rounded-xl flex items-start gap-2 animate-fadeIn"
                            >
                              <div
                                style={{ backgroundColor: author?.avatarColor || "#475569" }}
                                className="w-[20px] h-[20px] text-[9px] rounded-full font-bold text-white flex items-center justify-center shrink-0 border border-white/15"
                              >
                                {comm.authorName[0]}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-[11px]">
                                    {comm.authorName}
                                  </span>
                                  <span className="text-[8px] text-slate-500">
                                    {new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
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

                  <form
                    onSubmit={(e) => handlePostCommentSubmit(e, selectedItem.id)}
                    className="flex gap-1.5 text-xs pt-2.5 border-t border-white/10 shrink-0"
                  >
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
  );
}
