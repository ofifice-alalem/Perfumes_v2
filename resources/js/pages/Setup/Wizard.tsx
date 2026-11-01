import React, { useState, useRef, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { 
    Server, Monitor, Database, Globe, CheckCircle2, 
    AlertCircle, Loader2, Upload, Wifi, ArrowRight, 
    ArrowLeft, Store, Sparkles, X, ShieldCheck,
    Sun, Moon, RefreshCw, Cpu, Layers, Play,
    Check, Terminal, HardDrive, Key, Lock, ExternalLink,
    Sliders, Radio, Activity, Copy, AlertTriangle, ChevronLeft, ChevronRight,
    Share2, Laptop
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
    // البدء دائماً على دور النظام كصفحة أولى
    const [step, setStep] = useState<Step>('role');
    const [role, setRole] = useState<DeviceRole>('master');
    const [activeTab, setActiveTab] = useState<ConfigTab>('store');

    // ثيم النظام المكتبي (Dark / Light)
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        const useDark = saved ? saved === 'dark' : true;
        setIsDark(useDark);
        applyTheme(useDark);

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
        if (dark) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('body-bg-dark');
            document.body.classList.remove('body-bg-light');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.add('body-bg-light');
            document.body.classList.remove('body-bg-dark');
        }
    }

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        applyTheme(next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    // مصفوفة الألوان والأزرار الموحدة بنمط Steam Desktop Client (حواف مستقيمة rounded-[3px] وهندسة صناعية صلبة)
    const t = isDark ? {
        appBg: 'bg-[#0a0e14]',
        headerBg: 'bg-[#171d25]',
        headerBorder: 'border-[#2a3848]',
        tabActive: 'text-white border-b-2 border-[#1a9fff] font-black',
        tabInactive: 'text-[#8f9ca8] hover:text-white hover:bg-white/5 border-b-2 border-transparent font-bold',
        cardBg: 'bg-[#111721]',
        cardBorder: 'border-[#212f42]',
        sidebarBg: 'bg-[#0e141c]',
        sidebarBorder: 'border-[#1f2b3b]',
        inputBg: 'bg-[#090d13]',
        inputBorder: 'border-[#233348]',
        textPrimary: 'text-white',
        textSecondary: 'text-[#8ba0b5]',
        textMuted: 'text-[#56718d]',
        footerBg: 'bg-[#0b0f15]',
        footerBorder: 'border-[#1b2533]',
        heroBanner: 'bg-gradient-to-r from-[#121d2b] via-[#0f1722] to-[#0a0f16]',
        rackBg: 'bg-[#0d131c]',
        rackBorder: 'border-[#1f2c3d]',
        rackHeaderBorder: 'border-[#1f2d3f]',
        telemetryScreen: 'bg-[#060a0f] border-[#182332] text-white',
        telemetryLabel: 'opacity-60',
        telemetryValue: 'text-white font-bold',
        rackFooter: 'border-[#1f2d3f] bg-black/20 text-[#8ba0b5]',
        boxBg: 'bg-[#0d131b]',
        boxBorder: 'border-[#213042]',
        activeTab: 'bg-[#182332] text-[#1a9fff] border-r-4 border-[#1a9fff]',
        inactiveTab: 'text-[#8293a4] hover:bg-[#131b26] hover:text-white',

        // 🎮 أزرار Steam الموحدة بنظام الحواف المستقيمة rounded-[3px]
        btnPrimary: 'bg-gradient-to-b from-[#75b022] to-[#588a1b] hover:from-[#8ed428] hover:to-[#68a420] text-white border-t border-[#b8e84b]/60 shadow-[0_2px_4px_rgba(0,0,0,0.5)] rounded-[3px] font-black',
        btnSecondary: 'bg-[#212b37] hover:bg-[#2c3949] text-[#c6d4df] hover:text-white border border-[#3d4f65] rounded-[3px] font-bold shadow-sm',
        btnActionBlue: 'bg-[#1a9fff] hover:bg-[#0088eb] text-white rounded-[3px] font-black border-t border-sky-300/40 shadow-sm',
        btnDisabled: 'bg-[#1a232e] text-[#4f6174] border border-[#253547] rounded-[3px] font-bold cursor-not-allowed shadow-none',
    } : {
        appBg: 'bg-[#edf2f7]',
        headerBg: 'bg-white',
        headerBorder: 'border-slate-300',
        tabActive: 'text-sky-700 border-b-2 border-sky-600 font-black',
        tabInactive: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-b-2 border-transparent font-bold',
        cardBg: 'bg-white',
        cardBorder: 'border-slate-300',
        sidebarBg: 'bg-[#f8fafc]',
        sidebarBorder: 'border-[#e2e8f0]',
        inputBg: 'bg-[#f8fafc]',
        inputBorder: 'border-[#cbd5e1]',
        textPrimary: 'text-[#0f172a]',
        textSecondary: 'text-[#475569]',
        textMuted: 'text-[#64748b]',
        footerBg: 'bg-[#f1f5f9]',
        footerBorder: 'border-[#cbd5e1]',
        heroBanner: 'bg-gradient-to-r from-slate-100 via-white to-slate-100',
        rackBg: 'bg-white',
        rackBorder: 'border-slate-300',
        rackHeaderBorder: 'border-slate-200',
        telemetryScreen: 'bg-slate-50 border-slate-200 text-slate-800',
        telemetryLabel: 'text-slate-500',
        telemetryValue: 'text-slate-900 font-bold',
        rackFooter: 'border-slate-200 bg-slate-50 text-slate-600',
        boxBg: 'bg-[#f1f5f9]',
        boxBorder: 'border-[#cbd5e1]',
        activeTab: 'bg-[#e0f2fe] text-[#0284c7] border-r-4 border-[#0284c7]',
        inactiveTab: 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]',

        // 🎮 أزرار Steam الموحدة في الوضع الفاتح
        btnPrimary: 'bg-gradient-to-b from-[#388e3c] to-[#2e7d32] hover:from-[#43a047] hover:to-[#388e3c] text-white border-t border-emerald-300/60 shadow-[0_2px_4px_rgba(0,0,0,0.15)] rounded-[3px] font-black',
        btnSecondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-[3px] font-bold shadow-sm',
        btnActionBlue: 'bg-sky-600 hover:bg-sky-700 text-white rounded-[3px] font-black border-t border-sky-400/40 shadow-sm',
        btnDisabled: 'bg-slate-200 text-slate-400 border border-slate-300 rounded-[3px] font-bold cursor-not-allowed shadow-none',
    };

    // قيم المتجر والنطاق وقاعدة البيانات محايدة تماماً وفارغة للمستخدم
    const [storeName, setStoreName] = useState(initialConfig.store_name || '');
    const [domain, setDomain] = useState(initialConfig.domain || '');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // بيانات MySQL (المضيف والمنفذ والمستخدم قيم قياسية ثابتة، وقاعدة البيانات فارغة ومحايدة)
    const [dbHost, setDbHost] = useState(initialConfig.db_host || '127.0.0.1');
    const [dbPort, setDbPort] = useState(String(initialConfig.db_port || 3306));
    const [dbDatabase, setDbDatabase] = useState(initialConfig.db_database || '');
    const [dbUsername, setDbUsername] = useState(initialConfig.db_username || 'root');
    const [dbPassword, setDbPassword] = useState('');

    // بيانات الجهاز الفرعي (Client)
    const [serverHost, setServerHost] = useState(initialConfig.server_ip || '');

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
    const [copiedLanLink, setCopiedLanLink] = useState(false);

    // التحقق الصارم من اكتمال الحقول (Strict Form Validation)
    const isStoreFilled = storeName.trim().length > 0 && domain.trim().length > 0;
    const isDbFilled = role === 'master' 
        ? (dbHost.trim().length > 0 && dbPort.trim().length > 0 && dbDatabase.trim().length > 0 && dbUsername.trim().length > 0)
        : (serverHost.trim().length > 0);
    const isDomainFilled = domain.trim().length > 0;

    const isFormValid = role === 'master'
        ? (isStoreFilled && isDbFilled && isDomainFilled)
        : (storeName.trim().length > 0 && serverHost.trim().length > 0);

    // قائمة الحقول الناقصة لإرشاد المستخدم
    const missingFields: string[] = [];
    if (!storeName.trim()) missingFields.push('اسم المتجر');
    if (!domain.trim()) missingFields.push('النطاق المحلي');
    if (role === 'master') {
        if (!dbHost.trim()) missingFields.push('مضيف قاعدة البيانات (Host)');
        if (!dbDatabase.trim()) missingFields.push('اسم قاعدة البيانات');
        if (!dbUsername.trim()) missingFields.push('مستخدم قاعدة البيانات (User)');
    } else {
        if (!serverHost.trim()) missingFields.push('عنوان السيرفر الرئيسي');
    }

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
            const targetUrl = domain ? `https://${domain}/invoices/create` : '/invoices/create';
            window.open(targetUrl, '_blank');
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
                body: JSON.stringify({ domain: domain || 'tajori.store' }),
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

    // نسخ رابط الـ LAN
    function handleCopyLan() {
        if (navigator.clipboard && initialConfig.server_ip) {
            navigator.clipboard.writeText(`https://${initialConfig.server_ip}`);
            setCopiedLanLink(true);
            setTimeout(() => setCopiedLanLink(false), 2000);
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
                message: data.message || (data.success ? 'تم الاتصال بقاعدة البيانات بنجاح' : 'تعذر الاتصال بقاعدة البيانات'),
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
        if (!isFormValid) return;

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
                        domain: domain || 'tajori.store',
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
            setInstallError(err.message || 'حدث خطأ أثناء التثبيت');
            setStep('config');
        } finally {
            setInstalling(false);
        }
    }

    return (
        <div 
            className={`h-screen w-screen flex flex-col overflow-hidden font-['Tajawal'] select-none transition-colors duration-200 ${t.appBg} ${t.textPrimary}`} 
            dir="rtl"
            style={{ fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
            <Head title="أداة إعدادات خادم السحابة — شركة تقنية السحابة" />

            {/* 🎮 Steam Desktop Client Titlebar & Ribbon Header (شريط نافذة مكتبي صلب بحواف قياسية) */}
            <header className={`h-11 px-4 ${t.headerBg} border-b ${t.headerBorder} flex items-center justify-between shrink-0 z-30 shadow-sm transition-colors`}>
                
                {/* الجانب الأيمن: شعار التقنية واسم شركة تقنية السحابة فقط بنمط Desktop Window Anchor */}
                <div className="flex items-center gap-2.5">
                    <img 
                        src="/images/taqniya-logo.png" 
                        alt="شركة تقنية السحابة" 
                        className="h-6 w-auto object-contain filter drop-shadow-[0_1px_4px_rgba(26,159,255,0.35)]"
                    />
                    <span className="text-xs font-black tracking-wider uppercase">
                        شركة تقنية السحابة
                    </span>
                </div>

                {/* المنتصف: ألسنة تنقل سطح المكتب بنمط أشرطة Steam (Underline Ribbon Tabs) */}
                <div className="hidden md:flex items-center h-full gap-2">
                    <button
                        type="button"
                        onClick={() => setStep('role')}
                        className={`h-full px-5 text-xs transition-all cursor-pointer flex items-center ${
                            step === 'role' ? t.tabActive : t.tabInactive
                        }`}
                    >
                        1. دور النظام (Role)
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep('config')}
                        className={`h-full px-5 text-xs transition-all cursor-pointer flex items-center ${
                            step === 'config' ? t.tabActive : t.tabInactive
                        }`}
                    >
                        2. إعدادات الخادم (Config)
                    </button>
                    {isConfigured && (
                        <button
                            type="button"
                            onClick={() => setStep('completed')}
                            className={`h-full px-5 text-xs transition-all cursor-pointer flex items-center ${
                                step === 'completed' ? t.tabActive : t.tabInactive
                            }`}
                        >
                            3. التشغيل السريع (Launcher)
                        </button>
                    )}
                </div>

                {/* الجانب الأيسر: أدوات التحكم المكتبي (Zoom Desktop, Theme, Status) - كلها بارتفاع موحد h-8 وحواف rounded-[3px] */}
                <div className="flex items-center gap-1.5">
                    
                    {/* تحكم زوم سطح المكتب المدمج بنمط Steam */}
                    <ZoomControl variant="desktop" />

                    {/* زر تبديل الوضع المكتبي */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className={`w-8 h-8 rounded-[3px] border flex items-center justify-center transition-all cursor-pointer ${
                            isDark 
                                ? 'bg-[#1e2632] hover:bg-[#283546] text-amber-400 border-[#2b3a4c]' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                        title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                    >
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>

                    {isConfigured && (
                        <button
                            type="button"
                            onClick={handleOpenPosApp}
                            className={`h-8 px-3 rounded-[3px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${t.btnSecondary}`}
                            title="تشغيل شاشة المبيعات والكاشير مباشرة"
                        >
                            <Play className="w-3 h-3 fill-current text-emerald-500" />
                            <span>شاشة المبيعات</span>
                        </button>
                    )}

                    <div className={`hidden lg:flex items-center gap-1.5 h-8 px-2.5 rounded-[3px] border text-[11px] font-mono font-bold ${
                        isDark ? 'bg-[#10161f] border-[#223043] text-[#8fa1b5]' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>127.0.0.1</span>
                    </div>
                </div>
            </header>

            {/* 🖥️ Steam Desktop Client Main Workstation Body */}
            <main className={`flex-1 overflow-y-auto min-h-0 flex flex-col ${t.appBg}`}>

                {/* 🔴 حالة الخطأ إن وجدت */}
                {installError && (
                    <div className="mx-6 mt-4 p-3 rounded-[3px] bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs font-bold text-rose-400 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{installError}</span>
                        </div>
                        <button 
                            onClick={() => setInstallError(null)}
                            className="p-1 hover:bg-rose-500/20 rounded-[2px] cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 1: اختيار نمط الجهاز (Role Selection)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'role' && (
                    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full my-auto flex flex-col pb-16 animate-in fade-in zoom-in-98 duration-200">
                        <div className="mb-8 text-center md:text-right">
                            <span className="text-[11px] font-mono font-black text-[#1a9fff] uppercase tracking-widest bg-[#1a9fff]/10 px-2.5 py-1 rounded-[3px] border border-[#1a9fff]/20">
                                HARDWARE NODE PROVISIONING
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black mt-2">
                                تحديد دور هذا الحاسوب في منظومة السحابة
                            </h2>
                            <p className={`text-xs sm:text-sm font-bold mt-1 ${t.textSecondary}`}>
                                اختر كيفية تهيئة وتشغيل هذه المحطة لتوزيع المهام وقواعد البيانات بكفاءة عبر الشبكة المحلية.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            
                            {/* كرت السيرفر الرئيسي */}
                            <div 
                                onClick={() => setRole('master')}
                                className={`p-6 rounded-[3px] border-2 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                                    role === 'master'
                                        ? isDark 
                                            ? 'bg-[#15202e] border-[#1a9fff] shadow-[0_0_20px_rgba(26,159,255,0.25)] ring-1 ring-[#1a9fff]'
                                            : 'bg-white border-[#1a9fff] shadow-md ring-1 ring-[#1a9fff]'
                                        : isDark 
                                            ? 'bg-[#10161f] border-[#1e2a3a] hover:border-[#2d3e54] hover:bg-[#131b26]'
                                            : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                            >
                                {role === 'master' && (
                                    <div className="absolute top-0 right-0 bg-[#1a9fff] text-white text-[10px] font-black px-3 py-0.5 rounded-bl-[2px] uppercase tracking-wider">
                                        المحدد حالياً
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className={`w-12 h-12 rounded-[3px] flex items-center justify-center text-[#1a9fff] shadow-inner ${isDark ? 'bg-[#0d131b] border border-[#24354b]' : 'bg-sky-50 border border-sky-200'}`}>
                                            <Server className="w-6 h-6" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-[2px] text-xs font-mono font-bold bg-[#1a9fff]/10 text-[#1a9fff] border border-[#1a9fff]/25">
                                            MASTER SERVER NODE
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black mb-1.5">السيرفر الرئيسي المركزي (Master)</h3>
                                    <p className={`text-xs font-bold leading-relaxed mb-4 ${t.textSecondary}`}>
                                        يحتوي على قاعدة بيانات MySQL المركزية، خادم الويب Apache 2.4، ويتحكم بشهادات التشفير SSL وإصدار الفواتير، ويعمل كخادم ومحطة مبيعات في آن واحد.
                                    </p>
                                    <div className="space-y-1.5 text-[11px] font-bold">
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>توليد وتحديث شهادات SSL عبر mkcert تلقائياً</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>إنشاء جداول MySQL ومطعم البيانات (Seeders)</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>مشاركة الفواتير والتقارير عبر شبكة المحل (LAN)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1e2b3b] flex items-center justify-between text-xs font-bold text-[#1a9fff]">
                                    <span>تهيئة الخادم والخدمات الملحقة</span>
                                    <ArrowLeft className="w-4 h-4" />
                                </div>
                            </div>

                            {/* كرت الكاشير الفرعي */}
                            <div 
                                onClick={() => setRole('client')}
                                className={`p-6 rounded-[3px] border-2 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                                    role === 'client'
                                        ? isDark 
                                            ? 'bg-[#1b1c2b] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-500'
                                            : 'bg-white border-purple-500 shadow-md ring-1 ring-purple-500'
                                        : isDark 
                                            ? 'bg-[#10161f] border-[#1e2a3a] hover:border-[#2d3e54] hover:bg-[#131b26]'
                                            : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                            >
                                {role === 'client' && (
                                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-[2px] uppercase tracking-wider">
                                        المحدد حالياً
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className={`w-12 h-12 rounded-[3px] flex items-center justify-center text-purple-500 shadow-inner ${isDark ? 'bg-[#0d131b] border border-[#24354b]' : 'bg-purple-50 border border-purple-200'}`}>
                                            <Monitor className="w-6 h-6" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-[2px] text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/25">
                                            CASHIER TERMINAL NODE
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black mb-1.5">شاشة كاشير فرعية (Terminal)</h3>
                                    <p className={`text-xs font-bold leading-relaxed mb-4 ${t.textSecondary}`}>
                                        محطة بيع سريعة مخصصة للكاشير. لا تتطلب خوادم محلية أو قواعد بيانات، وتتصل مباشرة بالسيرفر الرئيسي عبر الشبكة الداخلية.
                                    </p>
                                    <div className="space-y-1.5 text-[11px] font-bold">
                                        <div className="flex items-center gap-2 text-purple-400">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>بدون أي متطلبات تخزين أو خوادم محلية</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-purple-400">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>إقلاع فوري وتوفير كامل لموارد الجهاز</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-purple-400">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>مزامنة لحظية مع السيرفر الرئيسي</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1e2b3b] flex items-center justify-between text-xs font-bold text-purple-400">
                                    <span>ربط المحطة بالسيرفر</span>
                                    <ArrowLeft className="w-4 h-4" />
                                </div>
                            </div>

                        </div>

                        {/* زر التقدم للخطوة التالية بنمط Steam Action Blue */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={() => setStep('config')}
                                className={`px-8 h-11 text-xs transition-all flex items-center gap-2 cursor-pointer ${t.btnActionBlue}`}
                            >
                                <span>متابعة إعداد النظام</span>
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 2: لوحة الإعدادات الشاملة (Config)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'config' && (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        
                        {/* 🕹️ الشريط الجانبي: أدوات المراقبة والتنقل والـ HUD الحي */}
                        <aside className={`w-full md:w-80 ${t.sidebarBg} border-l ${t.sidebarBorder} p-5 flex flex-col justify-between shrink-0 overflow-y-auto transition-colors`}>
                            <div>
                                <div className="mb-5">
                                    <span className={`text-[10px] font-mono font-black uppercase tracking-wider block mb-1 ${t.textMuted}`}>
                                        SYSTEM WORKBENCH
                                    </span>
                                    <h3 className="text-base font-black">
                                        {role === 'master' ? 'إعدادات الخادم المركزي' : 'إعدادات محطة الكاشير'}
                                    </h3>
                                </div>

                                {/* قائمة الأقسام مع مؤشرات اكتمال حقيقية */}
                                <div className="space-y-1 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('store')}
                                        className={`w-full p-2.5 rounded-[2px] text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'store' ? t.activeTab : t.inactiveTab
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Store className="w-4 h-4" />
                                            <span>هوية المتجر والشعار</span>
                                        </div>
                                        {isStoreFilled ? (
                                            <span className="w-4 h-4 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                                <Check className="w-3 h-3" />
                                            </span>
                                        ) : (
                                            <span className="w-4 h-4 rounded-[2px] bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                                                1
                                            </span>
                                        )}
                                    </button>

                                    {role === 'master' ? (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('database')}
                                            className={`w-full p-2.5 rounded-[2px] text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                                activeTab === 'database' ? t.activeTab : t.inactiveTab
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Database className="w-4 h-4" />
                                                <span>قاعدة البيانات (MySQL)</span>
                                            </div>
                                            {isDbFilled ? (
                                                <span className="w-4 h-4 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                                    <Check className="w-3 h-3" />
                                                </span>
                                            ) : (
                                                <span className="w-4 h-4 rounded-[2px] bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                                                    2
                                                </span>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('network')}
                                            className={`w-full p-2.5 rounded-[2px] text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                                activeTab === 'network' ? t.activeTab : t.inactiveTab
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Wifi className="w-4 h-4" />
                                                <span>الاتصال بالسيرفر الرئيسي</span>
                                            </div>
                                            {serverHost.trim() ? (
                                                <span className="w-4 h-4 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                                    <Check className="w-3 h-3" />
                                                </span>
                                            ) : (
                                                <span className="w-4 h-4 rounded-[2px] bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                                                    2
                                                </span>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('network')}
                                        className={`w-full p-2.5 rounded-[2px] text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'network' ? t.activeTab : t.inactiveTab
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            <span>النطاق وشهادة SSL</span>
                                        </div>
                                        {domain.trim() ? (
                                            <span className="w-4 h-4 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                                <Check className="w-3 h-3" />
                                            </span>
                                        ) : (
                                            <span className="w-4 h-4 rounded-[2px] bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                                                3
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* 🎮 بطاقة الـ HUD الحية */}
                                <div className={`p-3 rounded-[3px] border space-y-2 text-[11px] font-mono ${t.boxBg} ${t.boxBorder}`}>
                                    <div className="text-[10px] font-sans font-bold text-[#1a9fff] border-b border-slate-200 dark:border-[#233348] pb-1 uppercase tracking-wider">
                                        ملخص الإعدادات الحية (Live HUD)
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={t.textMuted}>STORE</span>
                                        <span className="font-bold truncate max-w-[130px]" title={storeName || 'غير محدد'}>
                                            {storeName || '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={t.textMuted}>DOMAIN</span>
                                        <span className="text-[#1a9fff] font-bold truncate max-w-[130px]" title={domain || 'غير محدد'}>
                                            {domain || '—'}
                                        </span>
                                    </div>

                                    {role === 'master' && (
                                        <div className="flex items-center justify-between">
                                            <span className={t.textMuted}>DATABASE</span>
                                            <span className="font-bold truncate max-w-[130px] text-amber-500" title={dbDatabase || 'غير محدد'}>
                                                {dbDatabase || '—'}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className={t.textMuted}>SERVER IP</span>
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <span>{initialConfig.server_ip}</span>
                                            <button 
                                                type="button"
                                                onClick={handleCopyIp}
                                                className="p-1 hover:bg-[#1a9fff]/20 rounded-[2px] cursor-pointer text-[#1a9fff]"
                                                title="نسخ عنوان IP"
                                            >
                                                {copiedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={t.textMuted}>APACHE</span>
                                        <span className="text-emerald-500 font-bold">PORT 80 / 443</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={t.textMuted}>SECURITY</span>
                                        <span className="text-cyan-500 font-bold">mkcert Multi-SAN</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={t.textMuted}>MODE</span>
                                        <span className="font-bold uppercase text-[#1a9fff]">{role}</span>
                                    </div>
                                </div>
                            </div>

                            {/* زر الرجوع لاختيار الدور بنمط Steam Secondary */}
                            <button
                                type="button"
                                onClick={() => setStep('role')}
                                className={`w-full h-9 rounded-[3px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4 ${t.btnSecondary}`}
                            >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>تغيير دور الجهاز</span>
                            </button>
                        </aside>

                        {/* 🛠️ مساحة العمل الرئيسية */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
                            
                            <div className="max-w-4xl w-full mx-auto space-y-6">

                                {/* 1. بيانات المتجر والشعار */}
                                {activeTab === 'store' && (
                                    <div className={`p-6 rounded-[3px] border shadow-sm animate-in fade-in duration-150 ${t.cardBg} ${t.cardBorder}`}>
                                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-[#1f2d3f]">
                                            <div className="w-10 h-10 rounded-[3px] bg-[#162232] border border-[#273a52] flex items-center justify-center text-[#1a9fff]">
                                                <Store className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black">بيانات المتجر والنشاط التجاري</h3>
                                                <p className={`text-xs font-bold ${t.textSecondary}`}>
                                                    هذه البيانات ستظهر على فواتير المبيعات، الإيصالات الحرارية، وشاشات الكاشير.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                            <div>
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    اسم المتجر / النشاط التجاري <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={storeName}
                                                    onChange={(e) => setStoreName(e.target.value)}
                                                    placeholder="مثال: متجر السحابة للعطور"
                                                    className={`w-full h-10 px-3 rounded-[3px] border font-bold text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                            </div>

                                            <div>
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    النطاق المحلي المخصص (Local Domain) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={domain}
                                                    onChange={(e) => setDomain(e.target.value)}
                                                    placeholder="مثال: cloud-pos.local أو tajori.store"
                                                    className={`w-full h-10 px-3 rounded-[3px] border text-[#1a9fff] font-mono font-bold text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                                <span className={`text-[10px] mt-1 block ${t.textMuted}`}>
                                                    سيتم ربطه محلياً مع شهادة SSL وتوجيهه إلى 127.0.0.1 تلقائياً
                                                </span>
                                            </div>
                                        </div>

                                        {/* رفع الشعار */}
                                        <div className="mb-6">
                                            <label className={`block text-xs font-bold mb-2 ${t.textSecondary}`}>
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
                                                <div className={`flex items-center gap-4 p-3 rounded-[3px] border ${t.boxBg} ${t.boxBorder}`}>
                                                    <img 
                                                        src={logoPreview} 
                                                        alt="Logo Preview" 
                                                        className="w-14 h-14 object-contain rounded-[2px] bg-white/5 p-1 border border-white/10"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-xs font-bold block">تم تحديد الشعار بنجاح</span>
                                                        <span className={`text-[11px] ${t.textMuted}`}>سيتم طباعته على الإيصالات وعرضه في شاشة الدخول</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={removeLogo}
                                                        className="px-3 py-1.5 rounded-[3px] bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        إزالة الشعار
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className={`border-2 border-dashed p-6 rounded-[3px] text-center cursor-pointer transition-all group ${
                                                        isDark ? 'border-[#27384e] hover:border-[#1a9fff] bg-[#0c1219] hover:bg-[#0f1722]' : 'border-slate-300 hover:border-[#1a9fff] bg-slate-50 hover:bg-sky-50/50'
                                                    }`}
                                                >
                                                    <Upload className="w-7 h-7 text-[#51677f] group-hover:text-[#1a9fff] mx-auto mb-2 transition-colors" />
                                                    <span className={`text-xs font-bold group-hover:text-[#1a9fff] block ${t.textSecondary}`}>
                                                        انقر هنا لاختيار شعار المتجر (PNG / JPG / WEBP)
                                                    </span>
                                                    <span className={`text-[10px] block mt-1 ${t.textMuted}`}>
                                                        الحد الأقصى للحجم 5 ميجابايت — يفضل خلفية شفافة
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-[#1e2a3a]">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(role === 'master' ? 'database' : 'network')}
                                                className={`px-5 h-9 text-xs transition-all flex items-center gap-1.5 cursor-pointer ${t.btnSecondary}`}
                                            >
                                                <span>التالي: {role === 'master' ? 'إعدادات قاعدة البيانات' : 'الاتصال بالسيرفر'}</span>
                                                <ArrowLeft className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 2. إعدادات قاعدة البيانات المركزية (MySQL) */}
                                {activeTab === 'database' && role === 'master' && (
                                    <div className={`p-6 rounded-[3px] border shadow-sm animate-in fade-in duration-150 ${t.cardBg} ${t.cardBorder}`}>
                                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-[#1f2d3f]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-[3px] bg-[#162232] border border-[#273a52] flex items-center justify-center text-[#1a9fff]">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black">قاعدة البيانات المركزية (MySQL)</h3>
                                                    <p className={`text-xs font-bold ${t.textSecondary}`}>
                                                        قم بإدخال بيانات الاتصال بقاعدة البيانات التي تم إنشاؤها عبر MySQL Workbench.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={testDbConnection}
                                                disabled={dbTesting}
                                                className={`px-3.5 h-8 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${t.btnSecondary}`}
                                            >
                                                {dbTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-[#1a9fff]" />}
                                                <span>فحص الاتصال</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    اسم المضيف (Host) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dbHost}
                                                    onChange={(e) => setDbHost(e.target.value)}
                                                    placeholder="127.0.0.1"
                                                    className={`w-full h-10 px-3 rounded-[3px] border font-mono text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                            </div>

                                            <div>
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    المنفذ (Port) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dbPort}
                                                    onChange={(e) => setDbPort(e.target.value)}
                                                    placeholder="3306"
                                                    className={`w-full h-10 px-3 rounded-[3px] border font-mono text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                            </div>

                                            <div>
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    اسم قاعدة البيانات (Database Name) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dbDatabase}
                                                    onChange={(e) => setDbDatabase(e.target.value)}
                                                    placeholder="مثال: store_pos_db"
                                                    className={`w-full h-10 px-3 rounded-[3px] border font-mono text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                                <span className={`text-[10px] mt-1 block ${t.textMuted}`}>
                                                    إذا لم تكن القاعدة موجودة، سيقوم المعالج بإنشائها وتهيئتها تلقائياً
                                                </span>
                                            </div>

                                            <div>
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    اسم المستخدم (User) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dbUsername}
                                                    onChange={(e) => setDbUsername(e.target.value)}
                                                    placeholder="root"
                                                    className={`w-full h-10 px-3 rounded-[3px] border font-mono text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                    كلمة المرور (Password)
                                                </label>
                                                <input
                                                    type="password"
                                                    value={dbPassword}
                                                    onChange={(e) => setDbPassword(e.target.value)}
                                                    placeholder="اتركها فارغة إذا لم تكن محددة لحساب root"
                                                    className={`w-full h-10 px-3 rounded-[3px] border font-mono text-sm focus:outline-none focus:border-[#1a9fff] ${t.inputBg} ${t.inputBorder}`}
                                                />
                                            </div>
                                        </div>

                                        {/* نتيجة فحص الاتصال */}
                                        {dbTestResult && (
                                            <div className={`p-3 rounded-[3px] text-xs font-bold flex items-center gap-2 mb-4 ${
                                                dbTestResult.success 
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' 
                                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                                            }`}>
                                                {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                <span>{dbTestResult.message}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-[#1e2a3a]">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('store')}
                                                className={`px-4 h-9 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${t.btnSecondary}`}
                                            >
                                                <ArrowRight className="w-3.5 h-3.5" />
                                                <span>السابق: هوية المتجر</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('network')}
                                                className={`px-5 h-9 text-xs transition-all flex items-center gap-1.5 cursor-pointer ${t.btnSecondary}`}
                                            >
                                                <span>التالي: النطاق وشهادة SSL</span>
                                                <ArrowLeft className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 3. ربط الجهاز الفرعي بالسيرفر الرئيسي (Client Mode) */}
                                {role === 'client' && (
                                    <div className={`p-6 rounded-[3px] border shadow-sm animate-in fade-in duration-150 ${t.cardBg} ${t.cardBorder}`}>
                                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-[#1f2d3f]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-[3px] bg-[#162232] border border-[#273a52] flex items-center justify-center text-purple-400">
                                                    <Wifi className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black">ربط محطة الكاشير بالسيرفر الرئيسي</h3>
                                                    <p className={`text-xs font-bold ${t.textSecondary}`}>
                                                        أدخل عنوان الـ IP الخاص بالسيرفر الرئيسي على نفس شبكة المودم أو الـ Wi-Fi.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={testHostConnection}
                                                disabled={hostTesting}
                                                className={`px-3.5 h-8 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${t.btnSecondary}`}
                                            >
                                                {hostTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-purple-400" />}
                                                <span>فحص الاتصال</span>
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <label className={`block text-xs font-bold mb-1.5 ${t.textSecondary}`}>
                                                عنوان السيرفر الرئيسي (Master Server IP) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={serverHost}
                                                onChange={(e) => setServerHost(e.target.value)}
                                                placeholder="مثال: 192.168.1.100 أو tajori.store"
                                                className={`w-full h-10 px-3 rounded-[3px] border text-purple-400 font-mono font-bold text-sm focus:outline-none focus:border-purple-500 ${t.inputBg} ${t.inputBorder}`}
                                            />
                                        </div>

                                        {hostTestResult && (
                                            <div className={`p-3 rounded-[3px] text-xs font-bold flex items-center gap-2 mb-4 ${
                                                hostTestResult.success 
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' 
                                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                                            }`}>
                                                {hostTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                <span>{hostTestResult.message}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 4. النطاق والأمان وشهادات SSL */}
                                {activeTab === 'network' && (
                                    <div className={`p-6 rounded-[3px] border shadow-sm animate-in fade-in duration-150 ${t.cardBg} ${t.cardBorder}`}>
                                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-[#1f2d3f]">
                                            <div className="w-10 h-10 rounded-[3px] bg-[#162232] border border-[#273a52] flex items-center justify-center text-[#1a9fff]">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black">إعدادات النطاق المحلي وشهادة الأمان SSL</h3>
                                                <p className={`text-xs font-bold ${t.textSecondary}`}>
                                                    تشغيل النظام تحت بروتوكول HTTPS المشفر الصامت وفق معايير Steps Version 2.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-xs font-bold mb-6">
                                            <div className={`p-3 rounded-[3px] border flex items-center justify-between ${t.boxBg} ${t.boxBorder}`}>
                                                <div className="flex items-center gap-2">
                                                    <Lock className="w-4 h-4 text-emerald-500" />
                                                    <span>محرك شهادات الأمان (mkcert Engine)</span>
                                                </div>
                                                <span className="text-emerald-500 font-mono font-bold">C:\Apache24\conf\ssl</span>
                                            </div>

                                            <div className={`p-3 rounded-[3px] border flex items-center justify-between ${t.boxBg} ${t.boxBorder}`}>
                                                <div className="flex items-center gap-2">
                                                    <Terminal className="w-4 h-4 text-[#1a9fff]" />
                                                    <span>ملف أسماء النطاقات المحلية (Windows Hosts)</span>
                                                </div>
                                                <span className="text-[#1a9fff] font-mono font-bold">C:\Windows\System32\drivers\etc\hosts</span>
                                            </div>

                                            <div className={`p-3 rounded-[3px] border flex items-center justify-between ${t.boxBg} ${t.boxBorder}`}>
                                                <div className="flex items-center gap-2">
                                                    <HardDrive className="w-4 h-4 text-amber-500" />
                                                    <span>إعادة التوجيه التلقائي (VirtualHosts)</span>
                                                </div>
                                                <span className="text-amber-500 font-mono font-bold">Port 80 (HTTP) &rarr; Port 443 (HTTPS)</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-start pt-3 border-t border-slate-200 dark:border-[#1e2a3a]">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(role === 'master' ? 'database' : 'store')}
                                                className={`px-4 h-9 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${t.btnSecondary}`}
                                            >
                                                <ArrowRight className="w-3.5 h-3.5" />
                                                <span>السابق: {role === 'master' ? 'قاعدة البيانات' : 'بيانات المتجر'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* 🎮 شريط الإجراء السفلي وزر التثبيت والتهيئة الموحد بنمط Steam Desktop Action */}
                            <div className={`mt-8 pt-4 border-t ${t.footerBorder} flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl w-full mx-auto`}>
                                
                                {/* حالة الجاهزية أو رسالة النواقص */}
                                {isFormValid ? (
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        <span>جميع الحقول المطلوبة مكتملة — جاهز للتثبيت والتهيئة</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>يرجى ملء الحقول المطلوبة: ({missingFields.join('، ')})</span>
                                    </div>
                                )}

                                {/* زر التثبيت بتصميم Steam Action الموحد (rounded-[3px] وارتفاع h-11) */}
                                <button
                                    type="button"
                                    onClick={handleStartInstall}
                                    disabled={!isFormValid || installing}
                                    className={`px-8 h-11 text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                                        isFormValid && !installing ? t.btnPrimary : t.btnDisabled
                                    }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>تثبيت وتهيئة المنظومة بالكامل</span>
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المرحلة 3: شاشة جاري التثبيت
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'installing' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full my-auto animate-in fade-in zoom-in-98 duration-200">
                        <div className="w-16 h-16 rounded-[3px] bg-[#121a24] border border-[#25364c] flex items-center justify-center text-[#1a9fff] mb-5 shadow-xl relative">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <div className="absolute inset-0 bg-[#1a9fff]/10 animate-pulse" />
                        </div>

                        <span className="text-[10px] font-mono font-black text-[#1a9fff] uppercase tracking-widest bg-[#1a9fff]/10 px-2.5 py-1 rounded-[2px] border border-[#1a9fff]/20 mb-3">
                            INSTALLING TAQNIYA CLOUD WORKSTATION
                        </span>

                        <h2 className="text-xl font-black mb-1.5">جاري تهيئة منظومة السحابة...</h2>
                        <p className={`text-xs sm:text-sm font-bold text-center mb-5 leading-relaxed ${t.textSecondary}`}>
                            {installProgressText}
                        </p>

                        <div className="w-full h-2.5 rounded-[2px] bg-slate-200 dark:bg-[#0c1219] border border-slate-300 dark:border-[#213042] overflow-hidden p-0.5 mb-5">
                            <div className="h-full rounded-[1px] bg-gradient-to-r from-[#1a9fff] via-cyan-400 to-[#1a9fff] animate-pulse w-full" />
                        </div>

                        <div className="w-full p-3.5 rounded-[3px] bg-[#070b0f] border border-[#1c2735] text-[11px] font-mono text-[#6c8299] space-y-1.5 shadow-inner text-right">
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
                    المرحلة 4: شاشة التشغيل السريع المكتبي (Steam Library Desktop Console)
                   ══════════════════════════════════════════════════════════════ */}
                {step === 'completed' && (
                    <div className="flex-1 p-6 md:p-8 flex flex-col max-w-5xl mx-auto w-full overflow-y-auto animate-in fade-in zoom-in-98 duration-200">
                        
                        {/* 🎮 Steam Library Hero Banner */}
                        <div className={`p-6 rounded-[3px] border relative overflow-hidden mb-5 shadow-sm transition-all ${t.heroBanner} ${t.cardBorder}`}>
                            
                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-5">
                                
                                {/* هوية المنظومة وشعار المتجر */}
                                <div className="flex items-center gap-4 w-full lg:w-auto">
                                    <div className="w-16 h-16 rounded-[3px] bg-white/10 dark:bg-black/30 border border-[#1a9fff]/40 flex items-center justify-center p-2 shadow-inner shrink-0">
                                        <img 
                                            src={logoPreview || '/images/taqniya-logo.png'} 
                                            alt={storeName} 
                                            className="w-full h-full object-contain filter drop-shadow-md"
                                        />
                                    </div>
                                    <div className="text-right flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>ONLINE & READY</span>
                                            </span>
                                            <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-sky-500/15 text-sky-500 border border-sky-500/30">
                                                SSL TRUSTED
                                            </span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                                            {storeName || 'منظومة السحابة المتكاملة'}
                                        </h2>
                                        <p className={`text-xs font-bold mt-0.5 ${t.textSecondary}`}>
                                            محطة المبيعات والكاشير جاهزة للعمل والتشغيل المباشر تحت بيئة خادم أصلية.
                                        </p>
                                    </div>
                                </div>

                                {/* 🎮 زر التشغيل المكتبي بنمط Steam PLAY Button الأصلي (مستطيل rounded-[3px] بارتفاع h-11 موحد) */}
                                <div className="w-full lg:w-auto shrink-0 flex items-center">
                                    <button
                                        type="button"
                                        onClick={handleOpenPosApp}
                                        className={`w-full sm:w-auto px-8 h-11 text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${t.btnPrimary}`}
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        <span>تشغيل شاشة المبيعات والكاشير</span>
                                    </button>
                                </div>

                            </div>

                            {/* شريط الإجراءات السريعة أسفل البانر */}
                            <div className="relative z-10 mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold">الرابط المحلي المشفر:</span>
                                    <a 
                                        href={`https://${domain}/invoices/create`}
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs font-mono font-bold text-[#1a9fff] hover:underline flex items-center gap-1.5 bg-[#1a9fff]/10 px-2.5 py-1 rounded-[2px] border border-[#1a9fff]/20"
                                    >
                                        <span>https://{domain}</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCreateShortcut}
                                    disabled={creatingShortcut}
                                    className={`px-4 h-8 text-xs transition-all flex items-center gap-2 cursor-pointer ${t.btnSecondary}`}
                                >
                                    {creatingShortcut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Monitor className="w-3.5 h-3.5 text-[#1a9fff]" />}
                                    <span>إنشاء / تجديد اختصار المبيعات على سطح المكتب</span>
                                </button>
                            </div>
                        </div>

                        {shortcutStatus && (
                            <div className="mb-5 p-3 rounded-[3px] bg-[#1a9fff]/10 border border-[#1a9fff]/25 text-xs font-bold text-[#1a9fff] text-center animate-in fade-in duration-150">
                                {shortcutStatus}
                            </div>
                        )}

                        {/* 🕹️ منصة التشخيص والخدمات بنمط كونسول سطح المكتب الموحد */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* كونسول 1: محطة Apache & SSL */}
                            <div className={`rounded-[3px] border shadow-sm overflow-hidden flex flex-col justify-between ${t.rackBg} ${t.rackBorder}`}>
                                <div className={`p-3.5 border-b flex items-center justify-between ${t.rackHeaderBorder}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-[2px] bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
                                            <Server className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black">محرك الويب وشهادات SSL</h4>
                                            <span className="text-[10px] font-mono text-[#55697d] block">APACHE 2.4 RUNTIME</span>
                                        </div>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500">
                                        RUNNING
                                    </span>
                                </div>

                                <div className="p-3 space-y-2">
                                    <div className={`p-2.5 rounded-[2px] border font-mono text-xs space-y-1.5 ${t.telemetryScreen}`}>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>HTTP / HTTPS</span>
                                            <span className="text-emerald-500 font-bold">PORT 80 & 443</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>SECURITY ENGINE</span>
                                            <span className="text-sky-500 font-bold">mkcert Root CA</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>VHOST STATUS</span>
                                            <span className={t.telemetryValue}>ACTIVE & BOUND</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-3.5 py-2.5 border-t flex items-center justify-between text-[11px] font-bold ${t.rackFooter}`}>
                                    <span className={t.textMuted}>إعادة التوجيه المحلي</span>
                                    <span className="text-emerald-500 font-mono">127.0.0.1 (OK)</span>
                                </div>
                            </div>

                            {/* كونسول 2: قاعدة البيانات المركزية MySQL */}
                            <div className={`rounded-[3px] border shadow-sm overflow-hidden flex flex-col justify-between ${t.rackBg} ${t.rackBorder}`}>
                                <div className={`p-3.5 border-b flex items-center justify-between ${t.rackHeaderBorder}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-[2px] bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                                            <Database className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black">قاعدة البيانات المركزية</h4>
                                            <span className="text-[10px] font-mono text-[#55697d] block">MYSQL STORAGE ENGINE</span>
                                        </div>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500">
                                        CONNECTED
                                    </span>
                                </div>

                                <div className="p-3 space-y-2">
                                    <div className={`p-2.5 rounded-[2px] border font-mono text-xs space-y-1.5 ${t.telemetryScreen}`}>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>DATABASE NAME</span>
                                            <span className="text-amber-500 font-bold truncate max-w-[120px]" title={dbDatabase || 'Central DB'}>
                                                {dbDatabase || 'Central DB'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>HOST : PORT</span>
                                            <span className={t.telemetryValue}>{dbHost}:{dbPort}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>SSoT MIGRATIONS</span>
                                            <span className="text-emerald-500 font-bold">SYNCHRONIZED</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-3.5 py-2.5 border-t flex items-center justify-between text-[11px] font-bold ${t.rackFooter}`}>
                                    <span className={t.textMuted}>حساب المستودع</span>
                                    <span className="font-mono text-sky-500">{dbUsername}</span>
                                </div>
                            </div>

                            {/* كونسول 3: شبكة الكاشير الفرعية LAN */}
                            <div className={`rounded-[3px] border shadow-sm overflow-hidden flex flex-col justify-between ${t.rackBg} ${t.rackBorder}`}>
                                <div className={`p-3.5 border-b flex items-center justify-between ${t.rackHeaderBorder}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-[2px] bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
                                            <Wifi className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black">الربط الشبكي المحلي</h4>
                                            <span className="text-[10px] font-mono text-[#55697d] block">LOCAL LAN NETWORK</span>
                                        </div>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-purple-500/15 text-purple-500">
                                        LAN READY
                                    </span>
                                </div>

                                <div className="p-3 space-y-2">
                                    <div className={`p-2.5 rounded-[2px] border font-mono text-xs space-y-1.5 ${t.telemetryScreen}`}>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>SERVER LOCAL IP</span>
                                            <span className="text-purple-500 font-bold">{initialConfig.server_ip}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>LAN CLIENT LINK</span>
                                            <span className="text-sky-500 font-bold">https://{initialConfig.server_ip}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className={t.telemetryLabel}>PORT SHARING</span>
                                            <span className="text-emerald-500 font-bold">OPEN & SECURE</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-3.5 py-2.5 border-t flex items-center justify-between text-[11px] font-bold ${t.rackFooter}`}>
                                    <span className={t.textMuted}>ربط أجهزة الكاشير</span>
                                    <button 
                                        type="button" 
                                        onClick={handleCopyLan} 
                                        className="text-[#1a9fff] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>{copiedLanLink ? 'تم النسخ!' : 'نسخ رابط الكاشير'}</span>
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                        </div>

                    </div>
                )}

            </main>

            {/* 🕹️ Steam Desktop Client Status Dock (Footer) */}
            <footer className={`h-8 px-4 ${t.footerBg} border-t ${t.footerBorder} flex items-center justify-between text-[11px] font-bold ${t.textMuted} shrink-0 transition-colors`}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className={t.textSecondary}>خادم السحابة: متصل وجاهز للعمل</span>
                    </div>
                    <span className="opacity-40">|</span>
                    <span className="font-mono">BUILD 2026.11.01</span>
                </div>
                <div>
                    <span>جميع الحقوق محفوظة © {new Date().getFullYear()} — {companyInfo.name}</span>
                </div>
            </footer>
        </div>
    );
}
