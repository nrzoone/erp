import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  X,
  Printer,
  ArrowLeft,
  Settings,
  Search,
  Camera,
  CheckCircle,
  ExternalLink,
  DollarSign,
  Box,
  Clock,
  Activity,
  Layers,
  UserCheck,
  Download,
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { syncToSheet } from '../../utils/syncUtils';
import NRZLogo from "../NRZLogo";
import QRScanner from '../QRScanner';
import UniversalSlip from '../UniversalSlip';
import WorkerSummary from '../WorkerSummary';

const OutsideWorkPanel = ({ masterData, setMasterData, showNotify, user, setActivePanel, t, logAction, SafeText, setTrackingId }) => {
    const [showModal, setShowModal] = useState(false);
    const [view, setView] = useState('active'); // 'active', 'history', 'workers'
    const [searchTerm, setSearchTerm] = useState('');
    const [lotSearch, setLotSearch] = useState('');
    const [payModal, setPayModal] = useState(null);
    const [receiveModal, setReceiveModal] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [printSlip, setPrintSlip] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [ledgerModal, setLedgerModal] = useState(false);
    const [selectedWorkerLedger, setSelectedWorkerLedger] = useState(null);
    const [reportRange, setReportRange] = useState({ start: "", end: "" });
    const [printReport, setPrintReport] = useState(null);

    const role = user?.role?.toLowerCase();
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isWorker = role !== 'admin' && role !== 'manager';

    const [entryData, setEntryData] = useState({
        worker: '',
        client: 'FACTORY',
        design: '',
        size: '',
        task: '',
        borkaQty: '',
        hijabQty: '',
        rate: '',
        note: '',
        date: new Date().toISOString().split('T')[0]
    });

    // 🚀 Advanced Lot Synchronization Logic
    const nextOutsideLotNo = useMemo(() => {
        const numbers = (masterData.outsideWork || [])
            .map(e => parseInt(e.lotNo))
            .filter(n => !isNaN(n));
        const max = numbers.length > 0 ? Math.max(...numbers) : 5000;
        return (max + 1).toString();
    }, [masterData.outsideWork]);

    const availableLots = useMemo(() => {
        const lotsMap = {};
        
        // 1. From Cutting
        (masterData.cuttingStock || []).forEach(l => {
            const key = `CUT|${l.design}|${l.lotNo}`;
            if (!lotsMap[key]) {
                lotsMap[key] = { ...l, source: 'Cutting', borka: 0, hijab: 0 };
            }
            lotsMap[key].borka += Number(l.borka || 0);
            lotsMap[key].hijab += Number(l.hijab || 0);
        });

        // 2. From Sewing (Finished)
        (masterData.productions || [])
            .filter(p => p.type === 'sewing' && p.status === 'Received')
            .forEach(p => {
                const key = `SWING|${p.design}|${p.lotNo}`;
                if (!lotsMap[key]) {
                    lotsMap[key] = { ...p, source: 'Sewing', borka: 0, hijab: 0 };
                }
                lotsMap[key].borka += Number(p.receivedBorka || 0);
                lotsMap[key].hijab += Number(p.receivedHijab || 0);
            });

        return Object.values(lotsMap).sort((a,b) => b.lotNo - a.lotNo);
    }, [masterData]);

    const handleLotSelect = (lot) => {
        if (!lot) return;
        setEntryData(prev => ({
            ...prev,
            lotNo: lot.lotNo,
            design: lot.design,
            color: lot.color || '',
            client: lot.client || 'FACTORY',
            borkaQty: lot.borka || 0,
            hijabQty: lot.hijab || 0,
            note: `REF: ${lot.source} Lot #${lot.lotNo}`
        }));
        showNotify(`${lot.source} Lot #${lot.lotNo} Synced!`, "success");
    };

    const handleLotSearch = (lotNo) => {
        if (!lotNo) return;
        const lot = availableLots.find(l => String(l.lotNo) === String(lotNo));
        if (lot) handleLotSelect(lot);
        else showNotify("Lot not found in system!", "error");
    };



    const handleSaveIssue = (shouldPrint) => {
        if (!entryData.worker || !entryData.task || (!entryData.borkaQty && !entryData.hijabQty)) {
            return showNotify('কারিগর, কাজ এবং পরিমাণ আবশ্যক!', 'error');
        }

        const newEntry = {
            id: `outside_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            lotNo: entryData.lotNo || 'N/A',
            date: entryData.date ? new Date(entryData.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
            worker: entryData.worker,
            client: entryData.client || 'FACTORY',
            design: entryData.design || 'N/A',
            size: entryData.size || 'N/A',
            task: entryData.task,
            borkaQty: Number(entryData.borkaQty || 0),
            hijabQty: Number(entryData.hijabQty || 0),
            rate: Number(entryData.rate || 0),
            note: entryData.note,
            status: 'Pending',
            totalAmount: 0,
            paidAmount: 0
        };

        setMasterData(prev => ({
            ...prev,
            outsideWorkEntries: [newEntry, ...(prev.outsideWorkEntries || [])]
        }));

        if (shouldPrint) setPrintSlip(newEntry);
        logAction(user, 'OUTSIDE_ISSUE', `${newEntry.worker} - ${newEntry.task}`);
        setShowModal(false);
        setEntryData({ worker: '', client: 'FACTORY', design: '', task: '', borkaQty: '', hijabQty: '', rate: '', note: '', date: new Date().toISOString().split('T')[0] });
        showNotify('কাজ সফলভাবে ইস্যু হয়েছে!');
    };

    const handleConfirmReceive = (e) => {
        e.preventDefault();
        const rBorka = Number(receiveModal.rBorkaQty) || 0;
        const rHijab = Number(receiveModal.rHijabQty) || 0;
        const totalAmount = (rBorka + rHijab) * Number(receiveModal.rate);

        setMasterData(prev => ({
            ...prev,
            outsideWorkEntries: prev.outsideWorkEntries.map(entry => entry.id === receiveModal.id ? {
                ...entry,
                borkaQty: rBorka,
                hijabQty: rHijab,
                status: 'Received',
                receivedDate: receiveModal.receiveDate ? new Date(receiveModal.receiveDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                totalAmount: totalAmount
            } : entry)
        }));

        setReceiveModal(null);
        showNotify('কাজ জমা নেওয়া হয়েছে!');
    };

    const handlePayment = () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) return;

        const amount = Number(paymentAmount);
        setMasterData(prev => ({
            ...prev,
            outsideWorkEntries: prev.outsideWorkEntries.map(e => e.id === payModal.id ? {
                ...e,
                paidAmount: Number(e.paidAmount || 0) + amount
            } : e),
            expenses: [
                {
                    id: `exp_out_${Date.now()}`,
                    date: paymentDate || new Date().toISOString().split('T')[0],
                    category: 'salary',
                    description: `OUTSIDE PMT: ${payModal.worker} - ${payModal.task}`,
                    amount: amount
                },
                ...(prev.expenses || [])
            ]
        }));

        setPayModal(null);
        setPaymentAmount('');
        showNotify('পেমেন্ট সফলভাবে ব্যালেন্সে যুক্ত হয়েছে!');
    };

    const handleDelete = (id) => {
        if (!isAdmin) return showNotify('শুধুমাত্র এডমিন রেকর্ড মুছতে পারবেন!', 'error');
        if (!window.confirm('মুছে ফেলতে চান?')) return;
        setMasterData(prev => ({
            ...prev,
            outsideWorkEntries: (prev.outsideWorkEntries || []).filter(item => item.id !== id)
        }));
        showNotify('এন্ট্রি মুছে ফেলা হয়েছে!');
    };

    const filteredEntries = useMemo(() => {
        return (masterData.outsideWorkEntries || []).filter(e => {
            if (isWorker && e.worker?.toLowerCase() !== user?.name?.toLowerCase()) return false;
            return (e.worker?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (e.task?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        });
    }, [masterData.outsideWorkEntries, isWorker, user, searchTerm]);

    const getWorkerHistory = (name) => {
        const prods = (masterData.outsideWorkEntries || []).filter(p => p.worker === name && p.status === 'Received');
        const pays = (masterData.workerPayments || []).filter(p => p.worker === name && (p.dept === 'outside' || p.dept === 'External'));
        
        let combined = [
            ...prods.map(p => ({ ...p, sortDate: p.receiveDate || p.date, entryType: 'PRODUCTION', amount: p.totalAmount })),
            ...pays.map(p => ({ ...p, sortDate: p.date, entryType: 'PAYMENT' }))
        ];

        if (reportRange.start) combined = combined.filter(i => new Date(i.sortDate.split('/').reverse().join('-')) >= new Date(reportRange.start));
        if (reportRange.end) combined = combined.filter(i => new Date(i.sortDate.split('/').reverse().join('-')) <= new Date(reportRange.end));

        return combined.sort((a, b) => new Date(b.sortDate.split('/').reverse().join('-')) - new Date(a.sortDate.split('/').reverse().join('-')));
    };

    const activeEntries = useMemo(() => filteredEntries.filter(e => e.status === 'Pending'), [filteredEntries]);
    const historyEntries = useMemo(() => filteredEntries.filter(e => e.status === 'Received'), [filteredEntries]);

    if (printReport) {
        const history = getWorkerHistory(printReport);
        const earned = history.filter(h => h.entryType === 'PRODUCTION').reduce((s, h) => s + (h.amount || 0), 0);
        const paid = history.filter(h => h.entryType === 'PAYMENT').reduce((s, h) => s + (h.amount || 0), 0);

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
                    <h1 className="text-4xl font-black mt-4 italic uppercase">Outside Work Statement</h1>
                    <p className="text-[10px] font-black tracking-[0.4em] opacity-40">LEDGER AUDIT // {printReport}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-3xl font-black italic">{new Date().toLocaleDateString()}</p>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-2">Verified External Output</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-10 mb-12 bg-slate-50 p-10 rounded-[3rem]">
                 <div>
                    <p className="text-[10px] font-black uppercase opacity-40 mb-2">Total Earnings</p>
                    <p className="text-4xl font-black italic">৳{earned.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-2">Net Balance</p>
                    <p className="text-4xl font-black italic text-blue-600">৳{(earned - paid).toLocaleString()}</p>
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
                      <td className="py-4 px-2">{h.entryType === 'PRODUCTION' ? `${h.design} #${h.lotNo} (${h.task})` : 'Cash Payment'}</td>
                      <td className="py-4 px-2 text-right tabular-nums">{h.entryType === 'PRODUCTION' ? `৳${h.amount || 0}` : '-'}</td>
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
                <div className="no-print flex justify-between items-center mb-10 max-w-5xl mx-auto">
                    <button onClick={() => setPrintSlip(null)} className="px-8 py-4 bg-slate-50 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">বাতিল (Cancel)</button>
                    <button onClick={() => window.print()} className="action-btn-primary !px-12 !py-4 shadow-xl">
                        <Printer size={18} /> স্লিপ প্রিন্ট করুন (PDF)
                    </button>
                </div>
                <div className="w-[210mm] mx-auto bg-white border border-slate-100 shadow-2xl p-1 relative">
                    <UniversalSlip data={printSlip} type="ISSUE" copyTitle="কারিগর কপি (RECIPIENT)" SafeText={SafeText} />
                    <div className="h-4 border-t-2 border-dashed border-slate-300 my-10"></div>
                    <UniversalSlip data={printSlip} type="ISSUE" copyTitle="অফিস কপি (OFFICE)" SafeText={SafeText} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-32 animate-fade-up px-1 md:px-2 italic font-outfit text-black dark:text-white">
            {/* SaaS Operational HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => setView('active')}
                  className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 flex items-center gap-8 group transition-all text-left shadow-2xl ${view === 'active' ? 'border-amber-500' : 'border-slate-50 dark:border-slate-800'}`}
                >
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-3 ${view === 'active' ? 'bg-amber-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter leading-none mb-2">{activeEntries.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none opacity-40">চলমান কাজ (ACTIVE)</p>
                    </div>
                </button>

                <button 
                  onClick={() => setView('history')}
                  className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 flex items-center gap-8 group transition-all text-left shadow-2xl ${view === 'history' ? 'border-emerald-500' : 'border-slate-50 dark:border-slate-800'}`}
                >
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-3 ${view === 'history' ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter leading-none mb-2">{historyEntries.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none opacity-40">জমা হওয়া রেকর্ড (HISTORY)</p>
                    </div>
                </button>

                <button onClick={() => setLedgerModal(true)} className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl flex items-center justify-between group overflow-hidden relative border-4 border-slate-900 transition-all hover:border-blue-500">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-white group-hover:scale-150 transition-transform"><UserCheck size={120} /></div>
                    <div className="flex items-center gap-8 relative z-10">
                        <div className="w-16 h-16 bg-white/10 text-white rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <UserCheck size={32} />
                        </div>
                        <div>
                            <p className="text-3xl font-black tracking-tighter leading-none mb-2">৳{historyEntries.reduce((acc, curr) => acc + (curr.totalAmount - (curr.paidAmount || 0)), 0).toLocaleString()}</p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">কারিগর লেজার (WORKER LEDGER)</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Control Bar */}
            <div className="bg-white dark:bg-slate-900 p-2 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[2rem] border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar gap-2">
                    {['active', 'history', 'workers'].filter(v => !isWorker || v !== 'workers').map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex-1 md:flex-none px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400'}`}
                        >
                            {v === 'active' ? 'চলমান কাজ' : v === 'history' ? 'পুরাতন হিস্ট্রি' : 'কারিগর তালিকা'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="relative group flex-1">
                        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="খুঁজুন..."
                            className="bg-slate-50 dark:bg-slate-800/50 h-14 pl-14 pr-6 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black dark:text-white outline-none w-full md:w-64 border-2 border-transparent focus:border-black transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setShowQR(true)} className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-black transition-all group">
                        <Camera size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                    {(isAdmin || isManager) && (
                        <button onClick={() => setShowModal(true)} className="h-14 bg-slate-950 text-white px-8 rounded-2xl flex items-center gap-3 shadow-2xl font-black uppercase text-[10px] tracking-widest italic animate-pulse">
                            <Plus size={20} /> নতুন কাজ
                        </button>
                    )}
                </div>
            </div>

        {showModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 relative border-4 border-slate-50 overflow-y-auto max-h-[95vh] italic">
                <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-400 z-10"><X size={32} /></button>
                <h2 className="text-3xl font-black uppercase italic mb-8 text-center text-black dark:text-white">বাইরের কাজ <span className="text-blue-600">ইস্যু করুন</span></h2>

                {/* 🚀 Stock Suggester Bar */}
                <div className="mb-10">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-4 ml-4 tracking-widest">রেফারেন্স লট (Select from Cutting/Swing)</p>
                   <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2 no-scrollbar">
                      {availableLots.slice(0, 20).map(l => (
                        <button 
                          key={`${l.source}|${l.lotNo}|${l.design}`}
                          onClick={() => handleLotSelect(l)}
                          className={`flex-shrink-0 px-6 py-4 rounded-2xl border-2 transition-all text-left ${String(entryData.lotNo) === String(l.lotNo) ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                        >
                          <p className="text-[8px] font-black uppercase opacity-40">#{l.lotNo} ({l.source})</p>
                          <p className="text-xs font-black uppercase truncate max-w-[120px] text-slate-900 dark:text-white">{l.design}</p>
                          <div className="flex gap-2 mt-1">
                             <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">{l.borka}B</span>
                             <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">{l.hijab}H</span>
                          </div>
                        </button>
                      ))}
                      <button onClick={() => setEntryData(p => ({ ...p, lotNo: '', design: '', borkaQty: '', hijabQty: '', note: 'MANUAL ENTRY' }))} className="flex-shrink-0 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-[10px] font-black uppercase text-slate-400 hover:border-black hover:text-black transition-all italic">Manual Entry</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex justify-between">
                            <span>লট নম্বর (Lot)</span>
                            <button onClick={() => { const l = prompt('Enter Lot Number:'); if (l) handleLotSearch(l); }} className="text-blue-600 hover:underline">খুঁজুন</button>
                        </label>
                        <div className="relative flex gap-2">
                           <input className="premium-input !h-14 font-black uppercase italic dark:bg-slate-800 dark:text-white" value={entryData.lotNo} onChange={e => setEntryData({ ...entryData, lotNo: e.target.value })} placeholder="LOT NO..." />
                           <button 
                            onClick={() => setEntryData(p => ({ ...p, lotNo: nextOutsideLotNo, design: '', note: 'AUTO GENERATED' }))}
                            className="px-4 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase italic shadow-lg hover:bg-black transition-all"
                           >
                             AUTO
                           </button>
                        </div>
                      </div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">কারিগর (Contractor)</label><input className="premium-input !h-14 font-black uppercase italic" value={entryData.worker} onChange={e => setEntryData({ ...entryData, worker: e.target.value })} placeholder="CONTRACTOR NAME..." /></div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">ডিজাইন / মডেল</label>
                      <select 
                        className="premium-input !h-14 font-black uppercase italic" 
                        value={entryData.design} 
                        onChange={e => setEntryData({ ...entryData, design: e.target.value })}
                      >
                        <option value="">ডিজাইন নির্বাচন করুন...</option>
                        {(masterData.designs || []).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">কাজের ধরন (Task)</label><input className="premium-input !h-14 font-black uppercase italic text-blue-600" value={entryData.task} onChange={e => setEntryData({ ...entryData, task: e.target.value })} placeholder="E.G. EMBROIDERY / STONE..." /></div>
                       <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">মজুরি রেট</label><input type="number" className="premium-input !h-14 font-black text-emerald-600 italic text-center" value={entryData.rate} onChange={e => setEntryData({ ...entryData, rate: e.target.value })} placeholder="0.00" /></div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/30">
                        <label className="text-[9px] font-black uppercase text-emerald-600 mb-2 block">বোরকা পরিমাণ</label>
                        <input type="number" className="w-full bg-transparent text-3xl font-black italic outline-none text-emerald-700 dark:text-emerald-400" value={entryData.borkaQty} onChange={e => setEntryData({ ...entryData, borkaQty: e.target.value })} />
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border-2 border-blue-100 dark:border-blue-900/30">
                        <label className="text-[9px] font-black uppercase text-blue-600 mb-2 block">হিজাব পরিমাণ</label>
                        <input type="number" className="w-full bg-transparent text-3xl font-black italic outline-none text-blue-700 dark:text-blue-400" value={entryData.hijabQty} onChange={e => setEntryData({ ...entryData, hijabQty: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">পার্টি / ক্লায়েন্ট</label><input className="premium-input !h-14 font-black uppercase italic" value={entryData.client} onChange={e => setEntryData({ ...entryData, client: e.target.value })} /></div>
                       <div><label className="text-[10px] font-black uppercase text-slate-400 ml-4">তারিখ</label><input type="date" className="premium-input !h-14 font-black italic" value={entryData.date} onChange={e => setEntryData({ ...entryData, date: e.target.value })} /></div>
                    </div>

                    <div className="relative">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">অতিরিক্ত নোট</label>
                      <textarea className="premium-input !h-20 py-4 font-bold uppercase italic" value={entryData.note} onChange={e => setEntryData({ ...entryData, note: e.target.value })} placeholder="ADDITIONAL NOTES..."></textarea>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => handleSaveIssue(false)} className="flex-1 py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-blue-700 transition-all">সংরক্ষণ করুন (SAVE)</button>
                        <button onClick={() => handleSaveIssue(true)} className="flex-[2] py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                            <Printer size={24} /> সংরক্ষণ ও প্রিন্ট (PRINT)
                        </button>
                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {view === 'workers' ? (
              <div className="col-span-full">
                <WorkerSummary
                  masterData={masterData}
                  setMasterData={setMasterData}
                  showNotify={showNotify}
                  user={user}
                  logAction={logAction}
                  setActivePanel={setActivePanel}
                  SafeText={SafeText}
                  dept="outside"
                />
              </div>
            ) : (view === 'active' ? activeEntries : historyEntries).length === 0 ? (
                <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-50 italic flex flex-col items-center justify-center opacity-40 italic font-black uppercase text-[10px] tracking-[0.5em]">
                    <Activity size={48} className="mb-6" />
                    Zero Registry Found
                </div>
            ) : (view === 'active' ? activeEntries : historyEntries).map((item, idx) => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-[3rem] shadow-xl hover:border-black transition-all flex flex-col group p-10 space-y-8 animate-fade-up">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none italic">চুক্তিভিত্তিক কারিগর</p>
                                <h4 className="text-3xl font-black tracking-tighter text-black dark:text-white uppercase leading-none italic">{item.worker}</h4>
                            </div>
                            <div className={`w-14 h-14 ${item.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center border-2 border-white dark:border-slate-700`}>
                                <ExternalLink size={24} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-[2rem] border border-white dark:border-slate-700">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">কাজের ধরন</p>
                                <p className="text-sm font-black text-black dark:text-white truncate uppercase italic">{item.task}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-[2rem] border border-white dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">SIZE</p>
                                    <p className="text-2xl font-black text-black dark:text-white uppercase italic">{item.size}</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">B</p>
                                        <p className="text-lg font-black text-black dark:text-white italic">{item.borkaQty}</p>
                                    </div>
                                    <div className="text-center border-l border-slate-200 dark:border-slate-700 pl-4">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">H</p>
                                        <p className="text-lg font-black text-black dark:text-white italic">{item.hijabQty}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-8 border-y-2 border-slate-50 dark:border-slate-800 border-dashed">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none italic">অর্জিত বিল</span>
                                <span className="text-4xl font-black text-emerald-500 tracking-tighter italic">৳{((item.borkaQty + item.hijabQty) * item.rate).toLocaleString()}</span>
                             </div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none italic">তারিখ</span>
                                <p className="text-lg font-black text-black dark:text-white italic mt-1 font-mono tracking-tighter">{item.date}</p>
                             </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={() => {
                                    const workerPhone = (masterData.workerDocs || []).find(d => d.name === item.worker)?.phone;
                                    if (!workerPhone) return showNotify("কর্মী ফোন নম্বর পাওয়া যায়নি!", "error");
                                    const msg = `NRZONE UPDATE:\nTask: ${item.task.toUpperCase()}\nModel: ${item.design}\nSize: ${item.size}\nBorka (B): ${item.borkaQty} PCS\nHijab (H): ${item.hijabQty} PCS\nTotal: ${item.borkaQty + item.hijabQty} PCS\nStatus: ${item.status}`;
                                    const intl = workerPhone.replace(/\D/g, "").startsWith("880") ? workerPhone.replace(/\D/g, "") : "880" + workerPhone.replace(/\D/g, "").replace(/^0/, "");
                                    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, "_blank");
                                }} 
                                className="w-16 h-16 bg-emerald-50 text-emerald-600 border-2 border-transparent hover:border-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transition-all"
                            >
                                <MessageCircle size={24} />
                            </button>
                            <button onClick={() => setPrintSlip(item)} className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-xl border-2 border-transparent hover:border-black transition-all">
                                <Printer size={24} />
                            </button>
                            {item.status === 'Pending' ? (
                                (isAdmin || isManager) ? (
                                    <button onClick={() => setReceiveModal({ ...item, rBorkaQty: item.borkaQty, rHijabQty: item.hijabQty, receiveDate: new Date().toISOString().split('T')[0] })} className="flex-1 h-16 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest italic shadow-xl">কাজ জমা নিন</button>
                                ) : (
                                    <div className="flex-1 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center font-black uppercase text-[9px] tracking-widest italic border border-slate-200">PENDING...</div>
                                )
                            ) : (
                                (isAdmin || isManager) ? (
                                    <button onClick={() => setPayModal(item)} className="flex-1 h-16 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest italic shadow-xl">পেমেন্ট দিন</button>
                                ) : (
                                    <div className="flex-1 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest italic border border-emerald-100">RECEIVED</div>
                                )
                            )}
                            {isAdmin && (
                                <button onClick={() => handleDelete(item.id)} className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-xl">
                                    <Trash2 size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {receiveModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl p-12 relative border-4 border-slate-50">
                            <button onClick={() => setReceiveModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                            <h2 className="text-2xl font-black uppercase italic mb-8 text-center text-black dark:text-white">{receiveModal.worker} <span className="text-emerald-500">জমা দিন</span></h2>
                            <div className="grid grid-cols-2 gap-4 mb-8 text-center bg-slate-50 p-6 rounded-[2rem]">
                                <div><p className="text-[10px] font-black uppercase text-slate-400">বোরকা</p><input type="number" className="w-full text-center text-4xl font-black bg-transparent" value={receiveModal.rBorkaQty} onChange={(e) => setReceiveModal(p => ({ ...p, rBorkaQty: e.target.value }))} /></div>
                                <div><p className="text-[10px] font-black uppercase text-slate-400">হিজাব</p><input type="number" className="w-full text-center text-4xl font-black bg-transparent" value={receiveModal.rHijabQty} onChange={(e) => setReceiveModal(p => ({ ...p, rHijabQty: e.target.value }))} /></div>
                            </div>
                            <button onClick={handleConfirmReceive} className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase tracking-widest italic shadow-xl">জমা নিন (RECEIVE)</button>
                        </motion.div>
                    </div>
                )}

                {payModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl p-12 relative border-4 border-slate-50">
                            <button onClick={() => setPayModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                            <h2 className="text-2xl font-black uppercase italic mb-8 text-center text-black dark:text-white">{payModal.worker} <span className="text-emerald-500">পেমেন্ট</span></h2>
                            <div className="p-10 bg-slate-50 rounded-[2rem] text-center mb-8">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-4">টাকার পরিমাণ (৳)</p>
                                <input type="number" className="w-full text-5xl font-black text-center bg-transparent outline-none" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </div>
                            <button onClick={handlePayment} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest italic shadow-xl">কনফার্ম পেমেন্ট</button>
                        </motion.div>
                    </div>
                )}
                {showQR && (
                    <QRScanner 
                        onScanSuccess={(id) => { 
                            setLotSearch(id); 
                            handleLotSearch(id);
                            setShowQR(false); 
                            if (setTrackingId) setTrackingId(id);
                        }} 
                        onClose={() => setShowQR(false)} 
                        SafeText={SafeText} 
                    />
                )}
            </AnimatePresence>

            <div className="pt-24 pb-12 flex justify-center">
                <button
                    onClick={() => setActivePanel("Overview")}
                    className="group flex items-center gap-8 bg-white dark:bg-slate-900 px-16 py-8 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl hover:border-black transition-all duration-500"
                >
                    <div className="p-4 bg-slate-950 text-white rounded-2xl transition-transform shadow-2xl group-hover:-translate-x-4">
                        <ArrowLeft size={24} strokeWidth={3} />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-black dark:text-white uppercase leading-none italic">EXIT TO HUB</span>
                </button>
            </div>
            {ledgerModal && (
                  <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                     <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 relative border-4 border-slate-50 overflow-y-auto max-h-[90vh] italic no-scrollbar">
                        <button onClick={() => setLedgerModal(false)} className="absolute top-10 right-10 text-slate-400 z-10"><X size={32} /></button>
                        <div className="flex justify-between items-start mb-10">
                           <div>
                              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-black dark:text-white">OUTSIDE WORK <span className="text-blue-600">LEDGER</span></h2>
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest italic">External contractors synchronized balance</p>
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
                             {(masterData.workerDocs || []).filter(d => d.dept === 'outside').map(w => {
                                const earned = (masterData.outsideWorkEntries || []).filter(e => e.worker === w.name && e.status === 'Received').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
                                const paid = (masterData.workerPayments || []).filter(p => p.worker === w.name && (p.dept === 'outside' || p.dept === 'External')).reduce((acc, curr) => acc + (curr.amount || 0), 0);
                                return (
                                  <button key={w.id} onClick={() => setSelectedWorkerLedger(w.name)} className={`w-full p-6 rounded-3xl border-2 transition-all flex justify-between items-center ${selectedWorkerLedger === w.name ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-white hover:border-slate-200'}`}>
                                     <div className="text-left"><p className="text-xs font-black uppercase italic">{w.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{w.phone}</p></div>
                                     <p className="text-xl font-black italic tracking-tighter">৳{(earned - paid).toLocaleString()}</p>
                                  </button>
                                );
                             })}
                          </div>
                          <div className="md:col-span-8 bg-slate-50 rounded-[2.5rem] p-10 border border-white relative min-h-[500px]">
                             {selectedWorkerLedger ? (
                               <div className="space-y-6">
                                  <div className="flex justify-between items-center border-b-2 border-slate-200 border-dashed pb-6">
                                     <h4 className="text-2xl font-black italic uppercase">{selectedWorkerLedger} <span className="text-blue-600">History</span></h4>
                                     <div className="flex gap-2">
                                        <a href={`https://wa.me/${(masterData.workerDocs || []).find(w => w.name === selectedWorkerLedger)?.phone || ''}`} target="_blank" className="px-6 py-3 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2"><MessageCircle size={14} /> Msg</a>
                                        <button onClick={() => setPayModal(selectedWorkerLedger)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Payment</button>
                                     </div>
                                  </div>
                                  <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                                     {getWorkerHistory(selectedWorkerLedger).map((h, i) => (
                                       <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                                          <div>
                                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic mb-2 inline-block ${h.entryType === 'PRODUCTION' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>{h.entryType}</span>
                                             <p className="text-xs font-black uppercase italic">{h.entryType === 'PRODUCTION' ? `${h.design} #${h.lotNo} (${h.task})` : 'Manual Cash Payment'}</p>
                                             <p className="text-[9px] font-bold text-slate-400 italic mt-1">{h.sortDate}</p>
                                          </div>
                                          <div className="text-right">
                                             <p className={`text-xl font-black italic ${h.entryType === 'PRODUCTION' ? 'text-black' : 'text-emerald-500'}`}>{h.entryType === 'PRODUCTION' ? `৳${h.amount || 0}` : `- ৳${h.amount}`}</p>
                                          </div>
                                       </div>
                                     ))}
                                     {getWorkerHistory(selectedWorkerLedger).length === 0 && <p className="text-center py-20 opacity-20 font-black uppercase text-[10px] tracking-[0.5em]">No records found for this period</p>}
                                  </div>
                               </div>
                             ) : (
                               <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                                  <UserCheck size={64} className="mb-6" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Select a contractor to audit</p>
                               </div>
                             )}
                          </div>
                        </div>
                     </motion.div>
                  </div>
                )}
        </div>
    );
};

export default OutsideWorkPanel;
