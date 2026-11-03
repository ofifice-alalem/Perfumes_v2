import React from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, Play, Trash2 } from 'lucide-react';
import { CartItem } from './Cart';
import { PaymentEntry } from './PaymentDrawer';

export interface HoldInvoice {
    id: string;
    customerId: string;
    customerType: 'regular' | 'vip';
    customerName: string;
    notes: string;
    cart: CartItem[];
    payments: PaymentEntry[];
    debtPayment: PaymentEntry | null;
    timestamp: number;
    total: number;
}

interface HoldInvoicesProps {
    showHoldList: boolean;
    setShowHoldList: (v: boolean) => void;
    holdInvoices: HoldInvoice[];
    setHoldInvoices: React.Dispatch<React.SetStateAction<HoldInvoice[]>>;
    restoreHoldInvoice: (holdInvoice: HoldInvoice) => void;
    deleteHoldInvoice: (holdId: string) => void;
}

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const HoldInvoices: React.FC<HoldInvoicesProps> = ({
    showHoldList,
    setShowHoldList,
    holdInvoices,
    setHoldInvoices,
    restoreHoldInvoice,
    deleteHoldInvoice,
}) => {
    if (!showHoldList) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start dir-rtl">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={() => setShowHoldList(false)}
            />

            {/* Workstation Drawer Panel */}
            <div className="relative w-full sm:w-[420px] md:w-[450px] max-w-[95vw] h-full bg-white dark:bg-[#0c1421] border-l border-slate-200/90 dark:border-[#1d2d42] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-10 cursor-default">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[2px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">الفواتير المعلقة</h3>
                            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-[2px]">
                                {holdInvoices.length}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowHoldList(false)}
                        className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        title="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
                    {holdInvoices.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-center py-20">
                            <div className="w-11 h-11 rounded-[2px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Clock className="w-5 h-5 stroke-1" />
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200">لا توجد فواتير معلقة حالياً</span>
                            <span className="text-[11px] font-medium text-slate-500 max-w-xs leading-relaxed">
                                يمكنك تعليق أي فاتورة مؤقتاً بالضغط على «تعليق الفاتورة» لاسترجاعها وإتمام البيع لاحقاً.
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {holdInvoices.map(hold => (
                                <div key={hold.id} className="p-3 rounded-[2px] bg-slate-50/70 dark:bg-[#09111c] border border-slate-200/90 dark:border-[#1d2d42] hover:border-amber-500/40 transition-colors shadow-2xs flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{hold.customerName}</span>
                                            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded-[2px] shrink-0">
                                                {hold.cart.length} أصناف
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-[#1d2d42] px-1.5 py-0.5 rounded-[2px]">
                                                {new Date(hold.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className="px-2 py-0.5 rounded-[2px] bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 flex items-center">
                                                <span className="font-number font-black text-xs text-sky-700 dark:text-sky-300">
                                                    {fmt(hold.total)} د.ل
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cart items preview tags */}
                                    {hold.cart && hold.cart.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-200/80 dark:border-[#172437]">
                                            {hold.cart.slice(0, 3).map((item, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-[#1d2d42] text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                    <span className="text-brand font-number">{item.quantity}×</span>
                                                    <span className="truncate max-w-[120px]">{item.product_name}</span>
                                                    {item.size_label && <span className="text-[9px] text-slate-400">({item.size_label})</span>}
                                                </span>
                                            ))}
                                            {hold.cart.length > 3 && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    +{hold.cart.length - 3} أخرى
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-[#172437]">
                                        <button
                                            type="button"
                                            onClick={() => restoreHoldInvoice(hold)}
                                            className="flex-1 h-9 px-3 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>استرجاع الفاتورة للمتابعة</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteHoldInvoice(hold.id)}
                                            className="h-9 w-9 rounded-[2px] border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                            title="حذف الفاتورة المعلقة"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {holdInvoices.length > 0 && (
                    <div className="p-3 border-t border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] shrink-0">
                        <button
                            type="button"
                            onClick={() => setHoldInvoices([])}
                            className="w-full h-8.5 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف جميع الفواتير المعلقة</span>
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};