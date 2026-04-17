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
  User,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { syncToSheet } from '../../utils/syncUtils';
import NRZLogo from "../NRZLogo";
import QRScanner from '../QRScanner';
import UniversalSlip from '../UniversalSlip';

const OutsideWorkPanel = ({ masterData, setMasterData, showNotify, user, setActivePanel, t, logAction, SafeText }) => {
    const [showModal, setShowModal] = useState(false);
    const [view, setView] = useState('active'); // 'active', 'history', 'b2b_incoming'
    const [searchTerm, setSearchTerm] = useState('');
    const [lotSearch, setLotSearch] = useState('');
    const [payModal, setPayModal] = useState(null);
    const [receiveModal, setReceiveModal] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [printSlip, setPrintSlip] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [showQR, setShowQR] = useState(false);

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

    const handleLotSearch = (lotNo) => {
        setLotSearch(lotNo);
        const lotInfo = (masterData.cuttingStock || []).find(l => String(l.lotNo) === String(lotNo));
        if (lotInfo) {
            setEntryData(prev => ({
                ...prev,
                lotNo: lotInfo.lotNo,
                design: lotInfo.design,
                client: lotInfo.client || 'FACTORY',
                borkaQty: lotInfo.borka || 0,
                hijabQty: lotInfo.hijab || 0
            }));
            showNotify(`Lot #${lotNo} synchronized!`, "success");
        }
    };

    const incomingOrders = useMemo(() => {
        return (masterData.productionRequests || []).filter(r => r.status === 'Pending Review');
    }, [masterData.productionRequests]);

    const handleAcceptB2BOrder = (order) => {
        const worker = prompt("Enter Contractor/Worker Name:", "");
        if (!worker) return;
        
        const rate = prompt("Enter Rate (Tk):", "0");
        if (rate === null) return;

        const newEntry = {
            id: `outside_b2b_${Date.now()}`,
            date: new Date().toLocaleDateString('en-GB'),
            worker: worker,
            client: order.client || 'FACTORY',
            design: order.design || 'N/A',
            task: 'B2B ORDER',
            borkaQty: Number(order.totalBorka || 0),
            hijabQty: Number(order.totalHijab || 0),
            rate: Number(rate),
            note: `B2B ORDER: ${order.design}`,
            status: 'Pending',
            receivedDate: null,
            totalAmount: 0,
            paidAmount: 0
        };

        setMasterData(prev => ({
            ...prev,
            outsideWorkEntries: [newEntry, ...(prev.outsideWorkEntries || [])],
            productionRequests: (prev.productionRequests || []).map(r => r.id === order.id ? { ...r, status: 'In Production (Outside)', lotNo: newEntry.id } : r)
        }));
        showNotify(`B2B Order assigned to ${worker}`);
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

    const filteredEntries = (masterData.outsideWorkEntries || []).filter(e => {
        if (isWorker && e.worker?.toLowerCase() !== user?.name?.toLowerCase()) return false;
        return (e.worker?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (e.task?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    });

    const activeEntries = filteredEntries.filter(e => e.status === 'Pending');
    const historyEntries = filteredEntries.filter(e => e.status === 'Received');

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

                <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl flex items-center justify-between group overflow-hidden relative border-4 border-slate-900">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-white group-hover:scale-150 transition-transform"><DollarSign size={120} /></div>
                    <div className="flex items-center gap-8 relative z-10">
                        <div className="w-16 h-16 bg-white/10 text-white rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <DollarSign size={32} />
                        </div>
                        <div>
                            <p className="text-3xl font-black tracking-tighter leading-none mb-2">৳{historyEntries.reduce((acc, curr) => acc + (curr.totalAmount - (curr.paidAmount || 0)), 0).toLocaleString()}</p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">মোট বকেয়া (TOTAL DUE)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white dark:bg-slate-900 p-2 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[2rem] border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar gap-2">
                    {['active', 'history', 'b2b_incoming'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex-1 md:flex-none px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400'}`}
                        >
                            {v === 'active' ? 'চলমান' : v === 'history' ? 'পুরাতন' : 'বি২বি'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="relative group">
                        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="খুঁজুন..."
                            className="bg-slate-50 dark:bg-slate-800/50 h-14 pl-14 pr-6 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black dark:text-white outline-none w-64 border-2 border-transparent focus:border-black transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {(isAdmin || isManager) && (
                        <button onClick={() => setShowModal(true)} className="h-14 bg-slate-950 text-white px-8 rounded-2xl flex items-center gap-3 shadow-2xl font-black uppercase text-[10px] tracking-widest italic animate-pulse">
                            <Plus size={20} /> নতুন কাজ
                        </button>
                    )}
                </div>
            </div>

            {/* Content Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {(view === 'active' ? activeEntries : historyEntries).map((item, idx) => (
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
                            <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-[2rem] border border-white dark:border-slate-700">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">পরিমাণ</p>
                                <p className="text-sm font-black text-black dark:text-white truncate uppercase italic">{item.borkaQty + item.hijabQty} PCS</p>
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
                            <button onClick={() => setPrintSlip(item)} className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-xl border-2 border-transparent hover:border-black transition-all">
                                <Printer size={24} />
                            </button>
                            {item.status === 'Pending' ? (
                                <button onClick={() => setReceiveModal({ ...item, rBorkaQty: item.borkaQty, rHijabQty: item.hijabQty, receiveDate: new Date().toISOString().split('T')[0] })} className="flex-1 h-16 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest italic shadow-xl">কাজ জমা নিন</button>
                            ) : (
                                <button onClick={() => setPayModal(item)} className="flex-1 h-16 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest italic shadow-xl">পেমেন্ট দিন</button>
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
                {showModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl p-12 relative border-4 border-slate-50">
                            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-black"><X size={32} /></button>
                            <h2 className="text-3xl font-black uppercase italic mb-10 text-center">নতুন কাজ <span className="text-blue-600">ইস্যু করুন</span></h2>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">কারিগর</label>
                                        <input className="premium-input !h-14 font-black uppercase" placeholder="NAME..." value={entryData.worker} onChange={(e) => setEntryData(p => ({ ...p, worker: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">কাজ</label>
                                        <input className="premium-input !h-14 font-black uppercase" placeholder="TASK..." value={entryData.task} onChange={(e) => setEntryData(p => ({ ...p, task: e.target.value }))} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">বোরকা</label>
                                            <input type="number" className="premium-input !h-14 font-black text-center" placeholder="0" value={entryData.borkaQty} onChange={(e) => setEntryData(p => ({ ...p, borkaQty: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">হিজাব</label>
                                            <input type="number" className="premium-input !h-14 font-black text-center" placeholder="0" value={entryData.hijabQty} onChange={(e) => setEntryData(p => ({ ...p, hijabQty: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">রেট (প্রতি পিস)</label>
                                        <input type="number" className="premium-input !h-14 font-black text-emerald-600" placeholder="0.00" value={entryData.rate} onChange={(e) => setEntryData(p => ({ ...p, rate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">তারিখ</label>
                                        <input type="date" className="premium-input !h-14 font-black" value={entryData.date} onChange={(e) => setEntryData(p => ({ ...p, date: e.target.value }))} />
                                    </div>
                                    <textarea className="premium-input !h-32 pt-4 font-black uppercase" placeholder="NOTE..." value={entryData.note} onChange={(e) => setEntryData(p => ({ ...p, note: e.target.value }))} />
                                </div>
                            </div>
                            <button onClick={() => handleSaveIssue(false)} className="w-full mt-10 py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase tracking-widest italic shadow-2xl hover:bg-black transition-all">নিশ্চিত করুন (DEPLOY)</button>
                        </motion.div>
                    </div>
                )}

                {receiveModal && (
                    <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl p-12 relative border-4 border-slate-50">
                            <button onClick={() => setReceiveModal(null)} className="absolute top-10 right-10 text-slate-400"><X size={32} /></button>
                            <h2 className="text-2xl font-black uppercase italic mb-8 text-center">{receiveModal.worker} <span className="text-emerald-500">জমা দিন</span></h2>
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
                            <h2 className="text-2xl font-black uppercase italic mb-8 text-center">{payModal.worker} <span className="text-emerald-500">পেমেন্ট</span></h2>
                            <div className="p-10 bg-slate-50 rounded-[2rem] text-center mb-8">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-4">টাকার পরিমাণ (৳)</p>
                                <input type="number" className="w-full text-5xl font-black text-center bg-transparent outline-none" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </div>
                            <button onClick={handlePayment} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest italic shadow-xl">কনফার্ম পেমেন্ট</button>
                        </motion.div>
                    </div>
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
        </div>
    );
};

export default OutsideWorkPanel;
