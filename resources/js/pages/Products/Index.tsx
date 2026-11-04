import React, { useState, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, Pagination, normalizeSearchText, matchesSearchText } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Pencil, Trash2, X, Check, Package, QrCode, RefreshCw, Printer, SlidersHorizontal, Search, RotateCcw, AlertTriangle, Calculator, Star, FileSpreadsheet, Upload, Download, FileUp, ChevronDown } from 'lucide-react';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

interface Category  { id: number; name: string; unit: 'ml' | 'pcs' | 'g'; is_operational: boolean; }
interface PriceTier { id: number; name: string; description: string | null; }
interface ProductPrice {
    price_per_unit_regular: string; price_per_unit_vip: string;
    full_bottle_regular: string | null; full_bottle_vip: string | null;
}
interface OriginalPerfumeDetail { bottle_volume: string; }
interface Product {
    id: number; name: string; selling_type: 'tier_based' | 'unit_priced';
    stock: string; min_stock: string;
    qrcode: string | null;
    category: Category; price_tier: PriceTier | null;
    price_tier_id?: number | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalPerfumeDetail | null;
}

interface Props {
    products: Product[];
    categories: Category[];
    tiers: PriceTier[];
    flash?: { success?: string; error?: string };
}

const unitLabels = { ml: 'مليلتر', pcs: 'قطعة', g: 'غرام' };

function fmt(val: string | null | undefined): string {
    if (!val) return '';
    const n = parseFloat(val);
    return Number.isInteger(n) ? String(n) : n.toString();
}

const emptyForm = {
    name: '', category_id: '', selling_type: 'tier_based' as 'tier_based' | 'unit_priced',
    price_tier_id: '', min_stock: '', qrcode: '',
    price_per_unit_regular: '', price_per_unit_vip: '',
    full_bottle_regular: '', full_bottle_vip: '', bottle_volume: '',
};

function resolveSellingType(cat: Category): 'tier_based' | 'unit_priced' {
    if (cat.is_operational) return 'unit_priced';
    return cat.unit === 'ml' && cat.name.includes('زيت') ? 'tier_based' : 'unit_priced';
}

/** توليد كود QR عشوائي فريد */
function generateQrCode(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}



// ─── Modal عرض وطباعة ملصق المنتج (Thermal Label Printer Engine) ───
interface QrModalProps {
    product?: Product | null;
    productsList?: Product[];
    onClose: () => void;
}

function getProductPrice(p: Product | null | undefined): string {
    if (!p) return '';
    return p.product_price?.full_bottle_regular && Number(p.product_price.full_bottle_regular) > 0
        ? `${toAsciiDigits(Number(p.product_price.full_bottle_regular).toLocaleString('en-US'))} د.ل`
        : p.product_price?.price_per_unit_regular && Number(p.product_price.price_per_unit_regular) > 0
        ? `${toAsciiDigits(Number(p.product_price.price_per_unit_regular).toLocaleString('en-US'))} د.ل`
        : '';
}

const PERFUME_SVG_B64 = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="22" y="18" width="20" height="32" rx="6" fill="#1e293b"/><rect x="26" y="10" width="12" height="10" rx="3" fill="#1e293b"/><rect x="29" y="6" width="6" height="6" rx="2" fill="#475569"/><ellipse cx="32" cy="34" rx="6" ry="8" fill="white" opacity="0.15"/><rect x="28" y="8" width="2" height="4" rx="1" fill="white" opacity="0.4"/></svg>`);

const PRESET_LABEL_SIZES = [
    { label: '50 × 25 مم (الأكثر شيوعاً)', w: 50, h: 25 },
    { label: '50 × 30 مم', w: 50, h: 30 },
    { label: '40 × 25 مم', w: 40, h: 25 },
    { label: '60 × 40 مم', w: 60, h: 40 },
];

function toAsciiDigits(str: string | number | null | undefined): string {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function toEan13(code: string): string {
    const digits = toAsciiDigits(code).replace(/\D/g, '');
    let base12 = '';
    if (digits.length === 12) {
        base12 = digits;
    } else if (digits.length === 13) {
        base12 = digits.slice(0, 12);
    } else if (digits.length === 10) {
        base12 = '20' + digits; // بادئة المتاجر الداخلية القياسية GS1
    } else {
        base12 = digits.padStart(12, '0').slice(-12);
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(base12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base12 + checkDigit;
}

interface WorkstationSelectOption {
    value: string;
    label: string;
    badge?: string;
    isRecommended?: boolean;
}

function WorkstationSelect({
    value,
    onChange,
    options,
    placeholder = 'اختر...',
    className = '',
}: {
    value: string;
    onChange: (val: string) => void;
    options: WorkstationSelectOption[];
    placeholder?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOut(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOut);
        return () => document.removeEventListener('mousedown', handleOut);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full h-10 px-3 rounded-[2px] bg-white dark:bg-[#09111c] border border-slate-200 dark:border-[#1d2d42] font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between hover:border-brand shadow-xs transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                    {selectedOption?.isRecommended && (
                        <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shrink-0">
                            موصى بها
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 mr-1.5 ${open ? 'rotate-180 text-brand' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[100] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden max-h-56 overflow-y-auto custom-scroll p-1.5 animate-in fade-in duration-100 min-w-[200px]">
                    {options.map((opt, idx) => {
                        const isSelected = opt.value === value;
                        return (
                            <Fragment key={opt.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-right px-3 py-2.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                                        isSelected
                                            ? 'bg-brand/10 text-brand dark:text-white border-brand/30 shadow-2xs'
                                            : 'border-slate-100 dark:border-[#162234] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#131f32] hover:border-slate-300 dark:hover:border-[#22354e]'
                                    }`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    <div className="flex items-center gap-1.5 shrink-0 mr-2">
                                        {opt.isRecommended && (
                                            <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                                                موصى بها
                                            </span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                                    </div>
                                </button>
                                {idx < options.length - 1 && (
                                    <div className="h-[1.5px] bg-slate-200 dark:bg-[#1a283e] my-1 mx-1" />
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function WorkstationMultiSearch({
    values,
    onSelect,
    options,
    placeholder = 'ابحث باسم المنتج، أو الكود، أو الباركود...',
}: {
    values: string[];
    onSelect: (vals: string[]) => void;
    options: { value: string; label: string; badge?: string; meta?: string; searchKey?: string }[];
    placeholder?: string;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleOut(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOut);
        return () => document.removeEventListener('mousedown', handleOut);
    }, []);

    const filtered = options.filter(o => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return (
            o.label.toLowerCase().includes(q) ||
            (o.searchKey && o.searchKey.toLowerCase().includes(q)) ||
            (o.badge && o.badge.toLowerCase().includes(q))
        );
    });

    const handleAdd = (val: string) => {
        if (!val.trim()) return;
        if (!values.includes(val)) {
            onSelect([...values, val]);
        }
        setSearch('');
    };

    const handleRemove = (val: string) => {
        onSelect(values.filter(v => v !== val));
    };

    return (
        <div className="flex flex-col gap-2 relative" ref={ref}>
            <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (search.trim()) {
                                handleAdd(search.trim());
                            }
                        }
                    }}
                    placeholder={placeholder}
                    className="h-11 w-full pr-9 pl-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand shadow-xs transition-colors"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute left-3 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {values.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-[2px] bg-slate-100/70 dark:bg-[#09111c]/70 border border-slate-200 dark:border-[#1d2d42]">
                    {values.map(val => {
                        const opt = options.find(o => o.value === val);
                        const label = opt ? opt.label : `بحث: "${val}"`;
                        return (
                            <span
                                key={val}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle font-bold text-xs shadow-2xs"
                            >
                                <span className="truncate max-w-[160px]">{label}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(val)}
                                    className="w-3.5 h-3.5 rounded-[1px] hover:bg-brand/20 flex items-center justify-center transition-colors cursor-pointer text-brand"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {open && (
                <div className="absolute top-full mt-1 right-0 left-0 z-50 bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] max-h-60 overflow-y-auto custom-scroll p-1 animate-in fade-in duration-100">
                    {search.trim() && (
                        <button
                            type="button"
                            onClick={() => {
                                handleAdd(search.trim());
                                setOpen(false);
                            }}
                            className="w-full text-right px-3 py-2 rounded-[2px] text-xs font-bold text-brand hover:bg-brand-subtle flex items-center gap-2 border-b border-slate-100 dark:border-[#172437] mb-1"
                        >
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span>إضافة ككلمة بحث حرة: "{search.trim()}"</span>
                        </button>
                    )}

                    {filtered.length === 0 ? (
                        <div className="p-3 text-center text-xs font-semibold text-slate-400">
                            لا توجد منتجات مطابقة
                        </div>
                    ) : (
                        filtered.slice(0, 30).map((opt, idx) => {
                            const isSelected = values.includes(opt.value);
                            return (
                                <Fragment key={opt.value}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                handleRemove(opt.value);
                                            } else {
                                                handleAdd(opt.value);
                                            }
                                        }}
                                        className={`w-full text-right px-3 py-2.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                                            isSelected
                                                ? 'bg-brand/10 text-brand dark:text-white border-brand/30 shadow-2xs'
                                                : 'border-slate-100 dark:border-[#162234] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#131f32] hover:border-slate-300 dark:hover:border-[#22354e]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="truncate">{opt.label}</span>
                                            {opt.badge && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 font-medium">
                                                    {opt.badge}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 mr-1.5">
                                            {opt.meta && (
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    المخزون: {opt.meta}
                                                </span>
                                            )}
                                            {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                                        </div>
                                    </button>
                                    {idx < Math.min(filtered.length, 30) - 1 && (
                                        <div className="h-[1.5px] bg-slate-200 dark:bg-[#1a283e] my-1 mx-1" />
                                    )}
                                </Fragment>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function QrModal({ product, productsList, onClose }: QrModalProps) {
    const isBulk = Array.isArray(productsList) && productsList.length > 0;
    const items = isBulk ? productsList : (product ? [product] : []);
    const [previewIndex, setPreviewIndex] = useState<number>(0);

    const activeProduct = items[previewIndex] || items[0];
    const priceDisplay = getProductPrice(activeProduct);
    const [tab, setTab] = useState<'ean13' | 'serial' | 'classic'>(() => {
        const saved = localStorage.getItem('label_printer_tab');
        if (saved === 'classic' || saved === 'serial' || saved === 'ean13') return saved;
        return 'ean13';
    });

    const [widthMm, setWidthMm] = useState<number>(() => {
        const saved = localStorage.getItem('label_printer_w');
        return saved ? Number(saved) : 50;
    });

    const [heightMm, setHeightMm] = useState<number>(() => {
        const saved = localStorage.getItem('label_printer_h');
        return saved ? Number(saved) : 25;
    });

    const [rotation, setRotation] = useState<number>(() => {
        const saved = localStorage.getItem('label_printer_rot');
        return saved !== null ? Number(saved) : 0;
    });

    const [showName, setShowName] = useState<boolean>(() => {
        return localStorage.getItem('label_printer_show_name') !== 'false';
    });

    const [showPrice, setShowPrice] = useState<boolean>(() => {
        return localStorage.getItem('label_printer_show_price') !== 'false';
    });

    const [showCodeText, setShowCodeText] = useState<boolean>(() => {
        return localStorage.getItem('label_printer_show_code') !== 'false';
    });

    const [offsetX, setOffsetX] = useState<number>(() => {
        const saved = localStorage.getItem('label_printer_offset_x');
        return saved !== null ? Number(saved) : 0;
    });

    const [offsetY, setOffsetY] = useState<number>(() => {
        const saved = localStorage.getItem('label_printer_offset_y');
        return saved !== null ? Number(saved) : 1; // إزاحة افتراضية 1 مم للأسفل لمنع الالتصاق بالأعلى والورقة البيضاء
    });

    const [qrSizeCustom, setQrSizeCustom] = useState<number | null>(() => {
        const saved = localStorage.getItem('label_printer_qr_size');
        return saved ? Number(saved) : null;
    });

    const [titleFontSizeCustom, setTitleFontSizeCustom] = useState<number | null>(() => {
        const saved = localStorage.getItem('label_printer_title_font_size');
        return saved ? Number(saved) : null;
    });

    const [copies, setCopies] = useState<number>(1);
    const [isCustomSize, setIsCustomSize] = useState<boolean>(() => {
        return !PRESET_LABEL_SIZES.some(s => s.w === widthMm && s.h === heightMm);
    });
    const [printingNode, setPrintingNode] = useState<boolean>(false);
    const [nodePrintMsg, setNodePrintMsg] = useState<{ success: boolean; text: string } | null>(null);
    const [stockForms, setStockForms] = useState<string[]>([]);
    const [selectedStock, setSelectedStock] = useState<string>(() => localStorage.getItem('label_printer_stock') || '');
    const [printersList, setPrintersList] = useState<{ name: string; forms?: string[] }[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string>(() => localStorage.getItem('label_printer_name') || '');
    const [loadingPrinters, setLoadingPrinters] = useState<boolean>(false);

    const loadPrinters = (preferCurrent: boolean = true) => {
        setLoadingPrinters(true);
        fetch('/settings/node-printer/printers')
            .then(r => r.json())
            .then(res => {
                if (res.success && Array.isArray(res.printers)) {
                    setPrintersList(res.printers);
                    const currentSelected = selectedPrinter || localStorage.getItem('label_printer_name');
                    const exists = currentSelected && res.printers.some((p: any) => p.name === currentSelected);
                    let target = '';
                    if (preferCurrent && currentSelected && exists) {
                        target = currentSelected;
                    } else if (res.label_configured && res.printers.some((p: any) => p.name === res.label_configured)) {
                        target = res.label_configured;
                    } else {
                        const labelP = res.printers.find((p: any) => /365|235|barcode|label|tsc|zebra|xprinter\s+xp-[23]/i.test(p.name))
                            || res.printers.find((p: any) => !/80|58|pos|receipt|pdf|xps|onenote/i.test(p.name))
                            || res.printers[0];
                        if (labelP) target = labelP.name;
                    }

                    if (target) {
                        setSelectedPrinter(target);
                        localStorage.setItem('label_printer_name', target);
                        const pObj = res.printers.find((p: any) => p.name === target);
                        if (pObj && Array.isArray(pObj.forms)) {
                            setStockForms(pObj.forms);
                        }
                    }
                }
            })
            .catch(() => {})
            .finally(() => setLoadingPrinters(false));
    };

    useEffect(() => {
        loadPrinters(true);
    }, []);

    const handleSelectPrinter = (name: string) => {
        setSelectedPrinter(name);
        localStorage.setItem('label_printer_name', name);
        const pObj = printersList.find(p => p.name === name);
        if (pObj && Array.isArray(pObj.forms)) {
            setStockForms(pObj.forms);
        } else {
            setStockForms([]);
        }
    };

    const handleNodePrint = async () => {
        setPrintingNode(true);
        setNodePrintMsg(null);
        try {
            if (isBulk) {
                const payloadItems = items.map(p => ({
                    product_name: p.name,
                    price: getProductPrice(p),
                    code: p.qrcode || '0000000000',
                }));

                const res = await fetch('/settings/node-printer/print-batch-labels', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    },
                    body: JSON.stringify({
                        printer_name: selectedPrinter || 'Xprinter XP-365B',
                        width_mm: widthMm,
                        height_mm: heightMm,
                        rotation: rotation,
                        offset_x: offsetX,
                        offset_y: offsetY,
                        tab: tab,
                        show_name: showName,
                        show_price: showPrice,
                        show_code_text: showCodeText,
                        qr_size: activeQrSizeMm,
                        title_font_size: activeTitleFontSizePt,
                        copies: copies,
                        protocol: 'tspl',
                        items: payloadItems,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setNodePrintMsg({ success: true, text: data.message || `تم إرسال ${items.length} ملصق بنجاح إلى الطابعة!` });
                } else {
                    setNodePrintMsg({ success: false, text: data.message || 'فشلت عملية الطباعة الجماعية' });
                }
            } else {
                const res = await fetch('/settings/node-printer/print-label', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    },
                    body: JSON.stringify({
                        printer_name: selectedPrinter || 'Xprinter XP-365B',
                        width_mm: widthMm,
                        height_mm: heightMm,
                        rotation: rotation,
                        offset_x: offsetX,
                        offset_y: offsetY,
                        tab: tab,
                        product_name: activeProduct.name,
                        price: priceDisplay,
                        code: activeProduct.qrcode || '0000000000',
                        show_name: showName,
                        show_price: showPrice,
                        show_code_text: showCodeText,
                        qr_size: activeQrSizeMm,
                        title_font_size: activeTitleFontSizePt,
                        copies: copies,
                        protocol: 'tspl',
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setNodePrintMsg({ success: true, text: data.message || 'تم إرسال الملصق بنجاح إلى الطابعة!' });
                } else {
                    setNodePrintMsg({ success: false, text: data.message || 'فشلت عملية الطباعة' });
                }
            }
        } catch (e: any) {
            setNodePrintMsg({ success: false, text: e?.message || 'تعذر الاتصال بمحرك الطباعة' });
        } finally {
            setPrintingNode(false);
        }
    };

    // حساب المقاس التلقائي المتناسق لرمز QR بناءً على أبعاد الورقة المحددة
    // يحترم أبعاد الورقة ديناميكياً (لا يتجاوز 65% من ارتفاع المساحة المتاحة ولا 28% من عرض الورقة)
    const autoQrSizeMm = Math.max(8, Math.min(
        15,
        Math.round(Math.min((heightMm - (showName ? 5.5 : 2)) * 0.65, widthMm * 0.28) * 10) / 10
    ));
    const activeQrSizeMm = qrSizeCustom !== null ? qrSizeCustom : autoQrSizeMm;

    // حساب حجم الخط التلقائي أو المخصص لاسم المنتج (بالنقاط pt)
    const isRotated = rotation === 90 || rotation === 270;
    const labelInnerH = isRotated ? widthMm : heightMm;
    const autoTitleFontSizePt = Math.round(Math.min(10, Math.max(6.5, labelInnerH * 0.28)) * 10) / 10;
    const activeTitleFontSizePt = titleFontSizeCustom !== null ? titleFontSizeCustom : autoTitleFontSizePt;

    // حفظ التفضيلات محلياً
    const updateSize = (w: number, h: number) => {
        setWidthMm(w);
        setHeightMm(h);
        setIsCustomSize(false);
        localStorage.setItem('label_printer_w', String(w));
        localStorage.setItem('label_printer_h', String(h));
    };

    const toggleRotation = () => {
        const next = rotation === 0 ? 90 : rotation === 90 ? 180 : rotation === 180 ? 270 : 0;
        setRotation(next);
        localStorage.setItem('label_printer_rot', String(next));
    };

    const updateOffsetX = (delta: number) => {
        const next = Math.max(-20, Math.min(30, offsetX + delta));
        setOffsetX(next);
        localStorage.setItem('label_printer_offset_x', String(next));
    };

    const updateOffsetY = (delta: number) => {
        const next = Math.max(-15, Math.min(20, Math.round((offsetY + delta) * 10) / 10));
        setOffsetY(next);
        localStorage.setItem('label_printer_offset_y', String(next));
    };

    function handlePrint() {
        const win = window.open('', '_blank', 'width=550,height=550');
        if (!win) return;

        const isRotated = rotation === 90 || rotation === 270;
        // الأبعاد الحقيقية للمحتوى الداخلي عند التدوير
        const innerW = isRotated ? heightMm : widthMm;
        const innerH = isRotated ? widthMm : heightMm;

        // حساب المقاسات المناسبة حسب نوع الرمز بناءً على أبعاد الورقة
        const autoQrSizeForPrint = Math.max(8, Math.min(
            15,
            Math.round(Math.min((innerH - (showName ? 5.5 : 2)) * 0.65, innerW * 0.28) * 10) / 10
        ));
        const qrBoxSizeMm = qrSizeCustom !== null ? qrSizeCustom : autoQrSizeForPrint;

        const labelsHtml = items.map(p => {
            const pPrice = getProductPrice(p);
            let graphicSvgHtml = '';
            if (tab === 'classic') {
                const qrSvgEl = (document.querySelector(`#bulk-barcode-item-${p.id} svg`) as SVGElement | null)
                    || (document.querySelector('#label-modal-qr-preview svg') as SVGElement | null);
                graphicSvgHtml = qrSvgEl ? qrSvgEl.outerHTML : '';
            } else {
                const barSvgEl = (document.querySelector(`#bulk-barcode-item-${p.id} svg`) as SVGElement | null)
                    || (document.querySelector('#label-modal-bar-preview svg') as SVGElement | null);
                if (barSvgEl) {
                    const cloned = barSvgEl.cloneNode(true) as SVGElement;
                    if (tab === 'ean13') {
                        const firstText = cloned.querySelector('g:first-of-type text');
                        if (firstText) {
                            firstText.remove();
                        }
                    }
                    graphicSvgHtml = cloned.outerHTML;
                }
            }

            const isLongTitle = p.name && p.name.length > 18;
            const titleAllocatedH = showName ? (isLongTitle ? 6.5 : 4) : 0;
            const availableBarH = Math.max(7, innerH - titleAllocatedH - (showPrice ? 4 : 0) - 2);

            const singleHtml = (tab === 'classic' ? `
                <div class="label-page">
                    <div class="label-content classic-layout">
                        ${showName ? `<div class="p-name full-width">${p.name}</div>` : ''}

                        <div class="classic-body">
                            <div class="info-side">
                                ${showCodeText && p.qrcode ? `<div class="p-code">${p.qrcode}</div>` : ''}
                                ${showPrice && pPrice ? `<div class="p-price">${pPrice}</div>` : ''}
                            </div>

                            <div class="qr-side">
                                <div class="graphic-wrap qr-wrap">
                                    ${graphicSvgHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="label-page">
                    <div class="label-content bar-layout">
                        ${showName ? `<div class="p-name">${p.name}</div>` : ''}

                        <div class="graphic-wrap bar-wrap">
                            ${graphicSvgHtml}
                        </div>

                        ${showPrice && pPrice ? `<div class="p-price">${pPrice}</div>` : ''}
                    </div>
                </div>
            `).trim();

            return Array.from({ length: Math.max(1, copies) }).map(() => singleHtml).join('');
        }).join('');

        win.document.write(`
            <!DOCTYPE html>
            <html dir="ltr">
            <head>
                <meta charset="utf-8" />
                <title>${isBulk ? `طباعة ملصقات جماعية (${items.length} منتج)` : `طباعة ملصق - ${activeProduct.name}`}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: ${widthMm}mm ${heightMm}mm;
                        margin: 0 !important;
                    }
                    * {
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    html {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: ${widthMm}mm !important;
                        height: ${heightMm}mm !important;
                        overflow: hidden !important;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff;
                        overflow: hidden !important;
                        direction: ltr !important;
                        font-size: 0 !important;
                        line-height: 0 !important;
                        font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    }
                    .label-page {
                        width: ${widthMm}mm !important;
                        height: ${heightMm - 1}mm !important;
                        max-width: ${widthMm}mm !important;
                        max-height: ${heightMm - 1}mm !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        overflow: hidden !important;
                        background: #fff;
                        margin: 0 auto !important;
                        text-align: center !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .label-page:not(:last-child) {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .label-page:last-child {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    
                    /* تنسيق ملصق الـ QR المربع الحديث (اسم كامل بالعرض، الرمز بالجانب وتحته السعر، محاذاة في المنتصف ومسافات متقاربة) */
                    .label-content.classic-layout {
                        width: ${innerW}mm !important;
                        height: ${innerH - 1.2}mm !important;
                        max-width: ${innerW}mm !important;
                        max-height: ${innerH - 1.2}mm !important;
                        padding: 1.2mm 1.5mm !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: center !important;
                        align-items: center !important;
                        gap: 0.8mm !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                        transform: translate(${offsetX}mm, ${offsetY}mm) ${rotation !== 0 ? `rotate(${rotation}deg)` : ''};
                        transform-origin: center center;
                    }
                    .classic-layout .p-name.full-width {
                        font-family: 'Tajawal', sans-serif !important;
                        width: 100% !important;
                        direction: rtl !important;
                        text-align: center !important;
                        font-size: ${activeTitleFontSizePt}pt !important;
                        font-weight: 900;
                        color: #000;
                        display: -webkit-box !important;
                        -webkit-line-clamp: 2 !important;
                        -webkit-box-orient: vertical !important;
                        overflow: hidden !important;
                        word-break: break-word !important;
                        white-space: normal !important;
                        line-height: 1.15 !important;
                        margin: 0 !important;
                        padding: 0 1mm !important;
                    }
                    .classic-body {
                        width: 100% !important;
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        justify-content: center !important;
                        direction: rtl !important;
                        gap: 2.5mm !important;
                        overflow: hidden !important;
                        margin: 0 auto !important;
                    }
                    .classic-body .info-side {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 0.8mm !important;
                        text-align: center !important;
                        flex: 1 1 auto !important;
                        overflow: hidden !important;
                        direction: rtl !important;
                    }
                    .classic-body .info-side .p-code {
                        font-family: monospace, sans-serif !important;
                        font-size: 6.5pt !important;
                        font-weight: 800;
                        color: #111;
                        letter-spacing: 0.6px;
                        direction: ltr !important;
                        text-align: center !important;
                    }
                    .classic-body .info-side .p-price {
                        font-family: 'Tajawal', sans-serif !important;
                        font-size: 10pt !important;
                        font-weight: 900;
                        color: #000;
                        direction: rtl !important;
                        text-align: center !important;
                        white-space: nowrap;
                    }
                    .classic-body .qr-side {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        flex-shrink: 0 !important;
                    }
                    .graphic-wrap.qr-wrap {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: ${qrBoxSizeMm}mm !important;
                        height: ${qrBoxSizeMm}mm !important;
                        margin: 0 auto !important;
                    }
                    .graphic-wrap.qr-wrap svg {
                        display: block !important;
                        width: ${qrBoxSizeMm}mm !important;
                        height: ${qrBoxSizeMm}mm !important;
                        max-width: ${qrBoxSizeMm}mm !important;
                        max-height: ${qrBoxSizeMm}mm !important;
                    }

                    /* تنسيق ملصق الباركود العادي */
                    .label-content.bar-layout {
                        width: ${innerW}mm !important;
                        height: ${innerH - 1.2}mm !important;
                        max-width: ${innerW}mm !important;
                        max-height: ${innerH - 1.2}mm !important;
                        padding: 1.2mm 1.2mm 0.8mm 1.2mm !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 0.6mm !important;
                        text-align: center !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                        transform: translate(${offsetX}mm, ${offsetY}mm) ${rotation !== 0 ? `rotate(${rotation}deg)` : ''};
                        transform-origin: center center;
                    }
                    .bar-layout .p-name {
                        font-family: 'Tajawal', sans-serif !important;
                        direction: rtl !important;
                        text-align: center !important;
                        font-size: ${activeTitleFontSizePt}pt !important;
                        font-weight: 900;
                        color: #000;
                        display: -webkit-box !important;
                        -webkit-line-clamp: 2 !important;
                        -webkit-box-orient: vertical !important;
                        overflow: hidden !important;
                        word-break: break-word !important;
                        white-space: normal !important;
                        width: 100% !important;
                        line-height: 1.15 !important;
                        margin: 0 !important;
                        padding: 0 1mm !important;
                    }
                    .graphic-wrap.bar-wrap {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 100% !important;
                        max-height: ${availableBarH}mm !important;
                        overflow: hidden !important;
                        margin: 0 auto !important;
                    }
                    .graphic-wrap.bar-wrap svg {
                        display: block !important;
                        margin: 0 auto !important;
                        width: 92% !important;
                        max-height: ${availableBarH}mm !important;
                        height: auto !important;
                        object-fit: contain !important;
                    }
                    .bar-layout .p-price {
                        font-family: 'Tajawal', sans-serif !important;
                        font-size: 10.5pt !important;
                        font-weight: 900;
                        color: #000;
                        direction: rtl !important;
                        text-align: center !important;
                        line-height: 1.1;
                        white-space: nowrap;
                    }
                </style>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 250);
                    };
                </script>
            </head>
            <body>${labelsHtml}</body>
            </html>
        `);
        win.document.close();
    }

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            {/* الخلفية المعتمة ببلور ناعم وتعتيم كامل */}
            <div
                className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer transition-opacity"
                onClick={onClose}
            />

            {/* نافذة الموديل بنمط Workstation UI العصري */}
            <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#0c1421] rounded-[2px] shadow-2xl border border-slate-200 dark:border-[#1d2d42] flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[2px] bg-brand-subtle text-brand flex items-center justify-center border border-brand-subtle shadow-xs">
                            <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                {isBulk ? 'طباعة جماعية لملصقات الباركود والـ QR' : 'طباعة ملصق الباركود والـ QR'}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">
                                    {isBulk ? `طباعة دفعة واحدة لـ ${items.length} منتج في نتائج البحث` : activeProduct.name}
                                </span>
                                {isBulk ? (
                                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle">
                                        {items.length} عنصر
                                    </span>
                                ) : (
                                    activeProduct.qrcode && (
                                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1d2d42]">
                                            {activeProduct.qrcode}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-[2px] bg-white dark:bg-[#152238] hover:bg-rose-500 hover:text-white text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer border border-slate-200 dark:border-[#1d2d42] active:scale-95"
                        title="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Content: شبكة مقسمة لعمودين (معاينة حية على جانب، والإعدادات على الجانب الآخر) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">

                        {/* العمود 1 (اليمين في RTL): المعاينة الحية للملصق وخيارات الإظهار */}
                        <div className="md:col-span-5 flex flex-col gap-3.5">
                            {/* صندوق المعاينة */}
                            <div className="flex flex-col items-center justify-center p-3.5 rounded-[2px] bg-slate-50/70 dark:bg-[#080e18] border border-dashed border-slate-300 dark:border-[#1d2d42]">
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between w-full">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {isBulk ? `معاينة نموذجية (${previewIndex + 1} من ${items.length})` : 'معاينة الملصق المباشرة'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="px-2 py-0.5 rounded-[2px] bg-brand-subtle text-brand text-[10px] font-mono font-bold border border-brand-subtle">
                                            {widthMm} × {heightMm} مم
                                        </span>
                                        {rotation !== 0 && (
                                            <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                                {rotation}°
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* شريط التنقل بين المنتجات لمعاينة أي منتج في حالة الطباعة الجماعية */}
                                {isBulk && items.length > 1 && (
                                    <div className="flex items-center justify-between w-full px-1 mb-2.5 bg-white dark:bg-[#0c1421] p-1.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42]">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]" title={activeProduct.name}>
                                            {activeProduct.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex(prev => (prev > 0 ? prev - 1 : items.length - 1))}
                                                className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] hover:bg-brand hover:text-white text-[10px] font-bold cursor-pointer border border-slate-200 dark:border-[#1d2d42] transition-colors"
                                                title="معاينة المنتج السابق"
                                            >
                                                السابق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex(Math.floor(Math.random() * items.length))}
                                                className="px-2 py-0.5 rounded-[2px] bg-brand-subtle text-brand hover:bg-brand hover:text-white text-[10px] font-bold cursor-pointer border border-brand-subtle transition-colors"
                                                title="اختيار منتج عشوائي للمعاينة"
                                            >
                                                عشوائي 🎲
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex(prev => (prev < items.length - 1 ? prev + 1 : 0))}
                                                className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] hover:bg-brand hover:text-white text-[10px] font-bold cursor-pointer border border-slate-200 dark:border-[#1d2d42] transition-colors"
                                                title="معاينة المنتج التالي"
                                            >
                                                التالي
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* الصندوق الأبيض الحقيقي للملصق */}
                                <div
                                    style={{
                                        width: '210px',
                                        height: `${Math.max(95, Math.min(160, Math.round(210 * (heightMm / widthMm))))}px`,
                                    }}
                                    className="bg-white rounded-[2px] shadow-md border border-slate-300 p-2 flex flex-col items-center justify-center text-slate-900 font-sans transition-all overflow-hidden select-none relative"
                                >
                                    <div
                                        style={{
                                            transform: `translate(${offsetX * 2}px, ${offsetY * 2}px) ${rotation !== 0 ? `rotate(${rotation}deg) ` : ''}`,
                                            transformOrigin: 'center center',
                                        }}
                                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 transition-transform py-1 px-1 font-sans"
                                    >
                                        {showName && (
                                            <span
                                                style={{ fontSize: `${activeTitleFontSizePt}pt`, lineHeight: 1.15 }}
                                                className="font-sans font-black text-slate-900 line-clamp-2 break-words w-full text-center px-1"
                                                title={activeProduct.name}
                                            >
                                                {activeProduct.name}
                                            </span>
                                        )}

                                        {tab === 'classic' ? (
                                            <div className="flex items-center justify-center w-full gap-3 px-1 overflow-hidden" dir="rtl">
                                                {/* جهة اليمين: الكود وتحته السعر */}
                                                <div className="flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden font-sans">
                                                    {showCodeText && activeProduct.qrcode && (
                                                        <span className="font-mono text-[11px] font-bold text-slate-700 tracking-wider text-center">
                                                            {toAsciiDigits(activeProduct.qrcode)}
                                                        </span>
                                                    )}
                                                    {showPrice && priceDisplay && (
                                                        <span className="font-sans text-emerald-700 font-black text-sm leading-tight text-center">
                                                            {priceDisplay}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* جهة اليسار: رمز QR متناسق الأبعاد مع الورقة ومقترب من السعر */}
                                                <div id="label-modal-qr-preview" className="shrink-0 flex items-center justify-center p-0.5">
                                                    {(() => {
                                                        const previewBoxH = Math.max(95, Math.min(160, Math.round(210 * (heightMm / widthMm))));
                                                        const previewQrSize = Math.max(30, Math.min(Math.round(previewBoxH - 16), Math.round(activeQrSizeMm * (210 / widthMm))));
                                                        const logoSize = Math.max(8, Math.round(previewQrSize * 0.22));
                                                        return (
                                                            <QRCodeSVG
                                                                value={toAsciiDigits(activeProduct.qrcode || '0000000000')}
                                                                size={previewQrSize}
                                                                level="H"
                                                                fgColor="#000000"
                                                                imageSettings={{
                                                                    src: PERFUME_SVG_B64,
                                                                    width: logoSize,
                                                                    height: logoSize,
                                                                    excavate: true,
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1 flex items-center justify-center w-full overflow-hidden my-0.5">
                                                    {tab === 'ean13' && (
                                                        <div id="label-modal-bar-preview" className="w-full flex items-center justify-center [&_g:first-of-type_text]:hidden">
                                                            <Barcode
                                                                value={toEan13(activeProduct.qrcode || '0000000000')}
                                                                format="EAN13"
                                                                width={1.85}
                                                                height={34}
                                                                displayValue={showCodeText}
                                                                textMargin={1}
                                                                fontSize={11}
                                                                font="monospace"
                                                                margin={0}
                                                                lineColor="#000000"
                                                            />
                                                        </div>
                                                    )}

                                                    {tab === 'serial' && (
                                                         <div id="label-modal-bar-preview" className="w-full flex items-center justify-center">
                                                            <Barcode
                                                                value={toAsciiDigits(activeProduct.qrcode || '0000000000')}
                                                                format="CODE128"
                                                                width={1.75}
                                                                height={34}
                                                                displayValue={showCodeText}
                                                                textMargin={1}
                                                                fontSize={11}
                                                                font="monospace"
                                                                margin={0}
                                                                lineColor="#000000"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {showPrice && priceDisplay && (
                                                    <div className="flex items-center justify-center w-full px-1 text-[11px] font-black leading-none mt-0.5">
                                                        <span className="font-sans text-emerald-700 font-extrabold">
                                                            {priceDisplay}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <p className="text-[10px] font-bold text-slate-400 text-center mt-2">
                                    المعاينة مطابقة تماماً للملصق الحراري الفعلي 100%
                                </p>
                            </div>

                            {/* خيارات المحتوى الظاهر على الملصق */}
                            <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">عناصر الملصق:</span>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className={`flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-[2px] text-xs font-bold cursor-pointer border transition-all ${
                                        showName
                                            ? 'bg-brand-subtle text-brand border-brand-subtle shadow-xs'
                                            : 'bg-transparent text-slate-400 border-transparent hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={showName}
                                            onChange={e => {
                                                setShowName(e.target.checked);
                                                localStorage.setItem('label_printer_show_name', String(e.target.checked));
                                            }}
                                            className="hidden"
                                        />
                                        <span>اسم العطر</span>
                                    </label>

                                    <label className={`flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-[2px] text-xs font-bold cursor-pointer border transition-all ${
                                        showPrice
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs'
                                            : 'bg-transparent text-slate-400 border-transparent hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={showPrice}
                                            onChange={e => {
                                                setShowPrice(e.target.checked);
                                                localStorage.setItem('label_printer_show_price', String(e.target.checked));
                                            }}
                                            className="hidden"
                                        />
                                        <span>السعر</span>
                                    </label>

                                    <label className={`flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-[2px] text-xs font-bold cursor-pointer border transition-all ${
                                        showCodeText
                                            ? 'bg-brand-subtle text-brand border-brand-subtle shadow-xs'
                                            : 'bg-transparent text-slate-400 border-transparent hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={showCodeText}
                                            onChange={e => {
                                                setShowCodeText(e.target.checked);
                                                localStorage.setItem('label_printer_show_code', String(e.target.checked));
                                            }}
                                            className="hidden"
                                        />
                                        <span>رقم الكود</span>
                                    </label>
                                </div>
                            </div>

                            {/* حجم خط عنوان المنتج (مفيد جداً للعناوين الطويلة) */}
                            {showName && (
                                <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                حجم خط عنوان المنتج:
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400">
                                                {titleFontSizeCustom === null ? 'محسوب تلقائياً حسب حجم الملصق' : 'حجم خط مخصص للعناوين الطويلة'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = Math.max(4.5, Math.round((activeTitleFontSizePt - 0.5) * 10) / 10);
                                                    setTitleFontSizeCustom(next);
                                                    localStorage.setItem('label_printer_title_font_size', String(next));
                                                }}
                                                className="w-7 h-7 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 dark:hover:bg-[#1e2f47] active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                                title="تصغير الخط للعناوين الطويلة"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-xs px-2.5 py-1 bg-white dark:bg-[#09111c] border border-slate-200 dark:border-[#1d2d42] rounded-[2px] min-w-[54px] text-center shadow-xs">
                                                {activeTitleFontSizePt} pt
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = Math.min(16, Math.round((activeTitleFontSizePt + 0.5) * 10) / 10);
                                                    setTitleFontSizeCustom(next);
                                                    localStorage.setItem('label_printer_title_font_size', String(next));
                                                }}
                                                className="w-7 h-7 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 dark:hover:bg-[#1e2f47] active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                                title="تكبير الخط"
                                            >
                                                +
                                            </button>
                                            {titleFontSizeCustom !== null && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTitleFontSizeCustom(null);
                                                        localStorage.removeItem('label_printer_title_font_size');
                                                    }}
                                                    className="text-[11px] font-bold text-brand hover:underline px-1.5 cursor-pointer"
                                                >
                                                    تلقائي
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* أزرار سريعة للأحجام الشائعة */}
                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-[#1d2d42]">
                                        <span className="text-[10px] font-medium text-slate-400 shrink-0">أحجام سريعة:</span>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {[
                                                { label: 'صغير جداً (5.5)', val: 5.5 },
                                                { label: 'صغير (7)', val: 7 },
                                                { label: 'متوسط (8.5)', val: 8.5 },
                                                { label: 'كبير (10)', val: 10 },
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    type="button"
                                                    onClick={() => {
                                                        setTitleFontSizeCustom(opt.val);
                                                        localStorage.setItem('label_printer_title_font_size', String(opt.val));
                                                    }}
                                                    className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold border transition-colors cursor-pointer ${
                                                        activeTitleFontSizePt === opt.val
                                                            ? 'bg-brand text-white border-brand shadow-xs'
                                                            : 'bg-white dark:bg-[#101a29] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* حجم رمز الـ QR (عند اختيار QR فقط) */}
                            {tab === 'classic' && (
                                <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                حجم رمز الـ QR:
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400">
                                                {qrSizeCustom === null ? 'محسوب تلقائياً حسب الورقة' : 'مقاس يدوي مخصص'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = Math.max(8, Math.round((activeQrSizeMm - 1) * 10) / 10);
                                                    setQrSizeCustom(next);
                                                    localStorage.setItem('label_printer_qr_size', String(next));
                                                }}
                                                className="w-7 h-7 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 dark:hover:bg-[#1e2f47] active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                                title="تصغير"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-xs px-2.5 py-1 bg-white dark:bg-[#09111c] border border-slate-200 dark:border-[#1d2d42] rounded-[2px] min-w-[54px] text-center shadow-xs">
                                                {activeQrSizeMm} مم
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = Math.min(30, Math.round((activeQrSizeMm + 1) * 10) / 10);
                                                    setQrSizeCustom(next);
                                                    localStorage.setItem('label_printer_qr_size', String(next));
                                                }}
                                                className="w-7 h-7 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 dark:hover:bg-[#1e2f47] active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                                title="تكبير"
                                            >
                                                +
                                            </button>
                                            {qrSizeCustom !== null && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setQrSizeCustom(null);
                                                        localStorage.removeItem('label_printer_qr_size');
                                                    }}
                                                    className="text-[11px] font-bold text-brand hover:underline px-1.5 cursor-pointer"
                                                >
                                                    تلقائي
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* أزرار سريعة لأحجام الـ QR */}
                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-[#1d2d42]">
                                        <span className="text-[10px] font-medium text-slate-400 shrink-0">أحجام شائعة:</span>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {[
                                                { label: 'صغير (10 مم)', val: 10 },
                                                { label: 'متوسط (14 مم)', val: 14 },
                                                { label: 'كبير (18 مم)', val: 18 },
                                                { label: 'عريض (22 مم)', val: 22 },
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    type="button"
                                                    onClick={() => {
                                                        setQrSizeCustom(opt.val);
                                                        localStorage.setItem('label_printer_qr_size', String(opt.val));
                                                    }}
                                                    className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold border transition-colors cursor-pointer ${
                                                        activeQrSizeMm === opt.val
                                                            ? 'bg-brand text-white border-brand shadow-xs'
                                                            : 'bg-white dark:bg-[#101a29] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* إزاحة وتوسيط الطباعة (X و Y) */}
                            <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إزاحة الطباعة (للتوسيط بالمليمتر):</span>
                                    {(offsetX !== 0 || offsetY !== 0) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOffsetX(0);
                                                setOffsetY(0);
                                                localStorage.setItem('label_printer_offset_x', '0');
                                                localStorage.setItem('label_printer_offset_y', '0');
                                            }}
                                            className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                                        >
                                            تصفير
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center justify-between p-1.5 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42]">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">عمودي (Y):</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetY(-0.5)}
                                                className="w-6 h-6 rounded-[2px] bg-slate-100 dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-[11px] min-w-[36px] text-center">
                                                {offsetY > 0 ? `+${offsetY}` : offsetY}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetY(0.5)}
                                                className="w-6 h-6 rounded-[2px] bg-slate-100 dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-1.5 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42]">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">أفقي (X):</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetX(-1)}
                                                className="w-6 h-6 rounded-[2px] bg-slate-100 dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-[11px] min-w-[36px] text-center">
                                                {offsetX > 0 ? `+${offsetX}` : offsetX}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetX(1)}
                                                className="w-6 h-6 rounded-[2px] bg-slate-100 dark:bg-[#152238] flex items-center justify-center font-bold text-xs hover:bg-slate-200 active:scale-95 cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* العمود 2 (اليسار في RTL): أدوات الضبط والإعدادات */}
                        <div className="md:col-span-7 flex flex-col gap-3.5">

                            {/* 0. اختيار طابعة الباركود والملصقات */}
                            <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>طابعة الملصقات والباركود:</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => loadPrinters(false)}
                                        disabled={loadingPrinters}
                                        className="text-[11px] font-bold text-slate-500 hover:text-brand dark:text-slate-400 dark:hover:text-brand flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-[2px] hover:bg-slate-200 dark:hover:bg-[#152238]"
                                        title="إعادة فحص طابعات الويندوز"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loadingPrinters ? 'animate-spin text-brand' : ''}`} />
                                        <span>{loadingPrinters ? 'جاري الفحص...' : 'تحديث الطابعات'}</span>
                                    </button>
                                </div>
                                <WorkstationSelect
                                    value={selectedPrinter}
                                    onChange={handleSelectPrinter}
                                    placeholder="اختر طابعة الباركود..."
                                    options={
                                        printersList.length > 0
                                            ? printersList.map(p => ({
                                                value: p.name,
                                                label: p.name,
                                                isRecommended: /365|235|barcode|label|tsc|zebra|xprinter\s+xp-[23]/i.test(p.name),
                                            }))
                                            : [{ value: selectedPrinter || 'Xprinter XP-365B', label: selectedPrinter || 'Xprinter XP-365B' }]
                                    }
                                />
                                <div className="mt-2 flex items-center justify-between text-[10px]">
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        طباعة مباشرة صامتة (TSPL Direct)
                                    </span>
                                    <span className="text-slate-400 font-mono">
                                        {printersList.length > 0 ? `${printersList.length} طابعات متوفرة` : 'طابعة افتراضية'}
                                    </span>
                                </div>
                            </div>

                            {/* 1. نوع الرمز: 3 خيارات */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                    نوع الرمز (Code Type):
                                </label>
                                <div className="flex items-center gap-1 p-1 rounded-[2px] bg-slate-100 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => { setTab('ean13'); localStorage.setItem('label_printer_tab', 'ean13'); }}
                                        className={`flex-1 py-1.5 px-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                                            tab === 'ean13'
                                                ? 'bg-brand text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>||| EAN-13 تجاري</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTab('serial'); localStorage.setItem('label_printer_tab', 'serial'); }}
                                        className={`flex-1 py-1.5 px-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                                            tab === 'serial'
                                                ? 'bg-brand text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>||| Code 128 مباشر</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTab('classic'); localStorage.setItem('label_printer_tab', 'classic'); }}
                                        className={`flex-1 py-1.5 px-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                                            tab === 'classic'
                                                ? 'bg-brand text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>🔳 QR مربع</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. مقاس ورقة الملصق (Presets + مخصص) */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                    مقاس ورقة الملصق (Label Size):
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {PRESET_LABEL_SIZES.map(s => {
                                        const isSelected = !isCustomSize && widthMm === s.w && heightMm === s.h;
                                        return (
                                            <button
                                                key={`${s.w}x${s.h}`}
                                                type="button"
                                                onClick={() => updateSize(s.w, s.h)}
                                                className={`py-1.5 px-1.5 rounded-[2px] text-xs font-bold border transition-all cursor-pointer text-center ${
                                                    isSelected
                                                        ? 'bg-brand text-white border-brand shadow-xs'
                                                        : 'bg-slate-50 dark:bg-[#101a29] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                                }`}
                                            >
                                                {s.w}×{s.h} مم
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* اختيار قالب Stock المسجل في الطابعة */}
                                {stockForms.length > 0 && (
                                    <div className="mb-2 p-2 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] mt-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                                                قالب ورق الطابعة بالويندوز (Stock):
                                            </span>
                                            <span className="text-[9px] font-mono text-slate-400">Seagull Presets</span>
                                        </div>
                                        <WorkstationSelect
                                            value={selectedStock}
                                            onChange={val => {
                                                setSelectedStock(val);
                                                localStorage.setItem('label_printer_stock', val);
                                                if (val.includes('BIG') || val.includes('2.36')) {
                                                    updateSize(58, 40);
                                                } else if (val.includes('XP-365B') || val.includes('1.97')) {
                                                    updateSize(50, 30);
                                                } else if (val.includes('2 x 4')) {
                                                    updateSize(50, 100);
                                                }
                                            }}
                                            placeholder="-- اختيار قالب Stock من الطابعة (مثل XP-365-BIG) --"
                                            options={[
                                                { value: '', label: '-- بدون قالب محدد --' },
                                                ...stockForms.map(f => ({ value: f, label: f }))
                                            ]}
                                        />
                                    </div>
                                )}

                                {/* مقاس مخصص */}
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-[#0a121e] px-3 py-1.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42]">
                                        <span className="text-[11px] font-bold text-slate-400">العرض:</span>
                                        <input
                                            type="number"
                                            min="20"
                                            max="120"
                                            value={widthMm}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setWidthMm(val);
                                                setIsCustomSize(true);
                                                localStorage.setItem('label_printer_w', String(val));
                                            }}
                                            className="w-full bg-transparent font-bold text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">مم</span>
                                    </div>

                                    <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-[#0a121e] px-3 py-1.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42]">
                                        <span className="text-[11px] font-bold text-slate-400">الارتفاع:</span>
                                        <input
                                            type="number"
                                            min="15"
                                            max="120"
                                            value={heightMm}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setHeightMm(val);
                                                setIsCustomSize(true);
                                                localStorage.setItem('label_printer_h', String(val));
                                            }}
                                            className="w-full bg-transparent font-bold text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">مم</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. الدوران وعدد النسخ */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        دوران الاتجاه:
                                    </label>
                                    <button
                                        type="button"
                                        onClick={toggleRotation}
                                        className="w-full flex items-center justify-center gap-2 h-10 rounded-[2px] bg-slate-100 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-200 font-bold text-xs hover:border-brand transition-all cursor-pointer"
                                        title="تدوير الملصق"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-brand" />
                                        <span>{rotation === 0 ? 'عادي (0°)' : rotation === 90 ? 'مدوّر (90°)' : rotation === 180 ? 'معكوس (180°)' : 'مدوّر (270°)'}</span>
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        عدد النسخ:
                                    </label>
                                    <div className="flex items-center h-10 rounded-[2px] bg-slate-100 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] px-2">
                                        <button
                                            type="button"
                                            onClick={() => setCopies(c => Math.max(1, c - 1))}
                                            className="w-7 h-7 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center font-bold text-slate-700 dark:text-white shadow-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-[#1e2f47]"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={copies}
                                            onChange={e => setCopies(Math.max(1, Number(e.target.value) || 1))}
                                            className="flex-1 text-center font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCopies(c => Math.min(100, c + 1))}
                                            className="w-7 h-7 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center font-bold text-slate-700 dark:text-white shadow-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-[#1e2f47]"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer زر الطباعة */}
                <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {nodePrintMsg ? (
                            <span className={nodePrintMsg.success ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                                {nodePrintMsg.text}
                            </span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Printer className="w-4 h-4 text-brand shrink-0" />
                                <span className="text-[11px] font-bold text-slate-400">الطابعة:</span>
                                <WorkstationSelect
                                    value={selectedPrinter}
                                    onChange={handleSelectPrinter}
                                    className="min-w-[190px]"
                                    placeholder="اختر الطابعة..."
                                    options={
                                        printersList.length > 0
                                            ? printersList.map(p => ({
                                                value: p.name,
                                                label: p.name,
                                                isRecommended: /365|235|barcode|label|tsc|zebra|xprinter\s+xp-[23]/i.test(p.name),
                                            }))
                                            : [{ value: selectedPrinter || 'Xprinter XP-365B', label: selectedPrinter || 'Xprinter XP-365B' }]
                                    }
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex-1 sm:flex-initial px-4 h-11 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#152238] dark:hover:bg-[#1d2d42] text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                            title="فتح نافذة طباعة المتصفح التقليدية"
                        >
                            <span>{isBulk ? `طباعة المتصفح (${items.length})` : 'طباعة المتصفح'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleNodePrint}
                            disabled={printingNode}
                            className="flex-1 sm:flex-initial px-6 h-11 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                            <Printer className="w-4 h-4 shrink-0" />
                            <span>
                                {printingNode 
                                    ? 'جاري الإرسال للطابعة...' 
                                    : isBulk 
                                    ? `طباعة مباشرة (${items.length} ملصق)` 
                                    : `طباعة مباشرة (${copies})`}
                            </span>
                        </button>
                    </div>
                </div>

                {/* عناصر مخفية لتوليد باركود و QR كل منتجات الدفعة بدقة 100% لطباعة المتصفح */}
                {isBulk && (
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }} aria-hidden="true">
                        {items.map(p => (
                            <div key={p.id} id={`bulk-barcode-item-${p.id}`}>
                                {tab === 'classic' ? (
                                    <QRCodeSVG
                                        value={toAsciiDigits(p.qrcode || '0000000000')}
                                        size={Math.max(30, Math.min(160, Math.round(activeQrSizeMm * (210 / widthMm))))}
                                        level="H"
                                        fgColor="#000000"
                                        imageSettings={{
                                            src: PERFUME_SVG_B64,
                                            width: Math.max(8, Math.round(activeQrSizeMm * 0.22)),
                                            height: Math.max(8, Math.round(activeQrSizeMm * 0.22)),
                                            excavate: true,
                                        }}
                                    />
                                ) : tab === 'ean13' ? (
                                    <Barcode
                                        value={toEan13(p.qrcode || '0000000000')}
                                        format="EAN13"
                                        width={1.85}
                                        height={34}
                                        displayValue={showCodeText}
                                        textMargin={1}
                                        fontSize={11}
                                        font="monospace"
                                        margin={0}
                                        lineColor="#000000"
                                    />
                                ) : (
                                    <Barcode
                                        value={toAsciiDigits(p.qrcode || '0000000000')}
                                        format="CODE128"
                                        width={1.75}
                                        height={34}
                                        displayValue={showCodeText}
                                        textMargin={1}
                                        fontSize={11}
                                        font="monospace"
                                        margin={0}
                                        lineColor="#000000"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>,
        document.body
    );
}

// ─── الصفحة الرئيسية ───────────────────────────────────────────
export default function ProductsIndex({ products, categories, tiers, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId]   = useState<number | null>(null);

    // الفلاتر المطبقة حالياً على قائمة الجدول الرئيسي
    const [filterCat, setFilterCat]             = useState<number | null>(null);
    const [filterTier, setFilterTier]           = useState<number | null>(null);
    const [searchKeywords, setSearchKeywords]   = useState<string[]>([]);
    const [lowStockOnly, setLowStockOnly]       = useState(false);

    // الفلاتر المعلقة المؤقتة داخل الـ Drawer (قبل الضغط على عرض النتائج)
    const [draftCat, setDraftCat]                     = useState<number | null>(null);
    const [draftTier, setDraftTier]                   = useState<number | null>(null);
    const [draftSearchKeywords, setDraftSearchKeywords] = useState<string[]>([]);
    const [draftLowStockOnly, setDraftLowStockOnly]   = useState(false);

    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [qrProduct, setQrProduct]   = useState<Product | null>(null);
    const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [padConfig, setPadConfig] = useState<{ title: string; field: string; initial: string } | null>(null);

    // حالة واستمارة استيراد Excel
    const [showImportModal, setShowImportModal] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const importForm = useForm<{ file: File | null; import_mode: 'add_only' | 'wipe_and_replace' }>({
        file: null,
        import_mode: 'add_only',
    });

    const hasActiveFilter = searchKeywords.length > 0 || !!filterCat || !!filterTier || lowStockOnly;
    const hasDraftFilter  = draftSearchKeywords.length > 0 || !!draftCat || !!draftTier || draftLowStockOnly;

    // توليد QR لمنتج واحد
    function handleGenerate(p: Product) {
        const newQr = generateQrCode();
        router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, { preserveScroll: true });
    }

    // توليد جماعي لكل المنتجات التي لا تحتوي على QR
    function handleGenerateAll() {
        const missingCount = products.filter(p => !p.qrcode).length;
        if (missingCount === 0) return;
        setGeneratingAll(true);
        router.post('/products/generate-all-qrcodes', {}, {
            preserveScroll: true,
            onFinish: () => {
                setGeneratingAll(false);
            },
        });
    }

    const getInitialDefaultCategory = () => {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('default_product_category_id') : null;
        if (savedId) {
            const found = categories.find(c => String(c.id) === savedId);
            if (found) return found;
        }
        return categories.find(c => c.name.includes('زيت')) || categories[0];
    };

    const [defaultCatId, setDefaultCatId] = useState<string>(() => {
        return typeof window !== 'undefined' ? (localStorage.getItem('default_product_category_id') || '') : '';
    });

    const initialDefCat = getInitialDefaultCategory();
    const createForm = useForm({
        ...emptyForm,
        category_id: initialDefCat ? String(initialDefCat.id) : '',
        selling_type: initialDefCat ? resolveSellingType(initialDefCat) : 'tier_based',
    });
    const editForm   = useForm({ ...emptyForm });

    const createCat = categories.find(c => c.id === Number(createForm.data.category_id));
    const editCat   = categories.find(c => c.id === Number(editForm.data.category_id));

    const createIsOriginal = createCat?.unit === 'ml' && createForm.data.selling_type === 'unit_priced' && !createCat?.is_operational;
    const editIsOriginal   = editCat?.unit === 'ml' && editForm.data.selling_type === 'unit_priced' && !editCat?.is_operational;

    function handleSetDefaultCategory(catId: number) {
        const idStr = String(catId);
        localStorage.setItem('default_product_category_id', idStr);
        setDefaultCatId(idStr);
    }

    function openCreateDrawer() {
        setEditingId(null);
        createForm.clearErrors();
        const defCat = getInitialDefaultCategory();
        if (defCat) {
            createForm.setData({
                ...emptyForm,
                category_id: String(defCat.id),
                selling_type: resolveSellingType(defCat),
                price_tier_id: '',
            });
        } else {
            createForm.reset();
        }
        setShowCreate(true);
    }

    function onSelectCategory(form: typeof createForm, val: string) {
        const cat = categories.find(c => c.name === val);
        if (!cat) return;
        form.setData('category_id', String(cat.id));
        form.setData('selling_type', resolveSellingType(cat));
        form.setData('price_tier_id', '');
    }

    function onSelectTier(form: typeof createForm, val: string) {
        const tier = tiers.find(t => t.name === val);
        form.setData('price_tier_id', tier ? String(tier.id) : '');
    }

    function cancelEdit() {
        setEditingId(null);
        editForm.clearErrors();
    }

    function startEdit(p: Product) {
        editForm.clearErrors();
        setEditingId(p.id);
        editForm.setData({
            name:                   p.name,
            category_id:            String(p.category.id),
            selling_type:           p.selling_type,
            price_tier_id:          p.price_tier ? String(p.price_tier.id) : '',
            min_stock:              p.min_stock,
            qrcode:                 p.qrcode ?? '',
            price_per_unit_regular: p.product_price?.price_per_unit_regular ?? '',
            price_per_unit_vip:     p.product_price?.price_per_unit_vip ?? '',
            full_bottle_regular:    p.product_price?.full_bottle_regular ?? '',
            full_bottle_vip:        p.product_price?.full_bottle_vip ?? '',
            bottle_volume:          p.original_perfume_detail?.bottle_volume ?? '',
        });
    }

    function submitCreate() {
        const trimmed = createForm.data.name?.trim() || '';
        const exists = products.some(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            createForm.setError('name', 'اسم المنتج موجود مسبقاً في المنظومة، لا يمكن تكرار نفس الاسم.');
            return;
        }

        createForm.post('/products', {
            onSuccess: () => {
                const defCat = getInitialDefaultCategory();
                createForm.setData({
                    ...emptyForm,
                    category_id: defCat ? String(defCat.id) : '',
                    selling_type: defCat ? resolveSellingType(defCat) : 'tier_based',
                    price_tier_id: '',
                });
                setShowCreate(false);
            },
        });
    }

    function submitEdit(id: number) {
        const trimmed = editForm.data.name?.trim() || '';
        const exists = products.some(p => p.name.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== id);
        if (exists) {
            editForm.setError('name', 'اسم المنتج موجود مسبقاً لمنتج آخر، يرجى اختيار اسم غير مكرر.');
            return;
        }

        editForm.put(`/products/${id}`, {
            onSuccess: () => cancelEdit(),
        });
    }

    function deleteProduct(id: number) {
        router.delete(`/products/${id}`);
    }

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const matchesSearchKeywords = (p: Product, kws: string[]) => {
        if (!kws || kws.length === 0) return true;
        return kws.some(kw => {
            const trimmed = kw.trim();
            if (!trimmed) return false;

            // 1. إذا كان العنصر معرف صنف محدد تم اختياره من القائمة
            if (!isNaN(Number(trimmed))) {
                const numId = Number(trimmed);
                if (products.some(prod => prod.id === numId)) {
                    return p.id === numId;
                }
            }

            // 2. إذا كان كود QR أو باركود مطابق تماماً
            if (p.qrcode && p.qrcode.toLowerCase() === trimmed.toLowerCase()) {
                return true;
            }

            // 3. البحث النصي باسم المنتج
            const extraKey = p.qrcode ? `${p.qrcode}` : '';
            return matchesSearchText(trimmed, p.name, extraKey);
        });
    };

    const filtered = products.filter(p => {
        if (!matchesSearchKeywords(p, searchKeywords)) return false;
        if (filterCat && p.category.id !== filterCat) return false;
        if (filterTier && (p.price_tier?.id !== filterTier && p.price_tier_id !== filterTier)) return false;
        if (lowStockOnly && !(Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0)) return false;
        return true;
    });

    // تصدير ملف Excel مع مراعاة الفلاتر النشطة (تصدير العناصر المفلترة فقط إن وجدت)
    const handleExportExcel = () => {
        if (filtered.length === 0) return;

        if (hasActiveFilter && filtered.length < products.length) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/products/export/excel';
            form.style.display = 'none';

            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);

            const idsInput = document.createElement('input');
            idsInput.type = 'hidden';
            idsInput.name = 'ids';
            idsInput.value = filtered.map(p => p.id).join(',');
            form.appendChild(idsInput);

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } else {
            window.location.href = '/products/export/excel';
        }
    };

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedProducts = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

    const paginationLinks = [
        { url: safeCurrentPage > 1 ? '#' : null, label: 'السابق', active: false, page: safeCurrentPage - 1 },
        ...Array.from({ length: totalPages }, (_, i) => ({
            url: '#',
            label: String(i + 1),
            active: i + 1 === safeCurrentPage,
            page: i + 1,
        })),
        { url: safeCurrentPage < totalPages ? '#' : null, label: 'التالي', active: false, page: safeCurrentPage + 1 },
    ];

    const draftFiltered = products.filter(p => {
        if (!matchesSearchKeywords(p, draftSearchKeywords)) return false;
        if (draftCat && p.category.id !== draftCat) return false;
        if (draftTier && (p.price_tier?.id !== draftTier && p.price_tier_id !== draftTier)) return false;
        if (draftLowStockOnly && !(Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0)) return false;
        return true;
    });

    const tierDefaultValue = (form: typeof createForm) => {
        const t = tiers.find(t => String(t.id) === form.data.price_tier_id);
        return t ? t.name : '';
    };

    // ── حقل QR في نموذج التعديل أو الإنشاء ──────────────────────────
    const renderQrField = (form: typeof editForm | typeof createForm) => {
        const hasQr = !!form.data.qrcode;
        return (
            <div className="p-4 sm:p-5 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3.5 shadow-xs">
                <h4 className="text-sm sm:text-base font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2.5">
                    <span className="w-7 h-7 rounded-[2px] bg-brand-subtle text-brand flex items-center justify-center text-sm shrink-0 border border-brand-subtle">📱</span>
                    <span className="text-slate-900 dark:text-white tracking-wide">رمز QR Code والتتبع</span>
                </h4>

                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-brand" />
                        رمز QR Code
                    </label>

                    <div className="flex items-center gap-2">
                        {hasQr ? (
                            <button
                                type="button"
                                onClick={() => form.setData('qrcode', '')}
                                className="px-2.5 py-1 rounded-[2px] bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs transition-colors border border-rose-500/30 cursor-pointer"
                            >
                                إزالة الرمز
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => form.setData('qrcode', generateQrCode())}
                                className="px-2.5 py-1 rounded-[2px] bg-brand-subtle text-brand hover:bg-brand hover:text-white font-bold text-xs transition-colors border border-brand-subtle cursor-pointer"
                            >
                                توليد QR جديد ⚡
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        inputMode="text"
                        value={form.data.qrcode}
                        onChange={e => form.setData('qrcode', e.target.value)}
                        placeholder="أدخل كود الـ QR أو اضغط توليد تلقائي..."
                        className="h-11 sm:h-12 rounded-[2px] px-3.5 text-sm font-mono border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full dir-ltr"
                    />
                </div>
            </div>
        );
    };

    const activeForm = editingId !== null ? editForm : createForm;
    const activeCat  = editingId !== null ? editCat : createCat;
    const activeIsOriginal = editingId !== null ? editIsOriginal : createIsOriginal;

    const isDuplicateName = !!activeForm.data.name?.trim() && products.some(p => 
        p.name.trim().toLowerCase() === activeForm.data.name.trim().toLowerCase() && 
        (editingId === null || p.id !== editingId)
    );

    return (
        <AppShell pageTitle="إدارة المنتجات">
            <div className="flex flex-col gap-5 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">إدارة المنتجات</h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">إدارة منتجات العطور والتسعير والتصنيفات بأحدث واجهة باللمس</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setDraftCat(filterCat);
                                setDraftTier(filterTier);
                                setDraftSearchKeywords([...searchKeywords]);
                                setDraftLowStockOnly(lowStockOnly);
                                setFilterDrawerOpen(true);
                            }}
                            className={`h-11 sm:h-12 px-4 sm:px-5 rounded-[2px] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer shrink-0 shadow-sm ${
                                hasActiveFilter
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-slate-50 dark:bg-[#101a29] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1d2d42] hover:bg-slate-100 dark:hover:bg-[#152238]'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>تصفية المنتجات</span>
                            {hasActiveFilter && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            )}
                        </button>
                        {hasActiveFilter && (
                            <button
                                onClick={() => {
                                    setSearchKeywords([]);
                                    setFilterCat(null);
                                    setFilterTier(null);
                                    setLowStockOnly(false);
                                    setDraftSearchKeywords([]);
                                    setDraftCat(null);
                                    setDraftTier(null);
                                    setDraftLowStockOnly(false);
                                }}
                                className="h-11 sm:h-12 px-3.5 rounded-[2px] bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all font-bold text-xs sm:text-sm border border-rose-500/30 shrink-0 shadow-sm cursor-pointer flex items-center gap-1.5"
                                title="إعادة تعيين الفلاتر"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}
                        {products.some(p => !p.qrcode) && (
                            <button
                                onClick={handleGenerateAll}
                                disabled={generatingAll}
                                className="h-11 sm:h-12 px-4 rounded-[2px] border border-brand-subtle bg-brand-subtle text-brand hover:bg-brand hover:text-white transition-all font-bold text-xs sm:text-sm disabled:opacity-50 shrink-0 cursor-pointer flex items-center gap-2"
                            >
                                <QrCode className="w-4 h-4" />
                                {generatingAll ? 'جاري التوليد...' : `توليد QR للكل (${products.filter(p => !p.qrcode).length})`}
                            </button>
                        )}
                        {/* زر طباعة جماعية للنتائج المعروضة */}
                        <button
                            type="button"
                            onClick={() => setBulkPrintOpen(true)}
                            disabled={filtered.length === 0}
                            className="h-11 sm:h-12 px-4 rounded-[2px] bg-brand-subtle border border-brand-subtle text-brand hover:bg-brand hover:text-white transition-all font-bold text-xs sm:text-sm shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 group"
                            title={filtered.length > 0 ? `طباعة جماعية لملصقات النتائج المعروضة (${filtered.length} منتج)` : 'لا توجد منتجات مطابقة لطباعتها'}
                        >
                            <Printer className="w-4 h-4 text-brand group-hover:text-white transition-colors" />
                            <span>طباعة جماعية</span>
                            {filtered.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-[2px] bg-white dark:bg-[#101a29] text-brand text-[11px] font-mono font-bold group-hover:bg-white/20 group-hover:text-white transition-all">
                                    {filtered.length}
                                </span>
                            )}
                        </button>

                        {/* زر تصدير Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={filtered.length === 0}
                            className="h-11 sm:h-12 px-4 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs sm:text-sm shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 group"
                            title={
                                hasActiveFilter && filtered.length < products.length
                                    ? `تصدير شيت إكسل للمنتجات المفلترة حالياً (${filtered.length} منتج)`
                                    : 'تصدير شيت إكسل كامل يشمل المنتجات والتصنيفات والأحجام والتيرات والأسعار'
                            }
                        >
                            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                            <span>تصدير Excel</span>
                            {hasActiveFilter && filtered.length < products.length && (
                                <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-bold group-hover:bg-white/20 group-hover:text-white transition-all">
                                    {filtered.length}
                                </span>
                            )}
                        </button>

                        {/* زر استيراد Excel */}
                        <button
                            type="button"
                            onClick={() => {
                                importForm.reset();
                                importForm.clearErrors();
                                setShowImportModal(true);
                            }}
                            className="h-11 sm:h-12 px-4 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-600 hover:text-white transition-all font-bold text-xs sm:text-sm shrink-0 shadow-sm cursor-pointer flex items-center gap-2"
                            title="استيراد وتحديث البيانات من ملف إكسل"
                        >
                            <FileUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>استيراد Excel</span>
                        </button>

                        <button onClick={openCreateDrawer}
                            className="h-11 sm:h-12 px-5 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-2">
                            <Plus className="w-4 h-4" /> <span>إضافة منتج</span>
                        </button>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-4 py-3 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-4 py-3 rounded-[2px] bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm">{flash.error}</div>
                )}

                {/* Touch Drawer — إنشاء وتعديل المنتجات */}
                {(showCreate || editingId !== null) && createPortal(
                    <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-pointer"
                            onClick={() => {
                                setShowCreate(false);
                                cancelEdit();
                            }}
                        />
                        <div
                            className="relative w-full sm:w-[680px] md:w-[780px] lg:w-[860px] max-w-[95vw] bg-white dark:bg-[#0c1421] h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-[#1d2d42] animate-in slide-in-from-right duration-200 cursor-default z-10"
                        >
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29]">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle flex items-center justify-center font-bold">
                                        {editingId !== null ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                                            {editingId !== null ? `تعديل: ${editForm.data.name}` : 'إضافة منتج جديد'}
                                        </h2>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                            {editingId !== null ? 'تعديل التفاصيل، الأسعار، والحد الأدنى للمخزون' : 'أدخل بيانات المنتج الجديد وحد التنبيه والتسعير'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowCreate(false); cancelEdit(); }}
                                    className="w-8 h-8 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-slate-200 dark:border-[#1d2d42] cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Drawer Body — شبكة من عمودين للحاويات المخصصة */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 scrollbar-none">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                                    
                                    {/* العمود الأول (اليمين): المعلومات الأساسية + QR Code */}
                                    <div className="flex flex-col gap-5">
                                        {/* حاوية 1: المعلومات الأساسية والتصنيف */}
                                        <div className="p-4 sm:p-5 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-4 shadow-xs">
                                            <h4 className="text-sm sm:text-base font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2.5">
                                                <span className="w-7 h-7 rounded-[2px] bg-brand-subtle text-brand flex items-center justify-center text-sm shrink-0 border border-brand-subtle">📦</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">المعلومات الأساسية والتصنيف</span>
                                            </h4>

                                            {/* الاسم */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">اسم المنتج</label>
                                                <input
                                                    type="text"
                                                    inputMode="text"
                                                    value={activeForm.data.name}
                                                    onChange={e => activeForm.setData('name', e.target.value)}
                                                    placeholder="مثال: Sauvage Elixir..."
                                                    className={`h-11 sm:h-12 rounded-[2px] px-3.5 text-sm font-bold border transition-colors bg-white dark:bg-[#09111c] text-slate-900 dark:text-white ${
                                                        isDuplicateName
                                                            ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-500/5'
                                                            : 'border-slate-200 dark:border-[#1d2d42] focus:border-brand'
                                                    }`}
                                                />
                                                {isDuplicateName && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 animate-in fade-in duration-150">
                                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                        هذا الاسم مسجل مسبقاً في المنظومة. يرجى اختيار اسم فريد.
                                                    </p>
                                                )}
                                                {activeForm.errors.name && <p className="text-xs text-rose-500 font-bold">{activeForm.errors.name}</p>}
                                            </div>

                                            {/* اختيار التصنيف باللمس */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">التصنيف</label>
                                                    {activeCat && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetDefaultCategory(activeCat.id)}
                                                            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${
                                                                String(activeCat.id) === String(defaultCatId || initialDefCat?.id)
                                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                                    : 'bg-white dark:bg-[#121c2c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1d2d42] hover:text-amber-600 hover:border-amber-400'
                                                            }`}
                                                            title="جعل هذا التصنيف هو الخيار التلقائي عند فتح نافذة إضافة منتج جديد"
                                                        >
                                                            <Star className={`w-3.5 h-3.5 ${String(activeCat.id) === String(defaultCatId || initialDefCat?.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                            {String(activeCat.id) === String(defaultCatId || initialDefCat?.id)
                                                                ? 'التصنيف الافتراضي'
                                                                : 'تعيين كافتراضي'}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    {categories.map(c => {
                                                        const selected = activeCat?.id === c.id;
                                                        const isDefault = String(c.id) === String(defaultCatId || initialDefCat?.id);
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => onSelectCategory(activeForm, c.name)}
                                                                className={`relative flex flex-col items-start gap-1 p-3 rounded-[2px] border transition-colors cursor-pointer text-right ${
                                                                    selected
                                                                        ? 'bg-brand-subtle border-brand text-brand font-bold shadow-xs'
                                                                        : 'bg-white dark:bg-[#0c1421] border-slate-200 dark:border-[#1d2d42] text-slate-700 dark:text-slate-200 hover:border-brand/40 font-medium'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span className="text-sm sm:text-base font-bold">{c.name}</span>
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSetDefaultCategory(c.id);
                                                                        }}
                                                                        className={`p-1 rounded-[2px] transition-colors ${
                                                                            isDefault
                                                                                ? 'text-amber-500 bg-amber-500/20'
                                                                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-amber-500/10'
                                                                        }`}
                                                                        title={isDefault ? 'هذا هو التصنيف الافتراضي' : 'اضغط لتعيين هذا التصنيف كافتراضي'}
                                                                    >
                                                                        <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between w-full mt-0.5">
                                                                    <span className="text-xs font-medium opacity-75">الوحدة: {unitLabels[c.unit]}</span>
                                                                    {isDefault && (
                                                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-400/20 border border-amber-500/20 px-1.5 py-0.2 rounded-[2px]">
                                                                            افتراضي
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {activeForm.errors.category_id && <p className="text-xs text-rose-500 font-bold">{activeForm.errors.category_id}</p>}
                                            </div>
                                        </div>

                                        {/* حاوية 4: QR Code Section */}
                                        {renderQrField(activeForm)}
                                    </div>

                                    {/* العمود الثاني (اليسار): الأسعار والتسعين + المخزون */}
                                    <div className="flex flex-col gap-5">
                                        {/* حاوية 2: تفاصيل التسعير والأسعار */}
                                        <div className="p-4 sm:p-5 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-4 shadow-xs">
                                            <h4 className="text-sm sm:text-base font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2.5">
                                                <span className="w-7 h-7 rounded-[2px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0 border border-emerald-500/30">💰</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">تفاصيل التسعير والأسعار</span>
                                            </h4>

                                            {/* تير إذا كان tier_based */}
                                            {activeForm.data.selling_type === 'tier_based' && (
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">الفئة السعرية (التير)</label>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        {tiers.map(t => {
                                                            const selected = activeForm.data.price_tier_id === String(t.id);
                                                            return (
                                                                <button
                                                                    key={t.id}
                                                                    type="button"
                                                                    onClick={() => activeForm.setData('price_tier_id', String(t.id))}
                                                                    className={`h-11 sm:h-12 px-3 rounded-[2px] border text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                                                                        selected
                                                                            ? 'bg-brand text-white border-brand shadow-xs'
                                                                            : 'bg-white dark:bg-[#0c1421] border-slate-200 dark:border-[#1d2d42] text-slate-700 dark:text-slate-200 hover:border-brand/40'
                                                                    }`}
                                                                >
                                                                    {t.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {activeForm.errors.price_tier_id && <p className="text-xs text-rose-500 font-bold">{activeForm.errors.price_tier_id}</p>}
                                                </div>
                                            )}

                                            {/* الأسعار إن كانت unit_priced وغير تشغيلية */}
                                            {activeCat && activeForm.data.selling_type === 'unit_priced' && !activeCat.is_operational && (
                                                <div className="flex flex-col gap-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سعر {unitLabels[activeCat.unit]} — عادي</label>
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={activeForm.data.price_per_unit_regular}
                                                                    onChange={e => activeForm.setData('price_per_unit_regular', e.target.value)}
                                                                    onClick={() => setPadConfig({
                                                                        title: `سعر ${unitLabels[activeCat.unit]} — عادي`,
                                                                        field: 'price_per_unit_regular',
                                                                        initial: String(activeForm.data.price_per_unit_regular || '')
                                                                    })}
                                                                    className="h-11 sm:h-12 rounded-[2px] px-3.5 pl-11 text-sm font-bold border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full cursor-pointer"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPadConfig({
                                                                        title: `سعر ${unitLabels[activeCat.unit]} — عادي`,
                                                                        field: 'price_per_unit_regular',
                                                                        initial: String(activeForm.data.price_per_unit_regular || '')
                                                                    })}
                                                                    className="absolute left-1.5 w-8 h-8 rounded-[2px] bg-brand-subtle hover:bg-brand/20 text-brand flex items-center justify-center font-bold transition-colors cursor-pointer"
                                                                    title="فتح لوحة الأرقام اللمسية"
                                                                >
                                                                    <Calculator className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سعر {unitLabels[activeCat.unit]} — VIP</label>
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={activeForm.data.price_per_unit_vip}
                                                                    onChange={e => activeForm.setData('price_per_unit_vip', e.target.value)}
                                                                    onClick={() => setPadConfig({
                                                                        title: `سعر ${unitLabels[activeCat.unit]} — VIP`,
                                                                        field: 'price_per_unit_vip',
                                                                        initial: String(activeForm.data.price_per_unit_vip || '')
                                                                    })}
                                                                    className="h-11 sm:h-12 rounded-[2px] px-3.5 pl-11 text-sm font-bold border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full cursor-pointer"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPadConfig({
                                                                        title: `سعر ${unitLabels[activeCat.unit]} — VIP`,
                                                                        field: 'price_per_unit_vip',
                                                                        initial: String(activeForm.data.price_per_unit_vip || '')
                                                                    })}
                                                                    className="absolute left-1.5 w-8 h-8 rounded-[2px] bg-brand-subtle hover:bg-brand/20 text-brand flex items-center justify-center font-bold transition-colors cursor-pointer"
                                                                    title="فتح لوحة الأرقام اللمسية"
                                                                >
                                                                    <Calculator className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {activeIsOriginal && (
                                                        <div className="flex flex-col gap-4 pt-3.5 border-t border-slate-200 dark:border-[#1d2d42]">
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">حجم العبوة الأصلية (مليلتر)</label>
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        min="0.01"
                                                                        step="0.01"
                                                                        value={activeForm.data.bottle_volume}
                                                                        onChange={e => activeForm.setData('bottle_volume', e.target.value)}
                                                                        onClick={() => setPadConfig({
                                                                            title: 'حجم العبوة الأصلية (مليلتر)',
                                                                            field: 'bottle_volume',
                                                                            initial: String(activeForm.data.bottle_volume || '')
                                                                        })}
                                                                        placeholder="200"
                                                                        className="h-11 sm:h-12 rounded-[2px] px-3.5 pl-11 text-sm font-bold border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full cursor-pointer"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPadConfig({
                                                                            title: 'حجم العبوة الأصلية (مليلتر)',
                                                                            field: 'bottle_volume',
                                                                            initial: String(activeForm.data.bottle_volume || '')
                                                                        })}
                                                                        className="absolute left-1.5 w-8 h-8 rounded-[2px] bg-brand-subtle hover:bg-brand/20 text-brand flex items-center justify-center font-bold transition-colors cursor-pointer"
                                                                        title="فتح لوحة الأرقام اللمسية"
                                                                    >
                                                                        <Calculator className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سعر العبوة كاملة — عادي</label>
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={activeForm.data.full_bottle_regular}
                                                                            onChange={e => activeForm.setData('full_bottle_regular', e.target.value)}
                                                                            onClick={() => setPadConfig({
                                                                                title: 'سعر العبوة كاملة — عادي',
                                                                                field: 'full_bottle_regular',
                                                                                initial: String(activeForm.data.full_bottle_regular || '')
                                                                            })}
                                                                            className="h-11 sm:h-12 rounded-[2px] px-3.5 pl-11 text-sm font-bold border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full cursor-pointer"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPadConfig({
                                                                                title: 'سعر العبوة كاملة — عادي',
                                                                                field: 'full_bottle_regular',
                                                                                initial: String(activeForm.data.full_bottle_regular || '')
                                                                            })}
                                                                            className="absolute left-1.5 w-8 h-8 rounded-[2px] bg-brand-subtle hover:bg-brand/20 text-brand flex items-center justify-center font-bold transition-colors cursor-pointer"
                                                                            title="فتح لوحة الأرقام اللمسية"
                                                                        >
                                                                            <Calculator className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سعر العبوة كاملة — VIP</label>
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={activeForm.data.full_bottle_vip}
                                                                            onChange={e => activeForm.setData('full_bottle_vip', e.target.value)}
                                                                            onClick={() => setPadConfig({
                                                                                title: 'سعر العبوة كاملة — VIP',
                                                                                field: 'full_bottle_vip',
                                                                                initial: String(activeForm.data.full_bottle_vip || '')
                                                                            })}
                                                                            className="h-11 sm:h-12 rounded-[2px] px-3.5 pl-11 text-sm font-bold border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full cursor-pointer"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPadConfig({
                                                                                title: 'سعر العبوة كاملة — VIP',
                                                                                field: 'full_bottle_vip',
                                                                                initial: String(activeForm.data.full_bottle_vip || '')
                                                                            })}
                                                                            className="absolute left-1.5 w-8 h-8 rounded-[2px] bg-brand-subtle hover:bg-brand/20 text-brand flex items-center justify-center font-bold transition-colors cursor-pointer"
                                                                            title="فتح لوحة الأرقام اللمسية"
                                                                        >
                                                                            <Calculator className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* حاوية 3: حد تنبيه المخزون */}
                                        <div className="p-4 sm:p-5 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3.5 shadow-xs">
                                            <h4 className="text-sm sm:text-base font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2.5">
                                                <span className="w-7 h-7 rounded-[2px] bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0 border border-amber-500/30">⚠️</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">إدارة المخزون والتنبيهات</span>
                                            </h4>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">حد تنبيه نقصان المخزون</label>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        min="0"
                                                        step="0.01"
                                                        value={activeForm.data.min_stock}
                                                        onChange={e => activeForm.setData('min_stock', e.target.value)}
                                                        onClick={() => setPadConfig({
                                                            title: 'حد تنبيه نقصان المخزون',
                                                            field: 'min_stock',
                                                            initial: String(activeForm.data.min_stock || '')
                                                        })}
                                                        placeholder="0"
                                                        className="h-11 sm:h-12 rounded-[2px] px-3.5 pl-11 text-sm font-bold border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#09111c] text-slate-900 dark:text-white focus:border-brand w-full cursor-pointer"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPadConfig({
                                                            title: 'حد تنبيه نقصان المخزون',
                                                            field: 'min_stock',
                                                            initial: String(activeForm.data.min_stock || '')
                                                        })}
                                                        className="absolute left-1.5 w-8 h-8 rounded-[2px] bg-brand-subtle hover:bg-brand/20 text-brand flex items-center justify-center font-bold transition-colors cursor-pointer"
                                                        title="فتح لوحة الأرقام اللمسية"
                                                    >
                                                        <Calculator className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] flex items-center gap-3">
                                <button
                                    onClick={editingId !== null ? () => submitEdit(editingId) : submitCreate}
                                    disabled={(editingId !== null ? editForm.processing : createForm.processing) || isDuplicateName}
                                    className="flex-1 h-12 rounded-[2px] bg-brand text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>{editingId !== null ? 'تحديث بيانات المنتج' : 'إضافة المنتج إلى النظام'}</span>
                                </button>
                                <button
                                    onClick={() => { setShowCreate(false); cancelEdit(); }}
                                    className="h-12 px-6 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#152238] dark:hover:bg-[#1e2f47] text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors border border-slate-200 dark:border-[#1d2d42] cursor-pointer"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Spatial Filter Drawer — تصفية المنتجات المتقدمة */}
                {filterDrawerOpen && createPortal(
                    <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-pointer"
                            onClick={() => setFilterDrawerOpen(false)}
                        />
                        <div
                            className="relative w-full sm:w-[500px] md:w-[560px] max-w-[95vw] bg-white dark:bg-[#0c1421] h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-[#1d2d42] animate-in slide-in-from-right duration-200 overflow-hidden cursor-default"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] select-none shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle flex items-center justify-center font-bold shadow-xs">
                                        <SlidersHorizontal className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">تصفية المنتجات المتقدمة</h2>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">تحديد خيارات البحث والفرز والتصنيف بكفاءة عالية</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFilterDrawerOpen(false)}
                                    className="w-8 h-8 rounded-[2px] bg-white dark:bg-[#152238] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-slate-200 dark:border-[#1d2d42] cursor-pointer"
                                    aria-label="إغلاق"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Drawer Content — الحاويات المقسمة */}
                            <div className="flex-1 overflow-y-auto overscroll-contain p-5 flex flex-col gap-4 scrollbar-none">
                                {/* حاوية 1: البحث والمعلومات الأساسية */}
                                <div className="p-4 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3 shadow-xs">
                                    <h4 className="text-sm font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2 text-slate-900 dark:text-white select-none">
                                        <span className="w-7 h-7 rounded-[2px] bg-brand-subtle text-brand flex items-center justify-center text-sm shrink-0 border border-brand-subtle">🔍</span>
                                        <span className="tracking-wide">البحث والمعلومات الأساسية</span>
                                    </h4>
                                    
                                    <div className="flex flex-col gap-2.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                                            البحث بالمنتج (اختيار متعدد / كلمات مفتاحية / كود QR)
                                        </label>
                                        <div className="flex flex-col gap-2.5">
                                            <WorkstationMultiSearch
                                                placeholder="اختر منتجات أو اكتب كلمة مثل «لويس» أو كود QR..."
                                                values={draftSearchKeywords}
                                                options={products.map(p => ({
                                                    value: String(p.id),
                                                    label: p.name,
                                                    badge: p.category.name,
                                                    meta: fmt(p.stock),
                                                    searchKey: p.qrcode ? `${p.name} ${p.qrcode} ${p.id}` : `${p.name} ${p.id}`
                                                }))}
                                                onSelect={setDraftSearchKeywords}
                                            />
                                            {draftSearchKeywords.length > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        تم تحديد {draftSearchKeywords.length} عنصر للبحث
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDraftSearchKeywords([])}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors font-bold text-xs border border-rose-500/30 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> مسح محددات البحث
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 select-none">
                                            💡 يمكنك النقر على العطور لاختيار أكثر من منتج، أو كتابة أي كلمة مثل "لويس" للبحث عن كل المنتجات المطابقة.
                                        </p>
                                    </div>
                                </div>

                                {/* حاوية 2: تصنيف المنتجات والفرز */}
                                <div className="p-4 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3 shadow-xs">
                                    <h4 className="text-sm font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2 text-slate-900 dark:text-white select-none">
                                        <span className="w-7 h-7 rounded-[2px] bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm shrink-0 border border-purple-500/30">🏷️</span>
                                        <span className="tracking-wide">تصنيف المنتجات</span>
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <button onClick={() => { setDraftCat(null); setDraftTier(null); }}
                                            className={`flex items-center justify-between px-3.5 h-11 sm:h-12 rounded-[2px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer select-none shadow-xs ${
                                                !draftCat
                                                    ? 'bg-brand text-white border-brand shadow-xs'
                                                    : 'bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                            }`}>
                                            <span>جميع التصنيفات</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-[2px] ${
                                                !draftCat ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300'
                                            }`}>{products.length}</span>
                                        </button>
                                        {categories.map(cat => {
                                            const count = products.filter(p => p.category.id === cat.id).length;
                                            const active = draftCat === cat.id;
                                            return (
                                                <button key={cat.id} onClick={() => {
                                                    setDraftCat(cat.id);
                                                    if (!cat.name.includes('زيت')) {
                                                        setDraftTier(null);
                                                    }
                                                }}
                                                    className={`flex items-center justify-between px-3.5 h-11 sm:h-12 rounded-[2px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer select-none shadow-xs ${
                                                        active
                                                            ? 'bg-brand text-white border-brand shadow-xs'
                                                            : 'bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                                    }`}>
                                                    <span className="truncate">{cat.name}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-[2px] ${
                                                        active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300'
                                                    }`}>{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* حاوية فرعية: اختيار فئة السعر (Tier) للعطور الزيتية */}
                                {(() => {
                                    const selectedDraftCat = categories.find(c => c.id === draftCat);
                                    const isOilOrTierCat = !!selectedDraftCat && (
                                        selectedDraftCat.name.includes('زيت') ||
                                        products.some(p => p.category.id === draftCat && (p.price_tier !== null || p.price_tier_id !== null))
                                    );
                                    if (!isOilOrTierCat) return null;

                                    return (
                                        <div className="p-4 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
                                            <h4 className="text-sm font-bold flex items-center justify-between border-b border-slate-200 dark:border-[#1d2d42] pb-2 select-none">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-[2px] bg-brand-subtle text-brand flex items-center justify-center text-sm shrink-0 border border-brand-subtle">💎</span>
                                                    <span className="text-slate-900 dark:text-white tracking-wide">فئة السعر (Tier)</span>
                                                </div>
                                                {draftTier && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDraftTier(null)}
                                                        className="text-xs font-bold text-brand hover:underline cursor-pointer"
                                                    >
                                                        عرض كل التيرات
                                                    </button>
                                                )}
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setDraftTier(null)}
                                                    className={`flex items-center justify-between px-3.5 h-11 sm:h-12 rounded-[2px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer select-none shadow-xs ${
                                                        !draftTier
                                                            ? 'bg-brand text-white border-brand shadow-xs'
                                                            : 'bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                                    }`}
                                                >
                                                    <span>جميع التيرات</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-[2px] ${
                                                        !draftTier ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {products.filter(p => p.category.id === draftCat).length}
                                                    </span>
                                                </button>
                                                {tiers.map(tier => {
                                                    const count = products.filter(p => p.category.id === draftCat && (p.price_tier?.id === tier.id || p.price_tier_id === tier.id)).length;
                                                    const active = draftTier === tier.id;
                                                    return (
                                                        <button
                                                            key={tier.id}
                                                            type="button"
                                                            onClick={() => setDraftTier(tier.id)}
                                                            className={`flex items-center justify-between px-3.5 h-11 sm:h-12 rounded-[2px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer select-none shadow-xs ${
                                                                active
                                                                    ? 'bg-brand text-white border-brand shadow-xs'
                                                                    : 'bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#1d2d42] hover:border-brand/40'
                                                            }`}
                                                        >
                                                            <span className="truncate">{tier.name}</span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-[2px] ${
                                                                active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300'
                                                            }`}>
                                                                {count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* حاوية 3: حالة المخزون والتنبيهات */}
                                <div className="p-4 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3 shadow-xs">
                                    <h4 className="text-sm font-bold flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2d42] pb-2 text-slate-900 dark:text-white select-none">
                                        <span className="w-7 h-7 rounded-[2px] bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0 border border-amber-500/30">⚠️</span>
                                        <span className="tracking-wide">حالة المخزون والتنبيهات</span>
                                    </h4>

                                    <button
                                        onClick={() => setDraftLowStockOnly(!draftLowStockOnly)}
                                        className={`flex items-center justify-between px-4 h-12 rounded-[2px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer select-none ${
                                            draftLowStockOnly
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                                : 'bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#1d2d42] hover:border-amber-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <AlertTriangle className={`w-4 h-4 ${draftLowStockOnly ? 'text-white' : 'text-amber-500'}`} />
                                            <span>المنتجات التي أوشكت على النفاد</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-[2px] ${
                                            draftLowStockOnly ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                        }`}>
                                            {products.filter(p => Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0).length} منتج
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] flex items-center gap-3 select-none shrink-0">
                                <button
                                    onClick={() => {
                                        setFilterCat(draftCat);
                                        setFilterTier(draftTier);
                                        setSearchKeywords([...draftSearchKeywords]);
                                        setLowStockOnly(draftLowStockOnly);
                                        setFilterDrawerOpen(false);
                                    }}
                                    className="flex-1 h-12 rounded-[2px] bg-brand text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all cursor-pointer"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>عرض النتائج ({draftFiltered.length})</span>
                                </button>
                                {hasDraftFilter && (
                                    <button
                                        onClick={() => {
                                            setDraftSearchKeywords([]);
                                            setDraftCat(null);
                                            setDraftTier(null);
                                            setDraftLowStockOnly(false);
                                        }}
                                        className="h-12 px-5 rounded-[2px] bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs sm:text-sm border border-rose-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>إعادة تعيين</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* الشريط السريع للفلاتر النشطة إن وجدت */}
                {hasActiveFilter && (
                    <div className="p-3 sm:p-3.5 rounded-[2px] bg-slate-50 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 select-none pl-1">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-brand" /> الفلاتر المفعلة:
                            </span>
                            {searchKeywords.map((kw) => {
                                const prod = !isNaN(Number(kw)) ? products.find(p => p.id === Number(kw)) : null;
                                const displayText = prod ? prod.name : `بحث: "${kw}"`;
                                return (
                                    <span key={kw} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle font-bold shadow-xs">
                                        <span className="max-w-[200px] truncate">{displayText}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = searchKeywords.filter(k => k !== kw);
                                                setSearchKeywords(updated);
                                                setDraftSearchKeywords(updated);
                                            }}
                                            className="w-4 h-4 rounded-[1px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                            title="إزالة هذا البحث"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                );
                            })}
                            {filterCat && (
                                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[2px] bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/25 font-bold shadow-xs">
                                    <span>التصنيف: {categories.find(c => c.id === filterCat)?.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setFilterCat(null); setDraftCat(null); setFilterTier(null); setDraftTier(null); }}
                                        className="w-4 h-4 rounded-[1px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                        title="إلغاء فلتر التصنيف"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filterTier && (
                                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle font-bold shadow-xs">
                                    <span>التير: {tiers.find(t => t.id === filterTier)?.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setFilterTier(null); setDraftTier(null); }}
                                        className="w-4 h-4 rounded-[1px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                        title="إلغاء فلتر التير"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {lowStockOnly && (
                                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[2px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold shadow-xs">
                                    <span>أوشكت على النفاد</span>
                                    <button
                                        type="button"
                                        onClick={() => { setLowStockOnly(false); setDraftLowStockOnly(false); }}
                                        className="w-4 h-4 rounded-[1px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                        title="إلغاء فلتر النواقص"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchKeywords([]);
                                setFilterCat(null);
                                setFilterTier(null);
                                setLowStockOnly(false);
                                setDraftSearchKeywords([]);
                                setDraftCat(null);
                                setDraftTier(null);
                                setDraftLowStockOnly(false);
                            }}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[2px] bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:!text-white font-bold text-xs border border-rose-500/25 transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>إلغاء الكل</span>
                        </button>
                    </div>
                )}

                {/* القائمة الرئيسية للمنتجات */}
                <div className="bg-white dark:bg-[#0c1421] rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/70 dark:bg-[#101a29]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle flex items-center justify-center">
                                <Package className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                قائمة المنتجات ({filtered.length})
                            </h2>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-bold text-sm sm:text-base">لا توجد منتجات مطابقة</span>
                        </div>
                    ) : (
                        <>
                            {/* جدول — PC */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-[#101a29] border-b border-slate-200 dark:border-[#1d2d42]">
                                            {['الاسم', 'التصنيف', 'مدى السعر', 'سعر العبوة', 'المخزون', 'الحد الأدنى', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#162338]">
                                        {paginatedProducts.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-[#101a29]/60 transition-colors group">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{product.name}</span>
                                                        {product.category.is_operational && (
                                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] border border-slate-200 dark:border-[#1d2d42] text-slate-600 dark:text-slate-300">تشغيلي</span>
                                                        )}
                                                        {product.qrcode && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle">
                                                                <QrCode className="w-3 h-3" /> QR
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">{product.category.name}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {product.selling_type === 'tier_based' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] bg-brand-subtle text-brand font-bold text-xs border border-brand-subtle">{product.price_tier?.name}</span>
                                                    ) : product.product_price ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm font-number">{fmt(product.product_price.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-bold">—</span>
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1d2d42] font-bold text-xs sm:text-sm font-number">{fmt(product.product_price.price_per_unit_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">--</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {product.product_price?.full_bottle_regular ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm font-number">{fmt(product.product_price.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-bold">—</span>
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1d2d42] font-bold text-xs sm:text-sm font-number">{fmt(product.product_price.full_bottle_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">--</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-[2px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs sm:text-sm">
                                                            ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-number">
                                                            {fmt(product.stock)} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-number">{fmt(product.min_stock)} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {!product.qrcode && (
                                                            <button
                                                                onClick={() => handleGenerate(product)}
                                                                title="إنشاء QR Code"
                                                                className="flex items-center gap-1 h-8 px-2.5 rounded-[2px] border border-brand-subtle bg-brand-subtle text-brand hover:bg-brand hover:!text-white hover:border-brand transition-colors font-bold text-xs cursor-pointer shadow-xs"
                                                            >
                                                                <QrCode className="w-3.5 h-3.5" /> إنشاء
                                                            </button>
                                                        )}
                                                        {product.qrcode && (
                                                            <button
                                                                onClick={() => setQrProduct(product)}
                                                                title="عرض QR Code"
                                                                className="flex items-center gap-1 h-8 px-2.5 rounded-[2px] border border-brand-subtle bg-brand-subtle text-brand hover:bg-brand hover:!text-white hover:border-brand transition-colors font-bold text-xs cursor-pointer shadow-xs"
                                                            >
                                                                <QrCode className="w-3.5 h-3.5" /> QR
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setShowCreate(false); startEdit(product); }}
                                                            className="flex items-center gap-1 h-8 px-2.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-700 dark:text-slate-200 hover:bg-brand hover:text-white hover:border-brand transition-colors font-bold text-xs cursor-pointer shadow-xs">
                                                            <Pencil className="w-3.5 h-3.5" /> تعديل
                                                        </button>
                                                        <DeleteModal
                                                            onConfirm={() => deleteProduct(product.id)}
                                                            trigger={
                                                                <button className="flex items-center gap-1 h-8 px-2.5 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors font-bold text-xs cursor-pointer shadow-xs">
                                                                    <Trash2 className="w-3.5 h-3.5" /> حذف
                                                                </button>
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* كاردات — Mobile Touch */}
                            <div className="flex flex-col gap-3.5 lg:hidden">
                                {paginatedProducts.map(product => {
                                    const hasPrice = product.selling_type === 'unit_priced' && product.product_price;
                                    const hasBottle = !!product.product_price?.full_bottle_regular;
                                    const lowStock = Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0;

                                    return (
                                        <div key={product.id} className="rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] overflow-hidden shadow-xs">

                                            {/* رأس الكارت */}
                                            <div className="px-4 py-3 bg-slate-50/70 dark:bg-[#101a29] border-b border-slate-200 dark:border-[#1d2d42]">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-900 dark:text-white text-base leading-tight">{product.name}</span>
                                                    {product.qrcode && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle">
                                                            <QrCode className="w-3 h-3" /> QR
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{product.category.name}</span>
                                                    {product.selling_type === 'tier_based' && (
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-brand-subtle text-brand border border-brand-subtle">{product.price_tier?.name}</span>
                                                    )}
                                                    {product.category.is_operational && (
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1d2d42]">تشغيلي</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* بيانات */}
                                            <div className="flex flex-col divide-y divide-slate-100 dark:divide-[#162338] px-4">

                                                {hasPrice && (
                                                    <div className="flex items-center justify-between py-2.5">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">مدى السعر</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs font-number">{fmt(product.product_price!.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-bold">—</span>
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1d2d42] font-bold text-xs font-number">{fmt(product.product_price!.price_per_unit_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {hasBottle && (
                                                    <div className="flex items-center justify-between py-2.5">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">سعر العبوة</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs font-number">{fmt(product.product_price!.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-bold">—</span>
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#152238] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1d2d42] font-bold text-xs font-number">{fmt(product.product_price!.full_bottle_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between py-2.5">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">المخزون</span>
                                                    <div className="flex items-baseline gap-1">
                                                        {lowStock ? (
                                                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-[2px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs">
                                                                ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                            </span>
                                                        ) : (
                                                            <span className="font-bold text-sm text-slate-900 dark:text-white font-number">{fmt(product.stock)} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-2.5">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الحد الأدنى</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 font-number">{fmt(product.min_stock)}</span>
                                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* الإجراءات باللمس */}
                                            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-200 dark:border-[#1d2d42] bg-slate-50/40 dark:bg-[#0e1624]">
                                                {!product.qrcode && (
                                                    <button
                                                        onClick={() => handleGenerate(product)}
                                                        className="flex items-center justify-center gap-1 h-9 px-3 rounded-[2px] border border-brand-subtle bg-brand-subtle text-brand hover:bg-brand hover:!text-white hover:border-brand transition-colors font-bold text-xs shrink-0 shadow-xs cursor-pointer"
                                                    >
                                                        <QrCode className="w-3.5 h-3.5" /> إنشاء
                                                    </button>
                                                )}
                                                {product.qrcode && (
                                                    <button
                                                        onClick={() => setQrProduct(product)}
                                                        className="flex items-center justify-center gap-1 h-9 px-3 rounded-[2px] border border-brand-subtle bg-brand-subtle text-brand hover:bg-brand hover:!text-white hover:border-brand transition-colors font-bold text-xs shrink-0 shadow-xs cursor-pointer"
                                                    >
                                                        <QrCode className="w-3.5 h-3.5" /> QR
                                                    </button>
                                                )}
                                                <button onClick={() => { setShowCreate(false); startEdit(product); }}
                                                    className="flex-1 flex items-center justify-center gap-1 h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-700 dark:text-slate-200 hover:bg-brand hover:text-white hover:border-brand transition-colors font-bold text-xs shadow-xs cursor-pointer">
                                                    <Pencil className="w-3.5 h-3.5" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => deleteProduct(product.id)}
                                                    wrapperClassName="flex-1"
                                                    trigger={
                                                        <button className="w-full flex items-center justify-center gap-1 h-9 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors font-bold text-xs shadow-xs cursor-pointer">
                                                            <Trash2 className="w-3.5 h-3.5" /> حذف
                                                        </button>
                                                    }
                                                />
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>

                            {/* الترقيم (Pagination) لمطابقة صفحة الفواتير */}
                            <Pagination
                                links={paginationLinks}
                                currentPage={safeCurrentPage}
                                lastPage={totalPages}
                                onPageChange={(p) => {
                                    setCurrentPage(p);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </>
                    )}
                    </div>
                </div>


            </div>

            {/* QR Modal (منتج مفرد) */}
            {qrProduct && (
                <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />
            )}

            {/* QR Modal (طباعة جماعية لكل النتائج المفلترة) */}
            {bulkPrintOpen && filtered.length > 0 && (
                <QrModal productsList={filtered} onClose={() => setBulkPrintOpen(false)} />
            )}

            {/* NumberPad Modal للأرقام والأسعار اللمسية */}
            {padConfig && (
                <NumberPadModal
                    isOpen={!!padConfig}
                    title={padConfig.title}
                    initialValue={padConfig.initial}
                    onConfirm={(val) => {
                        activeForm.setData(padConfig.field as any, val);
                        setPadConfig(null);
                    }}
                    onClose={() => setPadConfig(null)}
                />
            )}

            {/* Modal استيراد ملف Excel */}
            {showImportModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 dir-rtl">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in cursor-pointer"
                        onClick={() => !importForm.processing && setShowImportModal(false)}
                    />
                    <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] rounded-[2px] shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-[2px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">استيراد البيانات من Excel</h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">رفع شيت إكسل يتضمن المنتجات والتصنيفات والأحجام والتيرات</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={importForm.processing}
                                onClick={() => setShowImportModal(false)}
                                className="w-8 h-8 rounded-[2px] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#152238] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors border border-slate-200 dark:border-[#1d2d42] disabled:opacity-50 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!importForm.data.file) return;
                                importForm.post('/products/import/excel', {
                                    forceFormData: true,
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        setShowImportModal(false);
                                        importForm.reset();
                                    },
                                });
                            }}
                            className="p-5 space-y-4"
                        >
                            {/* تعليمات وتنبيهات */}
                            <div className="p-3.5 rounded-[2px] bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed space-y-1">
                                <p className="font-bold text-xs sm:text-sm">💡 تنبيه وتعليمات الاستيراد:</p>
                                <p>• يُفضّل دائماً تصدير نسخة من المنتجات كإجراء احتياطي قبل الاستيراد.</p>
                                <p>• حدد أدناه كيفية معالجة البيانات السابقة (التصنيفات، الأحجام، التيرات، المنتجات).</p>
                            </div>

                            {/* خيارات طريقة الاستيراد */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    طريقة معالجة البيانات:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* Option 1: إضافة المنتجات الجديدة فقط */}
                                    <div
                                        onClick={() => importForm.setData('import_mode', 'add_only')}
                                        className={`cursor-pointer rounded-[2px] p-3 border transition-colors flex flex-col justify-between gap-2.5 ${
                                            importForm.data.import_mode === 'add_only'
                                                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                                : 'border-slate-200 dark:border-[#1d2d42] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#0a121e]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 ${
                                                    importForm.data.import_mode === 'add_only'
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-slate-100 dark:bg-[#152238] text-slate-500'
                                                }`}>
                                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                                </div>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                    إضافة الجديد فقط
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                                موصى به
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            تخطي البيانات والمنتجات المشتركة وإبقاء بياناتها كما هي، وإضافة البيانات الجديدة فقط الواردة في الملف.
                                        </p>
                                    </div>

                                    {/* Option 2: مسح البيانات السابقة ثم وضع البيانات الجديدة */}
                                    <div
                                        onClick={() => importForm.setData('import_mode', 'wipe_and_replace')}
                                        className={`cursor-pointer rounded-[2px] p-3 border transition-colors flex flex-col justify-between gap-2.5 ${
                                            importForm.data.import_mode === 'wipe_and_replace'
                                                ? 'border-rose-500 bg-rose-500/10 shadow-xs'
                                                : 'border-slate-200 dark:border-[#1d2d42] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#0a121e]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 ${
                                                    importForm.data.import_mode === 'wipe_and_replace'
                                                        ? 'bg-rose-500 text-white'
                                                        : 'bg-slate-100 dark:bg-[#152238] text-slate-500'
                                                }`}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                    مسح الكل واستبدال
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                                حذف شامل
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            مسح كافة البيانات السابقة بالكامل، وتنزيل بيانات الملف كنسخة جديدة كلياً.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* منطقة اختيار الملف */}
                            <div>
                                <input
                                    ref={importFileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        importForm.setData('file', file);
                                    }}
                                />

                                <div
                                    onClick={() => importFileInputRef.current?.click()}
                                    className={`cursor-pointer border border-dashed rounded-[2px] p-5 text-center transition-colors ${
                                        importForm.data.file
                                            ? 'border-emerald-500 bg-emerald-500/5'
                                            : 'border-slate-300 dark:border-[#1d2d42] hover:border-brand bg-slate-50/50 dark:bg-[#0a121e]'
                                    }`}
                                >
                                    <div className="w-10 h-10 mx-auto rounded-[2px] bg-white dark:bg-[#121c2c] border border-slate-200 dark:border-[#1d2d42] shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300 mb-2">
                                        {importForm.data.file ? (
                                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Upload className="w-5 h-5 text-amber-500" />
                                        )}
                                    </div>
                                    {importForm.data.file ? (
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 truncate max-w-xs mx-auto">
                                                {importForm.data.file.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                الحجم: {(importForm.data.file.size / 1024).toFixed(1)} ك.ب (اضغط للتغيير)
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                                انقر هنا لاختيار ملف Excel (.xlsx)
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                الحد الأقصى للحجم 20 ميغابايت
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {importForm.errors.file && (
                                    <p className="mt-1.5 text-xs font-bold text-rose-500">
                                        {importForm.errors.file}
                                    </p>
                                )}
                            </div>

                            {/* أزرار الإجراء */}
                            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200 dark:border-[#1d2d42]">
                                <button
                                    type="button"
                                    disabled={importForm.processing}
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 h-10 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors border border-slate-200 dark:border-[#1d2d42] disabled:opacity-50 cursor-pointer"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={!importForm.data.file || importForm.processing}
                                    className={`flex items-center gap-1.5 px-5 h-10 rounded-[2px] text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
                                        importForm.data.import_mode === 'wipe_and_replace'
                                            ? 'bg-rose-600 hover:bg-rose-700'
                                            : 'bg-brand hover:opacity-95'
                                    }`}
                                >
                                    {importForm.data.import_mode === 'wipe_and_replace' ? (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    ) : (
                                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                    <span>
                                        {importForm.processing
                                            ? 'جاري الاستيراد والمعالجة...'
                                            : importForm.data.import_mode === 'wipe_and_replace'
                                                ? 'مسح الكل وبدء الاستيراد'
                                                : 'إضافة المنتجات الجديدة'}
                                    </span>
                                </button>
                            </div>

                        </form>
                    </div>
                </div>,
                document.body
            )}


</AppShell>
    );
}
