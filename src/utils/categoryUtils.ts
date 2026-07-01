import { ItineraryItem } from "../types";

export type ExpenseCategory =
  | "flight"
  | "lodging"
  | "food"
  | "activities"
  | "transit"
  | "shopping"
  | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "flight",
  "lodging",
  "food",
  "activities",
  "transit",
  "shopping",
  "other",
];

export function getCategoryLabel(cat: string, lang: "en" | "zh"): string {
  switch (cat) {
    case "flight":
      return lang === "zh" ? "機票航空" : "Flight";
    case "lodging":
      return lang === "zh" ? "旅宿飯店" : "Lodging";
    case "food":
      return lang === "zh" ? "餐飲美食" : "Food";
    case "activities":
      return lang === "zh" ? "景點行程" : "Activity";
    case "transit":
      return lang === "zh" ? "本地交通" : "Transit";
    case "shopping":
      return lang === "zh" ? "本地商鋪" : "Shopping";
    default:
      return lang === "zh" ? "其他雜支" : "Other";
  }
}

export function getCategoryBadgeClasses(cat: string): string {
  switch (cat) {
    case "flight":
      return "bg-blue-500/15 text-blue-300 border-blue-500/20";
    case "lodging":
      return "bg-purple-500/15 text-purple-300 border-purple-500/20";
    case "food":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    case "activities":
      return "bg-pink-500/15 text-pink-300 border-pink-500/20";
    case "transit":
      return "bg-sky-500/15 text-sky-300 border-sky-500/20";
    case "shopping":
      return "bg-amber-500/15 text-amber-300 border-amber-500/20";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/20";
  }
}

export function getCategoryDotColor(cat: string): string {
  switch (cat) {
    case "flight":
      return "bg-blue-500";
    case "lodging":
      return "bg-indigo-500";
    case "food":
      return "bg-emerald-500";
    case "activities":
      return "bg-amber-500";
    case "transit":
      return "bg-purple-500";
    case "shopping":
      return "bg-pink-500";
    default:
      return "bg-slate-500";
  }
}

export function mapEditCategoryToItemCategory(editCat: "food" | "sight" | "hotel"): ItineraryItem["category"] {
  switch (editCat) {
    case "food":
      return "restaurant";
    case "sight":
      return "sight";
    case "hotel":
      return "hotel";
    default:
      return "other";
  }
}

