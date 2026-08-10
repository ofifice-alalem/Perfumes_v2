import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import {
    TrendingUp, Package, Users, Truck, BarChart2,
    ShoppingCart, RotateCcw, ClipboardList, DollarSign,
    ChevronLeft, Sparkles
} from 'lucide-react';

const reports = [
    { href: '/reports/profit-analysis',  icon: <DollarSign className="w-8 h-8" />,    label: 'تحليل الأرباح الشامل',            desc: 'تحليل صافي الربح الشهري واليومي للمتجر وأرباح المنتجات' },
    { href: '/reports/product-movement', icon: <Package className="w-8 h-8" />,      label: 'حركة المنتج',                  desc: 'تتبع حركة دخول وخروج المخزون لمنتج معين بالتفصيل' },
    { href: '/reports/stock-status',     icon: <BarChart2 className="w-8 h-8" />,     label: 'المخزون الحالي',                desc: 'حالة المخزون مع تنبيهات الحد الأدنى والأرصدة الحالية' },
    { href: '/reports/customer-aging',   icon: <Users className="w-8 h-8" />,         label: 'ديون العملاء',                  desc: 'تصنيف ديون المستحقات المالية على العملاء حسب العمر الزمني' },
    { href: '/reports/supplier-aging',   icon: <Truck className="w-8 h-8" />,         label: 'ديون الموردين',                 desc: 'تصنيف ديون والالتزامات المالية للموردين حسب العمر الزمني' },
    { href: '/reports/sales',            icon: <TrendingUp className="w-8 h-8" />,    label: 'تقارير المبيعات',               desc: 'تحليل المبيعات اليومي والشهري والسنوي للفواتير' },
    { href: '/reports/purchases',        icon: <ShoppingCart className="w-8 h-8" />,  label: 'تقارير المشتريات',              desc: 'تحليل المشتريات والمدفوعات والمستندات للموردين' },
    { href: '/reports/returns',          icon: <RotateCcw className="w-8 h-8" />,     label: 'تقارير المرتجعات',               desc: 'مرتجعات العملاء والموردين مقارنةً بالمبيعات' },
    { href: '/reports/inventory-count',  icon: <ClipboardList className="w-8 h-8" />, label: 'نموذج الجرد',                   desc: 'تصدير وإقفال الجرد الفعلي للمخزون' },
    { href: '/inventory-logs',           icon: <ClipboardList className="w-8 h-8" />, label: 'أرشيف الجرد',                   desc: 'عرض تاريخ عمليات الجرد السابقة وطباعتها' },
];

export default function ReportsIndex() {
    return (
        <AppShell pageTitle="التقارير المالية">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <BarChart2 className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                التقارير التحليلية والمالية
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                لوحة متكاملة لمتابعة أداء المتجر، الأرباح، المخزون، والديون
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map(r => (
                        <Link
                            key={r.href}
                            href={r.href}
                            className="group p-7 rounded-[28px] bg-slate-100/90 dark:bg-slate-800/60 hover:bg-slate-200/90 dark:hover:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-2xl flex flex-col justify-between gap-6 cursor-pointer active:scale-98 touch-manipulation"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="w-16 h-16 rounded-[22px] bg-primary/15 border-2 border-primary/30 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md">
                                    {r.icon}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                                    <ChevronLeft className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                                    {r.label}
                                </h3>
                                <p className="text-base font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {r.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </AppShell>
    );
}
