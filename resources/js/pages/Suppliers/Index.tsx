import { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { AdminKpiCard, AdminFlashAlert, AdminFilterDrawer } from '@/components/admin';
import { matchesSearchText } from '@/lib/textUtils';
import { Plus, Pencil, Check, Truck, Power, SlidersHorizontal, RotateCcw } from 'lucide-react';

interface Supplier {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    is_active: boolean;
    total_purchases: string;
    total_paid: string;
    total_returns: string;
    total_settlements: string;
    total_debt: string;
    opening_balance: string;
}

interface Props {
    suppliers: Supplier[];
    flash?: { success?: string; error?: string };
}

const emptyForm = { name: '', phone: '', email: '', address: '', is_active: true };

export default function SuppliersIndex({ suppliers = [], flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    // Filter drawer state
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tempSearchQuery, setTempSearchQuery] = useState('');
    const [debtFilter, setDebtFilter] = useState<'all' | 'indebted' | 'clear'>('all');
    const [tempDebtFilter, setTempDebtFilter] = useState<'all' | 'indebted' | 'clear'>('all');

    const activeSuppliers = useMemo(() => suppliers.filter(s => s.is_active), [suppliers]);
    const inactiveSuppliers = useMemo(() => suppliers.filter(s => !s.is_active), [suppliers]);

    const hasFilter = searchQuery.trim() !== '' || debtFilter !== 'all';

    function applyFilter() {
        setSearchQuery(tempSearchQuery);
        setDebtFilter(tempDebtFilter);
        setFilterDrawerOpen(false);
    }

    function resetFilter() {
        setSearchQuery('');
        setTempSearchQuery('');
        setDebtFilter('all');
        setTempDebtFilter('all');
        setFilterDrawerOpen(false);
    }

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ name: '', phone: '', email: '', address: '', is_active: true });

    function startEdit(s: Supplier) {
        setEditingId(s.id);
        editForm.setData({ name: s.name, phone: s.phone, email: s.email ?? '', address: s.address ?? '', is_active: s.is_active });
    }

    function submitCreate() {
        createForm.post('/suppliers', {
            onSuccess: () => { createForm.reset(); setShowCreate(false); },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/suppliers/${id}`, {
            onSuccess: () => setEditingId(null),
        });
    }

    function toggleActive(supplier: Supplier) {
        router.put(`/suppliers/${supplier.id}`, {
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email ?? '',
            address: supplier.address ?? '',
            is_active: !supplier.is_active,
        });
    }

    function fmt(val: string | number) {
        const n = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    // Summary calculations
    const summary = useMemo(() => {
        let purchases = 0;
        let paid = 0;
        let debt = 0;
        let indebtedCount = 0;

        suppliers.forEach(s => {
            purchases += parseFloat(s.total_purchases) || 0;
            paid += parseFloat(s.total_paid) || 0;
            const d = parseFloat(s.total_debt) || 0;
            debt += d;
            if (d > 0) indebtedCount++;
        });

        return { purchases, paid, debt, indebtedCount };
    }, [suppliers]);

    const displayedSuppliers = useMemo(() => {
        const base = activeTab === 'active' ? activeSuppliers : inactiveSuppliers;
        return base.filter(s => {
            if (searchQuery.trim()) {
                const targetText = `${s.name} ${s.phone ?? ''} ${s.email ?? ''} ${s.address ?? ''}`;
                if (!matchesSearchText(searchQuery, targetText)) return false;
            }
            const d = parseFloat(s.total_debt) || 0;
            if (debtFilter === 'indebted' && d <= 0) return false;
            if (debtFilter === 'clear' && d > 0) return false;
            return true;
        });
    }, [activeTab, activeSuppliers, inactiveSuppliers, searchQuery, debtFilter]);

    return (
        <AppShell pageTitle="الموردون">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0 dir-rtl select-none">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">الموردون</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">إدارة بيانات الموردين ومتابعة المديونيات</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> إضافة مورد
                    </button>
                </div>

                {/* Flash Messages */}
                <AdminFlashAlert flash={flash} />

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <AdminKpiCard
                        title="إجمالي الموردين"
                        value={suppliers.length}
                        icon={<Truck className="w-5 h-5 text-primary" />}
                        subtitle="الموردين المسجلين"
                    />
                    <AdminKpiCard
                        title="إجمالي المشتريات"
                        value={fmt(summary.purchases)}
                        unit="د.ل"
                        icon={<Truck className="w-5 h-5 text-blue-500" />}
                        subtitle="المشتريات التراكمية"
                    />
                    <AdminKpiCard
                        title="إجمالي التحصيلات"
                        value={fmt(summary.paid)}
                        unit="د.ل"
                        icon={<Truck className="w-5 h-5 text-emerald-500" />}
                        highlightColor="text-emerald-600 dark:text-emerald-400"
                        subtitle="المسدد للموردين"
                    />
                    <AdminKpiCard
                        title="إجمالي الديون"
                        value={fmt(summary.debt)}
                        unit="د.ل"
                        icon={<Truck className="w-5 h-5 text-amber-500" />}
                        highlightColor={summary.debt > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}
                        subtitle={`${summary.indebtedCount} مورد دائن`}
                    />
                </div>

                {/* Create Form */}
                {showCreate && (
                    <SpatialCard title="مورد جديد" icon={<Plus className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-4 p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم *</label>
                                    <input
                                        value={createForm.data.name}
                                        onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: شركة عطرية"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2"
                                        autoFocus
                                    />
                                    {createForm.errors.name && <p className="text-sm text-red-500 font-bold mt-1">{createForm.errors.name}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">رقم الهاتف</label>
                                    <input
                                        value={createForm.data.phone}
                                        onChange={e => createForm.setData('phone', e.target.value)}
                                        placeholder="05xxxxxxxx"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2"
                                    />
                                    {createForm.errors.phone && <p className="text-sm text-red-500 font-bold mt-1">{createForm.errors.phone}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">البريد الإلكتروني (اختياري)</label>
                                    <input
                                        type="email"
                                        value={createForm.data.email}
                                        onChange={e => createForm.setData('email', e.target.value)}
                                        placeholder="example@email.com"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2"
                                    />
                                    {createForm.errors.email && <p className="text-sm text-red-500 font-bold mt-1">{createForm.errors.email}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">العنوان (اختياري)</label>
                                    <input
                                        value={createForm.data.address}
                                        onChange={e => createForm.setData('address', e.target.value)}
                                        placeholder="مثال: طرابلس"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-2 border-t border-primary/20">
                                <button
                                    type="button"
                                    onClick={submitCreate}
                                    disabled={createForm.processing}
                                    className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] font-black text-xl disabled:opacity-50 shadow-lg active:scale-95 cursor-pointer"
                                >
                                    <Check className="w-6 h-6" /> حفظ المورد
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowCreate(false); createForm.reset(); }}
                                    className="h-16 px-8 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white/80 font-black text-xl transition-all border-2 border-black/5 dark:border-white/10 active:scale-95 cursor-pointer"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs & Filter Bar */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setActiveTab('active')}
                                className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 cursor-pointer ${
                                    activeTab === 'active'
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'
                                }`}
                            >
                                <span>نشطون</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {activeSuppliers.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('inactive')}
                                className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 cursor-pointer ${
                                    activeTab === 'inactive'
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'
                                }`}
                            >
                                <span>موقوفون</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {inactiveSuppliers.length}
                                </span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasFilter && (
                                <button
                                    type="button"
                                    onClick={resetFilter}
                                    className="flex items-center gap-2.5 px-6 h-16 sm:h-20 rounded-[22px] font-black text-base sm:text-xl transition-all border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white active:scale-95 shadow-md cursor-pointer"
                                >
                                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> إعادة تعيين
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setTempSearchQuery(searchQuery); setTempDebtFilter(debtFilter); setFilterDrawerOpen(true); }}
                                className={`flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl transition-all border-2 active:scale-95 shadow-md cursor-pointer ${
                                    hasFilter ? 'bg-primary/15 border-primary text-primary shadow-primary/10' : 'spatial-input text-slate-800 dark:text-white hover:border-primary/40'
                                }`}
                            >
                                <SlidersHorizontal className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                <span>الفلترة</span>
                                {hasFilter && <span className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />}
                            </button>
                        </div>
                    </div>

                    {/* Suppliers Table / Cards */}
                    <SpatialCard title={`قائمة الموردين (${displayedSuppliers.length})`} icon={<Truck className="w-6 h-6 text-primary" />}>
                        {displayedSuppliers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">{activeTab === 'active' ? '🚚' : '⏸️'}</span>
                                <span className="font-black text-2xl">{activeTab === 'active' ? 'لا يوجد موردون نشطون' : 'لا يوجد موردون موقوفون'}</span>
                            </div>
                        ) : (
                            <> 
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                {['الاسم', 'الهاتف', 'إجمالي المشتريات', 'المدفوع', 'المرتجع', 'التسويات', 'رصيد سابق', 'المديونية', 'الحالة', 'الإجراءات'].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap first:rounded-r-[14px] last:rounded-l-[14px]">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayedSuppliers.map(supplier => (
                                                editingId === supplier.id ? (
                                                    <tr key={`edit-${supplier.id}`} className="bg-primary/5 dark:bg-primary/10">
                                                        <td colSpan={10} className="px-5 py-6">
                                                            <div className="flex flex-col gap-4 p-6 rounded-[22px] bg-white dark:bg-slate-900 border-2 border-primary/30 shadow-lg">
                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم *</label>
                                                                        <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)} className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                        {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الهاتف</label>
                                                                        <input value={editForm.data.phone} onChange={e => editForm.setData('phone', e.target.value)} className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                        {editForm.errors.phone && <p className="text-xs text-red-500 font-bold">{editForm.errors.phone}</p>}
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">البريد الإلكتروني</label>
                                                                        <input type="email" value={editForm.data.email} onChange={e => editForm.setData('email', e.target.value)} className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">العنوان</label>
                                                                        <input value={editForm.data.address} onChange={e => editForm.setData('address', e.target.value)} className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 pt-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => submitEdit(supplier.id)}
                                                                        disabled={editForm.processing}
                                                                        className="spatial-button h-14 px-6 rounded-[16px] font-black text-base flex items-center gap-2 cursor-pointer"
                                                                    >
                                                                        <Check className="w-5 h-5" /> حفظ التعديل
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingId(null)}
                                                                        className="h-14 px-6 rounded-[16px] bg-black/5 dark:bg-white/10 font-black text-base cursor-pointer"
                                                                    >
                                                                        إلغاء
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr key={supplier.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                            {supplier.name}
                                                            {supplier.address && <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">{supplier.address}</p>}
                                                        </td>
                                                        <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/70 text-xl whitespace-nowrap">{supplier.phone}</td>
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl whitespace-nowrap">{fmt(supplier.total_purchases)} <span className="text-sm font-bold text-slate-400">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-emerald-600 dark:text-emerald-400 text-2xl whitespace-nowrap">{fmt(supplier.total_paid)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-blue-500 text-2xl whitespace-nowrap">{fmt(supplier.total_returns)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-purple-500 text-2xl whitespace-nowrap">{fmt(supplier.total_settlements)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-slate-500 dark:text-white/60 text-xl whitespace-nowrap">{fmt(supplier.opening_balance)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 whitespace-nowrap">
                                                            <span className={`font-black text-2xl sm:text-3xl ${parseFloat(supplier.total_debt) > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                                {fmt(supplier.total_debt)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-6 whitespace-nowrap">
                                                            <span className={`text-base font-black px-4 py-2 rounded-[14px] ${supplier.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-black/5 dark:bg-white/8 text-slate-400'}`}>
                                                                {supplier.is_active ? 'نشط' : 'موقوف'}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-6 text-center whitespace-nowrap">
                                                            {supplier.id === 1 ? (
                                                                <span className="text-base font-black px-5 py-2.5 rounded-[16px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">افتراضي</span>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startEdit(supplier)}
                                                                        className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md cursor-pointer"
                                                                    >
                                                                        <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> تعديل
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleActive(supplier)}
                                                                        className={`flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 transition-all font-black text-base sm:text-xl active:scale-95 shadow-md cursor-pointer ${
                                                                            supplier.is_active
                                                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                                                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        <Power className="w-5 h-5 sm:w-6 sm:h-6" /> {supplier.is_active ? 'إيقاف' : 'تنشيط'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="flex flex-col gap-4 lg:hidden">
                                    {displayedSuppliers.map(supplier => (
                                        <div key={supplier.id} className="p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{supplier.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/60">{supplier.phone}</span>
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${supplier.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/8 text-slate-400'}`}>{supplier.is_active ? 'نشط' : 'موقوف'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><span className="text-xs font-black text-slate-500">إجمالي المشتريات</span><p className="font-black text-xl text-slate-800 dark:text-white">{fmt(supplier.total_purchases)} د.ل</p></div>
                                                <div><span className="text-xs font-black text-slate-500">المدفوع</span><p className="font-black text-xl text-emerald-600 dark:text-emerald-400">{fmt(supplier.total_paid)} د.ل</p></div>
                                                <div><span className="text-xs font-black text-slate-500">المرتجع</span><p className="font-black text-xl text-blue-500 dark:text-blue-400">{fmt(supplier.total_returns)} د.ل</p></div>
                                                <div><span className="text-xs font-black text-slate-500">التسويات</span><p className="font-black text-xl text-purple-500 dark:text-purple-400">{fmt(supplier.total_settlements)} د.ل</p></div>
                                                <div><span className="text-xs font-black text-slate-500">رصيد سابق</span><p className="font-black text-xl text-slate-500 dark:text-white/60">{fmt(supplier.opening_balance)} د.ل</p></div>
                                                <div><span className="text-xs font-black text-slate-500">المديونية</span><p className={`font-black ${parseFloat(supplier.total_debt) > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40'}`}>{fmt(supplier.total_debt)} د.ل</p></div>
                                            </div>
                                            <div className="flex items-center gap-3 pt-2">
                                                {supplier.id === 1 ? (
                                                    <span className="text-base font-black px-5 py-3 rounded-[18px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-full text-center">مورد افتراضي — لا يمكن تعديله</span>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(supplier)}
                                                            className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-lg active:scale-95 shadow-md cursor-pointer"
                                                        >
                                                            <Pencil className="w-5 h-5" /> تعديل
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleActive(supplier)}
                                                            className={`flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[20px] border-2 transition-all font-black text-base sm:text-lg active:scale-95 shadow-md cursor-pointer ${supplier.is_active ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                                                        > 
                                                            <Power className="w-5 h-5" /> {supplier.is_active ? 'إيقاف' : 'تنشيط'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </SpatialCard>
                </div>

            </div>

            {/* Reusable Admin Filter Drawer */}
            <AdminFilterDrawer
                isOpen={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                title="تصفية الموردين"
                searchQuery={tempSearchQuery}
                onSearchChange={setTempSearchQuery}
                searchPlaceholder="أدخل اسم المورد أو الهاتف..."
                searchLabel="بحث بالاسم أو الهاتف أو البريد"
                onApply={applyFilter}
                onReset={resetFilter}
            >
                {/* Debt Filter Options */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">حالة الدين</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'indebted', label: 'مدينون فقط' },
                            { id: 'clear', label: 'بدون ديون' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setTempDebtFilter(opt.id as any)}
                                className={`h-16 rounded-[18px] font-black text-lg transition-all border-2 cursor-pointer ${
                                    tempDebtFilter === opt.id
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 border-transparent hover:bg-black/10'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </AdminFilterDrawer>

        </AppShell>
    );
}
