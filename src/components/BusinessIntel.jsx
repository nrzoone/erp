import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Star, CheckCircle, ArrowUpRight, ArrowDownRight, Activity, Grid, Database, ArrowLeft, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, AreaChart, Area } from 'recharts';
import { getPataStockSummary } from '../utils/calculations';
import { motion } from 'framer-motion';
import NRZLogo from "./NRZLogo";

const BusinessIntel = ({ masterData, SafeText }) => {
    const stats = useMemo(() => {
        // 1. Production vs Sales
        const totalProduced = (masterData.productions || []).filter(p => p.status === 'Received').reduce((s, p) => s + (p.issueBorka || 0) + (p.issueHijab || 0), 0);
        const totalPata = (masterData.pataEntries || []).filter(e => e.status === 'Received').reduce((s, e) => s + (e.pataQty || 0), 0);

        // 3. Low Stock Check
        const stockLogs = masterData.rawInventory || [];
        const rawStock = {};
        stockLogs.forEach(log => {
            const key = log.color ? `${log.item} (${log.color})` : log.item;
            if (!rawStock[key]) rawStock[key] = { name: log.item, color: log.color, qty: 0 };
            if (log.type === 'in') rawStock[key].qty += Number(log.qty);
            else if (log.type === 'out') rawStock[key].qty -= Number(log.qty);
        });
        const lowStockItems = Object.values(rawStock).filter(i => i.qty <= 5);

        // 4. Top Designs
        const designCounts = {};
        (masterData.productions || []).forEach(p => {
            designCounts[p.design] = (designCounts[p.design] || 0) + (p.issueBorka || 0) + (p.issueHijab || 0);
        });
        const topDesigns = Object.entries(designCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // 5. Work Efficiency
        const pendingWork = (masterData.productions || []).filter(p => p.status === 'Pending').length;
        const totalWork = (masterData.productions || []).length;
        const efficiency = totalWork > 0 ? Math.round(((totalWork - pendingWork) / totalWork) * 100) : 0;

        // 6. Advanced Worker Rankings (Efficiency Hub)
        const workerStats = {};
        [...(masterData.productions || []), ...(masterData.pataEntries || [])].forEach(p => {
            if (!workerStats[p.worker]) workerStats[p.worker] = { name: p.worker, total: 0, pending: 0, received: 0 };
            const qty = p.issueBorka || p.pataQty || 0;
            workerStats[p.worker].total += qty;
            if (p.status === 'Pending') workerStats[p.worker].pending += qty;
            else workerStats[p.worker].received += (p.receivedBorka || p.receivedQty || qty);
        });
        const topWorkers = Object.values(workerStats)
            .sort((a, b) => b.received - a.received)
            .slice(0, 10);

        // 7. Depletion Trend (AI Prediction Logic)
        const depletionTrends = Object.values(rawStock).map(item => {
            const usageLogs = stockLogs.filter(l => l.item === item.name && l.color === item.color && l.type === 'out');
            if (usageLogs.length < 2) return { ...item, daysLeft: 'INF' };
            
            const totalUsed = usageLogs.reduce((s, l) => s + Number(l.qty), 0);
            const firstDate = new Date(usageLogs[usageLogs.length - 1].date.split('/').reverse().join('-'));
            const lastDate = new Date(usageLogs[0].date.split('/').reverse().join('-'));
            const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
            
            const dailyBurn = totalUsed / daysDiff;
            const daysLeft = dailyBurn > 0 ? Math.floor(item.qty / dailyBurn) : 'INF';
            return { ...item, daysLeft, dailyBurn: dailyBurn.toFixed(2) };
        });

        const pataSummary = getPataStockSummary(masterData);

        // -- NEW: Last 7 Days Production for Chart --
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString('en-GB');
        });

        const chartData = last7Days.map(date => {
            const prodUnits = (masterData.productions || []).filter(p => p.date === date && p.status === 'Received').reduce((acc, p) => acc + (p.receivedBorka || p.issueBorka || 0) + (p.receivedHijab || p.issueHijab || 0), 0);
            const pataUnits = (masterData.pataEntries || []).filter(e => e.receiveDate === date && e.status === 'Received').reduce((acc, e) => acc + (e.receivedQty || e.pataQty || 0), 0);
            const outsideUnits = (masterData.outsideWorkEntries || []).filter(e => e.receivedDate === date && e.status === 'Received').reduce((acc, e) => acc + (e.borkaQty || 0) + (e.hijabQty || 0), 0);
            return { date: date.split('/')[0] + '/' + date.split('/')[1], total: prodUnits + pataUnits + outsideUnits };
        });

        return { totalProduced, totalPata, lowStockItems, topDesigns, efficiency, pendingWork, pataSummary, topWorkers, depletionTrends, chartData };
    }, [masterData]);

    return (
        <div className="space-y-6 md:space-y-12 pb-24 animate-fade-up px-2 italic text-black dark:text-white font-outfit">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6 md:gap-10">
                    <div className="flex items-center gap-6 md:gap-10">
                        <div className="bg-black rounded-[2.5rem] p-6 shadow-2xl border border-white/10 transition-transform hover:scale-110 active:scale-95 overflow-hidden group">
                           <NRZLogo size="md" white />
                        </div>
                        <div>
                            <p className="text-xs md:text-sm font-black text-black dark:text-white uppercase tracking-[0.4em] mb-3 italic">ব্যবসা বিশ্লেষণ (Strategic Analytics)</p>
                            <h2 className="text-4xl md:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter leading-none text-black">বিজনেস <span className="text-black dark:text-white">ইন্টেল</span></h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-4 border-slate-50 dark:border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-black">সাপ্তাহিক উৎপাদন ধারা (Weekly Production Trend)</h4>
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-black dark:bg-white rounded-full"></div>
                             <span className="text-[8px] font-black uppercase tracking-widest">রেডি মাল (Output)</span>
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={24} fill="#000">
                                    {stats.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 6 ? '#2563eb' : '#000'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group flex flex-col justify-center">
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-white/50`}>উৎপাদন সমাপ্ত হার</p>
                    <div className="flex items-baseline gap-4 mb-4">
                        <h3 className="text-8xl font-black italic tracking-tighter text-white">{stats.efficiency}%</h3>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${stats.efficiency}%` }} className="h-full bg-white" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">পেন্ডিং কাজ দ্রুত শেষ করার দিকে মনোযোগ দিন</p>
                    <Activity className="absolute bottom-[-10%] right-[-10%] text-white opacity-[0.03] group-hover:scale-125 transition-transform" size={200} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-4 border-slate-50 dark:border-slate-800 shadow-xl relative overflow-hidden group">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black mb-4">মোট উৎপাদন ইউনিট</p>
                    <h3 className="text-5xl font-black italic tracking-tighter text-black">{(stats.totalProduced + stats.totalPata).toLocaleString()}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">ফ্যাক্টরির সামগ্রিক আউটপুট (পিস)</p>
                    <TrendingUp className="absolute bottom-[-10%] right-[-5%] text-slate-100 dark:text-slate-800 opacity-75" size={120} />
                </div>

                <div className={`p-10 rounded-[3rem] border-4 shadow-xl relative overflow-hidden transition-all ${stats.lowStockItems.length > 0 ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/20' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${stats.lowStockItems.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>কাঁচামালের অ্যালার্ট</p>
                    <h3 className={`text-5xl font-black italic tracking-tighter mb-2 ${stats.lowStockItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.lowStockItems.length > 0 ? 'ঝুঁকিপূর্ণ' : 'স্বাভাবিক (Safe)'}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-75">{stats.lowStockItems.length}টি মাল দ্রুত কিনতে হবে</p>
                    <AlertTriangle className={`absolute bottom-[-10%] right-[-5%] opacity-10 ${stats.lowStockItems.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`} size={120} />
                </div>

                <div className="bg-blue-600 p-10 rounded-[3rem] shadow-xl relative overflow-hidden text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-white/60">চলমান পেন্ডিং লট</p>
                    <h3 className="text-6xl font-black italic tracking-tighter mb-2"><SafeText data={stats.pendingWork} /></h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">ফ্যাক্টরির ভেতরে চলমান কাজ</p>
                    <BarChart2 className="absolute bottom-[-10%] right-[-5%] opacity-10" size={120} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white rounded-[4rem] border-4 border-slate-50 shadow-2xl overflow-hidden p-12">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-4 text-black">
                            <Star className="text-amber-500" fill="currentColor" /> সেরা পারফর্মিং ডিজাইন সমূহ
                        </h4>
                    </div>
                    <div className="space-y-6">
                        {stats.topDesigns.map(([name, qty], idx) => (
                            <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl group hover:bg-black hover:text-white transition-all">
                                <div className="flex items-center gap-6">
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-black dark:text-white font-black text-xs shadow-sm">#{idx + 1}</span>
                                    <p className="text-xl font-black uppercase italic"><SafeText data={name} /></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black italic tracking-tighter">+{typeof qty === 'number' ? qty.toLocaleString() : <SafeText data={qty} />}</p>
                                    <p className="text-[9px] font-black uppercase opacity-70">মোট উৎপাদন (Pcs)</p>
                                </div>
                            </div>
                        ))}
                        {stats.topDesigns.length === 0 && <p className="text-center py-20 text-black dark:text-white dark:text-white font-black uppercase tracking-[0.5em] italic">কোনো প্রোডাকশন ডেটা নেই</p>}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-[4rem] border-4 border-slate-50 shadow-2xl p-12 h-full">
                        <div className="flex justify-between items-center mb-10">
                            <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-4 text-black">
                                <Grid size={24} className="text-amber-500" /> পাটা স্টকের বর্তমান মজুত
                            </h4>
                            <span className="px-6 py-2 bg-emerald-50 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">{stats.pataSummary.length} পদের কাটিং পাটা</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {stats.pataSummary.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-6 border-2 border-slate-50 rounded-3xl bg-slate-50/50 italic group hover:border-black transition-all">
                                    <div>
                                        <p className="text-xl font-black text-black dark:text-white uppercase"><SafeText data={item.design} /></p>
                                        <p className="text-[10px] font-black text-black dark:text-white dark:text-white uppercase mt-1"><SafeText data={item.color} /> • <SafeText data={item.type} /></p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs font-black text-black dark:text-white dark:text-white uppercase">ব্যালেন্স পিস</p>
                                            <p className={`text-4xl font-black italic tracking-tighter leading-none ${item.balance > 0 ? 'text-black' : 'text-rose-500'}`}><SafeText data={item.balance} /></p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {stats.pataSummary.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-100 gap-6">
                                    <Database size={80} strokeWidth={1} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.6em]">পাটা স্টকে কোনো মাল নেই</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[4rem] border-4 border-slate-50 shadow-2xl p-12 h-full">
                        <div className="flex justify-between items-center mb-10">
                            <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-4 text-black">
                                <TrendingUp className="text-emerald-500" /> ফুরিয়ে যাওয়ার পূর্বাভাস (Intel)
                            </h4>
                            <span className="px-6 py-2 bg-slate-50 text-black dark:text-white dark:text-white rounded-full text-[10px] font-black uppercase tracking-widest">ট্রেকিং হচ্ছে</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {stats.depletionTrends.sort((a,b) => (a.daysLeft === 'INF' ? 999 : a.daysLeft) - (b.daysLeft === 'INF' ? 999 : b.daysLeft)).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-6 border-2 border-slate-50 rounded-3xl bg-slate-50/50 italic group hover:border-black transition-all">
                                    <div className="flex-1">
                                        <p className="text-xl font-black text-black dark:text-white uppercase"><SafeText data={item.name} /></p>
                                        <p className="text-[10px] font-black text-black dark:text-white dark:text-white uppercase mt-1">গড় ব্যবহার: <SafeText data={item.dailyBurn} /> / দিন</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase text-black dark:text-white dark:text-white">ফুরিয়ে যাবে প্রায়</p>
                                        <p className={`text-4xl font-black italic tracking-tighter leading-none ${item.daysLeft < 3 ? 'text-rose-500' : item.daysLeft < 7 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {item.daysLeft === 'INF' ? '∞' : <span><SafeText data={item.daysLeft} /> দিন</span>}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black rounded-[4rem] shadow-3xl p-12 h-full text-white relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                                <Star className="text-amber-500" fill="currentColor" /> সেরা পারফর্মিং কারিগর (Top 10)
                            </h4>
                            <span className="px-6 py-2 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest">গ্লোবাল র‍্যাঙ্কিং</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar relative z-10">
                            {stats.topWorkers.map((w, idx) => (
                                <div key={idx} className="flex items-center justify-between p-6 border border-white/10 rounded-3xl bg-white/5 italic group/row hover:bg-white hover:text-black dark:text-white transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center font-black group-hover/row:bg-black group-hover/row:text-white transition-all">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xl font-black uppercase"><SafeText data={w.name} /></p>
                                            <p className="text-[10px] font-black text-white/70 uppercase group-hover/row:text-black/40">আউটপুট: <SafeText data={w.received} /> পিস</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black italic tracking-tighter leading-none">{Math.round((w.received / (w.total || 1)) * 100)}%</p>
                                        <p className="text-[9px] font-black uppercase opacity-70">কাজের দক্ষতা</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Activity className="absolute bottom-[-10%] left-[-5%] text-white opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" size={240} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessIntel;
