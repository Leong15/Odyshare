import React, { useState, useRef } from "react";
import { FolderLock, FileText, Download, ShieldCheck, Key, Plus, FileUp } from "lucide-react";
import { DocumentItem } from "../types";
import { translations } from "../lib/translations";

interface DocumentVaultProps {
  documents: DocumentItem[];
  currentUser: string;
  onUploadDocument: (doc: { name: string; size: string; type: string; uploadedBy: string }, fileData?: string) => void;
  lang?: "en" | "zh";
}

export default function DocumentVault({ documents, currentUser, onUploadDocument, lang = "en" }: DocumentVaultProps) {
  const [showUploadSim, setShowUploadSim] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    type: string;
    base64Data?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-app secure feedback modal/toast state (instead of iframe-unfriendly window.alert)
  const [activeToast, setActiveToast] = useState<{ type: "keygen" | "download"; fileName: string; keySig?: string } | null>(null);

  const t = translations[lang];

  const mockPredefinedFiles = [
    { name: "Group_Airbnb_Voucher.pdf", size: "1.1 MB", type: "application/pdf" },
    { name: "assport_SecureScan.png", size: "2.4 MB", type: "image/png" },
    { name: "Tokyo_Subway_Route_Offline_EN.pdf", size: "3.2 MB", type: "application/pdf" }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setSelectedFile({
          name: file.name,
          size: sizeStr,
          type: file.type || "application/octet-stream",
          base64Data: base64Data.split(",")[1]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setSelectedFile({
          name: file.name,
          size: sizeStr,
          type: file.type || "application/octet-stream",
          base64Data: base64Data.split(",")[1]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const simulateSelectPredefined = (file: typeof mockPredefinedFiles[0]) => {
    setSelectedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      base64Data: btoa("This is simulated decrypted secure content of " + file.name)
    });
  };

  const handlePostFile = () => {
    if (!selectedFile) return;
    onUploadDocument({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      uploadedBy: currentUser
    }, selectedFile.base64Data);
    setSelectedFile(null);
    setShowUploadSim(false);
  };

  const showVerificationSim = (sig: string, titleName: string) => {
    setActiveToast({
      type: "keygen",
      fileName: titleName,
      keySig: sig
    });
    setTimeout(() => {
      setActiveToast(null);
    }, 1500);
  };

  const showDownloadSim = (titleName: string) => {
    setActiveToast({
      type: "download",
      fileName: titleName
    });
    setTimeout(() => {
      setActiveToast(null);
    }, 1500);
  };

  const handleDownloadFile = (docUrl: string, docName: string) => {
    showDownloadSim(docName);
    if (docUrl && docUrl !== "#") {
      const link = document.createElement("a");
      link.href = docUrl;
      link.target = "_blank";
      link.download = docName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="glass-container rounded-2xl p-5 shadow-xl border border-white/10 animate-fadeIn relative text-slate-100">
      
      {/* Toast Alert Simulation */}
      {activeToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-stone-900/95 border border-amber-500/30 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-xl animate-fadeIn flex flex-col gap-1.5 text-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-500/20 text-amber-300">🔐</span>
            <span className="font-extrabold text-white">
              {activeToast.type === "keygen" ? (lang === "zh" ? "加密簽名校驗" : "Crypto Verification") : (lang === "zh" ? "遠程文件加載中" : "Remote File Decrypted")}
            </span>
          </div>
          {activeToast.type === "keygen" ? (
            <div className="font-sans text-slate-300 space-y-1">
              <p>{lang === "zh" ? `群組密碼金鑰容器校驗通過。 SHA256特徵碼如下：` : `The SHA256 cryptographic ticket fingerprint has been decrypted locally for root file:`}</p>
              <p className="font-mono bg-black/40 p-1.5 rounded text-[10px] text-amber-200 mt-1 break-all">{activeToast.keySig}</p>
            </div>
          ) : (
            <p className="font-sans text-slate-300">
              {lang === "zh" ? `正在利用本地 ECDSA 共用金鑰將 📄 '${activeToast.fileName}' 直鏈還原至臨時緩存中並加載。` : `Local ECDSA joint passphrase unlocked 📄 '${activeToast.fileName}' direct buffer allocation.`}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
            <FolderLock size={16} className="text-blue-400" />
            <span>{t.vaultTitle}</span>
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-[9.5px] font-extrabold text-amber-300 rounded font-sans uppercase">
              {lang === "zh" ? "沙盒安全模擬" : "Sandbox Simulation"}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">{t.vaultDesc}</p>
          <p className="text-[10px] text-amber-400/80 mt-1.5 leading-normal">
            ⚠️ {lang === "zh" 
              ? "本地沙盒密鑰校驗與存儲僅供前端效果演示。請勿上傳包含真實個人身份、護照號碼、或任何敏感私密的文件。" 
              : "Local crypto signatures are for front-end demonstration only. Please do not upload real passports, official credentials, or sensitive documents."}
          </p>
        </div>
        <button
          id="upload-doc-trigger"
          onClick={() => setShowUploadSim(!showUploadSim)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] md:text-xs py-2 px-3.5 rounded-xl cursor-pointer shadow transition-all active:scale-[0.98]"
        >
          <Plus size={14} /> {t.uploadDocument}
        </button>
      </div>

      {showUploadSim && (
        <div className="mb-6 p-5 bg-slate-900/60 border border-white/8 rounded-2xl space-y-4 text-xs animate-fadeIn">
          <h4 className="font-semibold text-white text-[13px]">{lang === "zh" ? "真實/模擬憑證上傳" : "Real / Mock Document Upload"}</h4>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileBrowser}
            className={`h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              dragActive ? "border-blue-500 bg-blue-500/20" : "border-white/10 bg-slate-950 hover:bg-slate-900"
            }`}
          >
            <FileUp size={24} className="text-slate-400 mb-1" />
            <span className="text-[11.5px] text-slate-300 font-semibold">
              {lang === "zh" ? "點擊瀏覽檔案 或 拖放檔案至此" : "Click to browse or drag & drop files here"}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">{lang === "zh" ? "或單擊下方快捷項目直接模擬" : "Or tap select preset below"}</span>
          </div>

          <div className="space-y-2">
            <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">{t.quickMockUploads}</p>
            <div className="flex flex-wrap gap-2">
              {mockPredefinedFiles.map((file, idx) => (
                <button
                  key={idx}
                  id={`predef-file-btn-${idx}`}
                  type="button"
                  onClick={() => simulateSelectPredefined(file)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-white/10 text-slate-200 font-semibold rounded-xl cursor-pointer transition-all text-xs"
                >
                  📄 {file.name} ({file.size})
                </button>
              ))}
            </div>
          </div>

          {selectedFile && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between animate-fadeIn text-slate-150">
              <div>
                <span className="font-semibold text-white block text-xs">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">Weight: {selectedFile.size} • Algorithm: AES-256</span>
              </div>
              <button
                id="do-upload-btn"
                onClick={handlePostFile}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer text-xs h-9 flex items-center justify-center shadow"
              >
                {t.uploadEncrypted}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Docs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(2,minmax(0,1fr))] gap-5">
        {documents.map((doc) => (
          <div
            key={doc.id}
            id={`doc-item-${doc.id}`}
            className="p-5 bg-slate-900/40 border border-white/8 rounded-2xl flex flex-col justify-between vault-card-hover hover:border-blue-500/30 hover:bg-slate-800/20 shadow-sm transition-all text-sm gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/15 shrink-0">
                <FileText size={18} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="font-semibold text-white truncate text-[14px]" title={doc.name}>{doc.name}</h4>
                <p className="text-[11px] text-slate-400">
                  {lang === "zh" ? "上傳者：" : "By: "} {doc.uploadedBy} • {doc.size}
                </p>
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-emerald-300 mt-2 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-md w-fit font-bold">
                  <ShieldCheck size={11} /> {lang === "zh" ? "密碼安全金鑰驗證通過" : "Cryptographic Signature Verified"}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px] truncate max-w-[140px]" title={doc.accessKey}>
                <Key size={10} className="text-slate-500 shrink-0" />
                <span className="truncate">{doc.accessKey}</span>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <button
                  id={`doc-verify-${doc.id}`}
                  onClick={() => showVerificationSim(doc.accessKey, doc.name)}
                  className="text-slate-300 hover:text-white px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-white/10 rounded-xl cursor-pointer transition-all font-medium text-xs h-9 flex items-center justify-center"
                >
                  {t.verifyKey}
                </button>
                <button
                  id={`doc-download-${doc.id}`}
                  onClick={() => handleDownloadFile(doc.url, doc.name)}
                  className="flex items-center gap-1.5 text-white bg-blue-600 hover:bg-blue-500 font-medium cursor-pointer px-3 py-1.5 rounded-xl border border-blue-500/15 text-xs h-9 flex items-center justify-center transition-all shadow active:scale-[0.98]"
                >
                  <Download size={11} /> {t.decryptPdf}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
