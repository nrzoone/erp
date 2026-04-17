import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LogOut,
    ArrowLeft,
    Settings,
    User,
    Lock,
    AlertCircle,
    Activity,
    Scissors,
    Layers,
    Hammer,
    Package,
    Truck,
    Users,
    Database,
    DollarSign,
    FileText,
    LayoutGrid,
    Menu,
    Sun,
    Moon,
    Globe,
    MessageCircle,
    MessageSquare,
    ShieldCheck,
    Shield,
    ShieldAlert,
    Bell,
    X,
    Send,
    Archive,
    CheckCircle,
    Search,
    AlertTriangle,
    Eye,
    EyeOff,
    Printer,
    Plus,
    Trash2,
    ChevronRight,
    UserCheck,
    BarChart2,
} from "lucide-react";
import Overview from "./components/Overview";
import CuttingPanel from "./components/panels/CuttingPanel";
import FactoryPanel from "./components/panels/FactoryPanel";
import PataFactoryPanel from "./components/panels/PataFactoryPanel";
import WorkerSummary from "./components/WorkerSummary";
import WeeklyInvoice from "./components/WeeklyInvoice";
import ReportsPanel from "./components/panels/ReportsPanel";
import AttendancePanel from "./components/panels/AttendancePanel";
import SettingsPanel from "./components/panels/SettingsPanel_V2";
import InventoryPanel from "./components/panels/InventoryPanel";
import ExpensePanel from "./components/panels/ExpensePanel";
import OutsideWorkPanel from "./components/panels/OutsideWorkPanel";
import SecurityPanel from "./components/panels/SecurityPanel";
import MenuPanel from "./components/panels/MenuPanel";
import { useMasterData } from "./hooks/useMasterData";
import { Toast } from "./components/UIComponents";
import { useTranslation } from "./utils/translations";
import QRScanner from "./components/QRScanner";
import NRZLogo from "./components/NRZLogo";

const GlobalStyles = () => null;

// Global Emergency Suppression for AbortError and legacy issues
// Note: We are no longer suppressing 'quota' or 'storage' errors to help debug sync failures.
const suppressGlobalError = (event) => {
    const reason = event.reason || event.error || event;
    const errStr = String(reason?.message || reason?.code || reason || '');
    if (/abort|cancelled|user aborted/i.test(errStr)) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
        console.warn("🛡️ SILENCED BENIGN ERROR:", errStr);
        return true;
    }
};
window.addEventListener('unhandledrejection', suppressGlobalError, true);
window.addEventListener('error', suppressGlobalError, true);

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        const errStr = String(error?.message || error?.toString() || error);
        if (/abort|cancelled|user aborted/i.test(errStr)) {
            return { hasError: false, error: null };
        }
        return { hasError: true, error };
    }

    handleRecover = () => {
        const confirm = window.confirm("গোপন তথ্য ও লোকাল ক্যাশ মুছে যাবে। আপনি কি নিশ্চিত?");
        if (!confirm) return;
        localStorage.clear();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 md:p-12 text-center font-outfit overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
                    </div>
                    
                    <div className="relative mb-12">
                        <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                            <AlertTriangle size={48} className="text-rose-500 animate-pulse" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">CRITICAL <span className="text-rose-500">FAILURE</span></h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-relaxed max-w-sm mb-12 italic opacity-60">
                        INDUSTRIAL GUARD ACTIVE: SEGMENTATION FAULT DETECTED
                    </p>

                    <div className="saas-card !bg-white/5 backdrop-blur-xl border-white/10 !p-6 mb-12 w-full max-w-lg text-left overflow-auto max-h-40 shadow-2xl">
                        <p className="text-rose-400 text-[10px] font-mono leading-relaxed break-all">{this.state.error?.toString()}</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full max-w-lg">
                        <button
                            onClick={() => window.location.reload()}
                            className="action-btn-primary flex-1 !py-5 !bg-white !text-black shadow-white/5"
                        >
                            REBOOT CORE SYSTEM
                        </button>
                        <button
                            onClick={this.handleRecover}
                            className="action-btn-secondary flex-1 !py-5 !bg-rose-600 !text-white !border-none shadow-rose-600/20"
                        >
                            PURGE DATA & RECOVERY
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const playSound = (type = 'click') => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        } else if (type === 'error') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.02, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        }
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.warn("Audio Context blocked or failed:", e);
    }
};

const Logo = ({ size = "md", white = false, customUrl = null }) => (
    <NRZLogo size={size} white={white} customUrl={customUrl} />
);

const SafeText = ({ data, fallback = "" }) => {
    if (data === null || data === undefined) return fallback;
    if (typeof data === 'object') {
        const str = JSON.stringify(data);
        return <span className="text-[10px] font-mono opacity-50 bg-rose-500/10 text-rose-500 px-1 rounded" title={str}>[ERR: OBJ]</span>;
    }
    return data;
};

const LoginView = ({ onLogin, masterData }) => {
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-slate-950 font-outfit overflow-hidden">
            {/* Branding Section with Custom Pattern */}
            <div className="w-full md:w-1/2 bg-slate-950 flex flex-col items-center justify-center p-8 md:p-32 relative min-h-[45vh] md:min-h-screen rounded-b-[4rem] md:rounded-none z-10 overflow-hidden shadow-2xl">
                {/* Modern Geometric Pattern Overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ 
                        backgroundImage: `radial-gradient(circle at 2px 2px, #475569 1px, transparent 0)`,
                        backgroundSize: '32px 32px'
                    }}>
                </div>
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full"></div>
                
                <div className="relative z-10 flex flex-col items-center animate-fade-in text-center gap-6 md:gap-12">
                    <div className="transform hover:scale-110 transition-transform duration-700">
                        <Logo size="xl" white={true} customUrl={masterData.settings?.logo} />
                    </div>
                    <div className="space-y-4 px-4">
                        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                            NRZOONE
                        </h1>
                        <p className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-[0.4em] opacity-100">
                           FACTORY MANAGEMENT
                        </p>
                    </div>
                </div>

                <div className="absolute top-12 left-12 hidden md:block">
                   <p className="text-[10px] font-black text-white/40 tracking-[0.5em] uppercase">Enterprise // V5.2</p>
                </div>
            </div>

            {/* Login Form Section */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-24 bg-white dark:bg-slate-950 relative">
                <div className="absolute top-12 right-12 hidden md:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">NRZ SYSTEM SECURED</p>
                </div>

                <div className="w-full max-w-sm space-y-12 md:space-y-16 animate-fade-up">
                    <div className="space-y-4">
                        <h2 className="text-5xl md:text-7xl font-bold text-slate-950 dark:text-white tracking-tighter leading-none">
                            Login
                        </h2>
                    </div>

                    <div className="space-y-8 md:space-y-10">
                        {/* ID Input */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email / Member ID</label>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-1 border border-transparent focus-within:border-slate-950 dark:focus-within:border-white transition-all shadow-sm">
                                <input 
                                    type="text"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="w-full bg-transparent py-4 px-5 text-slate-950 dark:text-white font-bold focus:outline-none placeholder:text-slate-300 text-sm md:text-base"
                                    placeholder="mark.johnson@gmail.com"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Password</label>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-1 border border-transparent focus-within:border-slate-950 dark:focus-within:border-white transition-all shadow-sm relative">
                                <input 
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-transparent py-4 px-5 text-slate-950 dark:text-white font-bold focus:outline-none placeholder:text-slate-300 text-sm md:text-base"
                                    placeholder="••••••••••••"
                                />
                                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-950 transition-colors">
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-between items-center pt-2 px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center">
                                        <CheckCircle size={12} className="text-slate-950 dark:text-white" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Access Only</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 md:pt-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <button 
                            onClick={() => onLogin(id, password)}
                            className="w-full md:w-auto px-12 py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl md:rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all text-center"
                        >
                            Sign In Now
                        </button>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-slate-300 uppercase italic">Powering NRZONE</span>
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-12 text-center w-full px-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-300">Don't have any account? <span className="text-slate-950 dark:text-white font-black cursor-pointer">Sign Up</span></p>
                </div>
            </div>
        </div>
    );
};

const TrackingView = ({ trackId, masterData, onClose, isDarkMode, SafeText }) => {
    const item = [...(masterData.productions || []), ...(masterData.pataEntries || [])].find(i => String(i.id) === trackId);
    if (!item) return <div className="min-h-screen flex items-center justify-center bg-black text-rose-500 font-black uppercase">Tracking ID Not Found <button onClick={onClose} className="ml-4 bg-white text-black p-2 rounded">Close</button></div>;

    return (
        <div className="min-h-screen bg-white p-4 md:p-20 font-outfit italic animate-fade-up">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="flex justify-between items-center">
                    <Logo size="sm" white={false} customUrl={masterData.settings?.logo} />
                    <button onClick={onClose} className="p-4 bg-slate-100 rounded-full hover:bg-black hover:text-white transition-all"><X size={20} /></button>
                </div>

                <div className="bg-black text-white p-8 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-3xl text-center flex flex-col items-center">
                    <Logo size="md" white={true} customUrl={masterData.settings?.logo} />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-6 mb-6">Status</p>
                    <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter">{item.status === 'Pending' ? 'In Production' : 'Completed'}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 border-t border-white/10 pt-12">
                        <div><p className="text-[8px] text-black dark:text-white uppercase tracking-widest mb-1 font-black underline">Lot</p><p className="font-black">#<SafeText data={item.lotNo} /></p></div>
                        <div><p className="text-[8px] text-black dark:text-white uppercase tracking-widest mb-1 font-black underline">Worker</p><p className="font-black uppercase"><SafeText data={item.worker} /></p></div>
                        <div><p className="text-[8px] text-black dark:text-white uppercase tracking-widest mb-1 font-black underline">Design</p><p className="font-black uppercase"><SafeText data={item.design} /></p></div>
                        <div><p className="text-[8px] text-black dark:text-white uppercase tracking-widest mb-1 font-black underline">Qty</p><p className="font-black"><SafeText data={item.issueBorka || item.pataQty || 0} /> Pcs</p></div>
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] italic">INDUSTRIAL SECURITY ACTIVE // NO PUBLIC SHARE</p>
                </div>
            </div>
        </div>
    );
};

const MENU_CATEGORIES = [
    {
        id: "core",
        label: "মূল সিস্টেম (CORE)",
        items: [
            { id: "Overview", label: "ড্যাশবোর্ড", icon: Activity, sub: "লাইভ মনিটর" },
            { id: "Stock", label: "ইনভেন্টরি", icon: Database, sub: "মজুদ" },
        ]
    },
    {
        id: "production",
        label: "উৎপাদন ইউনিট (PRODUCTION)",
        items: [
            { id: "Cutting", label: "কাটিং", icon: Scissors, sub: "মাস্টার" },
            { id: "Swing", label: "সেলাই", icon: Layers, sub: "ফ্যাক্টরি" },
            { id: "Stone", label: "স্টোন", icon: Hammer, sub: "ফ্যাক্টরি" },
            { id: "Pata", label: "পাতা হাব", icon: Package, sub: "লজিস্টিকস" },
        ]
    },
    {
        id: "operations",
        label: "অপারেশনস (OPERATIONS)",
        items: [
            { id: "Outside", label: "বাইরের কাজ", icon: Truck, sub: "এক্সটার্নাল" },
            { id: "Attendance", label: "হাজিরা", icon: Users, sub: "স্টাফ" },
        ]
    },
    {
        id: "finance",
        label: "মাস্টার কন্ট্রোল (MASTER HUB)",
        items: [
            { id: "Accounts", label: "Treasury (ক্যাশ)", icon: DollarSign, sub: "ফাইন্যান্স", tab: "treasury" },
            { id: "Accounts", label: "Workforce (শ্রমিক)", icon: UserCheck, sub: "কারিগর লেজার", tab: "workforce" },
            { id: "Accounts", label: "Analytics (রিপোর্ট)", icon: BarChart2, sub: "অ্যানালিটিক্স", tab: "analytics" },
            { id: "Accounts", label: "System (নিরাপত্তা)", icon: ShieldCheck, sub: "অডিট লগ", tab: "system" },
            { id: "Settings", label: "সেটিংস", icon: Settings, sub: "মাস্টার কন্ট্রোল" },
            { id: "History", label: "Security", icon: Shield, sub: "সিস্টেম লগ" },
        ]
    }
];

const Sidebar = ({ activePanel, setActivePanel, panelTab, setPanelTab, user, setUser, isOpen, setIsSidebarOpen, t, isDarkMode, masterData, lowStockItems }) => {
    const navigate = (id, tab) => {
        setActivePanel(id);
        if (tab) setPanelTab(tab);
        setIsSidebarOpen(false);
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-[200] w-[280px] md:w-[320px] flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-500 cubic-bezier(0.19, 1, 0.22, 1) font-inter ${isOpen ? 'translate-x-0 shadow-[var(--shadow-elite)]' : '-translate-x-full shadow-none'}`}>
            {/* Sidebar Branding */}
            <div className="pt-12 pb-10 px-8 flex flex-col items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 scale-110 mb-2">
                    <Logo size="sm" white={isDarkMode} customUrl={masterData.settings?.logo} />
                </div>
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-[var(--text-muted)] mt-6 italic">INDUSTRIAL ERP V2.0</p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 md:px-5 space-y-8 no-scrollbar pb-12">
                {MENU_CATEGORIES.map(category => {
                    const filteredItems = category.items.filter(item => {
                        const role = user?.role?.toLowerCase();
                        if (role === 'admin') return true;
                        if (role === 'manager') return !['Security', 'History'].includes(item.id);
                        if (role === 'worker') return ['Cutting', 'Swing', 'Stone', 'Pata', 'Outside', 'Attendance', 'WorkerSummary'].includes(item.id);
                        return false;
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                        <nav key={category.id} className="space-y-1.5">
                            <p className="px-5 text-[8.5px] font-black text-[var(--text-muted)] tracking-[0.4em] mb-3 uppercase italic"><SafeText data={category.label} /></p>
                            {filteredItems.map(item => {
                                const Icon = item.icon;
                                const active = activePanel === item.id;
                                const isLowStock = item.id === 'Stock' && lowStockItems?.length > 0;
                                return (
                                    <button
                                        key={item.id + (item.tab || "")} 
                                        onClick={() => navigate(item.id, item.tab)}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative border ${active && (item.tab ? panelTab === item.tab : true) ? "bg-slate-950 text-white border-black dark:bg-white dark:text-black dark:border-white shadow-xl" : "text-[var(--text-secondary)] border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/5"} ${isLowStock ? 'low-stock-alert' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active && (item.tab ? panelTab === item.tab : true) ? "bg-white/20 dark:bg-black/10 shadow-inner" : "bg-slate-100 dark:bg-white/10 group-hover:scale-110"}`}>
                                            <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                                        </div>
                                        <div className="flex flex-col items-start leading-tight">
                                            <span className={`text-[0.7rem] tracking-tight font-black uppercase italic`}><SafeText data={t?.(item.id.toLowerCase() + (item.tab ? "_" + item.tab : "")) || item.label} /></span>
                                            <span className={`text-[0.55rem] uppercase tracking-widest font-black opacity-60 italic mt-0.5`}><SafeText data={item.sub} /></span>
                                        </div>
                                        {active && (item.tab ? panelTab === item.tab : true) && (
                                            <motion.div layoutId="activeInd" className="absolute right-4 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></motion.div>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    );
                })}
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                <button 
                    onClick={() => {
                        setUser(null);
                        localStorage.removeItem('nrzone_user');
                    }} 
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-[var(--text-muted)] hover:text-rose-500 transition-all hover:bg-rose-500/5 group border border-transparent hover:border-rose-500/20"
                >
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center group-hover:bg-rose-500/10 shadow-sm border border-slate-100 dark:border-transparent">
                        <LogOut size={18} />
                    </div>
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] italic">লিভ সিস্টেম (EXIT)</span>
                </button>
            </div>
        </aside>
    );
};


const AppContent = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [language, setLanguage] = useState(() => localStorage.getItem('nrzone_lang') || "BN");
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('nrzone_theme') === 'dark');
    const t = useTranslation(language);
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('nrzone_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [activePanel, setActivePanel] = useState(() => {
        const savedUser = localStorage.getItem('nrzone_user');
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed.role === 'worker') return "WorkerSummary";
        }
        return "Overview";
    });
    const [panelTab, setPanelTab] = useState("treasury");
    const [toast, setToast] = useState(null);
    const { masterData, setMasterData, isLoading, logs, downloadBackup, logAction, syncStatus } = useMasterData(user);
    const [isListening, setIsListening] = useState(false);
    const [trackingId, setTrackingId] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [isSuiteOpen, setIsSuiteOpen] = useState(false);

    // NEW: Stock Alert Logic
    const lowStockItems = useMemo(() => {
        const inventory = {};
        (masterData.rawInventory || []).forEach(log => {
            const key = log.color ? `${log.item} (${log.color})` : log.item;
            if (!inventory[key]) inventory[key] = 0;
            if (log.type === 'in') inventory[key] += Number(log.qty);
            else inventory[key] -= Number(log.qty);
        });
        return Object.entries(inventory)
            .filter(([_, qty]) => qty > 0 && qty < 50)
            .map(([name, qty]) => ({ name, qty }));
    }, [masterData.rawInventory]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('nrzone_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('nrzone_theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        localStorage.setItem('nrzone_lang', language);
    }, [language]);

    const showNotify = (message, type = "success") => {
        playSound(type);
        // Defensive: ensure message is not an raw Error object without stringification
        const safeMessage = (message instanceof Error) ? message.message : message;
        setToast({ message: safeMessage, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogin = async (id, pass) => {
        if (id === 'BIOMETRIC') {
            try {
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const credential = await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        timeout: 60000,
                        userVerification: "required"
                    }
                });

                if (credential) {
                    const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
                    const matchingUser = (masterData.users || []).find(u => (u.role === 'admin' || u.role === 'manager') && u.biometricId === rawId);
                    
                    if (matchingUser) {
                        setUser(matchingUser);
                        showNotify(`Biometric Auth: স্বাগতম, ${matchingUser.name}!`);
                        return;
                    } else {
                        showNotify("এটি অজানা বায়োমেট্রিক আইডি!", "error");
                        return;
                    }
                }
            } catch (err) {
                console.error("Biometric login failed:", err);
                showNotify("বায়োমেট্রিক লগইন বাতিল বা ত্রুটিপূর্ণ!", "error");
                return;
            }
        }

        let u = (masterData.users || []).find(x => 
            (x.id === id.trim().toUpperCase() || (x.id === "NRZO0NE" && id.trim().toUpperCase() === "NRZONE")) && 
            x.password === pass.trim()
        );

        if (!u) {
            u = (masterData.workerDocs || []).find(w => 
                (w.workerId?.trim().toUpperCase() === id.trim().toUpperCase() || w.name.trim().toUpperCase() === id.trim().toUpperCase()) && 
                w.password === pass.trim()
            );
            if (u) {
                u = { ...u, role: 'worker', id: u.workerId || u.name.toUpperCase() };
            }
        }

        if (u) { 
            setUser(u); 
            localStorage.setItem('nrzone_user', JSON.stringify(u));
            showNotify(`স্বাগতম, ${u.name}!`); 
            logAction(u, 'LOGIN', 'User logged in successfully');
            
            if (u.role === 'worker') {
                setActivePanel('WorkerSummary');
            } else {
                setActivePanel('Overview');
            }
        }
        else showNotify("ভুল আইডি বা পাসওয়ার্ড!", "error");
    };

    const handleSyncToGoogleSheets = async () => {
        const url = masterData.settings?.googleSheetsUrl;
        if (!url) {
            showNotify("গুগল শিট URL সেট করা নেই! সেটিংস চেক করুন।", "error");
            return;
        }

        try {
            showNotify("গুগল শিটে ডেটা পাঠানো হচ্ছে...", "info");
            // Standard fetch for Google Apps Script Web App
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workerDocs: masterData.workerDocs || [],
                    productions: masterData.productions || [],
                    inventory: masterData.inventory || {},
                    expenses: masterData.expenses || [],
                    deliveries: masterData.deliveries || [],
                    pataEntries: masterData.pataEntries || [],
                    cuttingStock: masterData.cuttingStock || [],
                    clientTransactions: masterData.clientTransactions || [],
                    logs: logs || [],
                    timestamp: new Date().toISOString(),
                    factoryName: masterData.settings?.factoryName || 'NRZO0NE'
                })
            });
            
            showNotify("গুগল শিট সিঙ্ক রিকোয়েস্ট পাঠানো হয়েছে!", "success");
            logAction(user, 'SYNC_GOOGLE_SHEETS', 'Manual data sync to Google Sheets');
        } catch (error) {
            console.error("Sync error:", error);
            showNotify("সিঙ্ক করতে সমস্যা হয়েছে! ইন্টারনেট কানেকশন চেক করুন।", "error");
        }
    };

    // Voice Command Hub
    useEffect(() => {
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Speech || !user) return;

        const recognition = new Speech();
        recognition.lang = 'bn-BD';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
            console.log("Voice Command:", command);

            if (command.includes('ড্যাশবোর্ড') || command.includes('মুখ্য')) setActivePanel('Overview');
            if (command.includes('কাটিং')) setActivePanel('Cutting');
            if (command.includes('সেলাই')) setActivePanel('Swing');
            if (command.includes('স্টোন') || command.includes('পাথর')) setActivePanel('Stone');
            if (command.includes('ইনভেন্টরি') || command.includes('মজুদ')) setActivePanel('Stock');
            if (command.includes('অ্যাটেন্ডেন্স') || command.includes('হাজিরা')) setActivePanel('Attendance');
            if (command.includes('সেটিংস') || command.includes('সিস্টেম')) setActivePanel('Settings');
            if (command.includes('লগআউট') || command.includes('বন্ধ করুন')) setUser(null);
            
            playSound('success');
        };

        if (isListening) recognition.start();
        return () => recognition.abort();
    }, [isListening, user]);

    // Anti-Loss Protocol: Warn user if closing while syncing
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (syncStatus === 'syncing') {
                e.preventDefault();
                e.returnValue = 'Data is still syncing to cloud. Stay on page?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [syncStatus]);

    if (isLoading || !masterData) return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 md:p-20 animate-fade-in transition-all duration-1000">
            <div className="mb-12 animate-pulse scale-110">
                <Logo size="lg" white customUrl={masterData?.settings?.logo} />
            </div>
            <div className="relative group">
                <p className="italic tracking-[0.8em] uppercase text-[10px] font-black text-white opacity-70 animate-pulse">
                    Connecting NRZONE Neural Link...
                </p>
                <div className="absolute -bottom-4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="mt-20 flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className={`w-1 h-1 rounded-full bg-white opacity-10 animate-ping`} style={{ animationDelay: `${i * 300}ms` }}></div>)}
            </div>
        </div>
    );


    // Filtered Content
    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {!user ? (
                <LoginView onLogin={handleLogin} masterData={masterData} />
            ) : (
                <div className="flex min-h-screen relative overflow-x-hidden text-black dark:text-white">
                    {/* Mobile Sidebar Backdrop */}
                    {isSidebarOpen && (
                        <div 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[140] md:hidden transition-opacity"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                    
                    <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} panelTab={panelTab} setPanelTab={setPanelTab} user={user} setUser={setUser} isOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} t={t} isDarkMode={isDarkMode} masterData={masterData} lowStockItems={lowStockItems} />
                    
                    <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative transition-all duration-500 mesh-bg ${isSidebarOpen ? 'lg:ml-[300px]' : ''}`}>
                        {/* Header Section */}
                        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-2 md:px-8 py-2 md:py-4 sticky top-0 z-[100] transition-all no-print shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4 md:gap-6">
                                <button 
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    <Menu size={18} />
                                </button>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase leading-tight">
                                        <SafeText data={activePanel === "Overview" ? "Dashboard" : activePanel} fallback={activePanel} />
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${syncStatus === 'error' ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {syncStatus === 'syncing' ? 'সিঙ্কিং হচ্ছে...' : syncStatus === 'error' ? 'সিঙ্ক ত্রুটি' : 'সিস্টেম সুরক্ষিত'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:gap-6">
                                <div className="hidden sm:flex flex-col items-end pr-5 border-r border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">অনুমোদিত ইউজার</p>
                                    <p className="text-sm font-black uppercase leading-none italic"><SafeText data={user?.name} fallback="অপারেটর" /></p>
                                </div>
                                <div className="flex gap-2">
                                    {lowStockItems.length > 0 && (
                                        <button 
                                            onClick={() => setActivePanel("Stock")}
                                            className="w-10 h-10 rounded-xl bg-orange-500 text-white shadow-lg flex items-center justify-center animate-pulse border-2 border-white dark:border-slate-900"
                                        >
                                            <AlertTriangle size={18} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setIsDarkMode(!isDarkMode)}
                                        className="w-10 h-10 rounded-xl bg-slate-950 text-white shadow-lg flex items-center justify-center hover:bg-black transition-all"
                                    >
                                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                                    </button>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-1 md:px-4 py-2 md:py-4 relative custom-scrollbar">
                            <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 animate-fade-up">
                                {activePanel === "Overview" && <Overview masterData={masterData} user={user} setActivePanel={setActivePanel} t={t} syncStatus={syncStatus} SafeText={SafeText} />}
                                {activePanel === "Cutting" && <CuttingPanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} logAction={logAction} setActivePanel={setActivePanel} t={t} SafeText={SafeText} />}
                                {activePanel === "Swing" && <FactoryPanel type="sewing" masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} SafeText={SafeText} />}
                                {activePanel === "Stone" && <FactoryPanel type="stone" masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} SafeText={SafeText} />}
                                {activePanel === "Pata" && <PataFactoryPanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} SafeText={SafeText} />}
                                {activePanel === "Outside" && <OutsideWorkPanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} SafeText={SafeText} />}
                                {activePanel === "Stock" && <InventoryPanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} setActivePanel={setActivePanel} logAction={logAction} SafeText={SafeText} />}
                                {activePanel === "Accounts" && <ExpensePanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} setActivePanel={setActivePanel} logAction={logAction} onSyncGoogle={handleSyncToGoogleSheets} initialTab={panelTab} logs={logs} SafeText={SafeText} />}
                                {activePanel === "Attendance" && <AttendancePanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} SafeText={SafeText} />}
                                {activePanel === "Transactions" && <ReportsPanel masterData={masterData} user={user} t={t} logAction={logAction} showNotify={showNotify} setActivePanel={setActivePanel} onSyncGoogle={handleSyncToGoogleSheets} SafeText={SafeText} />}
                                {activePanel === "Settings" && <SettingsPanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} syncStatus={syncStatus} user={user} t={t} setActivePanel={setActivePanel} logs={logs} downloadBackup={downloadBackup} SafeText={SafeText} />}
                                {activePanel === "Menu" && <MenuPanel masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} lowStockItems={lowStockItems} SafeText={SafeText} />}
                                {activePanel === "WorkerSummary" && <WorkerSummary masterData={masterData} setMasterData={setMasterData} showNotify={showNotify} user={user} t={t} logAction={logAction} setActivePanel={setActivePanel} SafeText={SafeText} />}
                                {activePanel === "History" && <SecurityPanel masterData={masterData} setActivePanel={setActivePanel} t={t} logs={logs} syncStatus={syncStatus} SafeText={SafeText} />}
                                        {activePanel === "Notifications" && (
                                             <div className="space-y-8 pb-24 animate-fade-up px-2">
                                                 <div className="flex justify-between items-center mb-10">
                                                    <h1 className="text-3xl font-bold tracking-tight uppercase leading-none">নোটিফিকেশন প্যানেল</h1>
                                                    <button onClick={() => setMasterData(p => ({ ...p, notifications: (p.notifications || []).map(n => ({ ...n, read: true })) }))} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-sm">Mark Read</button>
                                                 </div>
                                                 <div className="space-y-4">
                                                    {(masterData.notifications || []).map((n, i) => (
                                                        <div key={i} className={`saas-card flex items-center gap-6 ${n.read ? 'opacity-50' : 'bg-blue-600/5'}`}>
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${n.read ? 'bg-slate-100' : 'bg-blue-600 text-white'}`}>{n.type === 'task' ? <Activity size={20} /> : <ShieldAlert size={20} />}</div>
                                                            <div className="flex-1 space-y-1">
                                                                <h4 className="text-lg font-black uppercase italic leading-none">
                                                                    <SafeText data={n.title} />
                                                                </h4>
                                                                <p className="text-[11px] font-bold text-slate-400 italic">
                                                                    <SafeText data={n.message} />
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                 </div>
                                             </div>
                                        )}
                            </div>
                        </div>

                        {/* 🚀 New FAB Floating Menu - ADMIN/MANAGER ONLY */}
                        {user && (user?.role === 'admin' || user?.role === 'manager') && (
                            <div className="fixed bottom-10 right-8 z-[2000] flex flex-col items-end gap-3 no-print">
                                <AnimatePresence>
                                    {isSuiteOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                            className="flex flex-col gap-3 mb-2"
                                        >
                                            {/* WhatsApp Button */}
                                            <button 
                                                onClick={() => {
                                                    const num = masterData.settings?.whatsappNumber || '01700000000';
                                                    const intl = "88" + num.replace(/\D/g, "");
                                                    window.open(`https://wa.me/${intl}?text=Hello NRZONE Support`, '_blank');
                                                }}
                                                className="w-14 h-14 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-slate-900"
                                                title="WhatsApp Support"
                                            >
                                                <MessageCircle size={22} />
                                            </button>

                                            {/* Notifications Button */}
                                            <button 
                                                onClick={() => setActivePanel('Notifications')}
                                                className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative border-4 border-white dark:border-slate-900"
                                                title="Notifications"
                                            >
                                                <Bell size={22} />
                                                {(masterData.notifications || []).filter(n => !n.read).length > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-xl">{ (masterData.notifications || []).filter(n => !n.read).length }</span>
                                                )}
                                            </button>

                                            {/* QR Scanner Button */}
                                            <button 
                                                onClick={() => setShowQR(true)}
                                                className="w-14 h-14 bg-slate-950 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-slate-900"
                                                title="QR Scanner"
                                            >
                                                <Search size={22} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Main TOGGLE Button: Delivery / Main Action */}
                                <button 
                                    onClick={() => {
                                        setIsSuiteOpen(!isSuiteOpen);
                                        // Optional: Direct go to Stockholm/Inventory if clicked long or double? 
                                        // For now, toggle menu.
                                    }}
                                    className={`w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center hover:scale-105 active:scale-90 transition-all border-4 border-white dark:border-slate-900 relative z-10 ${isSuiteOpen ? 'bg-rose-600 rotate-45' : 'bg-slate-950'} text-white`}
                                    title="Quick Access Menu"
                                >
                                    {isSuiteOpen ? <X size={28} /> : (
                                        <div className="flex flex-col items-center">
                                            <Truck size={24} />
                                            <span className="text-[6px] font-black uppercase tracking-tighter mt-0.5">Delivery</span>
                                        </div>
                                    )}
                                </button>
                                
                                {/* One-Click Direct Delivery Access (Next to main button if needed) */}
                                {!isSuiteOpen && (
                                    <button 
                                        onClick={() => setActivePanel('Stock')}
                                        className="absolute -left-16 bottom-1 w-12 h-12 bg-white dark:bg-slate-800 text-black dark:text-white rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 transition-all opacity-0 hover:opacity-100 sm:opacity-100"
                                        title="Direct Delivery Hub"
                                    >
                                        <Package size={18} />
                                    </button>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            )}
            {trackingId && <div className="fixed inset-0 z-[1000]"><TrackingView trackId={trackingId} masterData={masterData} onClose={() => setTrackingId(null)} isDarkMode={isDarkMode} SafeText={SafeText} /></div>}
            {showQR && <QRScanner onScanSuccess={setTrackingId} onClose={() => setShowQR(false)} SafeText={SafeText} />}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} SafeText={SafeText} />}
        </div>
    );
};

const App = () => (
    <ErrorBoundary>
        <AppContent />
    </ErrorBoundary>
);

export default App;
