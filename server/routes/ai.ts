import { Router } from "express";
import chatRouter from "./ai/chat";
import itineraryRouter from "./ai/itineraryAi";
import scheduleRouter from "./ai/schedule";
import ocrRouter from "./ai/ocr";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";

const router = Router();

router.use(aiRateLimiter);
router.use(chatRouter);
router.use(itineraryRouter);
router.use(scheduleRouter);
router.use(ocrRouter);

export default router;
