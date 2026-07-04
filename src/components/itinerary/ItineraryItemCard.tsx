import React, { useState } from "react";
import { Clock, MapPin, MessageSquare, ThumbsUp, Plus, Pencil, Utensils, ShoppingBag, Landmark, Route, Bed, ChevronLeft } from "lucide-react";
import { ItineraryItem, Participant } from "../../types";
import { translations } from "../../lib/translations";
import { getItineraryCategoryLabel } from "../../utils/categoryUtils";

interface ItineraryItemCardProps {
  key?: string | number;
  item: ItineraryItem;
  participants: Participant[];
  currentUser: string;
  isActive: boolean;
  lang: "en" | "zh";
  onVote: () => void;
  onComment: (itemId: string) => void;
  onDelete: () => void;
  onEdit: (item: ItineraryItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function ItineraryItemCard({
  item,
  participants,
  currentUser,
  isActive,
  lang,
  onVote,
  onComment,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: ItineraryItemCardProps): React.JSX.Element {
  const t = translations[lang];

  const STYLE_CONFIG = {
    colors: {
      cardBgActive: "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/5",
      cardBgInactive: "border-white/5 bg-white/3 hover:bg-white/6 hover:border-white/10 shadow-md",
    },
    transitions: "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  };

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(item.title);
  const [editDescription, setEditDescription] = useState<string>(item.description || "");
  const [editLocationName, setEditLocationName] = useState<string>(item.locationName || item.title);
  const [editTime, setEditTime] = useState<string>(item.time);
  const [editCategory, setEditCategory] = useState<ItineraryItem["category"]>(item.category);
  const [editCost, setEditCost] = useState<string>(item.cost.toString());

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "restaurant":
        return <Utensils size={14} className="text-emerald-400" />;
      case "shop":
        return <ShoppingBag size={14} className="text-pink-400" />;
      case "sight":
        return <Landmark size={14} className="text-amber-400" />;
      case "transit":
        return <Route size={14} className="text-purple-400" />;
      case "hotel":
        return <Bed size={14} className="text-blue-400" />;
      default:
        return <MapPin size={14} className="text-slate-400" />;
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "restaurant":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
      case "shop":
        return "bg-pink-500/15 text-pink-300 border-pink-500/20";
      case "sight":
        return "bg-amber-500/15 text-amber-300 border-amber-500/20";
      case "transit":
        return "bg-purple-500/15 text-purple-300 border-purple-500/20";
      case "hotel":
        return "bg-blue-500/15 text-blue-300 border-blue-500/20";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/20";
    }
  };

  const voterMetas = item.votes
    .map((uid) => participants.find((p) => p.id === uid))
    .filter(Boolean) as Participant[];
  const userVoted = item.votes.includes(currentUser);

  if (isEditing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEdit({
            ...item,
            title: editTitle,
            locationName: editLocationName || editTitle,
            description: editDescription,
            time: editTime,
            category: editCategory,
            cost: parseFloat(editCost) || 0,
          });
          setIsEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className="p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-blue-500/50 bg-blue-500/10 backdrop-blur-xl space-y-5 text-xs animate-fadeIn text-left shadow-lg w-full"
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="font-bold text-blue-400 flex items-center gap-1.5">
            <Plus size={14} className="rotate-45 text-blue-400" />
            <span>{lang === "zh" ? "編輯行程項目細節" : "Edit Itinerary Activity"}</span>
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-slate-400 hover:text-white font-semibold cursor-pointer"
          >
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.activityTitle}</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.placeName}</label>
            <input
              type="text"
              required
              value={editLocationName}
              onChange={(e) => setEditLocationName(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.timeSchedule}</label>
            <input
              type="time"
              required
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white font-mono bg-slate-900 border border-white/10"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.categoryType}</label>
            <select
              value={editCategory}
              onChange={(e: any) => setEditCategory(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
            >
              <option value="sight">{getItineraryCategoryLabel("sight", lang)}</option>
              <option value="restaurant">{getItineraryCategoryLabel("restaurant", lang)}</option>
              <option value="shop">{getItineraryCategoryLabel("shop", lang)}</option>
              <option value="transit">{getItineraryCategoryLabel("transit", lang)}</option>
              <option value="hotel">{getItineraryCategoryLabel("hotel", lang)}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.estimatedCost}</label>
            <input
              type="number"
              value={editCost}
              onChange={(e) => setEditCost(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-white bg-slate-900 border border-white/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">{t.briefDesc}</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full glass-input px-3 py-2 rounded-xl text-white h-14 resize-none bg-slate-900 border border-white/10"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition cursor-pointer text-[11px] font-semibold text-slate-300"
          >
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-[11px] font-semibold text-white cursor-pointer"
          >
            {lang === "zh" ? "儲存修改" : "Save Changes"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative z-10 text-left pl-8 md:pl-16">
      {/* Decorative Timeline Node Axis Point */}
      <div
        className={`absolute left-[11px] md:left-[29px] top-8 w-3.5 h-3.5 rounded-full border-4 ${
          isActive ? "bg-blue-500 border-blue-500/30" : "bg-slate-900 border-white/20"
        } shadow-md z-20 ${STYLE_CONFIG.transitions}`}
      />

      {/* The Activity Card */}
      <div
        id={`itinerary-card-${item.id}`}
        onClick={() => onComment(item.id)}
        className={`p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border ${
          STYLE_CONFIG.transitions
        } cursor-pointer flex flex-col justify-between h-full min-h-[160px] ${
          isActive ? STYLE_CONFIG.colors.cardBgActive : STYLE_CONFIG.colors.cardBgInactive
        }`}
      >
        <div className="space-y-4">
          {/* Header: Category and Reorder buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
            <span
              className={`text-[10px] font-extrabold border rounded-lg px-2 py-0.5 uppercase tracking-wider flex items-center gap-1.5 ${getCategoryBadgeColor(
                item.category
              )}`}
            >
              {getCategoryIcon(item.category)}
              <span>{getItineraryCategoryLabel(item.category, lang)}</span>
            </span>

            {/* Drag / Reorder Operations Panel */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {/* Grip Decorative Drag Indicator */}
              <div
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-grab active:cursor-grabbing p-1 h-9 w-9 flex items-center justify-center shrink-0"
                title={lang === "zh" ? "拖曳排序佔位" : "Drag Handle"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-500"
                >
                  <circle cx="9" cy="5" r="1" />
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="9" cy="19" r="1" />
                  <circle cx="15" cy="5" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <circle cx="15" cy="19" r="1" />
                </svg>
              </div>

              {/* Move Up Button */}
              <button
                type="button"
                disabled={isFirst}
                onClick={onMoveUp}
                className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all border ${
                  isFirst
                    ? "text-slate-600 border-transparent cursor-not-allowed opacity-30"
                    : "text-blue-400 border-white/5 hover:bg-white/5 hover:border-white/10 cursor-pointer"
                }`}
                title={lang === "zh" ? "往上移動" : "Move Up"}
              >
                <ChevronLeft size={16} className="rotate-90 shrink-0" />
              </button>

              {/* Move Down Button */}
              <button
                type="button"
                disabled={isLast}
                onClick={onMoveDown}
                className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all border ${
                  isLast
                    ? "text-slate-600 border-transparent cursor-not-allowed opacity-30"
                    : "text-blue-400 border-white/5 hover:bg-white/5 hover:border-white/10 cursor-pointer"
                }`}
                title={lang === "zh" ? "往下移動" : "Move Down"}
              >
                <ChevronLeft size={16} className="-rotate-90 shrink-0" />
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="space-y-3">
            {/* Time & Title Row */}
            <div className="flex items-start gap-3 w-full min-w-0">
              <div className="flex flex-col items-center justify-center bg-white/5 px-2.5 py-2 rounded-xl border border-white/5 text-slate-200 font-mono text-[11px] font-bold leading-none select-none shrink-0">
                <Clock size={11} className="text-blue-400 mb-1" />
                <span>{item.time}</span>
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="font-extrabold text-white text-base tracking-tight leading-tight truncate">
                  {item.title}
                </h4>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MapPin size={11} className="text-blue-400 shrink-0" />
                  <span className="text-slate-300 font-medium truncate">{item.locationName}</span>
                </span>
              </div>
            </div>

            {/* Description (expanded height, no cutoff) */}
            <p className="text-slate-300 text-xs leading-relaxed break-words whitespace-pre-wrap">
              {item.description}
            </p>

            {/* Badges line */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {item.cost > 0 && (
                <span className="font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                  ${item.cost}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Comments, votes & actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5 mt-4">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Vote (FAT FINGER COMPLIANT: 44px height on mobile) */}
            <button
              id={`vote-activity-${item.id}`}
              onClick={() => onVote()}
              className={`px-3 h-9 rounded-xl transition-all border cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
                userVoted
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/20"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
              }`}
              title={lang === "zh" ? "投下一票" : "Vote this activity"}
            >
              <ThumbsUp size={11} className="shrink-0" />
              <span>{item.votes.length}</span>
            </button>

            {/* Comments button indicator tooltip */}
            <div className="px-3 h-9 bg-white/3 text-slate-300 border border-white/5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-[11px] leading-none select-none">
              <MessageSquare size={11} className="text-slate-400 shrink-0" />
              <span>{item.comments.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Edit Activity Button (FAT FINGER COMPLIANT: 44px) */}
            <button
              id={`edit-activity-${item.id}`}
              onClick={() => {
                setIsEditing(true);
                setEditTitle(item.title);
                setEditDescription(item.description || "");
                setEditLocationName(item.locationName || item.title);
                setEditTime(item.time);
                setEditCategory(item.category);
                setEditCost(item.cost.toString());
              }}
              className="p-2 h-9 w-9 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/10 hover:border-blue-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={lang === "zh" ? "編輯行程" : "Edit activity"}
            >
              <Pencil size={11} className="shrink-0" />
            </button>

            {/* Delete Activity Button (FAT FINGER COMPLIANT: 44px) */}
            <button
              id={`delete-activity-${item.id}`}
              onClick={() => onDelete()}
              className="p-2 h-9 w-9 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={lang === "zh" ? "刪除行程" : "Delete activity"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Voter Avatars list inside card footer */}
        {voterMetas.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden pt-2 border-t border-white/5 mt-2">
            {voterMetas.slice(0, 4).map((voter) => (
              <div
                key={voter.id}
                style={{ backgroundColor: voter.avatarColor }}
                className="w-[18px] h-[18px] rounded-full border border-slate-900 text-[8px] font-bold text-white flex items-center justify-center shadow-xs"
                title={voter.name}
              >
                {voter.name[0]}
              </div>
            ))}
            {voterMetas.length > 4 && (
              <div className="w-[18px] h-[18px] rounded-full bg-slate-800 border border-slate-900 text-[8px] text-slate-400 flex items-center justify-center font-bold">
                +{voterMetas.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
