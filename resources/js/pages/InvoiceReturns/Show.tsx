import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, RefreshCw, RotateCcw, User } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Customer      { id: number; name: string; total_debt: string; }
interface ReturnItem    { id: number; product: Product; size: { label: string } | null; quantity: string; unit_price: string; line_total: string; }
interface Settlement    { id: number; payment_method: { name: string }; amount: string; notes: string | null; created_at: string; }
interface InvoiceReturn {
    id: number; customer: Customer; invoice: { id: number } | null;
    total: string; recovered_amount: string; due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null; created_at: string; deleted_at: string | null;
    items: ReturnItem[]; settlements: Settlement[];
}
interface Props {
    return:         InvoiceReturn;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface SettlementRow { payment_method_id: string; amount: string; notes: string; }
const emptyRow = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'مسترد جزئياً', paid: 'مسترد بالكامل' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

export default function InvoiceReturnsShow({ return: ret, paymentMethods, flash }: Props) {
    const [activeTab,  setActiveTab]  = useState<'items' | 'settlements'>('items');
    const [showForm,   setShowForm]   = useState(false);
    const [rows,       setRows]       = useState<SettlementRow[]>([emptyRow()]);
    const [submitting, setSubmitting] = useState(false);

    // NumberPad
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max); setPadCallback(() => cb); setShowPad(true);
    }

    const methodOptions = paymentMethods.map(m => ({ label: m.name }));
    const due           = parseFloat(ret.due_recovery);
    const rowsTotal     = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const isCancelled   = !!ret.deleted_at;
    const customerDebt  = parseFloat(ret.customer.total_debt ?? '0');
    const customerIsCash = ret.customer.id === 1;
    const maxSettlementLimit = Math.min(due, Math.abs(customerDebt < 0 ? customerDebt : 0));
    // التسوية مسموحة فقط إذا كان العميل دائناً (رصيد سالب) وغير نقدي وغير ملغي
    const canSettle     = !customerIsCash && !isCancelled && ret.recovery_status !== 'paid' && customerDebt < 0;

    // رسالة توضيحية لحالة عدم السماح بالتسوية
    const settlementMessage = (() => {
        if (isCancelled) return null;
        if (customerIsCash) return 'لا يمكن إنشاء تسوية للزبون النقدي';
        if (ret.recovery_status === 'paid') return 'تم استرداد المرتجع بالكامل';
        if (customerDebt >= 0) return `العميل لا يزال مديناً (${fmt(customerDebt)} د.ل)`;
        return null;
    })();

    function resolveMethodId(label: string) { return String(paymentMethods.find(m => m.name === label)?.id ?? ''); }
    function setRow(idx: number, field: keyof SettlementRow, val: string) {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submitSettlements() {
        const valid = rows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);
        function postNext(i: number) {
            if (i >= valid.length) { setSubmitting(false); setRows([emptyRow()]); setShowForm(false); return; }
            const row = valid[i];
            router.post('/settlements', {
                customer_id:        String(ret.customer.id),
                invoice_id:         ret.invoice ? String(ret.invoice.id) : null,
                invoice_return_id:  String(ret.id),
                payment_method_id:  row.payment_method_id,
                amount:             row.amount,
                notes:              row.notes || null,
            }, { preserveScroll: true, onSuccess: () => postNext(i + 1), onError: () => setSubmitting(false) });
        }
        postNext(0);
    }

    const tabs = [
        { key: 'items',       label: `المنتجات المرتجعة (${ret.items.length})` },
        { key: 'settlements', label: `التسويات (${ret.settlements.length})` },
    ] as const;

    return (
        <>
        <AppShell pageTitle={`مرتجع #${ret.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <Link href="/invoice-returns" className="flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] bg-black/6 dark:bg-white/8 text-slate-700 dark:text-white/80 hover:bg-black/12 dark:hover:bg-white/15 transition-all shrink-0 border-2 border-black/5 dark:border-white/10 font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
                            <span>رجوع للمرتجعات</span>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl sm:text-5xl font-black text-slate-800 dark:text-white">مرتجع #{ret.id}</h1>
                                {!isCancelled && (
                                    <span className={`text-lg sm:text-xl font-black px-5 py-2 rounded-[14px] ${recoveryClass[ret.recovery_status]}`}>
                                        {recoveryLabel[ret.recovery_status]}
                                    </span>
                                )}
                                {isCancelled && <span className="text-lg sm:text-xl font-black px-5 py-2 rounded-[14px] bg-red-500/10 text-red-500">ملغي</span>}
                            </div>
                            <p className="text-base sm:text-xl font-bold text-slate-400 dark:text-white/40 mt-1">{ret.customer.name}</p>
                        </div>
                    </div>
                    {isCancelled && (
                        <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`)}
                            className="flex items-center gap-3 px-7 sm:px-9 h-16 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg sm:text-xl active:scale-95 shadow-md">
                            <RotateCcw className="w-6 h-6" /> استعادة
                        </button>
                    )}
                </div>

                {flash?.success && <div className="px-6 py-4 rounded-[22px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg sm:text-xl">{flash.success}</div>}
                {flash?.error   && <div className="px-6 py-4 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg sm:text-xl">{flash.error}</div>}

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {[
                        { label: 'إجمالي المرتجع',   value: `${fmt(ret.total)} د.ل`,            color: 'text-orange-500' },
                        { label: 'المسترد',           value: `${fmt(ret.recovered_amount)} د.ل`, color: 'text-purple-500' },
                        { label: 'المتبقي',           value: `${fmt(ret.due_recovery)} د.ل`,     color: due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40' },
                        { label: 'الفاتورة المرجعية', value: ret.invoice ? `#${ret.invoice.id}` : 'مستقل', color: 'text-slate-800 dark:text-white' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-6 flex flex-col gap-2 rounded-[28px] border-2">
                            <span className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider">{s.label}</span>
                            {s.label === 'الفاتورة المرجعية' && ret.invoice ? (
                                <Link href={`/invoices/${ret.invoice.id}`} className={`text-2xl sm:text-4xl font-black ${s.color} hover:underline`}>{s.value}</Link>
                            ) : (
                                <span className={`text-2xl sm:text-4xl font-black ${s.color}`}>{s.value}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Customer Info Card */}
                {ret.customer && (
                    <SpatialCard title="بيانات العميل" icon={<User className="w-6 h-6 text-primary" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-2">
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">اسم العميل</p>
                                <Link href={`/customers/${ret.customer.id}`} className="font-black text-2xl sm:text-3xl text-slate-800 dark:text-white hover:text-primary transition-colors">
                                    {ret.customer.name}
                                </Link>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">إجمالي الدين الحالي</p>
                                <p className={`font-black text-2xl sm:text-3xl ${customerDebt > 0 ? 'text-amber-500' : customerDebt < 0 ? 'text-purple-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmt(customerDebt)} د.ل
                                </p>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs */}
                <div className="flex gap-2.5 p-2 rounded-[24px] bg-black/5 dark:bg-white/5 border-2 border-black/8 dark:border-white/10 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`flex-1 min-w-max px-8 h-16 sm:h-20 rounded-[20px] font-black text-lg sm:text-2xl transition-all whitespace-nowrap border-2 ${activeTab === t.key ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white border-primary shadow-lg scale-[1.01]' : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Items */}
                {activeTab === 'items' && (
                    <SpatialCard title={`المنتجات المرتجعة (${ret.items.length})`} icon={<Package className="w-6 h-6 text-primary" />}>
                        {(() => {
                            const groups = ret.items.reduce((acc, item) => {
                                const key = `${item.product.id}-${item.size?.label ?? 'null'}-${item.unit_price}`;
                                if (!acc[key]) {
                                    acc[key] = { name: item.product.name, size_label: item.size?.label ?? null, unit_price: item.unit_price, count: 1, quantity: parseFloat(item.quantity), total: parseFloat(item.line_total) };
                                } else {
                                    acc[key].count++;
                                    acc[key].quantity += parseFloat(item.quantity);
                                    acc[key].total += parseFloat(item.line_total);
                                }
                                return acc;
                            }, {} as Record<string, any>);

                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                                {['عدد', 'المنتج', 'الحجم', 'السعر', 'الإجمالي'].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {Object.values(groups).map((g: any, idx: number) => {
                                                const displayCount = g.count === 1 ? g.quantity : g.count;
                                                return (
                                                    <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                                        <td className="px-5 py-6">
                                                            <span className="px-5 py-2.5 rounded-[16px] bg-primary/10 text-primary font-black text-2xl">{displayCount}</span>
                                                        </td>
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{g.name}</td>
                                                        <td className="px-5 py-6 font-black text-slate-700 dark:text-white/80 text-xl">
                                                            {g.size_label
                                                                ? <span className="px-4 py-1.5 rounded-full bg-primary text-white text-lg font-black">{g.size_label}</span>
                                                                : <span className="text-slate-400 text-xl">—</span>}
                                                        </td>
                                                        <td className="px-5 py-6 font-black text-slate-700 dark:text-white/80 text-2xl sm:text-3xl">{fmt(g.unit_price)} <span className="text-sm font-bold">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-orange-500 text-2xl sm:text-3xl">{fmt(g.total)} <span className="text-sm font-bold">د.ل</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </SpatialCard>
                )}

                {/* Tab: Settlements */}
                {activeTab === 'settlements' && (
                    <SpatialCard title={`التسويات المسجلة (${ret.settlements.length})`} icon={<RefreshCw className="w-6 h-6 text-primary" />}
                        action={
                            canSettle && (
                                <button onClick={() => { setShowForm(p => !p); setRows([emptyRow()]); }}
                                    className="spatial-button flex items-center gap-3 px-6 h-14 rounded-[20px] text-lg font-black shadow-lg">
                                    <Plus className="w-6 h-6" /> تسجيل تسوية
                                </button>
                            )
                        }
                    >
                        {settlementMessage && (
                            <div className="mb-6 px-6 py-4 rounded-[22px] bg-amber-500/10 border-2 border-amber-500/20 flex items-center gap-3">
                                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                    ⚠️ {settlementMessage}
                                </span>
                            </div>
                        )}
                        {showForm && (
                            <div className="mb-6 p-6 rounded-[28px] bg-purple-500/5 border-2 border-purple-500/20 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-slate-800 dark:text-white text-xl">تسجيل تسوية جديدة للمرتجع</span>
                                    <button onClick={() => setRows(p => [...p, emptyRow()])}
                                        className="flex items-center gap-2 px-5 h-12 rounded-[16px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-black text-base border-2 border-purple-500/20">
                                        <Plus className="w-5 h-5" /> إضافة وسيلة دفع
                                    </button>
                                </div>
                                {rows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-end p-4 rounded-[22px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                                        <ModernSelect label="وسيلة التسوية" options={methodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                            onSelect={val => setRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                        <div className="flex flex-col gap-2 w-48">
                                            <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                            <button onClick={() => {
                                                const max = maxSettlementLimit - rows.reduce((sum, r, i) => i === idx ? sum : sum + (parseFloat(r.amount) || 0), 0);
                                                openPad('المبلغ', row.amount || fmt(maxSettlementLimit), v => {
                                                    const val = parseFloat(v) || 0;
                                                    setRow(idx, 'amount', val > max ? String(max) : v);
                                                }, max);
                                            }}
                                                className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2">
                                                {row.amount ? (
                                                    <span>{fmt(row.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(maxSettlementLimit)} د.ل</span>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                            <input value={row.notes} onChange={e => setRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..." className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-lg font-bold border-2" />
                                        </div>
                                        <button onClick={() => rows.length > 1 ? setRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={rows.length === 1}
                                            className="w-16 h-16 sm:h-20 rounded-[22px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border-2 border-red-500/20">
                                            <Trash2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                                        </button>
                                    </div>
                                ))}
                                {rows.length > 1 && (
                                    <div className="flex items-center justify-between px-4 py-2 bg-black/3 dark:bg-white/3 rounded-[16px]">
                                        <span className="font-black text-slate-700 dark:text-white/80 text-lg">إجمالي هذه التسوية</span>
                                        <span className="font-black text-purple-500 text-2xl">{fmt(rowsTotal)} د.ل</span>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button onClick={submitSettlements} disabled={submitting}
                                        className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] text-lg font-black disabled:opacity-50 shadow-lg">
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ التسوية'}
                                    </button>
                                    <button onClick={() => setShowForm(false)} className="h-16 px-8 rounded-[22px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-white/60 font-black text-lg transition-all">إلغاء</button>
                                </div>
                            </div>
                        )}

                        {ret.settlements.length === 0 ? (
                            <p className="text-xl font-bold text-slate-400 dark:text-white/30 py-8 text-center">لا توجد تسويات مسجلة لهذا المرتجع</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                            {['وسيلة التسوية', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                                <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {ret.settlements.map(s => (
                                            <tr key={s.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                                <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{s.payment_method.name}</td>
                                                <td className="px-5 py-6 font-black text-purple-500 text-2xl sm:text-3xl">{fmt(s.amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                <td className="px-5 py-6 text-slate-600 dark:text-white/60 font-bold text-lg">{s.notes ?? '—'}</td>
                                                <td className="px-5 py-6 text-slate-700 dark:text-white/80 whitespace-nowrap font-black text-xl">
                                                    <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{fmtDate(s.created_at)}</span>
                                                </td>
                                                <td className="px-5 py-6 text-center">
                                                    <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="inline-flex items-center justify-center gap-2 px-5 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl shadow-md active:scale-95 whitespace-nowrap">
                                                                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                <span>حذف التسوية</span>
                                                            </button>
                                                        } />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>
                )}

                {/* Notes */}
                {ret.notes && (
                    <div className="px-8 py-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                        <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">ملاحظات المرتجع</p>
                        <p className="font-black text-xl sm:text-2xl text-slate-800 dark:text-white/90">{ret.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>

        <NumberPadModal
            isOpen={showPad}
            title={padTitle}
            initialValue={padInitial}
            maxValue={padMax}
            onClose={() => setShowPad(false)}
            onConfirm={v => { padCallback?.(v); setShowPad(false); }}
        />
        </>
    );
}
