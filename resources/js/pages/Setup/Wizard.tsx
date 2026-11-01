import React, { useState, useRef, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { 
    Server, Monitor, Database, Globe, CheckCircle2, 
    AlertCircle, Loader2, Upload, Wifi, ArrowRight, 
    ArrowLeft, Store, Sparkles, X, ShieldCheck,
    Sun, Moon, RefreshCw, Cpu, Layers, Play,
    Check, Terminal, HardDrive, Key, Lock, ExternalLink,
    Sliders, Radio, Activity, Copy
} from 'lucide-react';
import { ZoomControl } from '@/components/ui/ZoomControl';

interface Props {
    initialConfig: {
        db_host: string;
        db_port: number;
        db_database: string;
        db_username: string;
        store_name: string;
        domain: string;
        server_ip: string;
    };
    companyInfo: {
        name: string;
        brand: string;
        product: string;
    };
    isConfigured?: boolean;
}

type DeviceRole = 'master' | 'client';
type Step = 'role' | 'config' | 'installing' | 'completed';
type ConfigTab = 'store' | 'database' | 'network';

export default function SetupWizard({ initialConfig, companyInfo, isConfigured = false }: Props) {
    const [step, setStep] = useState<Step>(isConfigured ? 'config' : 'role');
    const [role, setRole] = useState<DeviceRole>('master');
    const [activeTab, setActiveTab] = useState<ConfigTab>('store');

    // ثيم النظام (Dark Desktop Client by default)
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const useDark = saved === 'dark' || (!saved && prefersDark);
        applyTheme(useDark);
        setIsDark(useDark);

        // تطبيق الزوم المحفوظ بنظام Electron الأصيل
        const savedZoom = localStorage.getItem('app_zoom_factor');
        if (savedZoom) {
            const zoomVal = Number(savedZoom);
            if (!isNaN(zoomVal) && zoomVal >= 50 && zoomVal <= 150) {
                if ((window as any).electronAPI?.setZoomFactor) {
                    (window as any).electronAPI.setZoomFactor(zoomVal / 100);
                    document.body.style.zoom = '';
                } else {
                    (document.documentElement.style as any).zoom = `${zoomVal}%`;
                }
            }
        }
    }, []);

    function applyTheme(dark: boolean) {
        const body = document.body;
        if (dark) {
            document.documentElement.classList.add('dark');
            body.classList.add('body-bg-dark');
            body.classList.remove('body-bg-light');
        } else {
            document.documentElement.classList.remove('dark');
            body.classList.add('body-bg-light');
            body.classList.remove('body-bg-dark');
        }
    }

    const toggleTheme = () => {
        const next = !isDark;
        applyTheme(next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
        setIsDark(next);
    };

    // بيانات المتجر والسيرفر
    const [storeName, setStoreName] = useState(initialConfig.store_name || 'منظومة السحابة');
    const [domain, setDomain] = useState(initialConfig.domain || 'cloud-pos.local');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // بيانات MySQL
    const [dbHost, setDbHost] = useState(initialConfig.db_host || '127.0.0.1');
    const [dbPort, setDbPort] = useState(String(initialConfig.db_port || 3306));
    const [dbDatabase, setDbDatabase] = useState(initialConfig.db_database || 'perfumes_v2');
    const [dbUsername, setDbUsername] = useState(initialConfig.db_username || 'root');
    const [dbPassword, setDbPassword] = useState('');

    // بيانات الجهاز الفرعي (Client)
    const [serverHost, setServerHost] = useState(initialConfig.server_ip || '127.0.0.1');

    // حالات الفحص والاختبار
    const [dbTesting, setDbTesting] = useState(false);
    const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [hostTesting, setHostTesting] = useState(false);
    const [hostTestResult, setHostTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // حالات التنفيذ
    const [installing, setInstalling] = useState(false);
    const [installError, setInstallError] = useState<string | null>(null);
    const [installProgressText, setInstallProgressText] = useState('جاري بدء التهيئة...');
    const [completedInfo, setCompletedInfo] = useState<{ redirectUrl: string } | null>(null);
    const [copiedIp, setCopiedIp] = useState(false);

    // معالجة اختيار الشعار
    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    function removeLogo() {
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    // فتح تطبيق شاشة المبيعات كنافذة مستقلة
    function handleOpenPosApp() {
        if ((window as any).electronAPI?.openPos) {
            (window as any).electronAPI.openPos();
        } else {
            window.open(`https://${domain}/invoices/create`, '_blank');
        }
    }

    // إنشاء / تجديد اختصار منظومة المبيعات على سطح المكتب
    const [shortcutStatus, setShortcutStatus] = useState<string | null>(null);
    const [creatingShortcut, setCreatingShortcut] = useState(false);

    async function handleCreateShortcut() {
        setCreatingShortcut(true);
        setShortcutStatus(null);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/setup/create-pos-shortcut', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ domain }),
            });
            const data = await res.json();
            setShortcutStatus(data.message || 'تم إنشاء الاختصار بنجاح');
        } catch (e: any) {
            setShortcutStatus('تعذر إنشاء الاختصار: ' + e.message);
        } finally {
            setCreatingShortcut(false);
        }
    }

    // نسخ عنوان IP
    function handleCopyIp() {
        if (navigator.clipboard && initialConfig.server_ip) {
            navigator.clipboard.writeText(initialConfig.server_ip);
            setCopiedIp(true);
            setTimeout(() => setCopiedIp(false), 2000);
        }
    }

    // فحص الاتصال بقاعدة البيانات
    async function testDbConnection() {
        setDbTesting(true);
        setDbTestResult(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/setup/test-db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    db_host: dbHost,
                    db_port: Number(dbPort) || 3306,
                    db_database: dbDatabase,
                    db_username: dbUsername,
                    db_password: dbPassword,
                }),
            });

            const data = await res.json();
            setDbTestResult({
                success: data.success,
                message: data.message || (data.success ? 'تم الاتصال بنجاح' : 'تعذر الاتصال'),
            });
        } catch (err: any) {
            setDbTestResult({
                success: false,
                message: err.message || 'فشل الاتصال بالخادم',
            });
        } finally {
            setDbTesting(false);
        }
    }

    // فحص الاتصال بالسيرفر الرئيسي (للجهاز الفرعي)
    async function testHostConnection() {
        setHostTesting(true);
        setHostTestResult(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/setup/test-host', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ host: serverHost }),
            });

            const data = await res.json();
            setHostTestResult({
                success: data.success,
                message: data.message,
            });
        } catch (err: any) {
            setHostTestResult({
                success: false,
                message: err.message || 'فشل الاتصال بالسيرفر الرئيسي',
            });
        } finally {
            setHostTesting(false);
        }
    }

    // بدء التثبيت والتهيئة النهائية
    async function handleStartInstall() {
        setInstalling(true);
        setInstallError(null);
        setStep('installing');

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            if (role === 'master') {
                setInstallProgressText('جاري إعداد بيئة الخادم وتحديث المتغيرات (.env)...');
                const formData = new FormData();
                formData.append('store_name', storeName);
                formData.append('domain', domain);
                formData.append('db_host', dbHost);
                formData.append('db_port', dbPort);
                formData.append('db_database', dbDatabase);
                formData.append('db_username', dbUsername);
                formData.append('db_password', dbPassword);

                if (logoFile) {
                    formData.append('store_logo_file', logoFile);
                }

                setInstallProgressText('ترحيل الجداول وهيكلة قاعدة البيانات المركزية (MySQL Migrations & Seeders)...');

                const res = await fetch('/setup/apply-master', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    body: formData,
                    signal: AbortSignal.timeout(180000),
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'فشلت عملية التثبيت');
                }

                setInstallProgressText('توليد شهادة SSL الموثوقة وإعادة تشغيل Apache في الخلفية...');
                setCompletedInfo({ redirectUrl: data.redirect || `https://${domain}/invoices/create` });
                setStep('completed');
            } else {
                setInstallProgressText('جاري ربط شاشة الكاشير بالسيرفر الرئيسي وتكوين الاتصال الشبكي...');

                const res = await fetch('/setup/apply-client', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        server_host: serverHost,
                        domain: domain,
                    }),
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'فشلت عملية الربط');
                }

                setCompletedInfo({ redirectUrl: data.redirect || `http://${serverHost}` });
                setStep('completed');
            }
        } catch (err: any) {
            setInstallError(err.message || 'حدث خطأ غير متوقع أثناء التثبيت');
            setStep('config');
        } finally {
            setInstalling(false);
        }
    }

    return (
        <div 
            className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0e14] text-[#c5cdd8] font-['Tajawal'] select-none border border-[#1b2635]" 
            dir="rtl"
            style={{ fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
            <Head title="أداة إعدادات خادم السحابة — شركة تقنية السحابة" />

            {/* 🎮 Steam Desktop Client Header / Control Strip */}
            <header className="h-14 px-5 bg-gradient-to-b from-[#17202d] to-[#121822] border-b border-[#243347] flex items-center justify-between shrink-0 z-30 shadow-md">
                
                {/* الجانب الأيمن: شعار التقنية واسم التطبيق المكتبي */}
                <div className="flex items-center gap-3.5">
                    <img 
                        src="/images/taqniya-logo.png" 
                        alt="شركة تقنية السحابة" 
                        className="h-9 w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(26,159,255,0.4)]"
                    />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                                <span>شركة تقنية السحابة</span>
                                <span className="text-[#1a9fff] font-mono text-[11px] font-bold">WORKSTATION</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#1e2c3d] text-[#63aeff] border border-[#2d425c] tracking-wider uppercase">
                                SERVER SETUP v3.0
                            </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#718296] leading-none">
                            منظومة السحابة المتكاملة — نظام إدارة الخوادم وقواعد البيانات
                        </span>
                    </div>
                </div>

                {/* المنتصف: ألسنة التنقل المكتبية بنمط Steam Tabs */}
                <div className="hidden md:flex items-center gap-1 bg-[#0d1219] p-1 rounded-lg border border-[#1f2b3b]">
                    <button
                        type="button"
                        onClick={() => setStep('role')}
                        className={`px-3.5 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                            step === 'role'
                                ? 'bg-[#1a9fff] text-white shadow-[0_0_12px_rgba(26,159,255,0.5)]'
                                : 'text-[#8495a8] hover:text-white hover:bg-[#16202c]'
                        }`}
                    >
                        1. دور النظام (Role)
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep('config')}
                        className={`px-3.5 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                            step === 'config'
                                ? 'bg-[#1a9fff] text-white shadow-[0_0_12px_rgba(26,159,255,0.5)]'
                                : 'text-[#8495a8] hover:text-white hover:bg-[#16202c]'
                        }`}
                    >
                        2. إعدادات الخادم (Config)
                    </button>
                    {isConfigured && (
                        <button
                            type="button"
                            onClick={() => setStep('completed')}
                            className={`px-3.5 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                                step === 'completed'
                                    ? 'bg-[#1a9fff] text-white shadow-[0_0_12px_rgba(26,159,255,0.5)]'
                                    : 'text-[#8495a8] hover:text-white hover:bg-[#16202c]'
                            }`}
                        >
                            3. التشغيل السريع (Launcher)
                        </button>
                    )}
                </div>

                {/* الجانب الأيسر: أدوات التحكم المكتبي (Zoom, Theme, Status) */}
                <div className="flex items-center gap-2.5">
                    <ZoomControl />

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-9 h-9 rounded bg-[#16202c] hover:bg-[#1f2d3e] text-[#8ea0b4] hover:text-white border border-[#253549] flex items-center justify-center transition-all cursor-pointer"
                        title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                    >
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
                    </button>

                    {isConfigured && (
                        <button
                            type="button"
                            onClick={handleOpenPosApp}
                            className="px-3 h-9 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            title="تشغيل شاشة المبيعات والكاشير مباشرة"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>شاشة المبيعات</span>
                        </button>
                    )}

                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121923] border border-[#213043] text-[11px] font-bold text-[#8fa1b5]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>خادم محلي: جاهز</span>
                    </div>
                </div>
            </header>

            {/* 🖥️ Steam Desktop Client Main Workstation Body */}
            <main className="flex-1 overflow-hidden flex flex-col bg-[#0b0f15]">

                {/* 🔴 حالة الخطأ إن وجدت */}
                {installError && (
                    <div className="mx-6 mt-4 p-3.5 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs font-bold text-rose-400 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{installError}</span>
                        </div>
                        <button 
                            onClick={() => setInstallError(null)}
                            className="p-1 hover:bg-rose-500/20 rounded cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 1: اختيار نمط الجهاز (Role Selection - Steam Grid Style)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'role' && (
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center max-w-5xl mx-auto w-full animate-in fade-in zoom-in-98 duration-200">
                        <div className="mb-8 text-center md:text-right">
                            <span className="text-[11px] font-mono font-black text-[#1a9fff] uppercase tracking-widest bg-[#1a9fff]/10 px-2.5 py-1 rounded border border-[#1a9fff]/20">
                                HARDWARE NODE PROVISIONING
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                                تحديد دور هذا الحاسوب في منظومة السحابة
                            </h2>
                            <p className="text-xs sm:text-sm font-bold text-[#7d8f9f] mt-1">
                                اختر كيفية تهيئة وتشغيل هذه المحطة لتوزيع المهام وقواعد البيانات بكفاءة عبر الشبكة المحلية.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            
                            {/* كرت السيرفر الرئيسي */}
                            <div 
                                onClick={() => setRole('master')}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                                    role === 'master'
                                        ? 'bg-[#15202e] border-[#1a9fff] shadow-[0_0_25px_rgba(26,159,255,0.25)] ring-1 ring-[#1a9fff]'
                                        : 'bg-[#10161f] border-[#1e2a3a] hover:border-[#2d3e54] hover:bg-[#131b26]'
                                }`}
                            >
                                {role === 'master' && (
                                    <div className="absolute top-0 right-0 bg-[#1a9fff] text-white text-[10px] font-black px-3 py-0.5 rounded-bl uppercase tracking-wider">
                                        المحدد حالياً
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="w-14 h-14 rounded-lg bg-[#0d131b] border border-[#24354b] flex items-center justify-center text-[#1a9fff] shadow-inner">
                                            <Server className="w-7 h-7" />
                                        </div>
                                        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#1a9fff]/10 text-[#6cb5ff] border border-[#1a9fff]/25">
                                            MASTER SERVER NODE
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-1.5">السيرفر الرئيسي المركزي (Master)</h3>
                                    <p className="text-xs font-bold text-[#8395a7] leading-relaxed mb-4">
                                        يحتوي على قاعدة بيانات MySQL المركزية، خادم الويب Apache 2.4، ويتحكم بشهادات التشفير SSL وإصدار الفواتير، ويعمل كخادم ومحطة مبيعات في آن واحد.
                                    </p>
                                    <div className="space-y-1.5 text-[11px] font-bold text-[#9fb3c8]">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>توليد وتحديث شهادات SSL عبر mkcert تلقائياً</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>إنشاء جداول MySQL ومطعم البيانات (Seeders)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>مشاركة الفواتير والتقارير عبر شبكة المحل (LAN)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-[#1e2b3b] flex items-center justify-between text-xs font-bold text-[#1a9fff]">
                                    <span>تهيئة الخادم والخدمات الملحقة</span>
                                    <ArrowLeft className="w-4 h-4" />
                                </div>
                            </div>

                            {/* كرت الكاشير الفرعي */}
                            <div 
                                onClick={() => setRole('client')}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                                    role === 'client'
                                        ? 'bg-[#1b1c2b] border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-purple-500'
                                        : 'bg-[#10161f] border-[#1e2a3a] hover:border-[#2d3e54] hover:bg-[#131b26]'
                                }`}
                            >
                                {role === 'client' && (
                                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-3 py-0.5 rounded-bl uppercase tracking-wider">
                                        المحدد حالياً
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="w-14 h-14 rounded-lg bg-[#0d131b] border border-[#24354b] flex items-center justify-center text-purple-400 shadow-inner">
                                            <Monitor className="w-7 h-7" />
                                        </div>
                                        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                                            CASHIER TERMINAL NODE
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-1.5">شاشة كاشير فرعية (Terminal)</h3>
                                    <p className="text-xs font-bold text-[#8395a7] leading-relaxed mb-4">
                                        محطة بيع سريعة مخصصة للكاشير. لا تتطلب خوادم محلية أو قواعد بيانات، وتتصل مباشرة بالسيرفر الرئيسي عبر الشبكة الداخلية.
                                    </p>
                                    <div className="space-y-1.5 text-[11px] font-bold text-[#9fb3c8]">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-purple-400" />
                                            <span>بدون أي متطلبات تخزين أو خوادم محلية</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-purple-400" />
                                            <span>إقلاع فوري وتوفير كامل لموارد الجهاز</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-purple-400" />
                                            <span>مزامنة لحظية مع السيرفر الرئيسي</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-[#1e2b3b] flex items-center justify-between text-xs font-bold text-purple-400">
                                    <span>ربط المحطة بالسيرفر</span>
                                    <ArrowLeft className="w-4 h-4" />
                                </div>
                            </div>

                        </div>

                        {/* زر التقدم للخطوة التالية */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setStep('config')}
                                className="px-8 h-12 rounded bg-gradient-to-r from-[#1999ff] to-[#0f67c2] hover:from-[#2eacff] hover:to-[#1778dc] text-white font-black text-sm transition-all shadow-[0_4px_14px_rgba(26,159,255,0.4)] flex items-center gap-2 cursor-pointer active:scale-[0.99]"
                            >
                                <span>متابعة إعداد النظام</span>
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 2: لوحة الإعدادات الشاملة (Steam Workstation Layout)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'config' && (
                    <div className="flex-1 flex overflow-hidden">
                        
                        {/* 🕹️ الشريط الجانبي الأيمن: أدوات المراقبة والتنقل (Steam Control Rail) */}
                        <aside className="w-80 bg-[#0e141c] border-l border-[#1f2b3b] p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
                            <div>
                                <div className="mb-6">
                                    <span className="text-[10px] font-mono font-black text-[#56718d] uppercase tracking-wider block mb-1">
                                        SYSTEM WORKBENCH
                                    </span>
                                    <h3 className="text-base font-black text-white">إعدادات الخادم المركزي</h3>
                                </div>

                                {/* قائمة الأقسام */}
                                <div className="space-y-1.5 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('store')}
                                        className={`w-full p-3 rounded text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'store'
                                                ? 'bg-[#182332] text-[#1a9fff] border-r-4 border-[#1a9fff]'
                                                : 'text-[#8293a4] hover:bg-[#131b26] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Store className="w-4 h-4" />
                                            <span>هوية المتجر والشعار</span>
                                        </div>
                                        <Check className="w-3.5 h-3.5 opacity-60" />
                                    </button>

                                    {role === 'master' ? (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('database')}
                                            className={`w-full p-3 rounded text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                                activeTab === 'database'
                                                    ? 'bg-[#182332] text-[#1a9fff] border-r-4 border-[#1a9fff]'
                                                    : 'text-[#8293a4] hover:bg-[#131b26] hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Database className="w-4 h-4" />
                                                <span>قاعدة البيانات (MySQL)</span>
                                            </div>
                                            <Check className="w-3.5 h-3.5 opacity-60" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('network')}
                                            className={`w-full p-3 rounded text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                                activeTab === 'network'
                                                    ? 'bg-[#182332] text-purple-400 border-r-4 border-purple-500'
                                                    : 'text-[#8293a4] hover:bg-[#131b26] hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Wifi className="w-4 h-4" />
                                                <span>الاتصال بالسيرفر الرئيسي</span>
                                            </div>
                                            <Check className="w-3.5 h-3.5 opacity-60" />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('network')}
                                        className={`w-full p-3 rounded text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'network'
                                                ? 'bg-[#182332] text-[#1a9fff] border-r-4 border-[#1a9fff]'
                                                : 'text-[#8293a4] hover:bg-[#131b26] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Globe className="w-4 h-4" />
                                            <span>النطاق وشهادة SSL</span>
                                        </div>
                                        <Check className="w-3.5 h-3.5 opacity-60" />
                                    </button>
                                </div>

                                {/* بطاقة الحالة والشبكة (Server Telemetry Box) */}
                                <div className="p-3.5 rounded bg-[#131923] border border-[#213144] space-y-2.5 text-[11px] font-mono">
                                    <div className="flex items-center justify-between text-[#7d90a4]">
                                        <span>SERVER IP</span>
                                        <div className="flex items-center gap-1.5 text-white font-bold">
                                            <span>{initialConfig.server_ip}</span>
                                            <button 
                                                type="button"
                                                onClick={handleCopyIp}
                                                className="p-1 hover:bg-[#1f2b3b] rounded cursor-pointer text-[#62aaff]"
                                                title="نسخ عنوان IP"
                                            >
                                                {copiedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[#7d90a4]">
                                        <span>APACHE ENGINE</span>
                                        <span className="text-emerald-400 font-bold">PORT 80 / 443</span>
                                    </div>

                                    <div className="flex items-center justify-between text-[#7d90a4]">
                                        <span>SECURITY</span>
                                        <span className="text-[#6cb5ff] font-bold">mkcert Multi-SAN</span>
                                    </div>

                                    <div className="flex items-center justify-between text-[#7d90a4]">
                                        <span>MODE</span>
                                        <span className="text-white font-bold uppercase">{role}</span>
                                    </div>
                                </div>
                            </div>

                            {/* زر الرجوع لاختيار الدور */}
                            <button
                                type="button"
                                onClick={() => setStep('role')}
                                className="w-full h-10 rounded bg-[#141b24] hover:bg-[#1c2635] text-[#8697a8] hover:text-white border border-[#223043] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                            >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>تغيير دور الجهاز</span>
                            </button>
                        </aside>

                        {/* 🛠️ مساحة العمل الرئيسية (Workbench Canvas) */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
                            
                            <div className="max-w-4xl w-full mx-auto space-y-6">

                                {/* 1. بيانات المتجر والشعار */}
                                {activeTab === 'store' && (
                                    <div className="p-6 rounded-lg bg-[#111721] border border-[#212f42] shadow-sm animate-in fade-in duration-150">
                                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1f2d3f]">
                                            <div className="w-10 h-10 rounded bg-[#162232] border border-[#273a52] flex items-center justify-center text-[#1a9fff]">
                                                <Store className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white">بيانات المتجر والنشاط التجاري</h3>
                                                <p className="text-xs font-bold text-[#718497]">
                                                    هذه البيانات ستظهر على فواتير المبيعات، الإيصالات الحرارية، وشاشات الكاشير.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                            <div>
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">
                                                    اسم المتجر / النشاط التجاري
                                                </label>
                                                <input
                                                    type="text"
                                                    value={storeName}
                                                    onChange={(e) => setStoreName(e.target.value)}
                                                    placeholder="مثال: متجر السحابة للعطور"
                                                    className="w-full h-11 px-3.5 rounded bg-[#090d13] border border-[#233348] text-white font-bold text-sm focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">
                                                    النطاق المحلي المخصص (Local Domain)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={domain}
                                                    onChange={(e) => setDomain(e.target.value)}
                                                    placeholder="مثال: tajori.store أو cloud.local"
                                                    className="w-full h-11 px-3.5 rounded bg-[#090d13] border border-[#233348] text-[#1a9fff] font-mono font-bold text-sm focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]"
                                                />
                                                <span className="text-[10px] text-[#6b7d90] mt-1 block">
                                                    سيتم ربطه محلياً مع شهادة SSL وتوجيهه إلى 127.0.0.1 تلقائياً
                                                </span>
                                            </div>
                                        </div>

                                        {/* رفع الشعار */}
                                        <div>
                                            <label className="block text-xs font-bold text-[#8fa2b6] mb-2">
                                                شعار المتجر (Store Logo)
                                            </label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />

                                            {logoPreview ? (
                                                <div className="flex items-center gap-4 p-3 rounded bg-[#0a0e14] border border-[#24354b]">
                                                    <img 
                                                        src={logoPreview} 
                                                        alt="Logo Preview" 
                                                        className="w-16 h-16 object-contain rounded bg-white/5 p-1 border border-white/10"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-xs font-bold text-white block">تم تحديد الشعار بنجاح</span>
                                                        <span className="text-[11px] text-[#6e8093]">سيتم طباعته على الإيصالات وعرضه في شاشة الدخول</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={removeLogo}
                                                        className="px-3 py-1.5 rounded bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        إزالة الشعار
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-[#27384e] hover:border-[#1a9fff] p-6 rounded-lg text-center cursor-pointer bg-[#0c1219] hover:bg-[#0f1722] transition-all group"
                                                >
                                                    <Upload className="w-8 h-8 text-[#51677f] group-hover:text-[#1a9fff] mx-auto mb-2 transition-colors" />
                                                    <span className="text-xs font-bold text-[#8598ac] group-hover:text-white block">
                                                        انقر هنا لاختيار شعار المتجر (PNG / JPG / WEBP)
                                                    </span>
                                                    <span className="text-[10px] text-[#55697d] block mt-1">
                                                        الحد الأقصى للحجم 5 ميجابايت — يفضل خلفية شفافة
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 2. إعدادات قاعدة البيانات المركزية (MySQL) */}
                                {activeTab === 'database' && role === 'master' && (
                                    <div className="p-6 rounded-lg bg-[#111721] border border-[#212f42] shadow-sm animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1f2d3f]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-[#162232] border border-[#273a52] flex items-center justify-center text-[#1a9fff]">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-white">قاعدة البيانات المركزية (MySQL)</h3>
                                                    <p className="text-xs font-bold text-[#718497]">
                                                        اتصال قاعدة البيانات المعتمدة لحفظ المعاملات، المنتجات، والفواتير.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={testDbConnection}
                                                disabled={dbTesting}
                                                className="px-4 h-9 rounded bg-[#152334] hover:bg-[#1a9fff] text-[#55a7ff] hover:text-white border border-[#253e5e] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                {dbTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                                                <span>فحص الاتصال</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">اسم المضيف (Host)</label>
                                                <input
                                                    type="text"
                                                    value={dbHost}
                                                    onChange={(e) => setDbHost(e.target.value)}
                                                    className="w-full h-10 px-3 rounded bg-[#090d13] border border-[#233348] text-white font-mono text-sm focus:outline-none focus:border-[#1a9fff]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">المنفذ (Port)</label>
                                                <input
                                                    type="text"
                                                    value={dbPort}
                                                    onChange={(e) => setDbPort(e.target.value)}
                                                    className="w-full h-10 px-3 rounded bg-[#090d13] border border-[#233348] text-white font-mono text-sm focus:outline-none focus:border-[#1a9fff]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">اسم قاعدة البيانات (Database)</label>
                                                <input
                                                    type="text"
                                                    value={dbDatabase}
                                                    onChange={(e) => setDbDatabase(e.target.value)}
                                                    className="w-full h-10 px-3 rounded bg-[#090d13] border border-[#233348] text-white font-mono text-sm focus:outline-none focus:border-[#1a9fff]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">اسم المستخدم (User)</label>
                                                <input
                                                    type="text"
                                                    value={dbUsername}
                                                    onChange={(e) => setDbUsername(e.target.value)}
                                                    className="w-full h-10 px-3 rounded bg-[#090d13] border border-[#233348] text-white font-mono text-sm focus:outline-none focus:border-[#1a9fff]"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">كلمة المرور (Password)</label>
                                                <input
                                                    type="password"
                                                    value={dbPassword}
                                                    onChange={(e) => setDbPassword(e.target.value)}
                                                    placeholder="اتركها فارغة إذا لم تكن محددة في root"
                                                    className="w-full h-10 px-3 rounded bg-[#090d13] border border-[#233348] text-white font-mono text-sm focus:outline-none focus:border-[#1a9fff]"
                                                />
                                            </div>
                                        </div>

                                        {/* نتيجة فحص الاتصال */}
                                        {dbTestResult && (
                                            <div className={`p-3 rounded text-xs font-bold flex items-center gap-2 ${
                                                dbTestResult.success 
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                            }`}>
                                                {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                <span>{dbTestResult.message}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. ربط الجهاز الفرعي بالسيرفر الرئيسي (Client Mode) */}
                                {role === 'client' && (
                                    <div className="p-6 rounded-lg bg-[#111721] border border-[#212f42] shadow-sm animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1f2d3f]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-[#162232] border border-[#273a52] flex items-center justify-center text-purple-400">
                                                    <Wifi className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-white">ربط محطة الكاشير بالسيرفر الرئيسي</h3>
                                                    <p className="text-xs font-bold text-[#718497]">
                                                        أدخل عنوان الـ IP الخاص بالسيرفر الرئيسي على نفس شبكة المودم أو الـ Wi-Fi.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={testHostConnection}
                                                disabled={hostTesting}
                                                className="px-4 h-9 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                {hostTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                                                <span>فحص الاتصال</span>
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-[#8fa2b6] mb-1.5">
                                                عنوان السيرفر الرئيسي (Master Server IP)
                                            </label>
                                            <input
                                                type="text"
                                                value={serverHost}
                                                onChange={(e) => setServerHost(e.target.value)}
                                                placeholder="مثال: 192.168.1.100 أو tajori.store"
                                                className="w-full h-11 px-3.5 rounded bg-[#090d13] border border-[#233348] text-purple-400 font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        {hostTestResult && (
                                            <div className={`p-3 rounded text-xs font-bold flex items-center gap-2 ${
                                                hostTestResult.success 
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                            }`}>
                                                {hostTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                <span>{hostTestResult.message}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 4. النطاق والأمان وشهادات SSL */}
                                {activeTab === 'network' && (
                                    <div className="p-6 rounded-lg bg-[#111721] border border-[#212f42] shadow-sm animate-in fade-in duration-150">
                                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1f2d3f]">
                                            <div className="w-10 h-10 rounded bg-[#162232] border border-[#273a52] flex items-center justify-center text-[#1a9fff]">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white">إعدادات النطاق المحلي وشهادة الأمان SSL</h3>
                                                <p className="text-xs font-bold text-[#718497]">
                                                    تشغيل النظام تحت بروتوكول HTTPS المشفر الصامت وفق معايير Steps Version 2.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-xs font-bold text-[#9fb3c8]">
                                            <div className="p-3.5 rounded bg-[#090e15] border border-[#1f2e41] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Lock className="w-4 h-4 text-emerald-400" />
                                                    <span>محرك شهادات الأمان (mkcert Engine)</span>
                                                </div>
                                                <span className="text-emerald-400 font-mono font-bold">C:\Apache24\conf\ssl</span>
                                            </div>

                                            <div className="p-3.5 rounded bg-[#090e15] border border-[#1f2e41] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Terminal className="w-4 h-4 text-[#1a9fff]" />
                                                    <span>ملف أسماء النطاقات المحلية (Windows Hosts)</span>
                                                </div>
                                                <span className="text-[#6cb5ff] font-mono font-bold">C:\Windows\System32\drivers\etc\hosts</span>
                                            </div>

                                            <div className="p-3.5 rounded bg-[#090e15] border border-[#1f2e41] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <HardDrive className="w-4 h-4 text-amber-400" />
                                                    <span>إعادة التوجيه التلقائي (VirtualHosts)</span>
                                                </div>
                                                <span className="text-amber-300 font-mono font-bold">Port 80 (HTTP) &rarr; Port 443 (HTTPS)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* 🎮 Steam Bottom Action Bar (Install / Provision Button) */}
                            <div className="mt-8 pt-5 border-t border-[#1e2a3a] flex items-center justify-between max-w-4xl w-full mx-auto">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#718296]">
                                    <span className="w-2 h-2 rounded-full bg-[#1a9fff] animate-ping" />
                                    <span>جاهز لحفظ الإعدادات وبناء قاعدة البيانات</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleStartInstall}
                                    className="px-8 h-13 rounded bg-gradient-to-r from-[#21a457] to-[#168142] hover:from-[#27be65] hover:to-[#1b9a4e] text-white font-black text-sm transition-all shadow-[0_4px_16px_rgba(33,164,87,0.4)] flex items-center gap-2.5 cursor-pointer active:scale-[0.99] border-t border-emerald-400/30"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>تثبيت وتهيئة المنظومة بالكامل (Deploy & Run)</span>
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 3: شاشة جاري التثبيت (Steam Game Installing Style)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'installing' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full animate-in fade-in zoom-in-98 duration-200">
                        <div className="w-20 h-20 rounded-xl bg-[#121a24] border border-[#25364c] flex items-center justify-center text-[#1a9fff] mb-6 shadow-2xl shadow-[#1a9fff]/20 relative">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <div className="absolute inset-0 rounded-xl bg-[#1a9fff]/10 animate-pulse" />
                        </div>

                        <span className="text-[10px] font-mono font-black text-[#1a9fff] uppercase tracking-widest bg-[#1a9fff]/10 px-3 py-1 rounded border border-[#1a9fff]/20 mb-3">
                            INSTALLING TAQNIYA CLOUD WORKSTATION
                        </span>

                        <h2 className="text-2xl font-black text-white mb-2">جاري تهيئة منظومة السحابة...</h2>
                        <p className="text-xs sm:text-sm font-bold text-[#8fa1b5] text-center mb-6 leading-relaxed">
                            {installProgressText}
                        </p>

                        {/* شريط التحميل بنمط Steam المضيء */}
                        <div className="w-full h-3 rounded-full bg-[#0c1219] border border-[#213042] overflow-hidden p-0.5 mb-6">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#1a9fff] via-cyan-400 to-[#1a9fff] animate-pulse w-full" />
                        </div>

                        {/* صندوق المحطة الطرفية (Installer Terminal Box) */}
                        <div className="w-full p-4 rounded bg-[#070b0f] border border-[#1c2735] text-[11px] font-mono text-[#6c8299] space-y-1.5 shadow-inner text-right">
                            <div className="text-emerald-400 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                <span>[OK] Apache 2.4 & PHP 8.4 runtime active</span>
                            </div>
                            <div className="text-emerald-400 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                <span>[OK] mkcert Root CA validated in system store</span>
                            </div>
                            <div className="text-[#64b0ff] flex items-center gap-1.5 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>[PROCESSING] Executing MySQL Migrations & Desktop Shortcuts...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 4: شاشة اكتمال التثبيت (Steam Ready to Launch Hero)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'completed' && (
                    <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-in fade-in zoom-in-98 duration-200">
                        
                        {/* شعار النجاح المكتبي */}
                        <div className="w-18 h-18 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-5 shadow-2xl shadow-emerald-500/20">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <span className="text-[11px] font-mono font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/25 mb-2">
                            SETUP COMPLETED & VERIFIED
                        </span>

                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 text-center">
                            تم التثبيت والتهيئة بنجاح!
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-[#8698ab] text-center max-w-md mb-6 leading-relaxed">
                            تم إعداد وتشغيل المنظومة بنجاح لمتجر «{storeName}». النظام جاهز الآن للتشغيل المباشر والعمليات اليومية.
                        </p>

                        {/* بطاقة المواصفات والشبكة */}
                        <div className="w-full p-4 rounded-lg bg-[#0e141d] border border-[#213042] space-y-2.5 text-xs font-mono mb-6 shadow-inner">
                            <div className="flex items-center justify-between">
                                <span className="text-[#6c8096]">STORE NAME</span>
                                <span className="text-white font-bold">{storeName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#6c8096]">HTTPS DOMAIN</span>
                                <a 
                                    href={`https://${domain}/invoices/create`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[#1a9fff] hover:underline font-bold flex items-center gap-1"
                                >
                                    <span>https://{domain}</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#6c8096]">SERVER IP</span>
                                <span className="text-emerald-400 font-bold">{initialConfig.server_ip}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#6c8096]">SSL SECURITY</span>
                                <span className="text-emerald-400 font-bold">Trusted (mkcert Active)</span>
                            </div>
                        </div>

                        {/* 🎮 BIG STEAM PLAY BUTTON & ACTIONS */}
                        <div className="w-full space-y-3">
                            <button
                                type="button"
                                onClick={handleOpenPosApp}
                                className="w-full h-14 rounded-lg bg-gradient-to-r from-[#21a457] to-[#168142] hover:from-[#27be65] hover:to-[#1b9a4e] text-white font-black text-base transition-all shadow-[0_4px_20px_rgba(33,164,87,0.45)] flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] border-t border-emerald-400/30"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                <span>تشغيل منظومة المبيعات والكاشير الآن (PLAY POS)</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleCreateShortcut}
                                disabled={creatingShortcut}
                                className="w-full h-11 rounded bg-[#131b26] hover:bg-[#1b2635] text-[#93a7bc] hover:text-white border border-[#233346] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {creatingShortcut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4 text-[#1a9fff]" />}
                                <span>توليد / تجديد اختصار المبيعات على سطح المكتب (HTTPS)</span>
                            </button>

                            {shortcutStatus && (
                                <div className="p-3 rounded bg-[#1a9fff]/10 border border-[#1a9fff]/20 text-xs font-bold text-[#6cb5ff] text-center animate-in fade-in duration-150">
                                    {shortcutStatus}
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </main>

            {/* 🕹️ Steam Desktop Client Status Dock (Footer) */}
            <footer className="h-8 px-5 bg-[#0b0f15] border-t border-[#1b2533] flex items-center justify-between text-[11px] font-bold text-[#55697d] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[#8ba0b5]">خادم السحابة: متصل وجاهز للعمل</span>
                    </div>
                    <span className="text-[#2b3a4c]">|</span>
                    <span className="font-mono">BUILD 2026.11.01</span>
                </div>
                <div>
                    <span>جميع الحقوق محفوظة © {new Date().getFullYear()} — {companyInfo.name}</span>
                </div>
            </footer>
        </div>
    );
}
