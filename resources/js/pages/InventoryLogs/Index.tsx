import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { FileText, Eye, Printer, PackageOpen, Calendar } from 'lucide-react';

interface User { id: number; name: string; }
interface InventoryLog { id: number; notes: string; created_at: string; user: User; }
interface Props { logs: { data: InventoryLog[]; links: any[] } }

export default function InventoryLogsIndex({ logs }: Props) {
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
                                const dateStr = dateObj.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });
                                const timeStr = dateObj.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
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
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SpatialCard>
            </div>
        </AppShell>
    );
}
