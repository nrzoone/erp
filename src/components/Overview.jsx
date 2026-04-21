import React from "react";
import { 
    Activity, 
    Users, 
    Package,
    Scissors,
    Database,
    DollarSign,
    Wallet,
    Layers,
    Hammer,
    Truck,
    Settings,
    UserCheck,
    TrendingUp,
    TrendingDown,
    Box,
    Clock
} from "lucide-react";

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="saas-card group relative overflow-hidden flex flex-col justify-between h-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl hover:border-slate-950 dark:hover:border-white transition-all duration-700">
        <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-700 group-hover:scale-150`}><Icon size={180} /></div>
        <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform`}>
            <Icon size={24} />
        </div>
        <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">{label}</p>
            <h2 className="text-4xl font-black tracking-tighter text-black dark:text-white leading-none italic">{value}</h2>
            {sub && <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">{sub}</p>}
        </div>
    </div>
);

const Overview = ({ masterData, setActivePanel, setPanelTab, SafeText, user }) => {
    const menuItems = [
        { label: "কাটিং ও লট", icon: Scissors, id: "Cutting", sub: "Master Production", color: "bg-blue-600" },
        { label: "সেলাই ইউনিট", icon: Layers, id: "Swing", sub: "Garment Sewing", color: "bg-indigo-600" },
        { label: "স্টোন ইউনিট", icon: Hammer, id: "Stone", sub: "Value Addition", color: "bg-violet-600" },
        { label: "পাতা হাব", icon: Package, id: "Pata", sub: "Logistics Hub", color: "bg-emerald-600" },
        { label: "বাইরের কাজ", icon: Truck, id: "Outside", sub: "Outwork Unit", color: "bg-amber-600" },
        { label: "ইনভেন্টরি", icon: Database, id: "Stock", sub: "Raw Stock", color: "bg-slate-900" },
        { label: "টাকা ও হিসাব", icon: Wallet, id: "Accounts", tab: "treasury", sub: "Treasury Hub", color: "bg-rose-600" },
        { label: "হাজিরা প্যানেল", icon: Users, id: "Attendance", sub: "Staff Attendance", color: "bg-orange-600" },
        { label: "সিস্টেম সেটিংস", icon: Settings, id: "Settings", sub: "Config Control", color: "bg-slate-700" },
    ];

    const visibleMenuItems = menuItems.filter(item => {
        const role = user?.role?.toLowerCase();
        if (role === 'admin') return true;
        if (role === 'manager') return !['Security', 'History'].includes(item.id);
        if (role === 'worker') return ['Overview', 'Attendance'].includes(item.id);
        return false;
    });

    const todayStr = new Date().toLocaleDateString('en-GB');
    const todayExp = (masterData.expenses || []).filter(e => e.date === todayStr).reduce((a,b)=>a+b.amount, 0);
    const activeProds = (masterData.productions || []).filter(p => p.status === 'Pending').length;
    const activePata = (masterData.pataEntries || []).filter(p => p.status === 'Pending').length;
    const totalWorkers = (masterData.workerDocs || []).length;

    return (
        <div className="space-y-12 pb-24 animate-fade-in no-scrollbar italic font-outfit">
            {/* 🚀 Dynamic Operation Header */}
            <div className="bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-3xl">
                <div className="absolute top-0 right-0 p-24 opacity-10 rotate-12"><Activity size={320} /></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full backdrop-blur-xl border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Live & Operational</span>
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter leading-none uppercase italic">Operation <span className="text-blue-500 underline decoration-8 underline-offset-8">Hub</span></h1>
                        <p className="text-lg font-bold opacity-60 uppercase tracking-widest leading-relaxed max-w-xl">
                            NRZONE INDUSTRIAL ERP • REAL-TIME PERFORMANCE & PRODUCTION METRICS 
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setActivePanel('Settings')} className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-3xl flex items-center justify-center transition-all shadow-xl group">
                            <Settings size={24} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 📊 KPI Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <StatCard label="Production Flow" value={`${activeProds + activePata}`} icon={Activity} color="bg-blue-600" sub="Active Operational Nodes" />
                <StatCard label="Active Force" value={`${totalWorkers}`} icon={Users} color="bg-indigo-600" sub="Personnel Synchronized" />
                <StatCard label="Daily Burn Rate" value={`৳${todayExp.toLocaleString()}`} icon={TrendingDown} color="bg-rose-600" sub="Expenses Recorded Today" />
                <StatCard label="Stock Readiness" value={`${(masterData.rawInventory || []).length}`} icon={Box} color="bg-slate-900" sub="Inventory Batches Logged" />
            </div>

            {/* 🛠️ Module Gateway */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 ml-4">
                    <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-black dark:text-white">System Modules <span className="opacity-20">/ Gateway</span></h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {visibleMenuItems.map((item, idx) => (
                        <button 
                            key={idx}
                            onClick={() => {
                                setActivePanel(item.id);
                                if (item.tab) setPanelTab(item.tab);
                            }}
                            className="saas-card !p-8 flex flex-col items-center justify-center text-center shadow-xl hover:border-blue-600 hover:shadow-2xl hover:-translate-y-2 transition-all active:scale-95 group relative bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800"
                        >
                            <div className={`w-20 h-20 ${item.color} text-white rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-2xl relative`}>
                                <item.icon size={36} />
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-[2rem] transition-opacity"></div>
                            </div>
                            <h4 className="text-sm font-black uppercase text-black dark:text-white leading-tight mb-2 tracking-tighter"><SafeText data={item.label} /></h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60"><SafeText data={item.sub} /></p>
                        </button>
                    ))}
                </div>
            </div>

            {/* 📈 System Health Check */}
            <div className="p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 border-dashed text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 opacity-60">
                    SaaS Core Engine V4.5 • NRZONE INDUSTRIAL NETWORK
                </p>
            </div>
        </div>
    );
};

export default Overview;
