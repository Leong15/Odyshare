import React, { useState, useEffect } from "react";
import { MessageSquare, Sparkles, Send, Eye } from "lucide-react";
import { ItineraryItem, Participant } from "../../types";
import { translations } from "../../lib/translations";
import ItineraryMap from "../map/ItineraryMap";
import AIOptimizerPanel from "./sidebar/AIOptimizerPanel";
import VoiceSchedulePanel from "./sidebar/VoiceSchedulePanel";
import EmailImportPanel from "./sidebar/EmailImportPanel";
import AIChatPanel from "./sidebar/AIChatPanel";

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
  onAddItineraryItem: (
    item: Omit<ItineraryItem, "id" | "votes" | "comments" | "coordinates" | "trafficStatus">
  ) => void;
  onCommentItinerary: (itemId: string, text: string) => void;
}

export default function AISidebarPanel({
  lang,
  itineraries,
  activeDay,
  showMap,
  filteredItems,
  participants,
  activeCommentDrawerId,
  onApplyAIOptimization,
  onPostAISystemMessage,
  onAddItineraryItem,
  onCommentItinerary,
}: AISidebarPanelProps) {
  const t = translations[lang];

  // Tab UI state
  const [sidebarTab, setSidebarTab] = useState<"ai" | "discussion">("ai");

  // Comment input state
  const [newCommentInput, setNewCommentInput] = useState<string>("");

  useEffect(() => {
    if (activeCommentDrawerId) {
      setSidebarTab("discussion");
    }
  }, [activeCommentDrawerId]);

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
              <AIOptimizerPanel
                lang={lang}
                itineraries={itineraries}
                activeDay={activeDay}
                onApplyAIOptimization={onApplyAIOptimization}
                onPostAISystemMessage={onPostAISystemMessage}
              />
              <VoiceSchedulePanel
                lang={lang}
                activeDay={activeDay}
                onAddItineraryItem={onAddItineraryItem}
                onPostAISystemMessage={onPostAISystemMessage}
              />
              <EmailImportPanel
                lang={lang}
                activeDay={activeDay}
                onAddItineraryItem={onAddItineraryItem}
                onPostAISystemMessage={onPostAISystemMessage}
              />
              <AIChatPanel
                lang={lang}
                itineraries={itineraries}
              />
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
