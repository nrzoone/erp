import React, { useState, useMemo } from 'react';
import { 
  Users, DollarSign, ArrowRight, Activity, ShieldCheck, 
  Wallet, History, Search, Plus, X, ArrowLeft, Layers, Box,
  TrendingUp, TrendingDown, LayoutGrid, Printer, ChevronRight, BarChart2, CheckCircle, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientLedgerPanel = ({ masterData, setMasterData, showNotify, user, setActivePanel, logAction, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTab, setClientTab] = useState('Overview');
  const [showActionModal, setShowActionModal] = useState(null); // 'MATERIAL', 'ORDER', 'DELIVERY', 'FINANCE'

  // Financial Calculations for all clients
  const clientBalances = useMemo(() => {
    return (masterData.clients || []).map(clientName => {
      let billed = 0;
      let paid = 0;
      (masterData.clientTransactions || [])
        .filter(t => t.client?.toUpperCase() === clientName.toUpperCase())
        .forEach(t => {
          if (t.type === 'BILL') billed += Number(t.amount || 0);
          if (t.type === 'PAYMENT') paid += Number(t.amount || 0);
        });
      return { 
        name: clientName, 
        billed, 
        paid, 
        due: billed - paid 
      };
    }).sort((a, b) => b.due - a.due);
  }, [masterData.clients, masterData.clientTransactions]);

  const stats = useMemo(() => {
    const totalBilled = clientBalances.reduce((sum, c) => sum + c.billed, 0);
    const totalPaid = clientBalances.reduce((sum, c) => sum + c.paid, 0);
    return {
      totalBilled,
      totalPaid,
      totalDue: totalBilled - totalPaid
    };
  }, [clientBalances]);

  const filteredClients = clientBalances.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Client-specific analytics
  const clientData = useMemo(() => {
    if (!selectedClient) return null;
    const cName = selectedClient.toUpperCase();
    
    const transactions = (masterData.clientTransactions || [])
        .filter(t => t.client?.toUpperCase() === cName)
        .sort((a,b) => new Date(b.date?.split('/').reverse().join('-')) - new Date(a.date?.split('/').reverse().join('-')));
    
    const readyStock = (masterData.productions || [])
        .filter(p => p.client?.toUpperCase() === cName && p.status === 'Received');
    
    const totalReady = readyStock.reduce((sum, p) => sum + (p.receivedBorka || 0) + (p.receivedHijab || 0), 0);
    
    const deliveries = (masterData.deliveries || [])
        .filter(d => d.client?.toUpperCase() === cName)
        .sort((a,b) => new Date(b.date?.split('/').reverse().join('-')) - new Date(a.date?.split('/').reverse().join('-')));

    const totalDelivered = deliveries.reduce((sum, d) => sum + (d.qty || 0), 0);
    
    return { transactions, readyStock, totalReady, deliveries, totalDelivered };
  }, [selectedClient, masterData.clientTransactions, masterData.productions, masterData.deliveries]);

  const handleClientAction = (e) => {
    e.preventDefault();
    const f = e.target;
    const date = new Date().toLocaleDateString("en-GB");
    const timestamp = Date.now();

    if (showActionModal === 'MATERIAL') {
        const entry = {
            id: `RAW_${timestamp}`,
            date,
            item: f.item.value,
            client: selectedClient,
            qty: Number(f.qty.value),
            type: 'in',
            note: f.note.value || 'CLIENT DEPOSIT'
        };
        setMasterData(prev => ({ ...prev, rawInventory: [entry, ...(prev.rawInventory || [])] }));
        logAction(user, 'CLIENT_MATERIAL_IN', `${selectedClient} deposited ${entry.qty} ${entry.item}`);
        showNotify(`Material Received: ${entry.qty} ${entry.item}`);
    } 
    else if (showActionModal === 'ORDER') {
        // Collect sizes information
        const sizes = (masterData.sizes || []).slice(0, 3).map(sz => ({
            size: sz,
            borka: Number(f[`borka_${sz}`]?.value || 0),
            hijab: Number(f[`hijab_${sz}`]?.value || 0)
        })).filter(s => s.borka > 0 || s.hijab > 0);

        const totalBorka = sizes.reduce((s, x) => s + x.borka, 0);
        const totalHijab = sizes.reduce((s, x) => s + x.hijab, 0);
        const fabricGoj = Number(f.fabricGoj.value || 0);

        const entry = {
            id: `REQ_${timestamp}`,
            date,
            client: selectedClient,
            design: f.design.value,
            fabricGoj,
            sizes,
            totalBorka,
            totalHijab,
            status: 'Pending Review',
            note: f.note.value
        };

        const fabricDeduction = fabricGoj > 0 ? {
            id: `RAW_OUT_${timestamp}`,
            date,
            item: "ফেব্রিক রোল (Fabric)",
            client: selectedClient,
            qty: fabricGoj,
            type: "out",
            note: `ADMIN ORDER REQ: ${entry.design}`
        } : null;

        setMasterData(prev => ({ 
            ...prev, 
            productionRequests: [entry, ...(prev.productionRequests || [])],
            rawInventory: fabricDeduction ? [fabricDeduction, ...(prev.rawInventory || [])] : (prev.rawInventory || [])
        }));
        
        showNotify(`Order Placed: ${entry.design} (${totalBorka + totalHijab} Pcs)`);
    }
    else if (showActionModal === 'DELIVERY') {
        const qtyBorka = Number(f.borka.value || 0);
        const qtyHijab = Number(f.hijab.value || 0);
        const qty = Number(f.qty.value || (qtyBorka + qtyHijab));
        
        const entry = {
            id: `DEL_${timestamp}`,
            date,
            client: selectedClient,
            design: f.design.value,
            color: 'MIX',
            qtyBorka,
            qtyHijab,
            qty,
            lotNo: 'B2B',
            receiver: f.receiver.value
        };
        
        const price = Number(f.price.value || 0);
        const txns = [];
        if (price > 0) {
            txns.push({
                id: `BILL_${timestamp}`,
                date,
                client: selectedClient,
                type: 'BILL',
                amount: price * qty,
                note: `ADMIN-BILL: ${entry.design} Dispatch`
            });
        }

        setMasterData(prev => ({ 
            ...prev, 
            deliveries: [entry, ...(prev.deliveries || [])],
            clientTransactions: [...txns, ...(prev.clientTransactions || [])]
        }));
        showNotify(`Delivery Recorded: ${qty} Pcs.`);
    }
    else if (showActionModal === 'FINANCE') {
        const type = f.type.value;
        const amt = Number(f.amount.value);
        const entry = {
            id: `${type}_${timestamp}`,
            date,
            client: selectedClient,
            type,
            amount: amt,
            note: f.note.value
        };
        
        const updates = { clientTransactions: [entry, ...(masterData.clientTransactions || [])] };
        if (type === 'PAYMENT') {
            updates.cashEntries = [{
                id: `CASH_${timestamp}`,
                date,
                description: `B2B PAYMENT: ${selectedClient} - ${entry.note}`,
                amount: amt
            }, ...(masterData.cashEntries || [])];
        }

        setMasterData(prev => ({ ...prev, ...updates }));
        showNotify(`Financial Entry: ${type} ৳${amt}`);
    }

    setShowActionModal(null);
  };

  return (
    <div className="space-y-10 pb-32 animate-fade-up font-outfit text-slate-950 dark:text-white">
      {/* Header Central Hub Style */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16 saas-card bg-slate-950 text-white !border-slate-800 relative overflow-hidden group">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent opacity-60"></div>
         <div className="relative z-10 flex items-center gap-8">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
                <LayoutGrid size={40} className="text-blue-400" />
            </div>
            <div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-2 italic">
                    {selectedClient ? <span className="text-white">{selectedClient} <span className="text-blue-500">Hub</span></span> : <span>Client <span className="text-blue-500">Ledger Hub</span></span>}
                </h2>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.5em] font-mono">
                    {selectedClient ? `B2B ACCOUNT PROTOCOL: SECURE` : 'B2B Partner Matrix • NRZOONE v5.2'}
                </p>
            </div>
         </div>
         <div className="relative z-10 flex gap-4">
            <button 
                onClick={() => { if(selectedClient) setSelectedClient(null); else setActivePanel('Overview'); }}
                className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
            >
                {selectedClient ? <ArrowLeft size={24} /> : <X size={24} />}
            </button>
         </div>
      </div>

      {!selectedClient ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 px-1 md:px-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="saas-card bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between group h-48 border-l-8 border-l-rose-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <TrendingDown size={140} className="text-rose-500" />
                    </div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-4">Total Receivables</p>
                        <h3 className="text-5xl font-black tracking-tighter text-rose-500 leading-none italic">৳ {stats.totalDue.toLocaleString()}</h3>
                        </div>
                        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                            <DollarSign size={28} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: stats.totalDue > 0 ? '100%' : '0%' }}></div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="saas-card bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between group h-48 border-l-8 border-l-blue-600 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <TrendingUp size={140} className="text-blue-600" />
                    </div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-4">Life-Time Billed</p>
                        <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-none">৳ {stats.totalBilled.toLocaleString()}</h3>
                        </div>
                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                            <BarChart2 size={28} />
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="saas-card bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between group h-48 border-l-8 border-l-emerald-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <CheckCircle size={140} className="text-emerald-500" />
                    </div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-4">Payment Recovery</p>
                        <h3 className="text-4xl font-black tracking-tight text-emerald-600 leading-none">৳ {stats.totalPaid.toLocaleString()}</h3>
                        </div>
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                            <Wallet size={28} />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 saas-card !p-4 border-blue-500/10 backdrop-blur-xl">
                <div className="relative group w-full md:w-96">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="TYPE CLIENT NAME..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="premium-input !pl-12 !h-14 font-bold uppercase text-[11px] tracking-widest" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-1 md:px-0">
                {filteredClients.map((item, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="saas-card bg-white dark:bg-slate-900 shadow-xl flex flex-col justify-between group h-[340px] border-l-4 border-l-slate-200 hover:border-l-blue-600 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden" onClick={() => setSelectedClient(item.name)}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-bl-full -mr-16 -mt-16 group-hover:bg-blue-600 transition-colors z-0"></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 leading-none">Partner Agency</p>
                                <h3 className="text-2xl font-black tracking-tighter text-slate-950 dark:text-white leading-tight uppercase max-w-[220px]">{item.name}</h3>
                            </div>
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center rounded-2xl"><ShieldCheck size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-50 dark:border-slate-800 relative z-10">
                            <div><p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Total Billed</p><p className="font-bold text-lg text-slate-900 dark:text-white italic">৳ {item.billed.toLocaleString()}</p></div>
                            <div className="text-right"><p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Total Paid</p><p className="font-bold text-lg text-emerald-600 italic">৳ {item.paid.toLocaleString()}</p></div>
                        </div>
                        <div className="flex justify-between items-end mt-6 relative z-10">
                            <div><p className="text-[9px] font-black uppercase text-rose-500 tracking-[0.3em] mb-3">DUE BALANCE</p><h4 className={`text-3xl font-black leading-none tracking-tighter italic ${item.due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>৳ {item.due.toLocaleString()}</h4></div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedClient(item.name); setShowActionModal('FINANCE'); }} className="w-12 h-12 bg-emerald-600 text-white rounded-xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center border-b-4 border-emerald-900 active:scale-95"><Plus size={20} /></button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </>
      ) : (
        <div className="space-y-12">
            {/* Quick Actions Protocol */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up">
                {[
                    { id: 'MATERIAL', label: 'Receive Materials', icon: Layers, color: 'bg-orange-600' },
                    { id: 'ORDER', label: 'Place New Order', icon: Plus, color: 'bg-blue-600' },
                    { id: 'DELIVERY', label: 'Dispatch Goods', icon: ArrowRight, color: 'bg-slate-950' },
                    { id: 'FINANCE', label: 'Financial Txn', icon: DollarSign, color: 'bg-emerald-600' }
                ].map((act) => (
                    <button 
                        key={act.id} 
                        onClick={() => setShowActionModal(act.id)}
                        className={`${act.color} p-6 rounded-2xl text-white flex flex-col items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all text-center border-b-8 border-black/20`}
                    >
                        <act.icon size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{act.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500">
                {['Overview', 'Stock Hub', 'Financial Ledger', 'Delivery Logs'].map(t => (
                    <button key={t} onClick={() => setClientTab(t)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${clientTab === t ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'}`}>{t}</button>
                ))}
            </div>

            {clientTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-up">
                    <div className="saas-card bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 p-8 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Stock</p>
                        <h4 className="text-4xl font-black italic">{clientData.totalReady} <span className="text-sm font-bold text-slate-400">PCS</span></h4>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 uppercase tracking-widest"><Activity size={12} /> Ready for delivery</div>
                    </div>
                    <div className="saas-card bg-white dark:bg-slate-900 border-l-4 border-l-emerald-600 p-8 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Delivered</p>
                        <h4 className="text-4xl font-black italic">{clientData.totalDelivered} <span className="text-sm font-bold text-slate-400">PCS</span></h4>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">All Time Track</div>
                    </div>
                    <div className="saas-card bg-black text-white p-8 space-y-4 col-span-1 md:col-span-2">
                        <div className="flex justify-between items-start"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Consolidated Balance</p><ShieldCheck size={20} className="text-blue-500" /></div>
                        <h4 className="text-5xl font-black italic tracking-tighter">৳ {clientBalances.find(c => c.name === selectedClient)?.due.toLocaleString()}</h4>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em]">Current Outstanding Protocol</p>
                    </div>
                </div>
            )}

            {clientTab === 'Financial Ledger' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="saas-card bg-white dark:bg-slate-900 shadow-3xl overflow-hidden animate-fade-up">
                    <div className="overflow-x-auto"><table className="w-full text-left order-collapse"><thead><tr className="border-b-2 border-slate-100 dark:border-slate-800"><th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Date</th><th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ref / Note</th><th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Type</th><th className="p-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Amount</th></tr></thead><tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {clientData.transactions.map((t, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-8 text-[11px] font-black uppercase tracking-widest text-slate-950 dark:text-white">{t.date}</td>
                                        <td className="p-8"><p className="text-[11px] font-bold uppercase text-slate-950 dark:text-white">{t.note}</p><p className="text-[8px] font-bold text-slate-400 mt-1">TXN: {t.id}</p></td>
                                        <td className="p-8"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${t.type === 'BILL' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{t.type}</span></td>
                                        <td className={`p-8 text-right font-black text-xl italic tracking-tight ${t.type === 'BILL' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            <div className="flex items-center justify-end gap-6">
                                                <span>{t.type === 'PAYMENT' ? '+' : '-'} ৳ {t.amount?.toLocaleString()}</span>
                                                {user?.role === 'admin' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm("আপনি কি এই লেনদেনটি (Transaction) ডিলিট করতে চান?")) {
                                                                setMasterData(prev => ({
                                                                    ...prev,
                                                                    clientTransactions: (prev.clientTransactions || []).filter(item => item.id !== t.id)
                                                                }));
                                                                logAction(user, 'CLIENT_TXN_DELETE', `Deleted ${t.type} of ৳${t.amount} for ${selectedClient}`);
                                                                showNotify("লেনদেনটি ডিলিট করা হয়েছে!");
                                                            }
                                                        }}
                                                        className="p-3 bg-slate-100 dark:bg-slate-800 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {clientData.transactions.length === 0 && (<tr><td colSpan="4" className="py-20 text-center text-slate-400 italic font-bold uppercase text-[10px] tracking-widest">No transactions available.</td></tr>)}
                    </tbody></table></div>
                </motion.div>
            )}

            {clientTab === 'Stock Hub' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-up">
                    {clientData.readyStock.map((s, idx) => (
                        <div key={idx} className="saas-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 space-y-6 group">
                            <div className="flex justify-between items-start"><div className="space-y-1"><p className="text-[9px] font-black text-blue-600 tracking-widest uppercase">Finished Product</p><h5 className="text-2xl font-black uppercase italic">{s.design}</h5></div><div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-xs">#{s.lotNo}</div></div>
                            <div className="grid grid-cols-2 gap-4 border-y border-slate-50 dark:border-slate-800 py-6"><div><p className="text-[8px] font-black uppercase text-slate-400 mb-1">Color</p><p className="text-xs font-bold uppercase">{s.color}</p></div><div className="text-right"><p className="text-[8px] font-black uppercase text-slate-400 mb-1">Lot Size</p><p className="text-xs font-bold uppercase">{s.size}</p></div></div>
                            <div className="flex justify-between items-center pt-2"><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-emerald-600">Total Borka</span><span className="text-3xl font-black italic">{s.receivedBorka || 0}</span></div><div className="flex flex-col text-right"><span className="text-[10px] font-black uppercase text-emerald-600">Total Hijab</span><span className="text-3xl font-black italic">{s.receivedHijab || 0}</span></div></div>
                        </div>
                    ))}
                    {clientData.readyStock.length === 0 && (
                        <div className="col-span-full py-32 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                             <Package size={48} className="mx-auto mb-6 text-slate-200" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zero inventory ready for delivery.</p>
                        </div>
                    )}
                </div>
            )}

            {clientTab === 'Delivery Logs' && (
                <div className="saas-card bg-white dark:bg-slate-900 shadow-3xl overflow-hidden animate-fade-up">
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b-2 border-slate-50 dark:border-slate-800"><th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th><th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Portfolio</th><th className="p-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th></tr></thead><tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {clientData.deliveries.map((d, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40"><td className="p-8 text-sm font-bold uppercase tracking-widest italic">{d.date}</td><td className="p-8"><p className="text-lg font-black uppercase italic">{d.design}</p><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Lot: #{d.lotNo} • Color: {d.color}</p></td><td className="p-8 text-right"><span className="text-3xl font-black italic">{d.qty}</span><span className="text-[10px] font-bold text-slate-400 ml-2 uppercase">PCS</span></td></tr>
                                ))}
                    </tbody></table></div>
                </div>
            )}
        </div>
      )}

      {/* Action Protocol Modals */}
      <AnimatePresence>
        {showActionModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-[1000] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="saas-card bg-white dark:bg-slate-900 w-full max-w-xl p-12 space-y-10 border-t-8 border-slate-950 relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
                >
                    <button onClick={() => setShowActionModal(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black transition-colors"><X size={20} /></button>
                    
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-950 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-6">
                            {showActionModal === 'MATERIAL' && <Layers size={32} />}
                            {showActionModal === 'ORDER' && <Plus size={32} />}
                            {showActionModal === 'DELIVERY' && <Package size={32} />}
                            {showActionModal === 'FINANCE' && <DollarSign size={32} />}
                        </div>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                            {showActionModal === 'MATERIAL' && 'Receive Materials'}
                            {showActionModal === 'ORDER' && 'Initiate Order'}
                            {showActionModal === 'DELIVERY' && 'Dispatch Goods'}
                            {showActionModal === 'FINANCE' && 'Record Transaction'}
                        </h3>
                        <div className="inline-block px-6 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800">
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{selectedClient}</p>
                        </div>
                    </div>

                    <form onSubmit={handleClientAction} className="space-y-6">
                        {showActionModal === 'MATERIAL' && (
                            <>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Material Item</label><input name="item" placeholder="E.G. CHINON FABRIC" className="premium-input !h-14 uppercase text-xs font-black italic" required /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quantity</label><input name="qty" type="number" placeholder="0.00" className="premium-input !h-14 font-black" required /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Reference</label><input name="note" placeholder="CHALLAN OR NOTE" className="premium-input !h-14 uppercase text-xs font-black italic" /></div>
                            </>
                        )}
                        {showActionModal === 'ORDER' && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Order Date</label>
                                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="premium-input !h-14 font-black bg-slate-100 text-black border-none" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Design</label>
                                        <select name="design" className="premium-input !h-14 uppercase text-xs font-black">{(masterData.designs || []).map(d => <option key={d.name}>{d.name}</option>)}</select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Color</label>
                                        <select name="color" className="premium-input !h-14 uppercase text-xs font-black">{(masterData.colors || []).map(c => <option key={c} value={c}>{c}</option>)}</select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fabric Drawdown (YDS)</label>
                                    <input name="fabricGoj" type="number" step="0.01" placeholder="0.00" className="premium-input !h-14 font-black bg-blue-50 text-blue-600 border-none" required />
                                </div>
                                <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-4 text-center">Production Matrix (Borka / Hijab)</p>
                                    <div className="max-h-[220px] overflow-y-auto pr-2 no-scrollbar space-y-3">
                                        {(masterData.sizes || []).map(sz => (
                                            <div key={sz} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
                                                <div className="col-span-3 font-black text-xs text-center border-r border-slate-100 dark:border-slate-800">{sz}</div>
                                                <div className="col-span-4 flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-slate-400 mb-1">BORKA</span>
                                                    <input name={`borka_${sz}`} type="number" placeholder="0" className="w-full h-10 rounded-lg bg-white dark:bg-slate-950 text-center font-black text-sm outline-none border-none shadow-inner" />
                                                </div>
                                                <div className="col-span-4 flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-slate-400 mb-1">HIJAB</span>
                                                    <input name={`hijab_${sz}`} type="number" placeholder="0" className="w-full h-10 rounded-lg bg-white dark:bg-slate-950 text-center font-black text-sm outline-none border-none shadow-inner" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Order Memo (Notes)</label>
                                    <input name="note" placeholder="SPECIAL INSTRUCTIONS..." className="premium-input !h-14 uppercase text-[10px] font-black italic tracking-widest" />
                                </div>
                            </div>
                        )}
                        {showActionModal === 'DELIVERY' && (
                            <>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Product Portfolio</label><select name="design" className="premium-input !h-14 uppercase text-xs font-black">{clientData.readyStock.map(s => <option key={s.id} value={s.design}>{s.design} [LOT {s.lotNo} - {s.color}]</option>)}</select></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Borka Pcs</label><input name="borka" type="number" placeholder="0" className="premium-input !h-14 font-black" required /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hijab Pcs</label><input name="hijab" type="number" placeholder="0" className="premium-input !h-14 font-black" required /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Total Qty</label><input name="qty" type="number" placeholder="0" className="premium-input !h-14 font-black bg-slate-950 text-white border-none" required /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rate/Pc</label><input name="price" type="number" placeholder="৳ 0" className="premium-input !h-14 font-black text-blue-600" required /></div>
                                </div>
                                <input name="color" type="hidden" value="MIX" />
                                <input name="lotNo" type="hidden" value="B2B" />
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Carrier / Receiver</label><input name="receiver" placeholder="E.G. SELF PICKUP" className="premium-input !h-14 font-black uppercase italic text-xs" required /></div>
                            </>
                        )}
                        {showActionModal === 'FINANCE' && (
                            <>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Txn Type</label><select name="type" className="premium-input !h-14 uppercase text-xs font-black"><option value="PAYMENT">RECEIVED PAYMENT</option><option value="BILL">ISSUE BILL</option></select></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Amount (৳)</label><input name="amount" type="number" placeholder="0.00" className="premium-input !h-20 text-4xl font-black text-center" required /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ref / Note</label><input name="note" placeholder="NOTE" className="premium-input !h-14 uppercase text-xs font-black italic" required /></div>
                            </>
                        )}
                        <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all mt-4">Confirm & Authorize</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientLedgerPanel;
