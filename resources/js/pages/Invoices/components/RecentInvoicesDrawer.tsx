import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';
import { History, X, Printer, Eye, CheckCircle2, User, Clock, Package, RefreshCw } from 'lucide-react';

export interface RecentInvoiceItem {
    id: number;
    invoice_number?: string | null;
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

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            } else {
                alert('تنبيه المعاينة: ' + (resData.message || 'تعذر توليد صورة المعاينة'));
            }
        } catch (e) {
            console.error('Error loading receipt preview:', e);
            alert('تعذر الاتصال بمحرك المعاينة الحرارية');
        } finally {
            setLoadingPreview(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start dir-rtl touch-manipulation">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={onClose}
            />

            {/* Workstation Drawer Panel */}
            <div className="relative w-full sm:w-[540px] md:w-[620px] max-w-[98vw] h-full bg-white dark:bg-[#0c1421] border-l border-slate-200/90 dark:border-[#1d2d42] shadow-2xl flex flex-col z-10 transition-transform duration-200 animate-in slide-in-from-right">

                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[2px] bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <History className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                آخر الفواتير المنفذة
                            </h2>
                            <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-[2px]">
                                {recentInvoices.length} فواتير
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        aria-label="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
                    {recentInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 text-center gap-2">
                            <History className="w-12 h-12 stroke-1 opacity-50 mb-1" />
                            <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">لا توجد فواتير سابقة حتى الآن</span>
                            <span className="text-[11px] text-slate-500">ستظهر الفواتير المنفذة هنا فور حفظها لإعادة طباعتها أو مراجعتها.</span>
                        </div>
                    ) : (
                        recentInvoices.map((inv) => (
                            <div
                                key={inv.id}
                                className="p-3.5 sm:p-4 rounded-[2px] bg-slate-50/70 dark:bg-[#09111c] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xs hover:border-sky-500/40 transition-colors flex flex-col gap-2.5"
                            >
                                {/* Top Row */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-[#172437]">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-[2px] bg-slate-900 text-white dark:bg-sky-500/15 dark:text-sky-300 border border-slate-800 dark:border-sky-500/25 font-number font-black text-xs">
                                            #{inv.invoice_number || inv.id}
                                        </span>
                                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                            <User className="w-3.5 h-3.5 text-brand" />
                                            {inv.customer_name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#121c2c] px-2 py-0.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42]">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{inv.created_at}</span>
                                    </div>
                                </div>

                                {/* Items Summary & Total Amount */}
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0">
                                        <Package className="w-3.5 h-3.5 text-brand shrink-0" />
                                        <span className="font-bold truncate">
                                            {inv.items_summary || `${inv.items_count} أصناف`}
                                        </span>
                                    </div>

                                    <div className="text-sm sm:text-base font-number font-black text-slate-900 dark:text-white shrink-0 tabular-nums">
                                        {fmt(inv.total)} <span className="text-[10px] font-normal text-slate-400">د.ل</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 dark:border-[#172437]">
                                    <button
                                        type="button"
                                        onClick={() => handlePrint(inv.id)}
                                        disabled={printingId === inv.id}
                                        className="h-9 px-3 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                    >
                                        {printedSuccessId === inv.id ? (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
                                                <span>تم الإرسال للطابعة!</span>
                                            </>
                                        ) : printingId === inv.id ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>جاري الطباعة...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Printer className="w-3.5 h-3.5" />
                                                <span>طباعة فورية</span>
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        href={`/invoices/${inv.id}`}
                                        className="h-9 px-3 rounded-[2px] bg-white dark:bg-[#121c2c] hover:bg-slate-50 dark:hover:bg-[#162438] text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors border border-slate-200 dark:border-[#1d2d42] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-brand" />
                                        <span>عرض الفاتورة</span>
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] text-center text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
                    طباعة إيصالات حرارية سريعة عبر محرك Node RAW Engine
                </div>
            </div>

            {/* Inline Invoice Preview Modal */}
            {previewInvoiceId !== null && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 dir-rtl">
                    <div
                        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                        onClick={() => setPreviewInvoiceId(null)}
                    />

                    <div className="relative w-full max-w-[440px] max-h-[90vh] bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white rounded-[2px] border border-slate-200 dark:border-[#1d2d42] shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-brand" />
                                <span className="font-bold text-xs sm:text-sm">معاينة إيصال فاتورة #{previewInvoiceId}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewInvoiceId(null)}
                                className="w-7 h-7 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Image Container */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[340px] bg-slate-100/50 dark:bg-[#070d18]">
                            {loadingPreview ? (
                                <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                                    <RefreshCw className="w-8 h-8 animate-spin text-brand" />
                                    <span className="font-bold text-xs">جاري رسم الفاتورة الحرارية...</span>
                                </div>
                            ) : previewSrc ? (
                                <img
                                    src={previewSrc}
                                    alt={`Preview Invoice #${previewInvoiceId}`}
                                    className="w-full max-w-[320px] h-auto object-contain rounded-[2px] border border-slate-200 dark:border-[#1d2d42] shadow-md my-2"
                                />
                            ) : (
                                <div className="text-center py-12 text-slate-400 font-bold text-xs">
                                    تعذر تحميل معاينة الفاتورة
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="p-3 border-t border-slate-200 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    handlePrint(previewInvoiceId);
                                    setPreviewInvoiceId(null);
                                }}
                                className="flex-1 h-9 px-4 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة حرارية فورية</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreviewInvoiceId(null)}
                                className="h-9 px-4 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-50 dark:hover:bg-[#162438] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
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