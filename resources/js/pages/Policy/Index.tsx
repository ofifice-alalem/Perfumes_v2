import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
    BookOpen, Layers, Ruler, Tags, Package, ShieldCheck,
    CheckCircle2, Sparkles, AlertCircle, Info,
    Droplets, Box, Zap, CreditCard, DollarSign, Wallet,
    Clock, AlertTriangle, Users, Truck, ArrowRight, ShieldAlert,
    Split, Banknote, Receipt, PlusCircle, RotateCcw, Scale,
    ArrowLeftRight, RefreshCw, UserCheck, Building, Trash2,
    TrendingDown, AlertOctagon, ShieldX, BarChart3, Calendar,
    FileSpreadsheet, FileText, Filter, EyeOff, Search
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
                { id: 'multi-payment-methods', title: '2.3 وسائل الدفع والسداد المركب للفاتورة' },
            ]
        },
        {
            id: 'returns-settlements',
            title: '3. سياسة المرتجعات والتسويات المالية',
            icon: <RotateCcw className="w-5 h-5" />,
            badge: 'الخطوة الثالثة',
            subsections: [
                { id: 'returns-and-settlements-rule', title: '3.1 قواعد إرجاع المبيعات والمشتريات' },
                { id: 'unsettled-returns-impact', title: '3.2 أثر المرتجع بدون تسوية (رصيد مستحق)' },
                { id: 'independent-settlements', title: '3.3 إنشاء التسويات المالية المنفصلة' },
            ]
        },
        {
            id: 'inventory-waste-loss',
            title: '4. سياسة التالف والخسائر المخزنية',
            icon: <Trash2 className="w-5 h-5" />,
            badge: 'الخطوة الرابعة',
            subsections: [
                { id: 'waste-concept-recording', title: '4.1 مفهوم التالف وإثبات الخسائر' },
                { id: 'stock-cost-impact', title: '4.2 الأثر المخزني للتالف' },
            ]
        },
        {
            id: 'reports-profit-analysis',
            title: '5. التقارير وتحليل الأرباح',
            icon: <BarChart3 className="w-5 h-5" />,
            badge: 'الخطوة الخامسة',
            subsections: [
                { id: 'comprehensive-profit-analysis', title: '5.1 تحليل الأرباح الشامل' },
            ]
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
                                <span className="text-sm font-bold text-white/90">31 يوليو 2026</span>
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
                                            الضوابط المالية للتعاملات النقدية والآجلة وتعدد وسائل الدفع
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

                            {/* SUBSECTION 2.3: Multi-Payment Methods & Split Payments */}
                            <div id="multi-payment-methods" className="scroll-mt-6 rounded-[24px] p-6 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                                            2.3
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Split className="w-5 h-5 text-emerald-500" />
                                            وسائل الدفع والسداد المركب للفاتورة الواحدة
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                                        مرونة السداد بالتقسيم
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    توفر المنظومة بيئة دفع مرنة ومتطورة تعطي الخيار لإدارة طرق سداد متعددة وتقسيم الفاتورة الواحدة على أكثر من وسيلة دفع في نفس المعاملة:
                                </p>

                                {/* Part A: Custom Payment Methods */}
                                <div className="p-5 rounded-[20px] bg-white/70 dark:bg-slate-900/70 border border-black/8 dark:border-white/10 space-y-3">
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                                        <PlusCircle className="w-4 h-4" />
                                        <span>1. إنشاء وتهيئة وسائل دفع متعددة</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                        يتيح النظام من شاشة **"وسائل الدفع"** إضافة وتهيئة عدد غير محدود من الوسائل النقدية والإلكترونية (مثلاً: <span className="font-black text-slate-900 dark:text-white">نقداً، سداد، تداول، بطاقة تداول، تحويل مصرفي، إلخ</span>) مع إمكانية تفعيل أو تجميد أي وسيلة دفع حسب حاجة العمل.
                                    </p>
                                </div>

                                {/* Part B: Split Payment Case Example */}
                                <div className="p-5 rounded-[20px] bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                                            <Receipt className="w-5 h-5" />
                                            <span>2. السداد المركب للفاتورة الواحدة (Split Payments)</span>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-black">مثال تطبيقي</span>
                                    </div>

                                    <p className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                        يمكن سداد الفاتورة الواحدة باستخدام **أكثر من وسيلة دفع على أجزاء متفرقة** بشرط أن يكون مجموع الأجزاء مساوياً لإجمالي قيمة الفاتورة.
                                    </p>

                                    {/* Practical Example Diagram Card */}
                                    <div className="p-4 rounded-[18px] bg-white/90 dark:bg-slate-900/90 border border-emerald-500/20 space-y-3 shadow-md">
                                        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                                            <span className="text-xs font-black text-slate-500 dark:text-white/50">نموذج فاتورة بقيمة:</span>
                                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">500.00 دينار</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            
                                            <div className="p-3 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col gap-1 text-center">
                                                <span className="text-[11px] font-bold text-slate-400">الدفعة 1 (نقداً)</span>
                                                <span className="text-sm font-black text-slate-800 dark:text-white">200.00 د.ل</span>
                                                <span className="text-[10px] font-bold text-emerald-500">💵 كاش الصندوق</span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col gap-1 text-center">
                                                <span className="text-[11px] font-bold text-slate-400">الدفعة 2 (إلكتروني)</span>
                                                <span className="text-sm font-black text-slate-800 dark:text-white">150.00 د.ل</span>
                                                <span className="text-[10px] font-bold text-indigo-500">📱 تطبيق سداد</span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col gap-1 text-center">
                                                <span className="text-[11px] font-bold text-slate-400">الدفعة 3 (مصرفي)</span>
                                                <span className="text-sm font-black text-slate-800 dark:text-white">150.00 د.ل</span>
                                                <span className="text-[10px] font-bold text-purple-500">💳 بطاقة تداول</span>
                                            </div>

                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                إجمالي المبالغ المسددة: 200 + 150 + 150 = 500 د.ل
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">مطابقة كاملة 100%</span>
                                        </div>
                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* SECTION 3: Returns & Settlements Policy */}
                        <div id="returns-settlements" className="scroll-mt-6 space-y-6 pt-6 border-t border-black/10 dark:border-white/10">
                            
                            {/* Section Title */}
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[14px] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                                        <RotateCcw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                            3. سياسة المرتجعات والتسويات المالية
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">
                                            قواعد إرجاع الأصناف، المعالجة المحاسبية للأرصدة المعلقة، والتسويات المستقلة
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SUBSECTION 3.1: Returns Rules */}
                            <div id="returns-and-settlements-rule" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                                            3.1
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <RefreshCw className="w-5 h-5 text-purple-500" />
                                            قواعد إرجاع المبيعات والمشتريات
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-black">
                                        مرونة الإرجاع والتسوية
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    عند تنفيذ أي عملية إرجاع (سواء **مرتجع مبيعات من زبون** أو **مرتجع مشتريات إلى مورد**)، يتيح النظام خيار التسوية المالية الفورية (تسوية المبلغ عبر أي وسيلة دفع معتمدة)، أو إبقاء المبلغ معلقاً كـ **رصيد دائن/مستحق**.
                                </p>
                            </div>

                            {/* SUBSECTION 3.2: Unsettled Returns Impact */}
                            <div id="unsettled-returns-impact" className="scroll-mt-6 rounded-[24px] p-6 border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                                            3.2
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Scale className="w-5 h-5 text-amber-500" />
                                            أثر المرتجع بدون تسوية (الأرصدة المستحقة)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black">
                                        قاعدة حسابية جوهرية
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                    في حال تم تنفيذ عملية الإرجاع **دون إنشاء تسوية مالية فورية** (أي دون تسوية وتدفق المبلغ مالياً وقت المرتجع)، يترتب على ذلك الأثر المحاسبي التلقائي التالي:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    
                                    {/* Unsettled Customer Return */}
                                    <div className="p-5 rounded-[20px] bg-white/80 dark:bg-slate-900/80 border border-blue-500/30 flex flex-col gap-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-sm">
                                                <UserCheck className="w-5 h-5" />
                                                <span>1. مرتجع مبيعات بدون تسوية</span>
                                            </div>
                                            <span className="text-[11px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">مرتجع من زبون</span>
                                        </div>

                                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs font-black">
                                            الحالة المحاسبية: "الزبون يريد منك مبالغ" (رصيد مستحق للزبون)
                                        </div>

                                        <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                            يتحول قيمة المرتجع تلقائياً كـ **رصيد دائن لصالح الزبون**. يمكن للزبون استخدام هذا الرصيد لخصم قيمة مشترياته القادمة، أو استرداده عبر وسيلة السداد المناسبة لاحقاً عبر شاشة التسويات.
                                        </p>
                                    </div>

                                    {/* Unsettled Supplier Return */}
                                    <div className="p-5 rounded-[20px] bg-white/80 dark:bg-slate-900/80 border border-amber-500/30 flex flex-col gap-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
                                                <Building className="w-5 h-5" />
                                                <span>2. مرتجع مشتريات بدون تسوية</span>
                                            </div>
                                            <span className="text-[11px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">مرتجع إلى مورد</span>
                                        </div>

                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-black">
                                            الحالة المحاسبية: "أنت تريد مبالغ من المورد" (رصيد مستحق للمحل)
                                        </div>

                                        <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                            يخصم قيمة المرتجع من ديون ومستحقات المورد، أو يُسجل كـ **رصيد مستحق للمحل لدى المورد** يُسوى في شحنات مشتريات قادمة أو يُسترد عبر وسيلة السداد المحددة وقت إجراء التسوية.
                                        </p>
                                    </div>

                                </div>
                            </div>

                            {/* SUBSECTION 3.3: Independent Settlements */}
                            <div id="independent-settlements" className="scroll-mt-6 rounded-[24px] p-6 border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                                            3.3
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <ArrowLeftRight className="w-5 h-5 text-purple-500" />
                                            إنشاء التسويات المالية المنفصلة
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-black">
                                        إغلاق وتصفية الأرصدة
                                    </span>
                                </div>

                                <div className="p-5 rounded-[20px] bg-white/70 dark:bg-slate-900/70 border border-black/8 dark:border-white/10 space-y-3">
                                    <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                                        تصفية الأرصدة المعلقة عبر شاشة التسويات:
                                    </h4>
                                    <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                        يتيح النظام في أي وقت إنشاء **"تسويات منفصلة"** من شاشات *تسويات العملاء* أو *تسويات الموردين*. تُستخدم هذه الشاشات لتسجيل مبالغ التسوية وتصفية الأرصدة المعلقة (عبر وسيلة السداد المختارة وقت التنفيذ) الناتجة عن المرتجعات السابقة دون الحاجة لتعديل الفواتير الأصلية، مما يضمن دقة القيود والشفافية التامة أمام العميل والمورد.
                                    </p>
                                </div>

                            </div>

                        </div>

                        {/* SECTION 4: Inventory Waste & Loss Policy */}
                        <div id="inventory-waste-loss" className="scroll-mt-6 space-y-6 pt-6 border-t border-black/10 dark:border-white/10">
                            
                            {/* Section Title */}
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[14px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                            4. سياسة التالف والخسائر المخزنية
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">
                                            توثيق الهالك والكسر واستثنائه من المخزون والأرباح المحاسبية
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SUBSECTION 4.1: Waste Concept & Recording */}
                            <div id="waste-concept-recording" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-black">
                                            4.1
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <AlertOctagon className="w-5 h-5 text-red-500" />
                                            مفهوم التالف وإثبات الخسائر
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black">
                                        سجلات التالف (Waste Logs)
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    تسمح المنظومة بإثبات وتوثيق أي أصناف أو كميات عطرية تعرضت للتلف أو الكسر أو انتهاء الصلاحية أو تم استهلاكها كـ **عينات تجريبية (Testers)** دون بيعها:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-2">
                                        <h4 className="font-black text-xs text-slate-800 dark:text-white">1. التوثيق والملاحظات</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                            تسجيل سبب التلف بالتفصيل (مثل: كسر عبوة، انسكاب زيت، عينة عرض) وحفظ اسم الموظف المنفذ.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-2">
                                        <h4 className="font-black text-xs text-slate-800 dark:text-white">2. تحديد الحجم والكمية</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                            خصم الكمية إما بالقطعة (Unit) للمنتجات العادية، أو بالملي متر (Ml) للعطور الزيتية والأصلية.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-2">
                                        <h4 className="font-black text-xs text-slate-800 dark:text-white">3. تتبع السجل التاريخي</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                                            الاحتفاظ بسجل كامل للتالف مع إمكانية طباعته أو تصديره للمراجعة والتدقيق المحاسبي.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SUBSECTION 4.2: Stock Impact */}
                            <div id="stock-cost-impact" className="scroll-mt-6 rounded-[24px] p-6 border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center font-black">
                                            4.2
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <TrendingDown className="w-5 h-5 text-red-500" />
                                            الأثر المخزني للتالف
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-black">
                                        تعديل رصيد المخزون
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    
                                    <div className="p-5 rounded-[20px] bg-white/80 dark:bg-slate-900/80 border border-black/8 dark:border-white/10 space-y-2">
                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-sm">
                                            <Box className="w-4 h-4" />
                                            <span>الخصم المباشر من المخزون</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                            تُخصم الكمية التالفة فوراً ولحظياً من رصيد المنتج الفعلي بالمنظومة، مما يضمن مطابقة الجرد الفعلي للمحل مع رصيد الشاشة 100%.
                                        </p>
                                    </div>

                                </div>
                            </div>

                        </div>

                        {/* SECTION 5: Reports & Profit Analysis Policy */}
                        <div id="reports-profit-analysis" className="scroll-mt-6 space-y-6 pt-6 border-t border-black/10 dark:border-white/10">
                            
                            {/* Section Title */}
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[14px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                            5. التقارير وتحليل الأرباح
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 dark:text-white/40">
                                            آلية عمل تقارير الأرباح وتحليل الأداء المالي اليومي والتاريخي
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* General Export Policy Callout Box (Mentioned once for all reports) */}
                            <div className="p-4 rounded-[20px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
                                <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
                                <div className="text-xs font-bold leading-relaxed">
                                    <span className="font-black text-sm block mb-1">خيارات التصدير القياسية لجميع التقارير:</span>
                                    تعتمد جميع تقارير المنظومة ميزة **التصدير المباشر والموحد إلى ملفات PDF أو Excel بضغطة زر واحدة**، مع إدراج جميع البيانات الإحصائية والفلاتر المحددة دون الحاجة لأي إعدادات إضافية.
                                </div>
                            </div>

                            {/* SUBSECTION 5.1: Comprehensive Profit Analysis */}
                            <div id="comprehensive-profit-analysis" className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6">
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
                                            5.1
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                                            تحليل الأرباح الشامل (/reports/profit-analysis)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                                        تبويبان للتحليل اليومي والتفصيلي
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                    تحتوي شاشة **"تحليل الأرباح الشامل"** على تبويبين متكاملين يوفران رؤية مالية مزدوجة (تجميعية وهيكلية للزمن، وتفصيلية للمنتجات):
                                </p>

                                {/* TAB 1 Inside Comprehensive Profit Analysis */}
                                <div className="p-6 rounded-[20px] bg-white/80 dark:bg-slate-900/80 border border-indigo-500/20 space-y-5 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                                            <Calendar className="w-5 h-5" />
                                            <span>التاب الأول: "تحليل يومي" (Daily Analysis)</span>
                                        </div>
                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                            تجميع شهري ويومي متدرج
                                        </span>
                                    </div>

                                    <p className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                        يقدم هذا التاب نظرة تجميعية وتدرجية لأداء المبيعات وصافي الأرباح عبر مقاطع زمنية، حيث يتم تجميع البيانات تلقائياً على مستوى **الأشهر**، مع إمكانية التوسع التفاعلي لرؤية **الأيام التفصيلية** لكل شهر:
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        
                                        {/* Filters Card */}
                                        <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-3">
                                            <h4 className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                                <Filter className="w-4 h-4" />
                                                خيارات الفلترة والبحث:
                                            </h4>
                                            <ul className="text-xs font-bold text-slate-600 dark:text-white/70 space-y-2 list-disc list-inside leading-relaxed">
                                                <li><strong>نطاق الفترة الزمنية:</strong> فلترة الأرباح بين تاريخين محددين (من تاريخ / إلى تاريخ).</li>
                                                <li><strong>فلترة المنتجات (Multi-Select):</strong> إمكانية اختيار منتج واحد أو عدة منتجات محددة لحصر تحليل الأرباح عليها فقط.</li>
                                            </ul>
                                        </div>

                                        {/* Display Data Card */}
                                        <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-3">
                                            <h4 className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4" />
                                                المؤشرات المالية المعروضة لكل شهر/يوم:
                                            </h4>
                                            <ul className="text-xs font-bold text-slate-600 dark:text-white/70 space-y-1.5 list-disc list-inside leading-relaxed">
                                                <li><strong>المبيعات (Sales):</strong> إجمالي قيمة فواتير البيع الصادرة.</li>
                                                <li><strong>المرتجعات (Returns):</strong> إجمالي قيمة المبيعات المرتجعة من العملاء.</li>
                                                <li><strong>صافي المبيعات (Net Sales):</strong> (إجمالي المبيعات - المرتجعات).</li>
                                                <li><strong>صافي الربح (Profit):</strong> الربح الصافي المحقق بعد خصم التكلفة.</li>
                                            </ul>
                                        </div>

                                    </div>
                                </div>

                                {/* TAB 2 Inside Comprehensive Profit Analysis */}
                                <div className="p-6 rounded-[20px] bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20 space-y-5 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-base">
                                            <TrendingDown className="w-5 h-5" />
                                            <span>التاب الثاني: "تقرير الأرباح (بالتاريخ)" (Stock Profit Report)</span>
                                        </div>
                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            تحليل تفصيلي للمنتجات والربحية
                                        </span>
                                    </div>

                                    <p className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                        يوفر هذا التاب تحليلاً تفصيلياً شاملاً لكل منتج على حدة، لمعرفة حركة الكميات المباعة ومعدلات الربح الصافي الناتجة عن كل صنف خلال الفترة المحددة:
                                    </p>

                                    {/* HIGHLIGHT: Compact View vs Full Detailed View Feature Box */}
                                    <div className="p-5 rounded-[20px] bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                                            <EyeOff className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            <span>خاصية "عرض مختصر للربح" وأنماط عرض تقرير أرباح المنتجات:</span>
                                        </div>
                                        
                                        <p className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                            يتيح هذا التغشيل مفتاحاً تفاعلياً للتنقل بين نمطين للعرض بحسب مستوى التفاصيل المطلوب:
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                            
                                            {/* Full Detailed View (Filter OFF) */}
                                            <div className="p-4 rounded-[16px] bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 space-y-2.5 shadow-sm">
                                                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                                                    <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                                                        1. العرض التفصيلي الشامل (الفلتر معطل OFF)
                                                    </span>
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">12 عموداً شاملاً</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-white/70 leading-relaxed mb-2">
                                                    عند **عدم تمكين** خيار "عرض مختصر للربح"، يعرض النظام التقرير التفصيلي الشامل بكافة المؤشرات المخزنية والمالية للمنتج:
                                                </p>
                                                <ul className="text-[11px] font-bold text-slate-600 dark:text-white/70 space-y-1 list-disc list-inside leading-relaxed">
                                                    <li><strong>اسم المنتج والتصنيف والوحدة</strong></li>
                                                    <li><strong>إجمالي المشتراه</strong> (الكمية الإجمالية المشتراه)</li>
                                                    <li><strong>إجمالي المخزون</strong> (الرصيد المخزني الحالي)</li>
                                                    <li><strong>إجمالي المبيعات</strong> (الكمية المباعة)</li>
                                                    <li><strong>إجمالي التالف</strong> (الكميات المسجلة كـ هالك)</li>
                                                    <li><strong>مرتجع مورد</strong> & <strong>متوسط ارجاع المورد</strong></li>
                                                    <li><strong>مرتجع زبائن</strong> & <strong>متوسط ارجاع الزبائن</strong></li>
                                                    <li><strong>متوسط شراء</strong> (تكلفة الشراء)</li>
                                                    <li><strong>متوسط بيع</strong> (سعر البيع)</li>
                                                    <li><strong>الربح</strong> (صافي الربح المحقق للصنف)</li>
                                                </ul>
                                            </div>

                                            {/* Compact View (Filter ON) */}
                                            <div className="p-4 rounded-[16px] bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 space-y-2.5 shadow-sm">
                                                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                                                    <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <EyeOff className="w-4 h-4 text-emerald-500" />
                                                        2. العرض المختصر المركّز (الفلتر مفعل ON)
                                                    </span>
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">تصفية + ربح مقتضب</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-white/70 leading-relaxed mb-2">
                                                    عند **تمكين** خيار "عرض مختصر للربح"، يتم تصفية الجدول تلقائياً ليقتصر فقط على:
                                                </p>
                                                <ul className="text-[11px] font-bold text-slate-600 dark:text-white/70 space-y-1 list-disc list-inside leading-relaxed">
                                                    <li><strong>إخفاء جميع الأصناف التي لم تحقق مبيعات</strong> خلال الفترة المقاسة لتنظيف القائمة.</li>
                                                    <li><strong>اختصار الأعمدة</strong> للتركيز الفوري على: (اسم المنتج، المخزون، الكمية المباعة، متوسط الشراء، متوسط البيع، وصافي الربح).</li>
                                                </ul>
                                            </div>

                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        
                                        {/* Stock Filters Card */}
                                        <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-3">
                                            <h4 className="font-black text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                <Search className="w-4 h-4" />
                                                خيارات الفلترة والتخصيص:
                                            </h4>
                                            <ul className="text-xs font-bold text-slate-600 dark:text-white/70 space-y-2 list-disc list-inside leading-relaxed">
                                                <li><strong>الفترة الزمنية:</strong> فلترة البيانات حسب التاريخ من وإلى.</li>
                                                <li><strong>التصنيف (Category):</strong> عرض منتجات تصنيف معين فقط.</li>
                                                <li><strong>البحث والتحديد:</strong> فلترة القائمة باسم المنتج أو معرفاته.</li>
                                            </ul>
                                        </div>

                                        {/* Stock Summary Note */}
                                        <div className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-3">
                                            <h4 className="font-black text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                الغاية والهدف الإداري:
                                            </h4>
                                            <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                                يعطي العرض التفصيلي الشامل صورة دقيقة 100% لحركة المخزون والمرتجعات والتالف والتكاليف الكاملة للمنتج، بينما يوفر العرض المختصر تقريراً سريعاً ومباشراً لأرباح الأصناف المباعة للإدارة بضغطة زر.
                                            </p>
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
