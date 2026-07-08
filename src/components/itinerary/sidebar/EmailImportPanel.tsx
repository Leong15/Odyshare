import React, { useState } from "react";
import { Calendar, RefreshCw, Send } from "lucide-react";
import { Toast } from "../../common/Toast";
import { CollapsibleSection } from "../../common/CollapsibleSection";
import { useToast } from "../../../hooks/useToast";
import { apiClient } from "../../../lib/apiClient";

interface EmailImportPanelProps {
  lang: "en" | "zh";
  activeDay: number;
  onAddItineraryItem: (item: any) => void;
  onPostAISystemMessage?: (text: string) => void;
}

export default function EmailImportPanel({
  lang,
  activeDay,
  onAddItineraryItem,
  onPostAISystemMessage,
}: EmailImportPanelProps) {
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailParsing, setEmailParsing] = useState<boolean>(false);
  const { toast, showToast, closeToast } = useToast();

  const handleEmailConfirmationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailParsing || !emailInput.trim()) return;
    setEmailParsing(true);
    try {
      const response = await apiClient.post("/api/ai/parse-email-confirmation", {
        emailText: emailInput,
        lang,
      });

      if (response.success && response.data) {
        const { parsedItems } = response.data;
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
          showToast(
            "warning",
            lang === "zh" ? "解析提醒" : "Parsing Notice",
            lang === "zh"
              ? "未能成功解析機票或飯店詳情"
              : "Could not map explicit reservation fields"
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
      setEmailParsing(false);
    }
  };

  return (
    <>
      <CollapsibleSection
        title={lang === "zh" ? "一鍵導入機票/酒店確認信" : "Import Flight/Hotel confirmation"}
        ariaLabel={lang === "zh" ? "一鍵導入機票或酒店確認信" : "Import Flight or Hotel Confirmation Email"}
        headerIcon={<Calendar size={13} className="text-teal-400 shrink-0" />}
        titleClassName="text-teal-300"
      >
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
