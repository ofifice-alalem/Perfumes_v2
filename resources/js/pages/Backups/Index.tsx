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
    Sparkles
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

    const latestBackup = backups.length > 0 ? backups[0] : null;

    return (
        <AppShell pageTitle="النسخ الاحتياطية">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0 dir-rtl">

                {/* Top Banner & Main Actions */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <Database className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                النسخ الاحتياطية والأمان
                            </h1>
                            <p className="text-base sm:text-lg font-bold text-slate-500 dark:text-slate-400 mt-1">
                                إدارة وإنشاء واستعادة النسخ الاحتياطية لقواعد البيانات أسبوعياً أو عند الحاجة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={() => setShowUpload(true)}
                            className="h-16 sm:h-18 px-6 sm:px-8 rounded-[22px] border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md touch-manipulation cursor-pointer"
                        >
                            <Upload className="w-6 h-6" />
                            <span>رفع نسخة (.zip)</span>
                        </button>

                        <button
                            onClick={() => setShowCreate(true)}
                            className="spatial-button h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] text-base sm:text-xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl touch-manipulation cursor-pointer"
                        >
                            <Database className="w-6 h-6" />
                            <span>إنشاء نسخة احتياطية</span>
                        </button>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-5 rounded-[22px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-lg flex items-center gap-3 shadow-md">
                        <Check className="w-6 h-6 text-emerald-500 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-5 rounded-[22px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-lg flex items-center gap-3 shadow-md">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Analytics & Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SpatialCard className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[20px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shrink-0">
                                <HardDrive className="w-7 h-7" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-500 dark:text-slate-400">إجمالي النسخ المحفوظة</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">{backups.length} نسخة</span>
                            </div>
                        </div>
                    </SpatialCard>

                    <SpatialCard className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[20px] bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                <Clock className="w-7 h-7" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black text-slate-500 dark:text-slate-400">أحدث نسخة احتياطية</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 truncate">
                                    {latestBackup ? fmtDate(latestBackup.date) : 'لا يوجد نسخ'}
                                </span>
                            </div>
                        </div>
                    </SpatialCard>

                    <SpatialCard className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-500 dark:text-slate-400">حالة نظام الأمان</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> نشط وجاهز
                                </span>
                            </div>
                        </div>
                    </SpatialCard>
                </div>

                {/* Backups List Table / Card Grid */}
                <SpatialCard
                    title={`سجل النسخ الاحتياطية (${backups.length})`}
                    icon={<Database className="w-6 h-6 text-primary" />}
                >
                    {backups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-4 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-5xl shadow-inner">
                                🗄️
                            </div>
                            <span className="font-black text-2xl text-slate-700 dark:text-slate-300">لا توجد نسخ احتياطية مسجلة بعد</span>
                            <p className="text-base font-bold text-slate-500 dark:text-slate-400 max-w-md">
                                يمكنك إنشاء أول نسخة احتياطية بنقرة زر حفظاً لبيانات المبيعات والمستخدمين والمنتجات.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop & Tablet Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-sm font-black uppercase">
                                            <th className="p-5 rounded-r-[18px]">اسم الملف</th>
                                            <th className="p-5">تاريخ الإنشاء</th>
                                            <th className="p-5">الحجم</th>
                                            <th className="p-5">ملاحظة</th>
                                            <th className="p-5 rounded-l-[18px] text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-bold">
                                        {backups.map(backup => (
                                            <tr
                                                key={backup.filename}
                                                className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                            >
                                                {/* Filename */}
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-[16px] bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-sm">
                                                            <Database className="w-6 h-6" />
                                                        </div>
                                                        <span className="font-black text-base text-slate-900 dark:text-white dir-ltr text-right break-all">
                                                            {backup.filename}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-sm">
                                                        {fmtDate(backup.date)}
                                                    </span>
                                                </td>

                                                {/* Size */}
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className="font-black text-base text-slate-900 dark:text-slate-100">
                                                        {backup.size}
                                                    </span>
                                                </td>

                                                {/* Note */}
                                                <td className="p-5 text-slate-500 dark:text-slate-400 font-bold text-sm max-w-xs truncate">
                                                    {backup.note || '—'}
                                                </td>

                                                {/* Actions */}
                                                <td className="p-5 whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {/* Download Button */}
                                                        <a
                                                            href={`/backups/download/${backup.filename}`}
                                                            className="h-12 px-4 rounded-[16px] border-2 border-primary/40 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                        >
                                                            <Download className="w-5 h-5" />
                                                            <span>تحميل</span>
                                                        </a>

                                                        {/* Restore Button */}
                                                        <button
                                                            onClick={() => setRestoreTarget(backup)}
                                                            className="h-12 px-4 rounded-[16px] border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                                        >
                                                            <RotateCcw className="w-5 h-5" />
                                                            <span>استعادة</span>
                                                        </button>

                                                        {/* Delete Modal Trigger */}
                                                        <DeleteModal
                                                            title={`حذف النسخة الاحتياطية`}
                                                            description={`هل أنت متأكد من حذف ملف النسخة الاحتياطية "${backup.filename}" نهائياً؟`}
                                                            onConfirm={() => router.delete(`/backups/${backup.filename}`)}
                                                            trigger={
                                                                <button className="h-12 px-4 rounded-[16px] border-2 border-red-500/30 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer">
                                                                    <Trash2 className="w-5 h-5" />
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
                                {backups.map(backup => (
                                    <div
                                        key={backup.filename}
                                        className="rounded-[28px] border-2 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 flex flex-col gap-4 shadow-md"
                                    >
                                        <div className="flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                                            <div className="w-12 h-12 rounded-[16px] bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                                                <Database className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-black text-slate-900 dark:text-white text-base break-all dir-ltr text-right">
                                                    {backup.filename}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {fmtDate(backup.date)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm font-bold">
                                            <span className="text-slate-500 dark:text-slate-400">حجم الملف:</span>
                                            <span className="font-black text-slate-900 dark:text-white">{backup.size}</span>
                                        </div>

                                        {backup.note && (
                                            <div className="flex items-center justify-between text-sm font-bold">
                                                <span className="text-slate-500 dark:text-slate-400">ملاحظة:</span>
                                                <span className="font-black text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{backup.note}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 pt-2 border-t-2 border-slate-100 dark:border-slate-800">
                                            <a
                                                href={`/backups/download/${backup.filename}`}
                                                className="flex-1 h-12 rounded-[16px] border-2 border-primary/40 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>تحميل</span>
                                            </a>

                                            <button
                                                onClick={() => setRestoreTarget(backup)}
                                                className="flex-1 h-12 rounded-[16px] border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>استعادة</span>
                                            </button>

                                            <DeleteModal
                                                title={`حذف النسخة الاحتياطية`}
                                                description={`هل أنت متأكد من حذف ملف النسخة الاحتياطية "${backup.filename}" نهائياً؟`}
                                                onConfirm={() => router.delete(`/backups/${backup.filename}`)}
                                                wrapperClassName="flex-1"
                                                trigger={
                                                    <button className="w-full h-12 rounded-[16px] border-2 border-red-500/30 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation cursor-pointer">
                                                        <Trash2 className="w-4 h-4" />
                                                        <span>حذف</span>
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </SpatialCard>

            </div>

            {/* Modals */}
            {showCreate  && <CreateModal  onClose={() => setShowCreate(false)} />}
            {showUpload  && <UploadModal  onClose={() => setShowUpload(false)} />}
            {restoreTarget && <RestoreModal backup={restoreTarget} onClose={() => setRestoreTarget(null)} />}

        </AppShell>
    );
}
