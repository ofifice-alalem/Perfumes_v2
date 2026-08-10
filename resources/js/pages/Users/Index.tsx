import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, DraggableOnScreenKeyboard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import {
    Plus, Pencil, Trash2, X, Check, Users, Eye, EyeOff, ShieldAlert,
    Shield, ShoppingBag, Wallet, Search, UserPlus, Mail, User, Lock, Keyboard
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    username: string;
    email: string | null;
    role: string;
}

interface Props {
    users: User[];
    flash?: { success?: string; error?: string };
}

const roleOptions = [
    { value: 'super-admin', label: 'مدير عام', desc: 'صلاحيات كاملة وغير محدودة للنظام', icon: ShieldAlert, color: 'text-rose-500 bg-rose-500/15 border-rose-500/30' },
    { value: 'admin',       label: 'مدير',     desc: 'إدارة المنتجات، التظبيط والتقارير', icon: Shield,      color: 'text-amber-500 bg-amber-500/15 border-amber-500/30' },
    { value: 'saler',       label: 'بائع',     desc: 'إجراء عمليات البيع وتصفح المنتجات', icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' },
    { value: 'cashier',     label: 'أمين صندوق', desc: 'إدارة الخزينة ومقبوضات الفواتير', icon: Wallet,      color: 'text-blue-500 bg-blue-500/15 border-blue-500/30' },
];

function roleValueToObj(value: string) {
    return roleOptions.find(r => r.value === value) ?? roleOptions[2];
}

const emptyForm = { name: '', username: '', email: '', password: '', role: 'saler' };

export default function UsersIndex({ users, flash }: Props) {
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPass, setShowPass] = useState(false);

    // On-Screen Keyboard State
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeInput, setActiveInput] = useState<'name' | 'username' | 'email' | 'password' | null>(null);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ name: '', username: '', email: '', password: '', role: 'saler' });

    const currentForm = editingUser ? editForm : createForm;

    function openCreateDrawer() {
        setEditingUser(null);
        createForm.reset();
        setShowPass(false);
        setShowKeyboard(false);
        setShowDrawer(true);
    }

    function openEditDrawer(u: User) {
        setEditingUser(u);
        editForm.setData({
            name: u.name,
            username: u.username,
            email: u.email ?? '',
            password: '',
            role: u.role,
        });
        setShowPass(false);
        setShowKeyboard(false);
        setShowDrawer(true);
    }

    function closeDrawer() {
        setShowDrawer(false);
        setEditingUser(null);
        setShowKeyboard(false);
        createForm.reset();
        editForm.reset();
    }

    function submitCreate() {
        createForm.post('/users', {
            onSuccess: () => {
                closeDrawer();
            },
        });
    }

    function submitEdit() {
        if (!editingUser) return;
        editForm.put(`/users/${editingUser.id}`, {
            onSuccess: () => {
                closeDrawer();
            },
        });
    }

    // Keypress handler for virtual keyboard
    function handleKeyPress(char: string) {
        if (!activeInput) return;
        currentForm.setData(activeInput, (currentForm.data[activeInput] || '') + char);
    }

    function handleBackspace() {
        if (!activeInput) return;
        currentForm.setData(activeInput, (currentForm.data[activeInput] || '').slice(0, -1));
    }

    function handleClear() {
        if (!activeInput) return;
        currentForm.setData(activeInput, '');
    }

    function handleSpace() {
        if (!activeInput) return;
        currentForm.setData(activeInput, (currentForm.data[activeInput] || '') + ' ');
    }

    const filteredUsers = users.filter(u => {
        const q = searchQuery.toLowerCase().trim();
        const roleObj = roleValueToObj(u.role);
        return (
            u.name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            roleObj.label.toLowerCase().includes(q)
        );
    });

    const superAdminCount = users.filter(u => u.role === 'super-admin' || u.role === 'admin').length;
    const staffCount = users.filter(u => u.role === 'saler' || u.role === 'cashier').length;

    return (
        <AppShell pageTitle="المستخدمون">
            <div className="flex flex-col gap-6 sm:gap-8 pb-32 lg:pb-8 select-none">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-slate-100/90 via-slate-100/50 to-transparent dark:from-slate-800/90 dark:via-slate-800/50 dark:to-transparent p-6 sm:p-8 rounded-[30px] border-2 border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-4 shadow-lg shrink-0">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">إدارة المستخدمين</h1>
                            <p className="text-base sm:text-lg font-bold text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">التحكم في حسابات النظام، كلمة المرور، ومستويات الصلاحية</p>
                        </div>
                    </div>

                    <button
                        onClick={openCreateDrawer}
                        className="spatial-button h-16 sm:h-20 px-8 sm:px-10 rounded-[24px] text-lg sm:text-2xl font-black flex items-center justify-center gap-3.5 shadow-xl active:scale-95 touch-manipulation cursor-pointer shrink-0"
                    >
                        <UserPlus className="w-6 h-6 sm:w-7 sm:h-7" />
                        <span>إضافة مستخدم جديد</span>
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

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="p-6 rounded-[26px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400">إجمالي الحسابات</span>
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{users.length}</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center shrink-0">
                            <Users className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                    </div>

                    <div className="p-6 rounded-[26px] bg-rose-500/10 dark:bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-300">الإدارة والإشراف</span>
                            <span className="text-3xl sm:text-4xl font-black text-rose-800 dark:text-rose-200">{superAdminCount}</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-rose-500/20 text-rose-600 dark:text-rose-400 border-2 border-rose-500/30 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                    </div>

                    <div className="p-6 rounded-[26px] bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">فريق المبيعات والخزينة</span>
                            <span className="text-3xl sm:text-4xl font-black text-emerald-800 dark:text-emerald-200">{staffCount}</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100/90 dark:bg-slate-800/80 p-4 sm:p-5 rounded-[24px] border-2 border-slate-200 dark:border-slate-700/80 shadow-sm">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="بحث باسم المستخدم أو الصلاحية..."
                            className="spatial-input h-14 sm:h-16 rounded-[20px] pr-14 pl-5 text-base sm:text-lg font-black w-full"
                        />
                    </div>

                    <div className="text-base sm:text-lg font-black text-slate-600 dark:text-slate-300 shrink-0">
                        عرض <strong className="text-primary text-xl sm:text-2xl font-black">{filteredUsers.length}</strong> من أصل {users.length} مستخدم
                    </div>
                </div>

                {/* Main Users List Grid */}
                <SpatialCard title={`قائمة الحسابات والمستخدمين (${filteredUsers.length})`} icon={<Users className="w-6 h-6" />}>
                    {filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-4">
                            <span className="text-6xl">👤</span>
                            <span className="font-black text-xl sm:text-2xl">لا يوجد مستخدمون مطابقون للبحث</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                            {filteredUsers.map(user => {
                                const roleObj = roleValueToObj(user.role);
                                const RoleIcon = roleObj.icon;

                                return (
                                    <div
                                        key={user.id}
                                        className="group relative p-6 sm:p-7 rounded-[30px] border-2 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-primary/50 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between gap-6 touch-manipulation"
                                    >
                                        {/* Card Header & Avatar */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-primary/15 border-2 border-primary/30 text-primary flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 shadow-md">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h3 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl truncate">
                                                        {user.name}
                                                    </h3>
                                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5 dir-ltr text-right">
                                                        @{user.username}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Role Badge */}
                                            <div className={`px-4 py-2 rounded-[16px] border-2 font-black text-sm sm:text-base flex items-center gap-2 shrink-0 ${roleObj.color}`}>
                                                <RoleIcon className="w-5 h-5" />
                                                <span>{roleObj.label}</span>
                                            </div>
                                        </div>

                                        {/* Info Details */}
                                        <div className="flex flex-col gap-2.5 p-4 rounded-[20px] bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/40 dark:border-slate-700/40 text-sm font-bold text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 dark:text-slate-500 font-bold">البريد الإلكتروني:</span>
                                                <span className="font-black truncate dir-ltr">{user.email || 'غير مسجل'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 dark:text-slate-500 font-bold">مستوى الصلاحية:</span>
                                                <span className="font-black text-slate-900 dark:text-white">{roleObj.desc}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-3 pt-2 border-t-2 border-slate-200 dark:border-slate-700/60">
                                            <button
                                                onClick={() => openEditDrawer(user)}
                                                className="flex-1 flex items-center justify-center gap-2.5 h-14 sm:h-16 rounded-[20px] border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base sm:text-lg shadow-sm touch-manipulation cursor-pointer"
                                            >
                                                <Pencil className="w-5 h-5 sm:w-6 sm:h-6" />
                                                <span>تعديل الحساب</span>
                                            </button>

                                            <DeleteModal
                                                title={`حذف حساب: ${user.name}`}
                                                description={`هل أنت متأكد من حذف حساب "${user.name}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم إلغاء كافة صلاحيات الوصول الخاصة به.`}
                                                onConfirm={() => router.delete(`/users/${user.id}`)}
                                                wrapperClassName="flex-1"
                                                trigger={
                                                    <button className="w-full flex items-center justify-center gap-2.5 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base sm:text-lg shadow-sm touch-manipulation cursor-pointer">
                                                        <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                                        <span>حذف الحساب</span>
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

                {/* Right Slide-Over Drawer Portal (New / Edit User) */}
                {showDrawer && createPortal(
                    <div className="fixed inset-0 z-[999] flex justify-start select-none dir-rtl">
                        {/* Backdrop Overlay */}
                        <div
                            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                            onClick={closeDrawer}
                        />

                        {/* Slide-Over Drawer Panel (Anchored to Right) */}
                        <div className="relative w-full max-w-5xl h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l-4 border-primary/50 shadow-[-20px_0_60px_rgba(0,0,0,0.6)] flex flex-col z-[1000] animate-in slide-in-from-right duration-300 overflow-hidden">
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between p-6 sm:p-8 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                                        {editingUser ? <Pencil className="w-7 h-7 sm:w-8 sm:h-8" /> : <UserPlus className="w-7 h-7 sm:w-8 sm:h-8" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                            {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                                        </h2>
                                        <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                            {editingUser ? `تحديث بيانات وحساب: ${editingUser.name}` : 'إدخال بيانات الحساب وتعيين الصلاحيات'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={closeDrawer}
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 font-black flex items-center justify-center transition-all active:scale-95 cursor-pointer border-2 border-slate-300 dark:border-slate-700 shadow-md shrink-0"
                                    title="إغلاق"
                                >
                                    <X className="w-6 h-6 sm:w-7 sm:h-7" />
                                </button>
                            </div>

                            {/* Drawer Scrollable Body: 2 Columns Side-by-Side */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scroll">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                                    {/* Column 1: Basic Information */}
                                    <div className="flex flex-col gap-6 bg-slate-100/50 dark:bg-slate-800/40 p-6 rounded-[28px] border-2 border-slate-200/80 dark:border-slate-700/60">
                                        <h3 className="text-lg sm:text-xl font-black text-primary border-b-2 border-primary/20 pb-3 flex items-center gap-2.5">
                                            <User className="w-6 h-6" />
                                            <span>المعلومات الأساسية للحساب</span>
                                        </h3>

                                        {/* Full Name Field */}
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">الاسم الكامل</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveInput('name');
                                                        setShowKeyboard(!showKeyboard || activeInput !== 'name');
                                                    }}
                                                    className={`h-12 sm:h-14 px-4 sm:px-6 rounded-[16px] border-2 flex items-center gap-2.5 font-black text-sm sm:text-base transition-all shrink-0 cursor-pointer shadow-md active:scale-95 touch-manipulation ${
                                                        showKeyboard && activeInput === 'name'
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
                                                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                                    }`}
                                                >
                                                    <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                                    <span>لوحة المفاتيح</span>
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={currentForm.data.name}
                                                onChange={e => currentForm.setData('name', e.target.value)}
                                                placeholder="مثال: أحمد محمد علي"
                                                className="spatial-input h-14 sm:h-16 rounded-[20px] px-5 text-lg sm:text-xl font-black w-full"
                                            />
                                            {currentForm.errors.name && (
                                                <p className="text-sm text-red-500 font-black">{currentForm.errors.name}</p>
                                            )}
                                        </div>

                                        {/* Username Field */}
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">اسم المستخدم / الدخول</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveInput('username');
                                                        setShowKeyboard(!showKeyboard || activeInput !== 'username');
                                                    }}
                                                    className={`h-12 sm:h-14 px-4 sm:px-6 rounded-[16px] border-2 flex items-center gap-2.5 font-black text-sm sm:text-base transition-all shrink-0 cursor-pointer shadow-md active:scale-95 touch-manipulation ${
                                                        showKeyboard && activeInput === 'username'
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
                                                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                                    }`}
                                                >
                                                    <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                                    <span>لوحة المفاتيح</span>
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={currentForm.data.username}
                                                onChange={e => currentForm.setData('username', e.target.value)}
                                                placeholder="مثال: ahmed_user"
                                                className="spatial-input h-14 sm:h-16 rounded-[20px] px-5 text-lg sm:text-xl font-black w-full dir-ltr text-right"
                                            />
                                            {currentForm.errors.username && (
                                                <p className="text-sm text-red-500 font-black">{currentForm.errors.username}</p>
                                            )}
                                        </div>

                                        {/* Email Field */}
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">البريد الإلكتروني (اختياري)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveInput('email');
                                                        setShowKeyboard(!showKeyboard || activeInput !== 'email');
                                                    }}
                                                    className={`h-12 sm:h-14 px-4 sm:px-6 rounded-[16px] border-2 flex items-center gap-2.5 font-black text-sm sm:text-base transition-all shrink-0 cursor-pointer shadow-md active:scale-95 touch-manipulation ${
                                                        showKeyboard && activeInput === 'email'
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
                                                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                                    }`}
                                                >
                                                    <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                                    <span>لوحة المفاتيح</span>
                                                </button>
                                            </div>
                                            <input
                                                type="email"
                                                value={currentForm.data.email}
                                                onChange={e => currentForm.setData('email', e.target.value)}
                                                placeholder="example@domain.com"
                                                className="spatial-input h-14 sm:h-16 rounded-[20px] px-5 text-lg sm:text-xl font-black w-full dir-ltr text-right"
                                            />
                                            {currentForm.errors.email && (
                                                <p className="text-sm text-red-500 font-black">{currentForm.errors.email}</p>
                                            )}
                                        </div>

                                        {/* Password Field */}
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                                    {editingUser ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveInput('password');
                                                        setShowKeyboard(!showKeyboard || activeInput !== 'password');
                                                    }}
                                                    className={`h-12 sm:h-14 px-4 sm:px-6 rounded-[16px] border-2 flex items-center gap-2.5 font-black text-sm sm:text-base transition-all shrink-0 cursor-pointer shadow-md active:scale-95 touch-manipulation ${
                                                        showKeyboard && activeInput === 'password'
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
                                                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                                    }`}
                                                >
                                                    <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                                    <span>لوحة المفاتيح</span>
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showPass ? 'text' : 'password'}
                                                    value={currentForm.data.password}
                                                    onChange={e => currentForm.setData('password', e.target.value)}
                                                    placeholder={editingUser ? 'اتركه فارغاً للإبقاء على الحالية' : '6 أحرف على الأقل'}
                                                    className="spatial-input h-14 rounded-[20px] px-5 pl-14 text-lg font-black w-full"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPass(!showPass)}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors p-1.5"
                                                >
                                                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {currentForm.errors.password && (
                                                <p className="text-sm text-red-500 font-black">{currentForm.errors.password}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Column 2: Role / Permissions Selection (Side-by-Side) */}
                                    <div className="flex flex-col gap-6 bg-slate-100/50 dark:bg-slate-800/40 p-6 rounded-[28px] border-2 border-slate-200/80 dark:border-slate-700/60 h-full">
                                        <h3 className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 border-b-2 border-amber-500/20 pb-3 flex items-center gap-2.5">
                                            <Shield className="w-6 h-6" />
                                            <span>تحديد مستوى الصلاحية (Role)</span>
                                        </h3>

                                        <div className="flex flex-col gap-4">
                                            {roleOptions.map(r => {
                                                const RoleIcon = r.icon;
                                                const isSelected = currentForm.data.role === r.value;

                                                return (
                                                    <button
                                                        key={r.value}
                                                        type="button"
                                                        onClick={() => currentForm.setData('role', r.value)}
                                                        className={`p-5 rounded-[24px] border-2 flex items-start gap-4 transition-all text-right cursor-pointer shadow-sm active:scale-95 touch-manipulation ${
                                                            isSelected
                                                                ? 'bg-primary/15 border-primary text-primary shadow-primary/20 ring-2 ring-primary/40'
                                                                : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                                                        }`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-[18px] border-2 flex items-center justify-center shrink-0 ${r.color}`}>
                                                            <RoleIcon className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-black text-lg text-slate-900 dark:text-white">{r.label}</span>
                                                                {isSelected && (
                                                                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                                                        <Check className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                {r.desc}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 flex items-center gap-4">
                                <button
                                    onClick={editingUser ? submitEdit : submitCreate}
                                    disabled={createForm.processing || editForm.processing}
                                    className="spatial-button h-16 sm:h-20 rounded-[24px] text-lg sm:text-2xl font-black flex items-center justify-center gap-3.5 active:scale-95 shadow-xl flex-1 touch-manipulation cursor-pointer"
                                >
                                    <Check className="w-7 h-7" />
                                    <span>{editingUser ? 'حفظ التعديلات' : 'إنشاء الحساب الآن'}</span>
                                </button>

                                <button
                                    onClick={closeDrawer}
                                    className="h-16 sm:h-20 px-8 sm:px-12 rounded-[24px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-lg sm:text-xl border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all touch-manipulation cursor-pointer shrink-0"
                                >
                                    إلغاء
                                </button>
                            </div>

                        </div>
                    </div>,
                    document.body
                )}

                {/* Virtual Touch Keyboard Portal */}
                {showKeyboard && (
                    <DraggableOnScreenKeyboard
                        value={currentForm.data[activeInput || 'name'] || ''}
                        onKeyPress={handleKeyPress}
                        onBackspace={handleBackspace}
                        onClear={handleClear}
                        onSpace={handleSpace}
                        onClose={() => setShowKeyboard(false)}
                    />
                )}

            </div>
        </AppShell>
    );
}
