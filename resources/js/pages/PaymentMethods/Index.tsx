import { useState, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, DraggableOnScreenKeyboard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import {
    Plus, Pencil, Trash2, X, Check, CreditCard, Search,
    Wallet, Banknote, ArrowLeftRight, ShieldCheck, Power, Keyboard
} from 'lucide-react';

interface PaymentMethod {
    id: number;
    name: string;
    is_active: boolean;
}

interface Props {
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const emptyForm = { name: '', is_active: true };

/** اختيار أيقونة ونمط وسيلة الدفع حسب الاسم */
function getMethodTheme(name: string) {
    const n = name.toLowerCase();
    if (n.includes('كاش') || n.includes('نقدي') || n.includes('نقد') || n.includes('cash')) {
        return {
            icon: Banknote,
            gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
            badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
            iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        };
    }
    if (n.includes('شبكة') || n.includes('بطاقة') || n.includes('مدى') || n.includes('فيزا') || n.includes('ماستر') || n.includes('card')) {
        return {
            icon: CreditCard,
            gradient: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
            badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
            iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
        };
    }
    if (n.includes('تحويل') || n.includes('بنك') || n.includes('حساب') || n.includes('bank') || n.includes('transfer')) {
        return {
            icon: ArrowLeftRight,
            gradient: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
            badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
            iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
        };
    }
    return {
        icon: Wallet,
        gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400',
        badgeBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
        iconBg: 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30',
    };
}

export default function PaymentMethodsIndex({ paymentMethods, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [keyboardTarget, setKeyboardTarget] = useState<'create' | 'edit' | null>(null);
    const editCardRef = useRef<HTMLDivElement | null>(null);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ name: '', is_active: true });

    const activeCount   = paymentMethods.filter(m => m.is_active).length;
    const inactiveCount = paymentMethods.filter(m => !m.is_active).length;

    const filteredMethods = paymentMethods.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    function startEdit(pm: PaymentMethod) {
        setEditingId(pm.id);
        editForm.setData({ name: pm.name, is_active: pm.is_active });
        setTimeout(() => {
            if (editCardRef.current) {
                editCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            const container = document.querySelector('.custom-scroll');
            if (container) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }, 100);
    }

    function submitCreate() {
        createForm.post('/payment-methods', {
            onSuccess: () => {
                createForm.reset();
                setShowCreate(false);
                setShowKeyboard(false);
            },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/payment-methods/${id}`, {
            onSuccess: () => {
                setEditingId(null);
                setShowKeyboard(false);
            },
        });
    }

    function toggleStatus(pm: PaymentMethod) {
        router.put(`/payment-methods/${pm.id}`, {
            name: pm.name,
            is_active: !pm.is_active,
        }, { preserveScroll: true });
    }

    return (
        <AppShell pageTitle="وسائل الدفع">
            <div className="flex flex-col gap-6 sm:gap-8 pb-32 lg:pb-8 select-none">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-slate-100/90 via-slate-100/50 to-transparent dark:from-slate-800/90 dark:via-slate-800/50 dark:to-transparent p-6 sm:p-8 rounded-[30px] border-2 border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-4 shadow-lg shrink-0">
                            <CreditCard className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">وسائل الدفع</h1>
                            <p className="text-base sm:text-lg font-bold text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">إدارة وسائل الدفع ونقاط البيع بواجهة لمسية متطورة</p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setShowCreate(!showCreate);
                            if (editingId) setEditingId(null);
                        }}
                        className="spatial-button h-16 sm:h-20 px-8 sm:px-10 rounded-[24px] text-lg sm:text-2xl font-black flex items-center justify-center gap-3.5 shadow-xl active:scale-95 touch-manipulation cursor-pointer shrink-0"
                    >
                        {showCreate ? (
                            <>
                                <X className="w-6 h-6 sm:w-7 sm:h-7" />
                                <span>إغلاق النموذج</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
                                <span>إضافة وسيلة دفع جديدة</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="px-6 py-4 rounded-[22px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-lg sm:text-xl animate-in fade-in slide-in-from-top-3">
                        ✅ {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="px-6 py-4 rounded-[22px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-lg sm:text-xl animate-in fade-in slide-in-from-top-3">
                        ⚠️ {flash.error}
                    </div>
                )}

                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="p-6 rounded-[26px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400">إجمالي وسائل الدفع</span>
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{paymentMethods.length}</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center shrink-0">
                            <CreditCard className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                    </div>

                    <div className="p-6 rounded-[26px] bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">وسائل الدفع النشطة</span>
                            <span className="text-3xl sm:text-4xl font-black text-emerald-800 dark:text-emerald-200">{activeCount}</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                    </div>

                    <div className="p-6 rounded-[26px] bg-slate-200/60 dark:bg-slate-800/40 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm sm:text-base font-black text-slate-600 dark:text-slate-400">وسائل الدفع الموقوفة</span>
                            <span className="text-3xl sm:text-4xl font-black text-slate-700 dark:text-slate-300">{inactiveCount}</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-slate-300/40 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-2 border-slate-400/30 flex items-center justify-center shrink-0">
                            <Power className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                    </div>
                </div>

                {/* Create Form Section */}
                {showCreate && (
                    <SpatialCard title="إضافة وسيلة دفع جديدة" icon={<Plus className="w-6 h-6" />}>
                        <div className="p-2 sm:p-4 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                                
                                {/* اسم وسيلة الدفع */}
                                <div className="lg:col-span-2 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">اسم وسيلة الدفع</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKeyboardTarget('create');
                                                setShowKeyboard(!showKeyboard);
                                            }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-[14px] border-2 font-black text-sm sm:text-base transition-all ${
                                                showKeyboard && keyboardTarget === 'create'
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                                            }`}
                                        >
                                            <Keyboard className="w-5 h-5" />
                                            <span>لوحة المفاتيح</span>
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={createForm.data.name}
                                        onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: شبكة / مدى / تحويل بنكي / كاش"
                                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl sm:text-2xl font-black w-full"
                                    />
                                    {createForm.errors.name && (
                                        <p className="text-base text-red-500 font-black">{createForm.errors.name}</p>
                                    )}
                                </div>

                                {/* الحالة (نشط / موقوف) */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">حالة الوسيلة</label>
                                    <button
                                        type="button"
                                        onClick={() => createForm.setData('is_active', !createForm.data.is_active)}
                                        className={`h-16 sm:h-20 rounded-[22px] px-6 border-2 flex items-center justify-between font-black text-lg sm:text-xl transition-all shadow-md active:scale-95 touch-manipulation cursor-pointer ${
                                            createForm.data.is_active
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3.5 h-3.5 rounded-full ${createForm.data.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                            <span>{createForm.data.is_active ? 'نشطة (متاحة في POS)' : 'موقوفة (غير متاحة)'}</span>
                                        </div>
                                        <div className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-1 shrink-0 ${createForm.data.is_active ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-700'}`}>
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${createForm.data.is_active ? '-translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </button>
                                </div>

                            </div>

                            {/* أزرار الحفظ والإلغاء */}
                            <div className="flex items-center gap-4 pt-4 border-t-2 border-slate-200 dark:border-slate-700/80">
                                <button
                                    onClick={submitCreate}
                                    disabled={createForm.processing}
                                    className="spatial-button h-16 sm:h-18 px-10 rounded-[22px] text-lg sm:text-xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl touch-manipulation cursor-pointer flex-1"
                                >
                                    <Check className="w-6 h-6" />
                                    <span>حفظ الوسيلة</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowCreate(false);
                                        createForm.reset();
                                        setShowKeyboard(false);
                                    }}
                                    className="h-16 sm:h-18 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-black text-lg sm:text-xl border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all touch-manipulation cursor-pointer"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100/90 dark:bg-slate-800/80 p-4 sm:p-5 rounded-[24px] border-2 border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="بحث سريع باسم وسيلة الدفع..."
                            className="spatial-input h-14 sm:h-16 rounded-[20px] pr-14 pl-5 text-base sm:text-lg font-black w-full"
                        />
                    </div>

                    <div className="text-base sm:text-lg font-black text-slate-600 dark:text-slate-300 shrink-0">
                        عرض <strong className="text-primary text-xl sm:text-2xl font-black">{filteredMethods.length}</strong> من أصل {paymentMethods.length} وسيلة دفع
                    </div>
                </div>

                {/* Main List Section */}
                <SpatialCard title={`قائمة وسائل الدفع (${filteredMethods.length})`} icon={<CreditCard className="w-6 h-6" />}>
                    {filteredMethods.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-4">
                            <span className="text-6xl">💳</span>
                            <span className="font-black text-xl sm:text-2xl">لا توجد وسائل دفع مطابقة للبحث</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                            {filteredMethods.map(method => {
                                const theme = getMethodTheme(method.name);
                                const IconComponent = theme.icon;
                                const isEditing = editingId === method.id;

                                if (isEditing) {
                                    return (
                                        <div ref={editCardRef} key={method.id} className="p-6 sm:p-8 rounded-[30px] bg-slate-100 dark:bg-slate-800 border-4 border-primary/70 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 scroll-mt-28">
                                            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700/80 pb-4">
                                                <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">تعديل وسيلة الدفع</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setKeyboardTarget('edit');
                                                        setShowKeyboard(!showKeyboard);
                                                    }}
                                                    className="px-4 py-2.5 rounded-[16px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-2 border-amber-500/30 flex items-center gap-2 font-black text-sm sm:text-base hover:bg-amber-500/25 active:scale-95 transition-all"
                                                    title="لوحة المفاتيح"
                                                >
                                                    <Keyboard className="w-5 h-5" />
                                                    <span>لوحة المفاتيح</span>
                                                </button>
                                            </div>

                                            {/* اسم وسيلة الدفع */}
                                            <div className="flex flex-col gap-3">
                                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">اسم وسيلة الدفع</label>
                                                <input
                                                    type="text"
                                                    value={editForm.data.name}
                                                    onChange={e => editForm.setData('name', e.target.value)}
                                                    className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl sm:text-2xl font-black w-full"
                                                />
                                                {editForm.errors.name && (
                                                    <p className="text-base text-red-500 font-black">{editForm.errors.name}</p>
                                                )}
                                            </div>

                                            {/* زر التنشيط والتمكين اللمسي الفاخر */}
                                            <div className="flex flex-col gap-3">
                                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">حالة التنشيط والتمكين</label>
                                                <button
                                                    type="button"
                                                    onClick={() => editForm.setData('is_active', !editForm.data.is_active)}
                                                    className={`h-16 sm:h-20 rounded-[22px] px-6 border-2 flex items-center justify-between font-black text-lg sm:text-xl transition-all shadow-md active:scale-95 touch-manipulation cursor-pointer ${
                                                        editForm.data.is_active
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-3.5 h-3.5 rounded-full ${editForm.data.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                        <span>{editForm.data.is_active ? 'نشطة (متاحة في POS)' : 'موقوفة (غير متاحة)'}</span>
                                                    </div>
                                                    <div className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-1 shrink-0 ${editForm.data.is_active ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}>
                                                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${editForm.data.is_active ? '-translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                            </div>

                                            {/* أزرار الحفظ والإلغاء اللمسية */}
                                            <div className="flex items-center gap-4 pt-3 border-t-2 border-slate-200 dark:border-slate-700/80">
                                                <button
                                                    onClick={() => submitEdit(method.id)}
                                                    className="spatial-button h-16 sm:h-18 rounded-[22px] text-lg sm:text-xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl flex-1 touch-manipulation cursor-pointer"
                                                >
                                                    <Check className="w-6 h-6" />
                                                    <span>حفظ التعديلات</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setShowKeyboard(false);
                                                    }}
                                                    className="h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-lg sm:text-xl border-2 border-slate-300 dark:border-slate-600 active:scale-95 transition-all touch-manipulation cursor-pointer"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={method.id}
                                        className={`group relative p-6 sm:p-7 rounded-[30px] border-2 bg-gradient-to-br ${theme.gradient} bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between gap-6 touch-manipulation`}
                                    >
                                        {/* Card Header & Status Badge */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] border-2 ${theme.iconBg} flex items-center justify-center shrink-0 shadow-md`}>
                                                    <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h3 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl truncate leading-snug">
                                                        {method.name}
                                                    </h3>
                                                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                                                        معرف الوسيلة #{method.id}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Badge Toggle Button */}
                                            <button
                                                type="button"
                                                onClick={() => toggleStatus(method)}
                                                className={`px-4 py-2 rounded-[16px] border-2 font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm ${
                                                    method.is_active
                                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                                                        : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 border-slate-400/40 hover:bg-slate-300 dark:hover:bg-slate-700'
                                                }`}
                                                title="اضغط لتغيير الحالة"
                                            >
                                                <span className={`w-2.5 h-2.5 rounded-full ${method.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                <span>{method.is_active ? 'نشطة' : 'موقوفة'}</span>
                                            </button>
                                        </div>

                                        {/* Actions Row */}
                                        <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-200/80 dark:border-slate-700/80">
                                            <button
                                                onClick={() => startEdit(method)}
                                                className="flex-1 flex items-center justify-center gap-2.5 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base sm:text-lg shadow-sm touch-manipulation cursor-pointer"
                                            >
                                                <Pencil className="w-5 h-5 sm:w-6 sm:h-6" />
                                                <span>تعديل</span>
                                            </button>

                                            <DeleteModal
                                                onConfirm={() => router.delete(`/payment-methods/${method.id}`)}
                                                wrapperClassName="flex-1"
                                                trigger={
                                                    <button className="w-full flex items-center justify-center gap-2.5 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base sm:text-lg shadow-sm touch-manipulation cursor-pointer">
                                                        <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                                        <span>حذف</span>
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SpatialCard>

                {/* Virtual Touch Keyboard Portal */}
                {showKeyboard && (
                    <DraggableOnScreenKeyboard
                        value={keyboardTarget === 'create' ? createForm.data.name : editForm.data.name}
                        onKeyPress={char => {
                            if (keyboardTarget === 'create') {
                                createForm.setData('name', createForm.data.name + char);
                            } else if (keyboardTarget === 'edit') {
                                editForm.setData('name', editForm.data.name + char);
                            }
                        }}
                        onBackspace={() => {
                            if (keyboardTarget === 'create') {
                                createForm.setData('name', createForm.data.name.slice(0, -1));
                            } else if (keyboardTarget === 'edit') {
                                editForm.setData('name', editForm.data.name.slice(0, -1));
                            }
                        }}
                        onClear={() => {
                            if (keyboardTarget === 'create') {
                                createForm.setData('name', '');
                            } else if (keyboardTarget === 'edit') {
                                editForm.setData('name', '');
                            }
                        }}
                        onSpace={() => {
                            if (keyboardTarget === 'create') {
                                createForm.setData('name', createForm.data.name + ' ');
                            } else if (keyboardTarget === 'edit') {
                                editForm.setData('name', editForm.data.name + ' ');
                            }
                        }}
                        onClose={() => setShowKeyboard(false)}
                    />
                )}

            </div>
        </AppShell>
    );
}
