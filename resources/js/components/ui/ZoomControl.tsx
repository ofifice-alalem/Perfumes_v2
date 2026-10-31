import React, { useState, useEffect, useRef } from 'react';
import { Monitor, ZoomIn, ZoomOut, Check, SlidersHorizontal } from 'lucide-react';

const ZOOM_STEPS = [50, 60, 67, 75, 80, 90, 100, 110, 125];

interface ZoomControlProps {
    className?: string;
}

export function ZoomControl({ className = '' }: ZoomControlProps) {
    const [currentZoom, setCurrentZoom] = useState<number>(100);
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('app_zoom_factor');
        const initial = saved ? Number(saved) : 100;
        if (!isNaN(initial) && initial >= 50 && initial <= 150) {
            applyZoom(initial);
            setCurrentZoom(initial);
        }

        function handleClickOutside(e: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function applyZoom(zoomVal: number) {
        const factor = zoomVal / 100;

        // تطبيق التحجيم الأصيل في Electron عبر webFrame
        if ((window as any).electronAPI?.setZoomFactor) {
            (window as any).electronAPI.setZoomFactor(factor);
            // إزالة أي زوم يدوي على البودي لتجنب انكماش الحاوية وظهور مساحات فارغة
            document.body.style.zoom = '';
            (document.documentElement.style as any).zoom = '';
        } else {
            // في حالة المتصفح العادي
            (document.documentElement.style as any).zoom = `${zoomVal}%`;
        }

        localStorage.setItem('app_zoom_factor', String(zoomVal));
        window.dispatchEvent(new CustomEvent('appZoomChanged', { detail: zoomVal }));
    }

    function zoomIn() {
        const next = ZOOM_STEPS.find(z => z > currentZoom) || 125;
        applyZoom(next);
        setCurrentZoom(next);
    }

    function zoomOut() {
        const next = [...ZOOM_STEPS].reverse().find(z => z < currentZoom) || 50;
        applyZoom(next);
        setCurrentZoom(next);
    }

    function setPreset(val: number) {
        applyZoom(val);
        setCurrentZoom(val);
        setIsOpen(false);
    }

    return (
        <div className={`relative ${className}`} ref={popoverRef}>
            {/* زر الأيقونة الدائري الأنيق المتطابق مع زر الثيم النهاري/الليلي */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer relative"
                title="تعديل أبعاد وحجم الشاشة (Zoom)"
            >
                <Monitor className="w-5 h-5 lg:w-6 lg:h-6" />
                {currentZoom !== 100 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-white shadow-md">
                        {currentZoom}%
                    </span>
                )}
            </button>

            {/* القائمة المنبثقة الأنيقة عند النقر فقط */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-3 w-72 rounded-[24px] bg-white/95 dark:bg-[#181824]/95 backdrop-blur-2xl border-2 border-black/10 dark:border-white/10 p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 text-right select-none">
                    
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-primary" />
                            <span className="text-sm font-black text-slate-800 dark:text-white">أبعاد وحجم الشاشة</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-primary/15 text-primary">
                            {currentZoom}%
                        </span>
                    </div>

                    {/* خيارات سريعة مجهزة بنقرة واحدة */}
                    <div className="flex flex-col gap-1.5 mb-3">
                        {[
                            { val: 100, label: '100% — الحجم القياسي الكامل', desc: 'مناسب للشاشات الكبيرة والمكتبية' },
                            { val: 80,  label: '80% — حجم متوازن', desc: 'توسيع مناسب للمساحة' },
                            { val: 67,  label: '67% — شاشات الكاشير الصغيرة', desc: 'إظهار كافة العناصر والفاتورة دون تمرير' },
                        ].map(opt => {
                            const isSelected = currentZoom === opt.val;
                            return (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => setPreset(opt.val)}
                                    className={`w-full p-2.5 rounded-[16px] text-right transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected
                                            ? 'bg-primary text-white shadow-md shadow-primary/25 font-black'
                                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-bold'
                                    }`}
                                >
                                    <div>
                                        <div className="text-xs font-black">{opt.label}</div>
                                        <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                            {opt.desc}
                                        </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* التحكم المتدرج والتعديل الدقيق */}
                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">تحكم دقيق:</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={zoomOut}
                                className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer active:scale-95"
                                title="تصغير"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-black px-2 min-w-[40px] text-center text-slate-800 dark:text-white">
                                {currentZoom}%
                            </span>
                            <button
                                type="button"
                                onClick={zoomIn}
                                className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer active:scale-95"
                                title="تكبير"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <p className="mt-2.5 text-[10px] font-bold text-slate-400 text-center">
                        💡 يمكنك أيضاً استخدام اختصارات الكيبورد Ctrl + و Ctrl -
                    </p>
                </div>
            )}
        </div>
    );
}
