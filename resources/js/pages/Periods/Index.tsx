import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, DraggableOnScreenKeyboard } from '@/components/ui/SpatialComponents';
import {
    RefreshCw,
    Eye,
    Trash2,
    AlertTriangle,
    X,
    Play,
    Calendar,
    CheckCircle2,
    Clock,
    Keyboard,
    Sparkles,
    ShieldAlert,
    FileText
} from 'lucide-react';

interface Period {
    id: number;
    name: string;
    status: 'open' | 'closed';
    started_at: string;
    closed_at: string | null;
    created_by: number;
    created_by_name?: string;
    snapshot: { id: number } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    periods: Paginated<Period & { created_by_user?: { name: string } }>;
    currentPeriod: Period | null;
    flash?: { success?: string; error?: string };
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

/* =========================================================================
   1. PURGE PERIOD MODAL
   ========================================================================= */
function PurgeModal({ period, onClose }: { period: Period; onClose: () => void }) {
    const [loading, setLoading] = useState(false);

    function confirm() {
        setLoading(true);
        router.delete(`/periods/${period.id}/purge`, {
            onSuccess: onClose,
            onFinish: () => setLoading(false),
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none dir-rtl">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg rounded-[32px] p-6 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-red-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] z-[10000]">

                <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[22px] bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center text-red-500 shadow-md shrink-0">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">حذف بيانات الفترة</h3>
                            <p className="text-base font-bold text-red-600 dark:text-red-400 mt-0.5">
                                تطهير البيانات التشغيلية
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-[18px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-5 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 text-slate-800 dark:text-slate-200 flex flex-col gap-2">
                    <p className="text-lg font-bold leading-relaxed">
                        سيتم حذف جميع الحركات التشغيلية للفترة <strong className="text-red-600 dark:text-red-400 text-xl font-black">"{period.name}"</strong>.
                    </p>
                    <p className="text-base font-black text-slate-500 dark:text-slate-400">
                        ملاحظة: الـ Snapshot الإحصائي سيبقى محفوظاً للأبد ولن يتأثر.
                    </p>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={confirm}
                        disabled={loading}
                        className="h-16 sm:h-18 rounded-[22px] bg-red-600 hover:bg-red-700 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 flex-1 shadow-xl shadow-red-600/30 active:scale-95 cursor-pointer border-2 border-red-400/30"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-6 h-6" />
                        )}
                        <span>{loading ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg sm:text-xl border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* =========================================================================
   2. START FIRST PERIOD MODAL (with Virtual Keyboard)
   ========================================================================= */
function StartFirstPeriodModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('الفترة المحاسبية الأولى');
    const [loading, setLoading] = useState(false);
    const [showKeyboard, setShowKeyboard] = useState(false);

    function submit() {
        if (!name.trim()) return;
        setLoading(true);
        router.post('/periods/start-first', { name }, {
            onSuccess: onClose,
            onFinish: () => setLoading(false),
        });
    }

    const handleKeyPress = (char: string) => setName(prev => prev + char);
    const handleBackspace = () => setName(prev => prev.slice(0, -1));
    const handleClear = () => setName('');
    const handleSpace = () => setName(prev => prev + ' ');

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none dir-rtl">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-xl rounded-[32px] p-6 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-emerald-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] z-[10000]">

                <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[22px] bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-md shrink-0">
                            <Play className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">بدء فترة محاسبية جديدة</h3>
                            <p className="text-base font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                فتح السجل المالي والقيود اليومية
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-[18px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-emerald-500" />
                            <span>اسم الفترة المحاسبية <span className="text-red-500">*</span></span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowKeyboard(!showKeyboard)}
                            className={`h-12 px-5 rounded-[16px] border-2 flex items-center gap-2.5 font-black text-base transition-all shrink-0 cursor-pointer shadow-md active:scale-95 touch-manipulation ${
                                showKeyboard
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
                                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                            }`}
                        >
                            <Keyboard className="w-5 h-5 shrink-0" />
                            <span>لوحة المفاتيح</span>
                        </button>
                    </div>

                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="مثلاً: الفترة المحاسبية 2026 أو الفترة الافتتاحية"
                        className="spatial-input rounded-[22px] h-18 px-5 text-xl font-black w-full"
                    />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={submit}
                        disabled={!name.trim() || loading}
                        className="h-16 sm:h-18 rounded-[22px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 flex-1 shadow-xl shadow-emerald-600/30 disabled:opacity-50 active:scale-95 cursor-pointer border-2 border-emerald-400/30"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Play className="w-6 h-6" />
                        )}
                        <span>{loading ? 'جارٍ التفعيل...' : 'تأكيد وبدء الفترة'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg sm:text-xl border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        إلغاء
                    </button>
                </div>
            </div>

            {showKeyboard && (
                <DraggableOnScreenKeyboard
                    value={name}
                    onKeyPress={handleKeyPress}
                    onBackspace={handleBackspace}
                    onClear={handleClear}
                    onSpace={handleSpace}
                    onClose={() => setShowKeyboard(false)}
                />
            )}
        </div>,
        document.body
    );
}

/* =========================================================================
   MAIN PERIODS INDEX PAGE
   ========================================================================= */
export default function PeriodsIndex({ periods, currentPeriod, flash }: Props) {
    const [purgeTarget, setPurgeTarget] = useState<Period | null>(null);
    const [showStartModal, setShowStartModal] = useState(false);

    return (
        <AppShell pageTitle="الإقفال والجرد">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0 dir-rtl">

                {/* Header Banner */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                الإقفال للجرد والتدوير المحاسبي
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                متابعة الفترات المالية المحاسبية، وتدوير الحسابات والأرصدة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        {currentPeriod ? (
                            <Link
                                href="/periods/rollover"
                                className="h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] bg-primary hover:bg-blue-600 text-white font-black text-base sm:text-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30 border-2 border-primary/30 touch-manipulation cursor-pointer transition-all"
                            >
                                <RefreshCw className="w-6 h-6" />
                                <span>تنفيذ التدوير المحاسبي</span>
                            </Link>
                        ) : (
                            <button
                                onClick={() => setShowStartModal(true)}
                                className="h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base sm:text-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-emerald-600/30 border-2 border-emerald-400/30 touch-manipulation cursor-pointer"
                            >
                                <Play className="w-6 h-6" />
                                <span>بدء فترة محاسبية جديدة</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Flash Notifications */}
                {flash?.success && (
                    <div className="p-5 rounded-[22px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-lg sm:text-xl flex items-center gap-3 shadow-md">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-5 rounded-[22px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-lg sm:text-xl flex items-center gap-3 shadow-md">
                        <AlertTriangle className="w-7 h-7 text-red-500 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Current Status Box */}
                {currentPeriod ? (
                    <div className="p-6 rounded-[28px] bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between gap-4 shadow-md">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="w-6 h-6 rounded-full bg-emerald-500" />
                                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                    الفترة المالية النشطة حالياً
                                </span>
                                <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                                    {currentPeriod.name} — مفتوحة منذ {fmtDate(currentPeriod.started_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 rounded-[28px] bg-red-500/10 border-2 border-red-500/30 flex items-center gap-4 shadow-md">
                        <ShieldAlert className="w-9 h-9 text-red-500 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-red-700 dark:text-red-400">
                                لا توجد فترة محاسبية مفتوحة حالياً
                            </span>
                            <span className="text-base font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                                يتطلب النظام وجود فترة مالية نشطة لتسجيل المبيعات، الفواتير، وحركات الخزينة.
                            </span>
                        </div>
                    </div>
                )}

                {/* Periods Table / Cards */}
                <SpatialCard
                    title={`سجل الفترات المحاسبية (${periods.total})`}
                    icon={<Calendar className="w-7 h-7 text-primary" />}
                >
                    {periods.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-4 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-5xl shadow-inner">
                                📅
                            </div>
                            <span className="font-black text-2xl text-slate-700 dark:text-slate-300">لا توجد فترات محاسبية مسجلة</span>
                            <p className="text-lg font-bold text-slate-500 dark:text-slate-400 max-w-md">
                                يمكنك بدء أول فترة محاسبية للبدء بتسجيل العمليات وحركات المخزون والمبيعات.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop & Tablet Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                            <th className="p-5 rounded-r-[18px]">#</th>
                                            <th className="p-5">اسم الفترة</th>
                                            <th className="p-5">الحالة</th>
                                            <th className="p-5">تاريخ الفتح</th>
                                            <th className="p-5">تاريخ الإغلاق</th>
                                            <th className="p-5">Snapshot</th>
                                            <th className="p-5 rounded-l-[18px] text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                        {periods.data.map(period => (
                                            <tr
                                                key={period.id}
                                                className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                            >
                                                <td className="p-5 font-black text-slate-400 dark:text-slate-500">#{period.id}</td>
                                                <td className="p-5 font-black text-slate-900 dark:text-white">{period.name}</td>
                                                <td className="p-5">
                                                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[14px] font-black text-sm border-2 ${
                                                        period.status === 'open'
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                                    }`}>
                                                        {period.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                                                    </span>
                                                </td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className="px-4 py-2 rounded-[14px] bg-slate-200/80 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-black text-base">
                                                        {fmtDate(period.started_at)}
                                                    </span>
                                                </td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className="px-4 py-2 rounded-[14px] bg-slate-200/80 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-black text-base">
                                                        {fmtDate(period.closed_at)}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    {period.snapshot ? (
                                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/15 text-primary border-2 border-primary/40 font-black text-sm">
                                                            <Sparkles className="w-4 h-4" /> محفوظ
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                                                    )}
                                                </td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {period.snapshot && (
                                                            <Link
                                                                href={`/periods/${period.id}/snapshot`}
                                                                className="h-14 px-5 rounded-[18px] border-2 border-primary/40 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                                <span>عرض Snapshot</span>
                                                            </Link>
                                                        )}

                                                        {period.status === 'closed' && period.snapshot && (
                                                            <button
                                                                onClick={() => setPurgeTarget(period)}
                                                                className="h-14 px-5 rounded-[18px] border-2 border-red-500/40 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                                <span>تطهير البيانات (Purge)</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards View */}
                            <div className="flex flex-col gap-4 md:hidden">
                                {periods.data.map(period => (
                                    <div
                                        key={period.id}
                                        className="rounded-[28px] border-2 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 flex flex-col gap-4 shadow-md"
                                    >
                                        <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                                            <div>
                                                <span className="font-black text-slate-900 dark:text-white text-xl">{period.name}</span>
                                                <div className="text-sm font-bold text-slate-400 mt-0.5">#{period.id}</div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-[14px] font-black text-sm border-2 ${
                                                period.status === 'open'
                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                            }`}>
                                                {period.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-2 text-base font-bold">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">تاريخ الفتح:</span>
                                                <span className="font-black text-slate-800 dark:text-slate-200">{fmtDate(period.started_at)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">تاريخ الإغلاق:</span>
                                                <span className="font-black text-slate-800 dark:text-slate-200">{fmtDate(period.closed_at)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                                            {period.snapshot && (
                                                <Link
                                                    href={`/periods/${period.id}/snapshot`}
                                                    className="flex-1 h-14 rounded-[18px] border-2 border-primary/40 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                    <span>عرض Snapshot</span>
                                                </Link>
                                            )}

                                            {period.status === 'closed' && period.snapshot && (
                                                <button
                                                    onClick={() => setPurgeTarget(period)}
                                                    className="flex-1 h-14 rounded-[18px] border-2 border-red-500/40 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span>تطهير</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {periods.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
                                    {periods.links.map((link, i) => (
                                        link.url ? (
                                            <Link
                                                key={i}
                                                href={link.url}
                                                className={`px-5 h-12 rounded-[16px] font-black text-base flex items-center transition-all cursor-pointer ${
                                                    link.active
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={i}
                                                className="px-5 h-12 rounded-[16px] font-black text-base flex items-center text-slate-300 dark:text-slate-700"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </SpatialCard>

            </div>

            {/* Modals */}
            {purgeTarget && <PurgeModal period={purgeTarget} onClose={() => setPurgeTarget(null)} />}
            {showStartModal && <StartFirstPeriodModal onClose={() => setShowStartModal(false)} />}
        </AppShell>
    );
}
