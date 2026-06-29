import React, { useState, useRef } from "react";
import { FileText, Upload, Camera, Image, X, Sparkles, Zap, Users, Percent, ShoppingBag } from "lucide-react";
import { ExpenseItem, Participant } from "../../types";
import { translations } from "../../lib/translations";

interface ExpenseFormProps {
  participants: Participant[];
  activeUserId: string;
  lang: "en" | "zh";
  onSubmit: (expense: Omit<ExpenseItem, "id">) => void;
  onClose: () => void;
}

export default function ExpenseForm({
  participants,
  activeUserId,
  lang,
  onSubmit,
  onClose,
}: ExpenseFormProps) {
  const t = translations[lang];

  // Form states
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>(activeUserId || participants[0]?.id || "");
  const [splitAmong, setSplitAmong] = useState<string[]>(participants.map((p) => p.id));
  const [category, setCategory] = useState<ExpenseItem["category"]>("food");
  const [ocrInput, setOcrInput] = useState<string>("");
  const [ocrParsing, setOcrParsing] = useState<boolean>(false);
  const [receiptImage, setReceiptImage] = useState<string>("");
  const [splitType, setSplitType] = useState<"equal" | "individual">("equal");
  const [individualAmounts, setIndividualAmounts] = useState<Record<string, string>>({});
  const [taxRefundPercent, setTaxRefundPercent] = useState<string>("");
  const [taxRefundTotalAmount, setTaxRefundTotalAmount] = useState<string>("");

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleToggleSplit = (uid: string) => {
    if (splitAmong.includes(uid)) {
      if (splitAmong.length > 1) {
        setSplitAmong(splitAmong.filter((id) => id !== uid));
      }
    } else {
      setSplitAmong([...splitAmong, uid]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptOcrSubmit = async () => {
    if (!ocrInput.trim() && !receiptImage) return;
    setOcrParsing(true);
    try {
      const res = await fetch("/api/ai/ocr-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptText: ocrInput,
          receiptImage: receiptImage || undefined,
        }),
      });
      const data = await res.json();
      if (data && data.amount != null) {
        setDescription(data.description || "OCR Receipt Expense");
        setAmount(data.amount.toString());
        setCategory(data.category || "food");
        setOcrInput("");
        setReceiptImage("");
      }
    } catch (err) {
      console.error("Receipt OCR failed:", err);
    } finally {
      setOcrParsing(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    let numAmt = parseFloat(amount) || 0;
    const finalIndividualAmounts: Record<string, number> = {};

    if (splitType === "individual") {
      let sum = 0;
      splitAmong.forEach((id) => {
        const val = parseFloat(individualAmounts[id]) || 0;
        finalIndividualAmounts[id] = val;
        sum += val;
      });
      numAmt = sum;
    }

    if (!description || numAmt <= 0) {
      return;
    }

    onSubmit({
      amount: numAmt,
      description,
      paidById: paidBy,
      splitAmongIds: splitAmong,
      category,
      date: new Date().toISOString().split("T")[0],
      splitType,
      individualAmounts: splitType === "individual" ? finalIndividualAmounts : undefined,
      taxRefundPercent: taxRefundPercent ? parseFloat(taxRefundPercent) : undefined,
      taxRefundTotalAmount: taxRefundTotalAmount ? parseFloat(taxRefundTotalAmount) : undefined,
    });

    setDescription("");
    setAmount("");
    setIndividualAmounts({});
    setTaxRefundPercent("");
    setTaxRefundTotalAmount("");
    setSplitType("equal");
    onClose();
  };

  const getLocalizedCategoryName = (cat: string) => {
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
  };

  const rawTotalVal =
    splitType === "equal"
      ? parseFloat(amount) || 0
      : splitAmong.reduce((acc, id) => acc + (parseFloat(individualAmounts[id]) || 0), 0);

  let refundVal = 0;
  if (taxRefundTotalAmount) {
    refundVal = parseFloat(taxRefundTotalAmount) || 0;
  } else if (taxRefundPercent) {
    // VAT-exclusive Tax-Free Refund: use the total after tax-refund (pre-tax amount B) as the base:
    // B = rawTotalVal / (1 + percent / 100)
    // Refund = rawTotalVal - B
    const pct = parseFloat(taxRefundPercent) || 0;
    const postRefundTotal = rawTotalVal / (1 + pct / 100);
    refundVal = rawTotalVal - postRefundTotal;
  }

  const finalPriceVal = Math.max(0, rawTotalVal - refundVal);
  const ratioVal = rawTotalVal > 0 ? finalPriceVal / rawTotalVal : 0;

  return (
    <form
      onSubmit={handleSubmitForm}
      className="bg-slate-900/80 border border-white/10 p-5 md:p-6 rounded-2xl space-y-6 text-sm animate-fade-in-scale mb-6"
    >
      <h4 className="font-semibold text-white text-[15px] flex items-center justify-between border-b border-white/5 pb-3 text-left">
        <span>{t.inputSharedExpense}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white font-medium cursor-pointer"
        >
          {lang === "zh" ? "取消" : "Cancel"}
        </button>
      </h4>

      {/* AI Receipt Scanner OCR Panel */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-3 text-sm text-left select-none animate-fadeIn flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[12px]">
            <FileText size={13} className="text-emerald-400 shrink-0" />
            <span>{lang === "zh" ? "AI 智慧實體收據辨識 (OCR)" : "AI Smart Receipt OCR Scanner"}</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Powered by Gemini</span>
        </div>
        <p className="text-[12px] text-slate-400 leading-relaxed">
          {lang === "zh"
            ? "在國外拿到實體紙本發票時，可選擇相片上傳、即時拍照，或直接貼上/輸入明細，AI 將自動辨識總金額、品項、消費類別，快速完成記帳！"
            : "When you get physical receipts, upload a photo, take a real-time picture, or paste text. AI will auto-extract total amount, currency, and category!"}
        </p>

        {/* Hidden input elements for camera capture and file selection */}
        <input
          type="file"
          accept="image/*"
          ref={uploadInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Image upload triggers and preview status */}
        <div className="flex flex-wrap items-center gap-2 mt-0.5 pb-0.5">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg text-[11.5px] cursor-pointer transition-colors h-10 md:h-8"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{lang === "zh" ? "選擇收據相片" : "Select Receipt"}</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg text-[11.5px] cursor-pointer transition-colors h-10 md:h-8"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>{lang === "zh" ? "手機即時拍照" : "Take Photo"}</span>
          </button>

          {receiptImage && (
            <div className="relative group flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg animate-fadeIn">
              <Image className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium truncate max-w-[120px]">
                {lang === "zh" ? "已載入發票圖片" : "Loaded Image"}
              </span>
              <button
                type="button"
                onClick={() => setReceiptImage("")}
                className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                title={lang === "zh" ? "移除圖片" : "Remove Image"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Image Thumbnail Preview */}
        {receiptImage && (
          <div className="mt-1 relative w-24 h-24 rounded-lg overflow-hidden border border-emerald-500/30 group animate-fadeIn shadow-lg shadow-black/30">
            <img src={receiptImage} alt="Receipt Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setReceiptImage("")}
              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded-full text-white cursor-pointer transition-colors shadow-md"
              title={lang === "zh" ? "移除圖片" : "Remove Image"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
          <input
            type="text"
            placeholder={
              lang === "zh" ? "手動貼上收據文字/備註（選填）..." : "Manual receipt text/memo (optional)..."
            }
            value={ocrInput}
            onChange={(e) => setOcrInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-500"
          />

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleReceiptOcrSubmit}
              disabled={ocrParsing || (!ocrInput.trim() && !receiptImage)}
              className="h-11 sm:h-auto px-4 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/15 text-white font-semibold rounded-xl text-[11.5px] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              {ocrParsing ? (
                <>
                  <Sparkles size={13} className="animate-spin text-white shrink-0" />
                  <span>{lang === "zh" ? "辨識中..." : "Extracting..."}</span>
                </>
              ) : (
                <>
                  <Zap size={13} className="text-amber-400 shrink-0" />
                  <span>{lang === "zh" ? "智慧一鍵辨識" : "Scan Receipt"}</span>
                </>
              )}
            </button>

            {/* Presets dropdown to easily mock receipt uploads! */}
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val === "izakaya") {
                  setOcrInput(
                    "居酒屋 志ん宿 (Shinjuku Izakaya Bill)\n生ビール x4: JPY 2,200\n刺身盛り合わせ x1: JPY 3,500\n串焼き 12本: JPY 2,400\n消費税 10%\nTOTAL AMOUNT: JPY 8,650"
                  );
                } else if (val === "train") {
                  setOcrInput(
                    "JR東日本 東海道新幹線 (Tokaido Shinkansen Ticket)\n東京 -> 京都 (Tokyo to Kyoto Adult Regular)\n席位: 指定席 Car 4 Row 12-A\nFARE PRICE: JPY 14,500"
                  );
                } else if (val === "starbucks") {
                  setOcrInput(
                    "STARBUCKS COFFEE SHIBUYA TSUTAYA\n1x Caramel Macchiato: JPY 650\n1x Matcha Frappuccino: JPY 600\nSUBTOTAL: JPY 1,250\nTAX 8%: JPY 100\nTOTAL JPY 1,250"
                  );
                }
              }}
              className="bg-slate-950 border border-white/10 hover:border-white/25 rounded-xl px-2.5 text-[11px] text-slate-400 cursor-pointer outline-none shrink-0"
            >
              <option value="">📋 {lang === "zh" ? "載入真實收據範例" : "Load Receipt Template"}</option>
              <option value="izakaya">
                {" "}
                🍣 {lang === "zh" ? "新宿居酒屋細目 (8,650日圓)" : "Shinjuku Izakaya (8,650 JPY)"}
              </option>
              <option value="train">
                {" "}
                🚄 {lang === "zh" ? "新幹線單程票 (14,500日圓)" : "Shinkansen fare (14,500 JPY)"}
              </option>
              <option value="starbucks">
                {" "}
                ☕ {lang === "zh" ? "澀谷星巴克咖啡 (1,250日圓)" : "Starbucks Coffee (1,250 JPY)"}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(2,minmax(0,1fr))] gap-5 text-left">
        <div>
          <label className="block text-slate-300 font-medium mb-1.5">{t.expenseDesc}</label>
          <input
            id="expense-desc-input"
            type="text"
            required
            placeholder="e.g., Shinjuku Ramen Lunch"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1.5">
            {lang === "zh" ? "拆分方式" : "Split Method"}
          </label>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setSplitType("equal")}
              className={`flex-1 rounded-xl border text-[13px] md:text-xs font-semibold transition-all h-12 md:h-10 flex items-center justify-center cursor-pointer ${
                splitType === "equal"
                  ? "bg-blue-600/20 border-blue-500 text-blue-300"
                  : "bg-slate-955 border-white/5 hover:border-white/20 text-slate-400 bg-slate-950"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                <span>{lang === "zh" ? "人頭等額平分" : "Equal Split"}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSplitType("individual")}
              className={`flex-1 rounded-xl border text-[13px] md:text-xs font-semibold transition-all h-12 md:h-10 flex items-center justify-center cursor-pointer ${
                splitType === "individual"
                  ? "bg-blue-600/20 border-blue-500 text-blue-300"
                  : "bg-slate-955 border-white/5 hover:border-white/20 text-slate-400 bg-slate-950"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Percent size={14} />
                <span>{lang === "zh" ? "單人付全額 (依個人明細拆分)" : "Payer Pays All (Split by custom shares)"}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Amount or Individual Entry depending on Split Type */}
      {splitType === "equal" ? (
        <div className="text-left">
          <label className="block text-slate-300 font-medium mb-1.5">{t.costAmount}</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 font-semibold">
              $
            </span>
            <input
              id="expense-amount-input"
              type="number"
              step="0.01"
              required={splitType === "equal"}
              placeholder="e.g., 45.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 pl-8 pr-3.5 py-2.5 rounded-xl text-white font-mono outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5 space-y-3 overflow-hidden text-left">
          <div className="font-semibold text-slate-300 border-b border-white/5 pb-2 mb-3">
            {lang === "zh" ? "請輸入各成員在此筆消費中的金額（由付款人先支付全額）" : "Input each member's specific share (Payer paid the full sum on behalf of everyone):"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,1fr))] gap-3 text-sm overflow-hidden">
            {participants.map((p) => {
              const isSelected = splitAmong.includes(p.id);
              if (!isSelected) {
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 justify-between border-b border-white/5 pb-2.5 opacity-35"
                  >
                    <span className="text-slate-500 truncate">
                      {p.name} ({lang === "zh" ? "未參與分攤" : "Not sharing"})
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 justify-between border-b border-white/5 pb-2.5"
                >
                  <span className="text-slate-300 flex items-center gap-2 truncate">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.avatarColor }} />
                    {p.name}
                  </span>
                  <div className="relative w-32 shrink-0 min-w-0">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-mono font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={individualAmounts[p.id] || ""}
                      onChange={(e) => {
                        setIndividualAmounts({
                          ...individualAmounts,
                          [p.id]: e.target.value,
                        });
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-white font-mono text-xs outline-none focus:border-slate-500 min-w-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[repeat(3,minmax(0,1fr))] gap-5 text-left">
        <div>
          <label className="block text-slate-300 font-medium mb-1.5">{t.paidBy}</label>
          <select
            id="expense-payer-select"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white bg-slate-900 outline-none focus:border-blue-500 cursor-pointer"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1.5">{t.category}</label>
          <select
            id="expense-category-select"
            value={category}
            onChange={(e: any) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white bg-slate-900 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="food" className="bg-slate-900">
              {getLocalizedCategoryName("food")}
            </option>
            <option value="activities" className="bg-slate-900">
              {getLocalizedCategoryName("activities")}
            </option>
            <option value="lodging" className="bg-slate-900">
              {getLocalizedCategoryName("lodging")}
            </option>
            <option value="transit" className="bg-slate-900">
              {getLocalizedCategoryName("transit")}
            </option>
            <option value="flight" className="bg-slate-900">
              {getLocalizedCategoryName("flight")}
            </option>
            <option value="shopping" className="bg-slate-900">
              {getLocalizedCategoryName("shopping")}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1.5">{t.splitRatioControl}</label>
          <div className="p-2.5 border border-white/5 bg-white/5 rounded-xl flex items-center justify-between h-[45px] md:h-[42px]">
            <span className="text-xs text-slate-400">
              {t.splittingWith} ({splitAmong.length})
            </span>
            <div className="flex gap-2 font-sans">
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleToggleSplit(p.id)}
                  style={{ backgroundColor: splitAmong.includes(p.id) ? p.avatarColor : "transparent" }}
                  className={`w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-pointer transition-all border ${
                    !splitAmong.includes(p.id)
                      ? "text-slate-500 border-white/10 hover:border-white/30"
                      : "border-white/20"
                  }`}
                  title={p.name}
                >
                  {p.name[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tax Refund & Discount input area */}
      <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-3 text-left">
        <div className="font-bold text-slate-300 flex items-center gap-1.5">
          <ShoppingBag size={14} className="text-slate-300" />
          <span>{lang === "zh" ? "免稅退稅 & 折扣比例調整 (可填單項或不填)" : "Tax Refund & Discount Adjustment (Optional)"}</span>
          <span className="bg-amber-500/10 text-amber-400 text-xs px-1.5 py-0.5 rounded border border-amber-500/10 font-mono">
            {lang === "zh" ? "後續自動等比扣減" : "Proportional adjustment"}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-normal">
          {lang === "zh"
            ? "系統已套用專業演算法：以「退稅後費用總額」為基數計算退稅百分比，精準回推各成員對應之應付額。收據往往只有一個退稅總額，在此輸入後，系統會自動在各個成員的自付款項中，按原始金額比例分減扣除，計算出極致精準的實際付款額！"
            : "The system utilizes advanced tax algorithm: Refund % is calculated using the post-refund actual cost as the base, precisely back-calculating individual shares. The ledger automatically distributes deductions according to individual raw ratios for precise splits!"}
        </p>

        {/* Country presets dropdown */}
        <div className="text-xs">
          <label className="block text-slate-400 mb-1">
            {lang === "zh" ? "⚡ 快速套用目的地國家退稅比例" : "⚡ Quick Country Tax Preset"}
          </label>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                setTaxRefundPercent(val);
                setTaxRefundTotalAmount("");
              } else {
                setTaxRefundPercent("");
              }
            }}
            value={taxRefundPercent}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white bg-slate-900 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">{lang === "zh" ? "-- 請選擇國家套用比例 (或手動於下方填寫) --" : "-- Choose country to auto-fill --"}</option>
            <option value="10">🇯🇵 {lang === "zh" ? "日本 (10% 消費稅免稅)" : "Japan (10% Tax Refund)"}</option>
            <option value="5">🇹🇼 {lang === "zh" ? "台灣 (5% 營業稅退稅)" : "Taiwan (5% Tax Refund)"}</option>
            <option value="10">🇰🇷 {lang === "zh" ? "韓國 (10% 附加稅退稅)" : "South Korea (10% Tax Refund)"}</option>
            <option value="8">🇸🇬 {lang === "zh" ? "新加坡 (8% 消費稅/GST退稅)" : "Singapore (8% GST Refund)"}</option>
            <option value="7">🇹🇭 {lang === "zh" ? "泰國 (7% 增值稅退稅)" : "Thailand (7% VAT Refund)"}</option>
            <option value="12">🇪🇺 {lang === "zh" ? "歐洲標準/歐盟 (平均約 12% 增值稅退稅)" : "Europe/EU (Avg. ~12% Tax Refund)"}</option>
          </select>
        </div>

        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">
              {lang === "zh" ? "折減退稅金額 $" : "Deduction/Refund ($ Amount)"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 15.00"
                value={taxRefundTotalAmount}
                disabled={!!taxRefundPercent}
                onChange={(e) => setTaxRefundTotalAmount(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-white font-mono outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">
              {lang === "zh" ? "或是退稅比例 %" : "Or Refund Percent (%)"}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 10"
                value={taxRefundPercent}
                disabled={!!taxRefundTotalAmount}
                onChange={(e) => setTaxRefundPercent(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-3 pr-6 py-1.5 text-white font-mono outline-none focus:border-amber-500"
              />
              <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-500">%</span>
            </div>
          </div>
        </div>

        {/* Dynamically calculated share preview box */}
        {rawTotalVal > 0 && (
          <div className="bg-slate-950 border border-white/5 rounded-lg p-3 space-y-2 mt-2 overflow-hidden">
            <div className="font-bold text-blue-300 border-b border-white/5 pb-1 text-xs flex items-center justify-between">
              <span>{lang === "zh" ? "即時試算分攤預覽" : "Live Share Preview"}</span>
              <span className="font-mono text-slate-400 text-xs">
                {lang === "zh"
                  ? `退稅比例: ${(ratioVal * 100).toFixed(1)}% 實付`
                  : `Refund ratio: ${(ratioVal * 100).toFixed(1)}% act`}
              </span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{lang === "zh" ? "原始原價總金額：" : "Raw total sum:"}</span>
                <span>${rawTotalVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>{lang === "zh" ? "免稅/退稅/折扣額：" : "Refund reduction:"}</span>
                <span>-${refundVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold border-b border-white/5 pb-1.5 mb-1.5">
                <span>{lang === "zh" ? "折實總付款額：" : "Actual total cost:"}</span>
                <span>${finalPriceVal.toFixed(2)}</span>
              </div>

              <div className="space-y-1 pt-1">
                {participants.map((p) => {
                  if (!splitAmong.includes(p.id)) return null;

                  let pRaw = 0;
                  if (splitType === "equal") {
                    pRaw = rawTotalVal / splitAmong.length;
                  } else {
                    pRaw = parseFloat(individualAmounts[p.id]) || 0;
                  }
                  const pFinal = pRaw * ratioVal;
                  const pSaved = pRaw - pFinal;

                  return (
                    <div key={p.id} className="flex justify-between text-slate-300 text-xs">
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.avatarColor }}
                        />
                        {p.name}:
                      </span>
                      <span className="shrink-0">
                        <span className="text-slate-500 font-normal">
                          ${pRaw.toFixed(2)} {lang === "zh" ? "原價" : "raw"}
                        </span>
                        <span className="text-slate-600 font-normal mx-1">→</span>
                        <span className="text-emerald-400 font-bold">${pFinal.toFixed(2)}</span>
                        {pSaved > 0 && (
                          <span className="text-amber-400 text-xs ml-1.5">
                            ({lang === "zh" ? `減$${pSaved.toFixed(1)}` : `-$${pSaved.toFixed(1)}`})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        id="submit-expense-btn"
        type="submit"
        className="w-full h-12 md:h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all cursor-pointer text-[13px] md:text-xs flex items-center justify-center shadow-md shadow-blue-500/10 active:scale-[0.98]"
      >
        {t.postSplitLedgerEntry}
      </button>
    </form>
  );
}
