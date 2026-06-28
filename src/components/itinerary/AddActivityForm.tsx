import React, { useState } from "react";
import { ItineraryItem } from "../../types";
import { translations } from "../../lib/translations";

interface AddActivityFormProps {
  activeDay: number;
  lang: "en" | "zh";
  onSubmit: (item: Omit<ItineraryItem, "id" | "votes" | "comments" | "coordinates" | "trafficStatus">) => void;
  onClose: () => void;
}

export default function AddActivityForm({
  activeDay,
  lang,
  onSubmit,
  onClose,
}: AddActivityFormProps) {
  const t = translations[lang];

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [time, setTime] = useState<string>("09:00");
  const [category, setCategory] = useState<ItineraryItem["category"]>("restaurant");
  const [cost, setCost] = useState<string>("35");

  const getLocalizedCategoryName = (cat: string) => {
    switch (cat) {
      case "restaurant":
        return t.restaurant;
      case "shop":
        return t.shop;
      case "sight":
        return t.landmark;
      case "transit":
        return t.transit;
      case "hotel":
        return t.hotel;
      default:
        return t.other;
    }
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const numCost = parseFloat(cost);
    if (!title || !locationName) return;

    onSubmit({
      dayIndex: activeDay,
      time,
      title,
      description,
      locationName,
      category,
      cost: isNaN(numCost) ? 0 : numCost,
    });

    // Reset fields
    setTitle("");
    setDescription("");
    setLocationName("");
    setCost("");
    onClose();
  };

  return (
    <form
      onSubmit={handleCreateActivity}
      className="mb-6 p-4 sm:p-6 md:p-8 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl md:rounded-3xl space-y-5 text-xs animate-fadeIn shadow-lg text-left"
    >
      <h4 className="font-bold text-slate-200 flex justify-between items-center border-b border-white/5 pb-2">
        <span>
          {t.configureActivityCard} — {t.day} {activeDay + 1} {lang === "zh" ? "天" : ""}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white font-semibold cursor-pointer"
        >
          {lang === "zh" ? "關閉" : "Close"}
        </button>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
        <div>
          <label className="block text-slate-300 font-medium mb-1">{t.activityTitle}</label>
          <input
            id="itinerary-title-input"
            type="text"
            required
            placeholder="e.g. Asakusa Tsukiji Sushi Roll Tasting"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">{t.placeName}</label>
          <input
            id="itinerary-location-input"
            type="text"
            required
            placeholder="e.g. Sukiyabashi Jiro Ginza"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-slate-300 font-medium mb-1">{t.timeSchedule}</label>
          <input
            id="itinerary-time-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">{t.categoryType}</label>
          <select
            id="itinerary-category-select"
            value={category}
            onChange={(e: any) => setCategory(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900"
          >
            <option value="sight" className="bg-slate-900">
              {getLocalizedCategoryName("sight")}
            </option>
            <option value="restaurant" className="bg-slate-900">
              {getLocalizedCategoryName("restaurant")}
            </option>
            <option value="shop" className="bg-slate-900">
              {getLocalizedCategoryName("shop")}
            </option>
            <option value="transit" className="bg-slate-900">
              {getLocalizedCategoryName("transit")}
            </option>
            <option value="hotel" className="bg-slate-900">
              {getLocalizedCategoryName("hotel")}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">{t.estimatedCost}</label>
          <input
            id="itinerary-cost-input"
            type="number"
            placeholder="e.g. 15.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-white"
          />
        </div>

        <div className="flex items-end">
          <button
            id="submit-itinerary-btn"
            type="submit"
            className="w-full py-2.5 glass-button-primary text-white font-semibold rounded-xl text-xs h-10"
          >
            {t.addScheduleCard}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-slate-300 font-medium mb-1">{t.briefDesc}</label>
        <textarea
          id="itinerary-desc-input"
          placeholder="Incorporate local traffic guidelines, ticket information..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full glass-input px-3 py-2 rounded-xl text-white h-14 resize-none"
        />
      </div>
    </form>
  );
}
