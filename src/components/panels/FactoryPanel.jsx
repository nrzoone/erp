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
  UserCheck,
  Layers,
  Search,
  Camera,
  Box,
  Trash2,
  Settings,
  ChevronRight,
  ShieldCheck,
  Activity,
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRScanner from "../QRScanner";
import UniversalSlip from "../UniversalSlip";
import { syncToSheet } from "../../utils/syncUtils";
import { getPataStockItem } from "../../utils/calculations";
import { getWorkerBalance } from "../../utils/productionUtils";
import NRZLogo from "../NRZLogo";

const FactoryPanel = ({ type, masterData, setMasterData, showNotify, user, setActivePanel, t, logAction, SafeText }) => {
  const [view, setView] = useState("active");
  const [lotSearch, setLotSearch] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [receiveModal, setReceiveModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [ledgerModal, setLedgerModal] = useState(false);
  const [selectedWorkerLedger, setSelectedWorkerLedger] = useState(null);
  const [reportRange, setReportRange] = useState({ start: "", end: "" });
  const [printSlip, setPrintSlip] = useState(null);
  const [printReport, setPrintReport] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [receiveState, setReceiveState] = useState({ rBorka: 0, rHijab: 0, penalty: 0, date: new Date().toISOString().split("T")[0] });
  const [paymentAmount, setPaymentAmount] = useState('');

  const role = user?.role?.toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isWorker = role !== "admin" && role !== "manager";

  // 🚀 Performance Optimization: Memoized Filtering
  const activeEntries = useMemo(() => {
    return (masterData.productions || []).filter(p => 
      p.status === "Pending" && p.type === type &&
      (!isWorker || p.worker?.toLowerCase() === user?.name?.toLowerCase()) &&
      (p.lotNo?.toLowerCase().includes(lotSearch.toLowerCase()) || 
       p.design?.toLowerCase().includes(lotSearch.toLowerCase()) ||
       p.worker?.toLowerCase().includes(lotSearch.toLowerCase()))
    );
  }, [masterData.productions, type, isWorker, user, lotSearch]);

  const historyEntries = useMemo(() => {
    return (masterData.productions || []).filter(p => 
      p.status === "Received" && p.type === type &&
      (!isWorker || p.worker?.toLowerCase() === user?.name?.toLowerCase()) &&
      (p.lotNo?.toLowerCase().includes(lotSearch.toLowerCase()) || 
       p.design?.toLowerCase().includes(lotSearch.toLowerCase()) ||
       p.worker?.toLowerCase().includes(lotSearch.toLowerCase()))
    );
  }, [masterData.productions, type, isWorker, user, lotSearch]);

  const workersList = useMemo(() => {
    return Array.from(new Set((masterData.workerDocs || [])
      .filter(d => d.dept === type)
      .map(d => d.name)));
  }, [masterData.workerDocs, type]);

  const totalDue = useMemo(() => {
    return workersList.reduce((sum, name) => sum + getWorkerBalance(masterData, name, type).balance, 0);
  }, [masterData, workersList, type]);

  const [selection, setSelection] = useState({
    worker: "",
    design: "",
    color: "",
    lotNo: "",
    rate: "",
    date: new Date().toISOString().split("T")[0],
    pataType: "Single"
  });

  const nextStoneLotNo = useMemo(() => {
    const numbers = (masterData.productions || [])
        .filter(p => p.type === 'stone')
        .map(e => {
            const match = String(e.lotNo).match(/ST-(\d+)/);
            return match ? parseInt(match[1]) : null;
        })
        .filter(n => n !== null);
    const max = numbers.length > 0 ? Math.max(...numbers) : 5000;
    return `ST-${max + 1}`;
  }, [masterData.productions]);

  const [issueSizes, setIssueSizes] = useState([{ size: "", borka: "", hijab: "", pataQty: "" }]);

  // 🚀 Logic for Advanced Routing & Stock Management
  const availableLots = useMemo(() => {
    const lotsMap = {};

    if (type === 'sewing') {
      (masterData.cuttingStock || []).forEach(l => {
        const dObj = (masterData.designs || []).find(d => d.name === l.design);
        if (!dObj || Number(dObj.sewingRate || 0) <= 0) return;
        
        const key = `${l.design}|${l.color}|${l.lotNo}`;
        if (!lotsMap[key]) {
          lotsMap[key] = { ...l, source: 'Cutting', sizes: {} };
        }
        lotsMap[key].sizes[l.size] = { borka: (lotsMap[key].sizes[l.size]?.borka || 0) + Number(l.borka), hijab: (lotsMap[key].sizes[l.size]?.hijab || 0) + Number(l.hijab) };
      });
    }
    
    if (type === 'stone') {
      (masterData.cuttingStock || []).forEach(l => {
        const dObj = (masterData.designs || []).find(d => d.name === l.design);
        if (!dObj || Number(dObj.sewingRate || 0) > 0 || Number(dObj.stoneRate || 0) <= 0) return;
        
        const key = `${l.design}|${l.color}|${l.lotNo}`;
        if (!lotsMap[key]) {
          lotsMap[key] = { ...l, source: 'Cutting', sizes: {} };
        }
        lotsMap[key].sizes[l.size] = { borka: (lotsMap[key].sizes[l.size]?.borka || 0) + Number(l.borka), hijab: (lotsMap[key].sizes[l.size]?.hijab || 0) + Number(l.hijab) };
      });

      (masterData.productions || [])
        .filter(p => p.type === 'sewing' && p.sentToStone === true)
        .forEach(p => {
            const key = `${p.design}|${p.color}|${p.lotNo}`;
            if (!lotsMap[key]) {
              lotsMap[key] = { ...p, source: 'Sewing', sizes: {} };
            }
            lotsMap[key].sizes[p.size] = { borka: (lotsMap[key].sizes[p.size]?.borka || 0) + Number(p.receivedBorka || 0), hijab: (lotsMap[key].sizes[p.size]?.hijab || 0) + Number(p.receivedHijab || 0) };
        });
    }

    Object.keys(lotsMap).forEach(key => {
        const [design, color, lotNo] = key.split('|');
        (masterData.productions || [])
            .filter(p => p.type === type && p.lotNo === lotNo && p.design === design)
            .forEach(p => {
                if (lotsMap[key].sizes[p.size]) {
                    lotsMap[key].sizes[p.size].borka -= Number(p.issueBorka || 0);
                    lotsMap[key].sizes[p.size].hijab -= Number(p.issueHijab || 0);
                }
            });
    });
    
    return Object.values(lotsMap).filter(l => {
        const total = Object.values(l.sizes).reduce((acc, s) => acc + s.borka + s.hijab, 0);
        return total > 0;
    });
  }, [masterData, type]);

  const handleLotSelect = (lotKey) => {
    if (!lotKey) {
        setSelection(prev => ({ ...prev, design: "", color: "", lotNo: type === 'stone' ? nextStoneLotNo : "" }));
        setIssueSizes([{ size: "", borka: "", hijab: "", pataQty: "" }]);
        return;
    }
    
    const [design, color, lotNo] = lotKey.split("|");
    const lotData = availableLots.find(l => l.design === design && l.color === color && l.lotNo === lotNo);
    const dObj = (masterData.designs || []).find(d => d.name === design);
    const defaultRate = type === "sewing" ? dObj?.sewingRate || 0 : dObj?.stoneRate || 0;
    
    setSelection(prev => ({
      ...prev,
      design,
      color,
      lotNo,
      rate: defaultRate,
      pataWorker: lotData?.prevWorker || ""
    }));

    const newSizes = Object.entries(lotData?.sizes || {})
        .filter(([_, qty]) => qty.borka > 0 || qty.hijab > 0)
        .map(([size, qty]) => ({
            size,
            borka: qty.borka,
            hijab: qty.hijab,
            pataQty: qty.borka
        }));

    setIssueSizes(newSizes.length > 0 ? newSizes : [{ size: "", borka: "", hijab: "", pataQty: "" }]);
  };

  const handleIssue = (shouldPrint = false) => {
    const { worker, design, color, lotNo, rate, date } = selection;
    if (!worker || !lotNo) return showNotify("কারিগর ও লট নির্বাচন করুন!", "error");
    
    const validSizes = issueSizes.filter(s => Number(s.borka || 0) > 0 || Number(s.hijab || 0) > 0);
    if (validSizes.length === 0) return showNotify("অন্তত একটি পরিমাণ দিন!", "error");

    // 🚀 Strict Stock Validation
    const lotData = availableLots.find(l => l.design === design && l.color === color && l.lotNo === lotNo);
    
    for (const s of validSizes) {
        if (lotData) {
            const stock = lotData.sizes[s.size] || { borka: 0, hijab: 0 };
            if (Number(s.borka || 0) > stock.borka || Number(s.hijab || 0) > stock.hijab) {
                return showNotify(`স্টক সীমা অতিক্রম করেছে! সাইজ: ${s.size} (উপলব্ধ: ${stock.borka}B, ${stock.hijab}H)`, "error");
            }
        }
    }

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
        pataWorker: selection.pataWorker || "",
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
    if (shouldPrint) setPrintSlip(newEntries[0]);
  };

  const handleConfirmReceive = (e) => {
    e.preventDefault();
    const rBorka = Number(receiveState.rBorka);
    const rHijab = Number(receiveState.rHijab);
    const penalty = Number(receiveState.penalty || 0);

    setMasterData(prev => {
      if (type === 'sewing' && receiveModal.isSendingToStone) {
          return {
              ...prev,
              productions: prev.productions.map(p => p.id === receiveModal.id ? {
                  ...p,
                  sentToStone: true,
                  receivedBorka: rBorka,
                  receivedHijab: rHijab,
                  note: (p.note || '') + ` | Sent to Stone: ${rBorka}B, ${rHijab}H`
              } : p)
          };
      }

      let updatedProductions = prev.productions.map(p => p.id === receiveModal.id ? {
        ...p,
        status: "Received",
        receivedBorka: rBorka,
        receivedHijab: rHijab,
        nostoBorka: Number(receiveState.nostoBorka || 0),
        nostoHijab: Number(receiveState.nostoHijab || 0),
        missingHijab: Number(receiveState.missingHijab || 0),
        penalty,
        hasShortage: (rBorka + rHijab) < (p.issueBorka + p.issueHijab),
        receiveDate: new Date(receiveState.date).toLocaleDateString("en-GB")
      } : p);

      if (type === 'stone') {
          updatedProductions = updatedProductions.map(p => {
              if (p.lotNo === receiveModal.lotNo && p.type === 'sewing' && p.status === 'Pending') {
                  return {
                      ...p,
                      receivedBorka: rBorka,
                      receivedHijab: rHijab,
                      hasShortage: (rBorka + rHijab) < (p.issueBorka + p.issueHijab),
                      note: (p.note || '') + ` | Stone Done: ${rBorka}B, ${rHijab}H (Ready for Receive)`
                  };
              }
              return p;
          });
      }

      return { ...prev, productions: updatedProductions };
    });

    setReceiveModal(null);
    showNotify("কাজ জমা নেওয়া হয়েছে!");
  };

  const getWorkerHistory = (name) => {
    const prods = (masterData.productions || []).filter(p => p.worker === name && p.type === type);
    const pays = (masterData.workerPayments || []).filter(p => p.worker === name && p.dept === type);
    
    let combined = [
        ...prods.map(p => ({ ...p, sortDate: p.receiveDate || p.date, entryType: 'PRODUCTION' })),
        ...pays.map(p => ({ ...p, sortDate: p.date, entryType: 'PAYMENT' }))
    ];

    if (reportRange.start) combined = combined.filter(i => new Date(i.sortDate.split('/').reverse().join('-')) >= new Date(reportRange.start));
    if (reportRange.end) combined = combined.filter(i => new Date(i.sortDate.split('/').reverse().join('-')) <= new Date(reportRange.end));

    return combined.sort((a, b) => new Date(b.sortDate.split('/').reverse().join('-')) - new Date(a.sortDate.split('/').reverse().join('-')));
  };

  const handlePayment = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    const amount = Number(paymentAmount);
    setMasterData(prev => ({
      ...prev,
      workerPayments: [{ id: `pay_${Date.now()}`, date: new Date().toLocaleDateString("en-GB"), worker: payModal, dept: type, amount, note: `Manual Payment (${type})` }, ...(prev.workerPayments || [])],
      expenses: [{ id: `exp_w_${Date.now()}`, date: new Date().toISOString().split("T")[0], category: "salary", description: `PMT: ${payModal} (${type})`, amount }, ...(prev.expenses || [])]
    }));
    setPayModal(null);
    setPaymentAmount('');
    showNotify("পেমেন্ট সফলভাবে ব্যালেন্সে যুক্ত হয়েছে!");
  };

  if (printReport) {
    const history = getWorkerHistory(printReport);
    const balance = getWorkerBalance(masterData, printReport, type);
    return (
      <div className="min-h-screen bg-white p-10 font-outfit italic animate-fade-up">
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print flex justify-between items-center mb-10 max-w-5xl mx-auto">
          <button onClick={() => setPrintReport(null)} className="px-8 py-4 bg-slate-50 rounded-2xl font-black uppercase text-[10px]">Back</button>
          <button onClick={() => window.print()} className="action-btn-primary !px-12 !py-4 shadow-xl"><Printer size={18} /> Print Statement</button>
        </div>
        <div className="max-w-4xl mx-auto border-[10px] border-black p-16 rounded-[4rem] relative overflow-hidden bg-white text-black">
          <div className="flex justify-between items-start border-b-[6px] border-black pb-10 mb-10">
             <div>
                <NRZLogo size="md" />
                <h1 className="text-4xl font-black mt-4 italic uppercase">{type} Worker Statement</h1>
                <p className="text-[10px] font-black tracking-[0.4em] opacity-40">LEDGER AUDIT // {printReport}</p>
             </div>
             <div className="text-right">
                <p className="text-3xl font-black italic">{new Date().toLocaleDateString()}</p>
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-2">Verified Factory Output</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-10 mb-12 bg-slate-50 p-10 rounded-[3rem]">
             <div>
                <p className="text-[10px] font-black uppercase opacity-40 mb-2">Total Earnings</p>
                <p className="text-4xl font-black italic">৳{balance.total.toLocaleString()}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-40 mb-2">Outstanding Balance</p>
                <p className="text-4xl font-black italic text-blue-600">৳{balance.balance.toLocaleString()}</p>
             </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase opacity-40 border-b-2 border-black">
                <th className="py-4 px-2">Date</th>
                <th className="py-4 px-2">Description</th>
                <th className="py-4 px-2 text-right">Credit</th>
                <th className="py-4 px-2 text-right">Debit</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-black">
              {history.map((h, i) => (
                <tr key={i} className="text-xs font-bold uppercase italic">
                  <td className="py-4 px-2 tabular-nums">{h.sortDate}</td>
                  <td className="py-4 px-2">{h.entryType === 'PRODUCTION' ? `${h.design} #${h.lotNo} (${h.issueBorka+h.issueHijab}P)` : 'Cash Payment'}</td>
                  <td className="py-4 px-2 text-right tabular-nums">{h.entryType === 'PRODUCTION' ? `৳${(h.receivedBorka+h.receivedHijab) * h.rate - (h.penalty||0)}` : '-'}</td>
                  <td className="py-4 px-2 text-right tabular-nums text-rose-600">{h.entryType === 'PAYMENT' ? `৳${h.amount}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-20 flex justify-between items-center opacity-40 text-[10px] font-black uppercase tracking-widest">
             <p>Authorized Signature</p>
             <p>NRZONE INDUSTRIAL HUB</p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="bg-slate-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:scale-150 transition-transform"><Layers size={80} /></div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Unit Node</p>
          <p className="text-2xl font-black italic tracking-tighter uppercase">{type} HUB</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform"><Clock size={80} /></div>
            <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-3xl font-black tracking-tighter leading-none mb-1">{activeEntries.length}</p>
                    <p className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none">চলমান কাজ</p>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform"><CheckCircle size={80} /></div>
            <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <p className="text-3xl font-black tracking-tighter leading-none mb-1">{historyEntries.length}</p>
                    <p className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none">পুরাতন হিস্ট্রি</p>
                </div>
            </div>
        </div>

        <button onClick={() => setLedgerModal(true)} className="bg-slate-950 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between group overflow-hidden relative border border-white/10 transition-all hover:bg-blue-600">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-white group-hover:scale-150 transition-transform"><UserCheck size={80} /></div>
            <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <UserCheck size={24} />
                </div>
                <div>
                    <p className="text-2xl font-black tracking-tighter leading-none mb-1">৳{totalDue.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">মোট বকেয়া মজুরি</p>
                </div>
            </div>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-1.5 flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
          <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar gap-1">
              {['active', 'history', 'workers'].map(v => (
                  <button key={v} onClick={() => setView(v)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-slate-950 text-white shadow-md' : 'text-slate-400 hover:text-black'}`}>
                      {v === 'active' ? 'চলমান' : v === 'history' ? 'পুরাতন' : 'কারিগর তালিকা'}
                  </button>
              ))}
          </div>

          <div className="flex items-center gap-3 px-1 w-full md:w-auto">
              <div className="relative group flex-1 md:flex-none">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    placeholder="খুঁজুন (লট/কারিগর)..." 
                    className="bg-slate-50 dark:bg-slate-800 h-11 pl-11 pr-4 rounded-xl text-[10px] font-black uppercase outline-none w-full md:w-56 border border-transparent focus:border-blue-600 transition-all italic" 
                    value={lotSearch} 
                    onChange={(e) => setLotSearch(e.target.value)} 
                  />
              </div>
              <button onClick={() => setShowQR(true)} className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-black transition-all group flex-shrink-0">
                  <Camera size={18} className="group-hover:scale-110 transition-transform" />
              </button>
              {(isAdmin || isManager) && (
                  <button onClick={() => setShowIssueModal(true)} className="h-11 bg-slate-950 text-white px-6 rounded-xl flex items-center gap-2 shadow-lg font-black uppercase text-[9px] tracking-widest italic flex-shrink-0">
                      <Plus size={16} /> নতুন কাজ
                  </button>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeEntries.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
             <Archive size={48} className="mx-auto text-slate-200 mb-4" />
             <p className="text-xs font-black uppercase opacity-20 italic">No active production nodes</p>
          </div>
        ) : (
          activeEntries.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:border-blue-600 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">LOT PASSPORT</p>
                      <p className="text-2xl font-black italic tracking-tighter text-blue-600 leading-none">#{item.lotNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">OPERATOR</p>
                      <p className="text-xs font-black uppercase truncate max-w-[100px] leading-none">{item.worker}</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 italic">MODEL & COLOR</p>
                      <p className="text-[10px] font-black uppercase italic truncate">{item.design} // {item.color}</p>
                    </div>
                    <div className="flex justify-between items-center px-2 py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">SIZE</p>
                            <p className="text-2xl font-black uppercase italic text-black dark:text-white">{item.size}</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">BORKA (B)</p>
                                <p className="text-xl font-black italic">{item.issueBorka}</p>
                            </div>
                            <div className="text-center border-l border-slate-100 dark:border-slate-800 pl-4">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">HIJAB (H)</p>
                                <p className="text-xl font-black italic">{item.issueHijab}</p>
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-6 border-t border-slate-50 dark:border-slate-800 border-dashed mb-6">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">TOTAL OUTPUT</p>
                      <p className="text-4xl font-black italic tracking-tighter leading-none text-black dark:text-white">{item.issueBorka + item.issueHijab} <span className="text-xs opacity-40">PCS</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                const workerPhone = (masterData.workerDocs || []).find(d => d.name === item.worker)?.phone;
                                if (!workerPhone) return showNotify("কর্মী ফোন নম্বর পাওয়া যায়নি!", "error");
                                const msg = `NRZONE UPDATE:\nTask: ${type.toUpperCase()}\nLot: #${item.lotNo}\nModel: ${item.design}\nSize: ${item.size}\nBorka (B): ${item.issueBorka} PCS\nHijab (H): ${item.issueHijab} PCS\nTotal: ${item.issueBorka + item.issueHijab} PCS\nStatus: ${item.status}`;
                                const intl = workerPhone.replace(/\D/g, "").startsWith("880") ? workerPhone.replace(/\D/g, "") : "880" + workerPhone.replace(/\D/g, "").replace(/^0/, "");
                                window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, "_blank");
                            }} 
                            className="w-10 h-10 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                            <MessageCircle size={16} />
                        </button>
                        <button onClick={() => setPrintSlip(item)} className="w-10 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"><Printer size={16} /></button>
                    </div>
                  </div>
              </div>

              <div className="flex gap-2">
                {item.status === 'Pending' ? (
                  (() => {
                    const designObj = (masterData.designs || []).find(d => d.name === item.design);
                    const hasStone = Number(designObj?.stoneRate || 0) > 0;
                    
                    if (type === 'sewing' && hasStone) {
                      const stoneEntry = (masterData.productions || []).find(p => p.lotNo === item.lotNo && p.type === 'stone');
                      const stoneReceived = stoneEntry?.status === 'Received';
                      
                      if (!item.sentToStone) {
                        return (
                          <button onClick={() => { setReceiveState({ rBorka: item.issueBorka, rHijab: item.issueHijab, penalty: 0, date: new Date().toISOString().split("T")[0] }); setReceiveModal({ ...item, isSendingToStone: true }); }} className="flex-1 h-12 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest italic shadow-lg hover:bg-blue-700 transition-all">পাথরে পাঠান (SEND)</button>
                        );
                      }
                      if (!stoneReceived) {
                        return (
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black uppercase text-[8px] tracking-widest italic border border-amber-100 animate-pulse">IN STONE...</div>
                            {isAdmin && <button onClick={() => { setReceiveState({ rBorka: item.receivedBorka || item.issueBorka, rHijab: item.receivedHijab || item.issueHijab, penalty: 0, date: new Date().toISOString().split("T")[0] }); setReceiveModal(item); }} className="h-8 bg-rose-600 text-white rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg">⚡ BYPASS</button>}
                          </div>
                        );
                      }
                    }
                    return (
                      <button onClick={() => { setReceiveState({ rBorka: item.receivedBorka || item.issueBorka, rHijab: item.receivedHijab || item.issueHijab, penalty: 0, date: new Date().toISOString().split("T")[0] }); setReceiveModal(item); }} className="flex-1 h-12 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest italic shadow-lg hover:bg-emerald-600 transition-all">জমা নিন (REC)</button>
                    );
                  })()
                ) : (
                  <div className="flex-1 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black uppercase text-[8px] tracking-widest italic border border-emerald-100">RECEIVED: {item.receiveDate}</div>
                )}
                {isAdmin && (
                  <button onClick={() => { if (window.confirm('মুছে ফেলতে চান?')) setMasterData(prev => ({ ...prev, productions: prev.productions.filter(p => p.id !== item.id) })); }} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-100"><Trash2 size={18} /></button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 relative border-4 border-slate-50 overflow-y-auto max-h-[95vh]">
                <button onClick={() => setShowIssueModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-black z-10"><X size={32} /></button>
                <h2 className="text-3xl font-black uppercase italic mb-8 text-center text-black dark:text-white">নতুন {type === 'sewing' ? 'সেলাই' : 'স্টোন'} কাজ <span className="text-blue-600">ইস্যু করুন</span></h2>

                <div className="mb-10">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-4 ml-4 tracking-widest">সহজ লট সিলেকশন (Available Stock)</p>
                   <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2">
                      {availableLots.map(l => (
                        <button 
                          key={l.lotNo}
                          onClick={() => handleLotSelect(`${l.design}|${l.color}|${l.lotNo}`)}
                          className={`flex-shrink-0 px-6 py-4 rounded-2xl border-2 transition-all text-left ${selection.lotNo === l.lotNo ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        >
                          <p className="text-[9px] font-black uppercase opacity-40">#{l.lotNo}</p>
                          <p className="text-sm font-black uppercase truncate max-w-[120px]">{l.design}</p>
                          <div className="flex gap-2 mt-1">
                             <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">{Object.values(l.sizes).reduce((s,q)=>s+q.borka,0)}B</span>
                             <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">{Object.values(l.sizes).reduce((s,q)=>s+q.hijab,0)}H</span>
                          </div>
                        </button>
                      ))}
                      {availableLots.length === 0 && <p className="text-[10px] font-black uppercase text-rose-500 p-4">স্টকে কোনো লট নেই!</p>}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-7 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">লট নম্বর (Lot)</label>
                            <div className="flex gap-2">
                                <select className="premium-input !h-14 font-black uppercase italic flex-1 dark:bg-slate-800 dark:text-white" value={`${selection.design}|${selection.color}|${selection.lotNo}`} onChange={(e) => handleLotSelect(e.target.value)}>
                                  <option value="">-- SELECT LOT --</option>
                                  {availableLots.map(l => (
                                    <option key={l.lotNo} value={`${l.design}|${l.color}|${l.lotNo}`}>{l.design} | #{l.lotNo}</option>
                                  ))}
                                </select>
                                <button 
                                    onClick={() => setSelection(p => ({ ...p, lotNo: nextFactoryLotNo, design: '', color: '', note: 'AUTO LOT' }))}
                                    className="px-4 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase italic shadow-lg hover:bg-black transition-all"
                                >
                                    AUTO
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">কারিগর</label>
                            <select className="premium-input !h-14 font-black uppercase italic dark:bg-slate-800 dark:text-white" value={selection.worker} onChange={(e) => setSelection(p => ({ ...p, worker: e.target.value, rate: (masterData.workerWages || {})[type]?.[e.target.value] || p.rate }))}>
                              <option value="">-- SELECT WORKER --</option>
                              {workersList.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                    </div>

                    {selection.lotNo && (
                       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                          <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform rotate-12"><Activity size={120} /></div>
                          <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">লট পাসপোর্ট (Lot Summary)</p>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                       <h3 className="text-4xl font-black uppercase italic tracking-tighter">{selection.design}</h3>
                                       <p className="text-[10px] font-black uppercase tracking-widest mt-2">{selection.color} // #{selection.lotNo}</p>
                                    </div>
                                    {type === 'stone' && (
                                       <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                                          <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Live Pata Stock</p>
                                          <p className="text-2xl font-black italic">
                                            {getPataStockItem(masterData, selection.design, selection.color, selection.pataType)} 
                                            <span className="text-[10px] ml-1 opacity-60">PCS</span>
                                          </p>
                                          <p className="text-[8px] font-black uppercase mt-1 text-blue-400">Type: {selection.pataType}</p>
                                       </div>
                                    )}
                                 </div>
                          </div>
                       </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">মজুরি রেট</label><input type="number" className="premium-input !h-14 font-black text-emerald-600 italic dark:bg-slate-800 dark:text-emerald-400" value={selection.rate} onChange={(e) => setSelection(p => ({ ...p, rate: e.target.value }))} /></div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">তারিখ</label><input type="date" className="premium-input !h-14 font-black italic dark:bg-slate-800 dark:text-white" value={selection.date} onChange={(e) => setSelection(p => ({ ...p, date: e.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col h-full">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-10 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800">
                         <div className="flex justify-between items-center mb-8 px-4">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">সাইজ ও পরিমাণ (Production Queue)</p>
                            {type === 'stone' && (
                               <div className="flex gap-4">
                                  <label className="text-[9px] font-black uppercase text-slate-400">Parts Type:</label>
                                  <div className="flex gap-2">
                                     {['Single', 'Double'].map(t => (
                                        <button key={t} onClick={() => setSelection(p => ({ ...p, pataType: t }))} className={`px-4 py-1 rounded-full text-[9px] font-black uppercase transition-all ${selection.pataType === t ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{t}</button>
                                     ))}
                                  </div>
                               </div>
                            )}
                         </div>
                         <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4 no-scrollbar">
                           {issueSizes.map((s, idx) => (
                             <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6 group">
                                <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-xl italic shadow-lg group-hover:scale-110 transition-transform">{s.size}</div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6">
                                   <div><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">বোরকা (B)</label><input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-black text-lg text-center dark:text-white" value={s.borka} onChange={(e) => { const n = [...issueSizes]; n[idx].borka = Number(e.target.value); setIssueSizes(n); }} /></div>
                                   <div><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">হিজাব (H)</label><input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-black text-lg text-center dark:text-white" value={s.hijab} onChange={(e) => { const n = [...issueSizes]; n[idx].hijab = Number(e.target.value); setIssueSizes(n); }} /></div>
                                   {type === 'stone' && (
                                      <div><label className="text-[9px] font-black uppercase text-blue-600 mb-1 block">Pata Qty</label><input type="number" className="w-full bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl font-black text-lg text-center text-blue-600 dark:text-blue-400" value={s.pataQty} onChange={(e) => { const n = [...issueSizes]; n[idx].pataQty = Number(e.target.value); setIssueSizes(n); }} /></div>
                                   )}
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    <div className="flex gap-4 mt-6">
                        <button onClick={() => handleIssue(false)} className="flex-1 py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-blue-700 transition-all">সংরক্ষণ করুন (SAVE)</button>
                        <button onClick={() => handleIssue(true)} className="flex-[2] py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                            <Printer size={24} /> সংরক্ষণ ও প্রিন্ট (PRINT)
                        </button>
                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}

        {ledgerModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 relative border-4 border-slate-50 overflow-y-auto max-h-[90vh]">
                <button onClick={() => setLedgerModal(false)} className="absolute top-10 right-10 text-slate-400 z-10"><X size={32} /></button>
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-black dark:text-white">{type.toUpperCase()} WORKER <span className="text-blue-600">LEDGER</span></h2>
                      <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest italic">Total workforce synchronized balance</p>
                   </div>
                   {selectedWorkerLedger && (
                     <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl">
                        <input type="date" className="premium-input !h-10 !w-32 text-[10px]" value={reportRange.start} onChange={e => setReportRange(p => ({ ...p, start: e.target.value }))} />
                        <span className="text-[10px] font-black opacity-20">TO</span>
                        <input type="date" className="premium-input !h-10 !w-32 text-[10px]" value={reportRange.end} onChange={e => setReportRange(p => ({ ...p, end: e.target.value }))} />
                        <button onClick={() => setPrintReport(selectedWorkerLedger)} className="px-6 py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Printer size={14} /> Download PDF</button>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-4 space-y-3">
                     {workersList.map(w => {
                        const bal = getWorkerBalance(masterData, w, type);
                        return (
                          <button key={w} onClick={() => setSelectedWorkerLedger(w)} className={`w-full p-6 rounded-3xl border-2 transition-all flex justify-between items-center ${selectedWorkerLedger === w ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-white hover:border-slate-200'}`}>
                             <div className="text-left"><p className="text-xs font-black uppercase italic">{w}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{type} Unit</p></div>
                             <p className="text-xl font-black italic tracking-tighter">৳{bal.balance.toLocaleString()}</p>
                          </button>
                        );
                     })}
                  </div>
                  <div className="md:col-span-8 bg-slate-50 rounded-[2.5rem] p-10 border border-white relative min-h-[500px]">
                     {selectedWorkerLedger ? (
                       <div className="space-y-6">
                          <div className="flex justify-between items-center border-b-2 border-slate-200 border-dashed pb-6">
                             <h4 className="text-2xl font-black italic uppercase">{selectedWorkerLedger} <span className="text-blue-600">History</span></h4>
                             <button onClick={() => setPayModal(selectedWorkerLedger)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Make Payment</button>
                          </div>
                          <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                             {getWorkerHistory(selectedWorkerLedger).map((h, i) => (
                               <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                                  <div>
                                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic mb-2 inline-block ${h.entryType === 'PRODUCTION' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>{h.entryType}</span>
                                     <p className="text-xs font-black uppercase italic">{h.entryType === 'PRODUCTION' ? `${h.design} #${h.lotNo} (${h.issueBorka+h.issueHijab}P)` : 'Manual Cash Payment'}</p>
                                     <p className="text-[9px] font-bold text-slate-400 italic mt-1">{h.sortDate}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className={`text-xl font-black italic ${h.entryType === 'PRODUCTION' ? 'text-black' : 'text-emerald-500'}`}>{h.entryType === 'PRODUCTION' ? `৳${((h.receivedBorka||0)+(h.receivedHijab||0)) * (h.rate||0) - (h.penalty||0)}` : `- ৳${h.amount}`}</p>
                                  </div>
                               </div>
                             ))}
                             {getWorkerHistory(selectedWorkerLedger).length === 0 && <p className="text-center py-20 opacity-20 font-black uppercase text-[10px] tracking-[0.5em]">No records found for this period</p>}
                          </div>
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                          <UserCheck size={64} className="mb-6" />
                          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Select a worker to audit</p>
                       </div>
                     )}
                  </div>
                </div>
             </motion.div>
          </div>
        )}

        {receiveModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border-4 border-slate-50">
                 <button onClick={() => setReceiveModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                 <h2 className="text-2xl font-black uppercase italic mb-8 text-center text-black dark:text-white">{receiveModal.worker} <span className="text-emerald-500">{receiveModal.isSendingToStone ? 'পাথরে পাঠান' : 'জমা দিন'}</span></h2>
                 <form onSubmit={handleConfirmReceive} className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 dark:bg-slate-800 rounded-3xl border border-white dark:border-slate-700 text-center">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">বোরকা (Good)</p>
                          <input type="number" className="w-full text-2xl font-black bg-transparent outline-none italic text-center" value={receiveState.rBorka} onChange={(e) => setReceiveState(p => ({ ...p, rBorka: e.target.value }))} autoFocus />
                        </div>
                        <div className="p-6 bg-rose-50 dark:bg-slate-800 rounded-3xl border border-white dark:border-slate-700 text-center">
                          <p className="text-[10px] font-black uppercase text-rose-400 mb-2">বোরকা (Nosto)</p>
                          <input type="number" className="w-full text-2xl font-black bg-transparent outline-none italic text-center text-rose-500" value={receiveState.nostoBorka || 0} onChange={(e) => setReceiveState(p => ({ ...p, nostoBorka: e.target.value }))} />
                        </div>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-slate-800 rounded-2xl border border-white dark:border-slate-700 text-center">
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1">হিজাব (Good)</p>
                          <input type="number" className="w-full text-xl font-black bg-transparent outline-none italic text-center" value={receiveState.rHijab} onChange={(e) => setReceiveState(p => ({ ...p, rHijab: e.target.value }))} />
                        </div>
                        <div className="p-4 bg-rose-50 dark:bg-slate-800 rounded-2xl border border-white dark:border-slate-700 text-center">
                          <p className="text-[9px] font-black uppercase text-rose-400 mb-1">হিজাব (Nosto)</p>
                          <input type="number" className="w-full text-xl font-black bg-transparent outline-none italic text-center text-rose-500" value={receiveState.nostoHijab || 0} onChange={(e) => setReceiveState(p => ({ ...p, nostoHijab: e.target.value }))} />
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-slate-800 rounded-2xl border border-white dark:border-slate-700 text-center">
                          <p className="text-[9px] font-black uppercase text-amber-500 mb-1">হিজাব (Missing)</p>
                          <input type="number" className="w-full text-xl font-black bg-transparent outline-none italic text-center text-amber-600" value={receiveState.missingHijab || 0} onChange={(e) => setReceiveState(p => ({ ...p, missingHijab: e.target.value }))} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">জরিমানা (Penalty)</label><input type="number" className="premium-input !h-14 font-black text-rose-500 italic" value={receiveState.penalty} onChange={(e) => setReceiveState(p => ({ ...p, penalty: e.target.value }))} /></div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">জমার তারিখ</label><input type="date" className="premium-input !h-14 font-black italic" value={receiveState.date} onChange={(e) => setReceiveState(p => ({ ...p, date: e.target.value }))} /></div>
                     </div>
                     <button type="submit" className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-emerald-500 transition-all">কনফার্ম করুন (RECEIVE)</button>
                 </form>
             </motion.div>
          </div>
        )}

        {payModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border-4 border-slate-50">
                <button onClick={() => setPayModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                <h2 className="text-2xl font-black uppercase italic mb-8 text-center text-black dark:text-white">{payModal} <span className="text-blue-600">পেমেন্ট</span></h2>
                <div className="mb-10 text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-white dark:border-slate-700">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-2">মোট বকেয়া ব্যালেন্স</p>
                   <p className="text-5xl font-black tracking-tighter italic">৳{getWorkerBalance(masterData, payModal, type).balance.toLocaleString()}</p>
                </div>
                <div className="space-y-6">
                   <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">টাকার পরিমাণ (Amount)</label><input type="number" className="premium-input !h-20 text-4xl font-black text-blue-600 italic text-center" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" autoFocus /></div>
                   <button onClick={handlePayment} className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-black transition-all">পেমেন্ট কনফার্ম (PAY NOW)</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FactoryPanel;
