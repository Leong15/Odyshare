import { Router, Request, Response } from "express";

const router = Router();

// Flight Subscription mock endpoints (conforms to route mounting structure)
router.post("/flight-subscription", (req: Request, res: Response) => {
  res.json({ success: true, message: "Subscription active." });
});

export default router;
