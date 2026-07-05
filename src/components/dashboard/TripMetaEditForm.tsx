import React, { useState } from "react";
import { POPULAR_HOT_PLACES } from "../../lib/constants";
import { Trip } from "../../types";
import { AutocompleteInput } from "../common/AutocompleteInput";

interface TripMetaEditFormProps {
  trip: Trip;
  lang: "zh" | "en";
  onSave: (updatedData: { name: string; destination: string; totalBudget: number; status?: "active" | "inactive" }) => Promise<void>;
  onCancel: () => void;
}

export function TripMetaEditForm({ trip, lang, onSave, onCancel }: TripMetaEditFormProps) {
  const [editName, setEditName] = useState(trip?.name || "");
  const [editDestination, setEditDestination] = useState(trip?.destination || "Tokyo");
  const [editBudget, setEditBudget] = useState(trip?.totalBudget || 3000);
  const [editStatus, setEditStatus] = useState<"active" | "inactive">(trip?.status || "active");

  const filteredEditSuggestions = POPULAR_HOT_PLACES.filter(place => {
    if (!editDestination) return true;
    const search = editDestination.toLowerCase();
    return (
      place.zh.toLowerCase().includes(search) || 
      place.en.toLowerCase().includes(search) ||
      place.countryZh.toLowerCase().includes(search) ||
      place.countryEn.toLowerCase().includes(search)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: editName.trim(),
      destination: editDestination.trim(),
      totalBudget: Number(editBudget) || 3000,
      status: editStatus
    });
  };

  return (
    <form id="trip-meta-edit-form" onSubmit={handleSubmit} className="space-y-3 pt-1 w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
            {lang === "zh" ? "專案名稱" : "Project Name"}
          </span>
          <input
            id="edit-project-name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
            {lang === "zh" ? "目的地 (可任意輸入任何地方)" : "Destination (Any Location)"}
          </span>
          <AutocompleteInput
            id="edit-project-destination"
            value={editDestination}
            onChange={setEditDestination}
            onSelect={(place) => setEditDestination(lang === "zh" ? place.zh : place.en)}
            suggestions={filteredEditSuggestions}
            required
            placeholder="e.g. 宜蘭, 沖繩, 巴黎"
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
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
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
            {lang === "zh" ? "經費預算 ($)" : "Budget ($)"}
          </span>
          <input
            id="edit-project-budget"
            type="number"
            value={editBudget}
            onChange={(e) => setEditBudget(Number(e.target.value) || 0)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            required
          />
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
            {lang === "zh" ? "專案狀態" : "Project Status"}
          </span>
          <select
            id="edit-project-status"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
          >
            <option value="active">{lang === "zh" ? "Active (啟用中)" : "Active"}</option>
            <option value="inactive">{lang === "zh" ? "Inactive (已停用 / 歸檔)" : "Inactive"}</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          id="btn-save-meta"
          type="submit" 
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10.5px] font-extrabold transition uppercase tracking-wide cursor-pointer"
        >
          {lang === "zh" ? "儲存變更" : "Save Changes"}
        </button>
        <button 
          id="btn-cancel-meta"
          type="button" 
          onClick={onCancel} 
          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[10.5px] font-extrabold transition cursor-pointer"
        >
          {lang === "zh" ? "取消" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
