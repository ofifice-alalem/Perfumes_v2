import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import {
    TrendingUp, Package, Users, Truck, BarChart2,
    ShoppingCart, RotateCcw
} from 'lucide-react';

const reports = [
    { href: '/reports/product-movement', icon: <Package className="w-6 h-6" />,      label: 'حركة المنتج',                  desc: 'تتبع دخول وخروج المخزون لمنتج معين' },
    { href: '/reports/stock-status',     icon: <BarChart2 className="w-6 h-6" />,     label: 'المخزون الحالي',                desc: 'حالة المخزون مع تنبيهات الحد الأدنى' },
    { href: '/reports/customer-aging',   icon: <Users className="w-6 h-6" />,         label: 'ديون العملاء',                  desc: 'تصنيف ديون العملاء حسب العمر الزمني' },
    { href: '/reports/supplier-aging',   icon: <Truck className="w-6 h-6" />,         label: 'ديون الموردين',                 desc: 'تصنيف ديون الموردين حسب العمر الزمني' },
    { href: '/reports/sales',            icon: <TrendingUp className="w-6 h-6" />,    label: 'المبيعات',                      desc: 'تحليل المبيعات اليومي والشهري والسنوي' },
    { href: '/reports/purchases',        icon: <ShoppingCart className="w-6 h-6" />,  label: 'المشتريات',                     desc: 'تحليل المشتريات والمدفوعات للموردين' },
    { href: '/reports/returns',          icon: <RotateCcw className="w-6 h-6" />,     label: 'المرتجعات',                     desc: 'مرتجعات العملاء والموردين مقارنةً بالمبيعات' },
];

export default function ReportsIndex() {
    return (
        <AppShell pageTitle="التقارير">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">التقارير</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تحليل شامل لجميع عمليات المتجر</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {reports.map(r => (
                        <Link key={r.href} href={r.href}
                            className="spatial-card p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
                            <div className="w-12 h-12 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                {r.icon}
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-white text-[15px]">{r.label}</p>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-1 leading-relaxed">{r.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </AppShell>
    );
}
