import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Volume2, Square, Play } from "lucide-react";
import { ItineraryItem } from "../../../types";
import { translations } from "../../../lib/translations";

interface AIChatPanelProps {
  lang: "en" | "zh";
  itineraries: ItineraryItem[];
}

export default function AIChatPanel({ lang, itineraries }: AIChatPanelProps) {
  const t = translations[lang];

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
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);
  const [lastVoiceSummary, setLastVoiceSummary] = useState<string>("");
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [audioSource, setAudioSource] = useState<any>(null);
  const [audioCtx, setAudioCtx] = useState<any>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);

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

  const autoPlayAudioRef = useRef(autoPlayAudio);
  useEffect(() => {
    autoPlayAudioRef.current = autoPlayAudio;
  }, [autoPlayAudio]);

  // Listen to custom event dispatched by AIOptimizerPanel
  useEffect(() => {
    const handleVoiceEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ voiceSummary: string; audioBase64?: string }>;
      if (customEvent.detail) {
        const { voiceSummary, audioBase64 } = customEvent.detail;
        if (voiceSummary) {
          setLastVoiceSummary(voiceSummary);
          if (audioBase64) {
            setLastAudioBase64(audioBase64);
            if (autoPlayAudioRef.current) {
              playAudio(audioBase64);
            }
          }
        }
      }
    };
    window.addEventListener("playVoiceSummary", handleVoiceEvent);
    return () => {
      window.removeEventListener("playVoiceSummary", handleVoiceEvent);
    };
  }, []);

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

  return (
    <div className="space-y-3">
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
  );
}
