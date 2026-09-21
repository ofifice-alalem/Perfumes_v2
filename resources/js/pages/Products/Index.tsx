import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, Pagination } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Pencil, Trash2, X, Check, Package, QrCode, RefreshCw, Printer, SlidersHorizontal, Search, RotateCcw, AlertTriangle, Calculator } from 'lucide-react';
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
interface QrModalProps { product: Product; onClose: () => void; }

const PERFUME_SVG_B64 = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="22" y="18" width="20" height="32" rx="6" fill="#1e293b"/><rect x="26" y="10" width="12" height="10" rx="3" fill="#1e293b"/><rect x="29" y="6" width="6" height="6" rx="2" fill="#475569"/><ellipse cx="32" cy="34" rx="6" ry="8" fill="white" opacity="0.15"/><rect x="28" y="8" width="2" height="4" rx="1" fill="white" opacity="0.4"/></svg>`);

const PRESET_LABEL_SIZES = [
    { label: '50 × 25 مم (الأكثر شيوعاً)', w: 50, h: 25 },
    { label: '50 × 30 مم', w: 50, h: 30 },
    { label: '40 × 25 مم', w: 40, h: 25 },
    { label: '60 × 40 مم', w: 60, h: 40 },
];

function toEan13(code: string): string {
    const digits = String(code || '').replace(/\D/g, '');
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

function QrModal({ product, onClose }: QrModalProps) {
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

    const [copies, setCopies] = useState<number>(1);
    const [isCustomSize, setIsCustomSize] = useState<boolean>(() => {
        return !PRESET_LABEL_SIZES.some(s => s.w === widthMm && s.h === heightMm);
    });
    const [printingNode, setPrintingNode] = useState<boolean>(false);
    const [nodePrintMsg, setNodePrintMsg] = useState<{ success: boolean; text: string } | null>(null);

    const handleNodePrint = async () => {
        setPrintingNode(true);
        setNodePrintMsg(null);
        try {
            const res = await fetch('/settings/node-printer/print-label', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    width_mm: widthMm,
                    height_mm: heightMm,
                    rotation: rotation,
                    offset_x: offsetX,
                    offset_y: offsetY,
                    tab: tab,
                    product_name: product.name,
                    price: priceDisplay,
                    code: product.qrcode || '0000000000',
                    show_name: showName,
                    show_price: showPrice,
                    show_code_text: showCodeText,
                    copies: copies,
                    protocol: 'tspl',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setNodePrintMsg({ success: true, text: data.message || 'تمت الطباعة بنجاح عبر محرك Node!' });
            } else {
                setNodePrintMsg({ success: false, text: data.message || 'فشلت الطباعة عبر محرك Node' });
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

    // استخراج السعر
    const priceDisplay = product.product_price?.full_bottle_regular && Number(product.product_price.full_bottle_regular) > 0
        ? `${Number(product.product_price.full_bottle_regular).toLocaleString('en-US')} د.ل`
        : product.product_price?.price_per_unit_regular && Number(product.product_price.price_per_unit_regular) > 0
        ? `${Number(product.product_price.price_per_unit_regular).toLocaleString('en-US')} د.ل`
        : '';

    function handlePrint() {
        const win = window.open('', '_blank', 'width=550,height=550');
        if (!win) return;

        const isRotated = rotation === 90 || rotation === 270;
        // الأبعاد الحقيقية للمحتوى الداخلي عند التدوير
        const innerW = isRotated ? heightMm : widthMm;
        const innerH = isRotated ? widthMm : heightMm;

        // استخراج SVG مباشرة دون تكرار وسوم الـ svg مع إزالة الرقم الخارجي البارز على اليسار في EAN-13 ليطابق شاشة المعاينة تماماً
        let graphicSvgHtml = '';
        if (tab === 'classic') {
            const qrSvgEl = document.querySelector('#label-modal-qr-preview svg') as SVGElement | null;
            graphicSvgHtml = qrSvgEl ? qrSvgEl.outerHTML : '';
        } else {
            const barSvgEl = document.querySelector('#label-modal-bar-preview svg') as SVGElement | null;
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

        // حساب المقاسات المناسبة حسب نوع الرمز بناءً على أبعاد الورقة
        const autoQrSizeForPrint = Math.max(8, Math.min(
            15,
            Math.round(Math.min((innerH - (showName ? 5.5 : 2)) * 0.65, innerW * 0.28) * 10) / 10
        ));
        const qrBoxSizeMm = qrSizeCustom !== null ? qrSizeCustom : autoQrSizeForPrint;
        const availableBarH = Math.max(8, innerH - (showName ? 4 : 0) - (showPrice ? 4 : 0) - 2);

        const labelHtml = (tab === 'classic' ? `
            <div class="label-page">
                <div class="label-content classic-layout">
                    ${showName ? `<div class="p-name full-width">${product.name}</div>` : ''}

                    <div class="classic-body">
                        <div class="info-side">
                            ${showCodeText && product.qrcode ? `<div class="p-code">${product.qrcode}</div>` : ''}
                            ${showPrice && priceDisplay ? `<div class="p-price">${priceDisplay}</div>` : ''}
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
                    ${showName ? `<div class="p-name">${product.name}</div>` : ''}

                    <div class="graphic-wrap bar-wrap">
                        ${graphicSvgHtml}
                    </div>

                    ${showPrice && priceDisplay ? `<div class="p-price">${priceDisplay}</div>` : ''}
                </div>
            </div>
        `).trim();

        win.document.write(`
            <!DOCTYPE html>
            <html dir="ltr">
            <head>
                <meta charset="utf-8" />
                <title>طباعة ملصق - ${product.name}</title>
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
                        background: #fff;
                    }
                    body {
                        width: ${widthMm}mm !important;
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
                        font-size: ${Math.min(9.5, Math.max(7, innerH * 0.28))}pt;
                        font-weight: 900;
                        color: #000;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        line-height: 1.15;
                        margin: 0 !important;
                        padding: 0 !important;
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
                        direction: rtl !important;
                        text-align: center !important;
                        gap: 0.8mm !important;
                        overflow: hidden !important;
                    }
                    .classic-body .p-code {
                        direction: ltr !important;
                        text-align: center !important;
                        font-family: monospace;
                        font-size: 8pt;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                        color: #000;
                        line-height: 1.1;
                        margin: 0 !important;
                    }
                    .classic-body .p-price {
                        font-family: 'Tajawal', sans-serif !important;
                        direction: rtl !important;
                        text-align: center !important;
                        font-size: ${Math.min(12, Math.max(8.5, innerH * 0.36))}pt;
                        font-weight: 900;
                        color: #000;
                        line-height: 1.1;
                        margin: 0 !important;
                    }
                    .classic-body .qr-side {
                        flex-shrink: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .classic-body .graphic-wrap.qr-wrap {
                        width: ${qrBoxSizeMm}mm !important;
                        height: ${qrBoxSizeMm}mm !important;
                        max-width: ${qrBoxSizeMm}mm !important;
                        max-height: ${qrBoxSizeMm}mm !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        margin: 0 !important;
                        overflow: hidden !important;
                    }
                    .classic-body .graphic-wrap.qr-wrap svg {
                        display: block !important;
                        width: ${qrBoxSizeMm}mm !important;
                        height: ${qrBoxSizeMm}mm !important;
                        max-width: ${qrBoxSizeMm}mm !important;
                        max-height: ${qrBoxSizeMm}mm !important;
                        margin: 0 !important;
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
                        font-size: ${Math.min(8.5, Math.max(6.5, innerH * 0.28))}pt;
                        font-weight: 900;
                        color: #000;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 100%;
                        line-height: 1.15;
                        margin: 0 !important;
                        padding: 0 !important;
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
                        max-width: 96% !important;
                        max-height: ${availableBarH}mm !important;
                        height: auto !important;
                    }
                    .bar-layout .p-price {
                        font-family: 'Tajawal', sans-serif !important;
                        direction: rtl !important;
                        text-align: center !important;
                        font-size: ${Math.min(9, Math.max(6.8, innerH * 0.3))}pt;
                        font-weight: 900;
                        color: #000;
                        line-height: 1.1;
                        margin: 0 !important;
                    }
                </style>
                <script>
                    window.onload = async () => {
                        if (document.fonts) {
                            try {
                                await document.fonts.ready;
                            } catch (e) {}
                        }
                        window.print();
                        window.close();
                    };
                <\/script>
            </head>
            <body>${Array.from({ length: Math.max(1, copies) }).map(() => labelHtml).join('')}</body>
            </html>
        `);
        win.document.close();
    }

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            {/* الخلفية المعتمة ببلور ناعم وتعتيم كامل */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer transition-opacity"
                onClick={onClose}
            />

            {/* نافذة الموديل بنمط Spatial UI العصري */}
            <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_25px_70px_rgba(0,0,0,0.6)] border-2 border-slate-200/80 dark:border-white/10 flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/8 bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[16px] bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base">طباعة ملصق الباركود والـ QR</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">{product.name}</span>
                                {product.qrcode && (
                                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {product.qrcode}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-red-500 hover:text-white text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                        title="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Content: شبكة مقسمة لعمودين (معاينة حية على جانب، والإعدادات على الجانب الآخر) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

                        {/* العمود 1 (اليمين في RTL): المعاينة الحية للملصق وخيارات الإظهار */}
                        <div className="md:col-span-5 flex flex-col gap-4">
                            {/* صندوق المعاينة الفضائي */}
                            <div className="flex flex-col items-center justify-center p-4 rounded-[24px] bg-slate-100/80 dark:bg-slate-800/40 border-2 border-dashed border-slate-300/80 dark:border-slate-700/80">
                                <div className="text-[11px] font-black text-slate-600 dark:text-slate-300 mb-3 flex items-center justify-between w-full">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        معاينة الملصق المباشرة
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold border border-primary/20">
                                            {widthMm} × {heightMm} مم
                                        </span>
                                        {rotation !== 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/30">
                                                {rotation}°
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* الصندوق الأبيض الحقيقي للملصق */}
                                <div
                                    style={{
                                        width: '210px',
                                        height: `${Math.max(95, Math.min(160, Math.round(210 * (heightMm / widthMm))))}px`,
                                    }}
                                    className="bg-white rounded-[12px] shadow-[0_10px_25px_rgba(0,0,0,0.15)] border border-slate-300/80 p-2 flex flex-col items-center justify-center text-slate-900 font-sans transition-all overflow-hidden select-none relative"
                                >
                                    <div
                                        style={{
                                            transform: `translate(${offsetX * 2}px, ${offsetY * 2}px) ${rotation !== 0 ? `rotate(${rotation}deg) ` : ''}`,
                                            transformOrigin: 'center center',
                                        }}
                                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 transition-transform py-1 px-1 font-sans"
                                    >
                                        {showName && (
                                            <span className="font-sans font-black text-xs text-slate-900 truncate w-full text-center leading-tight">
                                                {product.name}
                                            </span>
                                        )}

                                        {tab === 'classic' ? (
                                            <div className="flex items-center justify-center w-full gap-3 px-1 overflow-hidden" dir="rtl">
                                                {/* جهة اليمين: الكود وتحته السعر */}
                                                <div className="flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden font-sans">
                                                    {showCodeText && product.qrcode && (
                                                        <span className="font-mono text-[11px] font-bold text-slate-700 tracking-wider text-center">
                                                            {product.qrcode}
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
                                                    <QRCodeSVG
                                                        value={product.qrcode || '0000000000'}
                                                        size={Math.max(38, Math.min(70, Math.round(Math.max(95, Math.min(160, Math.round(210 * (heightMm / widthMm)))) * (activeQrSizeMm / heightMm))))}
                                                        level="H"
                                                        fgColor="#000000"
                                                        imageSettings={{
                                                            src: PERFUME_SVG_B64,
                                                            width: Math.max(8, Math.round(Math.max(38, Math.min(70, Math.round(Math.max(95, Math.min(160, Math.round(210 * (heightMm / widthMm)))) * (activeQrSizeMm / heightMm)))) * 0.22)),
                                                            height: Math.max(8, Math.round(Math.max(38, Math.min(70, Math.round(Math.max(95, Math.min(160, Math.round(210 * (heightMm / widthMm)))) * (activeQrSizeMm / heightMm)))) * 0.22)),
                                                            excavate: true,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1 flex items-center justify-center w-full overflow-hidden my-0.5">
                                                    {tab === 'ean13' && (
                                                        <div id="label-modal-bar-preview" className="w-full flex items-center justify-center [&_g:first-of-type_text]:hidden">
                                                            <Barcode
                                                                value={toEan13(product.qrcode || '0000000000')}
                                                                format="EAN13"
                                                                width={1.3}
                                                                height={34}
                                                                displayValue={showCodeText}
                                                                textMargin={1}
                                                                fontSize={12}
                                                                font="monospace"
                                                                margin={0}
                                                                lineColor="#000000"
                                                            />
                                                        </div>
                                                    )}

                                                    {tab === 'serial' && (
                                                        <div id="label-modal-bar-preview" className="w-full flex items-center justify-center">
                                                            <Barcode
                                                                value={product.qrcode || '0000000000'}
                                                                format="CODE128"
                                                                width={1.2}
                                                                height={34}
                                                                displayValue={showCodeText}
                                                                textMargin={1}
                                                                fontSize={12}
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
                            <div className="p-3 rounded-[20px] bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col gap-2">
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">عناصر الملصق:</span>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-xs font-black cursor-pointer border transition-all ${
                                        showName
                                            ? 'bg-white dark:bg-slate-700/80 text-primary dark:text-white border-primary/30 shadow-xs'
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

                                    <label className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-xs font-black cursor-pointer border transition-all ${
                                        showPrice
                                            ? 'bg-white dark:bg-slate-700/80 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs'
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

                                    <label className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-xs font-black cursor-pointer border transition-all ${
                                        showCodeText
                                            ? 'bg-white dark:bg-slate-700/80 text-primary dark:text-white border-primary/30 shadow-xs'
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
                        </div>

                        {/* العمود 2 (اليسار في RTL): أدوات الضبط والإعدادات */}
                        <div className="md:col-span-7 flex flex-col gap-4">

                            {/* 1. نوع الرمز: 3 خيارات */}
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    نوع الرمز (Code Type):
                                </label>
                                <div className="flex items-center gap-1.5 p-1 rounded-[16px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => { setTab('ean13'); localStorage.setItem('label_printer_tab', 'ean13'); }}
                                        className={`flex-1 py-2 px-1 rounded-[12px] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                                            tab === 'ean13'
                                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>||| EAN-13 تجاري</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTab('serial'); localStorage.setItem('label_printer_tab', 'serial'); }}
                                        className={`flex-1 py-2 px-1 rounded-[12px] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                                            tab === 'serial'
                                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>||| Code 128 مباشر</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTab('classic'); localStorage.setItem('label_printer_tab', 'classic'); }}
                                        className={`flex-1 py-2 px-1 rounded-[12px] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                                            tab === 'classic'
                                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>🔳 QR مربع</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. مقاس ورقة الملصق (Presets + مخصص) */}
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
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
                                                className={`py-2 px-1.5 rounded-[12px] text-xs font-black border-2 transition-all cursor-pointer text-center ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                                }`}
                                            >
                                                {s.w}×{s.h} مم
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* مقاس مخصص */}
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-[12px] border border-slate-200 dark:border-slate-700">
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
                                            className="w-full bg-transparent font-black text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">مم</span>
                                    </div>

                                    <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-[12px] border border-slate-200 dark:border-slate-700">
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
                                            className="w-full bg-transparent font-black text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">مم</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. الدوران وعدد النسخ */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                                        دوران الاتجاه:
                                    </label>
                                    <button
                                        type="button"
                                        onClick={toggleRotation}
                                        className="w-full flex items-center justify-center gap-2 h-10 rounded-[12px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs hover:border-primary transition-all cursor-pointer"
                                        title="تدوير الملصق"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-primary" />
                                        <span>{rotation === 0 ? 'عادي (0°)' : rotation === 90 ? 'مدوّر (90°)' : rotation === 180 ? 'معكوس (180°)' : 'مدوّر (270°)'}</span>
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                                        عدد النسخ:
                                    </label>
                                    <div className="flex items-center h-10 rounded-[12px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2">
                                        <button
                                            type="button"
                                            onClick={() => setCopies(c => Math.max(1, c - 1))}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-white shadow-xs cursor-pointer hover:bg-slate-200"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={copies}
                                            onChange={e => setCopies(Math.max(1, Number(e.target.value) || 1))}
                                            className="flex-1 text-center font-mono font-black text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCopies(c => Math.min(100, c + 1))}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-white shadow-xs cursor-pointer hover:bg-slate-200"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. إزاحة وتوسيط الطباعة (X و Y) */}
                            <div className="p-3 rounded-[18px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">إزاحة الطباعة (للتوسيط الدقيق بالمليمتر):</span>
                                    {(offsetX !== 0 || offsetY !== 0) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOffsetX(0);
                                                setOffsetY(0);
                                                localStorage.setItem('label_printer_offset_x', '0');
                                                localStorage.setItem('label_printer_offset_y', '0');
                                            }}
                                            className="text-[10px] font-black text-red-500 hover:underline cursor-pointer"
                                        >
                                            تصفير
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center justify-between p-1.5 rounded-[10px] bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">عمودي (Y):</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetY(-0.5)}
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-[11px] min-w-[36px] text-center">
                                                {offsetY > 0 ? `+${offsetY}` : offsetY}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetY(0.5)}
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-1.5 rounded-[10px] bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">أفقي (X):</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetX(-1)}
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-[11px] min-w-[36px] text-center">
                                                {offsetX > 0 ? `+${offsetX}` : offsetX}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetX(1)}
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. حجم رمز الـ QR (عند اختيار QR فقط) */}
                            {tab === 'classic' && (
                                <div className="p-2.5 rounded-[16px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">حجم رمز الـ QR:</span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {qrSizeCustom === null ? 'محسوب تلقائياً حسب الورقة' : 'مقاس يدوي'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = activeQrSizeMm;
                                                const next = Math.max(8, Math.round((current - 1) * 10) / 10);
                                                setQrSizeCustom(next);
                                                localStorage.setItem('label_printer_qr_size', String(next));
                                            }}
                                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-300 active:scale-95"
                                            title="تصغير"
                                        >
                                            -
                                        </button>
                                        <span className="font-mono font-black text-xs px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded min-w-[48px] text-center">
                                            {activeQrSizeMm} مم
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = activeQrSizeMm;
                                                const next = Math.min(22, Math.round((current + 1) * 10) / 10);
                                                setQrSizeCustom(next);
                                                localStorage.setItem('label_printer_qr_size', String(next));
                                            }}
                                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-300 active:scale-95"
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
                                                className="text-[10px] font-black text-primary hover:underline px-1 cursor-pointer"
                                            >
                                                تلقائي
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Footer زر الطباعة */}
                <div className="p-4 border-t border-black/5 dark:border-white/8 bg-slate-50/90 dark:bg-slate-800/40 backdrop-blur-sm shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {nodePrintMsg ? (
                            <span className={nodePrintMsg.success ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}>
                                {nodePrintMsg.text}
                            </span>
                        ) : (
                            <>
                                <Printer className="w-4 h-4 text-primary" />
                                <span>طباعة صامتة عبر Node أو عبر المتصفح</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex-1 sm:flex-initial px-4 h-12 rounded-[16px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-black text-xs hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-[0.98] transition-all cursor-pointer"
                            title="فتح نافذة طباعة المتصفح التقليدية"
                        >
                            <span>طباعة عبر المتصفح</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleNodePrint}
                            disabled={printingNode}
                            className="flex-1 sm:flex-initial sm:min-w-[220px] flex items-center justify-center gap-2 h-12 rounded-[16px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                        >
                            <Printer className="w-5 h-5" />
                            <span>{printingNode ? 'جاري الإرسال للطابعة...' : `⚡ طباعة مباشرة عبر Node (${copies})`}</span>
                        </button>
                    </div>
                </div>

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
    const [filterCat, setFilterCat]       = useState<number | null>(null);
    const [searchProdId, setSearchProdId] = useState<number | null>(null);
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // الفلاتر المعلقة المؤقتة داخل الـ Drawer (قبل الضغط على عرض النتائج)
    const [draftCat, setDraftCat]               = useState<number | null>(null);
    const [draftSearchProdId, setDraftSearchProdId] = useState<number | null>(null);
    const [draftLowStockOnly, setDraftLowStockOnly] = useState(false);

    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [qrProduct, setQrProduct]   = useState<Product | null>(null);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [padConfig, setPadConfig] = useState<{ title: string; field: string; initial: string } | null>(null);

    const hasActiveFilter = !!searchProdId || !!filterCat || lowStockOnly;
    const hasDraftFilter  = !!draftSearchProdId || !!draftCat || draftLowStockOnly;

    // توليد QR لمنتج واحد
    function handleGenerate(p: Product) {
        const newQr = generateQrCode();
        router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, { preserveScroll: true });
    }

    // توليد جماعي لكل المنتجات التي لا تحتوي على QR
    function handleGenerateAll() {
        const missing = products.filter(p => !p.qrcode);
        if (missing.length === 0) return;
        setGeneratingAll(true);
        let remaining = missing.length;
        missing.forEach(p => {
            const newQr = generateQrCode();
            router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, {
                preserveScroll: true,
                onFinish: () => {
                    remaining--;
                    if (remaining === 0) setGeneratingAll(false);
                },
            });
        });
    }

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ ...emptyForm });

    const createCat = categories.find(c => c.id === Number(createForm.data.category_id));
    const editCat   = categories.find(c => c.id === Number(editForm.data.category_id));

    const createIsOriginal = createCat?.unit === 'ml' && createForm.data.selling_type === 'unit_priced' && !createCat?.is_operational;
    const editIsOriginal   = editCat?.unit === 'ml' && editForm.data.selling_type === 'unit_priced' && !editCat?.is_operational;

    function onSelectCategory(form: typeof createForm, val: string) {
        const cat = categories.find(c => c.name === val);
        if (!cat) return;
        form.setData('category_id', String(cat.id));
        form.setData('selling_type', resolveSellingType(cat));
        form.setData('price_tier_id', '');
    }

    function onSelectTier(form: typeof createForm, val: string) {
        const tier = tiers.find(t => `تير ${t.name}` === val);
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
        createForm.post('/products', {
            onSuccess: () => { createForm.reset(); setShowCreate(false); },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/products/${id}`, {
            onSuccess: () => cancelEdit(),
        });
    }

    function deleteProduct(id: number) {
        router.delete(`/products/${id}`);
    }

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const filtered = products.filter(p => {
        if (searchProdId && p.id !== searchProdId) return false;
        if (filterCat && p.category.id !== filterCat) return false;
        if (lowStockOnly && !(Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0)) return false;
        return true;
    });

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
        if (draftSearchProdId && p.id !== draftSearchProdId) return false;
        if (draftCat && p.category.id !== draftCat) return false;
        if (draftLowStockOnly && !(Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0)) return false;
        return true;
    });

    const tierDefaultValue = (form: typeof createForm) => {
        const t = tiers.find(t => String(t.id) === form.data.price_tier_id);
        return t ? `تير ${t.name}` : '';
    };

    // ── حقل QR في نموذج التعديل أو الإنشاء ──────────────────────────
    const renderQrField = (form: typeof editForm | typeof createForm) => {
        const hasQr = !!form.data.qrcode;
        return (
            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                    <span className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg shrink-0 border border-violet-500/30">📱</span>
                    <span className="text-slate-900 dark:text-white tracking-wide">رمز QR Code والتتبع</span>
                </h4>

                <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-violet-500" />
                        رمز QR Code
                    </label>

                    <div className="flex items-center gap-2">
                        {hasQr ? (
                            <button
                                type="button"
                                onClick={() => form.setData('qrcode', '')}
                                className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white font-black text-xs transition-all border border-red-500/30"
                            >
                                إزالة الرمز
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => form.setData('qrcode', generateQrCode())}
                                className="px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white font-black text-xs transition-all border border-violet-500/30"
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
                        className="spatial-input h-14 rounded-[16px] px-4 text-base font-bold border-2 w-full font-mono dir-ltr"
                    />
                </div>
            </div>
        );
    };

    const activeForm = editingId !== null ? editForm : createForm;
    const activeCat  = editingId !== null ? editCat : createCat;
    const activeIsOriginal = editingId !== null ? editIsOriginal : createIsOriginal;

    return (
        <AppShell title="إدارة المنتجات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">إدارة المنتجات</h1>
                        <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">إدارة منتجات العطور والتسعير والتصنيفات بأحدث واجهة باللمس</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setDraftCat(filterCat);
                                setDraftSearchProdId(searchProdId);
                                setDraftLowStockOnly(lowStockOnly);
                                setFilterDrawerOpen(true);
                            }}
                            className={`flex items-center justify-center gap-3 px-6 h-14 rounded-[20px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer shrink-0 shadow-md touch-manipulation select-none ${
                                hasActiveFilter
                                    ? 'bg-primary text-white border-primary shadow-primary/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>تصفية المنتجات</span>
                            {hasActiveFilter && (
                                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                            )}
                        </button>
                        {hasActiveFilter && (
                            <button
                                onClick={() => {
                                    setSearchProdId(null);
                                    setFilterCat(null);
                                    setLowStockOnly(false);
                                    setDraftSearchProdId(null);
                                    setDraftCat(null);
                                    setDraftLowStockOnly(false);
                                }}
                                className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base border-2 border-red-500/30 shrink-0 shadow-sm touch-manipulation select-none"
                                title="إعادة تعيين الفلاتر"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}
                        {products.some(p => !p.qrcode) && (
                            <button
                                onClick={handleGenerateAll}
                                disabled={generatingAll}
                                className="flex items-center justify-center gap-2.5 px-6 h-14 rounded-[20px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base disabled:opacity-50 shrink-0"
                            >
                                <QrCode className="w-5 h-5" />
                                {generatingAll ? 'جاري التوليد...' : `توليد QR للكل (${products.filter(p => !p.qrcode).length})`}
                            </button>
                        )}
                        <button onClick={() => { setShowCreate(true); setEditingId(null); createForm.reset(); }}
                            className="spatial-button flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 h-14 text-lg font-black rounded-[20px] active:scale-95 shadow-xl shadow-primary/30 shrink-0">
                            <Plus className="w-6 h-6" /> إضافة منتج
                        </button>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-5 py-4 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-4 rounded-[20px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-sm">{flash.error}</div>
                )}

                {/* Spatial Touch Drawer — إنشاء وتعديل المنتجات */}
                {(showCreate || editingId !== null) && createPortal(
                    <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
                        <div
                            className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
                            onClick={() => {
                                setShowCreate(false);
                                cancelEdit();
                            }}
                        />
                        <div
                            className="relative w-full sm:w-[840px] md:w-[1000px] lg:w-[1140px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300 cursor-default z-10"
                        >
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90">
                                <div className="flex items-center gap-4">
                                    <div className="w-13 h-13 rounded-[18px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-3">
                                        {editingId !== null ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">
                                            {editingId !== null ? `تعديل: ${editForm.data.name}` : 'إضافة منتج جديد'}
                                        </h2>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                            {editingId !== null ? 'تعديل التفاصيل، الأسعار، والحد الأدنى للمخزون' : 'أدخل بيانات المنتج الجديد وحد التنبيه والتسعير'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowCreate(false); cancelEdit(); }}
                                    className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all border border-slate-300 dark:border-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Drawer Body — شبكة من عمودين للحاويات المخصصة */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-none">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    
                                    {/* العمود الأول (اليمين): المعلومات الأساسية + QR Code */}
                                    <div className="flex flex-col gap-6">
                                        {/* حاوية 1: المعلومات الأساسية والتصنيف */}
                                        <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-5 shadow-sm">
                                            <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                                <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg shrink-0 border border-primary/30">📦</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">المعلومات الأساسية والتصنيف</span>
                                            </h4>

                                            {/* الاسم */}
                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">اسم المنتج</label>
                                                <input
                                                    type="text"
                                                    inputMode="text"
                                                    value={activeForm.data.name}
                                                    onChange={e => activeForm.setData('name', e.target.value)}
                                                    placeholder="مثال: Sauvage Elixir..."
                                                    className="spatial-input h-14 rounded-[18px] px-5 text-lg font-bold border-2"
                                                />
                                                {activeForm.errors.name && <p className="text-sm text-red-500 font-black">{activeForm.errors.name}</p>}
                                            </div>

                                            {/* اختيار التصنيف باللمس */}
                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">التصنيف</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {categories.map(c => {
                                                        const selected = activeCat?.id === c.id;
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => onSelectCategory(activeForm, c.name)}
                                                                className={`flex flex-col items-start gap-1 p-4 rounded-[20px] border-2 transition-all active:scale-95 text-right ${
                                                                    selected
                                                                        ? 'bg-primary/15 border-primary text-primary font-black shadow-md scale-[1.02]'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 font-bold'
                                                                }`}
                                                            >
                                                                <span className="text-base sm:text-lg font-black">{c.name}</span>
                                                                <span className="text-xs sm:text-sm font-bold opacity-75">الوحدة: {unitLabels[c.unit]}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {activeForm.errors.category_id && <p className="text-sm text-red-500 font-black">{activeForm.errors.category_id}</p>}
                                            </div>
                                        </div>

                                        {/* حاوية 4: QR Code Section */}
                                        {renderQrField(activeForm)}
                                    </div>

                                    {/* العمود الثاني (اليسار): الأسعار والتسعين + المخزون */}
                                    <div className="flex flex-col gap-6">
                                        {/* حاوية 2: تفاصيل التسعير والأسعار */}
                                        <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-5 shadow-sm">
                                            <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                                <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 border border-emerald-500/30">💰</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">تفاصيل التسعير والأسعار</span>
                                            </h4>

                                            {/* تير إذا كان tier_based */}
                                            {activeForm.data.selling_type === 'tier_based' && (
                                                <div className="flex flex-col gap-2.5">
                                                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">الفئة السعرية (التير)</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {tiers.map(t => {
                                                            const selected = activeForm.data.price_tier_id === String(t.id);
                                                            return (
                                                                <button
                                                                    key={t.id}
                                                                    type="button"
                                                                    onClick={() => activeForm.setData('price_tier_id', String(t.id))}
                                                                    className={`h-14 px-4 rounded-[16px] border-2 text-base font-black transition-all active:scale-95 ${
                                                                        selected
                                                                            ? 'bg-primary text-white border-primary shadow-md'
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold'
                                                                    }`}
                                                                >
                                                                    تير {t.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {activeForm.errors.price_tier_id && <p className="text-sm text-red-500 font-black">{activeForm.errors.price_tier_id}</p>}
                                                </div>
                                            )}

                                            {/* الأسعار إن كانت unit_priced وغير تشغيلية */}
                                            {activeCat && activeForm.data.selling_type === 'unit_priced' && !activeCat.is_operational && (
                                                <div className="flex flex-col gap-5">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر {unitLabels[activeCat.unit]} — عادي</label>
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
                                                                    className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full cursor-pointer"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPadConfig({
                                                                        title: `سعر ${unitLabels[activeCat.unit]} — عادي`,
                                                                        field: 'price_per_unit_regular',
                                                                        initial: String(activeForm.data.price_per_unit_regular || '')
                                                                    })}
                                                                    className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all"
                                                                    title="فتح لوحة الأرقام اللمسية"
                                                                >
                                                                    <Calculator className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر {unitLabels[activeCat.unit]} — VIP</label>
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
                                                                    className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full cursor-pointer"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPadConfig({
                                                                        title: `سعر ${unitLabels[activeCat.unit]} — VIP`,
                                                                        field: 'price_per_unit_vip',
                                                                        initial: String(activeForm.data.price_per_unit_vip || '')
                                                                    })}
                                                                    className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all"
                                                                    title="فتح لوحة الأرقام اللمسية"
                                                                >
                                                                    <Calculator className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {activeIsOriginal && (
                                                        <div className="flex flex-col gap-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">حجم العبوة الأصلية (مليلتر)</label>
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
                                                                        className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full cursor-pointer"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPadConfig({
                                                                            title: 'حجم العبوة الأصلية (مليلتر)',
                                                                            field: 'bottle_volume',
                                                                            initial: String(activeForm.data.bottle_volume || '')
                                                                        })}
                                                                        className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all"
                                                                        title="فتح لوحة الأرقام اللمسية"
                                                                    >
                                                                        <Calculator className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر العبوة كاملة — عادي</label>
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
                                                                            className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full cursor-pointer"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPadConfig({
                                                                                title: 'سعر العبوة كاملة — عادي',
                                                                                field: 'full_bottle_regular',
                                                                                initial: String(activeForm.data.full_bottle_regular || '')
                                                                            })}
                                                                            className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all"
                                                                            title="فتح لوحة الأرقام اللمسية"
                                                                        >
                                                                            <Calculator className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر العبوة كاملة — VIP</label>
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
                                                                            className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full cursor-pointer"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPadConfig({
                                                                                title: 'سعر العبوة كاملة — VIP',
                                                                                field: 'full_bottle_vip',
                                                                                initial: String(activeForm.data.full_bottle_vip || '')
                                                                            })}
                                                                            className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all"
                                                                            title="فتح لوحة الأرقام اللمسية"
                                                                        >
                                                                            <Calculator className="w-5 h-5" />
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
                                        <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                            <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                                <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/30">⚠️</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">إدارة المخزون والتنبيهات</span>
                                            </h4>

                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">حد تنبيه نقصان المخزون</label>
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
                                                        className="spatial-input h-14 rounded-[18px] px-5 pl-12 text-lg font-bold border-2 w-full cursor-pointer"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPadConfig({
                                                            title: 'حد تنبيه نقصان المخزون',
                                                            field: 'min_stock',
                                                            initial: String(activeForm.data.min_stock || '')
                                                        })}
                                                        className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all"
                                                        title="فتح لوحة الأرقام اللمسية"
                                                    >
                                                        <Calculator className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 flex items-center gap-4">
                                <button
                                    onClick={editingId !== null ? () => submitEdit(editingId) : submitCreate}
                                    disabled={editingId !== null ? editForm.processing : createForm.processing}
                                    className="flex-1 spatial-button h-16 rounded-[22px] text-lg font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30"
                                >
                                    <Check className="w-6 h-6" />
                                    {editingId !== null ? 'تحديث بيانات المنتج' : 'إضافة المنتج إلى النظام'}
                                </button>
                                <button
                                    onClick={() => { setShowCreate(false); cancelEdit(); }}
                                    className="h-16 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-lg active:scale-95 transition-all border-2 border-slate-300 dark:border-slate-600"
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
                            className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
                            onClick={() => setFilterDrawerOpen(false)}
                        />
                        <div
                            className="relative w-full sm:w-[600px] md:w-[680px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300 overflow-hidden cursor-default"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 select-none shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[20px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-3 shadow-md">
                                        <SlidersHorizontal className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">تصفية المنتجات المتقدمة</h2>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">تحديد خيارات البحث والفرز والتصنيف بكفاءة عالية</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFilterDrawerOpen(false)}
                                    className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all border border-slate-300 dark:border-slate-600 touch-manipulation cursor-pointer"
                                    aria-label="إغلاق"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Drawer Content — الحاويات المقسمة */}
                            <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-7 flex flex-col gap-6 scrollbar-none">
                                {/* حاوية 1: البحث والمعلومات الأساسية */}
                                <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                    <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                                        <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg shrink-0 border border-primary/30">🔍</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">البحث والمعلومات الأساسية</span>
                                    </h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        <label className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 select-none">بحث بالاسم أو كود QR</label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <ModernSelect
                                                    label=""
                                                    placeholder="ابحث بالاسم أو كود QR..."
                                                    options={products.map(p => ({
                                                        label: p.name,
                                                        badge: p.category.name,
                                                        meta: fmt(p.stock),
                                                        searchKey: p.qrcode ?? undefined
                                                    }))}
                                                    onSelect={val => {
                                                        const prod = products.find(p => p.name === val);
                                                        if (prod) setDraftSearchProdId(prod.id);
                                                    }}
                                                />
                                            </div>
                                            {draftSearchProdId && (
                                                <button onClick={() => setDraftSearchProdId(null)}
                                                    className="flex items-center gap-2 px-4 h-14 rounded-[18px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-sm shrink-0 border-2 border-red-500/30 select-none touch-manipulation cursor-pointer">
                                                    <X className="w-4 h-4" /> إلغاء البحث
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* حاوية 2: تصنيف المنتجات والفرز */}
                                <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                    <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                                        <span className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0 border border-purple-500/30">🏷️</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">تصنيف المنتجات</span>
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button onClick={() => setDraftCat(null)}
                                            className={`flex items-center justify-between px-5 h-16 sm:h-18 rounded-[20px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation shadow-sm ${
                                                !draftCat
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}>
                                            <span>جميع التصنيفات</span>
                                            <span className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl ${
                                                !draftCat ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                                            }`}>{products.length}</span>
                                        </button>
                                        {categories.map(cat => {
                                            const count = products.filter(p => p.category.id === cat.id).length;
                                            const active = draftCat === cat.id;
                                            return (
                                                <button key={cat.id} onClick={() => setDraftCat(cat.id)}
                                                    className={`flex items-center justify-between px-5 h-16 sm:h-18 rounded-[20px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation shadow-sm ${
                                                        active
                                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}>
                                                    <span className="truncate">{cat.name}</span>
                                                    <span className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl ${
                                                        active ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                                                    }`}>{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* حاوية 3: حالة المخزون والتنبيهات */}
                                <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                    <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                                        <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/30">⚠️</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">حالة المخزون والتنبيهات</span>
                                    </h4>

                                    <button
                                        onClick={() => setDraftLowStockOnly(!draftLowStockOnly)}
                                        className={`flex items-center justify-between px-6 h-18 sm:h-20 rounded-[22px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation ${
                                            draftLowStockOnly
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-500/30'
                                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <AlertTriangle className={`w-6 h-6 ${draftLowStockOnly ? 'text-white' : 'text-amber-500'}`} />
                                            <span>المنتجات التي أوشكت على النفاد</span>
                                        </div>
                                        <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl ${
                                            draftLowStockOnly ? 'bg-white/30 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                        }`}>
                                            {products.filter(p => Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0).length} منتج
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-6 sm:p-7 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 flex items-center gap-4 select-none shrink-0">
                                <button
                                    onClick={() => {
                                        setFilterCat(draftCat);
                                        setSearchProdId(draftSearchProdId);
                                        setLowStockOnly(draftLowStockOnly);
                                        setFilterDrawerOpen(false);
                                    }}
                                    className="flex-1 spatial-button h-16 sm:h-18 rounded-[22px] text-lg sm:text-xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30 touch-manipulation cursor-pointer"
                                >
                                    <Check className="w-6 h-6" />
                                    عرض النتائج ({draftFiltered.length})
                                </button>
                                {hasDraftFilter && (
                                    <button
                                        onClick={() => {
                                            setDraftSearchProdId(null);
                                            setDraftCat(null);
                                            setDraftLowStockOnly(false);
                                        }}
                                        className="h-16 sm:h-18 px-6 sm:px-8 rounded-[22px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white font-black text-base sm:text-lg active:scale-95 transition-all border-2 border-red-500/30 flex items-center gap-2 shrink-0 touch-manipulation cursor-pointer"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        إعادة تعيين
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* الشريط السريع للفلاتر النشطة إن وجدت */}
                {hasActiveFilter && (
                    <div className="p-4 rounded-[22px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2.5 text-sm font-black">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-primary" /> الفلاتر المفعلة:
                            </span>
                            {searchProdId && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                                    بحث: {products.find(p => p.id === searchProdId)?.name}
                                    <button onClick={() => { setSearchProdId(null); setDraftSearchProdId(null); }}><X className="w-3.5 h-3.5 hover:text-red-500" /></button>
                                </span>
                            )}
                            {filterCat && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                    التصنيف: {categories.find(c => c.id === filterCat)?.name}
                                    <button onClick={() => { setFilterCat(null); setDraftCat(null); }}><X className="w-3.5 h-3.5 hover:text-red-500" /></button>
                                </span>
                            )}
                            {lowStockOnly && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                    أوشكت على النفاد
                                    <button onClick={() => { setLowStockOnly(false); setDraftLowStockOnly(false); }}><X className="w-3.5 h-3.5 hover:text-red-500" /></button>
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setSearchProdId(null);
                                setFilterCat(null);
                                setLowStockOnly(false);
                                setDraftSearchProdId(null);
                                setDraftCat(null);
                                setDraftLowStockOnly(false);
                            }}
                            className="text-xs font-black text-red-500 hover:underline shrink-0"
                        >
                            إلغاء الكل
                        </button>
                    </div>
                )}

                {/* القائمة */}
                <SpatialCard title={`المنتجات (${filtered.length})`} icon={<Package className="w-5 h-5" />}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-black text-base">لا توجد منتجات مطابقة</span>
                        </div>
                    ) : (
                        <>
                            {/* جدول — PC */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-base">
                                    <thead>
                                        <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700">
                                            {['الاسم', 'التصنيف', 'مدى السعر', 'سعر العبوة', 'المخزون', 'الحد الأدنى', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-5 py-4 text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide whitespace-nowrap first:rounded-r-[16px] last:rounded-l-[16px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-200/80 dark:divide-slate-700/60">
                                        {paginatedProducts.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group">
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">{product.name}</span>
                                                        {product.category.is_operational && (
                                                            <span className="text-xs font-black px-2.5 py-1 rounded-[8px] bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">تشغيلي</span>
                                                        )}
                                                        {product.qrcode && (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-[8px] bg-violet-500/15 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                                <QrCode className="w-3.5 h-3.5" /> QR
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5 font-black text-slate-800 dark:text-slate-200 text-base whitespace-nowrap">{product.category.name}</td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {product.selling_type === 'tier_based' ? (
                                                        <span className="inline-flex items-center px-4 py-1.5 rounded-[12px] bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 font-black text-base border border-primary/25">تير {product.price_tier?.name}</span>
                                                    ) : product.product_price ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-base sm:text-lg">{fmt(product.product_price.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black text-base">—</span>
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-base sm:text-lg">{fmt(product.product_price.price_per_unit_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-black text-base">--</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {product.product_price?.full_bottle_regular ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-base sm:text-lg">{fmt(product.product_price.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black text-base">—</span>
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-base sm:text-lg">{fmt(product.product_price.full_bottle_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-black text-base">--</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 font-black px-3 py-1.5 rounded-[10px] bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-lg">
                                                            ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                        </span>
                                                    ) : (
                                                        <span className="font-black text-xl text-slate-900 dark:text-white">
                                                            {fmt(product.stock)} <span className="text-sm font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    <span className="font-black text-lg text-slate-800 dark:text-slate-200">{fmt(product.min_stock)} <span className="text-sm font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        {!product.qrcode && (
                                                            <button
                                                                onClick={() => handleGenerate(product)}
                                                                title="إنشاء QR Code"
                                                                className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm"
                                                            >
                                                                <QrCode className="w-5 h-5" /> إنشاء
                                                            </button>
                                                        )}
                                                        {product.qrcode && (
                                                            <button
                                                                onClick={() => setQrProduct(product)}
                                                                title="عرض QR Code"
                                                                className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm"
                                                            >
                                                                <QrCode className="w-5 h-5" /> QR
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setShowCreate(false); startEdit(product); }}
                                                            className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                            <Pencil className="w-5 h-5" /> تعديل
                                                        </button>
                                                        <DeleteModal
                                                            onConfirm={() => deleteProduct(product.id)}
                                                            trigger={
                                                                <button className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                                    <Trash2 className="w-5 h-5" /> حذف
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
                            <div className="flex flex-col gap-5 lg:hidden">
                                {paginatedProducts.map(product => {
                                    const hasPrice = product.selling_type === 'unit_priced' && product.product_price;
                                    const hasBottle = !!product.product_price?.full_bottle_regular;
                                    const lowStock = Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0;

                                    return (
                                        <div key={product.id} className="rounded-[26px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 overflow-hidden shadow-sm">

                                            {/* رأس الكارت */}
                                            <div className="px-6 py-5 bg-slate-100/90 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl leading-tight">{product.name}</span>
                                                    {product.qrcode && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-[8px] bg-violet-500/15 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                            <QrCode className="w-4 h-4" /> QR
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap mt-2">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-200">{product.category.name}</span>
                                                    {product.selling_type === 'tier_based' && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 border border-primary/25">تير {product.price_tier?.name}</span>
                                                    )}
                                                    {product.category.is_operational && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">تشغيلي</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* بيانات */}
                                            <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700/60 px-6">

                                                {hasPrice && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-black text-slate-700 dark:text-slate-300">مدى السعر</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-lg">{fmt(product.product_price!.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-lg">{fmt(product.product_price!.price_per_unit_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {hasBottle && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-black text-slate-700 dark:text-slate-300">سعر العبوة</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-lg">{fmt(product.product_price!.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-lg">{fmt(product.product_price!.full_bottle_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-300">المخزون</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        {lowStock ? (
                                                            <span className="inline-flex items-center gap-1.5 font-black px-3 py-1 rounded-[10px] bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-lg">
                                                                ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-xl text-slate-900 dark:text-white">{fmt(product.stock)} <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-300">الحد الأدنى</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="font-black text-lg text-slate-800 dark:text-slate-200">{fmt(product.min_stock)}</span>
                                                        <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* الإجراءات باللمس */}
                                            <div className="flex items-center gap-3 px-6 py-4 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                                {!product.qrcode && (
                                                    <button
                                                        onClick={() => handleGenerate(product)}
                                                        className="flex items-center justify-center gap-2 h-13 px-5 rounded-[18px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm"
                                                    >
                                                        <QrCode className="w-5 h-5" /> إنشاء
                                                    </button>
                                                )}
                                                {product.qrcode && (
                                                    <button
                                                        onClick={() => setQrProduct(product)}
                                                        className="flex items-center justify-center gap-2 h-13 px-5 rounded-[18px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm"
                                                    >
                                                        <QrCode className="w-5 h-5" /> QR
                                                    </button>
                                                )}
                                                <button onClick={() => { setShowCreate(false); startEdit(product); }}
                                                    className="flex-1 flex items-center justify-center gap-2 h-13 rounded-[18px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                    <Pencil className="w-5 h-5" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => deleteProduct(product.id)}
                                                    wrapperClassName="flex-1"
                                                    trigger={
                                                        <button className="w-full flex items-center justify-center gap-2 h-13 rounded-[18px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                            <Trash2 className="w-5 h-5" /> حذف
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
                </SpatialCard>


            </div>

            {/* QR Modal */}
            {qrProduct && (
                <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />
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
        </AppShell>
    );
}
