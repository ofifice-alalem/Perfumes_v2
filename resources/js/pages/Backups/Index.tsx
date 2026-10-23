import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, DraggableOnScreenKeyboard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import {
    Database,
    Download,
    RotateCcw,
    Trash2,
    Upload,
    X,
    AlertTriangle,
    Keyboard,
    HardDrive,
    Clock,
    ShieldCheck,
    Check,
    FileText,
    Sparkles,
    Search,
    FileArchive,
    CheckCircle2
} from 'lucide-react';

interface Backup {
    filename: string;
    size: string;
    date: string | null;
    note: string | null;
}

interface Props {
    backups: Backup[];
    flash?: { success?: string; error?: string };
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    return v;
}

/* =========================================================================
   1. CREATE BACKUP MODAL (with Virtual Touch Keyboard)
   ========================================================================= */
function CreateModal({ onClose }: { onClose: () => void }) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [showKeyboard, setShowKeyboard] = useState(false);

    function submit() {
        setLoading(true);
        router.post('/backups/create', { note }, {
            onSuccess: () => {
                onClose();
            },
            onFinish: () => {
                setLoading(false);
            },
        });
    }

    // Keyboard controls
    const handleKeyPress = (char: string) => setNote(prev => prev + char);
    const handleBackspace = () => setNote(prev => prev.slice(0, -1));
    const handleClear = () => setNote('');
    const handleSpace = () => setNote(prev => prev + ' ');

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none dir-rtl">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Dialog Panel */}
            <div className="relative w-full max-w-xl rounded-[32px] p-6 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-primary/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[10000]">

                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[20px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-md shrink-0">
                            <Database className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">إنشاء نسخة احتياطية</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                أخذ لقطة كاملة لقاعدة بيانات النظام
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

                {/* Body */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span>ملاحظة أو وصف للنسخة (اختياري)</span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowKeyboard(!showKeyboard)}
                            className={`h-12 px-5 rounded-[16px] border-2 flex items-center gap-2.5 font-black text-sm transition-all shrink-0 cursor-pointer shadow-md active:scale-95 touch-manipulation ${
                                showKeyboard
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
                                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                            }`}
                        >
                            <Keyboard className="w-5 h-5 shrink-0" />
                            <span>لوحة المفاتيح</span>
                        </button>
                    </div>

                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="مثال: نسخة احتياطية قبل إضافة منتجات جديدة أو قبل إغلاق الورديّة..."
                        rows={3}
                        className="spatial-input rounded-[22px] p-5 text-lg font-black resize-none w-full"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={submit}
                        disabled={loading}
                        className="spatial-button h-16 sm:h-18 rounded-[22px] text-lg sm:text-xl font-black flex items-center justify-center gap-3 flex-1 active:scale-95 shadow-xl disabled:opacity-60 cursor-pointer"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Database className="w-6 h-6" />
                        )}
                        <span>{loading ? 'جارٍ الإنشاء والتحميل...' : 'إنشاء وتحميل الآن'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        إلغاء
                    </button>
                </div>
            </div>

            {/* Virtual Keyboard Portal */}
            {showKeyboard && (
                <DraggableOnScreenKeyboard
                    value={note}
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
   2. RESTORE BACKUP MODAL
   ========================================================================= */
function RestoreModal({ backup, onClose }: { backup: Backup; onClose: () => void }) {
    const [step, setStep] = useState<'confirm1' | 'confirm2' | 'loading'>('confirm1');
    const [progress, setProgress] = useState(0);

    function startRestore() {
        setStep('loading');
        setProgress(0);

        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 90) { clearInterval(interval); return 90; }
                return p + Math.random() * 15;
            });
        }, 350);

        router.post(`/backups/restore/${backup.filename}`, {}, {
            onSuccess: () => {
                clearInterval(interval);
                setProgress(100);
                setTimeout(onClose, 600);
            },
            onError: () => {
                clearInterval(interval);
                onClose();
            },
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none dir-rtl">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={step !== 'loading' ? onClose : undefined}
            />

            <div className="relative w-full max-w-lg rounded-[32px] p-6 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-amber-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] z-[10000]">

                {step === 'loading' ? (
                    <div className="flex flex-col items-center gap-6 py-6 text-center">
                        <div className="w-20 h-20 rounded-[28px] bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 shadow-xl">
                            <RotateCcw className="w-10 h-10 animate-spin" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">جارٍ استعادة البيانات...</h3>
                            <p className="text-base font-bold text-slate-500 dark:text-slate-400">يرجى الانتظار وعدم إغلاق هذه الصفحة</p>
                        </div>

                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-300 dark:border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full transition-all duration-500 shadow-md"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                        <span className="text-xl font-black text-amber-600 dark:text-amber-400">{Math.round(Math.min(progress, 100))}%</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[20px] bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md shrink-0">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">استعادة نسخة احتياطية</h3>
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                        إجراء استبدال كلي لبيانات النظام
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

                        {step === 'confirm1' && (
                            <div className="flex flex-col gap-6">
                                <div className="p-5 rounded-[22px] bg-amber-500/10 border-2 border-amber-500/20 text-slate-800 dark:text-slate-200 flex flex-col gap-2">
                                    <p className="text-base font-bold leading-relaxed">
                                        تنبيه: سيتم استبدال جميع البيانات الحالية بالكامل ببيانات هذه النسخة الاحتياطية.
                                    </p>
                                    <div className="mt-2 p-3.5 rounded-[16px] bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">الملف المحدد</span>
                                        <p className="font-black text-slate-900 dark:text-white text-base mt-0.5 break-all">{backup.filename}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setStep('confirm2')}
                                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-amber-500 hover:bg-amber-600 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 flex-1 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-6 h-6" />
                                        <span>متابعة إلى التأكيد</span>
                                    </button>

                                    <button
                                        onClick={onClose}
                                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'confirm2' && (
                            <div className="flex flex-col gap-6">
                                <div className="p-5 rounded-[22px] bg-red-500/10 border-2 border-red-500/30 text-red-700 dark:text-red-300 flex flex-col gap-2">
                                    <h4 className="text-xl font-black">تحذير نهائي مؤكد!</h4>
                                    <p className="text-base font-bold leading-relaxed">
                                        هل أنت متأكد تماماً من تنفيذ عملية الاستعادة الآن؟ لا يمكن استرجاع البيانات الحالية بعد هذه الخطوة.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={startRestore}
                                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-red-600 hover:bg-red-700 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 flex-1 shadow-xl shadow-red-600/30 active:scale-95 cursor-pointer border-2 border-red-400/40"
                                    >
                                        <RotateCcw className="w-6 h-6" />
                                        <span>تأكيد وتنفيذ الاستعادة</span>
                                    </button>

                                    <button
                                        onClick={() => setStep('confirm1')}
                                        className="h-16 sm:h-18 px-6 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-base border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                                    >
                                        رجوع
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}

/* =========================================================================
   3. UPLOAD EXTERNAL BACKUP MODAL
   ========================================================================= */
function UploadModal({ onClose }: { onClose: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    function submit() {
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('_token', (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '');

        router.post('/backups/upload', formData as any, {
            forceFormData: true,
            onSuccess: onClose,
            onFinish: () => setLoading(false),
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none dir-rtl">
            <div
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-xl rounded-[32px] p-6 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-emerald-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[10000]">

                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-md shrink-0">
                            <Upload className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">رفع نسخة خارجية</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                استيراد ملف احتياطي مضغوط بصيغة ZIP
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

                {/* Drag & Drop Box */}
                <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-4 p-8 rounded-[28px] border-3 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer text-center group"
                >
                    <div className="w-16 h-16 rounded-[22px] bg-emerald-500/15 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                    </div>

                    {file ? (
                        <div className="flex flex-col items-center gap-1">
                            <p className="font-black text-slate-900 dark:text-white text-lg break-all">{file.name}</p>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-4 py-1 rounded-full border border-emerald-500/30">
                                {(file.size / 1048576).toFixed(2)} MB
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <p className="font-black text-slate-800 dark:text-slate-200 text-lg">انقر لاختيار ملف النسخة الاحتياطية (.zip)</p>
                            <p className="text-sm font-bold text-slate-400">الحد الأقصى المسموح به: 512 ميجابايت</p>
                        </div>
                    )}

                    <input
                        ref={fileRef}
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={submit}
                        disabled={!file || loading}
                        className="h-16 sm:h-18 rounded-[22px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 flex-1 shadow-xl shadow-emerald-600/30 disabled:opacity-50 active:scale-95 cursor-pointer border-2 border-emerald-400/30"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Upload className="w-6 h-6" />
                        )}
                        <span>{loading ? 'جارٍ رفع الملف...' : 'رفع الملف الآن'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
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
   MAIN BACKUPS INDEX PAGE
   ========================================================================= */
export default function BackupsIndex({ backups, flash }: Props) {
    const [showCreate, setShowCreate]       = useState(false);
    const [showUpload, setShowUpload]       = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
    const [searchQuery, setSearchQuery]     = useState('');

    const latestBackup = backups.length > 0 ? backups[0] : null;

    // Filter backups based on search query
    const filteredBackups = backups.filter(b => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const filenameMatch = b.filename.toLowerCase().includes(q);
        const noteMatch = (b.note || '').toLowerCase().includes(q);
        const dateMatch = (b.date || '').toLowerCase().includes(q);
        return filenameMatch || noteMatch || dateMatch;
    });

    return (
        <AppShell pageTitle="النسخ الاحتياطية">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0 dir-rtl">

                {/* =========================================================
                    ZONE 1: HERO COMMAND BANNER (رأس الصفحة التفاعلي)
                    ========================================================= */}
                <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-8 lg:p-10 border-2 border-slate-200/90 dark:border-white/10 bg-gradient-to-br from-white/95 via-slate-50/85 to-blue-50/40 dark:from-slate-900/95 dark:via-slate-900/75 dark:to-blue-950/20 backdrop-blur-2xl shadow-xl">
                    {/* Ambient Glow Orbs */}
                    <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-start sm:items-center gap-5">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-gradient-to-br from-primary/25 to-primary/10 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-lg shadow-primary/10">
                                <Database className="w-8 h-8 sm:w-10 sm:h-10" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black flex items-center gap-1.5 w-fit">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        نظام الحماية واستعادة الكوارث
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                    إدارة النسخ الاحتياطية
                                </h1>
                                <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                                    توليد لقطات شاملة لقواعد البيانات والبيانات المحاسبية والمخزون، مع إمكانية التحميل والاستعادة الفورية بأعلى معايير الأمان.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3.5 shrink-0">
                            <button
                                onClick={() => setShowUpload(true)}
                                className="h-14 sm:h-16 px-5 sm:px-7 rounded-[20px] border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md touch-manipulation cursor-pointer"
                            >
                                <Upload className="w-5 h-5" />
                                <span>رفع نسخة (.zip)</span>
                            </button>

                            <button
                                onClick={() => setShowCreate(true)}
                                className="spatial-button h-14 sm:h-16 px-6 sm:px-8 rounded-[20px] text-sm sm:text-base font-black flex items-center justify-center gap-2.5 active:scale-95 shadow-xl shadow-primary/25 touch-manipulation cursor-pointer"
                            >
                                <Sparkles className="w-5 h-5 text-amber-300" />
                                <span>إنشاء نسخة احتياطية</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-5 rounded-[22px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-lg flex items-center gap-3 shadow-md animate-in fade-in duration-300">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-5 rounded-[22px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-lg flex items-center gap-3 shadow-md animate-in fade-in duration-300">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* =========================================================
                    ZONE 2: INSIGHTS & DIAGNOSTICS (المؤشرات الذكية)
                    ========================================================= */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Total backups */}
                    <SpatialCard className="p-5" hideHeader>
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-[18px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-sm">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">إجمالي النسخ المحفوظة</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{backups.length} نسخة</span>
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">في التخزين المحلي الآمن</span>
                            </div>
                        </div>
                    </SpatialCard>

                    {/* Latest backup */}
                    <SpatialCard className="p-5" hideHeader>
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-[18px] bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">أحدث نقطة استعادة</span>
                                <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
                                    {latestBackup ? fmtDate(latestBackup.date) : 'لا توجد نسخ بعد'}
                                </span>
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                    {latestBackup ? 'آخر لقطة بيانات مسجلة' : 'جاهز لأخذ أول لقطة'}
                                </span>
                            </div>
                        </div>
                    </SpatialCard>

                    {/* Compression format */}
                    <SpatialCard className="p-5" hideHeader>
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-[18px] bg-blue-500/15 border-2 border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                                <FileArchive className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">معيار الحفظ والضغط</span>
                                <span className="text-base font-black text-slate-900 dark:text-white mt-0.5">أرشيف ZIP محكم</span>
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">جداول SQL + الملاحظات</span>
                            </div>
                        </div>
                    </SpatialCard>

                    {/* System state */}
                    <SpatialCard className="p-5" hideHeader>
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-[18px] bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">محرك الاستعادة الذاتي</span>
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    نشط وجاهز للتشغيل
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">تأكيد أمان من خطوتين</span>
                            </div>
                        </div>
                    </SpatialCard>
                </div>

                {/* =========================================================
                    ZONE 3: ARCHIVE CONTROLS & TABLE (سجل النسخ الاحتياطية)
                    ========================================================= */}
                <SpatialCard
                    title="أرشيف النسخ الاحتياطية"
                    icon={<Database className="w-6 h-6 text-primary" />}
                    action={
                        <span className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black">
                            {filteredBackups.length} ملف
                        </span>
                    }
                >
                    <div className="flex flex-col gap-6">

                        {/* Search Toolbar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-100/70 dark:bg-white/[0.03] p-4 rounded-[22px] border border-slate-200/80 dark:border-white/10 backdrop-blur-xl">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-5 h-5 text-slate-400 dark:text-white/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="بحث باسم الملف أو التاريخ أو الملاحظة..."
                                    className="spatial-input w-full h-12 pr-12 pl-10 rounded-[16px] text-sm font-bold bg-white/80 dark:bg-slate-900/60"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs sm:text-sm font-black">
                                <span className="px-3.5 py-2 rounded-[14px] bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-white/10">
                                    عرض {filteredBackups.length} من أصل {backups.length} نسخة
                                </span>
                            </div>
                        </div>

                        {/* Table / Empty State */}
                        {backups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-4 text-center">
                                <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-5xl shadow-inner">
                                    🗄️
                                </div>
                                <span className="font-black text-2xl text-slate-700 dark:text-slate-300">لا توجد نسخ احتياطية مسجلة بعد</span>
                                <p className="text-base font-bold text-slate-500 dark:text-slate-400 max-w-md">
                                    يمكنك إنشاء أول نسخة احتياطية بنقرة زر لحفظ كامل بيانات المنتجات والمبيعات والمخزون.
                                </p>
                            </div>
                        ) : filteredBackups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3 text-center">
                                <Search className="w-12 h-12 text-slate-400" />
                                <span className="font-black text-xl text-slate-700 dark:text-slate-300">لا توجد نتائج مطابقة لبحثك</span>
                                <p className="text-sm font-bold text-slate-500">جرب البحث بكلمات أخرى أو أفرغ حقل البحث</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop & Tablet Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-sm font-black uppercase">
                                                {/* Col 1: Filename */}
                                                <th className="p-5 rounded-r-[20px] whitespace-nowrap">اسم الملف</th>

                                                {/* Col 2: Date */}
                                                <th className="p-5 whitespace-nowrap">تاريخ ووقت الإنشاء</th>

                                                {/* Col 3: Size */}
                                                <th className="p-5 whitespace-nowrap">حجم الملف</th>

                                                {/* Col 4: Note */}
                                                <th className="p-5">الملاحظات والبيان</th>

                                                {/* Col 5: Actions - The Last Column */}
                                                <th className="p-5 rounded-l-[20px] text-center whitespace-nowrap">خيارات التحكم</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-bold">
                                            {filteredBackups.map(backup => (
                                                <tr
                                                    key={backup.filename}
                                                    className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group align-middle"
                                                >
                                                    {/* 1. Filename */}
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-11 h-11 rounded-[14px] bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-sm">
                                                                <Database className="w-5 h-5" />
                                                            </div>
                                                            <span className="font-black text-sm text-slate-900 dark:text-white dir-ltr text-right break-all">
                                                                {backup.filename}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* 2. Date */}
                                                    <td className="p-5 whitespace-nowrap">
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs font-mono">
                                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                                            <span>{fmtDate(backup.date)}</span>
                                                        </div>
                                                    </td>

                                                    {/* 3. Size - Plain text, NOT badge */}
                                                    <td className="p-5 whitespace-nowrap">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                            {backup.size}
                                                        </span>
                                                    </td>

                                                    {/* 4. Note - Full text completely visible */}
                                                    <td className="p-5">
                                                        {backup.note ? (
                                                            <div className="min-w-[280px] max-w-xl p-3.5 rounded-[18px] bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm font-bold leading-relaxed break-words whitespace-pre-wrap shadow-sm">
                                                                <div className="flex items-start gap-2">
                                                                    <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                                    <span>{backup.note}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-white/30 text-xs font-bold italic">
                                                                لا توجد ملاحظة مدونة
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* 5. Actions - LAST COLUMN */}
                                                    <td className="p-5 whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {/* Download */}
                                                            <a
                                                                href={`/backups/download/${backup.filename}`}
                                                                title="تحميل النسخة إلى جهازك"
                                                                className="h-10 px-3.5 rounded-[14px] border-2 border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                <span>تحميل</span>
                                                            </a>

                                                            {/* Restore */}
                                                            <button
                                                                onClick={() => setRestoreTarget(backup)}
                                                                title="استعادة هذه النسخة"
                                                                className="h-10 px-3.5 rounded-[14px] border-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                                <span>استعادة</span>
                                                            </button>

                                                            {/* Delete */}
                                                            <DeleteModal
                                                                title="حذف النسخة الاحتياطية"
                                                                description={`هل أنت متأكد من حذف ملف النسخة الاحتياطية "${backup.filename}" نهائياً؟`}
                                                                onConfirm={() => router.delete(`/backups/${backup.filename}`)}
                                                                trigger={
                                                                    <button
                                                                        title="حذف الملف"
                                                                        className="h-10 px-3.5 rounded-[14px] border-2 border-red-500/30 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        <span>حذف</span>
                                                                    </button>
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="flex flex-col gap-4 md:hidden">
                                    {filteredBackups.map(backup => (
                                        <div
                                            key={backup.filename}
                                            className="rounded-[26px] border-2 border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-5 flex flex-col gap-4 shadow-md backdrop-blur-xl"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center gap-3 border-b-2 border-slate-100 dark:border-white/10 pb-3">
                                                <div className="w-12 h-12 rounded-[16px] bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                                                    <Database className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="font-black text-slate-900 dark:text-white text-sm break-all dir-ltr text-right">
                                                        {backup.filename}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                                        {fmtDate(backup.date)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Size */}
                                            <div className="flex items-center justify-between text-sm font-bold bg-slate-50 dark:bg-white/[0.03] p-3 rounded-[16px] border border-slate-200/60 dark:border-white/5">
                                                <span className="text-slate-500 dark:text-slate-400">حجم الملف:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                    {backup.size}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <a
                                                    href={`/backups/download/${backup.filename}`}
                                                    className="h-11 rounded-[14px] border-2 border-primary/40 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span>تحميل</span>
                                                </a>

                                                <button
                                                    onClick={() => setRestoreTarget(backup)}
                                                    className="h-11 rounded-[14px] border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>استعادة</span>
                                                </button>

                                                <DeleteModal
                                                    title="حذف النسخة الاحتياطية"
                                                    description={`هل أنت متأكد من حذف ملف النسخة الاحتياطية "${backup.filename}" نهائياً؟`}
                                                    onConfirm={() => router.delete(`/backups/${backup.filename}`)}
                                                    wrapperClassName="w-full"
                                                    trigger={
                                                        <button className="w-full h-11 rounded-[14px] border-2 border-red-500/30 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer">
                                                            <Trash2 className="w-4 h-4" />
                                                            <span>حذف</span>
                                                        </button>
                                                    }
                                                />
                                            </div>

                                            {/* Note (Final section - Full Text completely visible) */}
                                            {backup.note ? (
                                                <div className="flex flex-col gap-1.5 p-3.5 rounded-[18px] bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10">
                                                    <span className="text-xs font-black text-primary flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        ملاحظة النسخة:
                                                    </span>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                                        {backup.note}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-xs font-bold text-slate-400 dark:text-white/30 italic px-2">
                                                    لا توجد ملاحظة مدونة
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </SpatialCard>

            </div>

            {/* Modals */}
            {showCreate  && <CreateModal  onClose={() => setShowCreate(false)} />}
            {showUpload  && <UploadModal  onClose={() => setShowUpload(false)} />}
            {restoreTarget && <RestoreModal backup={restoreTarget} onClose={() => setRestoreTarget(null)} />}

        </AppShell>
    );
}
