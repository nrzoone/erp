import React, { useState, useMemo } from 'react';
import { Calendar, Printer, Search, Download, User, ArrowLeft, ArrowUpRight, TrendingUp, DollarSign, X } from 'lucide-react';

const WorkerSummary = ({ masterData, type, SafeText }) => {
    const [selectedWorker, setSelectedWorker] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); // Month start
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [showPrintMode, setShowPrintMode] = useState(false);

    const workers = useMemo(() => {
        return (masterData.workerDocs || []).filter(w => !type || w.dept === type);
    }, [masterData.workerDocs, type]);

    const ledgerData = useMemo(() => {
        if (!selectedWorker) return [];

        const workerName = selectedWorker;
        const entries = [];

        // 1. Production Earnings
        const productions = type === 'pata' ? (masterData.pataEntries || []) : (masterData.productions || []);
        productions.forEach(p => {
            if (p.worker === workerName && p.status === 'Received') {
                entries.push({
                    date: p.date,
                    type: 'EARNING',
                    description: `${p.design || 'Unknown'} (${p.lotNo || 'N/A'})`,
                    qty: p.receivedQty || p.pataQty || 0,
                    rate: p.rate || 0,
                    amount: p.amount || 0
                });
            }
        });

        // 2. Payments (Expenses recorded as salary)
        const expenses = (masterData.expenses || []).filter(e =>
            (e.description?.toLowerCase().includes(workerName.toLowerCase())) &&
            (e.category === 'salary')
        );
        expenses.forEach(e => {
            entries.push({
                date: e.date,
                type: 'PAYMENT',
                description: e.description,
                amount: e.amount
            });
        });

        // 3. Filter by Date
        return entries
            .filter(e => e.date >= startDate && e.date <= endDate)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [selectedWorker, startDate, endDate, masterData, type]);

    const totals = useMemo(() => {
        const earned = ledgerData.filter(e => e.type === 'EARNING').reduce((sum, e) => sum + e.amount, 0);
        const paid = ledgerData.filter(e => e.type === 'PAYMENT').reduce((sum, e) => sum + e.amount, 0);
        return { earned, paid, balance: earned - paid };
    }, [ledgerData]);

    if (showPrintMode) {
        return (
            <div className="fixed inset-0 z-[2000] bg-white text-black font-outfit p-8 print:p-0 overflow-y-auto">
                <style>{`@media print { .no-print { display: none !important; } @page { margin: 10mm; size: A4 portrait; } }`}</style>
                <div className="max-w-4xl mx-auto">
                    <div className="no-print mb-8 flex justify-between items-center bg-slate-900 p-6 rounded-2xl text-white">
                        <div>
                            <h3 className="font-black italic uppercase">প্রিন্ট প্রিভিউ (PDF Preview)</h3>
                            <p className="text-[10px] opacity-60">এই ফাইলটি PDF হিসেবে সেভ করতে প্রিন্ট বাটনে চাপুন।</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowPrintMode(false)} className="px-6 py-3 bg-white/10 rounded-xl text-xs font-black uppercase">বন্ধ করুন</button>
                            <button onClick={() => window.print()} className="px-8 py-3 bg-blue-600 rounded-xl text-xs font-black uppercase shadow-lg flex items-center gap-2"><Printer size={16} /> প্রিন্ট / সেভ PDF</button>
                        </div>
                    </div>

                    <div className="border-[10px] border-black p-12 rounded-[3.5rem] bg-white text-black shadow-2xl min-h-screen relative overflow-hidden">
                        <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-8">
                            <div>
                                <h1 className="text-4xl font-black italic tracking-tighter leading-none mb-2">NRZOONE FACTORY</h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">WORKFORCE LEDGER ARCHIVE</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black italic uppercase">{selectedWorker}</p>
                                <p className="text-[10px] font-black opacity-40 italic">{startDate} to {endDate}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <table className="w-full text-left">
                                <thead className="border-b-2 border-black">
                                    <tr className="text-[10px] font-black uppercase tracking-widest italic">
                                        <th className="py-4">তারিখ</th>
                                        <th className="py-4">বিবরণ</th>
                                        <th className="py-4 text-center">পরিমাণ</th>
                                        <th className="py-4 text-right">আয় (Earn)</th>
                                        <th className="py-4 text-right">মজুরি (Pay)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 italic">
                                    {ledgerData.map((e, i) => (
                                        <tr key={i} className="text-xs font-bold">
                                            <td className="py-4">{e.date}</td>
                                            <td className="py-4 uppercase">{e.description}</td>
                                            <td className="py-4 text-center">{e.qty || '-'}</td>
                                            <td className="py-4 text-right font-black">{e.type === 'EARNING' ? `৳${e.amount.toLocaleString()}` : '-'}</td>
                                            <td className="py-4 text-right font-black">{e.type === 'PAYMENT' ? `৳${e.amount.toLocaleString()}` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-12 pt-8 border-t-4 border-black grid grid-cols-3 gap-8">
                            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                                <p className="text-[9px] font-black opacity-40 uppercase">মোট আয়</p>
                                <p className="text-2xl font-black italic leading-none mt-1">৳{totals.earned.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                                <p className="text-[9px] font-black opacity-40 uppercase">মোট পেমেন্ট</p>
                                <p className="text-2xl font-black italic leading-none mt-1">৳{totals.paid.toLocaleString()}</p>
                            </div>
                            <div className="bg-black text-white p-6 rounded-2xl text-center">
                                <p className="text-[9px] font-black opacity-50 uppercase">বকেয়া / প্রাপ্য</p>
                                <p className="text-2xl font-black italic leading-none mt-1">৳{totals.balance.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="mt-20 flex justify-between items-center opacity-40 italic font-black text-[10px] uppercase">
                            <div className="space-y-1"><p className="mb-4">Authorized Signature</p><div className="w-32 h-[1px] bg-black"></div></div>
                            <p>NRZONE Factory System // V5.2</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-up overflow-hidden pb-12">
            {/* Header with Date Filters */}
            <div className="saas-card bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xl !p-6 flex flex-col md:flex-row gap-6 items-end justify-between italic">
                <div className="w-full md:w-1/3 space-y-3 font-outfit">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">কারিগর নির্বাচন করুন (Select Worker)</label>
                    <select
                        value={selectedWorker}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="premium-input !h-14 font-black uppercase italic bg-slate-50 dark:bg-slate-800 dark:text-white border-none shadow-inner"
                    >
                        <option value="">কারিগর সিলেক্ট করুন...</option>
                        {workers.map(w => <option key={w.workerId} value={w.name}>{w.name} ({w.dept?.toUpperCase()})</option>)}
                    </select>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">শুরু (From)</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="premium-input !h-12 !bg-black !text-white !border-none !w-36 text-center text-xs rounded-xl shadow-lg" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">শেষ (To)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="premium-input !h-12 !bg-black !text-white !border-none !w-36 text-center text-xs rounded-xl shadow-lg" />
                    </div>
                </div>

                {selectedWorker && ledgerData.length > 0 && (
                    <button
                        onClick={() => setShowPrintMode(true)}
                        className="w-full md:w-auto px-8 py-3.5 bg-slate-950 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-all"
                    >
                        <Printer size={16} /> PDF রিপোর্ট ডাউনলোড
                    </button>
                )}
            </div>

            {selectedWorker ? (
                <div className="space-y-8 animate-fade-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="saas-card bg-emerald-500/5 border-emerald-500/20 !p-8 relative overflow-hidden group">
                            <TrendingUp className="absolute -right-4 -top-4 opacity-5 group-hover:scale-150 transition-all text-emerald-500" size={120} />
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 italic underline decoration-2 decoration-emerald-200">Total Income</p>
                            <h2 className="text-4xl font-black italic tracking-tighter tabular-nums leading-none">৳{totals.earned.toLocaleString()}</h2>
                        </div>
                        <div className="saas-card bg-rose-500/5 border-rose-500/20 !p-8 relative overflow-hidden group">
                            <DollarSign className="absolute -right-4 -top-4 opacity-5 group-hover:scale-150 transition-all text-rose-500" size={120} />
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 italic underline decoration-2 decoration-rose-200">Total Advanced</p>
                            <h2 className="text-4xl font-black italic tracking-tighter tabular-nums leading-none">৳{totals.paid.toLocaleString()}</h2>
                        </div>
                        <div className="saas-card bg-slate-950 !p-8 text-white relative overflow-hidden group shadow-2xl">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform"><Search size={22} /></div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 italic">Net Balance</p>
                            <h2 className="text-4xl font-black italic tracking-tighter tabular-nums leading-none font-outfit">৳{totals.balance.toLocaleString()}</h2>
                        </div>
                    </div>

                    <div className="saas-card !p-0 overflow-hidden shadow-2xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="p-8 border-b-4 border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div><h3 className="text-2xl font-black italic uppercase leading-none mb-2">Transaction Ledger</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Worker Performance & Payment History</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                                        <th className="px-8 py-6">Timeline</th>
                                        <th className="px-8 py-6">Reference</th>
                                        <th className="px-8 py-6 text-right">Inflow</th>
                                        <th className="px-8 py-6 text-right">Outflow</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50 dark:divide-slate-800">
                                    {ledgerData.map((e, i) => (
                                        <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all italic">
                                            <td className="px-8 py-6 font-bold text-xs">{e.date}</td>
                                            <td className="px-8 py-6">
                                                <p className="font-black uppercase text-sm leading-none mb-1">{e.description}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{e.type === 'EARNING' ? 'Production Yield' : 'Financial Disbursement'}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-xl text-emerald-600">
                                                {e.type === 'EARNING' ? `৳${e.amount.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-xl text-rose-600">
                                                {e.type === 'PAYMENT' ? `৳${e.amount.toLocaleString()}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {ledgerData.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center opacity-20 font-black tracking-widest italic uppercase">No activity found for this period</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[400px] saas-card bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center opacity-30 shadow-inner">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12"><User size={48} strokeWidth={1} /></div>
                    <p className="text-sm font-black uppercase tracking-[0.5em] italic">হিসাব দেখতে কারিগর নির্বাচন করুন (Select Worker)</p>
                </div>
            )}
        </div>
    );
};

export default WorkerSummary;
