import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const ZOOM_STEPS = [50, 60, 67, 75, 80, 90, 100, 110, 125];

export function ZoomControl({ className = '' }: { className?: string }) {
    const [currentZoom, setCurrentZoom] = useState<number>(100);

    useEffect(() => {
        const saved = localStorage.getItem('app_zoom_factor');
        const initial = saved ? Number(saved) : 100;
        if (!isNaN(initial) && initial >= 50 && initial <= 150) {
            applyZoom(initial);
            setCurrentZoom(initial);
        }
    }, []);

    function applyZoom(zoomVal: number) {
        // تطبيق التكبير/التصغير محلياً على المتصفح ومحرك Electron
        const factor = zoomVal / 100;
        (document.body.style as any).zoom = `${zoomVal}%`;
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
    }

    return (
        <div className={`flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 select-none ${className}`}>
            <button
                type="button"
                onClick={zoomOut}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                title="تبعيد / تصغير الشاشة"
            >
                <ZoomOut className="w-4 h-4" />
            </button>

            {/* الأزرار السريعة للنسب الشائعة */}
            <div className="flex items-center gap-1">
                {[67, 80, 100].map(pct => (
                    <button
                        key={pct}
                        type="button"
                        onClick={() => setPreset(pct)}
                        className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            currentZoom === pct
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        {pct}%
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={zoomIn}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                title="تقريب / تكبير الشاشة"
            >
                <ZoomIn className="w-4 h-4" />
            </button>
        </div>
    );
}

