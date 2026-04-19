import React from 'react';
import { ChevronRight, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';

export const DashboardCard = ({ title, pending, finished, bill, color, label2 = "Finished", SafeText }) => {
    return (
        <div className="premium-card group hover:shadow-premium !p-8 md:!p-10">
            <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black dark:text-white dark:text-white">Operational Node</p>
                    <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none text-[var(--text-primary)]"><SafeText data={title} /></h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] shadow-[var(--neu-button)] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                    <TrendingUp size={20} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-[var(--bg-primary)] p-6 md:p-8 rounded-3xl shadow-[var(--neu-concave)]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-black dark:text-white dark:text-white mb-2">In Progress</p>
                    <p className="text-3xl md:text-5xl font-black tracking-tighter leading-none italic text-[var(--text-primary)]"><SafeText data={pending} /></p>
                </div>
                <div className="bg-[var(--bg-primary)] p-6 md:p-8 rounded-3xl shadow-[var(--neu-concave)]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-black dark:text-white dark:text-white mb-2"><SafeText data={label2?.toUpperCase()} /></p>
                    <p className="text-3xl md:text-5xl font-black tracking-tighter leading-none italic text-[var(--text-primary)]"><SafeText data={finished} /></p>
                </div>
            </div>

            {bill > 0 && (
                <div className="mt-10 pt-8 border-t border-[var(--border)]">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black dark:text-white dark:text-white mb-3">Accumulated Revenue</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-500 italic">৳</span>
                        <p className="text-5xl md:text-6xl font-black tracking-tighter leading-none italic text-[var(--text-primary)]">{bill.toLocaleString()}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MenuButton = ({ title, sub, onClick, icon, color, SafeText }) => {
    return (
        <button
            onClick={onClick}
            className="premium-card !p-8 md:!p-10 flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
        >
            <div className="flex items-center gap-6 md:gap-8 text-left">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-[var(--bg-primary)] shadow-[var(--neu-button)] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                    {icon && React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
                </div>
                <div className="space-y-1">
                    <h4 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase leading-none text-[var(--text-primary)]">
                        <SafeText data={title} />
                    </h4>
                    <p className="text-[10px] font-bold text-black dark:text-white dark:text-white uppercase tracking-[0.4em] italic"><SafeText data={sub} /></p>
                </div>
            </div>

            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--bg-primary)] shadow-[var(--neu-button)] flex items-center justify-center group-hover:translate-x-2 transition-all">
                <ArrowUpRight size={20} strokeWidth={3} />
            </div>
        </button>
    );
};

export const Toast = ({ message, type, onClose, SafeText }) => {
    React.useEffect(() => {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
        audio.play().catch(() => {});
        if (onClose) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [onClose]);

    const styles = {
        success: "bg-black text-white border-2 border-black shadow-2xl",
        error: "bg-rose-500 text-white shadow-[0_40px_80px_-20px_rgba(244,63,94,0.4)]",
        info: "bg-black text-white border-2 border-black shadow-2xl"
    };

    return (
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] px-14 py-8 rounded-full animate-fade-slide-up flex items-center gap-8 whitespace-nowrap italic backdrop-blur-3xl ${styles[type] || styles.info}`}>
            <div className="w-3 h-3 rounded-full bg-white animate-pulse shadow-[0_0_15px_white]"></div>
            <p className="font-black uppercase text-sm tracking-[0.6em] leading-none text-white">
                <SafeText data={message} />
            </p>
        </div>
    );
};
