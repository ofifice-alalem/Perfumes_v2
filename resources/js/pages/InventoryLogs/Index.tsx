import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { FileText, Eye, Printer, PackageOpen, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface User { id: number; name: string; }
interface InventoryLog { id: number; notes: string; created_at: string; user: User; }
interface Props { logs: { data: InventoryLog[]; links: any[] } }

export default function InventoryLogsIndex({ logs }: Props) {
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (!confirmId) return;
        setDeleting(true);
        router.delete(`/inventory-logs/${confirmId}`, {
            onFinish: () => { setDeleting(false); setConfirmId(null); },
        });
    };

    return (
        <AppShell pageTitle="أرشيف الجرد">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">أرشيف الجرد الفعلي</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">عرض جميع عمليات الجرد والإقفال السابقة</p>
                </div>

                <SpatialCard title={`عمليات الجرد (${logs.data.length})`} icon={<PackageOpen className="w-4 h-4" />}>
                    {logs.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                            <PackageOpen className="w-12 h-12 opacity-30" />
                            <p className="font-bold">لا توجد عمليات جرد مسجلة</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {logs.data.map(log => {
                                const dateObj = new Date(log.created_at);
                                const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
                                const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
                                return (
                                    <div key={log.id} className="spatial-card p-5 border border-black/5 dark:border-white/5 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-primary" />
                                                    {dateStr}
                                                </div>
                                                <div className="text-sm font-bold text-slate-500 dark:text-white/50 mt-1">الساعة: {timeStr}</div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center">
                                                #{log.id}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 bg-black/3 dark:bg-white/3 rounded-xl p-3 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-500 dark:text-white/50">المسؤول</span>
                                                <span className="font-black text-slate-700 dark:text-white/80">{log.user?.name ?? 'غير محدد'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-500 dark:text-white/50">ملاحظات</span>
                                                <span className="font-bold text-slate-700 dark:text-white/80">{log.notes || 'لا يوجد'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-auto">
                                            <Link href={`/inventory-logs/${log.id}`}
                                                className="flex-1 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 font-bold text-slate-700 dark:text-white">
                                                <Eye className="w-4 h-4" /> عرض
                                            </Link>
                                            <a href={`/inventory-logs/${log.id}/pdf`} target="_blank"
                                                className="flex-1 h-10 rounded-[12px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 font-bold">
                                                <Printer className="w-4 h-4" /> PDF
                                            </a>
                                            <button
                                                onClick={() => setConfirmId(log.id)}
                                                className="w-10 h-10 rounded-[12px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                title="حذف الجرد"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SpatialCard>
            </div>

            {/* Confirm Delete Modal */}
            {confirmId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-white text-lg">حذف الجرد #{confirmId}</p>
                                <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">هذا الإجراء لا يمكن التراجع عنه</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-white/60 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl p-3">
                            سيتم حذف جميع بيانات هذا الجرد نهائياً، بما في ذلك جميع المنتجات المسجلة فيه.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmId(null)}
                                disabled={deleting}
                                className="flex-1 h-11 rounded-[12px] bg-black/5 dark:bg-white/5 font-bold text-slate-700 dark:text-white hover:bg-black/10 transition-all"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 h-11 rounded-[12px] bg-red-500 text-white font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <Trash2 className="w-4 h-4" />
                                {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
