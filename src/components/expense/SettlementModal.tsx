import React, { useState } from "react";
import { X, Download, QrCode, CreditCard, Check, AlertCircle } from "lucide-react";
import { ExpenseItem, Participant } from "../../types";
import { getCategoryLabel, getCategoryDotColor } from "../../utils/categoryUtils";

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  participants: Participant[];
  transactions: Array<{ from: string; to: string; amount: number }>;
  balances: Record<string, number>;
  totalBudget: number;
  totalSpent: number;
  lang?: "en" | "zh";
}

export default function SettlementModal({
  isOpen,
  onClose,
  expenses,
  participants,
  transactions,
  balances,
  totalBudget,
  totalSpent,
  lang = "en",
}: SettlementModalProps) {
  if (!isOpen) return null;

  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || id;
  };

  // Group expenses by category for chart
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const categories = Object.entries(categoryTotals).map(([name, val]) => ({
    name,
    value: val,
    percent: totalSpent > 0 ? (val / totalSpent) * 100 : 0,
  }));

  // Helper to generate and download a plain text receipt file (.txt)
  const handleDownloadTxt = () => {
    let content = "";
    content += "==================================================\n";
    content += "            ODYSYNC TRAVEL SETTLEMENT             \n";
    content += "==================================================\n\n";
    content += `DATE: ${new Date().toLocaleDateString()}\n`;
    content += `RECEIPT NO: #${Math.floor(100000 + Math.random() * 900000)}\n\n`;
    content += "--------------------------------------------------\n";
    content += "FINANCIAL OVERVIEW\n";
    content += "--------------------------------------------------\n";
    content += `Total Spent:  $${totalSpent.toFixed(2)}\n`;
    content += `Trip Budget:  $${totalBudget.toFixed(2)}\n`;
    content += `Remaining:    $${(totalBudget - totalSpent).toFixed(2)}\n\n`;

    content += "--------------------------------------------------\n";
    content += "CATEGORY DISTRIBUTION\n";
    content += "--------------------------------------------------\n";
    categories.forEach(c => {
      content += `${c.name.toUpperCase()}: $${c.value.toFixed(2)} (${c.percent.toFixed(1)}%)\n`;
    });
    content += "\n";

    content += "--------------------------------------------------\n";
    content += "OPTIMIZED REPAYMENT SETTLEMENT SOLUTIONS\n";
    content += "--------------------------------------------------\n";
    if (transactions.length === 0) {
      content += "All balances reconciled perfectly. No payments required!\n";
    } else {
      transactions.forEach(t => {
        content += `${getParticipantName(t.from)} owes ${getParticipantName(t.to)} $${t.amount.toFixed(2)}\n`;
      });
    }
    content += "\n";

    content += "--------------------------------------------------\n";
    content += "INDIVIDUAL BALANCES RECONCILIATION\n";
    content += "--------------------------------------------------\n";
    content += "MEMBER           | PAID           | NET BALANCE\n";
    content += "--------------------------------------------------\n";
    participants.forEach(p => {
      const bal = balances[p.id] || 0;
      const totalPaidByP = expenses
        .filter((e) => e.paidById === p.id)
        .reduce((s, e) => s + e.amount, 0);
      const balSign = bal > 0.01 ? `+$${bal.toFixed(2)}` : bal < -0.01 ? `-$${Math.abs(bal).toFixed(2)}` : "$0.00";
      content += `${getParticipantName(p.id).padEnd(16)} | $${totalPaidByP.toFixed(2).padEnd(13)} | ${balSign}\n`;
    });
    content += "\n";
    content += "==================================================\n";
    content += "Thank you for planning with OdySync Group Workspace.\n";
    content += "==================================================\n";

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `OdySync_Settlement_Receipt_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to generate and download a CSV ledger file (.csv)
  const handleDownloadCsv = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Chinese compatibility
    csvContent += "Date,Expense Title,Category,Paid By,Amount,Split Method\n";
    
    expenses.forEach(e => {
      const dateStr = e.date || new Date().toLocaleDateString();
      const title = (e.description || "").replace(/"/g, '""');
      const category = e.category;
      const payer = getParticipantName(e.paidById);
      const amount = e.amount;
      const splitType = e.splitType || "equal";
      csvContent += `"${dateStr}","${title}","${category}","${payer}",${amount},"${splitType}"\n`;
    });

    csvContent += "\n\n";
    csvContent += "Reconciliation Summary\n";
    csvContent += "Payer,Recipient,Settlement Amount\n";
    transactions.forEach(t => {
      csvContent += `"${getParticipantName(t.from)}","${getParticipantName(t.to)}",${t.amount.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `OdySync_Expenses_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/15 rounded-lg border border-emerald-500/25">
              <Download className="text-emerald-400" size={16} />
            </span>
            <h2 className="font-extrabold text-white text-sm">
              {lang === "zh" ? "旅程費用結算與資料匯出" : "Travel Bill Settlement & Data Export"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin text-xs">
          
          {/* Controls - Download options */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white/3 border border-white/5 p-4 rounded-xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                {lang === "zh" ? "📥 離線數據備份與匯出" : "📥 Offline Ledger Downloads"}
              </span>
              <p className="text-[11px] text-slate-300">
                {lang === "zh" ? "匯出明細至 CSV 試算表或乾淨純文字收據，供群組共享與記帳。" : "Export live items to a CSV spreadsheet or structured text receipt for companion sharing."}
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-white/20 text-white font-bold rounded-lg text-[11px] cursor-pointer transition-all shadow-sm"
              >
                📄 {lang === "zh" ? "下載 TXT 收據" : "Download TXT"}
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 hover:border-emerald-500/45 text-emerald-300 font-bold rounded-lg text-[11px] cursor-pointer transition-all shadow-sm"
              >
                📊 {lang === "zh" ? "下載 CSV 帳目表" : "Download CSV"}
              </button>
            </div>
          </div>

          {/* Printable Area Wrapper */}
          <div id="printable-receipt" className="bg-[#121620] border border-white/5 rounded-xl p-6 text-slate-200">
            
            {/* Invoice Header */}
            <div className="border-b border-white/10 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-white text-base">ODYSYNC TRAVEL SETTLEMENT</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest">
                  {lang === "zh" ? "旅程費用結算明細收據" : "Official Expenditure Settlement Matrix"}
                </p>
              </div>
              <div className="text-left sm:text-right text-xs font-mono text-slate-400">
                <div>DATE: {new Date().toLocaleDateString()}</div>
                <div>RECEIPT NO: #{Math.floor(100000 + Math.random() * 900000)}</div>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(0,1fr))] gap-3 mb-6">
              <div className="bg-white/3 border border-white/5 p-3 rounded-lg text-center">
                <span className="text-xs text-slate-400 font-bold block">{lang === "zh" ? "總花費金額" : "Total Spent"}</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">${totalSpent.toFixed(2)}</span>
              </div>
              <div className="bg-white/3 border border-white/5 p-3 rounded-lg text-center">
                <span className="text-xs text-slate-400 font-bold block">{lang === "zh" ? "旅程總預算" : "Trip Budget"}</span>
                <span className="text-base font-extrabold text-indigo-400 font-mono">${totalBudget.toFixed(2)}</span>
              </div>
              <div className="bg-white/3 border border-white/5 p-3 rounded-lg text-center">
                <span className="text-xs text-slate-400 font-bold block">{lang === "zh" ? "預算剩餘" : "Remaining"}</span>
                <span className="text-base font-extrabold text-white font-mono">${(totalBudget - totalSpent).toFixed(2)}</span>
              </div>
            </div>

            {/* Categories Diagram */}
            <div className="mb-6 space-y-3">
              <h4 className="font-bold text-white text-xs border-b border-white/5 pb-1">
                {lang === "zh" ? "📊 支出分類比例分析" : "📊 Category Distribution Chart"}
              </h4>
              <div className="w-full bg-white/5 h-3.5 rounded-full overflow-hidden flex">
                {categories.map((c) => (
                  <div
                    key={c.name}
                    style={{ width: `${c.percent}%` }}
                    className={`${getCategoryDotColor(c.name)} h-full`}
                    title={`${c.name}: ${c.percent.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400 font-mono pt-1">
                {categories.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getCategoryDotColor(c.name)}`} />
                    <span className="text-slate-200">{getCategoryLabel(c.name, lang)}:</span>
                    <span className="font-bold text-white">${c.value.toFixed(0)} ({c.percent.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repayment Settlement Instructions */}
            <div className="mb-6 space-y-3">
              <h4 className="font-bold text-white text-xs border-b border-white/5 pb-1">
                {lang === "zh" ? "🤝 最佳化拆帳分攤方案" : "🤝 Optimized Peer-to-Peer Repayments"}
              </h4>
              
              {transactions.length === 0 ? (
                <div className="p-4 text-center bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-emerald-300">
                  🎉 {lang === "zh" ? "所有帳目已全部結清！無任何組員欠款。" : "All balances reconciled perfectly. No transactions required!"}
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((t, idx) => {
                    return (
                      <div key={idx} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">{getParticipantName(t.from)}</span>
                          <span className="text-slate-500">{lang === "zh" ? "需給予" : "owes"}</span>
                          <span className="font-bold text-indigo-300 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">{getParticipantName(t.to)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-emerald-400 font-mono">${t.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Individual Balances Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs border-b border-white/5 pb-1">
                {lang === "zh" ? "🧾 成員收支總覽" : "🧾 Individual Balances Reconciliation"}
              </h4>
              <div className="border border-white/5 rounded-xl overflow-hidden font-mono text-xs">
                <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] bg-white/3 border-b border-white/5 p-2 font-bold text-slate-400">
                  <div>MEMBER</div>
                  <div className="text-right">PAID / SPENT</div>
                  <div className="text-right">NET BALANCE</div>
                </div>
                {participants.map((p) => {
                  const bal = balances[p.id] || 0;
                  const totalPaidByP = expenses
                    .filter((e) => e.paidById === p.id)
                    .reduce((s, e) => s + e.amount, 0);
                  
                  return (
                    <div key={p.id} className="grid grid-cols-[repeat(3,minmax(0,1fr))] border-b border-white/5 p-2 text-slate-200">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-right text-slate-400">${totalPaidByP.toFixed(0)} paid</div>
                      <div className={`text-right font-bold ${
                        bal > 0.01 ? "text-emerald-400" : bal < -0.01 ? "text-rose-400" : "text-slate-500"
                      }`}>
                        {bal > 0.01 ? `+$${bal.toFixed(2)}` : bal < -0.01 ? `-$${Math.abs(bal).toFixed(2)}` : "$0.00"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invoice Footer */}
            <div className="mt-8 pt-4 border-t border-white/10 text-center text-[10px] text-slate-500 leading-relaxed font-sans">
              <p>{lang === "zh" ? "感謝您使用 OdySync 旅遊記帳與清算管家" : "Thank you for planning with OdySync Group Workspace."}</p>
              <p className="mt-0.5">{lang === "zh" ? "所有資料經由加密處理，安全可靠。" : "Safe and secure peer data synchronization."}</p>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer font-semibold"
          >
            {lang === "zh" ? "關閉" : "Close"}
          </button>
        </div>

      </div>
    </div>
  );
}
