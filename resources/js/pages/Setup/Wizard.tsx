import React, { useState, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { 
    Server, Monitor, Database, Globe, CheckCircle2, 
    AlertCircle, Loader2, Upload, Wifi, ArrowRight, 
    ArrowLeft, Store, Sparkles, X, ShieldCheck
} from 'lucide-react';

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
}

type DeviceRole = 'master' | 'client';
type Step = 'role' | 'config' | 'installing' | 'completed';

export default function SetupWizard({ initialConfig, companyInfo }: Props) {
    const [step, setStep] = useState<Step>('role');
    const [role, setRole] = useState<DeviceRole>('master');

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
                setInstallProgressText('جاري تحديث ملفات الإعدادات والبيئة...');
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

                setInstallProgressText('جاري ترحيل الجداول وتجهيز قاعدة البيانات (Migrations & Seeders)...');

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

                setInstallProgressText('اكتمل التثبيت بنجاح!');
                setCompletedInfo({ redirectUrl: data.redirect || '/login' });
                setStep('completed');
            } else {
                setInstallProgressText('جاري ربط جهاز الكاشير بالسيرفر الرئيسي...');

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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-primary selection:text-white" dir="rtl">
            <Head title="معالج الإعداد الأولي — شركة تقنية السحابة" />

            {/* Header */}
            <header className="p-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl shrink-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-wide">{companyInfo.name}</h1>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">{companyInfo.product} — معالج التثبيت والإعداد</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-slate-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>نسخة المؤسسات المستقلة (Enterprise Setup)</span>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-3xl">

                    {/* خطوة 1: اختيار نمط الجهاز (Role Selection) */}
                    {step === 'role' && (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
                            <div className="text-center max-w-lg mx-auto mb-8">
                                <h2 className="text-2xl sm:text-3xl font-black text-white">تحديد دور هذا الجهاز</h2>
                                <p className="text-sm font-bold text-slate-400 mt-2">
                                    يرجى تحديد ما إذا كان هذا الجهاز سيعمل كخادم رئيسي للمحل أم كشاشة كاشير فرعية.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
                                {/* خيار الجهاز الرئيسي */}
                                <div
                                    onClick={() => setRole('master')}
                                    className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                                        role === 'master'
                                            ? 'bg-blue-600/15 border-blue-500 shadow-xl shadow-blue-500/20'
                                            : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    <div>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                                            role === 'master' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                            <Server className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-2">الجهاز الرئيسي (السيرفر)</h3>
                                        <p className="text-xs font-bold text-slate-400 leading-relaxed">
                                            يحمل قاعدة البيانات المركزية، خادم الويب، ويدير الاتصال بين كافة أجهزة الكاشير والهواتف.
                                        </p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-xs font-black text-blue-400">
                                        <span>يشمل تثبيت Apache و MySQL و SSL</span>
                                    </div>
                                </div>

                                {/* خيار الجهاز الفرعي */}
                                <div
                                    onClick={() => setRole('client')}
                                    className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                                        role === 'client'
                                            ? 'bg-purple-600/15 border-purple-500 shadow-xl shadow-purple-500/20'
                                            : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    <div>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                                            role === 'client' ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                            <Monitor className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-2">جهاز كاشير فرعي</h3>
                                        <p className="text-xs font-bold text-slate-400 leading-relaxed">
                                            نقطة بيع إضافية متصلة بنفس الشبكة. لا يحتاج أي خوادم، بل يتصل بالسيرفر الرئيسي مباشرة.
                                        </p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-xs font-black text-purple-400">
                                        <span>تثبيت فوري وخفيف في ثوانٍ</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep('config')}
                                className="w-full h-16 rounded-[20px] bg-blue-600 hover:bg-blue-500 text-white font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/30 cursor-pointer active:scale-[0.98]"
                            >
                                <span>متابعة إعداد النظام</span>
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* خطوة 2: ملء بيانات الإعداد (Configuration Form) */}
                    {step === 'config' && (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
                            
                            {/* رسالة الخطأ إن وجدت */}
                            {installError && (
                                <div className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center gap-3 text-red-400 font-bold text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{installError}</span>
                                </div>
                            )}

                            {role === 'master' ? (
                                /* نموذج السيرفر الرئيسي */
                                <div className="flex flex-col gap-6">
                                    <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                                                <Server className="w-6 h-6 text-blue-500" />
                                                <span>إعداد السيرفر الرئيسي</span>
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 mt-1">تخصيص هوية المتجر والاتصال بقاعدة بيانات MySQL</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep('role')}
                                            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                        >
                                            تغيير النمط
                                        </button>
                                    </div>

                                    {/* 1. هوية العميل / المتجر */}
                                    <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-4">
                                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                                            <Store className="w-4 h-4 text-blue-400" />
                                            <span>بيانات متجر العميل (Store Identity)</span>
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم المتجر / النشاط التجاري</label>
                                                <input
                                                    type="text"
                                                    value={storeName}
                                                    onChange={e => setStoreName(e.target.value)}
                                                    placeholder="مثال: طيبة التاجوري"
                                                    className="w-full h-13 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-white focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5">النطاق المحلي (Local Domain)</label>
                                                <input
                                                    type="text"
                                                    value={domain}
                                                    onChange={e => setDomain(e.target.value)}
                                                    placeholder="tajori.store"
                                                    className="w-full h-13 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-white focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* حقل رفع شعار المتجر */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5">شعار المتجر (Store Logo)</label>
                                            <div className="flex items-center gap-4">
                                                {logoPreview ? (
                                                    <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                                                        <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain rounded-xl" />
                                                        <button
                                                            type="button"
                                                            onClick={removeLogo}
                                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="h-20 flex-1 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center"
                                                    >
                                                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                                        <span className="text-xs font-bold text-slate-400">انقر هنا لرفع شعار المتجر (PNG / JPG)</span>
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

                                    {/* 2. بيانات MySQL */}
                                    <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                                                <Database className="w-4 h-4 text-emerald-400" />
                                                <span>خادم قاعدة البيانات (MySQL Credentials)</span>
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={testDbConnection}
                                                disabled={dbTesting}
                                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                            >
                                                {dbTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                                                <span>فحص الاتصال</span>
                                            </button>
                                        </div>

                                        {dbTestResult && (
                                            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                                dbTestResult.success
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                                            }`}>
                                                {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                <span>{dbTestResult.message}</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم المضيف (Host)</label>
                                                <input
                                                    type="text"
                                                    value={dbHost}
                                                    onChange={e => setDbHost(e.target.value)}
                                                    className="w-full h-13 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-white focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم قاعدة البيانات (Database)</label>
                                                <input
                                                    type="text"
                                                    value={dbDatabase}
                                                    onChange={e => setDbDatabase(e.target.value)}
                                                    className="w-full h-13 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-white focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم المستخدم (User)</label>
                                                <input
                                                    type="text"
                                                    value={dbUsername}
                                                    onChange={e => setDbUsername(e.target.value)}
                                                    className="w-full h-13 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-white focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5">كلمة المرور (Password)</label>
                                                <input
                                                    type="password"
                                                    value={dbPassword}
                                                    onChange={e => setDbPassword(e.target.value)}
                                                    placeholder="اتركه فارغاً إن لم توجد كلمة سر"
                                                    className="w-full h-13 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-white focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* نموذج ربط الجهاز الفرعي */
                                <div className="flex flex-col gap-6">
                                    <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                                                <Monitor className="w-6 h-6 text-purple-400" />
                                                <span>ربط شاشة كاشير فرعية</span>
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 mt-1">الاتصال بالسيرفر المركزي عبر الشبكة المحلية (LAN)</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep('role')}
                                            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                        >
                                            تغيير النمط
                                        </button>
                                    </div>

                                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-bold text-slate-200">
                                                عنوان السيرفر الرئيسي (IP Address or Domain)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={testHostConnection}
                                                disabled={hostTesting}
                                                className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                            >
                                                {hostTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                                                <span>فحص الاتصال بالسيرفر</span>
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            value={serverHost}
                                            onChange={e => setServerHost(e.target.value)}
                                            placeholder="مثال: 192.168.1.15 أو tajori.store"
                                            className="w-full h-14 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-base text-white focus:border-purple-500 focus:outline-none"
                                        />

                                        {hostTestResult && (
                                            <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                                hostTestResult.success
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                                            }`}>
                                                {hostTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                <span>{hostTestResult.message}</span>
                                            </div>
                                        )}

                                        <p className="text-xs font-bold text-slate-400">
                                            💡 تأكد من أن جهاز الكاشير والجهاز الرئيسي متصلان بنفس شبكة الواي فاي أو الكيبل (Switch / Router).
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* أزرار الإجراءات */}
                            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setStep('role')}
                                    className="px-6 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
                                >
                                    رجوع
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStartInstall}
                                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    <span>بدء التثبيت والتفعيل الشامل</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* خطوة 3: مؤشر التثبيت والتقدم (Installing State) */}
                    {step === 'installing' && (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] p-10 shadow-2xl backdrop-blur-xl text-center animate-in fade-in duration-300">
                            <div className="w-20 h-20 rounded-full bg-blue-500/15 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-6">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">جاري تهيئة المنظومة...</h2>
                            <p className="text-sm font-bold text-slate-400 max-w-md mx-auto leading-relaxed">
                                {installProgressText}
                            </p>
                        </div>
                    )}

                    {/* خطوة 4: اكتمال التثبيت بنجاح (Completed Screen) */}
                    {step === 'completed' && (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">تم التثبيت والتهيئة بنجاح!</h2>
                            <p className="text-sm font-bold text-slate-400 max-w-lg mx-auto mb-8">
                                تم إعداد وتشغيل منظومة السحابة بنجاح. أصبحت المنظومة جاهزة للعمل وتسجيل الدخول والبدء في إدارة المبيعات.
                            </p>

                            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 max-w-md mx-auto mb-8 text-right flex flex-col gap-2.5 text-xs font-bold text-slate-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">اسم المتجر:</span>
                                    <span className="text-white font-black">{storeName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">الرابط المحلي:</span>
                                    <span className="text-blue-400 font-mono">http://{domain}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">عنوان الـ IP المحلي:</span>
                                    <span className="text-emerald-400 font-mono">{initialConfig.server_ip}</span>
                                </div>
                            </div>

                            <a
                                href={completedInfo?.redirectUrl || '/login'}
                                className="inline-flex items-center justify-center gap-2.5 w-full max-w-md h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg transition-all shadow-xl shadow-emerald-600/30 cursor-pointer active:scale-[0.98]"
                            >
                                <span>الدخول إلى المنظومة الآن</span>
                                <ArrowLeft className="w-5 h-5" />
                            </a>
                        </div>
                    )}

                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 text-center border-t border-slate-800/80 bg-slate-900/30 text-xs font-bold text-slate-500">
                <span>جميع الحقوق محفوظة © {new Date().getFullYear()} — {companyInfo.name}</span>
            </footer>
        </div>
    );
}

