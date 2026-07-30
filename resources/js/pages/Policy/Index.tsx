import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
    BookOpen, Layers, Ruler, Tags, Package, ShieldCheck,
    CheckCircle2, Sparkles, AlertCircle, Info,
    Droplets, Box, Zap, CreditCard, DollarSign, Wallet,
    Clock, AlertTriangle, Users, Truck, ArrowRight, ShieldAlert
} from 'lucide-react';

interface PolicySection {
    id: string;
    title: string;
    icon: JSX.Element;
    badge?: string;
    subsections?: { id: string; title: string }[];
}

export default function PolicyIndex() {
    const [activeSection, setActiveSection] = useState<string>('products-entry');
    const [activeSub, setActiveSub] = useState<string>('oil-perfumes');

    const sections: PolicySection[] = [
        {
            id: 'products-entry',
            title: '1. طريقة استخدام النظام وإدخال المنتجات',
            icon: <Package className="w-5 h-5" />,
            badge: 'الخطوة الأولى',
            subsections: [
                { id: 'oil-perfumes', title: '1.1 العطور الزيتية' },
                { id: 'original-perfumes', title: '1.2 العطور الأصلية' },
                { id: 'standard-products', title: '1.3 المنتجات العادية' },
            ]
        },
        {
            id: 'payment-methods-credit',
            title: '2. سياسة المبيعات والمشتريات وأنواع السداد',
            icon: <CreditCard className="w-5 h-5" />,
            badge: 'الخطوة الثانية',
            subsections: [
                { id: 'credit-sales-purchases', title: '2.1 البيع والشراء بالآجل (الذمم)' },
                { id: 'cash-immediate-payment', title: '2.2 التعامل النقدي والالتزام بالدفع اللحظي' },
            ]
        },
        {
            id: 'inventory-waste',
            title: '3. إدارة المخزون والمرتجعات والتالف',
            icon: <Box className="w-5 h-5" />,
            badge: 'قريباً',
        },
        {
            id: 'reports-closing',
            title: '4. التقارير المالية والإقفال الدوري',
            icon: <Zap className="w-5 h-5" />,
            badge: 'قريباً',
        },
    ];

    const scrollTo = (id: string, mainId?: string) => {
        if (mainId) setActiveSection(mainId);
        setActiveSub(id);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <AppShell pageTitle="سياسات ودليل النظام">
            <div className="flex flex-col gap-6 pb-32 lg:pb-12 max-w-7xl mx-auto">
                
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-8
                    border border-black/10 dark:border-white/[0.12]
                    bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900
                    text-white shadow-2xl shadow-black/20">
                    
                    {/* Background Subtle Patterns */}
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-light text-xs font-black">
                                    <ShieldCheck className="w-3.5 h-3.5" /> وثيقة رسمية ملزمة
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs font-bold">
                                    إصدار المنظومة v2.0
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                                دليل وسياسات استخدام منظومة العطور
                            </h1>
                            <p className="text-sm sm:text-base font-bold text-white/70 max-w-2xl leading-relaxed">
                                وثيقة تفصيلية توضح آلية عمل النظام، شروط إدخال البيانات، والقواعد المحاسبية لضمان دقة العمليات وحفظ حقوق المستهلك والمحل.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end text-left sm:text-right">
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">تاريخ التحديث</span>
                                <span className="text-sm font-bold text-white/90">30 يوليو 2026</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Sticky Sidebar Navigation (Index) */}
                    <div className="lg:col-span-4 xl:col-span-3 sticky top-6 z-20 space-y-4">
                        <div className="rounded-[24px] p-5 border border-black/8 dark:border-white/10
                            bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5">
                            
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5 dark:border-white/8">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <h3 className="font-black text-slate-800 dark:text-white text-base">فهرس المحتويات</h3>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">الوثيقة</span>
                            </div>

                            <nav className="flex flex-col gap-2">
                                {sections.map((section) => (
                                    <div key={section.id} className="flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                setActiveSection(section.id);
                                                if (section.subsections && section.subsections.length > 0) {
                                                    scrollTo(section.subsections[0].id, section.id);
                                                } else {
                                                    scrollTo(section.id, section.id);
                                                }
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-[16px] text-right font-bold text-sm transition-all duration-200 ${
                                                activeSection === section.id
                                                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-black'
                                                    : 'text-slate-700 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`${activeSection === section.id ? 'text-white' : 'text-slate-400 dark:text-white/40'}`}>
                                                    {section.icon}
                                                </span>
                                                <span className="truncate">{section.title}</span>
                                            </div>
                                            {section.badge && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                                    activeSection === section.id
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-white/40'
                                                }`}>
                                                    {section.badge}
                                                </span>
                                            )}
                                        </button>

                                        {/* Subsections if active */}
                                        {activeSection === section.id && section.subsections && (
                                            <div className="flex flex-col gap-1 pr-6 pt-1 pb-2 border-r-2 border-primary/30 mr-3">
                                                {section.subsections.map((sub) => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => scrollTo(sub.id, section.id)}
                                                        className={`text-right text-xs font-bold py-1.5 px-3 rounded-[10px] transition-all ${
                                                            activeSub === sub.id
                                                                ? 'text-primary dark:text-primary-light font-black bg-primary/10'
                                                                : 'text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        {sub.title}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* Quick Help Card */}
                        <div className="rounded-[24px] p-5 border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-primary font-black text-sm">
                                <Info className="w-4 h-4" />
                                <span>ملاحظة إرشادية</span>
                            </div>
                            <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                هذه السياسات تعتبر المرجع الأول المعتمد في إدارة العمليات المالية والمخزنية داخل المنظومة.
                            </p>
                        </div>
                    </div>

                    {/* Main Content Body */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-12">

                        {/* SECTION 1: Product Entry & Usage */}
                        <div id="products-entry" className="scroll-mt-6 space-y-6">
                            
                            {/* Section Title */}
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                            1. طريقة استخدام النظام وإدخال المنتجات
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">
                                            الخطوة الأساسية لبناء قاعدة البيانات والمخزون المحاسبي
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Section Intro Alert */}
                            <div className="p-4 rounded-[20px] bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                                <div className="text-xs font-bold leading-relaxed">
                                    <span className="font-black block text-sm mb-1">تسلسل إدخال البيانات المعتمد:</span>
                                    لضمان الربط السليم وحساب التكاليف والأحجام بدون أخطاء، يرجى الالتزام بالخطوات المحددة أدناه حسب نوع المنتج قبل البدء بإدخال الفواتير.
                                </div>
                            </div>

                            {/* SUBSECTION 1.1: Oil Perfumes */}
                            <div id="oil-perfumes" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                                            1.1
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Droplets className="w-5 h-5 text-amber-500" />
                                            العطور الزيتية (Oil Perfumes)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">
                                        نظام التيرات والأحجام
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    تعتمد العطور الزيتية على نظام وراثة الخصائص والأسعار لتقليل تكرار البيانات وإنجاز الإدخال بسرعة عالية. قبل إنشاء أي عطر زيتي، **يلزم أولاً إعداد الركائز الثلاث التالية بالتسلسل:**
                                </p>

                                {/* Step-by-step Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    
                                    {/* Step 1 */}
                                    <div className="p-4 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 flex flex-col gap-2 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">1</span>
                                            <Layers className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <h4 className="font-black text-slate-800 dark:text-white text-sm">التصنيفات (Categories)</h4>
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                            إنشاء التصنيف المناسب للعطر (مثل: عطور فرنسية، عطور شرقية، عطور خاصة).
                                        </p>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="p-4 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 flex flex-col gap-2 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">2</span>
                                            <Ruler className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <h4 className="font-black text-slate-800 dark:text-white text-sm">الأحجام (Sizes)</h4>
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                            تعريف أحجام التعبئة المتاحة (مثل: 1مل، 3مل، 6مل، 12مل) وتحديد سعة الملي بدقة.
                                        </p>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="p-4 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 flex flex-col gap-2 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">3</span>
                                            <Tags className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <h4 className="font-black text-slate-800 dark:text-white text-sm">التيرات والأسعار (Price Tiers)</h4>
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                            إنشاء فئة السعر (مثل: الفئة A) وتحديد أسعار كل حجم (سعر العادي / سعر VIP).
                                        </p>
                                    </div>
                                </div>

                                {/* Outcome box */}
                                <div className="p-4 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                                    <div className="text-xs font-bold leading-relaxed">
                                        <span className="font-black text-sm block mb-1">النتيجة ووراثة الخصائص:</span>
                                        عند إنشاء المنتج الزيتي واختيار فئة السعر (Tier) الخاصة به، **يرث المنتج تلقائياً جميع الأحجام والأسعار** المعرفة في تلك الفئة. وأي تعديل مستقبلي في أسعار التير ينعكس فوراً على جميع المنتجات الزيتية المرتبطة به بدون الحاجة لتعديل كل منتج يدوياً.
                                    </div>
                                </div>
                            </div>

                            {/* SUBSECTION 1.2: Original Perfumes */}
                            <div id="original-perfumes" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
                                            1.2
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-indigo-500" />
                                            العطور الأصلية (Original Perfumes)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                                        خياران للتسعير والبيع
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    تتميز العطور الأصلية بإمكانية بيعها إما كـ **زجاجة كاملة مغلقة** أو كـ **تقسيم تعبئة (Decant)** من نفس الزجاجة. يوفر النظام خيارين مرنين لتحديد نمط التسعير:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    
                                    {/* Option 1: Decant */}
                                    <div className="p-5 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                                                <Droplets className="w-4 h-4" />
                                                <span>1. نمط التقسيم (Decant / Tier)</span>
                                            </div>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">تعبئة بالأحجام</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/60 leading-relaxed">
                                            يُستخدم عند بيع العطر الأصلي كتقسيم مجزأ (تعبئة مل). يتم ربط العطر الأصلي بـ **Price Tier** وتحديد أسعار الأحجام الصغيرة المتاحة منه.
                                        </p>
                                    </div>

                                    {/* Option 2: Full Bottle */}
                                    <div className="p-5 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-emerald-500 font-black text-sm">
                                                <Box className="w-4 h-4" />
                                                <span>2. نمط العبوة الكاملة (Full Bottle)</span>
                                            </div>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">زجاجة مغلقة</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/60 leading-relaxed">
                                            يُستخدم عند بيع العبوة الأصلية الكاملة. يتم تحديد **سعر البيع الكامل** وسعة الزجاجة بالملي، لخصم الحجم بدقة من المخزون التراكمي.
                                        </p>
                                    </div>

                                </div>

                                <div className="p-4 rounded-[20px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-300 flex items-start gap-3">
                                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
                                    <div className="text-xs font-bold leading-relaxed">
                                        <span className="font-black text-sm block mb-1">دقة احتساب المخزون:</span>
                                        سواء تم البيع كـ "عبوة كاملة" أو كـ "تقسيم"، يخصم النظام الكمية بالملي مترات تلقائياً من مخزون الزجاجات الأصلية دون أي تضارب.
                                    </div>
                                </div>
                            </div>

                            {/* SUBSECTION 1.3: Standard Products */}
                            <div id="standard-products" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center font-black">
                                            1.3
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Box className="w-5 h-5 text-slate-500" />
                                            المنتجات العادية (Standard Products)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-xs font-black">
                                        بيانات مباشرة بالقطعة
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    تُستخدم للمنتجات العامة التي لا تحتوي على أحجام أو تقسيم (مثل: الزجاجات الفارغة، العلب، الإكسسوارات، المعطرات الجاهزة).
                                </p>

                                <div className="p-4 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                        <span className="font-black text-sm text-slate-800 dark:text-white block mb-0.5">سهولة ومباشرة في الإدخال:</span>
                                        يتطلب إدخال المنتجات العادية فقط: **اسم المنتج، سعر التكلفة، سعر البيع المباشر، والكمية المتوفرة بالقطعة (Unit Based)** دون أي إعدادات مسبقة للأحجام أو التيرات.
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* SECTION 2: Payment Policies & Credit/Cash Rules */}
                        <div id="payment-methods-credit" className="scroll-mt-6 space-y-6 pt-6 border-t border-black/10 dark:border-white/10">
                            
                            {/* Section Title */}
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                            2. سياسة المبيعات والمشتريات وأنواع السداد
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">
                                            الضوابط المالية للتعاملات النقدية والآجلة مع العملاء والموردين
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SUBSECTION 2.1: Credit Sales & Purchases */}
                            <div id="credit-sales-purchases" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                                            2.1
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-blue-500" />
                                            البيع والشراء بالآجل (الذمم والأرصدة)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">
                                        مرونة في السداد والذمم
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    يدعم النظام إدارة التعاملات بالآجل (الدين) سواء في فواتير **المبيعات للعملاء** أو **المشتريات من الموردين** لتوثيق الأرصدة وحفظ الحقوق المالية:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    
                                    {/* Credit Sales */}
                                    <div className="p-5 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex flex-col gap-3">
                                        <div className="flex items-center gap-2 text-blue-500 font-black text-sm">
                                            <Users className="w-4 h-4" />
                                            <span>أولاً: المبيعات بالآجل (للعملاء)</span>
                                        </div>
                                        <ul className="text-xs font-bold text-slate-600 dark:text-white/70 space-y-2 list-disc list-inside leading-relaxed">
                                            <li>يمكن إخراج الفاتورة دون اشتراط دفع كامل المبلغ وقت البيع.</li>
                                            <li>يتم تدوين المتبقي تلقائياً كـ **"دين على العميل"** ويضاف إلى حسابه الشخصي.</li>
                                            <li>تتم متابعة الديون في تقارير الذمم وتُسدد لاحقاً عبر شاشة "دفعات العملاء" أو "تسويات العملاء".</li>
                                        </ul>
                                    </div>

                                    {/* Credit Purchases */}
                                    <div className="p-5 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex flex-col gap-3">
                                        <div className="flex items-center gap-2 text-purple-500 font-black text-sm">
                                            <Truck className="w-4 h-4" />
                                            <span>ثانياً: المشتريات بالآجل (من الموردين)</span>
                                        </div>
                                        <ul className="text-xs font-bold text-slate-600 dark:text-white/70 space-y-2 list-disc list-inside leading-relaxed">
                                            <li>يمكن إدخال بضائع ومشتريات جديدة دون الدفع الكامل للمورد فوراً.</li>
                                            <li>يُسجل المتبقي كـ **"مستحقات واجبة السداد للمورد"** وتضاف لرصيده.</li>
                                            <li>تتم متابعتها في كشوفات الموردين وتقارير الذمم وتُسدد عبر "مدفوعات الموردين".</li>
                                        </ul>
                                    </div>

                                </div>
                            </div>

                            {/* SUBSECTION 2.2: Cash Policy & Immediate Payment */}
                            <div id="cash-immediate-payment" className="scroll-mt-6 rounded-[24px] p-6 border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
                                            2.2
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-rose-500" />
                                            التعامل النقدي والالتزام بالدفع اللحظي
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-black">
                                        شرط حازم للدفع الفوري
                                    </span>
                                </div>

                                {/* Warning Callout Box */}
                                <div className="p-5 rounded-[20px] bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-start gap-4 shadow-sm">
                                    <ShieldAlert className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
                                    <div className="space-y-2">
                                        <h4 className="font-black text-sm text-rose-600 dark:text-rose-400">
                                            ملاحظة وإلزام قانوني وحسابي مهم جداً:
                                        </h4>
                                        <p className="text-xs font-bold leading-relaxed">
                                            عند تحديد نوع الفاتورة كـ <span className="underline decoration-2 font-black text-rose-700 dark:text-rose-300 font-mono text-sm px-1">"نقدي"</span>، يلزم **السداد الفوري واللحظي الكامل** لصافي قيمة الفاتورة أثناء إنشاء الفاتورة واعتتمادها.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    <div className="p-4 rounded-[18px] bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                        <div className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                            <span className="font-black text-slate-900 dark:text-white block mb-0.5">منع الآجل في النقدية:</span>
                                            لا يُسمح إطلاقاً بتسجيل أي جزء متبقي كـ "دين" أو "ذمة" في الفواتير ذات المسمى النقدي.
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-[18px] bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                        <div className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                            <span className="font-black text-slate-900 dark:text-white block mb-0.5">انضباط رصيد الصندوق:</span>
                                            يضمن هذا الشرط مطابقة رصيد الصندوق النقدي في المنظومة مع المبالغ الفعلية المتوفرة في درج النقدية في نفس اللحظة.
                                        </div>
                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>
        </AppShell>
    );
}
