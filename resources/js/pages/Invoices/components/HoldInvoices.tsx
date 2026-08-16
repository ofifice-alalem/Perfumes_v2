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
            {/* Backdrop with Fade Transition */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={() => setShowHoldList(false)}
            />

            {/* Drawer Panel with Slide Transition */}
            <div className="relative w-full sm:w-[600px] md:w-[700px] lg:w-[800px] max-w-[95vw] h-full
                bg-gradient-to-b from-white via-slate-50 to-slate-100
                dark:[background:linear-gradient(165deg,#13192e_0%,#0e1220_100%)]
                shadow-[-24px_0_60px_rgba(0,0,0,0.4)]
                border-l-2 border-black/10 dark:border-white/15 flex flex-col animate-in slide-in-from-right duration-300 z-10 cursor-default">

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b-2 border-black/5 dark:border-white/8 shrink-0 bg-amber-500/10 dark:bg-amber-500/10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-gradient-to-br from-amber-500/20 via-amber-500/15 to-amber-600/20 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-lg shadow-amber-500/10 shrink-0">
                            <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-black text-slate-900 dark:text-white text-2xl sm:text-3xl">الفواتير المعلقة</h3>
                            <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                عدد الفواتير المحفوظة مؤقتاً: <span className="font-black text-base">{holdInvoices.length}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowHoldList(false)}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/5 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-500 dark:text-white/60 flex items-center justify-center transition-all border border-black/5 dark:border-white/10 active:scale-95 shrink-0 cursor-pointer"
                        title="إغلاق"
                    >
                        <X className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
                    {holdInvoices.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/30 text-center py-20">
                            <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border-2 border-amber-500/20 shadow-inner">
                                <Clock className="w-12 h-12 opacity-80" />
                            </div>
                            <span className="font-black text-xl text-slate-700 dark:text-slate-200">لا توجد فواتير معلقة حالياً</span>
                            <span className="text-sm opacity-70 max-w-sm leading-relaxed font-bold">يمكنك تعليق أي فاتورة بيع بالضغط على زر "تعليق الفاتورة" لاسترجاعها وإكمال عملية البيع لاحقاً.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {holdInvoices.map(hold => (
                                <div key={hold.id} className="flex flex-col gap-4 p-6 rounded-[26px] bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500/50 dark:hover:border-amber-500/60 transition-all shadow-md hover:shadow-xl">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-1.5">
                                                <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl truncate">{hold.customerName}</span>
                                                <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full whitespace-nowrap">
                                                    {hold.cart.length} منتجات
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-0.5 rounded-md">
                                                    {new Date(hold.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {hold.notes && <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 truncate">— {hold.notes}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 bg-amber-500/10 dark:bg-amber-500/20 px-4 py-2 rounded-[18px] border border-amber-500/20">
                                            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-wider">الإجمالي</span>
                                            <span className="font-black text-primary dark:text-amber-400 text-2xl sm:text-3xl">{hold.total.toFixed(2)} <span className="text-xs font-bold">د.ل</span></span>
                                        </div>
                                    </div>

                                    {/* Cart items list preview */}
                                    {hold.cart && hold.cart.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-700/60">
                                            {hold.cart.slice(0, 5).map((item, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                                    <span className="font-black text-primary">{item.quantity}×</span>
                                                    <span className="truncate max-w-[150px]">{item.product_name}</span>
                                                    {item.size_label && <span className="text-[10px] text-slate-400">({item.size_label})</span>}
                                                </span>
                                            ))}
                                            {hold.cart.length > 5 && (
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-700 dark:text-amber-300">
                                                    +{hold.cart.length - 5} منتجات أخرى
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Touch Action Buttons */}
                                    <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                                        <button
                                            type="button"
                                            onClick={() => restoreHoldInvoice(hold)}
                                            className="flex-1 flex items-center justify-center gap-3 h-14 sm:h-16 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-base sm:text-lg transition-all active:scale-95 shadow-lg shadow-emerald-500/20 hover:shadow-xl cursor-pointer"
                                        >
                                            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                                            <span>استرجاع الفاتورة</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteHoldInvoice(hold.id)}
                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-red-500/15 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border-2 border-red-500/30 flex items-center justify-center transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
                                            title="حذف الفاتورة"
                                        >
                                            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Drawer Footer */}
                {holdInvoices.length > 0 && (
                    <div className="p-6 border-t-2 border-black/8 dark:border-white/10 bg-white/90 dark:bg-[#13192e]/90 backdrop-blur-2xl shrink-0 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setHoldInvoices([])}
                            className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 rounded-[20px] bg-red-500/15 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border-2 border-red-500/30 font-black text-base sm:text-lg transition-all active:scale-95 shadow-sm cursor-pointer"
                        >
                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span>حذف جميع الفواتير المعلقة</span>
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
