import React, { useState } from "react";
import { AutocompleteInput } from "./common/AutocompleteInput";
import { POPULAR_HOT_PLACES } from "../lib/constants";

interface CreateTripModalProps {
  lang: "en" | "zh";
  newTripName: string;
  setNewTripName: (name: string) => void;
  newTripDestination: string;
  setNewTripDestination: (dest: string) => void;
  newTripBudget: string;
  setNewTripBudget: (budget: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isCreating?: boolean;
  error?: string | null;
}



export default function CreateTripModal({
  lang,
  newTripName,
  setNewTripName,
  newTripDestination,
  setNewTripDestination,
  newTripBudget,
  setNewTripBudget,
  onSubmit,
  onClose,
  isCreating = false,
  error = null,
}: CreateTripModalProps) {
  const filteredSuggestions = POPULAR_HOT_PLACES.filter(place => {
    if (!newTripDestination) return true; // Show all when focused on empty input
    const search = newTripDestination.toLowerCase();
    return (
      place.zh.toLowerCase().includes(search) || 
      place.en.toLowerCase().includes(search) ||
      place.countryZh.toLowerCase().includes(search) ||
      place.countryEn.toLowerCase().includes(search)
    );
  });

  return (
    <div 
      onClick={(e) => {
        if (!isCreating && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[150] animate-fadeIn"
    >
      <form 
        onSubmit={onSubmit}
        className="glass-container w-full max-w-md rounded-2xl p-6 border border-white/20 shadow-2xl relative space-y-4"
      >
        <h3 className="font-extrabold text-white text-sm border-b border-white/5 pb-2 font-sans">
          📂 {lang === "zh" ? "新增旅行團隊協作空間" : "Launch Collaborative Trip Workspace"}
        </h3>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-xs font-sans leading-relaxed">
            ⚠️ {error}
          </div>
        )}
        
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-350 font-bold mb-1 font-sans">
              {lang === "zh" ? "旅行主題名稱 *" : "Trip / Project Name *"}
            </label>
            <input
              type="text"
              required
              disabled={isCreating}
              placeholder="e.g. 2026 暑假關西美食之旅 / Autumn Kyoto Scenic Run"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-sans text-xs disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-350 font-bold mb-1 font-sans">
              {lang === "zh" ? "出發目的地站點 *" : "Destination Station / City *"}
            </label>
            <AutocompleteInput
              value={newTripDestination}
              onChange={setNewTripDestination}
              onSelect={(place) => setNewTripDestination(lang === "zh" ? place.zh : place.en)}
              suggestions={filteredSuggestions}
              disabled={isCreating}
              required
              placeholder="e.g. Kyoto / Osaka / HND Tokyo"
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-sans text-xs disabled:opacity-50"
              renderSuggestion={(place) => (
                <div className="w-full text-left px-3.5 py-2 hover:bg-white/10 text-white font-semibold flex justify-between items-center transition-colors text-xs">
                  <span>{lang === "zh" ? `${place.zh} (${place.countryZh})` : `${place.en} (${place.countryEn})`}</span>
                  <span className="text-[10px] text-slate-400 font-mono italic">
                    {lang === "zh" ? place.en : place.zh}
                  </span>
                </div>
              )}
            />
          </div>

          <div>
            <label className="block text-slate-350 font-bold mb-1 font-sans">
              {lang === "zh" ? "預算預留上限" : "Total Budget Reserved"}
            </label>
            <input
              type="number"
              disabled={isCreating}
              placeholder="e.g. 4500"
              value={newTripBudget}
              onChange={(e) => setNewTripBudget(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-mono text-xs disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-3 text-xs font-sans">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl font-bold cursor-pointer disabled:opacity-40"
          >
            {lang === "zh" ? "返回" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition shadow shadow-blue-600/20 flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {isCreating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0 animate-duration-1000" />
                <span>{lang === "zh" ? "創立中..." : "Creating..."}</span>
              </>
            ) : (
              <span>{lang === "zh" ? "創立專案" : "Create Project"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
