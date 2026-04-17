import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRScanner from '../QRScanner';
import UniversalSlip from '../UniversalSlip';
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
  Clock,
  Archive,
  Database,
  Layers,
  Box,
  History,
  TrendingDown,
  MessageCircle,
  MessageSquare,
  DollarSign,
  Activity,
  User,
  ChevronRight,
  ShieldCheck,
  Download
} from "lucide-react";

import { syncToSheet } from '../../utils/syncUtils';
import NRZLogo from '../NRZLogo';

const PataFactoryPanel = ({ masterData, setMasterData, showNotify, user, setActivePanel, t, logAction, SafeText }) => {
    const role = user?.role?.toLowerCase();
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isWorker = role !== 'admin' && role !== 'manager';

    const [showModal, setShowModal] = useState(false);
    const [lotSearch, setLotSearch] = useState("");
    const [showQR, setShowQR] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [printSlip, setPrintSlip] = useState(null);
    const [receiveModal, setReceiveModal] = useState(null);
    const [payModal, setPayModal] = useState(null);
    const [ledgerModal, setLedgerModal] = useState(null);
    const [view, setView] = useState('active'); // active, history, payments, inventory_history, b2b_incoming
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const [entryData, setEntryData] = useState({
        worker: '',
        design: '',
        color: '',
        lotNo: '',
        pataType: 'Single',
        pataQty: '',
        stonePackets: '',
        paperRolls: '',
        client: 'FACTORY',
        note: '',
        date: new Date().toISOString().split('T')[0]
    });

    const incomingOrders = useMemo(() => {
        return (masterData.productionRequests || []).filter(r => r.status === 'Pending Review');
    }, [masterData.productionRequests]);

    const handleAcceptB2BOrder = (order) => {
        const worker = prompt("Enter Worker Name:", "");
        if (!worker) return;
        
        const lotNo = `PT-B2B-${Date.now().toString().slice(-4)}`;
        const newEntry = {
            id: `pata_${Date.now()}`,
            date: new Date().toLocaleDateString('en-GB'),
            worker: worker,
            design: order.design,
            color: 'MIX',
            lotNo: lotNo,
            pataType: 'Single',
            pataQty: Number(order.totalBorka || 0),
            stonePackets: 0,
            paperRolls: 0,
            client: order.client,
            status: 'Pending',
            note: `B2B ORDER: ${order.design}`
        };

        setMasterData(prev => ({
            ...prev,
            pataEntries: [newEntry, ...(prev.pataEntries || [])],
            productionRequests: (prev.productionRequests || []).map(r => r.id === order.id ? { ...r, status: 'In Production (Pata)', lotNo } : r)
        }));
        showNotify(`B2B Order assigned to ${worker}`);
    };

    const handleLotSearch = (lotNo) => {
        setLotSearch(lotNo);
        const lotInfo = (masterData.cuttingStock || []).find(l => String(l.lotNo) === String(lotNo));
        if (lotInfo) {
            setEntryData(prev => ({
                ...prev,
                lotNo: lotInfo.lotNo,
                design: lotInfo.design,
                client: lotInfo.client || 'FACTORY',
                note: `Lot Info: ${lotInfo.borka || 0} Borka, ${lotInfo.hijab || 0} Hijab`
            }));
            showNotify(`Lot #${lotNo} synchronized!`, "success");
        }
    };

    const handleSaveIssue = (shouldPrint) => {
        if (!entryData.worker || !entryData.design || !entryData.lotNo || !entryData.pataQty) {
            return showNotify('কারিগর, ডিজাইন, লট নম্বর এবং পরিমাণ আবশ্যক!', 'error');
        }

        const newEntry = {
            id: `pata_${Date.now()}`,
            date: entryData.date ? new Date(entryData.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
            worker: entryData.worker,
            design: entryData.design,
            color: entryData.color || 'N/A',
            lotNo: entryData.lotNo,
            pataType: entryData.pataType,
            pataQty: Number(entryData.pataQty),
            stonePackets: Number(entryData.stonePackets || 0),
            paperRolls: Number(entryData.paperRolls || 0),
            client: entryData.client || 'FACTORY',
            status: 'Pending',
            note: entryData.note
        };

        setMasterData(prev => ({
            ...prev,
            pataEntries: [newEntry, ...(prev.pataEntries || [])]
        }));

        if (shouldPrint) setPrintSlip(newEntry);
        setShowModal(false);
        setEntryData({ worker: '', design: '', color: '', lotNo: '', pataType: 'Single', pataQty: '', stonePackets: '', paperRolls: '', client: 'FACTORY', note: '', date: new Date().toISOString().split('T')[0] });
        showNotify('পাতা কাজ সফলভাবে ইস্যু হয়েছে!');
    };

    const handleConfirmReceive = (e) => {
        if (e) e.preventDefault();
        const item = receiveModal;
        const form = e.target.form || e.target;
        const receivedQty = Number(form.rQty?.value || item.pataQty);
        const rate = (masterData.pataRates || {})[item.pataType] || 0;
        const amount = receivedQty * rate;

        setMasterData(prev => ({
            ...prev,
            pataEntries: (prev.pataEntries || []).map(e => e.id === item.id ? {
                ...e,
                status: 'Received',
                receivedQty: receivedQty,
                amount: amount,
                receiveDate: new Date().toLocaleDateString('en-GB'),
                receivedBy: user?.name || 'Admin'
            } : e)
        }));

        setReceiveModal(null);
        showNotify('কাজ জমা নেওয়া হয়েছে!');
    };

    const handlePayment = () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) return;
        const amount = Number(paymentAmount);

        setMasterData(prev => ({
            ...prev,
            workerPayments: [
                {
                    id: `pay_${Date.now()}`,
                    date: paymentDate || new Date().toISOString().split('T')[0],
                    worker: payModal,
                    dept: 'pata',
                    amount: amount,
                    note: 'Pata Worker Payment'
                },
                ...(prev.workerPayments || [])
            ],
            expenses: [
                {
                    id: `exp_pata_${Date.now()}`,
                    date: paymentDate || new Date().toISOString().split('T')[0],
                    category: 'salary',
                    description: `PATA PMT: ${payModal}`,
                    amount: amount
                },
                ...(prev.expenses || [])
            ]
        }));

        setPayModal(null);
        setPaymentAmount('');
        showNotify('পেমেন্ট সফলভাবে ব্যালেন্সে যুক্ত হয়েছে!');
    };

    const filteredEntries = (masterData.pataEntries || []).filter(e => {
        if (isWorker && e.worker?.toLowerCase() !== user?.name?.toLowerCase()) return false;
        return (e.worker?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (e.design?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (e.lotNo?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    });

    const activeEntries = filteredEntries.filter(e => e.status === 'Pending');
    const historyEntries = filteredEntries.filter(e => e.status === 'Received');

    if (printSlip) {
        return (
            <div className="min-h-screen bg-white p-10 font-outfit italic animate-fade-up">
                <style>{`@media print { .no-print { display: none !important; } }`}</style>
                <div className="no-print flex justify-between items-center mb-10 max-w-5xl mx-auto">
                    <button onClick={() => setPrintSlip(null)} className="px-8 py-4 bg-slate-50 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all">Cancel</button>
                    <button onClick={() => window.print()} className="action-btn-primary !px-12 !py-4 shadow-xl"><Printer size={18} /> Print Slip</button>
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
            {/* SaaS HUD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-150 transition-transform"><Database size={100} /></div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">স্টক স্ট্যাটাস (ROLLS)</p>
                        <p className="text-5xl font-black tracking-tighter leading-none mb-2">{(masterData.rawInventory || []).filter(l => l.item.toLowerCase().includes('roll')).reduce((a,c) => a + (c.type === 'in' ? Number(c.qty) : -Number(c.qty)), 0)}</p>
                    </div>
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
                        <p className="text-3xl font-black tracking-tighter text-black dark:text-white mb-1">৳{(masterData.workerCategories?.pata || []).reduce((s, w) => s + ( (masterData.pataEntries || []).filter(p => p.worker === w && p.status === 'Received').reduce((acc,curr) => acc + (curr.amount || 0), 0) - (masterData.workerPayments || []).filter(p => p.worker === w && p.dept === 'pata').reduce((acc,curr) => acc + Number(curr.amount || 0), 0) ), 0).toLocaleString()}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">মোট বকেয়া</p>
                    </div>
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-[1.5rem] flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all"><DollarSign size={32} /></div>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white dark:bg-slate-900 p-2 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] w-full md:w-auto">
                    {['active', 'b2b_incoming', 'history', 'payments'].map(v => (
                        <button key={v} onClick={() => setView(v)} className={`flex-1 md:flex-none px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400'}`}>
                            {v.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="relative group">
                        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input placeholder="কারিগর বা লট..." className="bg-slate-50 dark:bg-slate-800 h-14 pl-14 pr-6 rounded-2xl text-[11px] font-black uppercase outline-none w-64 border-2 border-transparent focus:border-black transition-all italic" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => setShowQR(true)} className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all"><Camera size={20} /></button>
                    {(isAdmin || isManager) && (
                        <button onClick={() => setShowModal(true)} className="h-14 bg-slate-950 text-white px-8 rounded-2xl flex items-center gap-3 shadow-2xl font-black uppercase text-[10px] tracking-widest italic animate-pulse">
                            <Plus size={20} /> নতুন কাজ
                        </button>
                    )}
                </div>
            </div>

            {/* Content Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {view === 'payments' ? (
                    (masterData.workerCategories?.pata || []).map((w, idx) => {
                         const earned = (masterData.pataEntries || []).filter(p => p.worker === w && p.status === 'Received').reduce((acc,curr) => acc + (curr.amount || 0), 0);
                         const paid = (masterData.workerPayments || []).filter(p => p.worker === w && p.dept === 'pata').reduce((acc,curr) => acc + Number(curr.amount || 0), 0);
                         const due = earned - paid;
                         return (
                             <div key={idx} className="bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-[3rem] p-10 space-y-8 shadow-xl hover:border-black transition-all group animate-fade-up">
                                  <div className="flex justify-between items-start">
                                      <div className="space-y-2">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none italic">PATA SPECIALIST</p>
                                          <h4 className="text-3xl font-black tracking-tighter uppercase italic">{w}</h4>
                                      </div>
                                      <div className={`w-14 h-14 ${due > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-300'} rounded-[1.5rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner`}>
                                          <User size={28} />
                                      </div>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-800/80 p-8 rounded-[2.5rem] border border-white dark:border-slate-700 shadow-inner">
                                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">বকেয়া মজুরি (DUE)</p>
                                       <p className={`text-5xl font-black tracking-tighter italic ${due > 0 ? 'text-black dark:text-white' : 'text-slate-200'}`}>৳{due.toLocaleString()}</p>
                                  </div>
                                  <button onClick={() => setPayModal(w)} className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest italic shadow-xl hover:bg-emerald-500 transition-all">পেমেন্ট করুন (PROCESS)</button>
                             </div>
                         )
                    })
                ) : (view === 'active' ? activeEntries : historyEntries).length === 0 ? (
                    <div className="col-span-full h-80 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-50 italic">
                        <Activity size={60} strokeWidth={1} className="text-slate-100 mb-6" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">রেকর্ড পাওয়া যায়নি</p>
                    </div>
                ) : (
                    (view === 'active' ? activeEntries : historyEntries).map((item, idx) => (
                        <div key={item.id || idx} className="bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-[3rem] p-10 space-y-8 shadow-xl hover:border-black transition-all group animate-fade-up">
                             <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">কারিগর</p>
                                      <h4 className="text-3xl font-black tracking-tighter uppercase italic truncate max-w-[200px]">{item.worker}</h4>
                                  </div>
                                  <div className={`w-14 h-14 ${item.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center shadow-inner font-black text-[10px]`}>
                                      #{item.lotNo.slice(-4)}
                                  </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-white dark:border-slate-700">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">ডিজাইন</p>
                                      <p className="text-sm font-black uppercase italic truncate">{item.design}</p>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-white dark:border-slate-700">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">পার্টস</p>
                                      <p className="text-sm font-black uppercase italic truncate">{item.pataType}</p>
                                  </div>
                             </div>

                             <div className="flex justify-between items-center py-8 border-y-2 border-slate-50 dark:border-slate-800 border-dashed">
                                  <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">পরিমাণ (QTY)</p>
                                      <p className="text-4xl font-black italic tracking-tighter">{item.receivedQty || item.pataQty} <span className="text-xs opacity-40">PCS</span></p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">তারিখ</p>
                                      <p className="text-lg font-black italic mt-1 font-mono">{item.date}</p>
                                  </div>
                             </div>

                             <div className="flex gap-4">
                                  <button onClick={() => setPrintSlip(item)} className="w-16 h-16 bg-white dark:bg-slate-800 border-2 border-transparent hover:border-black rounded-2xl flex items-center justify-center shadow-lg transition-all"><Printer size={24} /></button>
                                  {item.status === 'Pending' ? (
                                      <button onClick={() => setReceiveModal(item)} className="flex-1 h-16 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest italic shadow-xl hover:bg-emerald-500 transition-all">জমা নিন (RECEIVE)</button>
                                  ) : (
                                      <div className="flex-1 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest italic border border-emerald-100">RECEIVED {item.receiveDate}</div>
                                  )}
                             </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl p-12 relative border-4 border-slate-50">
                            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-black"><X size={32} /></button>
                            <h2 className="text-3xl font-black uppercase italic mb-10 text-center">নতুন পাতা কাজ <span className="text-blue-600">ইস্যু করুন</span></h2>
                            
                            <div className="bg-blue-600/5 p-8 rounded-[2.5rem] border border-blue-500/10 mb-8 flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1 w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-4">মাস্টার লট সিন্ক্রোনাইজ করুন (SCAN/SEARCH)</label>
                                    <div className="relative">
                                        <Search size={20} className="absolute left-8 top-1/2 -translate-y-1/2 text-blue-600" />
                                        <input className="premium-input !h-16 !pl-20 !text-xl !font-black !bg-white border-blue-200" placeholder="ENTER LOT NO..." value={lotSearch} onChange={(e) => handleLotSearch(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4">কারিগর</label>
                                        <input className="premium-input !h-14 font-black uppercase" value={entryData.worker} onChange={(e) => setEntryData(p => ({ ...p, worker: e.target.value }))} placeholder="WORKER..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">ডিজাইন</label>
                                            <input className="premium-input !h-14 font-black uppercase" value={entryData.design} onChange={(e) => setEntryData(p => ({ ...p, design: e.target.value }))} placeholder="DESIGN..." />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">লট নম্বর</label>
                                            <input className="premium-input !h-14 font-black uppercase" value={entryData.lotNo} onChange={(e) => setEntryData(p => ({ ...p, lotNo: e.target.value }))} placeholder="LOT NO..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">পার্টস টাইপ</label>
                                            <select className="premium-input !h-14 font-black uppercase" value={entryData.pataType} onChange={(e) => setEntryData(p => ({ ...p, pataType: e.target.value }))}>
                                                {(masterData.pataTypes || ['Single', 'Double']).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">পরিমাণ (PCS)</label>
                                            <input type="number" className="premium-input !h-14 font-black text-center" value={entryData.pataQty} onChange={(e) => setEntryData(p => ({ ...p, pataQty: e.target.value }))} placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">পাথর (প্যাকেট)</label>
                                            <input type="number" className="premium-input !h-14 font-black text-rose-500" value={entryData.stonePackets} onChange={(e) => setEntryData(p => ({ ...p, stonePackets: e.target.value }))} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">রোল (সংখ্যা)</label>
                                            <input type="number" className="premium-input !h-14 font-black text-indigo-500" value={entryData.paperRolls} onChange={(e) => setEntryData(p => ({ ...p, paperRolls: e.target.value }))} placeholder="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4">তারিখ</label>
                                        <input type="date" className="premium-input !h-14 font-black italic" value={entryData.date} onChange={(e) => setEntryData(p => ({ ...p, date: e.target.value }))} />
                                    </div>
                                    <textarea className="premium-input !h-32 pt-4 font-black uppercase italic" placeholder="SPECIAL INSTRUCTIONS / NOTES..." value={entryData.note} onChange={(e) => setEntryData(p => ({ ...p, note: e.target.value }))} />
                                </div>
                            </div>
                            <button onClick={() => handleSaveIssue(false)} className="w-full mt-10 py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest italic shadow-2xl hover:bg-black transition-all">নিশ্চিত করুন (ISSUE TASK)</button>
                        </motion.div>
                    </div>
                )}

                {receiveModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border-4 border-slate-50">
                             <button onClick={() => setReceiveModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                             <h2 className="text-2xl font-black uppercase italic mb-8 text-center">{receiveModal.worker} <span className="text-emerald-500">জমা দিন</span></h2>
                             <form onSubmit={handleConfirmReceive}>
                                 <div className="p-10 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-center mb-8 border border-white dark:border-slate-700 shadow-inner">
                                     <p className="text-[10px] font-black uppercase text-slate-400 mb-4">জমা দেওয়া পরিমাণ (PCS)</p>
                                     <input name="rQty" type="number" className="w-full text-5xl font-black text-center bg-transparent outline-none italic" defaultValue={receiveModal.pataQty} autoFocus />
                                 </div>
                                 <button type="submit" className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest italic shadow-xl">জমা নিন (RECEIVE)</button>
                             </form>
                         </motion.div>
                    </div>
                )}

                {payModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border-4 border-slate-50">
                             <button onClick={() => setPayModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                             <h2 className="text-2xl font-black uppercase italic mb-8 text-center">{payModal} <span className="text-emerald-500">পেমেন্ট</span></h2>
                             <div className="p-10 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-center mb-8 border border-white dark:border-slate-700 shadow-inner">
                                 <p className="text-[10px] font-black uppercase text-slate-400 mb-4">টাকার পরিমাণ (৳)</p>
                                 <input type="number" className="w-full text-5xl font-black text-center bg-transparent outline-none italic" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
                             </div>
                             <div className="mb-8">
                                 <label className="text-[10px] font-black uppercase text-slate-400 ml-4">পেমেন্টের তারিখ</label>
                                 <input type="date" className="premium-input !h-14 font-black italic mt-2" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                             </div>
                             <button onClick={handlePayment} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest italic shadow-xl hover:bg-black transition-all">পেমেন্ট নিশ্চিত করুন</button>
                         </motion.div>
                    </div>
                )}
                
                {showQR && <QRScanner onScanSuccess={(data) => { handleLotSearch(data); setShowQR(false); }} onClose={() => setShowQR(false)} />}
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

export default PataFactoryPanel;
