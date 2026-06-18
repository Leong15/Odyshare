import { Router, Request, Response } from "express";
import { getDB, writeDB } from "../db.js";
import argon2 from "argon2";

const router = Router();

// 1. User Registration
router.post("/register", async (req: Request, res: Response) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "Username, password and name are required." });
  }

  // Password validation: 1 uppercase, 1 lowercase, 1 special character
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasSpecial) {
    return res.status(400).json({
      error: "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character (密碼必須包含至少 1 個大寫字母、1 個小寫字母與 1 個特殊符號)。"
    });
  }

  const db = getDB();
  const exists = db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Username already exists." });
  }

  try {
    // Hash password with argon2id (argon2id is default type in argon2)
    const hashedPassword = await argon2.hash(password.trim(), {
      type: argon2.argon2id
    });

    const colors = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newUser = {
      id: "user-" + Date.now(),
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      email: `${username.trim().toLowerCase()}@example.com`,
      avatarColor: randomColor
    };

    db.users.push(newUser);
    writeDB(db);

    res.json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        name: newUser.name, 
        email: newUser.email, 
        avatarColor: newUser.avatarColor 
      } 
    });
  } catch (err) {
    console.error("Argon2 hashing error during registration:", err);
    res.status(500).json({ error: "Failed to securely hash password." });
  }
});

// 2. User Login
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  try {
    let isValid = false;

    // Check if password matches via argon2 or plain text fallback (for initial mocked credentials "123")
    if (user.password.startsWith("$argon2")) {
      isValid = await argon2.verify(user.password, password.trim());
    } else {
      // Fallback plain-text check for default pre-seeded accounts (e.g. leo, chloe, david, sophy)
      isValid = user.password === password.trim();
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        email: user.email, 
        avatarColor: user.avatarColor 
      } 
    });
  } catch (err) {
    console.error("Password verification crash:", err);
    res.status(500).json({ error: "Authentication system failure." });
  }
});

// 3. User Change Password (When already logged in)
router.post("/change-password", async (req: Request, res: Response) => {
  const { username, currentPassword, newPassword } = req.body;
  const headerUserId = req.headers["x-user-id"];

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." });
  }

  const db = getDB();
  let user;

  if (username) {
    user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }
  
  if (!user && headerUserId) {
    user = db.users.find(u => u.id === headerUserId);
  }

  if (!user) {
    return res.status(404).json({ error: "User profile or session credentials could not be resolved." });
  }

  try {
    let isValid = false;
    if (user.password.startsWith("$argon2")) {
      isValid = await argon2.verify(user.password, currentPassword.trim());
    } else {
      isValid = user.password === currentPassword.trim();
    }

    if (!isValid) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    // Validate new password strength
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasSpecial) {
      return res.status(400).json({
        error: "New password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character (密碼必須包含至少 1 個大寫字母、1 個小寫字母與 1 個特殊符號)."
      });
    }

    // Hash new password securely
    const hashedPassword = await argon2.hash(newPassword.trim(), {
      type: argon2.argon2id
    });

    user.password = hashedPassword;
    writeDB(db);

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Change password failure:", err);
    res.status(500).json({ error: "Password change process failure." });
  }
});

// 4. Forget Password (Verify registered Username and Display Name to reset securely)
router.post("/forget-password", async (req: Request, res: Response) => {
  const { username, registeredName, newPassword } = req.body;
  if (!username || !registeredName || !newPassword) {
    return res.status(400).json({ error: "Username, registered name, and new password are required." });
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Account with that username does not exist." });
  }

  // Identity confirmation: Compare names case-insensitively/trimmed
  const inputName = registeredName.trim().toLowerCase();
  const dbName = user.name.trim().toLowerCase();
  if (inputName !== dbName) {
    return res.status(400).json({ error: "Identity verification failed. Display name does not match." });
  }

  // Validate password strength
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  if (!hasUpper || !hasLower || !hasSpecial) {
    return res.status(400).json({
      error: "New password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character."
    });
  }

  try {
    const hashedPassword = await argon2.hash(newPassword.trim(), {
      type: argon2.argon2id
    });

    user.password = hashedPassword;
    writeDB(db);

    res.json({ success: true, message: "Password reset complete. You can now login with your new credentials." });
  } catch (err) {
    console.error("Forget password reset failure:", err);
    res.status(500).json({ error: "Password reset process failure." });
  }
});

// 5. Reset security question API for check dialog
router.get("/reset-question", (req: Request, res: Response) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === (username as string).trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "User account not found (該帳號不存在)." });
  }
  res.json({ message: "Challenge loaded successfully." });
});

// 6. Reset security check confirmation and backup trigger
router.post("/reset-confirm", async (req: Request, res: Response) => {
  const { username, answer } = req.body;
  if (!username || !answer) {
    return res.status(400).json({ message: "Username and verification answer are required." });
  }
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "User account not found." });
  }

  if (user.name.trim().toLowerCase() !== answer.trim().toLowerCase()) {
    return res.status(400).json({ message: "Identity verification failed. Name matches incorrectly (輸入顯示名字不符，驗證失敗)。" });
  }

  let finalPassword = "";
  if (!user.password.startsWith("$argon2")) {
    finalPassword = user.password;
  } else {
    // If argon2 hashed, reset to default compliant passcode to let user lock back in securely
    finalPassword = "WanderSyncPass123!";
    const hashedPassword = await argon2.hash(finalPassword, { type: argon2.argon2id });
    user.password = hashedPassword;
    writeDB(db);
  }

  res.json({ password: finalPassword });
});

export default router;
