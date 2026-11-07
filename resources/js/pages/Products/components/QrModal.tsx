import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import {
    Printer, RefreshCw, X, RotateCcw, AlertTriangle, Check, SlidersHorizontal, Eye, ChevronRight, ChevronLeft, QrCode
} from 'lucide-react';
import { Product } from '../types';
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

export function QrModal({ product, productsList, onClose }: QrModalProps) {
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
                            <h3 className="font-black text-slate-900 dark:text-white text-base">
                                {isBulk ? 'طباعة جماعية لملصقات الباركود والـ QR' : 'طباعة ملصق الباركود والـ QR'}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">
                                    {isBulk ? `طباعة دفعة واحدة لـ ${items.length} منتج في نتائج البحث` : activeProduct.name}
                                </span>
                                {isBulk ? (
                                    <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                                        {items.length} عنصر
                                    </span>
                                ) : (
                                    activeProduct.qrcode && (
                                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {activeProduct.qrcode}
                                        </span>
                                    )
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
                                <div className="text-[11px] font-black text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between w-full">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {isBulk ? `معاينة نموذجية (${previewIndex + 1} من ${items.length})` : 'معاينة الملصق المباشرة'}
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

                                {/* شريط التنقل بين المنتجات لمعاينة أي منتج في حالة الطباعة الجماعية */}
                                {isBulk && items.length > 1 && (
                                    <div className="flex items-center justify-between w-full px-1 mb-2.5 bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-[12px] border border-slate-200 dark:border-slate-700">
                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate max-w-[150px]" title={activeProduct.name}>
                                            {activeProduct.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex(prev => (prev > 0 ? prev - 1 : items.length - 1))}
                                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white text-[10px] font-black cursor-pointer border border-slate-200 dark:border-slate-600 transition-all active:scale-95"
                                                title="معاينة المنتج السابق"
                                            >
                                                السابق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex(Math.floor(Math.random() * items.length))}
                                                className="px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-black cursor-pointer border border-primary/20 transition-all active:scale-95"
                                                title="اختيار منتج عشوائي للمعاينة"
                                            >
                                                عشوائي 🎲
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex(prev => (prev < items.length - 1 ? prev + 1 : 0))}
                                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white text-[10px] font-black cursor-pointer border border-slate-200 dark:border-slate-600 transition-all active:scale-95"
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

                            {/* حجم خط عنوان المنتج (مفيد جداً للعناوين الطويلة) */}
                            {showName && (
                                <div className="p-3 rounded-[20px] bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                                                حجم خط عنوان المنتج:
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
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
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-600"
                                                title="تصغير الخط للعناوين الطويلة"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-black text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[54px] text-center shadow-xs">
                                                {activeTitleFontSizePt} pt
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = Math.min(16, Math.round((activeTitleFontSizePt + 0.5) * 10) / 10);
                                                    setTitleFontSizeCustom(next);
                                                    localStorage.setItem('label_printer_title_font_size', String(next));
                                                }}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-600"
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
                                                    className="text-[11px] font-bold text-primary hover:underline px-1.5 cursor-pointer"
                                                >
                                                    تلقائي
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* أزرار سريعة للأحجام الشائعة */}
                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">أحجام سريعة:</span>
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
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                                        activeTitleFontSizePt === opt.val
                                                            ? 'bg-primary text-white border-primary shadow-xs'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
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
                                <div className="p-3 rounded-[20px] bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                                                حجم رمز الـ QR:
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
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
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-600"
                                                title="تصغير"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-black text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[54px] text-center shadow-xs">
                                                {activeQrSizeMm} مم
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = Math.min(30, Math.round((activeQrSizeMm + 1) * 10) / 10);
                                                    setQrSizeCustom(next);
                                                    localStorage.setItem('label_printer_qr_size', String(next));
                                                }}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-600"
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
                                                    className="text-[11px] font-bold text-primary hover:underline px-1.5 cursor-pointer"
                                                >
                                                    تلقائي
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* أزرار سريعة لأحجام الـ QR */}
                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">أحجام شائعة:</span>
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
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                                        activeQrSizeMm === opt.val
                                                            ? 'bg-primary text-white border-primary shadow-xs'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
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
                            <div className="p-3 rounded-[20px] bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">إزاحة الطباعة (للتوسيط الدقيق بالمليمتر):</span>
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
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95 cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-[11px] min-w-[36px] text-center">
                                                {offsetY > 0 ? `+${offsetY}` : offsetY}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetY(0.5)}
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95 cursor-pointer"
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
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95 cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono font-bold text-[11px] min-w-[36px] text-center">
                                                {offsetX > 0 ? `+${offsetX}` : offsetX}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateOffsetX(1)}
                                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-600 flex items-center justify-center font-black text-xs hover:bg-slate-200 active:scale-95 cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* العمود 2 (اليسار في RTL): أدوات الضبط والإعدادات */}
                        <div className="md:col-span-7 flex flex-col gap-4">

                            {/* 0. اختيار طابعة الباركود والملصقات */}
                            <div className="p-3.5 rounded-[18px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>طابعة الملصقات والباركود:</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => loadPrinters(false)}
                                        disabled={loadingPrinters}
                                        className="text-[11px] font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                        title="إعادة فحص طابعات الويندوز"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loadingPrinters ? 'animate-spin text-primary' : ''}`} />
                                        <span>{loadingPrinters ? 'جاري الفحص...' : 'تحديث الطابعات'}</span>
                                    </button>
                                </div>
                                <select
                                    value={selectedPrinter}
                                    onChange={e => handleSelectPrinter(e.target.value)}
                                    className="w-full h-10 px-3 rounded-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary shadow-xs cursor-pointer"
                                >
                                    {printersList.length > 0 ? (
                                        printersList.map(p => {
                                            const isRecommended = /365|235|barcode|label|tsc|zebra|xprinter\s+xp-[23]/i.test(p.name);
                                            return (
                                                <option key={p.name} value={p.name}>
                                                    {p.name} {isRecommended ? '⭐ (موصى بها للباركود)' : ''}
                                                </option>
                                            );
                                        })
                                    ) : (
                                        <option value={selectedPrinter || 'Xprinter XP-365B'}>
                                            {selectedPrinter || 'Xprinter XP-365B'}
                                        </option>
                                    )}
                                </select>
                                <div className="mt-2 flex items-center justify-between text-[10px]">
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        طباعة مباشرة صامتة (TSPL Direct)
                                    </span>
                                    <span className="text-slate-400 font-mono">
                                        {printersList.length > 0 ? `${printersList.length} طابعات متوفرة` : 'طابعة افتراضية'}
                                    </span>
                                </div>
                            </div>

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

                                {/* اختيار قالب Stock المسجل في الطابعة */}
                                {stockForms.length > 0 && (
                                    <div className="mb-2.5 p-2 rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mt-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                قالب ورق الطابعة بالويندوز (Stock):
                                            </span>
                                            <span className="text-[9px] font-mono text-slate-400">Seagull Presets</span>
                                        </div>
                                        <select
                                            value={selectedStock}
                                            onChange={e => {
                                                const val = e.target.value;
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
                                            className="w-full px-2.5 py-1.5 rounded-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                                        >
                                            <option value="">-- اختيار قالب Stock من الطابعة (مثل XP-365-BIG) --</option>
                                            {stockForms.map(f => (
                                                <option key={f} value={f}>
                                                    {f}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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



                        </div>
                    </div>
                </div>

                {/* Footer زر الطباعة */}
                <div className="p-4 border-t border-black/5 dark:border-white/8 bg-slate-50/90 dark:bg-slate-800/40 backdrop-blur-sm shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {nodePrintMsg ? (
                            <span className={nodePrintMsg.success ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}>
                                {nodePrintMsg.text}
                            </span>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <Printer className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-[11px] font-bold text-slate-400">الطابعة:</span>
                                <select
                                    value={selectedPrinter}
                                    onChange={e => handleSelectPrinter(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    {printersList.length > 0 ? (
                                        printersList.map(p => (
                                            <option key={p.name} value={p.name}>{p.name}</option>
                                        ))
                                    ) : (
                                        <option value={selectedPrinter || 'Xprinter XP-365B'}>{selectedPrinter || 'Xprinter XP-365B'}</option>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex-1 sm:flex-initial px-4 h-12 rounded-[16px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs active:scale-[0.98] transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="فتح نافذة طباعة المتصفح التقليدية"
                        >
                            <span>{isBulk ? `طباعة المتصفح (${items.length})` : 'طباعة المتصفح'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleNodePrint}
                            disabled={printingNode}
                            className="flex-1 sm:flex-initial px-6 h-12 rounded-[16px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50 border border-emerald-500/30 whitespace-nowrap"
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