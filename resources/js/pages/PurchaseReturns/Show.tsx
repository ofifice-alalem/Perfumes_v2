import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, RefreshCw, RotateCcw, DollarSign, FileText } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Supplier      { id: number; name: string; }

interface ReturnItem {
    id: number; product: Product;
    quantity: string; unit_cost: string; line_total: string;
}
interface Settlement {
    id: number;
    payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
}
interface PurchaseReturn {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    total: string;
    recovered_amount: string;
    due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
    items: ReturnItem[];
    settlements: Settlement[];
}
interface Props {
    return:         PurchaseReturn;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface SettlementRow { payment_method_id: string; amount: string; notes: string; }
const emptyRow = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'مسترد جزئياً', paid: 'مسترد بالكامل' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500 border-red-500/20',
    partial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

export default function PurchaseReturnsShow({ return: ret, paymentMethods = [], flash }: Props) {
    const [activeTab,    setActiveTab]    = useState<'items' | 'settlements'>('items');
    const [showForm,    setShowForm]    = useState(false);
    const [rows,        setRows]        = useState<SettlementRow[]>([emptyRow()]);
    const [submitting,  setSubmitting]  = useState(false);

    // NumberPad Modal State
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max); setPadCallback(() => cb); setShowPad(true);
    }

    const methodOptions = (paymentMethods || []).map(m => ({ label: m.name }));
    const due           = parseFloat(ret.due_recovery);
    const isCancelled   = !!ret.deleted_at;
    const isCash        = (ret.supplier?.id ?? 0) === 1;

    function resolveMethodId(label: string) {
        return String((paymentMethods || []).find(m => m.name === label)?.id ?? '');
    }
    function setRow(idx: number, field: keyof SettlementRow, val: string) {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submitSettlements() {
        const valid = rows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);

        function postNext(i: number) {
            if (i >= valid.length) {
                setSubmitting(false);
                setRows([emptyRow()]);
                setShowForm(false);
                return;
            }
            const row = valid[i];
            router.post('/supplier-settlements', {
                supplier_id:        String(ret.supplier?.id ?? ''),
                purchase_return_id: String(ret.id),
                purchase_id:        ret.purchase ? String(ret.purchase.id) : null,
                payment_method_id:  row.payment_method_id,
                amount:             row.amount,
                notes:              row.notes || null,
            }, {
                preserveScroll: true,
                onSuccess: () => postNext(i + 1),
                onError:   () => setSubmitting(false),
            });
        }
        postNext(0);
    }

    const tabs = [
        { key: 'items',       label: `المنتجات المرتجعة (${(ret.items || []).length})` },
        { key: 'settlements', label: `سجل الاسترداد المالي (${(ret.settlements || []).length})` },
    ] as const;

    return (
        <AppShell pageTitle={`تفاصيل مرتجع #${ret.id}`}>
            <div className="flex flex-col gap-8 pb-32 lg:pb-0 dir-rtl">

                {/* Top Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/purchase-returns"
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-black/5 dark:bg-white/8 border-2 border-black/5 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/10 transition-all shrink-0 active:scale-95 shadow-sm">
                            <ArrowRight className="w-8 h-8" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">مرتجع شراء #{ret.id}</h1>
                                {!isCancelled ? (
                                    <span className={`text-base font-black px-4 py-1.5 rounded-[16px] border ${recoveryClass[ret.recovery_status]}`}>
                                        {recoveryLabel[ret.recovery_status]}
                                    </span>
                                ) : (
                                    <span className="text-base font-black px-4 py-1.5 rounded-[16px] bg-red-500/10 text-red-500 border border-red-500/20">ملغي</span>
                                )}
                            </div>
                            <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">
                                المورد: <span className="text-slate-800 dark:text-white font-black">{ret.supplier?.name ?? 'مورد غير معروف'}</span> — {fmtDate(ret.created_at)}
                            </p>
                        </div>
                    </div>

                    {isCancelled && (
                        <button onClick={() => router.post(`/purchase-returns/${ret.id}/restore`)}
                            className="flex items-center justify-center gap-3 px-8 h-16 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-xl active:scale-95 shadow-lg">
                            <RotateCcw className="w-6 h-6" /> استعادة المرتجع
                        </button>
                    )}
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="px-6 py-4 rounded-[22px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg sm:text-xl shadow-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="px-6 py-4 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg sm:text-xl shadow-sm">
                        {flash.error}
                    </div>
                )}

                {/* KPI Summary Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SpatialCard title="إجمالي المرتجع" icon={<DollarSign className="w-6 h-6 text-orange-500" />}>
                        <div className="flex flex-col gap-1 p-2">
                            <span className="text-3xl sm:text-4xl font-black text-orange-600 dark:text-orange-400">
                                {fmt(ret.total)} <span className="text-lg font-bold opacity-75">د.ل</span>
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">القيمة الإجمالية للمنتجات</span>
                        </div>
                    </SpatialCard>

                    <SpatialCard title="المبلغ المسترد" icon={<RefreshCw className="w-6 h-6 text-purple-500" />}>
                        <div className="flex flex-col gap-1 p-2">
                            <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400">
                                {fmt(ret.recovered_amount)} <span className="text-lg font-bold opacity-75">د.ل</span>
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">المبلغ المستلم نقداً/مصرفياً</span>
                        </div>
                    </SpatialCard>

                    <SpatialCard title="المتبقي" icon={<DollarSign className="w-6 h-6 text-amber-500" />}>
                        <div className="flex flex-col gap-1 p-2">
                            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">
                                {fmt(ret.due_recovery)} <span className="text-lg font-bold opacity-75">د.ل</span>
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">المبلغ المتبقي لدى المورد</span>
                        </div>
                    </SpatialCard>

                    <SpatialCard title="الفاتورة المرجعية" icon={<FileText className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-1 p-2">
                            {ret.purchase ? (
                                <Link href={`/purchases/${ret.purchase.id}`} className="text-3xl sm:text-4xl font-black text-primary hover:underline">
                                    فاتورة #{ret.purchase.id}
                                </Link>
                            ) : (
                                <span className="text-2xl font-black text-slate-400 dark:text-white/40">مرتجع مستقل</span>
                            )}
                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">مرتبط بفاتورة الشراء</span>
                        </div>
                    </SpatialCard>
                </div>

                {/* Tabs Bar */}
                <div className="flex gap-3 p-2.5 rounded-[24px] bg-black/5 dark:bg-white/5 border-2 border-black/8 dark:border-white/10 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`flex-1 min-w-max px-8 h-16 sm:h-20 rounded-[20px] font-black text-lg sm:text-2xl transition-all whitespace-nowrap border-2 ${activeTab === t.key ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white border-primary shadow-lg scale-[1.01]' : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content 1: Returned Items */}
                {activeTab === 'items' && (
                    <SpatialCard title={`المنتجات المرتجعة (${(ret.items || []).length})`} icon={<Package className="w-6 h-6 text-primary" />}>
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                        {['المنتج', 'الكمية المرجعة', 'سعر الوحدة', 'إجمالي السطر'].map(h => (
                                            <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {(ret.items || []).map(item => (
                                        <tr key={item.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                            <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                {item.product?.name ?? 'منتج غير معروف'}
                                            </td>
                                            <td className="px-5 py-6 font-black text-slate-700 dark:text-white/80 text-2xl">
                                                {parseFloat(item.quantity).toLocaleString('en-US')}
                                            </td>
                                            <td className="px-5 py-6 font-black text-slate-700 dark:text-white/80 text-2xl">
                                                {fmt(item.unit_cost)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                            </td>
                                            <td className="px-5 py-6 font-black text-orange-600 dark:text-orange-400 text-2xl">
                                                {fmt(item.line_total)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards for Items */}
                        <div className="flex flex-col gap-4 lg:hidden">
                            {(ret.items || []).map(item => (
                                <div key={item.id} className="p-6 rounded-[24px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-3">
                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{item.product?.name ?? 'منتج غير معروف'}</span>
                                    <div className="grid grid-cols-3 gap-2 p-4 rounded-[18px] bg-black/3 dark:bg-white/5">
                                        <div>
                                            <span className="text-xs font-black text-slate-400">الكمية</span>
                                            <p className="font-black text-xl text-slate-800 dark:text-white">{parseFloat(item.quantity).toLocaleString('en-US')}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-slate-400">سعر الوحدة</span>
                                            <p className="font-black text-xl text-slate-800 dark:text-white">{fmt(item.unit_cost)}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-slate-400">الإجمالي</span>
                                            <p className="font-black text-xl text-orange-600 dark:text-orange-400">{fmt(item.line_total)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SpatialCard>
                )}

                {/* Tab Content 2: Recoveries / Settlements */}
                {activeTab === 'settlements' && (
                    <SpatialCard title={`سجل الاسترداد المالي (${(ret.settlements || []).length})`} icon={<RefreshCw className="w-6 h-6 text-primary" />}
                        action={
                            !isCancelled && !isCash && ret.recovery_status !== 'paid' && (
                                <button onClick={() => { setShowForm(p => !p); setRows([emptyRow()]); }}
                                    className="flex items-center gap-3 px-6 h-14 rounded-[20px] bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white transition-all font-black text-base sm:text-lg border-2 border-purple-500/20 active:scale-95 shadow-md">
                                    <Plus className="w-5 h-5" /> تسجيل استرداد
                                </button>
                            )
                        }
                    >
                        {/* Add Settlement Form Card */}
                        {showForm && (
                            <div className="mb-6 p-6 rounded-[28px] bg-purple-500/5 border-2 border-purple-500/20 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-black text-slate-800 dark:text-white text-xl sm:text-2xl">تسجيل دفعة استرداد جديدة</h3>
                                    <button onClick={() => setRows(p => [...p, emptyRow()])}
                                        className="flex items-center gap-2 px-5 h-12 rounded-[16px] bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white transition-all font-black text-base border-2 border-purple-500/20">
                                        <Plus className="w-4 h-4" /> إضافة وسيلة أخرى
                                    </button>
                                </div>

                                {rows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-5 rounded-[22px] bg-black/3 dark:bg-white/4 border-2 border-black/5 dark:border-white/8">
                                        <div className="md:col-span-4">
                                            <ModernSelect
                                                label="وسيلة الاسترداد"
                                                options={methodOptions}
                                                defaultValue={(paymentMethods || []).find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                                onSelect={val => setRow(idx, 'payment_method_id', resolveMethodId(val))}
                                            />
                                        </div>
                                        <div className="md:col-span-3 flex flex-col gap-2">
                                            <label className="text-xs font-black text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                                            <button type="button" onClick={() => {
                                                const max = due - rows.reduce((sum, r, i) => i === idx ? sum : sum + (parseFloat(r.amount) || 0), 0);
                                                openPad('المبلغ المسترد', row.amount || String(due), v => {
                                                    const val = parseFloat(v) || 0;
                                                    setRow(idx, 'amount', val > max ? String(max) : v);
                                                }, max);
                                            }} className="spatial-input h-16 rounded-[22px] px-6 text-xl font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2 border-black/10 dark:border-white/15">
                                                {row.amount ? `${row.amount} د.ل` : <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(due)} د.ل</span>}
                                            </button>
                                        </div>
                                        <div className="md:col-span-4 flex flex-col gap-2">
                                            <label className="text-xs font-black text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظة</label>
                                            <input value={row.notes} onChange={e => setRow(idx, 'notes', e.target.value)} placeholder="اختياري..."
                                                className="spatial-input h-16 rounded-[22px] px-6 text-lg font-bold border-2 border-black/10 dark:border-white/15" />
                                        </div>
                                        <div className="md:col-span-1 flex items-center justify-end">
                                            <button onClick={() => rows.length > 1 ? setRows(p => p.filter((_, i) => i !== idx)) : null} disabled={rows.length === 1}
                                                className="w-16 h-16 rounded-[22px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 border-2 border-red-500/20">
                                                <Trash2 className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex items-center gap-4 pt-2 border-t-2 border-purple-500/20">
                                    <button onClick={submitSettlements} disabled={submitting}
                                        className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] font-black text-xl disabled:opacity-50 shadow-lg">
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ الاسترداد'}
                                    </button>
                                    <button onClick={() => setShowForm(false)}
                                        className="h-16 px-8 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {(ret.settlements || []).length === 0 ? (
                            <p className="text-xl font-black text-slate-400 dark:text-white/30 py-8 text-center">لا توجد عمليات استرداد مسجلة لهذا المرتجع حتى الآن</p>
                        ) : (
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                            {['وسيلة الاسترداد', 'المبلغ', 'ملاحظة', 'التاريخ', 'الإجراءات'].map(h => (
                                                <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {(ret.settlements || []).map(s => (
                                            <tr key={s.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                                <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                    {s.payment_method?.name ?? '—'}
                                                </td>
                                                <td className="px-5 py-6 font-black text-purple-600 dark:text-purple-400 text-2xl">
                                                    {fmt(s.amount)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                </td>
                                                <td className="px-5 py-6 font-bold text-slate-500 dark:text-white/60 text-lg">
                                                    {s.notes ?? '—'}
                                                </td>
                                                <td className="px-5 py-6 text-slate-500 dark:text-white/60 font-bold text-lg whitespace-nowrap">
                                                    {fmtDate(s.created_at)}
                                                </td>
                                                <td className="px-5 py-6 text-center">
                                                    <DeleteModal
                                                        onConfirm={() => router.delete(`/supplier-settlements/${s.id}`, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="flex items-center gap-2 px-6 h-14 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base active:scale-95 shadow-md">
                                                                <Trash2 className="w-5 h-5" /> حذف
                                                            </button>
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>
                )}

                {ret.notes && (
                    <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-2">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">ملاحظات المرتجع</span>
                        <p className="font-bold text-slate-800 dark:text-white text-xl">{ret.notes}</p>
                    </div>
                )}
            </div>

            {/* NumberPad Modal */}
            <NumberPadModal
                isOpen={showPad}
                title={padTitle}
                initialValue={padInitial}
                maxValue={padMax}
                onClose={() => setShowPad(false)}
                onConfirm={v => { padCallback?.(v); setShowPad(false); }}
            />
        </AppShell>
    );
}
