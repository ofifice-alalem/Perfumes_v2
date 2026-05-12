import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { RefreshCw, ChevronLeft, AlertTriangle, Users, Truck, Package, CreditCard, BarChart2, Trash2 } from 'lucide-react';

interface Period { id: number; name: string; started_at: string; }

interface CustomerRow { id: number; name: string; balance: number; }
interface SupplierRow { id: number; name: string; balance: number; }
interface ProductRow  { id: number; name: string; stock: number; }
interface WasteProductRow { id: number; name: string; quantity: number; }
interface PaymentMethodRow { id: number; name: string; balance: number; }
interface Stats {
    total_sales: number; total_purchases: number;
    total_returns_in: number; total_returns_out: number;
    total_waste: number; total_paid_in: number; total_paid_out: number;
    invoices_count: number; purchases_count: number; new_customers: number;
}

interface Preview {
    customers: CustomerRow[];
    suppliers: SupplierRow[];
    products: ProductRow[];
    waste_products: WasteProductRow[];
    payment_methods: PaymentMethodRow[];
    stats: Stats;
}

interface Props {
    currentPeriod: Period;
    preview: Preview;
    flash?: { success?: string; error?: string };
}

function fmt(v: number) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string) {
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
}

export default function PeriodsRollover({ currentPeriod, preview, flash }: Props) {
    const [newName, setNewName] = useState('');
    const [notes, setNotes] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [processing, setProcessing] = useState(false);

    function submit() {
        if (!newName.trim()) { alert('اسم الفترة الجديدة مطلوب'); return; }
        if (!confirmed) { alert('يجب تأكيد التدوير أولاً'); return; }

        setProcessing(true);
        router.post('/periods/execute', { new_period_name: newName, notes }, {
            onFinish: () => setProcessing(false),
        });
    }

    const statLabels: Record<string, string> = {
        total_sales: 'إجمالي المبيعات', total_purchases: 'إجمالي المشتريات',
        total_returns_in: 'مرتجعات العملاء', total_returns_out: 'مرتجعات الموردين',
        total_waste: 'قيمة التالف', total_paid_in: 'مقبوضات العملاء',
        total_paid_out: 'مدفوعات الموردين', invoices_count: 'عدد الفواتير',
        purchases_count: 'عدد المشتريات', new_customers: 'عملاء جدد',
    };

    return (
        <AppShell pageTitle="تنفيذ التدوير">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div className="flex items-center gap-3">
                    <Link href="/periods"
                        className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 flex items-center justify-center transition-all">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تنفيذ التدوير</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">
                            إغلاق فترة <strong>{currentPeriod.name}</strong> وفتح فترة جديدة
                        </p>
                    </div>
                </div>

                {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* Warning Banner */}
                <div className="px-5 py-4 rounded-[18px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                        سيتم إغلاق الفترة الحالية وفتح فترة جديدة.<br />
                        البيانات القديمة ستبقى محفوظة ويمكن الرجوع إليها في التقارير.
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_400px] gap-6">
                    {/* Preview Section */}
                    <div className="flex flex-col gap-6">

                        {/* Customer Balances */}
                        <SpatialCard title={`ديون العملاء (${preview.customers.length})`} icon={<Users className="w-4 h-4" />}>
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">العميل</th>
                                            <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {preview.customers.map(c => (
                                            <tr key={c.id} className="hover:bg-black/3 dark:hover:bg-white/3">
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{c.name}</td>
                                                <td className={`px-4 py-2 font-black ${c.balance > 0 ? 'text-red-500' : c.balance < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                    {fmt(c.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>

                        {/* Supplier Balances */}
                        <SpatialCard title={`ديون الموردين (${preview.suppliers.length})`} icon={<Truck className="w-4 h-4" />}>
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">المورد</th>
                                            <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {preview.suppliers.map(s => (
                                            <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3">
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{s.name}</td>
                                                <td className={`px-4 py-2 font-black ${s.balance > 0 ? 'text-red-500' : s.balance < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                    {fmt(s.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>

                        {/* Product Stocks */}
                        <SpatialCard title={`المخزون (${preview.products.length})`} icon={<Package className="w-4 h-4" />}>
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">المنتج</th>
                                            <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">الكمية</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {preview.products.map(p => (
                                            <tr key={p.id} className="hover:bg-black/3 dark:hover:bg-white/3">
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{p.name}</td>
                                                <td className="px-4 py-2 font-black text-slate-700 dark:text-white/80">{p.stock}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>

                        {/* Waste Products */}
                        <SpatialCard title={`التالف (${preview.waste_products.length} منتج)`} icon={<Trash2 className="w-4 h-4 text-red-500" />}>
                            {preview.waste_products.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-slate-400 dark:text-white/30 font-bold text-sm">لا يوجد تالف في هذه الفترة</div>
                            ) : (
                                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">المنتج</th>
                                                <th className="text-right px-4 py-2 text-xs font-black text-slate-500 dark:text-white/40">الكمية التالفة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {preview.waste_products.map(p => (
                                                <tr key={p.id} className="hover:bg-black/3 dark:hover:bg-white/3">
                                                    <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{p.name}</td>
                                                    <td className="px-4 py-2 font-black text-red-500">{p.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>

                        {/* Payment Methods */}
                        <SpatialCard title="الخزينة" icon={<CreditCard className="w-4 h-4" />}>
                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                                {preview.payment_methods.map(pm => (
                                    <div key={pm.id} className="flex items-center justify-between px-4 py-3">
                                        <span className="font-bold text-slate-700 dark:text-white/80">{pm.name}</span>
                                        <span className={`font-black ${pm.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                            {fmt(pm.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </SpatialCard>

                        {/* Stats */}
                        <SpatialCard title="ملخص الفترة" icon={<BarChart2 className="w-4 h-4" />}>
                            <div className="grid grid-cols-2 gap-3 p-1">
                                {Object.entries(preview.stats).map(([key, val]) => (
                                    <div key={key} className="flex flex-col gap-1 px-4 py-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">{statLabels[key] ?? key}</span>
                                        <span className="font-black text-slate-800 dark:text-white">
                                            {typeof val === 'number' && !['invoices_count', 'purchases_count', 'new_customers'].includes(key)
                                                ? fmt(val)
                                                : val}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </SpatialCard>
                    </div>

                    {/* Confirm Section */}
                    <div className="flex flex-col gap-5">
                        <SpatialCard title="تأكيد التدوير" icon={<RefreshCw className="w-4 h-4" />}>
                            <div className="flex flex-col gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">
                                        اسم الفترة الجديدة <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full h-12 rounded-[14px] spatial-input text-right font-bold text-slate-800 dark:text-white px-4"
                                        placeholder="مثال: 2026"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">ملاحظات (اختياري)</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full h-24 rounded-[14px] spatial-input text-right font-bold text-slate-800 dark:text-white resize-none p-4"
                                        placeholder="ملاحظات عن التدوير..."
                                    />
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={confirmed}
                                        onChange={e => setConfirmed(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm font-bold text-slate-600 dark:text-white/60 leading-relaxed">
                                        أؤكد أنني أريد إغلاق الفترة الحالية وفتح فترة جديدة. هذا الإجراء لا يمكن التراجع عنه.
                                    </span>
                                </label>

                                <button
                                    onClick={submit}
                                    disabled={!newName.trim() || !confirmed || processing}
                                    className="w-full h-12 rounded-[14px] bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className={`w-5 h-5 ${processing ? 'animate-spin' : ''}`} />
                                    {processing ? 'جاري التدوير...' : 'تنفيذ التدوير'}
                                </button>
                            </div>
                        </SpatialCard>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
