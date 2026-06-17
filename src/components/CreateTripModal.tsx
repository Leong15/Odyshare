import React from "react";

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
}: CreateTripModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <form 
        onSubmit={onSubmit}
        className="glass-container w-full max-w-md rounded-2xl p-6 border border-white/20 shadow-2xl relative space-y-4"
      >
        <h3 className="font-extrabold text-white text-sm border-b border-white/5 pb-2 font-sans">
          📂 {lang === "zh" ? "新增旅行團隊協作空間" : "Launch Collaborative Trip Workspace"}
        </h3>
        
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-350 font-bold mb-1 font-sans">
              {lang === "zh" ? "旅行主題名稱 *" : "Trip / Project Name *"}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026 暑假關西美食之旅 / Autumn Kyoto Scenic Run"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-sans text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-350 font-bold mb-1 font-sans">
              {lang === "zh" ? "出發目的地站點 *" : "Destination Station / City *"}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kyoto / Osaka / HND Tokyo"
              value={newTripDestination}
              onChange={(e) => setNewTripDestination(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-sans text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-350 font-bold mb-1 font-sans">
              {lang === "zh" ? "預算預留上限 (USD)" : "Total Budget Reserved (USD)"}
            </label>
            <input
              type="number"
              placeholder="e.g. 4500"
              value={newTripBudget}
              onChange={(e) => setNewTripBudget(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-3 text-xs font-sans">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl font-bold cursor-pointer"
          >
            {lang === "zh" ? "返回" : "Cancel"}
          </button>
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition shadow shadow-blue-600/20"
          >
            {lang === "zh" ? "創立專案" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
