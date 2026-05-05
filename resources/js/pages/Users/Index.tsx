import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Plus, Pencil, Trash2, X, Check, Users, Eye, EyeOff } from 'lucide-react';

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

const emptyForm = { name: '', username: '', email: '', password: '', role: 'admin' };

export default function UsersIndex({ users, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showPass, setShowPass] = useState(false);
    const [showEditPass, setShowEditPass] = useState(false);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ name: '', username: '', email: '', password: '', role: 'admin' });

    function startEdit(u: User) {
        setEditingId(u.id);
        editForm.setData({ name: u.name, username: u.username, email: u.email ?? '', password: '', role: u.role });
    }

    function submitCreate() {
        createForm.post('/users', {
            onSuccess: () => { createForm.reset(); setShowCreate(false); setShowPass(false); },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/users/${id}`, {
            onSuccess: () => { setEditingId(null); setShowEditPass(false); },
        });
    }

    return (
        <AppShell pageTitle="المستخدمون">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">المستخدمون</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة حسابات الدخول للنظام</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> إضافة مستخدم
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
                    <SpatialCard title="مستخدم جديد" icon={<Plus className="w-4 h-4" />}>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم الكامل</label>
                                    <input value={createForm.data.name} onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: أحمد محمد"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                                    {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم الدخول</label>
                                    <input value={createForm.data.username} onChange={e => createForm.setData('username', e.target.value)}
                                        placeholder="مثال: ahmed"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                                    {createForm.errors.username && <p className="text-xs text-red-500 font-bold">{createForm.errors.username}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">البريد الإلكتروني (اختياري)</label>
                                    <input type="email" value={createForm.data.email} onChange={e => createForm.setData('email', e.target.value)}
                                        placeholder="example@email.com"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                                    {createForm.errors.email && <p className="text-xs text-red-500 font-bold">{createForm.errors.email}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">كلمة المرور</label>
                                    <div className="relative">
                                        <input type={showPass ? 'text' : 'password'} value={createForm.data.password}
                                            onChange={e => createForm.setData('password', e.target.value)}
                                            placeholder="6 أحرف على الأقل"
                                            className="spatial-input h-12 rounded-[16px] px-4 pl-12 text-[15px] font-bold w-full" />
                                        <button type="button" onClick={() => setShowPass(!showPass)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors">
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {createForm.errors.password && <p className="text-xs text-red-500 font-bold">{createForm.errors.password}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button onClick={submitCreate} disabled={createForm.processing}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                    <Check className="w-4 h-4" /> حفظ
                                </button>
                                <button onClick={() => { setShowCreate(false); createForm.reset(); setShowPass(false); }}
                                    className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* List */}
                <SpatialCard title={`المستخدمون (${users.length})`} icon={<Users className="w-4 h-4" />}>
                    {users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">👤</span>
                            <span className="font-bold">لا يوجد مستخدمون بعد</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {users.map(user => (
                                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                    {editingId === user.id ? (
                                        <div className="flex flex-col gap-3 flex-1">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم</label>
                                                    <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)}
                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                    {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">اسم الدخول</label>
                                                    <input value={editForm.data.username} onChange={e => editForm.setData('username', e.target.value)}
                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                    {editForm.errors.username && <p className="text-xs text-red-500 font-bold">{editForm.errors.username}</p>}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">البريد (اختياري)</label>
                                                    <input type="email" value={editForm.data.email} onChange={e => editForm.setData('email', e.target.value)}
                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">كلمة مرور جديدة (اختياري)</label>
                                                    <div className="relative">
                                                        <input type={showEditPass ? 'text' : 'password'} value={editForm.data.password}
                                                            onChange={e => editForm.setData('password', e.target.value)}
                                                            placeholder="اتركه فارغاً للإبقاء على الحالي"
                                                            className="spatial-input h-10 rounded-[12px] px-4 pl-10 text-[14px] font-bold w-full" />
                                                        <button type="button" onClick={() => setShowEditPass(!showEditPass)}
                                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40">
                                                            {showEditPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => submitEdit(user.id)}
                                                    className="w-10 h-10 rounded-[12px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setEditingId(null); setShowEditPass(false); }}
                                                    className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 flex items-center justify-center hover:bg-black/10 transition-all">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-[14px] bg-primary/10 flex items-center justify-center shrink-0">
                                                    <span className="font-black text-primary text-sm">{user.name.charAt(0)}</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-slate-800 dark:text-white truncate">{user.name}</span>
                                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">@{user.username}</span>
                                                        {user.email && <span className="text-xs font-bold text-slate-400 dark:text-white/40">{user.email}</span>}
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-primary/10 text-primary">{user.role}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:shrink-0">
                                                <button onClick={() => startEdit(user)}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                    <Pencil className="w-3.5 h-3.5" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => router.delete(`/users/${user.id}`)}
                                                    trigger={
                                                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-3.5 h-3.5" /> حذف
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </SpatialCard>

            </div>
        </AppShell>
    );
}
