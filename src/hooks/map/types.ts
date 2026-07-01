import { ItineraryItem } from "../../types";

export interface MapTarget {
  id?: string;
  name: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  type: string;
  traffic: "smooth" | "moderate" | "congested";
  isCustom?: boolean;
  isItinerary?: boolean;
  originalItem?: ItineraryItem;
  dayIndex?: number;
}
