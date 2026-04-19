import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const initialData = {
    workerCategories: {
        stone: [],
        sewing: [],
        pata: [],
        monthly: []
    },
    workerWages: {
        sewing: {}, stone: {}, pata: {}, monthly: {}
    },
    designs: [
        { name: "পাতা", sewingRate: 40, stoneRate: 20, image: "" },
        { name: "ষ্টার", sewingRate: 40, stoneRate: 40, image: "" },
        { name: "দিশা", sewingRate: 50, stoneRate: 0, image: "" },
        { name: "লাইন", sewingRate: 45, stoneRate: 30, image: "" },
        { name: "লতা", sewingRate: 40, stoneRate: 45, image: "" },
        { name: "বেবি লতা", sewingRate: 30, stoneRate: 30, image: "" },
        { name: "ফুল", sewingRate: 40, stoneRate: 20, image: "" },
        { name: "বেবি ফ্রক", sewingRate: 0, stoneRate: 7, image: "" },
        { name: "ফাবিয়া 2", sewingRate: 40, stoneRate: 45, image: "" },
        { name: "মাসকা", sewingRate: 40, stoneRate: 20, image: "" },
        { name: "গুচি", sewingRate: 40, stoneRate: 20, image: "" },
        { name: "কোটি", sewingRate: 55, stoneRate: 150, image: "" },
        { name: "রিপিট", sewingRate: 45, stoneRate: 0, image: "" },
        { name: "এডজাস্ট কোটি", sewingRate: 45, stoneRate: 0, image: "" },
        { name: "আবায়া", sewingRate: 40, stoneRate: 30, image: "" },
        { name: "প্লেন", sewingRate: 40, stoneRate: 0, image: "" },
    ],
    pataRates: { "Single": 3, "Double": 5, "Triple": 10, "Mix": 8 },
    stonePacketRate: 450,
    rollPscRate: 100,
    colors: ["অলিভ", "জাম", "ব্লু", "বিস্কুট", "কালো", "সাদা", "নুড", "মেরুন", "কফি", "পিত", "পানি", "মাস্টার"],
    sizes: ["30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56", "58"],
    pataTypes: ["Single", "Double", "Triple", "Mix"],
    pataStoneColors: ["White", "Golden", "Black", "Silver", "Multi", "Rainbow"],
    users: [
        { id: "ADMIN", password: "admin123", role: "admin", name: "Super Admin" },
        { id: "MANAGER", password: "manager123", role: "manager", name: "Manager" },
    ],
    workerDocs: [
        { workerId: "WORKER1", password: "worker123", role: "worker", name: "Worker 1", dept: "sewing" },
        { workerId: "WORKER2", password: "worker222", role: "worker", name: "Worker 2", dept: "stone" },
    ],
    clients: [],
    cuttingStock: [],
    productions: [],
    pataEntries: [],
    pataStockTransfer: [],
    attendance: [],
    rawInventory: [],
    deliveries: [],
    outsideWorkEntries: [],
    productionRequests: [],
    outsideWorkers: [],
    outsideTasks: ["BUTTON", "CHAIN", "REPAIR", "KAZ", "OTHERS"],
    adminNotes: [],
    cutters: [],
    notifications: [],
    workerAdvances: [],
    clientTransactions: [],
    settings: { logo: "", whatsappNumber: "" },
    whatsappRequests: [],
    expenses: [],
    cashEntries: [],
    workerPayments: [],
    workerBiometrics: {},
    auditLogs: [], 
    systemSettings: {
        offlineMode: true,
        whatsappEnabled: true,
        barcodeEnabled: true,
        currency: "৳"
    },
    rolePermissions: {
        admin: ["*"],
        manager: ["Overview", "Accounts"], // Dashboard + Expense entry
        worker: ["Overview"] // Only own work/balance logic is handled in components
    }
};

const COLLECTION_NAME = "nrzone_pro";
const DOC_ID = "factory_data_v1";
const LOGS_DOC_ID = "factory_logs_v1";

export const useMasterData = (user) => {
    const [isLoading, setIsLoading] = useState(true);
    const [masterData, setMasterData] = useState(() => {
        const saved = localStorage.getItem('nrzone_data');
        if (saved) {
            try {
                return { ...initialData, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Local storage parse error:", e);
            }
        }
        return initialData;
    });

    const [syncStatus, setSyncStatus] = useState('synced'); 
    const [isOnline, setIsOnline] = useState(window.navigator.onLine);
    const [logs, setLogs] = useState([]);
    const lastSavedData = useRef('');

    // Pre-initialize ref with local storage data to avoid immediate sync on mount
    useEffect(() => {
        const saved = localStorage.getItem('nrzone_data');
        if (saved) {
            lastSavedData.current = saved;
        } else {
            lastSavedData.current = JSON.stringify(masterData);
        }
        // Ensure initial status is synced
        setSyncStatus('synced');
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Initial Load & Auth Sync
    useEffect(() => {
        let isSubscribed = true;
        setSyncStatus('syncing');

        if (!db) {
            console.warn("DB not initialized - Cloud sync disabled.");
            setIsLoading(false);
            setSyncStatus('error');
            return;
        }

        // Main Data Sync
        const unsub = onSnapshot(doc(db, COLLECTION_NAME, DOC_ID), (snap) => {
            if (!isSubscribed) return;
            
            // Critical Fix: Skip server data if the client has pending writes to avoid local revert issues
            if (snap.metadata.hasPendingWrites) {
                console.log("⏳ Skipping cloud update: local changes pending sync...");
                return;
            }

            try {
                if (snap.exists()) {
                    const cloud = snap.data()?.content;
                    if (cloud) {
                        setMasterData(prev => {
                            const merged = { ...initialData };
                            
                            // 1. Cloud to Merged Base
                            Object.keys(cloud).forEach(k => {
                                if (cloud[k] !== undefined && cloud[k] !== null) {
                                    if (typeof cloud[k] === 'object' && !Array.isArray(cloud[k])) {
                                        merged[k] = { ...initialData[k], ...cloud[k] };
                                    } else {
                                        merged[k] = cloud[k];
                                    }
                                }
                            });

                            // 2. State Sync: Trust cloud state but preserve object-level merges for settings
                            const allKeys = Object.keys(prev);
                            allKeys.forEach(key => {
                                if (initialData[key] === undefined) return;
                                const localVal = prev[key];
                                const cloudVal = merged[key];

                                if (localVal && typeof localVal === 'object' && !Array.isArray(localVal)) {
                                     merged[key] = { ...localVal, ...cloudVal };
                                }
                            });
                            
                            if (merged.auditLogs) delete merged.auditLogs;
                            
                            const pStr = JSON.stringify(prev);
                            const mStr = JSON.stringify(merged);
                            
                            if (pStr !== mStr) {
                                localStorage.setItem('nrzone_data', mStr);
                                lastSavedData.current = mStr; 
                                return merged;
                            }
                            return prev;
                        });
                    }
                } else {
                    // Cloud missing: If local has data, DO NOT reset.
                    console.warn("☁️ Cloud doc missing. Checking if we need to seed it from local...");
                }
                setSyncStatus('synced');
            } catch (err) {
                console.error("Snapshot error:", err);
            } finally {
                setIsLoading(false);
            }
        }, (err) => {
            if (!isSubscribed) return;
            setIsLoading(false);
            setSyncStatus('error');
        });

        // Logs Sync
        const unsubLogs = onSnapshot(doc(db, COLLECTION_NAME, LOGS_DOC_ID), (snap) => {
            if (!isSubscribed) return;
            if (snap.exists()) {
                const cloudLogs = snap.data()?.auditLogs || [];
                setLogs(cloudLogs);
            }
        });

        const failSafe = setTimeout(() => {
            if (isSubscribed) setIsLoading(false);
        }, 1500);

        return () => {
            isSubscribed = false;
            clearTimeout(failSafe);
            unsub();
            unsubLogs();
        };
    }, []);

    // Save Logic - Main Data
    useEffect(() => {
        if (!db || !masterData || !user || isLoading) return;

        const currentDataStr = JSON.stringify(masterData);
        if (currentDataStr === lastSavedData.current) return;
        
        setSyncStatus('syncing');

        const timer = setTimeout(async () => {
            try {
                if (Object.keys(masterData).length < 5) return;

                console.info("📤 CLOUD SYNC: Finalizing payload...");
                
                const dataToSave = JSON.parse(currentDataStr);
                if (dataToSave.auditLogs) delete dataToSave.auditLogs; 

                await setDoc(doc(db, COLLECTION_NAME, DOC_ID), { 
                    content: dataToSave,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.name || 'Admin',
                    backup: "true"
                }, { merge: true });

                console.log("✅ CLOUD SYNC SUCCESSFUL! (সফলভাবে ক্লাউডে সেভ হয়েছে)");
                lastSavedData.current = currentDataStr;
                setSyncStatus('synced');
            } catch (error) {
                console.error("❌ CLOUD SYNC ERROR (সেভ ব্যর্থ হয়েছে):", error);
                setSyncStatus('error');
                if (error.code === 'permission-denied') {
                    console.error("🔒 HINT: Update your Firestore Security Rules to allow public writes for Spark plan setup!");
                }
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [masterData, db, user, isLoading]);


    // Save Logic - Logs
    useEffect(() => {
        if (!db || !logs || logs.length === 0) return;
        const timer = setTimeout(async () => {
            try {
                await setDoc(doc(db, COLLECTION_NAME, LOGS_DOC_ID), { auditLogs: logs.slice(0, 500) }, { merge: true });
            } catch (e) {
                console.error("Logs sync error:", e);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [logs]);

    const logAction = useCallback((user, action, details) => {
        const newLog = {
            timestamp: new Date().toISOString(),
            user: user?.name || user?.id || 'System',
            role: user?.role || 'Guest',
            action,
            details
        };
        setLogs(prev => [newLog, ...prev].slice(0, 499));
    }, []);

    const downloadBackup = useCallback(() => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ ...masterData, auditLogs: logs }));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `nrzone_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }, [masterData, logs]);

    return { masterData, setMasterData, isLoading, syncStatus, logAction, logs, downloadBackup };
};
