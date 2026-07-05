export interface SystemMessageOpts {
  idPrefix?: string;
  avatarColor?: string;
  isTripUpdate?: boolean;
}

export function createSystemMessage(text: string, opts: SystemMessageOpts = {}) {
  const prefix = opts.idPrefix || "sys";
  return {
    id: `msg-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId: "system",
    senderName: "OdyShareSmart AI",
    avatarColor: opts.avatarColor || "#64748b",
    messageEncrypted: "",
    messageDecrypted: text,
    timestamp: new Date().toISOString(),
    isTripUpdate: opts.isTripUpdate !== undefined ? opts.isTripUpdate : true,
  };
}
