import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Pencil, Trash2, X, Check, Users, ShieldCheck } from 'lucide-react';

interface User {
  id: number; name: string; username: string;
  email: string | null; role: 'super-admin' | 'admin' | 'saler';
}

interface Props {
  users: User[];
  flash?: { success?: string; error?: string };
}

const roleLabels = { 'super-admin': 'سوبر أدمن', admin: 'أدمن', saler: 'بائع' };
const roleColors = {
  'super-admin': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  admin:         'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  saler:         'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};
const roleOptions = [
  { label: 'سوبر أدمن', badge: 'super-admin' },
  { label: 'أدمن',      badge: 'admin' },
  { label: 'بائع',      badge: 'saler' },
];
const roleMap: Record<string, User['role']> = { 'سوبر أدمن': 'super-admin', 'أدمن': 'admin', 'بائع': 'saler' };
const roleReverseMap: Record<string, string> = { 'super-admin': 'سوبر أدمن', admin: 'أدمن', saler: 'بائع' };

const emptyForm = { name: '', username: '', email: '', password: '', role: 'saler' as User['role'] };

function UserForm({ form, isEdit, onSubmit, onCancel }: {
  form: ReturnType<typeof useForm<typeof emptyForm>>;
  isEdit?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم الكامل</label>
          <input value={form.data.name} onChange={e => form.setData('name', e.target.value)}
            placeholder="مثال: أحمد محمد" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.name && <p className="text-xs text-red-500 font-bold">{form.errors.name}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم المستخدم</label>
          <input value={form.data.username} onChange={e => form.setData('username', e.target.value)}
            placeholder="مثال: ahmed" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.username && <p className="text-xs text-red-500 font-bold">{form.errors.username}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">البريد الإلكتروني</label>
          <input type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)}
            placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.email && <p className="text-xs text-red-500 font-bold">{form.errors.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">
            {isEdit ? 'كلمة المرور (اتركها فارغة للإبقاء)' : 'كلمة المرور'}
          </label>
          <input type="password" value={form.data.password} onChange={e => form.setData('password', e.target.value)}
            placeholder={isEdit ? '••••••' : 'أدخل كلمة المرور'} className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.password && <p className="text-xs text-red-500 font-bold">{form.errors.password}</p>}
        </div>
      </div>
      <div className="w-full sm:w-56">
        <ModernSelect label="الدور" options={roleOptions}
          defaultValue={roleReverseMap[form.data.role]}
          onSelect={val => form.setData('role', roleMap[val])}
        />
        {form.errors.role && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.role}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSubmit} disabled={form.processing}
          className="spatial-button flex items-center gap-2 px-6 h-11 text-sm">
          <Check className="w-4 h-4" /> حفظ
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

export default function UsersIndex({ users, flash }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createForm = useForm({ ...emptyForm });
  const editForm   = useForm({ ...emptyForm });

  function startEdit(user: User) {
    setEditingUser(user);
    editForm.setData({ name: user.name, username: user.username, email: user.email ?? '', password: '', role: user.role });
  }

  function submitCreate() {
    createForm.post('/users', { onSuccess: () => { createForm.reset(); setShowCreate(false); } });
  }

  function submitEdit(id: number) {
    editForm.put(`/users/${id}`, { onSuccess: () => setEditingUser(null) });
  }

  function deleteUser(id: number) {
    router.delete(`/users/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <AppShell pageTitle="Step 4 — المستخدمون والعملاء">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">المستخدمون</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{users.length} مستخدم مسجل</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> إضافة مستخدم
          </button>
        </div>

        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {showCreate && (
          <SpatialCard title="مستخدم جديد" icon={<Plus className="w-4 h-4" />}>
            <UserForm form={createForm} onSubmit={submitCreate} onCancel={() => { setShowCreate(false); createForm.reset(); }} />
          </SpatialCard>
        )}

        <SpatialCard title={`المستخدمون (${users.length})`} icon={<Users className="w-4 h-4" />} headerDot={false}>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">👤</span>
              <span className="font-bold">لا يوجد مستخدمون بعد</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-800 dark:text-white truncate">{user.name}</span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">@{user.username}</span>
                        {user.email && <span className="text-xs font-bold text-slate-400 dark:text-white/40">{user.email}</span>}
                        <span className={`text-xs font-black px-2 py-0.5 rounded-[6px] flex items-center gap-1 ${roleColors[user.role]}`}>
                          <ShieldCheck className="w-3 h-3" />
                          {roleLabels[user.role]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <button onClick={() => startEdit(user)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                      <Pencil className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <button onClick={() => setDeleteId(user.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 font-bold text-sm">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpatialCard>

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteUser(deleteId)} onCancel={() => setDeleteId(null)} />

        {editingUser && createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setEditingUser(null)} />
            <div className="relative w-full max-w-xl animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl">
              <div className="absolute inset-0 rounded-[30px] dark:hidden pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="absolute inset-0 rounded-[30px] hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6 overflow-y-auto max-h-[90dvh] custom-scroll">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">تعديل: {editingUser.name}</h3>
                  <button onClick={() => setEditingUser(null)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <UserForm form={editForm} isEdit onSubmit={() => submitEdit(editingUser.id)} onCancel={() => setEditingUser(null)} />
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </AppShell>
  );
}
