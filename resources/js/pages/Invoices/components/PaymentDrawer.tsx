import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, X, Plus, Edit, Trash2, Check, Printer, ChevronDown, RefreshCw } from 'lucide-react';
import { CartItem } from './Cart';

export interface PaymentEntry {
    payment_method_id: string;
    method_name: string;
    amount: string;
}

export interface PaymentMethod {
    id: number;
    name: string;
}

interface PaymentDrawerProps {
    showPaymentDrawer: boolean;
    setShowPaymentDrawer: (v: boolean) => void;
    cart: CartItem[];
    payments: PaymentEntry[];
    debtPayment: PaymentEntry | null;
    paymentMethods: PaymentMethod[];
    customerId: string;
    selectedCustomer: any;
    originalDebt: number;
    isCashCustomer: boolean;
    customerType: string;
    isEditMode: boolean;
    editInvoice: any;
    total: number;
    grandTotal: number;
    totalPaid: number;
    remaining: number;
    processing: boolean;
    selMethod: string;
    selAmount: string;
    autoPrintNode?: boolean;
    setAutoPrintNode?: (v: boolean) => void;
    setSelMethod: (v: string) => void;
    setSelAmount: (v: string) => void;
    setPayments: React.Dispatch<React.SetStateAction<PaymentEntry[]>>;
    setDebtPayment: React.Dispatch<React.SetStateAction<PaymentEntry | null>>;
    setPaymentManuallySet: (v: boolean) => void;
    handleSelectPaymentMethod: (id: string) => void;
    addPayment: () => void;
    submit: () => void;
    openPad: (title: string, initial: string, cb: (v: string) => void, max?: number) => void;
}

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
    showPaymentDrawer,
    setShowPaymentDrawer,
    cart,
    payments,
    debtPayment,
    paymentMethods,
    customerId,
    selectedCustomer,
    originalDebt,
    isCashCustomer,
    customerType,
    isEditMode,
    editInvoice,
    total,
    grandTotal,
    totalPaid,
    remaining,
    processing,
    selMethod,
    selAmount,
    autoPrintNode = true,
    setAutoPrintNode,
    setSelMethod,
    setSelAmount,
    setPayments,
    setDebtPayment,
    setPaymentManuallySet,
    handleSelectPaymentMethod,
    addPayment,
    submit,
    openPad,
}) => {
    if (!showPaymentDrawer) return null;

    const selectedCustomerName = selectedCustomer?.name ?? 'زبون نقدي';
    const [showDebtMethodModal, setShowDebtMethodModal] = useState<boolean>(false);

    return createPortal(
        <div className="fixed inset-0 z-[9990] flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div onClick={() => setShowPaymentDrawer(false)} className="absolute inset-0 cursor-pointer" />

            {/* Workstation Payment Sheet */}
            <div className="relative z-10 w-full max-w-5xl mx-auto bg-white dark:bg-[#0c1421] border-t border-x border-slate-200/90 dark:border-[#1d2d42] rounded-t-[2px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-[2px] bg-brand/10 border border-brand/25 text-brand flex items-center justify-center shrink-0">
                            <Wallet className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">إتمام عملية السداد والحساب</h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                العميل: <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCustomerName}</span> ({isCashCustomer ? 'زبون نقدي' : (customerType === 'vip' ? 'VIP' : 'آجل')})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Auto Print Toggle */}
                        {setAutoPrintNode && (
                            <button
                                type="button"
                                onClick={() => setAutoPrintNode(!autoPrintNode)}
                                className={`h-9 px-3 rounded-[2px] border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                    autoPrintNode
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-white dark:bg-[#121c2c] border-slate-200 dark:border-[#1d2d42] text-slate-500'
                                }`}
                                title="تفعيل أو إلغاء الطباعة التلقائية"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة إيصال تلقائي</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] ${autoPrintNode ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                    {autoPrintNode ? 'مفعل' : 'معطل'}
                                </span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowPaymentDrawer(false)}
                            className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        >
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>

                {/* Totals Summary Strip */}
                <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-100/70 dark:bg-[#09111c] grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي الفاتورة</span>
                        <span className="text-sm sm:text-base font-number font-black text-slate-900 dark:text-white tabular-nums">{fmt(total)} د.ل</span>
                    </div>

                    {debtPayment && (
                        <div className="p-3 rounded-[2px] bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 shadow-2xs flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">الدين السابق</span>
                            <span className="text-sm sm:text-base font-number font-black text-rose-600 dark:text-rose-400 tabular-nums">{fmt(originalDebt)} د.ل</span>
                        </div>
                    )}

                    <div className="p-3 rounded-[2px] bg-sky-500/10 dark:bg-sky-950/30 border border-sky-300/40 dark:border-sky-800/60 shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">المطلوب سداده</span>
                        <span className="text-sm sm:text-base font-number font-black text-sky-700 dark:text-sky-300 tabular-nums">{fmt(grandTotal)} د.ل</span>
                    </div>

                    <div className="p-3 rounded-[2px] bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">المدفوع الفعلي</span>
                        <span className="text-sm sm:text-base font-number font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(totalPaid)} د.ل</span>
                    </div>

                    <div className={`p-3 rounded-[2px] border shadow-2xs flex flex-col gap-0.5 ${
                        remaining > 0.01
                            ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 text-amber-600 dark:text-amber-400'
                            : 'bg-white dark:bg-[#0c1421] border-slate-200/90 dark:border-[#1d2d42] text-slate-500 dark:text-slate-400'
                    }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider">المتبقي</span>
                        <span className={`text-sm sm:text-base font-number font-black tabular-nums ${remaining > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {remaining > 0.01 ? `${fmt(remaining)} د.ل` : '0.00 د.ل (خالص)'}
                        </span>
                    </div>
                </div>

                {/* Body Grid */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-5 sm:gap-6">
                    {/* Left Col — Select Payment Method */}
                    <div className="flex flex-col gap-3.5 w-full lg:w-1/2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            اختر وسيلة الدفع والمبلغ
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {paymentMethods.map(m => {
                                const isSelected = selMethod === String(m.id);
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSelectPaymentMethod(String(m.id))}
                                        className={`h-13 sm:h-14 rounded-[2px] font-bold text-xs sm:text-sm transition-all border flex items-center justify-center cursor-pointer shadow-2xs ${
                                            isSelected
                                                ? 'bg-brand text-white border-brand shadow-sm font-black'
                                                : 'bg-white dark:bg-[#101a29] border-slate-200/90 dark:border-[#1d2d42] text-slate-800 dark:text-slate-200 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-[#142032]'
                                        }`}
                                    >
                                        <span>{m.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex gap-2.5 items-center">
                            <button
                                type="button"
                                onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining)}
                                className="flex-1 h-13 sm:h-14 rounded-[2px] px-4 font-number font-black text-base sm:text-lg flex items-center justify-between cursor-pointer border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-slate-900 dark:text-white hover:border-brand transition-colors shadow-2xs"
                            >
                                <span className="text-slate-900 dark:text-white">{selAmount || (remaining > 0 ? remaining.toFixed(2) : '0.00')} د.ل</span>
                                <span className="text-[10px] font-sans font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 px-2 py-0.5 rounded-[2px]">لوحة الأرقام</span>
                            </button>
                            <button
                                type="button"
                                onClick={addPayment}
                                disabled={!selMethod || !selAmount}
                                className="h-13 sm:h-14 px-5 sm:px-6 rounded-[2px] bg-brand hover:bg-brand/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs cursor-pointer transition-all shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                <span>إضافة دفعة</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Col — Payments Cards List */}
                    <div className="flex flex-col gap-2.5 w-full lg:w-1/2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            الدفعات المسجلة في الفاتورة
                        </label>

                        {/* Debt Settlement Card */}
                        {debtPayment && (
                            <div className="p-3.5 rounded-[2px] bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 shadow-2xs">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => openPad('مبلغ سداد الدين', debtPayment.amount, v => {
                                            setDebtPayment(prev => prev ? { ...prev, amount: v } : null);
                                        }, originalDebt)}
                                        className="w-9 h-9 rounded-[2px] border border-rose-500/30 bg-white dark:bg-[#121c2c] text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                        title="تعديل القيمة"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-rose-600 dark:text-rose-400 text-xs truncate">سداد الدين السابق</span>
                                        <span className="font-number font-black text-slate-900 dark:text-white text-sm sm:text-base">{debtPayment.amount} د.ل</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowDebtMethodModal(true)}
                                        className="h-9 px-3 rounded-[2px] bg-white dark:bg-[#121c2c] border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>{debtPayment.method_name}</span>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDebtPayment(null)}
                                        className="w-9 h-9 rounded-[2px] border border-rose-500/30 bg-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                        title="إلغاء سداد الدين"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {payments.length === 0 && !debtPayment ? (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[140px] text-slate-400 dark:text-slate-500 text-xs font-bold border border-dashed border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#09111c] rounded-[2px] p-6 text-center">
                                لم يتم تسجيل أي دفعات بعد — حدد وسيلة الدفع والمبلغ ثم اضغط «إضافة دفعة»
                            </div>
                        ) : (
                            payments.map((p, idx) => (
                                <div key={idx} className="p-3.5 rounded-[2px] bg-slate-50/80 dark:bg-[#0a121e] border border-slate-200/90 dark:border-[#1d2d42] flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                                setPayments(prev => prev.map((pay, i) => i === idx ? { ...pay, amount: v } : pay));
                                                setPaymentManuallySet(true);
                                            })}
                                            className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                            title="تعديل القيمة"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="font-bold text-sky-600 dark:text-sky-400 text-xs px-2 py-0.5 rounded-[2px] bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 shrink-0">
                                                {p.method_name}
                                            </span>
                                            <span className="font-number font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">
                                                {p.amount} د.ل
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPayments(prev => prev.filter((_, i) => i !== idx));
                                            setPaymentManuallySet(true);
                                        }}
                                        className="w-9 h-9 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                        title="حذف الدفعة"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer / Submit */}
                <div className="px-5 py-3.5 border-t border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex flex-col gap-2 shrink-0">
                    {isCashCustomer && remaining > 0.01 && (
                        <div className="px-3.5 py-2 rounded-[2px] bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 font-bold text-xs text-center">
                            ⚠️ زبون نقدي — يجب سداد المبلغ المتبقي بالكامل ({fmt(remaining)} د.ل) قبل تأكيد البيع
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={submit}
                        disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                        className="h-14 sm:h-15 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-lg w-full flex items-center justify-between px-6 shadow-md transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            {processing ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <Printer className="w-5 h-5" />
                            )}
                            <span>{processing ? 'جاري حفظ الفاتورة...' : (isEditMode ? 'حفظ التعديلات النهائية للفاتورة' : 'تأكيد البيع وطباعة الفاتورة')}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-[2px]">
                                المدفوع: {fmt(totalPaid)} د.ل
                            </span>
                            <Check className="w-5 h-5" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Modal Choice for Debt Payment Method */}
            {showDebtMethodModal && debtPayment && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 dir-rtl">
                    <div
                        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                        onClick={() => setShowDebtMethodModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] text-slate-900 dark:text-white rounded-[2px] p-5 shadow-2xl flex flex-col gap-4 z-10 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#19273b] pb-3">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">اختر طريقة سداد الدين</h4>
                            <button
                                type="button"
                                onClick={() => setShowDebtMethodModal(false)}
                                className="w-7 h-7 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {paymentMethods.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                        setDebtPayment(prev => prev ? { ...prev, payment_method_id: String(m.id), method_name: m.name } : null);
                                        setShowDebtMethodModal(false);
                                    }}
                                    className={`h-11 rounded-[2px] font-bold text-xs transition-all border flex items-center justify-center cursor-pointer ${
                                        String(debtPayment.payment_method_id) === String(m.id)
                                            ? 'bg-brand text-white border-brand shadow-xs'
                                            : 'bg-white dark:bg-[#121c2c] border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-200 hover:border-brand'
                                    }`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};