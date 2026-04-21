import React, { useState } from "react";
import {
   DollarSign,
   Truck,
   Coffee,
   AlertCircle,
   Calendar,
   Printer,
   Plus,
   Trash2,
   CheckCircle,
   FileText,
   UserCheck,
   TrendingUp,
   TrendingDown,
   X,
   ArrowLeft,
   Edit2,
   Archive,
   Search,
   Wallet,
   ArrowUpRight,
   Users,
   Activity,
   Share2,
   ShieldCheck,
   Database
} from "lucide-react";
import NRZLogo from "../NRZLogo";
import UniversalSlip from "../UniversalSlip";

const ExpensePanel = ({
   masterData,
   setMasterData,
   initialTab,
   showNotify,
   user,
   setActivePanel,
   t,
   logAction,
   onSyncGoogle,
   logs,
   SafeText,
}) => {
   const role = user?.role?.toLowerCase();
   const isAdmin = role === "admin";
   const [editExpense, setEditExpense] = useState(null);
   const [receivePaymentModal, setReceivePaymentModal] = useState(null);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedClientLedger, setSelectedClientLedger] = useState(null);
   const [showPrint, setShowPrint] = useState(false);
   const [printSlip, setPrintSlip] = useState(null);
   const [activeTab, setActiveTab] = useState(initialTab || "treasury");
   const [cashSubTab, setCashSubTab] = useState("daily");
   const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split("T")[0]);

   React.useEffect(() => {
      if (initialTab) setActiveTab(initialTab);
   }, [initialTab]);

   const expenses = masterData.expenses || [];
   const cashEntries = masterData.cashEntries || [];

   // Balance Logic: Source of TRUTH is cashEntries and expenses
   const totalCashIn = React.useMemo(() => (cashEntries || []).reduce((sum, entry) => sum + Number(entry.amount), 0), [cashEntries]);
   const totalExpenses = React.useMemo(() => (expenses || []).reduce((sum, entry) => sum + Number(entry.amount), 0), [expenses]);
   const currentBalance = totalCashIn - totalExpenses;

   const filteredExpenses = React.useMemo(() => {
      return expenses.filter((e) => {
         const matchesDate = cashSubTab === "daily" ? e.date === summaryDate : true;
         const matchesSearch = !searchTerm || e?.description?.toLowerCase().includes(searchTerm.toLowerCase()) || e?.category?.toLowerCase().includes(searchTerm.toLowerCase());
         return matchesDate && matchesSearch;
      });
   }, [expenses, cashSubTab, summaryDate, searchTerm]);

   const dailyTotal = React.useMemo(() => filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0), [filteredExpenses]);

   const clientBalances = React.useMemo(() => {
      return (masterData.clients || []).map(client => {
         const txs = (masterData.clientTransactions || []).filter(t => t.client === client);
         const billed = txs.reduce((sum, t) => t.type === 'BILL' ? sum + Number(t.amount) : sum, 0);
         const paid = txs.reduce((sum, t) => t.type === 'PAYMENT' ? sum + Number(t.amount) : sum, 0);
         return { client, billed, paid, due: billed - paid };
      }).sort((a, b) => b.due - a.due);
   }, [masterData.clients, masterData.clientTransactions]);

   const handleUpdateExpense = (e) => {
      e.preventDefault();
      const f = e.target;
      const updated = { ...editExpense, date: f.date.value, category: f.category.value, description: f.description.value, amount: Number(f.amount.value) };
      setMasterData((prev) => ({ ...prev, expenses: (prev.expenses || []).map((exp) => exp.id === updated.id ? updated : exp) }));
      logAction(user, 'EXPENSE_EDIT', `Updated expense: ${updated.description} (৳${updated.amount})`);
      setEditExpense(null);
      showNotify("খরচ আপডেট করা হয়েছে!");
   };

   const handleDeleteExpense = (id) => {
      if (!isAdmin) return;
      const exp = (masterData.expenses || []).find(e => e.id === id);
      setMasterData(prev => ({ ...prev, expenses: (prev.expenses || []).filter(e => e.id !== id) }));
      logAction(user, 'EXPENSE_DELETE', `Deleted expense: ${exp?.description} (৳${exp?.amount})`);
      showNotify("খরচটি মুছে ফেলা হয়েছে!");
   };

   const handleDeleteCash = (id) => {
      if (!isAdmin) return;
      const cash = (masterData.cashEntries || []).find(c => c.id === id);
      setMasterData(prev => ({ ...prev, cashEntries: (prev.cashEntries || []).filter(c => c.id !== id) }));
      logAction(user, 'CASH_DELETE', `Deleted cash entry: ${cash?.description} (৳${cash?.amount})`);
      showNotify("ক্যাশ এন্টি মুছে ফেলা হয়েছে!");
   };

   const handleAddExpense = (e, shouldPrint = false) => {
      if (e) e.preventDefault();
      const f = e.target.form || e.target;
      const newExp = { id: "EXP-" + Date.now(), date: f.date.value, category: f.category.value, description: f.description.value, amount: Number(f.amount.value) };
      setMasterData((prev) => ({ ...prev, expenses: [newExp, ...(prev.expenses || [])] }));
      logAction(user, 'EXPENSE_ADD', `Added expense: ${newExp.description} (৳${newExp.amount})`);
      if (shouldPrint) setPrintSlip({ ...newExp, type: 'EXPENSE' });
      f.reset();
      setCashSubTab("daily");
      showNotify("নতুন খরচ সফলভাবে যোগ করা হয়েছে!");
   };

   const handleAddCash = (e, shouldPrint = false) => {
      if (e) e.preventDefault();
      const f = e.target.form || e.target;
      const newCash = { id: "CASH-" + Date.now(), date: f.date.value, description: f.description.value, amount: Number(f.amount.value) };
      setMasterData((prev) => ({ ...prev, cashEntries: [newCash, ...(prev.cashEntries || [])] }));
      logAction(user, 'CASH_ADD', `Added cash injection: ${newCash.description} (৳${newCash.amount})`);
      if (shouldPrint) setPrintSlip({ ...newCash, type: 'PAYMENT' });
      f.reset();
      setCashSubTab("all");
      showNotify("ক্যাশ-ইন সফলভাবে যোগ করা হয়েছে!");
   };

   const handleReceiveClientPayment = (e, shouldPrint = false) => {
      if (e) e.preventDefault();
      const f = e.target.form || e.target;
      const amt = Number(f.amount.value);
      if (amt <= 0) return;
      const client = receivePaymentModal;
      const note = f.note.value;
      const dt = new Date().toLocaleDateString("en-GB");
      const txn = { id: `txn_${Date.now()}_P`, date: dt, client, type: 'PAYMENT', amount: amt, note };
      const cash = { id: `CASH-${Date.now()}`, date: dt, description: `B2B PAYMENT: ${client} - ${note}`, amount: amt };

      setMasterData(prev => ({
         ...prev,
         clientTransactions: [txn, ...(prev.clientTransactions || [])],
         cashEntries: [cash, ...(prev.cashEntries || [])]
      }));
      logAction(user, 'CLIENT_PAYMENT_RECEIVE', `Received ৳${amt} from ${client}`);
      if (shouldPrint) setPrintSlip({ ...txn, type: 'PAYMENT' });
      setReceivePaymentModal(null);
      showNotify(`${client} থেকে ৳${amt.toLocaleString()} পেমেন্ট ফাণ্ডে যুক্ত করা হয়েছে!`);
   };

   if (printSlip) {
      return (
         <div className="min-h-screen bg-white p-10 font-outfit italic animate-fade-up">
            <style>{`@media print { .no-print { display: none !important; } }`}</style>
            <div className="no-print flex justify-between items-center mb-10 max-w-5xl mx-auto">
               <button onClick={() => setPrintSlip(null)} className="px-8 py-4 bg-slate-50 rounded-2xl font-black uppercase text-[10px] hover:bg-black hover:text-white transition-all">Cancel</button>
               <button onClick={() => window.print()} className="px-12 py-4 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3"><Printer size={18} /> Print Voucher</button>
            </div>
            <div className="w-[210mm] mx-auto bg-white border border-slate-100 shadow-2xl p-1 relative">
               <UniversalSlip data={printSlip} type={printSlip.type} copyTitle="RECIPIENT COPY" SafeText={SafeText} />
               <div className="h-4 border-t-2 border-dashed border-slate-300 my-10"></div>
               <UniversalSlip data={printSlip} type={printSlip.type} copyTitle="OFFICE COPY" SafeText={SafeText} />
            </div>
         </div>
      );
   }

   if (showPrint) {
      return (
         <div className="min-h-screen bg-white p-6 md:p-12 text-black font-outfit uppercase italic animate-fade-in">
            <style>{`@media print { .no-print { display: none !important; } @page { margin: 10mm; size: A4 portrait; } }`}</style>
            <div className="max-w-4xl mx-auto space-y-12">
               <div className="no-print flex justify-between items-center bg-slate-50 p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
                  <div className="space-y-1"><h2 className="text-3xl font-black italic text-black dark:text-white">FINANCIAL AUDIT</h2><p className="text-[10px] font-bold opacity-40 tracking-widest uppercase">Verified Factory Liquidity Report</p></div>
                  <div className="flex gap-4"><button onClick={() => setShowPrint(false)} className="px-10 py-5 bg-white border-4 border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest">CANCEL</button><button onClick={() => window.print()} className="px-12 py-5 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3"><Printer size={18} /> PRINT RECORD</button></div>
               </div>
               <div className="border-[15px] border-black p-16 rounded-[4rem] relative overflow-hidden bg-white shadow-4xl text-black">
                  <div className="flex justify-between items-start border-b-[10px] border-black pb-14 mb-14">
                     <div className="space-y-4">
                        <div className="w-20 h-2 bg-blue-600"></div>
                        <div><h1 className="text-5xl font-black italic tracking-tighter leading-none mb-3">NRZOONE FACTORY HUB</h1><p className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-400">Global Operational Treasury Ledger</p></div>
                     </div>
                     <div className="text-right italic"><p className="text-4xl font-black leading-none">{summaryDate}</p><span className="inline-block bg-black text-white px-6 py-2 rounded-full text-[10px] font-black mt-4">VERIFIED AUDIT</span></div>
                  </div>
                  <div className="space-y-10">
                     {filteredExpenses.map((exp, i) => (
                        <div key={i} className="flex justify-between items-end py-10 border-b-4 border-slate-50"><div className="space-y-3"><p className="text-3xl font-black leading-none uppercase italic">{exp.description}</p><p className="text-[11px] font-bold text-blue-600 tracking-widest">[{t(exp.category) || exp.category}] // REF#{exp.id?.slice(-6)}</p></div><p className="text-5xl font-black">৳{exp.amount.toLocaleString()}</p></div>
                     ))}
                     {filteredExpenses.length === 0 && <div className="py-24 text-center opacity-20 text-xs font-black uppercase tracking-[0.5em]">No activity detected within the selected cycle</div>}
                  </div>
                  <div className="mt-20 pt-16 border-t-[10px] border-black flex justify-between items-center bg-slate-50 p-12 rounded-[3rem]">
                     <div><p className="text-[12px] font-black uppercase tracking-widest opacity-40">Grand Total Consumption</p><p className="text-3xl font-black italic uppercase">Verified Audit Balance</p></div>
                     <p className="text-7xl font-black">৳{dailyTotal.toLocaleString()}</p>
                  </div>
                  <div className="mt-24 flex justify-between items-center opacity-40 italic font-black text-[12px] uppercase">
                     <div className="space-y-2"><p className="mb-4">Authorized Signature</p><div className="w-64 h-1 bg-black"></div></div>
                     <p className="tracking-[0.8em]">NRZONE Factory System</p>
                  </div>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-12 animate-fade-in no-scrollbar transition-all duration-1000">
         {/* 🚀 Master Navigation Hub */}
         <div className="bg-white dark:bg-slate-900 !p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap gap-2 sticky top-0 z-50 backdrop-blur-3xl bg-white/80 dark:bg-slate-900/80">
            {[
               { id: 'treasury', label: 'ট্রেজারি (ক্যাশ)', icon: Wallet },
               { id: 'workforce', label: 'কারিগর লেজার', icon: UserCheck },
               { id: 'analytics', label: 'অডিট ও রিপোর্ট', icon: TrendingUp }
            ].filter(tab => {
               if (role === 'worker') return tab.id === 'workforce';
               return true;
            }).map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-md scale-105' : 'text-slate-400 hover:text-black dark:hover:text-white'}`}
               >
                  <tab.icon size={14} className={activeTab === tab.id ? 'animate-pulse' : ''} /> {tab.label}
               </button>
            ))}
         </div>

         {/* 💰 1. Treasury Module (Financial Hub) */}
         {activeTab === 'treasury' && (
            <div className="space-y-10 animate-fade-up">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="saas-card !p-8 flex flex-col justify-between group h-64 relative overflow-hidden bg-white dark:bg-slate-900 shadow-xl border-emerald-500/10 hover:border-emerald-500/30">
                     <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-700"><TrendingUp size={180} /></div>
                     <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform"><Wallet size={24} /></div>
                     <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Factory Liquid Capital</p>
                        <h2 className="text-4xl font-black tracking-tighter text-black dark:text-white leading-none italic">৳{currentBalance.toLocaleString()}</h2>
                     </div>
                  </div>

                  <div className="saas-card !p-8 flex flex-col justify-between group h-64 relative overflow-hidden bg-white dark:bg-slate-900 shadow-xl border-rose-500/10 hover:border-rose-500/30">
                     <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-700"><TrendingDown size={180} /></div>
                     <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-0 transition-transform"><DollarSign size={24} /></div>
                     <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Operational Burn Rate</p>
                        <h2 className="text-4xl font-black tracking-tighter text-black dark:text-white leading-none italic">৳{totalExpenses.toLocaleString()}</h2>
                     </div>
                  </div>

                  <button onClick={() => setShowPrint(true)} className="saas-card !p-8 flex flex-col justify-between group h-64 relative overflow-hidden bg-slate-950 text-white border-none shadow-xl hover:scale-105 active:scale-95 transition-all">
                     <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 transition-all"><Printer size={24} /></div>
                     <div className="text-left relative z-10">
                        <h2 className="text-3xl font-black text-white italic uppercase mb-2 leading-none tracking-tighter">GENERATE AUDIT</h2>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Official Financial Transcript Registry</p>
                     </div>
                  </button>
               </div>

               <div className="saas-card !p-4 flex flex-col lg:flex-row items-center justify-between gap-6 border-slate-100 dark:border-slate-800 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto">
                     {['daily', 'all', 'new', isAdmin && 'cashIn'].filter(Boolean).map(v => (
                        <button key={v} onClick={() => setCashSubTab(v)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 italic ${cashSubTab === v ? 'bg-black text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400 hover:text-black'}`}>
                           {v === 'daily' ? ' DAILY LOG ' : v === 'all' ? ' INJECTION HISTORY ' : v === 'new' ? ' BURN $(-)$ ' : ' INJECT $(+)$ '}
                        </button>
                     ))}
                  </div>
                  <div className="flex gap-4 w-full lg:w-auto items-center">
                     <div className="relative flex-1 lg:w-80"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input placeholder="SEARCH GLOBAL AUDIT..." className="premium-input !pl-16 !h-14 !text-[11px] !bg-slate-50 !border-none font-bold italic shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                     {cashSubTab === 'daily' && <input type="date" className="premium-input !h-14 !w-auto !bg-slate-950 !text-white !border-none text-center rounded-xl shadow-lg text-sm" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} />}
                  </div>
               </div>

               {cashSubTab === 'daily' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                     {filteredExpenses.map((exp, idx) => (
                        <div key={exp.id || idx} className="saas-card !p-8 h-72 flex flex-col justify-between group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden bg-white dark:bg-slate-800 shadow-lg animate-fade-up border-b-8 border-b-slate-50 dark:border-b-slate-950 italic" style={{ animationDelay: `${idx * 100}ms` }}>
                           <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-10 transition-opacity"><DollarSign size={160} /></div>
                           <div className="relative z-10 flex flex-col flex-1">
                              <div className="flex justify-between items-start mb-6">
                                 <span className="px-4 py-1.5 bg-slate-950 text-white dark:bg-white dark:text-black rounded-lg text-[9px] font-black uppercase tracking-widest italic shadow-lg">{t(exp.category) || exp.category}</span>
                                 <div className="flex gap-2">
                                    <button onClick={() => setEditExpense(exp)} className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-500 hover:bg-black hover:text-white transition-all shadow-md"><Edit2 size={14} /></button>
                                    {isAdmin && <button onClick={() => handleDeleteExpense(exp.id)} className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-500 hover:bg-rose-600 hover:text-white transition-all shadow-md"><Trash2 size={14} /></button>}
                                 </div>
                              </div>
                              <h5 className="text-xl font-black uppercase leading-tight italic text-slate-950 dark:text-white mb-4 tracking-tighter truncate">{exp.description}</h5>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Calendar size={14} className="text-blue-600" /> {exp.date} // {exp.id?.slice(-8)}</p>
                           </div>
                           <div className="relative z-10 mt-auto flex justify-between items-end">
                              <p className="text-5xl font-black italic tracking-tighter text-slate-950 dark:text-white">৳{exp.amount.toLocaleString()}</p>
                              <ArrowUpRight className="text-blue-600 opacity-20 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500" size={32} />
                           </div>
                        </div>
                     ))}
                     {filteredExpenses.length === 0 && <div className="col-span-full py-52 saas-card bg-white dark:bg-slate-800 border-4 border-dashed opacity-20 flex flex-col items-center justify-center italic font-black uppercase tracking-[1em]"><Archive size={100} strokeWidth={1} className="mb-10 text-black dark:text-white" /> NO AUDIT RECORD FOUND</div>}
                  </div>
               )}

               {cashSubTab === 'all' && (
                  <div className="saas-card !p-0 overflow-hidden shadow-2xl border-emerald-500/10 bg-white dark:bg-slate-900">
                      <div className="p-8 border-b-4 border-slate-50 dark:border-slate-800 flex justify-between items-center bg-emerald-50/20 dark:bg-emerald-900/10 backdrop-blur-xl">
                         <div><h3 className="text-2xl font-black italic uppercase text-emerald-600 leading-none mb-2">Capital Flow Registry</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Historical Inflow Sequence Records</p></div>
                         <TrendingUp size={32} className="text-emerald-500 animate-pulse" />
                      </div>
                      <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 font-mono"><th className="px-8 py-6">Timeline</th><th className="px-8 py-6">Source Node</th><th className="px-8 py-6 text-right">Inflow Value</th>{isAdmin && <th className="px-8 py-6 text-center">Action</th>}</tr></thead><tbody className="divide-y-2 divide-slate-50 dark:divide-slate-800">{cashEntries.map((cash, i) => (<tr key={cash.id || i} className="group hover:bg-emerald-50/10 dark:hover:bg-emerald-900/10 transition-all duration-300"><td className="px-8 py-6 font-bold uppercase italic text-xs tabular-nums text-black dark:text-white">{cash.date}</td><td className="px-8 py-6 font-bold uppercase text-slate-900 dark:text-slate-100 leading-none italic text-xs">{cash.description}</td><td className="px-8 py-6 text-right font-black text-2xl text-emerald-600 italic tracking-tighter">৳{cash.amount.toLocaleString()}</td>{isAdmin && (<td className="px-8 py-6 text-center"><button onClick={() => handleDeleteCash(cash.id)} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:bg-rose-600 hover:text-white shadow-lg transition-all mx-auto active:scale-95"><Trash2 size={18} /></button></td>)}</tr>))}</tbody></table></div>
                   </div>
               )}

               {(cashSubTab === 'new' || cashSubTab === 'cashIn') && (
                  <div className="flex justify-center"><form onSubmit={cashSubTab === 'new' ? handleAddExpense : handleAddCash} className="saas-card w-full max-w-2xl !p-12 space-y-8 animate-fade-up border-[10px] border-slate-50 dark:border-slate-800 shadow-2xl relative overflow-hidden italic bg-white dark:bg-slate-900"><div className="text-center space-y-4"><div className={`mx-auto w-20 h-20 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-12 mb-6 animate-bounce ${cashSubTab === 'new' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{cashSubTab === 'new' ? <TrendingDown size={32} /> : <TrendingUp size={32} />}</div><h3 className="text-4xl font-black text-black dark:text-white uppercase italic leading-none tracking-tighter">{cashSubTab === 'new' ? 'CONSUMPTION' : 'INJECTION'}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">{cashSubTab === 'new' ? 'Operational Burn Sequence' : 'Capital Growth Protocol'}</p></div><div className="grid grid-cols-2 gap-6">{cashSubTab === 'new' && <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-6 uppercase italic tracking-widest leading-none">Category Node</label><select name="category" className="premium-input !h-14 !text-xs font-black uppercase italic bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner text-black dark:text-white" required>{["teaSnacks", "transport", "material", "utilities", "salary", "bonus", "others"].map(c => <option key={c} value={c}>{t(c)}</option>)}</select></div>}<div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-6 uppercase italic tracking-widest leading-none">Timeline Protocol</label><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="premium-input !h-14 !bg-slate-950 !text-white !border-none text-center rounded-xl shadow-lg text-sm" required /></div></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-6 uppercase italic tracking-widest leading-none">Memo Registry</label><input name="description" placeholder="ENTER TRANSACTION METADATA..." className="premium-input !h-14 !text-xs font-bold italic uppercase bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner text-black dark:text-white" required /></div><div className="bg-slate-950 p-12 rounded-[3rem] shadow-xl text-center relative overflow-hidden"><div className="absolute top-0 right-0 p-8 opacity-10 text-white"><DollarSign size={100} /></div><label className="text-[11px] font-black text-white/30 uppercase tracking-widest mb-6 block italic leading-none">LIQUIDITY VALUE</label><div className="flex items-center justify-center text-white"><span className="text-4xl font-black text-white/20 mr-6 italic">৳</span><input name="amount" type="number" placeholder="0" className="w-full text-center text-7xl font-black bg-transparent border-none text-white outline-none leading-none h-24 italic tracking-tighter" required autoFocus /></div></div><div className="flex gap-4">
   <button type="button" onClick={(e) => cashSubTab === 'new' ? handleAddExpense(e, false) : handleAddCash(e, false)} className={`flex-1 py-8 rounded-[2rem] shadow-xl border-b-8 transition-all text-xl font-black uppercase italic active:scale-95 leading-none ${cashSubTab === 'new' ? 'bg-rose-600 border-rose-900 text-white' : 'bg-emerald-600 border-emerald-900 text-white'}`}>সংরক্ষণ করুন (SAVE ONLY)</button>
   <button type="button" onClick={(e) => cashSubTab === 'new' ? handleAddExpense(e, true) : handleAddCash(e, true)} className="flex-[2] py-8 bg-slate-950 text-white rounded-[2rem] border-b-8 border-black shadow-xl text-xl font-black uppercase italic flex items-center justify-center gap-4 active:scale-95 transition-all"><Printer size={24} /> সংরক্ষণ ও প্রিন্ট (PRINT)</button>
</div></form></div>
               )}
            </div>
         )}

         {activeTab === "partners" && (
            <div className="space-y-12 animate-fade-up">
               <div className="saas-card !p-8 flex flex-col lg:flex-row justify-between items-center gap-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl shadow-4xl border-2 border-slate-50 dark:border-slate-800">
                  <div className="flex-1 w-full relative"><Search size={28} className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-300" /><input placeholder="SEARCH GLOBAL B2B ENTITIES..." className="premium-input !h-24 !pl-28 !text-[15px] !bg-transparent !border-none font-black italic text-black dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                  <div className="flex items-center gap-8 px-12 border-l-8 border-slate-50 dark:border-slate-800"><div className="text-right text-black dark:text-white"><p className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic leading-none underline decoration-blue-500 decoration-4 mb-3">{clientBalances.length} PARTNERS Online</p><p className="text-3xl font-black tracking-tighter italic">LEDGER SYNCED</p></div><div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse shadow-33xl shadow-emerald-500/40"></div></div>
               </div>

               {!selectedClientLedger ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                      {clientBalances.filter(c => c.client.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => (
                         <div key={idx} onClick={() => setSelectedClientLedger(item.client)} className="saas-card bg-white dark:bg-slate-900 shadow-xl flex flex-col justify-between h-[300px] border-l-[10px] border-l-slate-950 dark:border-l-white hover:border-l-blue-600 transition-all duration-500 group cursor-pointer relative overflow-hidden !p-8 italic hover:scale-105">
                            <div className="absolute -top-10 -right-10 p-16 opacity-[0.03] group-hover:opacity-10 transition-opacity"><UserCheck size={180} /></div>
                            <div className="flex justify-between items-start mb-6 relative z-10">
                               <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none underline decoration-blue-500 decoration-2 mb-1">B2B NODE</p><h3 className="text-2xl font-black italic tracking-tighter text-slate-950 dark:text-white leading-none uppercase truncate max-w-[160px]">{item.client}</h3></div>
                               <button onClick={e => { e.stopPropagation(); setReceivePaymentModal(item.client); }} className="w-14 h-14 bg-white dark:bg-slate-800 text-emerald-600 rounded-2xl shadow-lg flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all scale-90 group-hover:scale-110 active:scale-95"><Plus size={24} /></button>
                            </div>
                            <div className="space-y-6 relative z-10">
                               <div className="flex justify-between items-end border-b-4 border-slate-50 dark:border-slate-800 pb-4"><p className="text-xs font-black text-slate-400 uppercase">Active Debt</p><p className={`text-2xl font-black italic tracking-tighter tabular-nums ${item.due > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>৳{item.due.toLocaleString()}</p></div>
                               <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl shadow-inner"><div className="text-center flex-1 border-r-2 border-slate-200 dark:border-slate-700 text-black dark:text-white"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Billed</p><p className="text-lg font-black tabular-nums">{item.billed.toLocaleString()}</p></div><div className="text-center flex-1 text-black dark:text-white"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Paid</p><p className="text-lg font-black text-emerald-600 tabular-nums">{item.paid.toLocaleString()}</p></div></div>
                            </div>
                         </div>
                      ))}
                   </div>
               ) : (
                  <div className="saas-card bg-white dark:bg-slate-900 animate-fade-in relative !p-10 shadow-2xl border-[10px] border-slate-50 dark:border-slate-800 rounded-[3rem] italic">
                      <button onClick={() => setSelectedClientLedger(null)} className="absolute top-10 right-10 w-14 h-14 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl"><ArrowLeft size={24} /></button>
                      <div className="mb-12 flex items-center gap-8"><div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-xl rotate-12 animate-pulse"><UserCheck size={40} /></div><div><h3 className="text-4xl font-black italic tracking-tighter text-black dark:text-white uppercase leading-none mb-2">{selectedClientLedger}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none underline decoration-blue-600 decoration-4 underline-offset-4">Neural Ledger Audit Registry Sequence</p></div></div>
                      <div className="overflow-x-auto no-scrollbar rounded-2xl shadow-inner"><table className="w-full text-left border-collapse"><thead><tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-4 border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 font-mono"><th className="py-6 px-8">Timeline</th><th className="py-6 px-8">Type</th><th className="py-6 px-8">Memo</th><th className="py-6 px-8 text-right">Liquidity</th></tr></thead><tbody className="divide-y-2 divide-slate-50 dark:divide-slate-800 bg-white dark:bg-slate-900">{(masterData.clientTransactions || []).filter(t => t.client === selectedClientLedger).sort((a, b) => new Date(b.date?.split('/').reverse().join('-')) - new Date(a.date?.split('/').reverse().join('-'))).map((t, idx) => (<tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"><td className="py-6 px-8 font-bold uppercase italic tabular-nums text-sm text-black dark:text-white">{t.date}</td><td className="py-6 px-8"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-md ${t.type === 'BILL' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>{t.type}</span></td><td className="py-6 px-8 text-[11px] font-bold uppercase text-slate-400 italic max-w-xs truncate leading-none text-black dark:text-white">{t.note}</td><td className={`py-6 px-8 text-right font-black text-2xl tabular-nums tracking-tighter italic ${t.type === 'BILL' ? 'text-rose-600' : 'text-emerald-500'}`}>{t.type === 'BILL' ? '-' : '+'} ৳{t.amount?.toLocaleString()}</td></tr>))}</tbody></table></div>
                   </div>
               )}
            </div>
         )}

         {activeTab === "workforce" && (
            <div className="animate-fade-up">
               <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group mb-10">
                  <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform"><UserCheck size={160} /></div>
                  <h2 className="text-4xl font-black tracking-tighter italic uppercase mb-2 text-black dark:text-white">Centralized Disbursement</h2>
                  <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.5em] italic">Pay any worker from any department instantly</p>
               </div>
               <div className="py-20 text-center opacity-20 italic font-black uppercase tracking-widest">Workforce Ledger moved to individual factories</div>
            </div>
         )}

         {/* 📊 4. Analytics Module */}
         {activeTab === "analytics" && (
            <div className="space-y-12 animate-fade-up">
               <div className="saas-card !p-10 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-8 border-emerald-500/20 shadow-2xl relative overflow-hidden group rounded-[2.5rem] italic">
                  <div className="absolute -top-10 -right-10 p-16 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-1000"><Share2 size={160} className="text-emerald-600" /></div>
                  <div className="space-y-3 relative z-10"><h4 className="text-3xl font-black uppercase text-emerald-600 leading-none italic tracking-tighter">CLOUD ARCHITECTURE</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Global Registry Sync to Google Cloud Infrastructure</p></div>
                  <button
                     onClick={() => { if (window.confirm("COMMIT ALL LOCAL DATA TO GOOGLE CLOUD?")) onSyncGoogle(); }}
                     className="px-10 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4 shadow-xl hover:bg-slate-950 transition-all border-b-8 border-emerald-900 active:scale-95 group relative z-10"
                  >
                     <Database size={24} className="group-hover:animate-spin" /> GOOGLE SHEETS SYNC
                  </button>
               </div>
               <div className="py-20 text-center opacity-20 italic font-black uppercase tracking-widest">Business Analytics consolidated in Treasury</div>
               <div className="saas-card !p-12 bg-slate-950 dark:bg-slate-950 text-white flex flex-col items-center justify-center gap-10 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>
                  <Activity size={64} className="text-blue-600 animate-pulse" />
                  <div className="text-center space-y-4 relative z-10"><h4 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Neural Insights Active</h4><p className="text-[11px] text-white/30 font-black uppercase tracking-widest leading-none italic">Live Factory Reporting Sequence in Synchronized Motion</p></div>
               </div>
            </div>
         )}

         {/* 🛡️ 5. System Module (Master Control) */}
         {activeTab === "system" && (
            <div className="space-y-12 animate-fade-up">
               <div className="saas-card !p-12 bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-2xl rounded-[3rem] italic">
                  <div className="flex items-center gap-8 mb-16">
                     <div className="w-16 h-16 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-xl rotate-12 scale-110 animate-pulse"><ShieldCheck size={32} /></div>
                     <div><h3 className="text-4xl font-black uppercase italic tracking-tighter text-slate-950 dark:text-white leading-none mb-2">SYSTEM ENVIRONMENT</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic decoration-blue-600 underline underline-offset-4 decoration-2">High Forensic Neural Node Architecture v5.2A</p></div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-24">
                     <div className="space-y-12">
                        <div className="flex items-center justify-between border-b-[10px] border-slate-50 dark:border-slate-800 pb-10 text-black dark:text-white"><h4 className="text-3xl font-black uppercase tracking-widest italic">Neural Activity Pulse</h4><Activity size={40} className="text-blue-600 animate-bounce" /></div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-6 no-scrollbar">
                           {(masterData.auditLogs || logs).slice(0, 100).map((log, i) => (
                              <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-white dark:border-slate-700 shadow-xl hover:border-black dark:hover:border-white transition-all group flex flex-col gap-4 scale-95 hover:scale-100 duration-500">
                                 <div className="flex justify-between items-center"><span className="px-4 py-1.5 bg-slate-950 text-white dark:bg-white dark:text-black rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg group-hover:bg-blue-600 transition-colors"><SafeText data={log.action} /></span><p className="text-[10px] font-black text-slate-400 font-mono tracking-tighter italic tabular-nums">{new Date(log.timestamp).toLocaleString()}</p></div>
                                 <p className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase italic leading-none tracking-tighter"><SafeText data={log.details} /></p>
                                 <div className="flex items-center gap-3 mt-1 pt-6 border-t border-slate-200 dark:border-slate-700"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg italic">{log.user?.[0]?.toUpperCase() || 'A'}</div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic"><SafeText data={log.user} /> // ROLE: <SafeText data={log.role || 'ADMIN'} /></p></div>
                              </div>
                           ))}
                           {(masterData.auditLogs || logs).length === 0 && <div className="py-40 text-center opacity-10 flex flex-col items-center italic font-black uppercase tracking-[1em]"><ShieldCheck size={100} className="mb-10 text-black dark:text-white" /> VAULT EMPTY</div>}
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="bg-rose-50 dark:bg-rose-900/10 p-10 rounded-[3rem] border-4 border-rose-100 dark:border-rose-900/30 relative overflow-hidden group shadow-xl">
                           <div className="absolute -top-10 -right-10 p-16 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-1000"><Trash2 size={240} className="text-rose-600" /></div>
                           <h4 className="text-2xl font-black uppercase tracking-widest text-rose-600 flex items-center gap-6 italic mb-8"><TrendingDown size={32} /> FATAL OVERRIDE</h4>
                           <p className="text-xs font-bold text-rose-500/80 italic leading-relaxed mb-12 max-w-md underline decoration-rose-600 decoration-2 underline-offset-4">DANGER: These protocols bypass neural encryption and result in irreversible total data loss.</p>
                           <div className="space-y-4 relative z-10">
                              <button onClick={() => { if (window.confirm("FATAL ERROR: ERASE ENTIRE PRODUCTION LEDGER?")) setMasterData(p => ({ ...p, productions: [] })); }} className="w-full py-6 bg-white dark:bg-slate-800 border-b-8 border-rose-200 dark:border-rose-900 hover:border-b-0 hover:translate-y-2 text-rose-600 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-md transition-all">[RESET] Production Cluster</button>
                              <button onClick={() => { if (window.confirm("FATAL ERROR: ERASE COMPLETE AUDIT ARCHIVES?")) setMasterData(p => ({ ...p, auditLogs: [] })); }} className="w-full py-6 bg-white dark:bg-slate-800 border-b-8 border-slate-200 dark:border-slate-700 hover:border-b-0 hover:translate-y-2 text-slate-300 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-md transition-all">[RESET] Forensic Audit Trail</button>
                              <button onClick={() => { if (window.confirm("SYSTEM WIPE: RESET ALL GLOBAL FINANCIAL NODES?")) setMasterData(p => ({ ...p, expenses: [], cashEntries: [], clientTransactions: [] })); }} className="w-full py-8 bg-rose-600 border-b-12 border-rose-900 hover:border-b-0 hover:translate-y-2 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">SYSTEM FINANCIAL WIPE</button>
                           </div>
                        </div>
                        <div className="saas-card !p-16 border-8 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-[5rem] group hover:bg-slate-950 transition-all duration-1000"><div className="flex justify-between items-center mb-12"><h4 className="text-[14px] font-black uppercase tracking-[1em] text-slate-400 italic">Core Environment Nodes</h4><Database size={32} className="opacity-20 group-hover:text-white group-hover:animate-spin" /></div><div className="space-y-8"><div className="flex justify-between items-center bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl group-hover:scale-95 transition-transform"><p className="text-sm font-black uppercase tracking-widest italic leading-none text-black dark:text-white">Database Architecture</p><p className="text-lg font-black text-blue-600 font-mono italic">SUPABASE.CLOUD v2.4X</p></div><div className="flex justify-between items-center bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl group-hover:scale-105 transition-transform"><p className="text-sm font-black uppercase tracking-widest italic leading-none text-black dark:text-white">Cluster Intelligence</p><p className="text-lg font-black text-emerald-600 font-mono italic">NRZ-OPR-2026.S52X</p></div></div></div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* 🏡 Master HUD Controller (Safe Return) */}
         <div className="flex justify-center pt-40 pb-32">
            <button onClick={() => setActivePanel("Overview")} className="group relative flex items-center gap-10 bg-white dark:bg-slate-800 px-12 py-6 rounded-full border-8 border-slate-50 dark:border-slate-700 shadow-xl hover:scale-110 transition-all duration-700 hover:bg-slate-950 hover:text-white">
               <div className="w-14 h-14 bg-slate-950 dark:bg-white text-white dark:text-black group-hover:bg-white group-hover:text-black dark:group-hover:bg-slate-950 dark:group-hover:text-white rounded-2xl group-hover:rotate-[360deg] transition-all duration-700 shadow-lg flex items-center justify-center rotate-6"><ArrowLeft size={28} strokeWidth={5} /></div>
               <span className="text-3xl font-black uppercase italic tracking-[0.3em] leading-none text-black dark:text-white group-hover:text-white">RETURN MASTER HUD</span>
            </button>
         </div>

         {/* 🚀 Modals Deployment Cluster */}
         {editExpense && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-[1000] flex items-center justify-center p-6">
               <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3.5rem] p-12 space-y-12 animate-fade-up shadow-2xl relative border-[15px] border-slate-50 dark:border-slate-800 italic">
                  <button onClick={() => setEditExpense(null)} className="absolute top-10 right-10 w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-lg"><X size={24} className="text-black dark:text-white" /></button>
                  <div className="text-center space-y-4"><div className="mx-auto w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] flex items-center justify-center shadow-xl rotate-12 mb-6"><Edit2 size={32} /></div><h3 className="text-4xl font-black uppercase italic leading-none text-black dark:text-white tracking-tighter">REVISE AUDIT</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-6 italic">Internal Global Ledger Adjustment Protocol</p></div>
                  <form onSubmit={handleUpdateExpense} className="space-y-8">
                     <div className="grid grid-cols-2 gap-8"><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-6 uppercase italic tracking-widest">Timeline Registry</label><input name="date" type="date" defaultValue={editExpense.date} className="premium-input !h-14 font-black !bg-slate-950 text-white border-none text-center rounded-xl shadow-lg text-sm" required /></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-6 uppercase italic tracking-widest">Node Category</label><select name="category" defaultValue={editExpense.category} className="premium-input !h-14 !text-xs font-bold uppercase italic bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner text-black dark:text-white" required>{["teaSnacks", "transport", "material", "utilities", "salary", "bonus", "others"].map(c => <option key={c} value={c}>{t(c)}</option>)}</select></div></div>
                     <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-6 uppercase italic tracking-widest font-mono italic">Audit Memo Signature</label><input name="description" defaultValue={editExpense.description} className="premium-input !h-14 !text-xs font-bold uppercase italic bg-slate-50 dark:bg-slate-800 rounded-xl shadow-inner text-black dark:text-white" required /></div>
                     <div className="bg-slate-950 p-12 rounded-[3.5rem] shadow-xl text-center relative overflow-hidden"><div className="absolute top-0 right-0 p-10 opacity-10 text-white"><DollarSign size={140} /></div><label className="text-[11px] font-black text-white/30 uppercase tracking-widest mb-6 block italic leading-none">REVISED VALUE</label><div className="flex items-center justify-center text-white"><span className="text-4xl font-black text-white/20 mr-6 italic">৳</span><input name="amount" type="number" defaultValue={editExpense.amount} className="w-full text-center text-7xl font-black bg-transparent border-none text-white outline-none leading-none h-24 italic tracking-tighter" required /></div></div>
                     <div className="flex gap-4"><button type="button" onClick={() => setEditExpense(null)} className="flex-1 py-8 rounded-[2rem] font-bold text-[11px] uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-black hover:bg-slate-100 transition-all italic leading-none">ABORT</button><button type="submit" className="flex-[2] py-8 rounded-[2rem] font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-xl border-b-10 border-blue-900 active:scale-95 transition-all italic leading-none">COMMIT ADJUSTMENT</button></div>
                  </form>
               </div>
            </div>
         )}

         {receivePaymentModal && (
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-center justify-center p-6">
               <div className="saas-card bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 md:p-16 animate-fade-up relative border-[15px] border-slate-50 dark:border-slate-800 italic">
                  <button onClick={() => setReceivePaymentModal(null)} className="absolute top-10 right-10 w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-lg"><X size={32} className="text-black dark:text-white" /></button>
                  <div className="text-center space-y-6 mb-12"><div className="mx-auto w-24 h-24 bg-emerald-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-xl rotate-12 mb-10 animate-pulse"><Wallet size={44} /></div><h3 className="text-5xl font-black uppercase italic leading-none text-black dark:text-white tracking-tighter">B2B INFLOW</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-8 italic">Global B2B Capital Injection Authorization Sequence</p><div className="inline-block bg-blue-600 text-white py-4 px-10 rounded-full text-sm font-black uppercase tracking-widest shadow-xl rotate-1 transform">NODE: {receivePaymentModal}</div></div>
                  <form onSubmit={handleReceiveClientPayment} className="space-y-12">
                     <div className="bg-slate-950 p-12 rounded-[3.5rem] shadow-xl text-center relative overflow-hidden"><div className="absolute top-0 right-0 p-10 opacity-10 text-white"><TrendingUp size={160} /></div><label className="text-[13px] font-black text-white/30 uppercase tracking-widest mb-10 block italic leading-none">LIQUID DEPOSIT VALUE</label><div className="flex items-center justify-center text-white"><span className="text-5xl font-black text-white/20 mr-8 italic">৳</span><input name="amount" type="number" placeholder="0" className="w-full text-center text-8xl font-black bg-transparent border-none text-white outline-none leading-none h-28 italic tracking-tighter" required autoFocus /></div></div>
                     <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 ml-10 uppercase italic tracking-widest font-mono italic leading-none">Deposit Authorization Memo</label><input name="note" placeholder="E.G. NEFT / RTGS / PHYSICAL CASH NODES" className="premium-input !h-16 !p-6 uppercase text-[10px] font-black bg-slate-50 dark:bg-slate-800 text-center rounded-2xl shadow-inner text-black dark:text-white" required /></div>
                     <div className="flex gap-4 pt-8">
                         <button type="button" onClick={() => setReceivePaymentModal(null)} className="flex-1 py-10 rounded-[2.5rem] font-bold uppercase text-[11px] tracking-widest text-slate-400 hover:text-black transition-all italic leading-none">ABORT</button>
                         <button type="button" onClick={(e) => handleReceiveClientPayment(e, false)} className="flex-[2] py-10 bg-emerald-600 text-white rounded-[2.5rem] shadow-xl font-black uppercase text-[11px] tracking-widest border-b-12 border-emerald-900 active:scale-95 transition-all italic leading-none">সংরক্ষণ (SAVE)</button>
                         <button type="button" onClick={(e) => handleReceiveClientPayment(e, true)} className="flex-[3] py-10 bg-slate-950 text-white rounded-[2.5rem] shadow-xl font-black uppercase text-[11px] tracking-widest border-b-12 border-black active:scale-95 transition-all italic leading-none flex items-center justify-center gap-3"><Printer size={20} /> সংরক্ষণ ও প্রিন্ট (PRINT)</button>
                      </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default ExpensePanel;
