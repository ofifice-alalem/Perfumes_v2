import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';
import { History, X, Printer, Eye, CheckCircle2, User, Clock, Package, RefreshCw } from 'lucide-react';

export interface RecentInvoiceItem {
    id: number;
    customer_name: string;
    user_name: string;
    total: number;
    paid_amount: number;
    created_at: string;
    items_count: number;
    items_summary: string;
}

interface RecentInvoicesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    recentInvoices: RecentInvoiceItem[];
    onPrintNode: (invoiceId: number) => void;
    onRefresh?: () => void;
}

export const RecentInvoicesDrawer: React.FC<RecentInvoicesDrawerProps> = ({
    isOpen,
    onClose,
    recentInvoices,
    onPrintNode,
}) => {
    const [printingId, setPrintingId] = useState<number | null>(null);
    const [printedSuccessId, setPrintedSuccessId] = useState<number | null>(null);

    // Inline Receipt Preview Modal State
    const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

    if (!isOpen) return null;

    const handlePrint = async (id: number) => {
        setPrintingId(id);
        try {
            await onPrintNode(id);
            setPrintedSuccessId(id);
            setTimeout(() => setPrintedSuccessId(null), 3000);
        } catch (e) {
            console.error('Print error:', e);
        } finally {
            setPrintingId(null);
        }
    };

    const handleOpenPreview = async (inv: RecentInvoiceItem) => {
        setPreviewInvoiceId(inv.id);
        setPreviewSrc(null);
        setLoadingPreview(true);
        try {
            const res = await fetch('/settings/node-printer/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ multi: true, invoice_id: inv.id }),
            });
            const resData = await res.json();
            if (resData.success && resData.preview_src) {
                setPreviewSrc(resData.preview_src);
            }
        } catch (e) {
            console.error('Error loading receipt preview:', e);
        } finally {
            setLoadingPreview(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start dir-rtl touch-manipulation">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Drawer Content - Touch Optimized (Large targets & high contrast) */}
            <div className="relative w-full sm:w-[540px] md:w-[620px] max-w-[98vw] h-full
                bg-gradient-to-b from-white via-slate-50 to-slate-100
                dark:[background:linear-gradient(165deg,#13192e_0%,#0e1220_100%)]
                shadow-2xl border-l border-white/20 dark:border-white/10
                flex flex-col z-10 transition-transform duration-300 animate-in slide-in-from-right"
            >
                {/* Touch-Friendly Header */}
                <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/60 dark:bg-white/5 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3.5 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-inner">
                            <History className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                آخر 4 فواتير
                                <span className="px-3 py-0.5 rounded-full bg-blue-600 text-white text-xs font-black">POS</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                                اضغط للمعاينة أو إرسال أمر الطباعة المباشرة
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 sm:p-3.5 rounded-2xl bg-slate-200/80 dark:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-90 touch-manipulation cursor-pointer"
                        aria-label="إغلاق"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Touch List Container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 touch-pan-y">
                    {recentInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                            <History className="w-20 h-20 stroke-1 mb-4 opacity-40" />
                            <span className="font-black text-lg">لا توجد فواتير سابقة حتى الآن</span>
                        </div>
                    ) : (
                        recentInvoices.map((inv) => (
                            <div
                                key={inv.id}
                                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/95 border-2 border-slate-200 dark:border-slate-800 shadow-xl hover:border-blue-500/60 transition-all space-y-3.5"
                            >
                                {/* Top Row: ID Badge & Customer */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="flex items-center gap-2.5">
                                        <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-blue-600/30 dark:text-blue-200 border border-slate-700/30 dark:border-blue-500/40 font-black text-base shadow-sm">
                                            #{inv.id}
                                        </span>
                                        <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-blue-500" />
                                            {inv.customer_name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-inner">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        <span>{inv.created_at}</span>
                                    </div>
                                </div>

                                {/* Items Summary & Total Amount */}
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="font-bold line-clamp-1">
                                            {inv.items_summary || `${inv.items_count} منتجات`}
                                        </span>
                                    </div>

                                    <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-500/10 px-3 py-1 rounded-xl">
                                        {inv.total.toFixed(2)} <span className="text-xs font-black">د.ل</span>
                                    </div>
                                </div>

                                {/* Touch Action Buttons (Clean text with SVG icons, no emojis) */}
                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handlePrint(inv.id)}
                                        disabled={printingId === inv.id}
                                        className="w-full min-h-[52px] px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.96] text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation cursor-pointer"
                                    >
                                        {printedSuccessId === inv.id ? (
                                            <>
                                                <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
                                                <span>تم الإرسال!</span>
                                            </>
                                        ) : printingId === inv.id ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                <span>جاري الطباعة...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Printer className="w-5 h-5" />
                                                <span>طباعة فورية</span>
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        href={`/invoices/${inv.id}`}
                                        className="w-full min-h-[52px] px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.96] text-slate-900 dark:text-white font-black text-sm transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 touch-manipulation cursor-pointer shadow-sm"
                                    >
                                        <Eye className="w-5 h-5 text-blue-500" />
                                        <span>تفاصيل الفاتورة</span>
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Touch Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-center text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0">
                    طباعة حرارية فائقة السرعة عبر محرك Node RAW Engine ⚡
                </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* INLINE INVOICE PREVIEW MODAL (معاينة الفاتورة في نفس الشاشة) */}
            {/* ------------------------------------------------------------------ */}
            {previewInvoiceId !== null && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 dir-rtl touch-manipulation">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                        onClick={() => setPreviewInvoiceId(null)}
                    />

                    <div className="relative w-full max-w-[440px] max-h-[90vh] bg-slate-900 text-white rounded-[32px] border-2 border-white/20 shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-blue-400" />
                                <span className="font-black text-lg">معاينة فاتورة #{previewInvoiceId}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewInvoiceId(null)}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Receipt Image Container */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[360px] bg-slate-950/50">
                            {loadingPreview ? (
                                <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                                    <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                                    <span className="font-black text-sm">جاري رسم الفاتورة الحرارية...</span>
                                </div>
                            ) : previewSrc ? (
                                <img
                                    src={previewSrc}
                                    alt={`Preview Invoice #${previewInvoiceId}`}
                                    className="w-full max-w-[340px] h-auto object-contain rounded-lg border border-white/10 shadow-2xl my-2"
                                />
                            ) : (
                                <div className="text-center py-16 text-slate-400 font-bold text-sm">
                                    تعذر تحميل معاينة الفاتورة
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    handlePrint(previewInvoiceId);
                                    setPreviewInvoiceId(null);
                                }}
                                className="flex-1 min-h-[52px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.96] text-white font-black text-base transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Printer className="w-5 h-5" />
                                <span>طباعة حرارية فورية</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreviewInvoiceId(null)}
                                className="px-5 min-h-[52px] rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-all"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
