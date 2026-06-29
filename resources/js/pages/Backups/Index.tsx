import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Database, Download, RotateCcw, Trash2, Plus, Upload, X, AlertTriangle } from 'lucide-react';

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

function CreateModal({ onClose }: { onClose: () => void }) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    function submit() {
        setLoading(true);

        // إنشاء form وإرساله مباشرة لتحميل الملف
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/backups/create';
        form.style.display = 'none';

        const csrfInput = document.createElement('input');
        csrfInput.name = '_token';
        csrfInput.value = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        form.appendChild(csrfInput);

        if (note.trim()) {
            const noteInput = document.createElement('input');
            noteInput.name = 'note';
            noteInput.value = note;
            form.appendChild(noteInput);
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        setTimeout(() => {
            setLoading(false);
            onClose();
            router.reload();
        }, 2000);
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">

                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-primary/10 border border-primary/15 flex items-center justify-center">
                        <Database className="w-6 h-6 text-primary" />
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">إنشاء نسخة احتياطية</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم إنشاء نسخة احتياطية كاملة لقاعدة البيانات وتحميلها تلقائياً.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظة (اختياري)</label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="مثال: قبل تحديث النظام..."
                        rows={3}
                        className="spatial-input rounded-[16px] px-4 py-3 text-[14px] font-bold resize-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={onClose}
                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={submit} disabled={loading}
                        className="flex-1 h-11 rounded-[14px] bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/30 disabled:opacity-60">
                        {loading ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        ) : <Database className="w-4 h-4" />}
                        {loading ? 'جارٍ الإنشاء...' : 'إنشاء وتحميل'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function RestoreModal({ backup, onClose }: { backup: Backup; onClose: () => void }) {
    const [step, setStep] = useState<'confirm1' | 'confirm2' | 'loading'>('confirm1');
    const [progress, setProgress] = useState(0);

    function startRestore() {
        setStep('loading');
        setProgress(0);

        // شريط تقدم وهمي
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 90) { clearInterval(interval); return 90; }
                return p + Math.random() * 15;
            });
        }, 400);

        router.post(`/backups/restore/${backup.filename}`, {}, {
            onSuccess: () => {
                clearInterval(interval);
                setProgress(100);
                setTimeout(onClose, 500);
            },
            onError: () => {
                clearInterval(interval);
                onClose();
            },
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={step !== 'loading' ? onClose : undefined} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">

                {step === 'loading' ? (
                    <>
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 rounded-[18px] bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                                <RotateCcw className="w-7 h-7 text-amber-500 animate-spin" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">جارٍ الاستعادة...</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-white/50 mt-1">لا تغلق الصفحة</p>
                            </div>
                            <div className="w-full bg-black/8 dark:bg-white/8 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                            <span className="text-xs font-black text-primary">{Math.round(Math.min(progress, 100))}%</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-[16px] bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <button onClick={onClose}
                                className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {step === 'confirm1' && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">استعادة نسخة احتياطية</h3>
                                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                        سيتم استبدال جميع البيانات الحالية بالكامل ببيانات هذه النسخة. هذا الإجراء لا يمكن التراجع عنه.
                                    </p>
                                    <div className="mt-2 px-4 py-3 rounded-[14px] bg-black/4 dark:bg-white/4 border border-black/6 dark:border-white/6">
                                        <span className="text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">الملف</span>
                                        <p className="font-bold text-slate-700 dark:text-white/80 text-sm mt-0.5 break-all">{backup.filename}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={onClose}
                                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                                        إلغاء
                                    </button>
                                    <button onClick={() => setStep('confirm2')}
                                        className="flex-1 h-11 rounded-[14px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                                        <RotateCcw className="w-4 h-4" /> متابعة
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'confirm2' && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <h3 className="text-lg font-black text-red-500">تأكيد نهائي</h3>
                                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                        هل أنت متأكد تماماً؟ ستُحذف جميع البيانات الحالية ولا يمكن استرجاعها.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setStep('confirm1')}
                                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                                        رجوع
                                    </button>
                                    <button onClick={startRestore}
                                        className="flex-1 h-11 rounded-[14px] bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-500/30">
                                        <RotateCcw className="w-4 h-4" /> تنفيذ الاستعادة
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}

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
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">

                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-emerald-500" />
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">رفع نسخة خارجية</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        ارفع ملف .zip نسخة احتياطية سابقة. الحد الأقصى 512MB.
                    </p>
                </div>

                <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-[20px] border-2 border-dashed border-black/15 dark:border-white/15 hover:border-primary/50 hover:bg-primary/3 transition-all cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 dark:text-white/30" />
                    {file ? (
                        <div className="text-center">
                            <p className="font-black text-slate-700 dark:text-white/80 text-sm break-all">{file.name}</p>
                            <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-1">{(file.size / 1048576).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <p className="font-bold text-slate-500 dark:text-white/40 text-sm text-center">اضغط لاختيار ملف .zip</p>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={onClose}
                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={submit} disabled={!file || loading}
                        className="flex-1 h-11 rounded-[14px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/30 disabled:opacity-50">
                        {loading ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        ) : <Upload className="w-4 h-4" />}
                        {loading ? 'جارٍ الرفع...' : 'رفع'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function BackupsIndex({ backups, flash }: Props) {
    const [showCreate, setShowCreate]   = useState(false);
    const [showUpload, setShowUpload]   = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);

    return (
        <AppShell pageTitle="النسخ الاحتياطية">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">النسخ الاحتياطية</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إنشاء واستعادة نسخ قاعدة البيانات</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowUpload(true)}
                            className="flex items-center justify-center gap-2 px-4 h-11 rounded-[16px] border border-black/10 dark:border-white/10 bg-black/4 dark:bg-white/4 hover:bg-black/8 dark:hover:bg-white/8 text-slate-700 dark:text-white/70 font-bold text-sm transition-all">
                            <Upload className="w-4 h-4" /> رفع نسخة
                        </button>
                        <button onClick={() => setShowCreate(true)}
                            className="spatial-button flex items-center justify-center gap-2 px-5 h-11 text-sm">
                            <Database className="w-4 h-4" /> إنشاء نسخة احتياطية
                        </button>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* Table */}
                <SpatialCard title={`النسخ الاحتياطية (${backups.length})`} icon={<Database className="w-4 h-4" />}>
                    {backups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">🗄️</span>
                            <span className="font-bold">لا توجد نسخ احتياطية بعد</span>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['اسم الملف', 'التاريخ', 'الحجم', 'إجراءات', 'ملاحظة'].map(h => (
                                                <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {backups.map(backup => (
                                            <tr key={backup.filename} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                <td className="px-4 py-3 min-w-[260px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                                                            <Database className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="font-bold text-slate-700 dark:text-white/80 text-xs">{backup.filename}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-white/50 whitespace-nowrap font-bold text-xs"><span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[16px]">{fmtDate(backup.date)}</span></td>
                                                <td className="px-4 py-3 font-black text-slate-700 dark:text-white/80 whitespace-nowrap">{backup.size}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="relative group/tip">
                                                            <a href={`/backups/download/${backup.filename}`}
                                                                className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                                                                <Download className="w-3.5 h-3.5" />
                                                            </a>
                                                            <span className="pointer-events-none absolute bottom-full mb-2 right-1/2 translate-x-1/2 whitespace-nowrap rounded-[8px] bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-2.5 py-1 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">تحميل</span>
                                                        </div>
                                                        <div className="relative group/tip">
                                                            <button onClick={() => setRestoreTarget(backup)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all">
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="pointer-events-none absolute bottom-full mb-2 right-1/2 translate-x-1/2 whitespace-nowrap rounded-[8px] bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-2.5 py-1 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">استعادة</span>
                                                        </div>
                                                        <div className="relative group/tip">
                                                            <DeleteModal
                                                                title="حذف النسخة الاحتياطية"
                                                                description={`سيتم حذف الملف "${backup.filename}" نهائياً.`}
                                                                onConfirm={() => router.delete(`/backups/${backup.filename}`)}
                                                                trigger={
                                                                    <button className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                }
                                                            />
                                                            <span className="pointer-events-none absolute bottom-full mb-2 right-1/2 translate-x-1/2 whitespace-nowrap rounded-[8px] bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-2.5 py-1 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">حذف</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs w-[35%] min-w-[200px]">
                                                    {backup.note ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {backups.map(backup => (
                                    <div key={backup.filename} className="rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden">
                                        <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-[14px] bg-primary/10 flex items-center justify-center shrink-0">
                                                <Database className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-800 dark:text-white text-xs break-all">{backup.filename}</p>
                                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">{fmtDate(backup.date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">الحجم</span>
                                                <span className="font-black text-slate-700 dark:text-white/80">{backup.size}</span>
                                            </div>
                                            {backup.note && (
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                    <span className="font-bold text-slate-500 dark:text-white/60 text-sm max-w-[180px] truncate">{backup.note}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                            <a href={`/backups/download/${backup.filename}`}
                                                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[12px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                <Download className="w-4 h-4" /> تحميل
                                            </a>
                                            <button onClick={() => setRestoreTarget(backup)}
                                                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[12px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all font-bold text-sm">
                                                <RotateCcw className="w-4 h-4" /> استعادة
                                            </button>
                                            <DeleteModal
                                                title="حذف النسخة الاحتياطية"
                                                description={`سيتم حذف الملف "${backup.filename}" نهائياً.`}
                                                onConfirm={() => router.delete(`/backups/${backup.filename}`)}
                                                trigger={
                                                    <button className="h-10 w-10 flex items-center justify-center rounded-[12px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                                        <Trash2 className="w-4 h-4" />
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

            {showCreate  && <CreateModal  onClose={() => setShowCreate(false)} />}
            {showUpload  && <UploadModal  onClose={() => setShowUpload(false)} />}
            {restoreTarget && <RestoreModal backup={restoreTarget} onClose={() => setRestoreTarget(null)} />}

        </AppShell>
    );
}
