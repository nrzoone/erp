import React, { useState, useMemo, useEffect } from "react";
import {
  Scissors,
  Database,
  Plus,
  X,
  Archive,
  DollarSign,
  History,
  Printer,
  CheckCircle,
  ExternalLink,
  Clock,
  ArrowLeft,
  AlertCircle,
  User,
  Layers,
  Search,
  Camera,
  Box,
  Trash2,
  Settings,
  ChevronRight,
  ShieldCheck,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRScanner from "../QRScanner";
import UniversalSlip from "../UniversalSlip";
import { syncToSheet } from "../../utils/syncUtils";
import { getPataStockItem } from "../../utils/calculations";
import NRZLogo from "../NRZLogo";

const FactoryPanel = ({ type, masterData, setMasterData, showNotify, user, setActivePanel, t, logAction, SafeText }) => {
  const [view, setView] = useState("active");
  const [lotSearch, setLotSearch] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [receiveModal, setReceiveModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [ledgerModal, setLedgerModal] = useState(null);
  const [printSlip, setPrintSlip] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [receiveState, setReceiveState] = useState({ rBorka: 0, rHijab: 0, penalty: 0, date: new Date().toISOString().split("T")[0] });
  const [paymentAmount, setPaymentAmount] = useState('');

  const role = user?.role?.toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isWorker = role !== "admin" && role !== "manager";

  const workers = (masterData.workerCategories || {})[type] || [];

  const [selection, setSelection] = useState({
    worker: "",
    design: "",
    color: "",
    lotNo: "",
    rate: "",
    date: new Date().toISOString().split("T")[0],
    pataType: "Single"
  });

  const [issueSizes, setIssueSizes] = useState([{ size: "", borka: "", hijab: "", pataQty: "" }]);

  const filteredProductions = (masterData.productions || []).filter(p => {
    if (p.type !== type) return false;
    if (isWorker && p.worker?.toLowerCase() !== user?.name?.toLowerCase()) return false;
    return (p.worker?.toLowerCase() || '').includes(lotSearch.toLowerCase()) ||
           (p.design?.toLowerCase() || '').includes(lotSearch.toLowerCase()) ||
           (p.lotNo?.toLowerCase() || '').includes(lotSearch.toLowerCase());
  });

  const activeEntries = filteredProductions.filter(p => p.status === "Pending");
  const historyEntries = filteredProductions.filter(p => p.status === "Received");

  const handleLotSelect = (lotKey) => {
    if (!lotKey) return;
    const [design, color, lotNo] = lotKey.split("|");
    const dObj = (masterData.designs || []).find(d => d.name === design);
    const defaultRate = type === "sewing" ? dObj?.sewingRate || 0 : dObj?.stoneRate || 0;
    
    setSelection(prev => ({
      ...prev,
      design,
      color,
      lotNo,
      rate: defaultRate
    }));
  };

  const handleIssue = () => {
    const { worker, design, color, lotNo, rate, date } = selection;
    if (!worker || !lotNo) return showNotify("কারিগর ও লট নির্বাচন করুন!", "error");
    
    const validSizes = issueSizes.filter(s => Number(s.borka || 0) > 0 || Number(s.hijab || 0) > 0);
    if (validSizes.length === 0) return showNotify("অন্তত একটি পরিমাণ দিন!", "error");

    const newEntries = validSizes.map(s => ({
      id: `prod_${Date.now()}_${Math.random()}`,
      date: new Date(date).toLocaleDateString("en-GB"),
      type,
      worker,
      design,
      color,
      lotNo,
      size: s.size,
      issueBorka: Number(s.borka || 0),
      issueHijab: Number(s.hijab || 0),
      pataType: type === "stone" ? selection.pataType : null,
      pataQty: type === "stone" ? Number(s.pataQty || 0) : 0,
      status: "Pending",
      rate: Number(rate),
      receivedBorka: 0,
      receivedHijab: 0
    }));

    setMasterData(prev => ({
      ...prev,
      productions: [...newEntries, ...(prev.productions || [])]
    }));

    setShowIssueModal(false);
    showNotify("কাজ সফলভাবে ইস্যু হয়েছে!");
  };

  const handleConfirmReceive = (e) => {
    e.preventDefault();
    const rBorka = Number(receiveState.rBorka);
    const rHijab = Number(receiveState.rHijab);
    const penalty = Number(receiveState.penalty || 0);

    setMasterData(prev => ({
      ...prev,
      productions: prev.productions.map(p => p.id === receiveModal.id ? {
        ...p,
        status: "Received",
        receivedBorka: rBorka,
        receivedHijab: rHijab,
        penalty,
        receiveDate: new Date(receiveState.date).toLocaleDateString("en-GB")
      } : p)
    }));

    setReceiveModal(null);
    showNotify("কাজ জমা নেওয়া হয়েছে!");
  };

  const handlePayment = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    const amount = Number(paymentAmount);

    setMasterData(prev => ({
      ...prev,
      workerPayments: [
        {
          id: `pay_${Date.now()}`,
          date: new Date().toLocaleDateString("en-GB"),
          worker: payModal,
          dept: type,
          amount,
          note: `Manual Payment (${type})`
        },
        ...(prev.workerPayments || [])
      ],
      expenses: [
        {
          id: `exp_w_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          category: "salary",
          description: `PMT: ${payModal} (${type})`,
          amount
        },
        ...(prev.expenses || [])
      ]
    }));

    setPayModal(null);
    setPaymentAmount('');
    showNotify("পেমেন্ট সফলভাবে ব্যালেন্সে যুক্ত হয়েছে!");
  };

  const getWorkerDue = (name) => {
    const earned = (masterData.productions || [])
      .filter(p => p.worker === name && p.status === "Received" && p.type === type)
      .reduce((s, p) => s + (p.receivedBorka + p.receivedHijab) * (p.rate || 0), 0);
    const paid = (masterData.workerPayments || [])
      .filter(p => p.worker === name && p.dept === type)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return earned - paid;
  };

  if (printSlip) {
    return (
      <div className="min-h-screen bg-white p-10 font-outfit italic animate-fade-up">
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print flex justify-between items-center mb-10 max-w-5xl mx-auto">
          <button onClick={() => setPrintSlip(null)} className="px-8 py-4 bg-slate-50 rounded-2xl font-black uppercase text-[10px] hover:bg-black hover:text-white transition-all">Cancel</button>
          <button onClick={() => window.print()} className="action-btn-primary !px-12 !py-4 shadow-xl"><Printer size={18} /> Print Job Slip</button>
        </div>
        <div className="w-[210mm] mx-auto bg-white border border-slate-100 shadow-2xl p-1 relative">
          <UniversalSlip data={printSlip} type="ISSUE" copyTitle="WORKER COPY" SafeText={SafeText} />
          <div className="h-4 border-t-2 border-dashed border-slate-300 my-10"></div>
          <UniversalSlip data={printSlip} type="ISSUE" copyTitle="OFFICE COPY" SafeText={SafeText} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-fade-up px-1 md:px-2 italic font-outfit text-black dark:text-white">
      {/* SaaS Operational HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-150 transition-transform"><Layers size={100} /></div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">ইউনিট টাইপ</p>
          <p className="text-4xl font-black tracking-tighter italic">{type.toUpperCase()} UNIT</p>
        </div>

        <button onClick={() => setView('active')} className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 flex items-center justify-between group transition-all text-left shadow-2xl ${view === 'active' ? 'border-amber-500' : 'border-slate-50 dark:border-slate-800'}`}>
          <div>
            <p className="text-4xl font-black tracking-tighter mb-1">{activeEntries.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">চলমান কাজ</p>
          </div>
          <div className="w-16 h-16 bg-amber-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform"><Clock size={32} /></div>
        </button>

        <button onClick={() => setView('history')} className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 flex items-center justify-between group transition-all text-left shadow-2xl ${view === 'history' ? 'border-emerald-500' : 'border-slate-50 dark:border-slate-800'}`}>
          <div>
            <p className="text-4xl font-black tracking-tighter mb-1">{historyEntries.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">পুরাতন রেকর্ড</p>
          </div>
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform"><CheckCircle size={32} /></div>
        </button>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-between group overflow-hidden relative">
          <div>
            <p className="text-3xl font-black tracking-tighter mb-1">৳{(workers.reduce((s,w) => s + getWorkerDue(w), 0)).toLocaleString()}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">মোট বকেয়া মজুরি</p>
          </div>
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-[1.5rem] flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all"><DollarSign size={32} /></div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-800 shadow-inner">
        <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] w-full md:w-auto">
          {['active', 'history', 'payments'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`flex-1 md:flex-none px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400'}`}>
              {v === 'active' ? 'চলমান' : v === 'history' ? 'পুরাতন' : 'পেমেন্ট'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-2">
          <div className="relative group">
            <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="লট, ডিজাইন বা কারিগর..." className="bg-slate-50 dark:bg-slate-800 h-14 pl-14 pr-6 rounded-2xl text-[11px] font-black uppercase outline-none w-64 border-2 border-transparent focus:border-black transition-all italic" value={lotSearch} onChange={(e) => setLotSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowQR(true)} className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all"><Camera size={20} /></button>
          {!isWorker && (
            <button onClick={() => setShowIssueModal(true)} className="h-14 bg-slate-950 text-white px-8 rounded-2xl flex items-center gap-3 shadow-2xl font-black uppercase text-[10px] tracking-widest italic animate-pulse">
              <Plus size={20} /> নতুন কাজ দিন
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {view === 'payments' ? (
          workers.map((w, idx) => {
            const due = getWorkerDue(w);
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-[3rem] p-10 space-y-8 shadow-xl hover:border-black transition-all group animate-fade-up">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none italic">{type.toUpperCase()} SPECIALIST</p>
                    <h4 className="text-3xl font-black tracking-tighter uppercase italic">{w}</h4>
                  </div>
                  <div className={`w-14 h-14 ${due > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-300'} rounded-[1.5rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner`}><User size={28} /></div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-8 rounded-[2.5rem] border border-white dark:border-slate-700 shadow-inner">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">বকেয়া মজুরি (DUE)</p>
                   <p className={`text-5xl font-black tracking-tighter italic ${due > 0 ? 'text-black dark:text-white' : 'text-slate-200'}`}>৳{due.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setLedgerModal(w)} className="py-4 bg-slate-50 dark:bg-white rounded-2xl font-black uppercase text-[10px] tracking-widest italic">লেজার</button>
                  <button onClick={() => setPayModal(w)} className="py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest italic shadow-xl">পেমেন্ট দিন</button>
                </div>
              </div>
            );
          })
        ) : (view === 'active' ? activeEntries : historyEntries).length === 0 ? (
          <div className="col-span-full h-80 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-50 italic">
            <Activity size={60} strokeWidth={1} className="text-slate-100 mb-6" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">রেকর্ড পাওয়া যায়নি</p>
          </div>
        ) : (
          (view === 'active' ? activeEntries : historyEntries).map((item, idx) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-[3rem] p-10 space-y-8 shadow-xl hover:border-black transition-all group animate-fade-up">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">কারিগর</p>
                  <h4 className="text-3xl font-black tracking-tighter uppercase italic truncate max-w-[200px]">{item.worker}</h4>
                </div>
                <div className={`w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner font-black text-[10px]`}>#{item.lotNo.slice(-3)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-white dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">মডেল ও রঙ</p>
                  <p className="text-sm font-black uppercase italic truncate">{item.design} ({item.color})</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-white dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">সাইজ</p>
                  <p className="text-sm font-black uppercase italic truncate">{item.size}</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-8 border-y-2 border-slate-50 dark:border-slate-800 border-dashed">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">পরিমাণ (QTY)</p>
                  <p className="text-4xl font-black italic tracking-tighter">{item.issueBorka + item.issueHijab} <span className="text-xs opacity-40">PCS</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">মজুরি রেট</p>
                  <p className="text-2xl font-black italic text-emerald-500 tracking-tighter">৳{item.rate}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setPrintSlip(item)} className="w-16 h-16 bg-white dark:bg-slate-800 border-2 border-transparent hover:border-black rounded-2xl flex items-center justify-center shadow-lg transition-all"><Printer size={24} /></button>
                {item.status === 'Pending' ? (
                  <button onClick={() => setReceiveModal(item)} className="flex-1 h-16 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest italic shadow-xl hover:bg-emerald-500 transition-all">কাজ জমা নিন (REC)</button>
                ) : (
                  <div className="flex-1 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest italic border border-emerald-100">RECEIVED ON {item.receiveDate}</div>
                )}
                {isAdmin && (
                  <button 
                  onClick={() => {
                    if (window.confirm('মুছে ফেলতে চান?')) {
                      setMasterData(prev => ({ ...prev, productions: prev.productions.filter(p => p.id !== item.id) }));
                      showNotify('রেকর্ড মুছে ফেলা হয়েছে!');
                    }
                  }}
                  className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={24} /></button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl p-12 relative border-4 border-slate-50">
                <button onClick={() => setShowIssueModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-black"><X size={32} /></button>
                <h2 className="text-3xl font-black uppercase italic mb-10 text-center">নতুন {type === 'sewing' ? 'সেলাই' : 'স্টোন'} কাজ <span className="text-blue-600">ইস্যু করুন</span></h2>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">লট সিলেক্ট (Master Lot)</label>
                      <select className="premium-input !h-14 font-black uppercase italic" value={`${selection.design}|${selection.color}|${selection.lotNo}`} onChange={(e) => handleLotSelect(e.target.value)}>
                        <option value="">-- SELECT LOT --</option>
                        {(masterData.cuttingStock || []).map(l => (
                          <option key={`${l.design}|${l.color}|${l.lotNo}`} value={`${l.design}|${l.color}|${l.lotNo}`}>{l.design} | {l.color} | #{l.lotNo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">কারিগর</label>
                      <select className="premium-input !h-14 font-black uppercase italic" value={selection.worker} onChange={(e) => setSelection(p => ({ ...p, worker: e.target.value, rate: (masterData.workerWages || {})[type]?.[e.target.value] || p.rate }))}>
                        <option value="">-- SELECT WORKER --</option>
                        {workers.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">মজুরি রেট</label>
                      <input type="number" className="premium-input !h-14 font-black text-emerald-600 italic" value={selection.rate} onChange={(e) => setSelection(p => ({ ...p, rate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">তারিখ</label>
                      <input type="date" className="premium-input !h-14 font-black italic" value={selection.date} onChange={(e) => setSelection(p => ({ ...p, date: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-white dark:border-slate-700 space-y-4 max-h-60 overflow-y-auto">
                    {issueSizes.map((row, idx) => (
                      <div key={idx} className="flex gap-4 items-center animate-fade-up">
                        <select className="flex-1 premium-input !h-12 text-[11px] font-black" value={row.size} onChange={(e) => { const n = [...issueSizes]; n[idx].size = e.target.value; setIssueSizes(n); }}>
                          <option value="">SIZE...</option>
                          {(masterData.sizes || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input className="w-24 premium-input !h-12 text-center font-black" placeholder="BORKA" type="number" value={row.borka} onChange={(e) => { const n = [...issueSizes]; n[idx].borka = e.target.value; setIssueSizes(n); }} />
                        <input className="w-24 premium-input !h-12 text-center font-black" placeholder="HIJAB" type="number" value={row.hijab} onChange={(e) => { const n = [...issueSizes]; n[idx].hijab = e.target.value; setIssueSizes(n); }} />
                        {issueSizes.length > 1 && <button onClick={() => setIssueSizes(issueSizes.filter((_, i) => i !== idx))} className="text-rose-500"><X size={20} /></button>}
                      </div>
                    ))}
                    <button onClick={() => setIssueSizes([...issueSizes, { size: "", borka: "", hijab: "", pataQty: "" }])} className="w-full py-3 border-2 border-dashed rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-black transition-all">+ Add Size Row</button>
                </div>

                <button onClick={handleIssue} className="w-full mt-10 py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-black transition-all">কাজ নিশ্চিত করুন (DEPLOY JOB)</button>
             </motion.div>
          </div>
        )}

        {receiveModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border-4 border-slate-50">
                 <button onClick={() => setReceiveModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                 <h2 className="text-2xl font-black uppercase italic mb-8 text-center">{receiveModal.worker} <span className="text-emerald-500">জমা দিন</span></h2>
                 <form onSubmit={handleConfirmReceive} className="space-y-8">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-center shadow-inner border border-white dark:border-slate-700">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-4">বোরকা (REC)</p>
                          <input type="number" className="w-full text-4xl font-black text-center bg-transparent outline-none italic" value={receiveState.rBorka} onChange={(e) => setReceiveState(p => ({ ...p, rBorka: e.target.value }))} autoFocus />
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-center shadow-inner border border-white dark:border-slate-700">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-4">হিজাব (REC)</p>
                          <input type="number" className="w-full text-4xl font-black text-center bg-transparent outline-none italic" value={receiveState.rHijab} onChange={(e) => setReceiveState(p => ({ ...p, rHijab: e.target.value }))} />
                        </div>
                     </div>
                     <div className="p-6 bg-rose-50 text-rose-600 rounded-[2rem] text-center border border-rose-100">
                        <p className="text-[10px] font-black uppercase mb-2">জরিমানা / Fine (৳)</p>
                        <input type="number" className="w-full text-3xl font-black text-center bg-transparent outline-none italic" placeholder="0" value={receiveState.penalty} onChange={(e) => setReceiveState(p => ({ ...p, penalty: e.target.value }))} />
                     </div>
                     <button type="submit" className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase italic shadow-xl">জমা নিশ্চিত করুন</button>
                 </form>
             </motion.div>
          </div>
        )}

        {payModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border-4 border-slate-50">
                 <button onClick={() => setPayModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                 <h2 className="text-2xl font-black uppercase italic mb-8 text-center">{payModal} <span className="text-emerald-500">পেমেন্ট</span></h2>
                 <div className="p-10 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-center mb-8 shadow-inner border border-white dark:border-slate-700">
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-4">টাকার পরিমাণ (৳)</p>
                     <input type="number" className="w-full text-5xl font-black text-center bg-transparent outline-none italic" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
                 </div>
                 <button onClick={handlePayment} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest italic shadow-xl hover:bg-black transition-all">পেমেন্ট নিশ্চিত করুন</button>
             </motion.div>
          </div>
        )}

        {ledgerModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative border-4 border-slate-50 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setLedgerModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                <h2 className="text-2xl font-black uppercase italic mb-10 text-center font-outfit">{ledgerModal} <span className="text-blue-600">লেজার</span></h2>
                <div className="space-y-4">
                   {(masterData.productions || []).filter(p => p.worker === ledgerModal && p.status === 'Received' && p.type === type).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-white dark:border-slate-700 italic">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">{p.receiveDate}</p>
                            <h4 className="text-sm font-black uppercase">{p.design} | #{p.lotNo.slice(-3)} ({p.receivedBorka + p.receivedHijab} PCS)</h4>
                         </div>
                         <p className="text-lg font-black text-emerald-600">৳{((p.receivedBorka + p.receivedHijab) * p.rate).toLocaleString()}</p>
                      </div>
                   ))}
                   {(masterData.workerPayments || []).filter(pay => pay.worker === ledgerModal && pay.dept === type).map((pay, idx) => (
                      <div key={idx} className="flex justify-between items-center p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[2rem] border border-rose-100 italic">
                         <div>
                            <p className="text-[10px] font-black text-rose-400 uppercase">{pay.date}</p>
                            <h4 className="text-sm font-black uppercase">মজুরি পরিশোধ (DISBURSEMENT)</h4>
                         </div>
                         <p className="text-lg font-black text-rose-600">- ৳{pay.amount.toLocaleString()}</p>
                      </div>
                   ))}
                </div>
                <div className="mt-10 p-10 bg-slate-950 text-white rounded-[2.5rem] flex justify-between items-center">
                   <p className="text-xs font-black uppercase tracking-widest opacity-40">LEDGER BALANCE</p>
                   <p className="text-4xl font-black italic tracking-tighter">৳{getWorkerDue(ledgerModal).toLocaleString()}</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Button */}
      <div className="pt-24 pb-12 flex justify-center">
        <button
          onClick={() => setActivePanel("Overview")}
          className="group flex items-center gap-8 bg-white dark:bg-slate-900 px-16 py-8 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl hover:border-black transition-all duration-500"
        >
          <div className="p-4 bg-slate-950 text-white rounded-2xl transition-transform shadow-2xl group-hover:-translate-x-4">
            <ArrowLeft size={24} strokeWidth={3} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-black dark:text-white uppercase leading-none italic">RETURN TO HUB</span>
        </button>
      </div>
    </div>
  );
};

export default FactoryPanel;
