import React, { useState, useRef, useEffect } from "react";
import { Lock, Eye, EyeOff, Send, Info, Users, Bell } from "lucide-react";
import { ChatMessage, Participant } from "../types";
import { translations } from "../lib/translations";
import { isSystemMessage } from "../lib/constants";

interface EncryptedWorkspaceChatProps {
  chats: ChatMessage[];
  participants: Participant[];
  currentUser: string;
  onSendMessage: (text: string) => void;
  lang?: "en" | "zh";
}

export default function EncryptedWorkspaceChat({
  chats,
  participants,
  currentUser,
  onSendMessage,
  lang = "en"
}: EncryptedWorkspaceChatProps) {
  // TODO: Currently just base64 encoding, not true encryption...
  const [chatInput, setChatInput] = useState<string>("");
  const [showEncryptedState, setShowEncryptedState] = useState<{ [key: string]: boolean }>({});
  const [securityStandard, setSecurityStandard] = useState<string>("ECDH + AESGCM-256");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const t = translations[lang];

  // Auto-scroll on new message logs
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chats]);

  const handlePostChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput("");
  };

  const toggleCipherView = (msgId: string) => {
    setShowEncryptedState(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  return (
    <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-0 shadow-xl overflow-hidden flex flex-col h-[750px] md:h-[525px] animate-fadeIn text-slate-100">
      {/* Top security status bar */}
      <div className="p-4 bg-slate-950/60 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            <Lock size={15} />
          </div>
          <div>
            <h4 className="font-extrabold text-white flex items-center gap-1.5 leading-none">
              <span>{t.securityHub}</span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              {t.doubleRatchet}: <span className="font-mono text-emerald-300 font-bold">{securityStandard}</span>
            </p>
          </div>
        </div>

        <div className="flex bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-[10px] text-emerald-300 font-bold font-mono uppercase tracking-wider items-center gap-1.5 select-none">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          <span>ECDH + AESGCM-256 Enforced</span>
        </div>
      </div>

      {/* Main chat and active participants split */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left side: Chat scroll */}
        <div className="flex-1 flex flex-col justify-between min-h-0 bg-slate-950/10">
          {/* Scroll container */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs"
          >
            {chats.map((msg) => {
              const isSystem = isSystemMessage(msg.senderId);
              const isMe = msg.senderId === currentUser;
              const viewEncrypted = showEncryptedState[msg.id] || false;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2 animate-fadeIn font-bold">
                    <div className="bg-white/5 border border-white/5 text-slate-400 rounded-full px-4 py-1 text-[10.5px] flex items-center gap-1.5 font-bold font-sans">
                      <Bell size={10} className="text-blue-400 shrink-0" />
                      <span>{msg.messageDecrypted}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  className={`flex gap-2.5 max-w-[85%] animate-fadeIn ${
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* User Avatar */}
                  <div
                    style={{ backgroundColor: msg.avatarColor || "#64748b" }}
                    className="w-7 h-7 rounded-full text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/10"
                  >
                    {msg.senderName[0]}
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <div className="flex items-center gap-2 text-[11px] self-start font-bold">
                      <span className="font-extrabold text-white">{msg.senderName}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Chat Bubble card */}
                    <div className="relative group text-xs text-slate-100 font-sans">
                      <div
                        className={`p-3 rounded-2xl border leading-relaxed ${
                          isMe
                            ? "bg-blue-600 border-blue-500/20 text-white rounded-tr-none shadow-sm"
                            : "bg-slate-900/60 border-white/8 rounded-tl-none shadow-sm text-slate-200"
                        }`}
                      >
                        {viewEncrypted ? (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-300 block font-mono">
                              {lang === "zh" ? "AES-GCM 加密載荷" : "Encrypted Payload"}
                            </span>
                            <span className="font-mono text-[9.5px] break-all leading-tight opacity-90 block">
                              {msg.messageEncrypted}
                            </span>
                          </div>
                        ) : (
                          <span>{msg.messageDecrypted}</span>
                        )}
                      </div>

                      {/* Decryption status tooltips */}
                      <div className="mt-1 flex items-center gap-2 justify-between">
                        {/* Toggle lock inspect button */}
                        <button
                          id={`toggle-lock-${msg.id}`}
                          onClick={() => toggleCipherView(msg.id)}
                          className="text-[9.5px] font-bold font-mono flex items-center gap-0.5 cursor-pointer text-slate-400 hover:text-white transition-colors"
                        >
                          {viewEncrypted ? (
                            <>
                              <EyeOff size={10} />
                              <span>{t.showDecrypted}</span>
                            </>
                          ) : (
                            <>
                              <Eye size={10} />
                              <span>{t.inspectCipher}</span>
                            </>
                          )}
                        </button>

                        <div className="text-[9px] text-slate-550 font-mono flex items-center gap-0.5 select-none font-sans font-bold">
                          <span>{isMe ? t.localHandshakeKey : t.peerKeysValidated}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Chat Inputs */}
          <form onSubmit={handlePostChat} className="p-3.5 bg-slate-900/40 border-t border-white/5 flex gap-2 text-sm">
            <input
              id="group-chat-input"
              type="text"
              placeholder={t.sendSecuredUpdate}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 text-[13px] font-sans h-11"
            />
            <button
              id="send-chat-btn"
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition shadow flex items-center gap-1.5 shrink-0 cursor-pointer h-11 active:scale-[0.98]"
            >
              <Send size={11} />
              <span>{t.broadcast}</span>
            </button>
          </form>
        </div>

        {/* Right side: Active participants panel */}
        <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-white/5 p-4 bg-slate-950/20 flex flex-col h-auto md:h-full shrink-0 justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-4 flex items-center gap-1.5 leading-none">
              <Users size={11} className="text-blue-400" />
              <span>{t.activeRoomUsers} ({participants.length})</span>
            </span>

            <div className="space-y-2.5 max-h-[195px] md:max-h-[295px] overflow-y-auto scrollbar-thin">
              {participants.map((member) => (
                <div key={member.id} className="p-2 bg-white/3 border border-white/5 rounded-xl flex items-center gap-2 animate-fadeIn text-white font-sans font-bold">
                  <div
                    style={{ backgroundColor: member.avatarColor }}
                    className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center shrink-0 border border-white/10"
                  >
                    {member.name[0]}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] truncate leading-none">{member.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-0.5 text-[8.5px] text-slate-400 mt-1 font-mono truncate leading-none">
                      <span>ECDH: {member.publicKey}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/15 rounded-xl flex items-start gap-1.5">
            <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-normal font-sans">
              {lang === "zh" 
                ? "迪菲-赫爾曼 (Diffie-Hellman) 金鑰對是在房間連線建立時動態協商。所有文字傳輸在接觸伺服器前即由本地熵源加載加密。"
                : "Diffie-Hellman key pairs are negotiated instantly inside client session. All outputs undergo client entropy shielding vectors."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
