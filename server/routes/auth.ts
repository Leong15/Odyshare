import { Router, Request, Response } from "express";
import { getDB, writeDB } from "../db";

const router = Router();

// 1. User Registration
router.post("/register", (req: Request, res: Response) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "Username, password and name are required." });
  }

  const db = getDB();
  const exists = db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Username already exists." });
  }

  const colors = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const newUser = {
    id: "user-" + Date.now(),
    username: username.trim().toLowerCase(),
    password: password.trim(),
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
});

// 2. User Login
router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim());
  if (!user) {
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
});

export default router;
