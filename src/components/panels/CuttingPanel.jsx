// DEPLOYMENT TRIGGER: 2026-04-05 11:39
import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  X,
  Box,
  Scissors,
  Search,
  CheckCircle,
  AlertCircle,
  Save,
  Minus,
  Printer,
  ArrowLeft,
  LayoutGrid,
  Activity,
  Package,
  Layers,
  ChevronRight,
  TrendingDown,
  Clock,
  Check,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStock, getSewingStock } from "../../utils/calculations";
import { syncToSheet } from "../../utils/syncUtils";
import NRZLogo from "../NRZLogo";
import UniversalSlip from "../UniversalSlip";

const CuttingPanel = ({
  masterData,
  setMasterData,
  showNotify,
  user,
  setActivePanel,
  t,
  logAction,
}) => {
  const [activeTab, setActiveTab] = useState("Incoming Orders"); // Incoming Orders, Cutting Queue, History

  const incomingOrders = useMemo(() => {
    return (masterData.productionRequests || []).filter(r => r.status === 'Pending Review' || r.status === 'In Cutting');
  }, [masterData.productionRequests]);

  const handleAcceptOrder = (order) => {
    const lotNo = prompt("এ অর্ডারের জন্য লট নাম্বার দিন (Enter Lot Number):", order.lotNo || nextLotNo);
    if (!lotNo) return;

    setMasterData(prev => {
        // We use the already deducted fabric from productionRequests submission
        // But we add it to cuttingStock as a live lot
        const newLot = {
            id: `B2B_${order.id}`,
            lotNo,
            date: new Date().toLocaleDateString("en-GB"),
            design: order.design,
            client: order.client,
            color: 'MIX',
            borka: order.totalBorka || 0,
            hijab: order.totalHijab || 0,
            fabricGoj: order.fabricGoj || 0,
            status: 'In Cutting',
            stage: 'Cutting'
        };

        return {
            ...prev,
            cuttingStock: [newLot, ...(prev.cuttingStock || [])],
            productionRequests: (prev.productionRequests || []).map(r => r.id === order.id ? { ...r, status: 'In Cutting', lotNo } : r)
        };
    });
    showNotify(`B2B অর্ডার লট #${lotNo}-এ যুক্ত হয়েছে!`, "success");
    logAction(user, 'B2B_ORDER_ACCEPT', `${order.client} এর (${order.design}) অর্ডারটি লট #${lotNo}-এ এক্সেপ্ট করা হয়েছে।`);
  };
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Derived Stats
  const stats = useMemo(() => {
    const totalIssued = (masterData.cuttingStock || []).reduce((sum, item) => sum + (item.borka || 0) + (item.hijab || 0), 0);
    const receivedPieces = (masterData.productions || [])
      .filter(p => p.status === 'Received')
      .reduce((sum, item) => sum + (item.receivedBorka || 0) + (item.receivedHijab || 0), 0);
    const inProduction = totalIssued - receivedPieces;
    const pendingCount = (masterData.productions || []).filter(p => !p.receivedBorka && !p.receivedHijab).length;
    
    return {
      totalIssued,
      inProduction: Math.max(0, inProduction),
      received: receivedPieces,
      pending: pendingCount
    };
  }, [masterData]);

  // Form State for New Cutting Entry
  const [entryData, setEntryData] = useState({
    design: "",
    color: "",
    cutterName: "",
    client: "",
    lotNo: "",
    materialName: "ফেব্রিক রোল (Fabric)",
    totalYards: "",
    date: new Date().toISOString().split("T")[0],
    sizes: [{ size: "", borka: "", hijab: "" }],
  });

  const [printSlip, setPrintSlip] = useState(null);

  const nextLotNo = useMemo(() => {
    const numbers = (masterData.cuttingStock || [])
      .map((l) => parseInt(l.lotNo))
      .filter((n) => !isNaN(n));
    return numbers.length > 0 ? (Math.max(...numbers) + 1).toString() : "101";
  }, [masterData.cuttingStock]);

  const rawStockByClient = useMemo(() => {
    const stocks = {};
    (masterData.rawInventory || []).forEach(log => {
        const c = log.client || 'FACTORY';
        if (!stocks[c]) stocks[c] = {};
        if (!stocks[c][log.item]) stocks[c][log.item] = 0;
        if (log.type === 'in') stocks[c][log.item] += Number(log.qty);
        else stocks[c][log.item] -= Number(log.qty);
    });
    return stocks;
  }, [masterData.rawInventory]);

  const clientStock = useMemo(() => {
    const c = entryData.client || 'FACTORY';
    const item = entryData.materialName;
    if (!item) return 0;
    return rawStockByClient[c]?.[item] || 0;
  }, [rawStockByClient, entryData.client, entryData.materialName]);

  React.useEffect(() => {
    if (!entryData.lotNo) {
      setEntryData((prev) => ({ ...prev, lotNo: nextLotNo }));
    }
  }, [nextLotNo]);

  const handleAddCutting = (shouldPrint) => {
    const validSizes = entryData.sizes.filter(
      (s) => s.size && (Number(s.borka || 0) > 0 || Number(s.hijab || 0) > 0)
    );

    if (validSizes.length === 0) {
      showNotify("অন্তত একটি সাইজ এবং সঠিক সংখ্যা দিন!", "error");
      return;
    }

    const newEntries = validSizes.map((s, idx) => ({
      id: `cut_${Date.now()}_${idx}_${Math.random()}`,
      date: new Date(entryData.date).toLocaleDateString("en-GB"),
      design: entryData.design || "N/A",
      color: entryData.color || "N/A",
      size: s.size,
      cutterName: entryData.cutterName || "N/A",
      client: entryData.client || "FACTORY",
      lotNo: entryData.lotNo || "N/A",
      borka: Number(s.borka || 0),
      hijab: Number(s.hijab || 0),
      status: "Ready",
      timestamp: new Date().toISOString()
    }));

    const rawDeduction = Number(entryData.totalYards) > 0 ? {
      id: Date.now() + 1,
      date: new Date(entryData.date).toLocaleDateString("en-GB"),
      item: entryData.materialName,
      client: entryData.client || "FACTORY",
      qty: Number(entryData.totalYards),
      type: "out",
      note: `CUTTING LOT #${entryData.lotNo} - ${entryData.design}`
    } : null;

    setMasterData((prev) => {
      const updatedRequests = (prev.productionRequests || []).map(req => {
        if (req.id === entryData.requestRef) {
          return { ...req, status: 'In Cutting', lotNo: entryData.lotNo };
        }
        return req;
      });

      return {
        ...prev,
        productionRequests: updatedRequests,
        cuttingStock: [...newEntries, ...(prev.cuttingStock || [])],
        rawInventory: rawDeduction ? [rawDeduction, ...(prev.rawInventory || [])] : (prev.rawInventory || [])
      };
    });

    logAction(user, 'CUTTING_ENTRY', `Lot #${entryData.lotNo} added. Total items: ${newEntries.length} | B2B Ref: ${entryData.requestRef || 'N/A'}`);
    showNotify("কাটিং রেকর্ড সফলভাবে যোগ করা হয়েছে!");
    
    if (shouldPrint) setPrintSlip(newEntries[0]);
    setShowModal(false);
    
    setEntryData({
      design: "",
      color: "",
      cutterName: "",
      client: "",
      lotNo: (parseInt(entryData.lotNo) + 1).toString(),
      materialName: "ফেব্রিক রোল (Fabric)",
      totalYards: "",
      date: new Date().toISOString().split("T")[0],
      sizes: [{ size: "", borka: "", hijab: "" }],
      requestRef: null
    });
  };

  const handleDelete = (id) => {
    if (user?.role?.toLowerCase() !== 'admin') {
      showNotify("শুধুমাত্র এডমিন ডিলিট করার অনুমতি আছে!", "error");
      return;
    }
    if (!window.confirm("Are you sure? This node will be purged.")) return;
    setMasterData(prev => ({
      ...prev,
      cuttingStock: (prev.cuttingStock || []).filter(item => item.id !== id)
    }));
    logAction(user, 'CUTTING_DELETE', `Deleted node ID: ${id}`);
    showNotify("কাটিং রেকর্ড মুছে ফেলা হয়েছে!", "info");
  };

  if (printSlip) {
    return (
      <div className="min-h-screen bg-white p-10 font-outfit italic animate-fade-up">
        <div className="no-print flex justify-between items-center mb-10 max-w-5xl mx-auto">
            <button onClick={() => setPrintSlip(null)} className="neu-button px-10 py-5">Cancel</button>
            <button onClick={() => window.print()} className="action-btn-primary px-16">
                <Printer size={20} /> PRINT SLIP (PDF)
            </button>
        </div>
        <div className="w-[210mm] mx-auto bg-white border border-slate-100 shadow-2xl p-1 relative">
            <UniversalSlip data={printSlip} type="CUTTING" copyTitle="MASTER ARCHIVE" />
            <div className="h-4 border-t-2 border-dashed border-slate-300 my-10"></div>
            <UniversalSlip data={printSlip} type="CUTTING" copyTitle="FACTORY COPY" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-fade-up px-1 md:px-4 text-black">
      {/* SaaS Operational HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-950 p-6 rounded-xl text-white shadow-xl flex flex-col justify-between group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-14 h-14 bg-white/10 text-white rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Package size={24} />
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold tracking-tight leading-none">{stats.totalIssued.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1 uppercase leading-none">মোট ইস্যু (Total Issued)</p>
                </div>
            </div>
            <div className="flex items-center gap-3 text-white/30 border-t border-white/10 pt-4 relative z-10">
                <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-2 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }}></div>)}
                </div>
                <p className="text-[8px] font-bold tracking-widest uppercase whitespace-nowrap">Production Stream Active</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6 group">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Activity size={24} />
            </div>
            <div>
                <p className="text-3xl font-bold tracking-tight text-black dark:text-white dark:text-white leading-none mb-1">{stats.inProduction.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest leading-none">উৎপাদনে আছে (In-Production)</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6 group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <CheckCircle size={24} />
            </div>
            <div>
                <p className="text-3xl font-bold tracking-tight text-black dark:text-white dark:text-white leading-none mb-1">{stats.received.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest leading-none">মোট জমা হয়েছে (Received)</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6 group">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Clock size={24} />
            </div>
            <div>
                <p className="text-3xl font-bold tracking-tight text-black dark:text-white dark:text-white leading-none mb-1">{stats.pending.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest leading-none">বাকি লট (Lots Pending)</p>
            </div>
        </div>
      </div>


      {/* Control Bar - SaaS Pill Navigation */}
      <div className="bg-white dark:bg-slate-900 !p-1.5 flex flex-col lg:flex-row items-center justify-between gap-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex flex-wrap gap-1 w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: "Incoming Orders", label: "ইনকামিং অর্ডার (B2B Incoming)" },
            { id: "Design Registration", label: "ডিজাইন এন্ট্রি (Registration)" },
            { id: "Cutting Queue", label: "কাটিং কিউ (Queue)" },
            { id: "Production Status", label: "প্রোডাকশন স্ট্যাটাস (Stats)" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-lg' : 'text-black dark:text-white dark:text-white hover:text-black dark:text-white dark:hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 lg:flex-none">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white dark:text-white" />
            <input
              placeholder="ডিজাইন বা লট..."
              className="premium-input !pl-11 !h-11 !text-[10px] !bg-slate-50 dark:!bg-slate-800/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
             onClick={() => setShowModal(true)}
             className="w-11 h-11 bg-slate-950 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-black transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>


      {/* Main Tab Content */}
      <div className="animate-fade-up">
        {activeTab === "Incoming Orders" && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(masterData.productionRequests || [])
                .filter(r => r.status !== 'In Cutting' && r.status !== 'Approved')
                .map((req, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-blue-500 transition-all flex flex-col group p-6 space-y-6">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">B2B INCOMING</p>
                              <h4 className="text-xl font-black uppercase italic leading-none">{req.design}</h4>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-black text-slate-400 uppercase">{req.client}</p>
                              <p className="text-[9px] font-bold text-slate-300 font-mono mt-1">{req.date}</p>
                          </div>
                      </div>
                      
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                          <div className="flex justify-between items-end">
                              <div>
                                  <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Total Pieces</p>
                                  <p className="text-2xl font-black italic">{Number(req.totalBorka || 0) + Number(req.totalHijab || 0)} <span className="text-xs">PCS</span></p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Fabric Consumed</p>
                                  <p className="text-lg font-black italic text-rose-500">{req.fabricGoj} <span className="text-xs">YDS</span></p>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                          <p className="text-[10px] font-bold text-slate-500 line-clamp-2 italic uppercase">Note: {req.note || 'No special requirements listed.'}</p>
                          <button 
                            onClick={() => {
                                setEntryData({
                                    ...entryData,
                                    design: req.design,
                                    client: req.client,
                                    totalYards: req.fabricGoj,
                                    sizes: req.sizes || [{ size: "", borka: "", hijab: "" }],
                                    requestRef: req.id
                                });
                                setShowModal(true);
                            }}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                          >
                             অর্ডার গ্রহণ ও প্রসেসিং শুরু (START PROCESSING)
                          </button>
                      </div>
                  </div>
                ))}
           </div>
        )}

        {activeTab === "Cutting Queue" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(masterData.cuttingStock || [])
              .filter(item => 
                item.lotNo?.toString().includes(searchTerm) || 
                item.design?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.color?.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 ? (
                <div className="col-span-full h-80 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 italic">
                    <Box size={40} className="text-slate-200 mb-4" />
                    <p className="text-[10px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest leading-none">কোনো রেকর্ড পাওয়া যায়নি (No Records)</p>
                </div>
              ) : (
                (masterData.cuttingStock || [])
                  .filter(item => 
                    item.lotNo?.toString().includes(searchTerm) || 
                    item.design?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.color?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((item, idx) => (
                    <div key={item.id || idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-slate-950 transition-all flex flex-col group animate-fade-up">
                        <div className="p-6 space-y-6 flex-1">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest leading-none">ডিজাইন আইডি (Design)</p>
                                    <h4 className="text-2xl font-bold tracking-tight text-black dark:text-white dark:text-white uppercase leading-none">{item.design}</h4>
                                </div>
                                <div className="w-12 h-12 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform font-bold text-xs flex-col leading-none text-center">
                                    <span className="text-[10px]">#{item.lotNo}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest mb-1 italic">রঙ</p>
                                    <p className="text-sm font-bold text-black dark:text-white dark:text-white truncate uppercase">{item.color}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest mb-1 italic">তারিখ</p>
                                    <p className="text-sm font-bold text-black dark:text-white dark:text-white truncate italic">{item.date}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest mb-1 italic">ক্লায়েন্ট</p>
                                    <p className="text-sm font-bold text-black dark:text-white dark:text-white truncate uppercase">{item.client || '-'}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center py-5 border-y border-slate-100 dark:border-slate-800 border-dashed">
                                <div className="flex flex-col">
                                     <span className="text-[9px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest mb-1 leading-none">বোরকা (Borka)</span>
                                     <span className="text-3xl font-bold text-black dark:text-white dark:text-white leading-none">{item.borka}</span>
                                </div>
                                <div className="w-px h-10 bg-slate-100 dark:bg-slate-800"></div>
                                <div className="text-right">
                                     <span className="text-[9px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest mb-1 leading-none">হিজাব (Hijab)</span>
                                     <span className="text-3xl font-bold text-black dark:text-white dark:text-white leading-none">{item.hijab}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="flex gap-3 p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setPrintSlip(item)} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-black dark:text-white dark:text-white hover:bg-slate-950 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700" title="স্লিপ প্রিন্ট">
                                <Printer size={16} />
                            </button>
                            <button 
                                onClick={() => setActivePanel('Swing')} 
                                className="flex-1 bg-slate-950 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all font-bold"
                            >
                                সুইং এ পাঠান (Swing)
                            </button>
                            {user?.role === 'admin' && (
                                <button 
                                    onClick={() => handleDelete(item.id)} 
                                    className="w-11 h-11 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700" title="ডিলিট">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                  ))
              )}
          </div>

        )}

        {activeTab === "Design Registration" && (
           <div className="bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center justify-center py-32 space-y-8 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl flex items-center justify-center animate-bounce text-slate-200">
                <Box size={40} strokeWidth={1} />
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-black dark:text-white dark:text-white">নতুন কাটিং <span className="text-blue-600">আইডি যুক্ত করুন</span></h2>
                <p className="text-[10px] font-bold tracking-[0.4em] text-black dark:text-white dark:text-white max-w-sm mx-auto uppercase italic">
                  Launch the registration protocol to initialize a new cutting lot. 
                </p>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="px-12 py-5 bg-slate-950 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
              >
                প্রোটোকল চালু করুন (Launch)
              </button>
           </div>

        )}

        {activeTab === "Production Status" && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-8 md:p-12 space-y-12">
                <div className="flex justify-between items-end">
                   <div>
                      <h3 className="text-3xl font-bold tracking-tight text-black dark:text-white dark:text-white uppercase mb-2">Yield <span className="text-blue-600">Optimizer</span></h3>
                      <p className="text-[10px] font-bold tracking-widest text-black dark:text-white dark:text-white uppercase italic">Advanced Pattern Utilization Analytics</p>
                   </div>
                   <Activity className="text-blue-500 opacity-20" size={56} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[
                     { label: "Fabric Usage", value: "96.4%", icon: Layers, color: "text-emerald-500" },
                     { label: "Waste Factor", value: "3.6%", icon: Scissors, color: "text-black dark:text-white dark:text-white" },
                     { label: "Velocity", value: "142 U/H", icon: Activity, color: "text-blue-500" },
                     { label: "Queue Sync", value: "0.0s", icon: Clock, color: "text-rose-500" }
                   ].map((a, i) => (
                     <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                           <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg shadow-sm flex items-center justify-center text-black dark:text-white dark:text-white">
                              <a.icon size={16} />
                           </div>
                           <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">NODE 0{i+1}</span>
                        </div>
                        <p className="text-[10px] font-bold text-black dark:text-white dark:text-white uppercase tracking-widest mb-1 italic leading-none">{a.label}</p>
                        <h4 className={`text-3xl font-bold italic leading-none ${a.color}`}>{a.value}</h4>
                     </div>
                   ))}
                </div>
              </div>

              <div className="bg-slate-950 p-10 rounded-xl text-white flex flex-col justify-between items-center text-center group relative overflow-hidden">
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full border-[10px] border-white/5 border-t-blue-500 animate-[spin_3s_linear_infinite]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Activity size={32} className="animate-pulse text-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <h4 className="text-3xl font-bold uppercase tracking-tight">Live Matrix</h4>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] italic">
                          Synchronizing Ground Nodes...
                        </p>
                     </div>
                  </div>
                  <div className="w-full pt-8 border-t border-white/10 flex justify-between items-center">
                     <span className="text-[9px] font-bold tracking-widest opacity-40">AUTO-SYNC: ON</span>
                     <span className="text-emerald-500 text-[9px] font-bold tracking-widest">SYSTEM CLEAR</span>
                  </div>
              </div>
           </div>

        )}
      </div>

      {/* Return Home Link */}
      <div className="flex justify-center pt-24 pb-12">
        <button
            onClick={() => setActivePanel("Overview")}
            className="group relative flex items-center gap-4 bg-white dark:bg-slate-900 px-10 py-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-950 transition-all duration-300"
        >
            <div className="p-2.5 bg-slate-950 text-white rounded-xl transition-transform shadow-lg group-hover:scale-110">
                <ArrowLeft size={18} />
            </div>
            <span className="text-sm font-bold tracking-tight text-black dark:text-white dark:text-white uppercase">
                ড্যাশবোর্ডে ফিরে যান (Return)
            </span>
        </button>
      </div>

      {/* Entry Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl my-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-8 md:p-12 relative overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-up">
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-6 right-6 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-950 hover:text-white transition-all text-black dark:text-white dark:text-white"
              >
                <X size={20} />
              </button>

              <div className="space-y-10">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-lg"><Scissors size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white dark:text-white uppercase leading-none">নতুন কাটিং <span className="text-blue-600">এন্ট্রি করুন</span></h2>
                    <p className="text-[10px] font-bold text-black dark:text-white dark:text-white tracking-widest mt-2 uppercase italic leading-none">Primary Material Injection Protocol</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">ডিজাইন (Design)</label>
                      <select 
                        className="premium-input !h-12 text-sm font-bold uppercase" 
                        value={entryData.design} 
                        onChange={(e) => setEntryData(p => ({ ...p, design: e.target.value }))}
                      >
                        <option value="">ডিজাইন নির্বাচন করুন...</option>
                        {(masterData.designs || []).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">রঙ (Color Mapping)</label>
                      <select 
                        className="premium-input !h-12 text-sm font-bold uppercase" 
                        value={entryData.color} 
                        onChange={(e) => setEntryData(p => ({ ...p, color: e.target.value }))}
                      >
                        <option value="">রঙ নির্বাচন করুন...</option>
                        {(masterData.colors || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">লট নম্বর (Lot)</label>
                            <input 
                                className="premium-input !bg-slate-950 !text-white !h-12 text-lg font-bold text-center border-none" 
                                value={entryData.lotNo} 
                                onChange={(e) => setEntryData(p => ({ ...p, lotNo: e.target.value }))} 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">তারিখ (Date)</label>
                            <input 
                                type="date" 
                                className="premium-input !h-12 text-xs font-bold text-center !bg-slate-50 dark:!bg-slate-800/50 border-slate-200 dark:border-slate-700" 
                                value={entryData.date} 
                                onChange={(e) => setEntryData(p => ({ ...p, date: e.target.value }))} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">কাটার এর নাম (Cutter)</label>
                          <select 
                            className="premium-input !h-12 text-sm font-bold uppercase" 
                            value={entryData.cutterName} 
                            onChange={(e) => setEntryData(p => ({ ...p, cutterName: e.target.value }))}
                          >
                            <option value="">মাস্টার নির্বাচন করুন...</option>
                            {(masterData.workerCategories?.cutting || []).map(m => <option key={m} value={m}>{m}</option>)}
                            <option value="EXTERNAL">বাইরের কারিগর (OTHER)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">ক্লায়েন্ট (Client Ownership)</label>
                          <select 
                            className="premium-input !h-12 text-sm font-bold uppercase" 
                            value={entryData.client} 
                            onChange={(e) => setEntryData(p => ({ ...p, client: e.target.value }))}
                          >
                            <option value="FACTORY">FACTORY (নিজস্ব)</option>
                            {(masterData.clients || []).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                    </div>

                        <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] font-bold uppercase text-black dark:text-white dark:text-white tracking-widest ml-1">কাপড় / মেটেরিয়াল</label>
                             {entryData.client && (
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${clientStock <= 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                 স্টক: {clientStock} গজ
                               </span>
                             )}
                           </div>
                           <input 
                             list="material-list"
                             className="premium-input !h-12 text-sm font-bold uppercase" 
                             placeholder="কাপড় নির্বাচন করুন..."
                             value={entryData.materialName} 
                             onChange={(e) => setEntryData(p => ({ ...p, materialName: e.target.value }))}
                           />
                           <datalist id="material-list">
                              <option value="ফেব্রিক রোল (Fabric)" />
                              <option value="লি linen (Fabric)" />
                              <option value="দুবাই চেরি (Fabric)" />
                           </datalist>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold uppercase text-rose-500 tracking-widest ml-1 animate-pulse">মোট কত গজ লেগেছে?</label>
                           <input 
                             type="number"
                             className="premium-input !h-12 text-lg font-black text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-200" 
                             placeholder="0.00 গজ"
                             value={entryData.totalYards} 
                             onChange={(e) => setEntryData(p => ({ ...p, totalYards: e.target.value }))}
                           />
                        </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col shadow-inner">
                     <div className="flex justify-between items-center mb-6">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white dark:text-white">সাইজ লিস্ট (Size Matrix)</label>
                        <button 
                            onClick={() => setEntryData(p => ({ ...p, sizes: [...p.sizes, { size: "", borka: "", hijab: "" }] }))} 
                            className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center hover:scale-110 shadow-lg transition-all"
                        >
                            <Plus size={18} />
                        </button>
                     </div>
                     
                     <div className="flex-1 max-h-[20rem] overflow-y-auto pr-2 space-y-3 no-scrollbar">
                        {entryData.sizes.map((s, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                             <div className="col-span-3">
                                <select 
                                    className="w-full bg-transparent h-10 text-[10px] font-black uppercase outline-none" 
                                    value={s.size} 
                                    onChange={(e) => { const newSizes = [...entryData.sizes]; newSizes[idx].size = e.target.value; setEntryData(p => ({ ...p, sizes: newSizes })); }}
                                >
                                    <option value="">SIZE</option>
                                    {(masterData.sizes || []).map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                </select>
                             </div>
                             <div className="col-span-4 relative border-l border-slate-100 dark:border-slate-800 px-3">
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-300 uppercase">B</span>
                                <input 
                                    placeholder="0" type="number" 
                                    className="w-full bg-transparent h-10 text-xl font-bold text-center outline-none" 
                                    value={s.borka} 
                                    onChange={(e) => { const newSizes = [...entryData.sizes]; newSizes[idx].borka = e.target.value; setEntryData(p => ({ ...p, sizes: newSizes })); }} 
                                />
                             </div>
                             <div className="col-span-4 relative border-l border-slate-100 dark:border-slate-800 px-3">
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-300 uppercase">H</span>
                                <input 
                                    placeholder="0" type="number" 
                                    className="w-full bg-transparent h-10 text-xl font-bold text-center text-black dark:text-white dark:text-white outline-none" 
                                    value={s.hijab} 
                                    onChange={(e) => { const newSizes = [...entryData.sizes]; newSizes[idx].hijab = e.target.value; setEntryData(p => ({ ...p, sizes: newSizes })); }} 
                                />
                             </div>
                             <div className="col-span-1 flex justify-end">
                                {entryData.sizes.length > 1 && (
                                    <button 
                                        onClick={() => setEntryData(p => ({ ...p, sizes: p.sizes.filter((_, i) => i !== idx) }))} 
                                        className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                   <button 
                    onClick={() => setShowModal(false)} 
                    className="flex-1 py-4 rounded-xl bg-white border-2 border-black text-black dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all shadow-lg"
                   >
                    বাতিল (Close)
                   </button>
                   <button 
                    onClick={() => handleAddCutting(true)} 
                    className="flex-[2] py-4 bg-slate-950 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                   >
                     <Printer size={16} /> সংরক্ষণ ও প্রিন্ট (Commit & Print)
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CuttingPanel;

