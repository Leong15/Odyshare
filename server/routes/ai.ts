import { Router } from "express";
import chatRouter from "./ai/chat";
import flightsRouter from "./ai/flights";
import itineraryRouter from "./ai/itinerary";
import scheduleRouter from "./ai/schedule";
import ocrRouter from "./ai/ocr";

const router = Router();

router.use(chatRouter);
router.use(flightsRouter);
router.use(itineraryRouter);
router.use(scheduleRouter);
router.use(ocrRouter);

export default router;
