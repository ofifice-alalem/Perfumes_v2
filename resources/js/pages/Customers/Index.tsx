import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import {
    Plus, Pencil, X, Check, Users, Power, Search,
    SlidersHorizontal, RotateCcw, Wallet, ShoppingBag, ArrowDownLeft
} from 'lucide-react';

interface Customer {
    id: number;
    name: string;
    phone: string | null;
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
    customers: Customer[];
    flash?: { success?: string; error?: string };
}

const emptyForm = { name: '', phone: '', email: '', address: '', is_active: true };

export default function CustomersIndex({ customers = [], flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    // Filter drawer state
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tempSearchQuery, setTempSearchQuery] = useState('');
    const [debtFilter, setDebtFilter] = useState<'all' | 'indebted' | 'clear'>('all');
    const [tempDebtFilter, setTempDebtFilter] = useState<'all' | 'indebted' | 'clear'>('all');

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ name: '', phone: '', email: '', address: '', is_active: true });

    // Active vs Inactive counts
    const activeCustomers   = useMemo(() => customers.filter(c => c.is_active), [customers]);
    const inactiveCustomers = useMemo(() => customers.filter(c => !c.is_active), [customers]);

    // Financial KPI Summary
    const summary = useMemo(() => {
        let purchases = 0;
        let paid = 0;
        let debt = 0;
        let indebtedCount = 0;

        customers.forEach(c => {
            purchases += parseFloat(c.total_purchases) || 0;
            paid += parseFloat(c.total_paid) || 0;
            const d = parseFloat(c.total_debt) || 0;
            debt += d;
            if (d > 0) indebtedCount++;
        });

        return { purchases, paid, debt, indebtedCount };
    }, [customers]);

    // Filtered customers logic
    const displayedCustomers = useMemo(() => {
        const baseList = activeTab === 'active' ? activeCustomers : inactiveCustomers;
        return baseList.filter(c => {
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = c.name.toLowerCase().includes(q);
                const matchesPhone = c.phone ? c.phone.includes(q) : false;
                const matchesEmail = c.email ? c.email.toLowerCase().includes(q) : false;
                if (!matchesName && !matchesPhone && !matchesEmail) return false;
            }

            // Debt filter
            const debt = parseFloat(c.total_debt) || 0;
            if (debtFilter === 'indebted' && debt <= 0) return false;
            if (debtFilter === 'clear' && debt > 0) return false;

            return true;
        });
    }, [activeTab, activeCustomers, inactiveCustomers, searchQuery, debtFilter]);

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

    function startEdit(c: Customer) {
        setEditingId(c.id);
        editForm.setData({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', is_active: c.is_active });
    }

    function submitCreate() {
        createForm.post('/customers', {
            onSuccess: () => { createForm.reset(); setShowCreate(false); },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/customers/${id}`, {
            onSuccess: () => setEditingId(null),
        });
    }

    function toggleActive(customer: Customer) {
        router.put(`/customers/${customer.id}`, {
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            address: customer.address ?? '',
            is_active: !customer.is_active,
        });
    }

    function fmt(val: string | number) {
        const n = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    return (
        <AppShell pageTitle="العملاء">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">إدارة العملاء</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل وإدارة بيانات العملاء ومتابعة الحسابات والديون</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowCreate(p => !p)}
                            className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl">
                            <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> عميل جديد
                        </button>
                    </div>
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

                {/* Financial KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <div className="spatial-card p-6 flex flex-col gap-2 rounded-[28px]">
                        <span className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> إجمالي العملاء
                        </span>
                        <span className="text-3xl sm:text-5xl font-black text-slate-800 dark:text-white">{customers.length}</span>
                    </div>

                    <div className="spatial-card p-6 flex flex-col gap-2 rounded-[28px]">
                        <span className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-blue-500" /> إجمالي المشتريات
                        </span>
                        <span className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white">{fmt(summary.purchases)} <span className="text-sm font-bold text-slate-400">د.ل</span></span>
                    </div>

                    <div className="spatial-card p-6 flex flex-col gap-2 rounded-[28px]">
                        <span className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> إجمالي التحصيلات
                        </span>
                        <span className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">{fmt(summary.paid)} <span className="text-sm font-bold opacity-75">د.ل</span></span>
                    </div>

                    <div className="spatial-card p-6 flex flex-col gap-2 rounded-[28px]">
                        <span className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-amber-500" /> إجمالي الديون القائمة
                        </span>
                        <span className={`text-2xl sm:text-4xl font-black ${summary.debt > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {fmt(summary.debt)} <span className="text-sm font-bold opacity-75">د.ل</span>
                        </span>
                    </div>
                </div>

                {/* Create Form */}
                {showCreate && (
                    <SpatialCard title="إضافة عميل جديد" icon={<Plus className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-6 p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">اسم العميل *</label>
                                    <input value={createForm.data.name} onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: خالد إبراهيم"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2" />
                                    {createForm.errors.name && <p className="text-sm text-red-500 font-bold mt-1">{createForm.errors.name}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">رقم الهاتف</label>
                                    <input value={createForm.data.phone} onChange={e => createForm.setData('phone', e.target.value)}
                                        placeholder="09xxxxxxxx"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2" />
                                    {createForm.errors.phone && <p className="text-sm text-red-500 font-bold mt-1">{createForm.errors.phone}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">البريد الإلكتروني (اختياري)</label>
                                    <input type="email" value={createForm.data.email} onChange={e => createForm.setData('email', e.target.value)}
                                        placeholder="example@email.com"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2" />
                                    {createForm.errors.email && <p className="text-sm text-red-500 font-bold mt-1">{createForm.errors.email}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">العنوان (اختياري)</label>
                                    <input value={createForm.data.address} onChange={e => createForm.setData('address', e.target.value)}
                                        placeholder="مثال: طرابلس"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-bold border-2" />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                                <button onClick={submitCreate} disabled={createForm.processing || !createForm.data.name}
                                    className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[20px] text-lg font-black disabled:opacity-40">
                                    <Check className="w-5 h-5" /> حفظ بيانات العميل
                                </button>
                                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                                    className="h-16 px-6 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all font-black text-lg">
                                    <X className="w-5 h-5 inline-block ml-1" /> إلغاء
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs & Filter Bar Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTab('active')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'active' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>العملاء النشطون</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {activeCustomers.length}
                                </span>
                            </button>
                            <button onClick={() => setActiveTab('inactive')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'inactive' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>العملاء الموقوفون</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {inactiveCustomers.length}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {hasFilter && (
                                <button onClick={resetFilter} className="flex items-center gap-2.5 px-6 h-16 sm:h-20 rounded-[22px] font-black text-base sm:text-xl transition-all border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white active:scale-95 shadow-md">
                                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span>إعادة تعيين</span>
                                </button>
                            )}
                            <button onClick={() => {
                                setTempSearchQuery(searchQuery);
                                setTempDebtFilter(debtFilter);
                                setFilterDrawerOpen(true);
                            }}
                                className={`flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl transition-all border-2 active:scale-95 shadow-md ${hasFilter ? 'bg-primary/15 border-primary text-primary shadow-primary/10' : 'spatial-input text-slate-800 dark:text-white hover:border-primary/40'}`}>
                                <SlidersHorizontal className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                <span>الفلترة</span>
                                {hasFilter && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Customers Table / List */}
                    <SpatialCard title={`سجل العملاء (${displayedCustomers.length})`} icon={<Users className="w-6 h-6 text-primary" />}>
                        {displayedCustomers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">{activeTab === 'active' ? '👥' : '⏸️'}</span>
                                <span className="font-black text-2xl">{activeTab === 'active' ? 'لا يوجد عملاء نشطون مطبق عليهم البحث' : 'لا يوجد عملاء موقوفون'}</span>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                                {['اسم العميل', 'رقم الهاتف', 'المشتريات', 'المدفوع', 'المرتجع', 'التسويات', 'رصيد سابق', 'الدين الحالي', 'الحالة', 'الإجراءات'].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayedCustomers.map(customer => (
                                                editingId === customer.id ? (
                                                    <tr key={`edit-${customer.id}`} className="bg-primary/5 dark:bg-primary/10">
                                                        <td colSpan={10} className="px-5 py-6">
                                                            <div className="flex flex-col gap-4 p-6 rounded-[22px] bg-white dark:bg-slate-900 border-2 border-primary/30 shadow-lg">
                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم *</label>
                                                                        <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)}
                                                                            className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                        {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الهاتف</label>
                                                                        <input value={editForm.data.phone} onChange={e => editForm.setData('phone', e.target.value)}
                                                                            className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">البريد الإلكتروني</label>
                                                                        <input type="email" value={editForm.data.email} onChange={e => editForm.setData('email', e.target.value)}
                                                                            className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <label className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">العنوان</label>
                                                                        <input value={editForm.data.address} onChange={e => editForm.setData('address', e.target.value)}
                                                                            className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 pt-2">
                                                                    <button onClick={() => submitEdit(customer.id)}
                                                                        className="px-6 h-12 rounded-[16px] bg-emerald-500 text-white flex items-center gap-2 hover:bg-emerald-600 font-black text-base transition-all shadow-md">
                                                                        <Check className="w-5 h-5" /> حفظ التعديل
                                                                    </button>
                                                                    <button onClick={() => setEditingId(null)}
                                                                        className="px-6 h-12 rounded-[16px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 flex items-center gap-2 hover:bg-black/10 font-black text-base transition-all">
                                                                        <X className="w-5 h-5" /> إلغاء
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr key={customer.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group">
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                            {customer.name}
                                                            {customer.address && <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">{customer.address}</p>}
                                                        </td>
                                                        <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/70 text-xl whitespace-nowrap">{customer.phone ?? '—'}</td>
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl whitespace-nowrap">{fmt(customer.total_purchases)} <span className="text-sm font-bold text-slate-400">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-emerald-600 dark:text-emerald-400 text-2xl whitespace-nowrap">{fmt(customer.total_paid)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-blue-500 text-2xl whitespace-nowrap">{fmt(customer.total_returns)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-purple-500 text-2xl whitespace-nowrap">{fmt(customer.total_settlements)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-slate-500 dark:text-white/60 text-xl whitespace-nowrap">{fmt(customer.opening_balance)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                        <td className="px-5 py-6 whitespace-nowrap">
                                                            <span className={`font-black text-2xl sm:text-3xl ${parseFloat(customer.total_debt) > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {fmt(customer.total_debt)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-6 whitespace-nowrap">
                                                            <span className={`text-base font-black px-4 py-2 rounded-[14px] ${customer.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-black/5 dark:bg-white/8 text-slate-400 border border-black/5'}`}>
                                                                {customer.is_active ? 'نشط' : 'موقوف'}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-6 text-center whitespace-nowrap">
                                                            {customer.id === 1 ? (
                                                                <span className="text-base font-black px-5 py-2.5 rounded-[16px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">افتراضي</span>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <button onClick={() => startEdit(customer)}
                                                                        className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                        <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> تعديل
                                                                    </button>
                                                                    <button onClick={() => toggleActive(customer)}
                                                                        className={`flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 transition-all font-black text-base sm:text-xl active:scale-95 shadow-md ${
                                                                            customer.is_active
                                                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                                                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                                        }`}>
                                                                        <Power className="w-5 h-5 sm:w-6 sm:h-6" /> {customer.is_active ? 'إيقاف' : 'تنشيط'}
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
                                    {displayedCustomers.map(customer => (
                                        <div key={customer.id} className="p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{customer.name}</span>
                                                    {customer.phone && <p className="text-lg font-bold text-slate-500 dark:text-white/60 mt-0.5">{customer.phone}</p>}
                                                </div>
                                                <span className={`text-base font-black px-4 py-2 rounded-[14px] ${customer.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/8 text-slate-400'}`}>
                                                    {customer.is_active ? 'نشط' : 'موقوف'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/5">
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">إجمالي المشتريات</span>
                                                    <p className="font-black text-xl text-slate-800 dark:text-white">{fmt(customer.total_purchases)} د.ل</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">الدين الحالي</span>
                                                    <p className={`font-black text-xl ${parseFloat(customer.total_debt) > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {fmt(customer.total_debt)} د.ل
                                                    </p>
                                                </div>
                                            </div>

                                            {customer.id !== 1 && (
                                                <div className="flex items-center gap-3 pt-2">
                                                    <button onClick={() => startEdit(customer)}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-18 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg sm:text-xl shadow-md active:scale-95">
                                                        <Pencil className="w-6 h-6" /> تعديل
                                                    </button>
                                                    <button onClick={() => toggleActive(customer)}
                                                        className={`flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-18 rounded-[22px] border-2 font-black text-lg sm:text-xl transition-all shadow-md active:scale-95 ${
                                                            customer.is_active
                                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                        }`}>
                                                        <Power className="w-6 h-6" /> {customer.is_active ? 'إيقاف' : 'تنشيط'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </SpatialCard>
                </div>

            </div>

            {/* Portal Slide-Over Filter Drawer */}
            {filterDrawerOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setFilterDrawerOpen(false)} />
                    <div className="relative w-full sm:w-[560px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-[-24px_0_60px_rgba(0,0,0,0.4)] flex flex-col z-10 border-l-2 border-black/10 dark:border-white/10 animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <SlidersHorizontal className="w-7 h-7 text-primary" />
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">تصفية العملاء</h2>
                            </div>
                            <button onClick={() => setFilterDrawerOpen(false)}
                                className="w-12 h-12 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-500 dark:text-white/70 flex items-center justify-center transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Drawer Form Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {/* Search Query Input */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">بحث بالاسم أو الهاتف أو البريد</label>
                                <div className="relative">
                                    <input value={tempSearchQuery} onChange={e => setTempSearchQuery(e.target.value)}
                                        placeholder="أدخل اسم العميل أو الهاتف..."
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 pl-14 text-xl font-bold border-2 w-full" />
                                    <Search className="w-6 h-6 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            {/* Debt Filter Options */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">حالة الدين</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'all', label: 'الكل' },
                                        { id: 'indebted', label: 'مدينون فقط' },
                                        { id: 'clear', label: 'بدون ديون' },
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => setTempDebtFilter(opt.id as any)}
                                            className={`h-16 rounded-[18px] font-black text-lg transition-all border-2 ${
                                                tempDebtFilter === opt.id
                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                    : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 border-transparent hover:bg-black/10'
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-8 border-t border-black/5 dark:border-white/10 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={applyFilter}
                                className="spatial-button flex-1 h-16 sm:h-20 rounded-[22px] text-xl font-black shadow-xl flex items-center justify-center gap-3">
                                <Check className="w-6 h-6" /> تطبيق الفلتر
                            </button>
                            <button onClick={resetFilter}
                                className="h-16 sm:h-20 px-6 rounded-[22px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black text-lg transition-all border-2 border-red-500/20">
                                إعادة تعيين
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AppShell>
    );
}
