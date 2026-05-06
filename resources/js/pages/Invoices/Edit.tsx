import { useForm, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, Check } from 'lucide-react';

interface Invoice { id: number; notes: string | null; customer: { name: string } | null; }
interface Props { invoice: Invoice; flash?: { success?: string; error?: string }; }

export default function InvoicesEdit({ invoice, flash }: Props) {
    const form = useForm({ notes: invoice.notes ?? '' });

    return (
        <AppShell pageTitle={`تعديل فاتورة #${invoice.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex items-center gap-3">
                    <Link href={`/invoices/${invoice.id}`} className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تعديل فاتورة #{invoice.id}</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">{invoice.customer?.name ?? 'زبون نقدي'}</p>
                    </div>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}

                <SpatialCard title="تعديل الملاحظات">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
                            <textarea
                                value={form.data.notes}
                                onChange={e => form.setData('notes', e.target.value)}
                                rows={4}
                                placeholder="ملاحظات الفاتورة..."
                                className="spatial-input rounded-[16px] px-4 py-3 text-[15px] font-bold resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => form.put(`/invoices/${invoice.id}`)} disabled={form.processing}
                                className="spatial-button flex items-center gap-2 px-6 h-11 text-sm">
                                <Check className="w-4 h-4" /> حفظ
                            </button>
                            <Link href={`/invoices/${invoice.id}`} className="h-11 px-5 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all flex items-center">
                                إلغاء
                            </Link>
                        </div>
                    </div>
                </SpatialCard>
            </div>
        </AppShell>
    );
}
