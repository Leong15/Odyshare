import React, { useState } from "react";
import { Sparkles, RefreshCw, Zap } from "lucide-react";
import { Toast } from "../../common/Toast";
import { CollapsibleSection } from "../../common/CollapsibleSection";
import { useToast } from "../../../hooks/useToast";
import { apiClient } from "../../../lib/apiClient";

interface VoiceSchedulePanelProps {
  lang: "en" | "zh";
  activeDay: number;
  onAddItineraryItem: (item: any) => void;
  onPostAISystemMessage?: (text: string) => void;
}

export default function VoiceSchedulePanel({
  lang,
  activeDay,
  onAddItineraryItem,
  onPostAISystemMessage,
}: VoiceSchedulePanelProps) {
  const [voiceInput, setVoiceInput] = useState<string>("");
  const [voiceParsing, setVoiceParsing] = useState<boolean>(false);
  const { toast, showToast, closeToast } = useToast();

  const handleVoiceScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voiceParsing || !voiceInput.trim()) return;
    setVoiceParsing(true);
    try {
      const response = await apiClient.post("/api/ai/parse-voice-schedule", {
        voiceText: voiceInput,
        lang,
      });

      if (response.success && response.data) {
        const { parsedItems } = response.data;
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
          showToast(
            "warning",
            lang === "zh" ? "解析提醒" : "Parsing Notice",
            lang === "zh"
              ? "無法在輸入內容中辨識到明確的時間與項目"
              : "Could not map explicit items or times from the voice input"
          );
        }
      } else {
        showToast(
          "error",
          lang === "zh" ? "解析錯誤" : "Parsing Error",
          lang === "zh" ? "系統解析時發生未知錯誤" : "An unknown error occurred during parsing"
        );
      }
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        lang === "zh" ? "解析錯誤" : "Parsing Error",
        lang === "zh" ? "系統解析時發生未知錯誤" : "An unknown error occurred during parsing"
      );
    } finally {
      setVoiceParsing(false);
    }
  };

  return (
    <>
      <CollapsibleSection
        title={lang === "zh" ? "AI 語音/自然語言排班" : "AI Voice / Natural Schedule"}
        ariaLabel={lang === "zh" ? "AI 語音與自然語言排班" : "AI Voice and Natural Language Scheduling"}
        headerIcon={<Sparkles size={13} className="text-indigo-400 shrink-0" />}
      >
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
      </CollapsibleSection>

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={closeToast}
        />
      )}
    </>
  );
}
