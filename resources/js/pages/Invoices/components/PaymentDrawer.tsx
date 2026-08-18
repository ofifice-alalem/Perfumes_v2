import React from 'react';
import { createPortal } from 'react-dom';
import { Wallet, X, Plus, Edit, Trash2, Check, Printer } from 'lucide-react';
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

    return createPortal(
        <div className="fixed inset-0 z-[9990] flex flex-col justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div onClick={() => setShowPaymentDrawer(false)} className="absolute inset-0 cursor-pointer" />

            <div className="relative z-10 w-full max-w-5xl mx-auto bg-white dark:bg-slate-900 border-t-2 border-black/10 dark:border-white/10 rounded-t-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[20px] bg-primary/15 text-primary flex items-center justify-center font-black shrink-0 shadow-sm border border-primary/20">
                            <Wallet className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">إتمام عملية السداد والحساب</h3>
                            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                                العميل: <span className="text-primary font-black text-sm sm:text-base">{selectedCustomerName}</span> ({isCashCustomer ? 'زبون نقدي' : (customerType === 'vip' ? 'زبون VIP' : 'زبون آجل')})
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPaymentDrawer(false)}
                        className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-white/70 transition-all active:scale-95 border border-black/5 dark:border-white/10 cursor-pointer"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Totals Summary Strip */}
                <div className="px-6 sm:px-8 py-4 bg-slate-100/80 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:flex sm:items-center justify-between gap-3 text-center sm:text-right">
                    <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">إجمالي الفاتورة</span>
                        <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white">{total.toFixed(2)} د.ل</span>
                    </div>
                    {debtPayment && (
                        <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs font-black text-red-500 uppercase tracking-widest">الدين السابق</span>
                            <span className="text-base sm:text-lg font-black text-red-600 dark:text-red-400">{originalDebt.toFixed(2)} د.ل</span>
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">الإجمالي النهائى</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{grandTotal.toFixed(2)} د.ل</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">المدفوع</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)} د.ل</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">المتبقي</span>
                        <span className={`text-xl sm:text-2xl font-black ${remaining > 0.01 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>{remaining.toFixed(2)} د.ل</span>
                    </div>
                </div>

                {/* Body Grid */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
                    {/* Left Col — Select Payment Method */}
                    <div className="flex flex-col gap-4 w-full lg:w-1/2">
                        <label className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">اختر طريقة الدفع والمبلغ</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {paymentMethods.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelectPaymentMethod(String(m.id))}
                                    className={`h-16 sm:h-20 rounded-[20px] font-black text-base sm:text-lg transition-all border-2 flex items-center justify-center cursor-pointer ${selMethod === String(m.id)
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:border-primary/60 active:scale-95 shadow-sm'
                                        }`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-1">
                            <button
                                type="button"
                                onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining)}
                                className="spatial-input flex-1 h-16 sm:h-20 rounded-[22px] px-5 text-2xl sm:text-3xl font-black text-center cursor-pointer hover:border-primary/60 border-2 transition-all active:scale-95 shadow-sm"
                            >
                                {selAmount || remaining.toFixed(2)}
                            </button>
                            <button
                                type="button"
                                onClick={addPayment}
                                disabled={!selMethod || !selAmount}
                                className="spatial-button flex items-center justify-center gap-2 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] text-lg font-black disabled:opacity-40 shrink-0 active:scale-95 shadow-md cursor-pointer"
                            >
                                <Plus className="w-6 h-6" /> إضافة دفعة
                            </button>
                        </div>
                    </div>

                    {/* Right Col — Payments Cards List */}
                    <div className="flex flex-col gap-3 w-full lg:w-1/2">
                        <label className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">الدفعات المسجلة في الفاتورة</label>
                        {debtPayment && (
                            <div className="flex items-center gap-3 px-4 sm:px-5 h-22 sm:h-24 rounded-[22px] sm:rounded-[24px] bg-red-500/15 dark:bg-red-500/20 border-2 border-red-500/40 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => openPad('مبلغ سداد الدين', debtPayment.amount, v => {
                                        setDebtPayment(prev => prev ? { ...prev, amount: v } : null);
                                    }, originalDebt)}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-amber-500/20 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
                                    title="تعديل القيمة"
                                >
                                    <Edit className="w-6 h-6 sm:w-7 sm:h-7" />
                                </button>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-black text-red-600 dark:text-red-300 text-xs sm:text-sm truncate">سداد الدين — {debtPayment.method_name}</span>
                                    <span className="font-black text-slate-900 dark:text-white text-xl sm:text-[24px] truncate">{debtPayment.amount}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDebtPayment(null)}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-sm cursor-pointer"
                                    title="حذف"
                                >
                                    <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
                                </button>
                            </div>
                        )}

                        {payments.length === 0 && !debtPayment ? (
                            <div className="flex-1 flex items-center justify-center min-h-[120px] text-slate-500 dark:text-slate-400 font-black text-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-[24px]">
                                لم يتم إضافة أي دفعات بعد
                            </div>
                        ) : (
                            payments.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-4 sm:px-5 h-22 sm:h-24 rounded-[22px] sm:rounded-[24px] bg-emerald-500/15 dark:bg-emerald-500/20 border-2 border-emerald-500/40 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                            setPayments(prev => prev.map((pay, i) => i === idx ? { ...pay, amount: v } : pay));
                                            setPaymentManuallySet(true);
                                        })}
                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
                                        title="تعديل القيمة"
                                    >
                                        <Edit className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </button>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-black text-emerald-600 dark:text-emerald-300 text-xs sm:text-sm truncate">{p.method_name}</span>
                                        <span className="font-black text-slate-900 dark:text-white text-xl sm:text-[24px] truncate">{p.amount}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-sm cursor-pointer"
                                        title="حذف"
                                    >
                                        <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Drawer Footer / Submit */}
                <div className="px-6 sm:px-8 pt-5 pb-16 sm:pb-24 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col gap-3 shrink-0">
                    {/* Auto-print Toggle Switch */}
                    {setAutoPrintNode && (
                        <div className="flex items-center justify-between px-5 py-3.5 rounded-[22px] bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center font-black transition-all shrink-0 ${autoPrintNode ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                    <Printer className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg">طباعة الفاتورة تلقائياً (Node ⚡)</span>
                                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 truncate">طباعة الورقة في الطابعة الحرارية مباشرة عند إتمام البيع</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAutoPrintNode(!autoPrintNode)}
                                className={`relative w-16 h-9 rounded-full transition-colors cursor-pointer p-1 border-2 shrink-0 ${autoPrintNode ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${autoPrintNode ? 'translate-x-0' : '-translate-x-7'}`} />
                            </button>
                        </div>
                    )}

                    {isCashCustomer && remaining > 0.01 && (
                        <div className="px-4 py-3 rounded-[16px] bg-amber-500/15 border-2 border-amber-500/30 text-amber-700 dark:text-amber-300 font-black text-sm text-center">
                            ⚠️ زبون نقدي — يجب الدفع الكامل واستيفاء المبلغ المتبقي ({remaining.toFixed(2)} د.ل) قبل التأكيد
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={submit}
                        disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                        className="spatial-button h-24 sm:h-28 rounded-[28px] text-2xl sm:text-[26px] font-black w-full flex items-center justify-center gap-4 shadow-2xl active:scale-95 hover:scale-[1.01] transition-all disabled:opacity-40 cursor-pointer"
                    >
                        <Check className="w-8 h-8 sm:w-10 sm:h-10" />
                        {isEditMode ? 'حفظ التعديلات النهائية للفاتورة' : 'تأكيد البيع وطباعة الفاتورة'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
