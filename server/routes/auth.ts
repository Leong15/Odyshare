import { Router, Request, Response } from "express";
import { getDB, writeDB } from "../db.js";
import { sendRealEmail } from "../utils/email.js";
import { safeHash, safeVerify } from "../utils/crypto.js";
import crypto from "crypto";
import { ok, fail } from "../utils/apiResponse.js";

const router = Router();

// Simple in-memory sliding rate-limiter map
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function rateLimitLogin(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  if (now - attempt.firstAttempt > 60000) {
    // Reset window after 1 minute
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  attempt.count++;
  if (attempt.count > 5) {
    return false; // Blocked
  }
  return true;
}

// Input sanitization utility to strip HTML / script tags and trim whitespace
function sanitizeString(str: any): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "") // Strip HTML tags to prevent XSS/injection
    .trim();
}

// ── Email Verification Endpoint ──────────────────────────────────────────────
router.get("/verify-email", async (req: Request, res: Response) => {
  const { token, username } = req.query;
  if (!token || !username) {
    return res.status(400).send("無效的驗證請求 (Invalid verification request).");
  }

  const cleanUsername = sanitizeString(username);
  const cleanToken = sanitizeString(token);

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!user || user.verificationToken !== cleanToken) {
    return res.status(400).send("驗證代碼不正確或已過期 (Verification token invalid or expired).");
  }

  user.emailVerified = true;
  delete user.verificationToken;
  writeDB(db);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Email Verification Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 24px; text-align: center; max-width: 420px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
          h1 { color: #10b981; margin-top: 0; font-size: 24px; font-weight: 800; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          .emoji { font-size: 48px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="emoji">✨</div>
          <h1>驗證成功！ (Verification Success)</h1>
          <p>您的 Email 已確認，協作帳號已正式啟用。您現在可以關閉此分頁並返回平台登入。</p>
          <p style="font-size: 12px; color: #64748b;">Your email has been confirmed. Your account is now active. You can safely close this browser window and proceed to sign in.</p>
        </div>
      </body>
    </html>
  `);
});

// 1. User Registration with Mandatory Email Verification
router.post("/register", async (req: Request, res: Response) => {
  const { username, password, name, email } = req.body;
  if (!username || !password || !name || !email) {
    return res.status(400).json(fail("BAD_REQUEST", "Username, password, name, and email are required (請填寫帳號、密碼、姓名與電子信箱)。"));
  }

  // Length limit checks
  if (username.length > 50) {
    return res.status(400).json(fail("BAD_REQUEST", "Username cannot exceed 50 characters (帳號長度上限為 50 字元)。"));
  }
  if (password.length > 128) {
    return res.status(400).json(fail("BAD_REQUEST", "Password cannot exceed 128 characters (密碼長度上限為 128 字元)。"));
  }
  if (name.length > 100) {
    return res.status(400).json(fail("BAD_REQUEST", "Name cannot exceed 100 characters (姓名長度上限為 100 字元)。"));
  }
  if (email.length > 100) {
    return res.status(400).json(fail("BAD_REQUEST", "Email cannot exceed 100 characters (電子信箱長度上限為 100 字元)。"));
  }

  const cleanUsername = sanitizeString(username);
  const cleanName = sanitizeString(name);
  const cleanEmail = sanitizeString(email);

  if (!cleanUsername) {
    return res.status(400).json(fail("BAD_REQUEST", "Invalid username character configuration."));
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json(fail("BAD_REQUEST", "Invalid email address format (電子信箱格式不正確)。"));
  }

  // Password validation: 1 uppercase, 1 lowercase, 1 special character
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasSpecial) {
    return res.status(400).json(fail("BAD_REQUEST", "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character (密碼必須包含至少 1 個大寫字母、1 個小寫字母與 1 個特殊符號)。"));
  }

  const db = getDB();
  const exists = db.users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(400).json(fail("BAD_REQUEST", "Username already exists (此帳號已被註冊)。"));
  }

  const emailExists = db.users.some(u => u.email && u.email.toLowerCase() === cleanEmail.toLowerCase());
  if (emailExists) {
    return res.status(400).json(fail("BAD_REQUEST", "Email already registered (此電子信箱已被註冊)。"));
  }

  try {
    const hashedPassword = await safeHash(password);

    const colors = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const verifyToken = crypto.randomBytes(32).toString("hex");

    const newUser = {
      id: "user-" + Date.now(),
      username: cleanUsername,
      password: hashedPassword,
      name: cleanName,
      email: cleanEmail,
      avatarColor: randomColor,
      emailVerified: false,
      verificationToken: verifyToken
    };

    db.users.push(newUser);
    writeDB(db);

    // Send verification link via real email
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verifyLink = `${appUrl}/api/auth/verify-email?token=${verifyToken}&username=${encodeURIComponent(newUser.username)}`;
    const emailSubject = "OdyShareSync - 帳號啟用電子郵件驗證 (Email Verification)";
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 500px;">
        <h2 style="color: #3b82f6; margin-top: 0; font-size: 20px; font-weight: 800; text-align: center;">OdyShareSync 旅伴協作平台</h2>
        <p>親愛的 <strong>${newUser.name}</strong>，您好：</p>
        <p>感謝您註冊 OdyShareSync 旅伴協作帳號！請點擊下方按鈕以驗證您的電子郵件地址並啟用帳號：</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${verifyLink}" target="_blank" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
            確認驗證並啟用帳號 (Verify & Activate)
          </a>
        </div>
        <p style="font-size: 11px; color: #64748b; line-height: 1.5;">如果上方連結無法直接點擊，請複製下方連結至網址列開啟：<br/>
        <a href="${verifyLink}" target="_blank" style="color: #3b82f6; word-break: break-all;">${verifyLink}</a></p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="font-size: 10px; color: #94a3b8; text-align: center;">此信件為系統自動發送，請勿直接回覆。</p>
      </div>
    `;

    let emailSentSuccess = true;
    let emailErrorMessage = "";
    try {
      await sendRealEmail({ to: newUser.email, subject: emailSubject, html: emailHtml });
    } catch (sendErr: any) {
      console.error("Real verification email sending failed:", sendErr);
      emailSentSuccess = false;
      emailErrorMessage = sendErr.message || "Email dispatch failed";
    }

    if (!emailSentSuccess) {
      return res.status(400).json(fail("BAD_REQUEST", `帳號已註冊，但驗證信發送失敗。原因：${emailErrorMessage}。請聯絡管理員或至 Secrets 設定您的 SMTP 金鑰。`));
    }

    res.json(ok({
      pendingVerification: true,
      message: "Registration successful. A verification email has been sent to your inbox. Please verify to activate your account (註冊成功！系統已發送驗證信至您的信箱，請點擊信中連結確認以啟用您的帳號)。"
    }));
  } catch (err) {
    console.error("Secure hashing error during registration:", err);
    res.status(500).json(fail("SERVER_ERROR", "Failed to securely hash password."));
  }
});

// 2. User Login (with Verification Check & Rate Limiter)
router.post("/login", async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!rateLimitLogin(ip)) {
    return res.status(429).json(fail("TOO_MANY_REQUESTS", "Too many login attempts. Please try again after 1 minute (登入嘗試過於頻繁，請於 1 分鐘後再試)。"));
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json(fail("BAD_REQUEST", "Username and password are required."));
  }

  // Length limit checks
  if (username.length > 50) {
    return res.status(400).json(fail("BAD_REQUEST", "Username cannot exceed 50 characters."));
  }
  if (password.length > 128) {
    return res.status(400).json(fail("BAD_REQUEST", "Password cannot exceed 128 characters."));
  }

  const cleanUsername = sanitizeString(username);

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!user) {
    return res.status(401).json(fail("UNAUTHORIZED", "Invalid username or password (帳號或密碼錯誤)。"));
  }

  // Block login if email is not verified yet (except for initial Admin account which is pre-verified)
  if (user.id !== "u1" && user.emailVerified === false) {
    return res.status(401).json(fail("UNAUTHORIZED", "Please verify your email address to activate your account (您的帳號尚未啟用，請先至信箱點擊驗證連結進行啟用)。"));
  }

  try {
    const isValid = await safeVerify(user.password, password);

    if (!isValid) {
      return res.status(401).json(fail("UNAUTHORIZED", "Invalid username or password (帳號或密碼錯誤)。"));
    }

    res.json(ok({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor
      }
    }));
  } catch (err) {
    console.error("Password verification crash:", err);
    res.status(500).json(fail("SERVER_ERROR", "Authentication system failure."));
  }
});

// 3. User Change Password (When already logged in)
router.post("/change-password", async (req: Request, res: Response) => {
  const { username, currentPassword, newPassword } = req.body;
  const headerUserId = req.headers["x-user-id"];

  if (!currentPassword || !newPassword) {
    return res.status(400).json(fail("BAD_REQUEST", "Current password and new password are required."));
  }

  if (currentPassword.length > 128 || newPassword.length > 128) {
    return res.status(400).json(fail("BAD_REQUEST", "Password length cannot exceed 128 characters."));
  }

  if (username && username.length > 50) {
    return res.status(400).json(fail("BAD_REQUEST", "Username length cannot exceed 50 characters."));
  }

  const cleanUsername = username ? sanitizeString(username) : undefined;

  const db = getDB();
  let user;

  if (cleanUsername) {
    user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  }
  
  if (!user && headerUserId) {
    const cleanHeaderUserId = sanitizeString(headerUserId);
    user = db.users.find(u => u.id === cleanHeaderUserId);
  }

  if (!user) {
    return res.status(404).json(fail("NOT_FOUND", "User profile or session credentials could not be resolved."));
  }

  try {
    const isValid = await safeVerify(user.password, currentPassword);

    if (!isValid) {
      return res.status(400).json(fail("BAD_REQUEST", "Current password is incorrect."));
    }

    // Validate new password strength
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasSpecial) {
      return res.status(400).json(fail("BAD_REQUEST", "New password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character (密碼必須包含至少 1 個大寫字母、1 個小寫字母與 1 個特殊符號)."));
    }

    // Hash new password securely with safety fallback
    const hashedPassword = await safeHash(newPassword);

    user.password = hashedPassword;
    writeDB(db);

    res.json(ok({ message: "Password updated successfully!" }));
  } catch (err) {
    console.error("Change password failure:", err);
    res.status(500).json(fail("SERVER_ERROR", "Password change process failure."));
  }
});

// 4. Forget Password (Verify registered Username and Email to generate secure random password)
router.post("/forget-password", async (req: Request, res: Response) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json(fail("BAD_REQUEST", "Username and email address are required (請輸入帳號與註冊的 Email 地址)。"));
  }

  if (username.length > 50) {
    return res.status(400).json(fail("BAD_REQUEST", "Username length cannot exceed 50 characters."));
  }
  if (email.length > 100) {
    return res.status(400).json(fail("BAD_REQUEST", "Email length cannot exceed 100 characters."));
  }

  const cleanUsername = sanitizeString(username);
  const cleanEmail = sanitizeString(email);

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!user) {
    return res.status(404).json(fail("NOT_FOUND", "User account not found (找不到此帳號)。"));
  }

  if (!user.email || user.email.toLowerCase() !== cleanEmail.toLowerCase()) {
    return res.status(400).json(fail("BAD_REQUEST", "Email address does not match our records (Email 地址與登記資料不符)。"));
  }

  try {
    // Generate secure but simpler random password with exactly 1 special character
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const specials = "!@#$%^*"; // simple special characters, exactly 1 will be chosen
    
    const rSpecial = specials[Math.floor(Math.random() * specials.length)];
    const rUpper = uppers[Math.floor(Math.random() * uppers.length)];
    const rDigit1 = digits[Math.floor(Math.random() * digits.length)];
    const rDigit2 = digits[Math.floor(Math.random() * digits.length)];
    
    let rLowers = "";
    for (let i = 0; i < 4; i++) {
      rLowers += lowers[Math.floor(Math.random() * lowers.length)];
    }
    
    // Combine to exactly 8 characters with exactly 1 special character
    const arr = (rUpper + rLowers + rDigit1 + rDigit2 + rSpecial).split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    const newRandomPassword = arr.join("");

    const hashedPassword = await safeHash(newRandomPassword);
    user.password = hashedPassword;
    writeDB(db);

    // Send the password email notification via real email
    const emailSubject = "OdyShareSync - 密碼重置與安全新密碼通知 (New Password)";
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 500px;">
        <h2 style="color: #10b981; margin-top: 0; font-size: 20px; font-weight: 800; text-align: center;">OdyShareSync 安全中心</h2>
        <p>親愛的 <strong>${user.name}</strong>，您好：</p>
        <p>我們收到了您的密碼重置請求。為了保障帳號安全，系統已為您隨機生成一組符合安全規格的新密碼：</p>
        <div style="margin: 20px 0; padding: 16px; background: #f1f5f9; border-radius: 8px; border: 1px dashed #cbd5e1; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; color: #0f172a; letter-spacing: 1.5px;">
          ${newRandomPassword}
        </div>
        <p style="color: #e11d48; font-weight: bold; font-size: 11px;">⚠️ 安全提示：此密碼符合高強度安全規範。登入後，建議您前往「用戶選單」>「修改密碼」變更為您好記的密碼。</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="font-size: 10px; color: #94a3b8; text-align: center;">此信件為系統自動發送，請勿直接回覆。</p>
      </div>
    `;

    let emailSentSuccess = true;
    let emailErrorMessage = "";
    try {
      await sendRealEmail({ to: user.email, subject: emailSubject, html: emailHtml });
    } catch (sendErr: any) {
      console.error("Real password reset email sending failed:", sendErr);
      emailSentSuccess = false;
      emailErrorMessage = sendErr.message || "Email dispatch failed";
    }

    if (!emailSentSuccess) {
      return res.status(400).json(fail("BAD_REQUEST", `密碼重設失敗：無法發送重設信。原因：${emailErrorMessage}。請聯絡管理員設定 SMTP。`));
    }

    res.json(ok({ message: "A secure random password has been sent to your registered email address. Please check your inbox (安全新密碼已發送至您的註冊信箱，請查看您的信箱並使用其登入)。" }));
  } catch (err) {
    console.error("Forgot password reset failure:", err);
    res.status(500).json(fail("SERVER_ERROR", "Password reset process failure."));
  }
});

// 5. Reset security question API for check dialog
router.get("/reset-question", (req: Request, res: Response) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json(fail("BAD_REQUEST", "Username is required."));
  }
  if ((username as string).length > 50) {
    return res.status(400).json(fail("BAD_REQUEST", "Username too long."));
  }
  const cleanUsername = sanitizeString(username);
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!user) {
    return res.status(404).json(fail("NOT_FOUND", "User account not found (該帳號不存在)."));
  }
  res.json(ok({ message: "Challenge loaded successfully." }));
});

// 6. Reset security check confirmation and backup trigger
router.post("/reset-confirm", async (req: Request, res: Response) => {
  const { username, answer } = req.body;
  if (!username || !answer) {
    return res.status(400).json(fail("BAD_REQUEST", "Username and verification answer are required."));
  }
  if (username.length > 50 || answer.length > 100) {
    return res.status(400).json(fail("BAD_REQUEST", "Input length limits exceeded."));
  }

  const cleanUsername = sanitizeString(username);
  const cleanAnswer = sanitizeString(answer);

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!user) {
    return res.status(404).json(fail("NOT_FOUND", "User account not found."));
  }

  if (user.name.trim().toLowerCase() !== cleanAnswer.toLowerCase()) {
    return res.status(400).json(fail("BAD_REQUEST", "Identity verification failed. Name matches incorrectly (輸入顯示名字不符，驗證失敗)。"));
  }

  let finalPassword = "";
  if (!user.password.startsWith("$argon2") && !user.password.startsWith("$scrypt$")) {
    finalPassword = user.password;
  } else {
    // If securely hashed, reset to default compliant passcode to let user lock back in securely
    finalPassword = "Pass123!";
    const hashedPassword = await safeHash(finalPassword);
    user.password = hashedPassword;
    writeDB(db);
  }

  res.json(ok({ password: finalPassword }));
});

export default router;
