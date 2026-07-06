import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, X, Check, Truck, Power } from 'lucide-react';

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

export default function SuppliersIndex({ suppliers, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    const activeSuppliers = suppliers.filter(s => s.is_active);
    const inactiveSuppliers = suppliers.filter(s => !s.is_active);
    const filtered = activeTab === 'active' ? activeSuppliers : inactiveSuppliers;

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

    function fmt(val: string) {
        const n = parseFloat(val);
        return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    return (
        <AppShell pageTitle="الموردون">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">الموردون</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة بيانات الموردين ومتابعة المديونيات</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> إضافة مورد
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* Create Form */}
                {showCreate && (
                    <SpatialCard title="مورد جديد" icon={<Plus className="w-4 h-4" />}>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم</label>
                                    <input value={createForm.data.name} onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: شركة العطور الدولية"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[16px] font-bold" />
                                    {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">رقم الهاتف</label>
                                    <input value={createForm.data.phone} onChange={e => createForm.setData('phone', e.target.value)}
                                        placeholder="05xxxxxxxx"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[16px] font-bold" />
                                    {createForm.errors.phone && <p className="text-xs text-red-500 font-bold">{createForm.errors.phone}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">البريد الإلكتروني (اختياري)</label>
                                    <input type="email" value={createForm.data.email} onChange={e => createForm.setData('email', e.target.value)}
                                        placeholder="example@email.com"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[16px] font-bold" />
                                    {createForm.errors.email && <p className="text-xs text-red-500 font-bold">{createForm.errors.email}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">العنوان (اختياري)</label>
                                    <input value={createForm.data.address} onChange={e => createForm.setData('address', e.target.value)}
                                        placeholder="مثال: الرياض"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[16px] font-bold" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button onClick={submitCreate} disabled={createForm.processing}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                    <Check className="w-4 h-4" /> حفظ
                                </button>
                                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                                    className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${
                            activeTab === 'active'
                                ? 'bg-primary text-white'
                                : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'
                        }`}
                    >
                        نشطون ({activeSuppliers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('inactive')}
                        className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${
                            activeTab === 'inactive'
                                ? 'bg-primary text-white'
                                : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'
                        }`}
                    >
                        موقوفون ({inactiveSuppliers.length})
                    </button>
                </div>

                {/* List */}
                <SpatialCard title={`الموردون (${filtered.length})`} icon={<Truck className="w-4 h-4" />}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">{activeTab === 'active' ? '🚚' : '⏸️'}</span>
                            <span className="font-bold">{activeTab === 'active' ? 'لا يوجد موردون نشطون' : 'لا يوجد موردون موقوفون'}</span>
                        </div>
                    ) : (
                        <>
                            {/* جدول — PC */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-[16px]">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['الاسم', 'الهاتف', 'إجمالي المشتريات', 'المدفوع', 'المرتجع', 'التسويات', 'رصيد سابق', 'المديونية', 'الحالة', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap first:rounded-r-[14px] last:rounded-l-[14px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {filtered.map(supplier => (
                                            editingId === supplier.id ? (
                                                <tr key={`edit-${supplier.id}`}>
                                                    <td colSpan={10} className="px-4 py-4">
                                                        <div className="flex flex-col gap-3 p-4 rounded-[16px] bg-primary/5 dark:bg-primary/10 border border-primary/20">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم</label>
                                                                    <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)}
                                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                    {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الهاتف</label>
                                                                    <input value={editForm.data.phone} onChange={e => editForm.setData('phone', e.target.value)}
                                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                    {editForm.errors.phone && <p className="text-xs text-red-500 font-bold">{editForm.errors.phone}</p>}
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">البريد</label>
                                                                    <input type="email" value={editForm.data.email} onChange={e => editForm.setData('email', e.target.value)}
                                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">العنوان</label>
                                                                    <input value={editForm.data.address} onChange={e => editForm.setData('address', e.target.value)}
                                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <label className="flex items-center gap-2 cursor-pointer select-none h-10 px-3 rounded-[12px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                                                    <span className="text-xs font-bold text-slate-600 dark:text-white/60">نشط</span>
                                                                    <div onClick={() => editForm.setData('is_active', !editForm.data.is_active)}
                                                                        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${editForm.data.is_active ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                                                                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.data.is_active ? '-translate-x-4' : 'translate-x-0'}`} />
                                                                    </div>
                                                                </label>
                                                                <button onClick={() => submitEdit(supplier.id)}
                                                                    className="w-10 h-10 rounded-[12px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all">
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => setEditingId(null)}
                                                                    className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 flex items-center justify-center hover:bg-black/10 transition-all">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={supplier.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                    <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">{supplier.name}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/60 whitespace-nowrap">{supplier.phone}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="font-black text-slate-700 dark:text-white/80">{fmt(supplier.total_purchases)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(supplier.total_paid)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="font-black text-blue-500 dark:text-blue-400">{fmt(supplier.total_returns)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="font-black text-purple-500 dark:text-purple-400">{fmt(supplier.total_settlements)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="font-black text-slate-500 dark:text-white/60">{fmt(supplier.opening_balance)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className={`font-black ${parseFloat(supplier.total_debt) > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                            {fmt(supplier.total_debt)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${supplier.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/8 text-slate-400 dark:text-white/40'}`}>
                                                            {supplier.is_active ? 'نشط' : 'موقوف'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {supplier.id === 1 ? (
                                                            <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400">افتراضي</span>
                                                        ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => startEdit(supplier)}
                                                                className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                <Pencil className="w-3 h-3" /> تعديل
                                                            </button>
                                                            <button onClick={() => toggleActive(supplier)}
                                                                className={`flex items-center gap-1.5 px-3 h-8 rounded-[10px] border transition-all font-bold text-xs ${
                                                                    supplier.is_active
                                                                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                                }`}>
                                                                <Power className="w-3 h-3" /> {supplier.is_active ? 'إيقاف' : 'تنشيط'}
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

                            {/* كاردات — Mobile */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {filtered.map(supplier => (
                                    editingId === supplier.id ? (
                                        <div key={supplier.id} className="rounded-[24px] border border-primary/25 overflow-hidden">
                                            <div className="px-5 py-3 bg-primary/5 flex items-center justify-between">
                                                <span className="font-black text-slate-700 dark:text-white/80 text-sm">تعديل: {supplier.name}</span>
                                                <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/8 flex items-center justify-center text-slate-400">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-3 p-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم</label>
                                                    <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)}
                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[16px] font-bold" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الهاتف</label>
                                                    <input value={editForm.data.phone} onChange={e => editForm.setData('phone', e.target.value)}
                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[16px] font-bold" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">البريد</label>
                                                    <input type="email" value={editForm.data.email} onChange={e => editForm.setData('email', e.target.value)}
                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[16px] font-bold" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">العنوان</label>
                                                    <input value={editForm.data.address} onChange={e => editForm.setData('address', e.target.value)}
                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[16px] font-bold" />
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer select-none h-11 px-3 rounded-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 w-fit">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-white/60">نشط</span>
                                                    <div onClick={() => editForm.setData('is_active', !editForm.data.is_active)}
                                                        className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${editForm.data.is_active ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.data.is_active ? '-translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </label>
                                                <div className="flex gap-3 pt-2">
                                                    <button onClick={() => submitEdit(supplier.id)}
                                                        className="flex-1 spatial-button flex items-center justify-center gap-2 h-11 text-sm">
                                                        <Check className="w-4 h-4" /> حفظ
                                                    </button>
                                                    <button onClick={() => setEditingId(null)}
                                                        className="flex-1 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                                        إلغاء
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={supplier.id} className="rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden">
                                            <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-slate-800 dark:text-white text-lg">{supplier.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/50">{supplier.phone}</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${supplier.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/8 text-slate-400'}`}>
                                                            {supplier.is_active ? 'نشط' : 'موقوف'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">إجمالي المشتريات</span>
                                                    <span className="font-black text-slate-700 dark:text-white/80">{fmt(supplier.total_purchases)}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">المدفوع</span>
                                                    <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(supplier.total_paid)}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">المرتجع</span>
                                                    <span className="font-black text-blue-500 dark:text-blue-400">{fmt(supplier.total_returns)}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">التسويات</span>
                                                    <span className="font-black text-purple-500 dark:text-purple-400">{fmt(supplier.total_settlements)}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">رصيد سابق</span>
                                                    <span className="font-black text-slate-500 dark:text-white/60">{fmt(supplier.opening_balance)}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-3">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">المديونية</span>
                                                    <span className={`font-black ${parseFloat(supplier.total_debt) > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                        {fmt(supplier.total_debt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                                {supplier.id === 1 ? (
                                                    <span className="text-sm font-bold px-4 py-2 rounded-[14px] bg-amber-500/10 text-amber-600 dark:text-amber-400">مورد افتراضي — لا يمكن تعديله</span>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(supplier)}
                                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                            <Pencil className="w-4 h-4" /> تعديل
                                                        </button>
                                                        <button onClick={() => toggleActive(supplier)}
                                                            className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border transition-all font-bold text-sm ${
                                                                supplier.is_active
                                                                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                                                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                            }`}>
                                                            <Power className="w-4 h-4" /> {supplier.is_active ? 'إيقاف' : 'تنشيط'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </>
                    )}
                </SpatialCard>

            </div>
        </AppShell>
    );
}
