import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { policySectionsData, PolicyCard, PolicyFeatureBox } from '@/data/policyData';
import {
    BookOpen, Layers, Ruler, Tags, Package, ShieldCheck,
    CheckCircle2, Sparkles, AlertCircle, Info,
    Droplets, Box, CreditCard, Wallet, Clock, Users, Truck,
    ShieldAlert, Split, Receipt, PlusCircle, RotateCcw, Scale,
    ArrowLeftRight, RefreshCw, UserCheck, Building, Trash2,
    TrendingDown, AlertOctagon, BarChart3, Calendar, EyeOff, Search,
    HardDrive, Database, Upload, History, ClipboardList, PackageOpen, TrendingUp, List, FileText, Plus
} from 'lucide-react';

const iconMap: Record<string, JSX.Element> = {
    Package: <Package className="w-5 h-5" />,
    CreditCard: <CreditCard className="w-5 h-5" />,
    RotateCcw: <RotateCcw className="w-5 h-5" />,
    Trash2: <Trash2 className="w-5 h-5" />,
    BarChart3: <BarChart3 className="w-5 h-5" />,
    Droplets: <Droplets className="w-5 h-5 text-amber-500" />,
    Sparkles: <Sparkles className="w-5 h-5 text-indigo-500" />,
    Box: <Box className="w-5 h-5 text-slate-500" />,
    Clock: <Clock className="w-5 h-5 text-blue-500" />,
    Wallet: <Wallet className="w-5 h-5 text-rose-500" />,
    Split: <Split className="w-5 h-5 text-emerald-500" />,
    RefreshCw: <RefreshCw className="w-5 h-5 text-purple-500" />,
    Scale: <Scale className="w-5 h-5 text-amber-500" />,
    ArrowLeftRight: <ArrowLeftRight className="w-5 h-5 text-purple-500" />,
    AlertOctagon: <AlertOctagon className="w-5 h-5 text-red-500" />,
    TrendingDown: <TrendingDown className="w-5 h-5 text-red-500" />,
    Calendar: <Calendar className="w-5 h-5 text-indigo-500" />,
    Layers: <Layers className="w-4 h-4 text-slate-400" />,
    Ruler: <Ruler className="w-4 h-4 text-slate-400" />,
    Tags: <Tags className="w-4 h-4 text-slate-400" />,
    Users: <Users className="w-4 h-4 text-blue-500" />,
    Truck: <Truck className="w-4 h-4 text-purple-500" />,
    CheckCircle2: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    PlusCircle: <PlusCircle className="w-4 h-4 text-emerald-500" />,
    Receipt: <Receipt className="w-5 h-5 text-emerald-500" />,
    UserCheck: <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    Building: <Building className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    Search: <Search className="w-4 h-4 text-emerald-500" />,
    EyeOff: <EyeOff className="w-5 h-5 text-emerald-500" />,
    HardDrive: <HardDrive className="w-5 h-5 text-indigo-500" />,
    Database: <Database className="w-5 h-5 text-primary" />,
    Upload: <Upload className="w-5 h-5 text-emerald-500" />,
    History: <History className="w-5 h-5 text-purple-500" />,
    ClipboardList: <ClipboardList className="w-5 h-5 text-emerald-500" />,
    PackageOpen: <PackageOpen className="w-5 h-5 text-blue-500" />,
    TrendingUp: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    List: <List className="w-5 h-5 text-purple-500" />,
    FileText: <FileText className="w-5 h-5 text-blue-500" />,
    Plus: <Plus className="w-5 h-5 text-emerald-500" />,
};

function renderIcon(name?: string, fallback: JSX.Element = <Package className="w-5 h-5" />) {
    if (!name) return fallback;
    return iconMap[name] || fallback;
}

function getBadgeStyle(variant?: string) {
    switch (variant) {
        case 'amber': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        case 'indigo': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
        case 'slate': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
        case 'blue': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        case 'purple': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        case 'emerald': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        case 'rose': return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30';
        case 'red': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
        default: return 'bg-primary/10 text-primary border-primary/20';
    }
}

export default function PolicyIndex() {
    const [activeSection, setActiveSection] = useState<string>('products-entry');
    const [activeSub, setActiveSub] = useState<string>('oil-perfumes');

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
                                {policySectionsData.map((section) => (
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
                                                    {renderIcon(section.iconName)}
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

                                        {/* Subsections Navigation */}
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
                                                        {sub.subNumber} {sub.title}
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

                    {/* Main Dynamic Content Renderer */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-12">
                        {policySectionsData.map((section, idx) => (
                            <div 
                                key={section.id} 
                                id={section.id} 
                                className={`scroll-mt-6 space-y-6 ${idx > 0 ? 'pt-6 border-t border-black/10 dark:border-white/10' : ''}`}
                            >
                                {/* Section Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                            {renderIcon(section.iconName)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                                {section.title}
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 dark:text-white/40">
                                                {section.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Section Intro Callout */}
                                {section.introCallout && (
                                    <div className={`p-4 rounded-[20px] border flex items-start gap-3 ${
                                        section.introCallout.type === 'warning' 
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300' 
                                            : section.introCallout.type === 'alert'
                                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                                    }`}>
                                        {section.introCallout.type === 'warning' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" /> : <Info className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />}
                                        <div className="text-xs font-bold leading-relaxed">
                                            {section.introCallout.title && <span className="font-black block text-sm mb-1">{section.introCallout.title}</span>}
                                            {section.introCallout.text}
                                        </div>
                                    </div>
                                )}

                                {/* Subsections Generic Renderer */}
                                {section.subsections.map((sub) => (
                                    <div 
                                        key={sub.id} 
                                        id={sub.id} 
                                        className="scroll-mt-6 rounded-[24px] p-6 border border-black/8 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-black/5 space-y-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${getBadgeStyle(sub.badgeVariant)}`}>
                                                    {sub.subNumber}
                                                </div>
                                                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    {renderIcon(sub.iconName)}
                                                    {sub.title}
                                                </h3>
                                            </div>
                                            {sub.badgeText && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-black ${getBadgeStyle(sub.badgeVariant)}`}>
                                                    {sub.badgeText}
                                                </span>
                                            )}
                                        </div>

                                        {sub.description && (
                                            <p className="text-sm font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                                {sub.description}
                                            </p>
                                        )}

                                        {/* Generic Steps List */}
                                        {sub.steps && sub.steps.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {sub.steps.map((step) => (
                                                    <div key={step.number} className="p-4 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 flex flex-col gap-2 relative">
                                                        <div className="flex items-center justify-between">
                                                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">{step.number}</span>
                                                            {renderIcon(step.iconName, <Layers className="w-4 h-4 text-slate-400" />)}
                                                        </div>
                                                        <h4 className="font-black text-slate-800 dark:text-white text-sm">{step.title}</h4>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-white/50 leading-relaxed">{step.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Generic Stats Grid */}
                                        {sub.statsGrid && sub.statsGrid.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {sub.statsGrid.map((stat, sIdx) => (
                                                    <div key={sIdx} className="p-4 rounded-[18px] bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/8 space-y-1">
                                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                                        <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                                            {stat.description}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Generic Feature Boxes */}
                                        {sub.featureBoxes && sub.featureBoxes.length > 0 && (
                                            <div className="space-y-4">
                                                {sub.featureBoxes.map((fbox, fIdx) => (
                                                    <div key={fIdx} className={`p-5 rounded-[20px] border space-y-4 ${getBadgeStyle(fbox.variant)}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                                                                {renderIcon(fbox.iconName)}
                                                                <span>{fbox.title}</span>
                                                            </div>
                                                            {fbox.badgeText && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-current border border-current/30">
                                                                    {fbox.badgeText}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {fbox.description && (
                                                            <p className="text-xs font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                                                                {fbox.description}
                                                            </p>
                                                        )}

                                                        {/* Feature Box SubCards */}
                                                        {fbox.subCards && fbox.subCards.length > 0 && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                                                                {fbox.subCards.map((sc, scIdx) => (
                                                                    <div key={scIdx} className="p-4 rounded-[16px] bg-white/90 dark:bg-slate-900/90 border border-black/8 dark:border-white/10 space-y-2 shadow-sm">
                                                                        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                                                                            <span className="font-black text-xs text-slate-900 dark:text-white">{sc.title}</span>
                                                                            {sc.badge && (
                                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/10 text-primary">{sc.badge}</span>
                                                                            )}
                                                                        </div>
                                                                        {sc.subtitle && (
                                                                            <span className="text-xs font-black text-primary block">{sc.subtitle}</span>
                                                                        )}
                                                                        {sc.description && (
                                                                            <p className="text-[11px] font-bold text-slate-600 dark:text-white/70 leading-relaxed">{sc.description}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Generic Cards Grid */}
                                        {sub.cardsGrid && sub.cardsGrid.length > 0 && (
                                            <div className="grid grid-cols-1 gap-5">
                                                {sub.cardsGrid.map((card, cIdx) => (
                                                    <div key={cIdx} className="p-5 rounded-[20px] bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 font-black text-sm text-slate-800 dark:text-white">
                                                                {renderIcon(card.iconName)}
                                                                <span>{card.title}</span>
                                                            </div>
                                                            {card.badge && (
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${getBadgeStyle(card.variant)}`}>
                                                                    {card.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {card.subtitle && (
                                                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black">
                                                                {card.subtitle}
                                                            </div>
                                                        )}
                                                        {card.description && (
                                                            <p className="text-xs font-bold text-slate-600 dark:text-white/70 leading-relaxed">
                                                                {card.description}
                                                            </p>
                                                        )}
                                                        {card.list && (
                                                            <div className="flex flex-col gap-2 pt-1">
                                                                {card.list.map((item, lIdx) => {
                                                                    const parts = item.split(':');
                                                                    const hasColon = parts.length > 1;
                                                                    const titlePart = hasColon ? parts[0].trim() : null;
                                                                    const descPart = hasColon ? parts.slice(1).join(':').trim() : item;

                                                                    return (
                                                                        <div key={lIdx} className="p-2.5 rounded-[12px] bg-white/70 dark:bg-slate-900/60 border border-black/5 dark:border-white/8 flex items-start gap-2.5 transition-all hover:border-primary/30">
                                                                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-sm shadow-primary/50" />
                                                                            <div className="text-xs font-bold leading-relaxed text-slate-700 dark:text-white/80">
                                                                                {titlePart && (
                                                                                    <span className="font-black text-slate-900 dark:text-white border-b border-dashed border-slate-300 dark:border-white/20 pb-0.5 ml-1.5 inline-block">
                                                                                        {titlePart}:
                                                                                    </span>
                                                                                )}
                                                                                <span>{descPart}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Generic Subsection Callout */}
                                        {sub.callout && (
                                            <div className={`p-4 rounded-[20px] border flex items-start gap-3 ${
                                                sub.callout.type === 'alert'
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                                                    : sub.callout.type === 'success'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-800 dark:text-indigo-300'
                                            }`}>
                                                {sub.callout.type === 'alert' ? <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" /> : sub.callout.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" /> : <Info className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />}
                                                <div className="text-xs font-bold leading-relaxed">
                                                    {sub.callout.title && <span className="font-black text-sm block mb-1">{sub.callout.title}</span>}
                                                    {sub.callout.text}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                </div>

            </div>
        </AppShell>
    );
}
