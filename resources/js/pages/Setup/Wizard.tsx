import React, { useState, useRef, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { 
    Server, Monitor, Database, Globe, CheckCircle2, 
    AlertCircle, Loader2, Upload, Wifi, ArrowRight, 
    ArrowLeft, Store, Sparkles, X, ShieldCheck,
    Sun, Moon, RefreshCw, Cpu, Layers
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

export default function SetupWizard({ initialConfig, companyInfo, isConfigured = false }: Props) {
    const [step, setStep] = useState<Step>(isConfigured ? 'config' : 'role');
    const [role, setRole] = useState<DeviceRole>('master');

    // ثيم النظام (Spatial UI Dark / Light Mode)
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
    const [storeName, setStoreName] = useState(initialConfig.store_name || 'طيبة التاجوري');
    const [domain, setDomain] = useState(initialConfig.domain || 'tajori.store');
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
                setInstallProgressText('جاري إعداد بيئة الخادم وتحديث المتغيرات...');
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

                setInstallProgressText('جاري ترحيل الجداول وتجهيز قاعدة البيانات المركزية (Migrations & Seeders)...');

                const res = await fetch('/setup/apply-master', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    body: formData,
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'فشلت عملية التثبيت');
                }

                setInstallProgressText('اكتمل التثبيت والتهيئة بنجاح!');
                setCompletedInfo({ redirectUrl: data.redirect || '/login' });
                setStep('completed');
            } else {
                setInstallProgressText('جاري ربط شاشة الكاشير بالسيرفر الرئيسي...');

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
        <div className="h-[100dvh] w-screen flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-500 font-sans select-none" dir="rtl">
            <Head title="أداة إعدادات خادم السحابة — شركة تقنية السحابة" />

            {/* Desktop Top Titlebar & HUD: شريط مكتبي عريض مستغل للمساحة */}
            <header className="px-6 py-3.5 border-b border-black/10 dark:border-white/10 backdrop-blur-2xl bg-white/60 dark:bg-black/40 z-20 shrink-0">
                <div className="w-full flex items-center justify-between gap-4">
                    
                    {/* الجانب الأيمن: هوية شركة تقنية السحابة ونوع الأداة */}
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-[16px] bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25 shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base md:text-lg font-black tracking-wide text-slate-900 dark:text-white">
                                    {companyInfo.name}
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-primary/10 text-primary border border-primary/20">
                                    لوحة تحكم الخادم والإعدادات
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {companyInfo.product} — الجيل المكتبي المستقل v3.0
                            </p>
                        </div>
                    </div>

                    {/* الجانب الأيسر: أداة التحكم بحجم وزووم الشاشة + الثيم + حالة النسخة */}
                    <div className="flex items-center gap-3">
                        {/* أداة تبعيد وتقريب الشاشة لتناسب شاشات الكاشير الصغيرة */}
                        <ZoomControl />

                        {/* زر تبديل الثيم الفاتح / الداكن */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="spatial-icon-btn cursor-pointer"
                            title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                        >
                            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                        </button>

                        {isConfigured && (
                            <a
                                href="/invoices/create"
                                className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary text-primary hover:text-white border border-primary/30 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title="فتح شاشة المبيعات ونقاط البيع"
                            >
                                <span>شاشة المبيعات</span>
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </a>
                        )}

                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Enterprise Edition</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Desktop Full-Width Workspace: استغلال كامل المساحة العرضية لنظام سطح المكتب */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col justify-center items-center custom-scroll">
                <div className="w-full max-w-[1400px] h-full flex flex-col justify-center">

                    {/* المرحلة 1: تحديد دور الجهاز */}
                    {step === 'role' && (
                        <div className="spatial-card p-8 md:p-12 shadow-2xl animate-in fade-in zoom-in-95 duration-300 my-auto">
                            <div className="text-center max-w-2xl mx-auto mb-10">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20 mb-3">
                                    <Cpu className="w-4 h-4" /> الخطوة 1 من 2: تهيئة دور النظام
                                </span>
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                                    تحديد دور هذا الجهاز في منظومة المبيعات
                                </h2>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    اختر نمط تشغيل هذا الحاسوب. يمكنك تعيينه كخادم رئيسي يحمل قاعدة البيانات المركزية، أو كشاشة كاشير فرعية سريعة متصلة بالشبكة.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                {/* كرت السيرفر الرئيسي */}
                                <div
                                    onClick={() => setRole('master')}
                                    className={`p-8 rounded-[28px] border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                                        role === 'master'
                                            ? 'bg-primary/10 dark:bg-primary/20 border-primary shadow-2xl shadow-primary/25 ring-2 ring-primary/40'
                                            : 'border-black/10 dark:border-white/10 hover:border-primary/40 bg-black/[0.02] dark:bg-white/[0.03]'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center ${
                                                role === 'master' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                                            }`}>
                                                <Server className="w-8 h-8" />
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                                                خادم رئيسي (Server)
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">الجهاز الرئيسي (Master Node)</h3>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                            يحمل قاعدة البيانات المركزية (MySQL SSoT)، خادم الويب، ويدير الربط ومزامنة الفواتير بين جميع فروع وأجهزة المحل والهواتف.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-black text-primary">
                                        <span>يشمل ضبط Apache و MySQL والـ SSL تلقائياً</span>
                                        <ArrowLeft className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* كرت الكاشير الفرعي */}
                                <div
                                    onClick={() => setRole('client')}
                                    className={`p-8 rounded-[28px] border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                                        role === 'client'
                                            ? 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500 shadow-2xl shadow-purple-500/25 ring-2 ring-purple-500/40'
                                            : 'border-black/10 dark:border-white/10 hover:border-purple-500/40 bg-black/[0.02] dark:bg-white/[0.03]'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center ${
                                                role === 'client' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                                            }`}>
                                                <Monitor className="w-8 h-8" />
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                                                نقطة بيع (Cashier)
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">شاشة كاشير فرعية (Terminal Node)</h3>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                            نقطة بيع سريعة تعمل دون الحاجة لأي خوادم محلية، تتصل مباشرة بالسيرفر الرئيسي عبر الشبكة المحلية (LAN / Wi-Fi).
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-black text-purple-600 dark:text-purple-400">
                                        <span>تثبيت وتشغيل فوري في 3 ثوانٍ</span>
                                        <ArrowLeft className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep('config')}
                                className="w-full h-16 rounded-[22px] spatial-button text-lg font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/30 cursor-pointer active:scale-[0.98]"
                            >
                                <span>متابعة إعداد النظام والبيانات</span>
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* المرحلة 2: نموذج الإعدادات المكتبي ذو العمودين (Desktop 2-Column Split Workspace) */}
                    {step === 'config' && (
                        <div className="spatial-card p-6 md:p-8 lg:p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col justify-between my-auto">
                            
                            {/* شريط الإشعار أو الخطأ */}
                            {installError && (
                                <div className="mb-6 p-4 rounded-[18px] bg-red-500/15 border border-red-500/30 flex items-center gap-3 text-red-600 dark:text-red-400 font-bold text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{installError}</span>
                                </div>
                            )}

                            {/* الترويسة الداخلية للنموذج */}
                            <div className="border-b border-black/10 dark:border-white/10 pb-4 mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        {role === 'master' ? <Server className="w-5 h-5" /> : <Monitor className="w-5 h-5 text-purple-600" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                                            {role === 'master' ? 'تهيئة الخادم الرئيسي وإعدادات المنظومة' : 'ربط شاشة الكاشير بالسيرفر الرئيسي'}
                                        </h2>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            {role === 'master' 
                                                ? 'قم بضبط هوية المتجر والاتصال بقاعدة بيانات MySQL المركزية' 
                                                : 'حدد عنوان السيرفر الرئيسي على الشبكة وافحص الاتصال به'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep('role')}
                                    className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-primary transition-all cursor-pointer"
                                >
                                    تغيير نوع الجهاز
                                </button>
                            </div>

                            {/* محتوى الإعدادات: شاشة منقسمة لعمودين متجاورين للاستفادة من عرض سطح المكتب */}
                            {role === 'master' ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    
                                    {/* العمود الأيمن: هوية متجر العميل وشعاره */}
                                    <div className="p-6 rounded-[24px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col justify-between gap-5">
                                        <div>
                                            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5 mb-1">
                                                <Store className="w-5 h-5 text-primary" />
                                                <span>بيانات المتجر والنشاط التجاري (Store Profile)</span>
                                            </h4>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
                                                هذه البيانات هي التي ستظهر على الفواتير، الإيصالات وشاشات الكاشير.
                                            </p>

                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                                                        اسم المتجر / النشاط التجاري
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={storeName}
                                                        onChange={e => setStoreName(e.target.value)}
                                                        placeholder="مثال: طيبة التاجوري"
                                                        className="spatial-input w-full h-13 px-4 rounded-[16px] font-bold text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                                                        النطاق المحلي المخصص (Local Domain)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={domain}
                                                        onChange={e => setDomain(e.target.value)}
                                                        placeholder="tajori.store"
                                                        className="spatial-input w-full h-13 px-4 rounded-[16px] font-bold text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* رفع ومعاينة شعار المتجر */}
                                        <div className="pt-4 border-t border-black/10 dark:border-white/10">
                                            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                                                شعار المتجر (Store Logo)
                                            </label>
                                            <div className="flex items-center gap-4">
                                                {logoPreview ? (
                                                    <div className="relative w-24 h-24 rounded-[20px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 flex items-center justify-center shrink-0 shadow-sm">
                                                        <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain rounded-xl" />
                                                        <button
                                                            type="button"
                                                            onClick={removeLogo}
                                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md cursor-pointer hover:scale-105 transition-all"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="h-24 flex-1 rounded-[20px] border-2 border-dashed border-black/15 dark:border-white/20 hover:border-primary bg-black/[0.02] dark:bg-white/[0.03] flex flex-col items-center justify-center cursor-pointer transition-colors p-3 text-center"
                                                    >
                                                        <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                            انقر لرفع شعار العميل (PNG / JPG / WEBP)
                                                        </span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleLogoChange}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* العمود الأيسر: إعدادات MySQL وفحص الاتصال */}
                                    <div className="p-6 rounded-[24px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col justify-between gap-5">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                                                    <Database className="w-5 h-5 text-emerald-500" />
                                                    <span>قاعدة البيانات المركزية (MySQL)</span>
                                                </h4>

                                                {/* زر فحص الاتصال التفاعلي */}
                                                <button
                                                    type="button"
                                                    onClick={testDbConnection}
                                                    disabled={dbTesting}
                                                    className="px-4 py-2 rounded-[14px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                                                >
                                                    {dbTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                                                    <span>فحص الاتصال</span>
                                                </button>
                                            </div>

                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
                                                بيانات الاتصال بقاعدة البيانات التي تم تجهيزها عبر MySQL Workbench.
                                            </p>

                                            {/* إشعار نتيجة فحص الاتصال */}
                                            {dbTestResult && (
                                                <div className={`p-3.5 mb-4 rounded-[16px] border text-xs font-bold flex items-center gap-2.5 ${
                                                    dbTestResult.success
                                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
                                                }`}>
                                                    {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                    <span>{dbTestResult.message}</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3.5 mb-3.5">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">اسم المضيف (Host)</label>
                                                    <input
                                                        type="text"
                                                        value={dbHost}
                                                        onChange={e => setDbHost(e.target.value)}
                                                        className="spatial-input w-full h-12 px-3 rounded-[14px] font-bold text-sm font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">المنفذ (Port)</label>
                                                    <input
                                                        type="text"
                                                        value={dbPort}
                                                        onChange={e => setDbPort(e.target.value)}
                                                        className="spatial-input w-full h-12 px-3 rounded-[14px] font-bold text-sm font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3.5">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">اسم قاعدة البيانات (Database Name)</label>
                                                    <input
                                                        type="text"
                                                        value={dbDatabase}
                                                        onChange={e => setDbDatabase(e.target.value)}
                                                        className="spatial-input w-full h-12 px-3 rounded-[14px] font-bold text-sm font-mono"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3.5">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">اسم المستخدم (User)</label>
                                                        <input
                                                            type="text"
                                                            value={dbUsername}
                                                            onChange={e => setDbUsername(e.target.value)}
                                                            className="spatial-input w-full h-12 px-3 rounded-[14px] font-bold text-sm font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">كلمة المرور (Password)</label>
                                                        <input
                                                            type="password"
                                                            value={dbPassword}
                                                            onChange={e => setDbPassword(e.target.value)}
                                                            placeholder="اختياري"
                                                            className="spatial-input w-full h-12 px-3 rounded-[14px] font-bold text-sm font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[11px] font-bold text-slate-400">
                                            💡 إذا لم تكن قاعدة البيانات موجودة، سيقوم المعالج بإنشائها وتجهيز جداولها تلقائياً.
                                        </p>
                                    </div>

                                </div>
                            ) : (
                                /* نموذج شاشة الكاشير الفرعية (Client Terminal) */
                                <div className="p-8 rounded-[24px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-6 max-w-2xl mx-auto w-full">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white">عنوان السيرفر الرئيسي في المحل</h4>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">أدخل عنوان الـ IP أو الدومين المخصص للسيرفر الأساسي</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={testHostConnection}
                                            disabled={hostTesting}
                                            className="px-4 py-2.5 rounded-[14px] bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                                        >
                                            {hostTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                                            <span>فحص الاتصال بالسيرفر</span>
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={serverHost}
                                        onChange={e => setServerHost(e.target.value)}
                                        placeholder="مثال: 192.168.1.15 أو tajori.store"
                                        className="spatial-input w-full h-15 px-5 rounded-[18px] font-bold text-base font-mono"
                                    />

                                    {hostTestResult && (
                                        <div className={`p-4 rounded-[16px] border text-xs font-bold flex items-center gap-2.5 ${
                                            hostTestResult.success
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400'
                                        }`}>
                                            {hostTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                            <span>{hostTestResult.message}</span>
                                        </div>
                                    )}

                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-700 dark:text-purple-300">
                                        ⚡ جهاز الكاشير لا يتطلب أي خوادم أو قواعد بيانات محلية، سيتم ربطه بالسيرفر المركزي مباشرة.
                                    </div>
                                </div>
                            )}

                            {/* شريط الإجراءات المكتبي السفلي (Desktop Bottom Action Dock) */}
                            <div className="flex items-center justify-between gap-4 mt-8 pt-5 border-t border-black/10 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setStep('role')}
                                    className="px-6 h-14 rounded-[18px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-black text-sm transition-all cursor-pointer"
                                >
                                    رجوع
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleStartInstall}
                                        className="px-10 h-14 rounded-[18px] spatial-button text-base font-black transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98]"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        <span>بدء التثبيت والتفعيل الشامل للمنظومة</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* المرحلة 3: شاشة جاري التثبيت في الخلفية */}
                    {step === 'installing' && (
                        <div className="spatial-card p-12 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-w-xl mx-auto my-auto w-full">
                            <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary mx-auto mb-6 shadow-lg shadow-primary/20">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">جاري تهيئة منظومة السحابة...</h2>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                {installProgressText}
                            </p>
                            <span className="text-xs font-bold text-slate-400">يرجى الانتظار، يتم تجهيز خادم Apache وقواعد البيانات تلقائياً...</span>
                        </div>
                    )}

                    {/* المرحلة 4: شاشة اكتمال التثبيت بنجاح */}
                    {step === 'completed' && (
                        <div className="spatial-card p-10 md:p-14 text-center shadow-2xl animate-in zoom-in-95 duration-300 max-w-2xl mx-auto my-auto w-full">
                            <div className="w-22 h-22 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-500 mx-auto mb-6 shadow-xl shadow-emerald-500/25">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">تم التثبيت والتهيئة بنجاح!</h2>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8">
                                تم إعداد وتشغيل المنظومة بنجاح لمتجر «{storeName}». يمكنك الآن الدخول فوراً وبدء عمليات البيع والكاشير.
                            </p>

                            <div className="p-6 rounded-[22px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] max-w-md mx-auto mb-8 text-right flex flex-col gap-3 text-xs font-bold">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">اسم المتجر:</span>
                                    <span className="text-slate-900 dark:text-white font-black">{storeName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">الرابط المحلي الآمن:</span>
                                    <span className="text-primary font-mono font-black">https://{domain}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">عنوان السيرفر (IP):</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">{initialConfig.server_ip}</span>
                                </div>
                            </div>

                            <a
                                href={completedInfo?.redirectUrl || `https://${domain}/invoices/create`}
                                className="inline-flex items-center justify-center gap-2.5 w-full max-w-md h-16 rounded-[22px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg transition-all shadow-xl shadow-emerald-600/30 cursor-pointer active:scale-[0.98]"
                            >
                                <span>الدخول إلى منظومة المبيعات الآن</span>
                                <ArrowLeft className="w-5 h-5" />
                            </a>
                        </div>
                    )}

                </div>
            </main>

            {/* Desktop Bottom Status Bar: شريط الحالة المكتبي السفلي */}
            <footer className="px-6 py-2.5 border-t border-black/10 dark:border-white/10 backdrop-blur-xl bg-white/40 dark:bg-black/30 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>خادم السحابة: متصل وجاهز</span>
                </div>
                <span>جميع الحقوق محفوظة © {new Date().getFullYear()} — {companyInfo.name}</span>
            </footer>
        </div>
    );
}
