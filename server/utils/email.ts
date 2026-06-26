import nodemailer from "nodemailer";

export async function sendRealEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPass = process.env.GMAIL_APP_PASS;
  const fromName = process.env.GMAIL_FROM_NAME || "OdyShareSync";

  if (!gmailUser || !gmailAppPass) {
    const errorMsg = "Gmail 寄件設定尚未配置。請在 AI Studio「Settings > Secrets」設定 GMAIL_USER (您的 Gmail 地址) 與 GMAIL_APP_PASS (您的 16 位元 Gmail 應用程式密碼) 變數以啟用真實郵件傳送。";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Create transporter with official Gmail transport helper
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser.trim(),
      pass: gmailAppPass.trim(),
    },
  });

  const cleanFromName = fromName.replace(/["'<>]/g, "").trim();
  const from = cleanFromName ? `"${cleanFromName}" <${gmailUser.trim()}>` : gmailUser.trim();

  console.log(`[Email Dispatch] Sending email via Gmail SMTP. From: ${from}, To: ${to}, Subject: ${subject}`);

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  console.log(`[Email Dispatch] Email successfully sent to ${to}`);
}
