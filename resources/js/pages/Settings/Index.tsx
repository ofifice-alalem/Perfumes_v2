import { useState, ChangeEvent, FormEvent, useRef } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import {
  Settings as SettingsIcon, Printer, DollarSign, Users,
  RefreshCw, HardDrive, BookOpen, ChevronLeft, Store,
  FileText, CheckCircle2, Save, Upload, Eye, ArrowRight, Type, QrCode,
  Sliders, Tag, Sparkles, Copy, Check, Barcode as BarcodeIcon,
  Maximize2, RotateCw, Layers
} from 'lucide-react';

const PERFUME_SVG_B64 = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="22" y="18" width="20" height="32" rx="6" fill="#1e293b"/><rect x="26" y="10" width="12" height="10" rx="3" fill="#1e293b"/><rect x="29" y="6" width="6" height="6" rx="2" fill="#475569"/><ellipse cx="32" cy="34" rx="6" ry="8" fill="white" opacity="0.15"/><rect x="28" y="8" width="2" height="4" rx="1" fill="white" opacity="0.4"/></svg>`);

interface SettingsProps {
  settings: {
    store_name?: string;
    store_subname?: string;
    store_details?: string;
    store_logo?: string;
    thank_you_message?: string;
    policy_notes?: string;
    receipt_font_size?: string;
    show_qr_code?: string;
    node_printer_name?: string;
    label_width_mm?: string;
    label_height_mm?: string;
    label_margin_mm?: string;
    label_orientation?: string;
    label_barcode_type?: string;
    label_show_store_name?: string;
    label_show_price?: string;
    label_show_code_text?: string;
    label_font_size?: string;
    label_zoom?: string;
    label_printer_name?: string;
    label_default_tab?: string;
    label_rotation?: string;
    label_qr_size?: string;
    label_title_font_size?: string;
  };
  products?: Array<{
    id: number;
    name: string;
    qrcode: string | null;
    product_price?: {
      price_per_unit_regular?: string;
      full_bottle_regular?: string | null;
    };
  }>;
  flash?: {
    success?: string;
  };
}

const PRESET_LABEL_SIZES = [
  { label: '50 × 25 مم (الأكثر شيوعاً)', w: 50, h: 25 },
  { label: '50 × 30 مم', w: 50, h: 30 },
  { label: '40 × 25 مم', w: 40, h: 25 },
  { label: '58 × 40 مم (رول 58 مم)', w: 58, h: 40 },
  { label: '60 × 40 مم (رول 60 مم)', w: 60, h: 40 },
];

function toEan13(code: string): string {
  const digits = String(code || '').replace(/\D/g, '');
  let base12 = '';
  if (digits.length === 12) {
    base12 = digits;
  } else if (digits.length === 13) {
    base12 = digits.slice(0, 12);
  } else if (digits.length === 10) {
    base12 = '20' + digits;
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

export default function SettingsIndex({ settings, products = [] }: SettingsProps) {
  const { flash } = usePage<{ flash: { success?: string } }>().props;

  // View state: 'grid' | 'receipt' | 'node_receipt' | 'label_printer'
  const [activeTab, setActiveTab] = useState<'grid' | 'receipt' | 'node_receipt' | 'label_printer'>('grid');

  const [previewLogo, setPreviewLogo] = useState<string>(settings.store_logo || '/images/logo-black_white.png');

  // أول منتج متوفر للتجربة
  const firstProd = products[0];
  const initialPrice = firstProd?.product_price?.full_bottle_regular
    ? `${Number(firstProd.product_price.full_bottle_regular).toLocaleString('en-US')} د.ل`
    : firstProd?.product_price?.price_per_unit_regular
    ? `${Number(firstProd.product_price.price_per_unit_regular).toLocaleString('en-US')} د.ل`
    : '145.00 د.ل';

  // Label & Barcode Studio States (Spatial UI + Node Engine)
  const [selectedProductId, setSelectedProductId] = useState<number | string>(firstProd?.id || '');
  const [testValue, setTestValue] = useState<string>(firstProd?.qrcode || '240000669027');
  const [sampleProductName, setSampleProductName] = useState<string>(firstProd?.name || 'عطر تاجوري الخاص 100 مل');
  const [samplePrice, setSamplePrice] = useState<string>(initialPrice);
  const [copiedValue, setCopiedValue] = useState<boolean>(false);
  const labelPrintRef = useRef<HTMLDivElement>(null);

  const [labelTab, setLabelTab] = useState<'ean13' | 'serial' | 'classic'>(
    (settings.label_default_tab as any) || 'ean13'
  );
  const [labelOffsetX, setLabelOffsetX] = useState<number>(0);
  const [labelOffsetY, setLabelOffsetY] = useState<number>(1);
  const [labelCopies, setLabelCopies] = useState<number>(1);
  const [labelQrSizeCustom, setLabelQrSizeCustom] = useState<number | null>(null);
  const [selectedLabelPrinter, setSelectedLabelPrinter] = useState<string>(
    settings.label_printer_name || settings.node_printer_name || 'XP-365B'
  );
  const [printingNodeLabel, setPrintingNodeLabel] = useState<boolean>(false);
  const [nodeLabelPrintStatus, setNodeLabelPrintStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Node Thermal Printer Engine States
  const [nodePrinters, setNodePrinters] = useState<Array<{ name: string; driver: string; port: string; status: string; forms?: string[] }>>([]);
  const [loadingPrinters, setLoadingPrinters] = useState<boolean>(false);
  const [selectedNodePrinter, setSelectedNodePrinter] = useState<string>(settings.node_printer_name || 'XP-80');
  const [nodePreviewImg, setNodePreviewImg] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [printingNode, setPrintingNode] = useState<boolean>(false);
  const [nodePrintStatus, setNodePrintStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string>('');

  const fetchNodePrinters = async () => {
    setLoadingPrinters(true);
    try {
      const res = await fetch('/settings/node-printer/printers');
      const resData = await res.json();
      if (resData.success && resData.printers) {
        setNodePrinters(resData.printers);
      }
    } catch (e) {
      console.error('Error fetching printers:', e);
    } finally {
      setLoadingPrinters(false);
    }
  };

  const fetchNodePreview = async (invId?: string) => {
    setLoadingPreview(true);
    try {
      const idToUse = invId !== undefined ? invId : previewInvoiceId;
      const res = await fetch('/settings/node-printer/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({ multi: true, invoice_id: idToUse || null }),
      });
      const resData = await res.json();
      if (resData.success && resData.preview_src) {
        setNodePreviewImg(resData.preview_src);
      }
    } catch (e) {
      console.error('Error fetching node preview:', e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleNodePrint = async () => {
    setPrintingNode(true);
    setNodePrintStatus(null);
    try {
      const res = await fetch('/settings/node-printer/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          multi: true,
          printer_name: selectedNodePrinter,
          invoice_id: previewInvoiceId || null,
          demo: !previewInvoiceId
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setNodePrintStatus({ success: true, message: resData.message });
      } else {
        setNodePrintStatus({ success: false, message: resData.message || 'فشلت الطباعة المباشرة' });
      }
    } catch (e: any) {
      setNodePrintStatus({ success: false, message: e?.message || 'تعذر الاتصال بـ Node.js Printer Engine' });
    } finally {
      setPrintingNode(false);
    }
  };

  const handleNodeLabelPrint = async () => {
    setPrintingNodeLabel(true);
    setNodeLabelPrintStatus(null);
    try {
      const res = await fetch('/settings/node-printer/print-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          printer_name: data.label_printer_name || selectedLabelPrinter,
          width_mm: Number(data.label_width_mm) || 50,
          height_mm: Number(data.label_height_mm) || 25,
          rotation: Number(data.label_rotation || 0),
          offset_x: Number(labelOffsetX),
          offset_y: Number(labelOffsetY),
          tab: labelTab,
          product_name: sampleProductName,
          price: samplePrice,
          code: testValue,
          show_name: data.label_show_store_name === '1',
          show_price: data.label_show_price === '1',
          show_code_text: data.label_show_code_text === '1',
          qr_size: Number(data.label_qr_size) || 0,
          title_font_size: Number(data.label_title_font_size) || 0,
          copies: labelCopies,
          protocol: 'tspl',
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setNodeLabelPrintStatus({ success: true, message: resData.message || 'تمت الطباعة بنجاح عبر محرك Node!' });
      } else {
        setNodeLabelPrintStatus({ success: false, message: resData.message || 'تعذر إرسال الملصق إلى الطابعة' });
      }
    } catch (e: any) {
      setNodeLabelPrintStatus({ success: false, message: e?.message || 'تعذر الاتصال بمحرك الطباعة الحرارية' });
    } finally {
      setPrintingNodeLabel(false);
    }
  };

  const { data, setData, post, processing, errors } = useForm({
    store_name: settings.store_name || '',
    store_subname: settings.store_subname || '',
    store_details: settings.store_details || '',
    thank_you_message: settings.thank_you_message || '',
    policy_notes: settings.policy_notes || '',
    receipt_font_size: settings.receipt_font_size || '10',
    show_qr_code: settings.show_qr_code ?? '1',
    node_printer_name: settings.node_printer_name || 'XP-80',
    label_printer_name: settings.label_printer_name || 'XP-365B',
    label_default_tab: settings.label_default_tab || 'ean13',
    label_width_mm: settings.label_width_mm || '50',
    label_height_mm: settings.label_height_mm || '25',
    label_margin_mm: settings.label_margin_mm || '0.5',
    label_orientation: settings.label_orientation || 'landscape',
    label_rotation: settings.label_rotation || '0',
    label_barcode_type: (settings.label_barcode_type as 'qr_2d' | 'qr_3d' | 'imei' | 'serial') || 'qr_2d',
    label_show_store_name: settings.label_show_store_name ?? '1',
    label_show_price: settings.label_show_price ?? '1',
    label_show_code_text: settings.label_show_code_text ?? '1',
    label_font_size: settings.label_font_size || '11',
    label_zoom: settings.label_zoom || '125',
    label_qr_size: settings.label_qr_size || '',
    label_title_font_size: settings.label_title_font_size || '',
    store_logo_file: null as File | null,
  });

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setData('store_logo_file', file);
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    post('/settings', {
      forceFormData: true,
      preserveScroll: true,
    });
  };

  const hasNoText = data.label_show_store_name === '0' && data.label_show_price === '0' && data.label_show_code_text === '0';
  const hasOnlyCode = data.label_show_store_name === '0' && data.label_show_price === '0' && data.label_show_code_text === '1';

  const handleTestLabelPrint = () => {
    const widthMm = Number(data.label_width_mm) || 76.2;
    const heightMm = Number(data.label_height_mm) || 101.6;
    const marginMm = Number(data.label_margin_mm) || 0.5;
    const isQr = data.label_barcode_type.startsWith('qr');
    const zoomPct = Number(data.label_zoom || '100');
    const rotDeg = Number(data.label_rotation || '0');

    const win = window.open('', '_blank', `width=${Math.max(widthMm * 6, 500)},height=${Math.max(heightMm * 6, 400)}`);
    if (!win) return;

    const labelContent = labelPrintRef.current ? labelPrintRef.current.innerHTML : '';

    // Calculate proportional dimensions dynamically based on label size
    const availableHeightMm = hasNoText ? (heightMm * 0.88) : hasOnlyCode ? (heightMm * 0.75) : (heightMm * 0.60);
    const qrPrintSizeMm = Math.min(widthMm * 0.88, availableHeightMm) * (zoomPct / 100);
    const barPrintHeightMm = availableHeightMm * (zoomPct / 100);

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>ملصق - ${testValue}</title>
        <style>
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0mm !important;
          }
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            max-width: ${widthMm}mm !important;
            max-height: ${heightMm}mm !important;
            background: #fff;
            overflow: hidden !important;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            direction: rtl;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .print-label {
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            max-width: ${widthMm}mm !important;
            max-height: ${heightMm}mm !important;
            padding: ${marginMm}mm !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: ${hasNoText ? 'center' : 'space-around'};
            box-sizing: border-box;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            ${rotDeg !== 0 ? `transform: rotate(${rotDeg}deg); transform-origin: center center;` : ''}
          }
          .store-title {
            font-size: ${Math.max(8, Math.min(16, Number(data.label_font_size) + 2))}pt;
            font-weight: 800;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            line-height: 1.1;
          }
          .price-tag {
            font-size: ${Math.max(9, Math.min(18, Number(data.label_font_size) + 4))}pt;
            font-weight: 900;
            color: #000;
            line-height: 1.1;
          }
          .code-text {
            font-family: monospace;
            font-size: ${Math.max(8, Math.min(14, Number(data.label_font_size) + 1))}pt;
            font-weight: 800;
            letter-spacing: 2px;
            color: #000;
            line-height: 1.1;
            white-space: nowrap;
          }
          .graphic-container {
            width: 100%;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            max-height: ${availableHeightMm}mm !important;
          }
          .graphic-container svg {
            width: ${isQr ? `${qrPrintSizeMm}mm` : '96%'} !important;
            height: ${isQr ? `${qrPrintSizeMm}mm` : `${barPrintHeightMm}mm`} !important;
            max-width: 98% !important;
            max-height: ${availableHeightMm}mm !important;
            display: block;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="print-label">
          ${labelContent}
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.close();
          };
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const labelPresets = [
    { id: '3x4in', label: '76.2 × 101.6 مم (3.00 × 4.00 in)', desc: '⭐ المقاس المستقر لطابعتك بدون فصل (taqniya-xp-235B)', width: '76.2', height: '101.6', orientation: 'landscape' },
    { id: '3x2in', label: '76.2 × 50.8 مم (3.00 × 2.00 in)', desc: 'مقاس 3 بوصة متوسط', width: '76.2', height: '50.8', orientation: 'landscape' },
    { id: '62.5x40', label: '62.5 × 40 مم (2.46 × 1.58 in)', desc: 'مقاس 2.5 بوصة مدمج', width: '62.5', height: '40', orientation: 'landscape' },
    { id: '50x30', label: '50 × 30 مم (1.97 × 1.18 in)', desc: 'مقاس 2 بوصة قياسي', width: '50', height: '30', orientation: 'landscape' },
    { id: '50x25', label: '50 × 25 مم (1.97 × 0.98 in)', desc: 'ملصقات العطور والزجاجات المدمجة', width: '50', height: '25', orientation: 'landscape' },
  ];

  const barcodeTypes = [
    {
      id: 'qr_2d',
      name: 'QR Code (2D)',
      desc: 'رمز استجابة سريعة 2D كلاسيكي عالي الدقة وسهل المسح بكاميرا الهاتف والماسح الضوئي',
      icon: <QrCode className="w-5 h-5" />,
      badge: '2D Matrix',
    },
    {
      id: 'qr_3d',
      name: 'QR Code (3D / Styled)',
      desc: 'رمز QR مجسم عصري مع شعار عطور أنيق في المركز مع الحفاظ على أعلى دقة قراءة (Error Correction Level H)',
      icon: <Sparkles className="w-5 h-5" />,
      badge: 'Luxury 3D',
    },
    {
      id: 'imei',
      name: 'IMEI Barcode',
      desc: 'باركود شريطي بنمط IMEI / EAN-13 مع إمكانية مسحه السريع بالماسحات الليزرية اليدوية',
      icon: <BarcodeIcon className="w-5 h-5" />,
      badge: 'IMEI / EAN',
    },
    {
      id: 'serial',
      name: 'Serial Number',
      desc: 'باركود تسلسلي شريطي قياسي Code-128 عالي التوافق مع أنظمة الجرد والتوزيع',
      icon: <Tag className="w-5 h-5" />,
      badge: 'Code-128',
    },
  ];

  // Modular Cards List matching Reports design
  const settingCards = [
    {
      id: 'receipt',
      icon: <Printer className="w-8 h-8" />,
      label: 'إعدادات الفاتورة الحرارية وترويسة المحل',
      desc: 'تخصيص الشعار، حجم الخط، إظهار/إخفاء الـ QR Code، اسم المحل، العناوين، ورسائل الشكر والسياسات',
      action: () => setActiveTab('receipt'),
      badge: 'تخصيص الفاتورة',
      active: true,
    },
    {
      id: 'label-printer',
      icon: <QrCode className="w-8 h-8 text-primary" />,
      label: 'إعدادات طباعة ملصقات الباركود والـ QR Code',
      desc: 'تخصيص أبعاد ورق وطابعات الباركود، كشف طابعات الويندوز عبر Node، المعاينة الحية بخط تاجوال، والطباعة الصامتة المباشرة (TSPL).',
      action: () => {
        setActiveTab('label_printer');
        fetchNodePrinters();
      },
      badge: 'Node RAW Studio',
      active: true,
    },
    {
      id: 'node-receipt',
      icon: <Printer className="w-8 h-8 text-emerald-500" />,
      label: 'إعدادات الفواتير الحرارية (Node.js Raw Engine)',
      desc: 'كشف طابعات الويندوز الموصولة (Win32 RAW)، المعاينة عالية الدقة عبر محرك Node، والطباعة الحرارية المباشرة السريعة.',
      action: () => {
        setActiveTab('node_receipt');
        fetchNodePreview();
        fetchNodePrinters();
      },
      badge: 'Node.js RAW Engine',
      active: true,
    },
    {
      id: 'payment-methods',
      icon: <DollarSign className="w-8 h-8" />,
      label: 'وسائل الدفع والحسابات',
      desc: 'إدارة وتفعيل وسائل الدفع النقدية والبطاقات والتحويلات المالية المتاحة بالمنظومة',
      href: '/payment-methods',
      badge: 'إدارة الدفع',
    },
    {
      id: 'users',
      icon: <Users className="w-8 h-8" />,
      label: 'إدارة المستخدمين والصلاحيات',
      desc: 'إضافة وتعديل حسابات الأدمن، البائعين، وأمناء الصندوق مع تحديد أدوار وصلاحيات الوصول',
      href: '/users',
      badge: 'المستخدمون',
    },
    {
      id: 'periods',
      icon: <RefreshCw className="w-8 h-8" />,
      label: 'الإقفال والمطابقة المحاسبية',
      desc: 'إدارة الفترات المحاسبية، تدوير الأرصدة، وإقفال اليومية ومطابقة المخزون',
      href: '/periods',
      badge: 'الجرد والإقفال',
    },
    {
      id: 'backups',
      icon: <HardDrive className="w-8 h-8" />,
      label: 'النسخ الاحتياطية والأرشيف',
      desc: 'إنشاء واسترجاع النسخ الاحتياطية لقواعد البيانات والمستندات لحماية البيانات',
      href: '/backups',
      badge: 'النسخ الاحتياطي',
    },
    {
      id: 'policy',
      icon: <BookOpen className="w-8 h-8" />,
      label: 'دليل وسياسات النظام الرسمية',
      desc: 'المرجع الشامل لقواعد استخدام منظومة العطور، شروط الجرد، والضوابط المحاسبية',
      href: '/policy',
      badge: 'الدليل الرسمي',
    },
  ];

  return (
    <AppShell pageTitle="إعدادات النظام">
      <div className="flex flex-col gap-8 pb-32 lg:pb-12 w-full max-w-7xl mx-auto dir-rtl">

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
              <SettingsIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                لوحة إعدادات النظام وتخصيص الفواتير
              </h1>
              <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                إدارة كاملة لهوية المحل، الفاتورة الحرارية، الـ QR Code، حجم الخط، وسائل الدفع، والمستخدمين
              </p>
            </div>
          </div>

          {activeTab === 'receipt' && (
            <button
              onClick={() => setActiveTab('grid')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-all shrink-0 shadow-sm"
            >
              <ArrowRight className="w-5 h-5" />
              العودة لكاردات الإعدادات
            </button>
          )}
        </div>

        {/* Flash Success Message */}
        {flash?.success && (
          <div className="p-5 rounded-[22px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <span className="font-black text-base">{flash.success}</span>
          </div>
        )}

        {/* ─── GRID VIEW (Modular Cards Layout like Reports) ─── */}
        {activeTab === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingCards.map((card) => {
              if (card.href) {
                return (
                  <Link
                    key={card.id}
                    href={card.href}
                    className="group p-7 rounded-[28px] bg-slate-100/90 dark:bg-slate-800/60 hover:bg-slate-200/90 dark:hover:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-2xl flex flex-col justify-between gap-6 cursor-pointer active:scale-98 touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="w-16 h-16 rounded-[22px] bg-primary/15 border-2 border-primary/30 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md">
                        {card.icon}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {card.badge}
                        </span>
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                          <ChevronLeft className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                        {card.label}
                      </h3>
                      <p className="text-base font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={card.id}
                  onClick={card.action}
                  className="group p-7 rounded-[28px] bg-gradient-to-br from-primary/10 via-slate-100 to-slate-100 dark:from-primary/20 dark:via-slate-800/80 dark:to-slate-800/60 hover:bg-slate-200/90 dark:hover:bg-slate-800/90 border-2 border-primary/30 dark:border-primary/40 hover:border-primary transition-all duration-300 shadow-md hover:shadow-2xl flex flex-col justify-between gap-6 cursor-pointer active:scale-98 touch-manipulation relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-16 h-16 rounded-[22px] bg-primary text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                      {card.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-primary text-white shadow-sm">
                        {card.badge}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center transition-colors shadow-md">
                        <ChevronLeft className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                      {card.label}
                    </h3>
                    <p className="text-base font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── RECEIPT SETTINGS FORM EDITOR ─── */}
        {activeTab === 'receipt' && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in">

            {/* Form Controls Column */}
            <div className="lg:col-span-8 space-y-6">

              {/* Store Header & Identity */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">ترويسة وهوية الفاتورة الحرارية</h2>
                      <p className="text-sm font-bold text-slate-400 dark:text-white/50">تظهر في أعلى كل فاتورة مطبوعة</p>
                    </div>
                  </div>

                  <a
                    href="/thermal-receipt"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-black text-xs hover:bg-primary/20 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    فتح الفاتورة الحرارية
                  </a>
                </div>

                {/* Logo Upload with Dedicated Receipt Directory Info */}
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    شعار المحل الحراري (Receipt Logo)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    <div className="w-24 h-24 rounded-2xl bg-white p-2 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img src={previewLogo} alt="معاينة الشعار" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 w-full">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                        <Upload className="w-4 h-4" />
                        رفع صورة شعار جديدة
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs font-bold text-slate-500 dark:text-white/60">
                        📁 يتم تفريغ وحفظ الشعار بمجلد مخصص للفواتير: <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">public/images/receipt/</code>
                      </span>
                      {errors.store_logo_file && (
                        <span className="text-xs font-black text-rose-500">{errors.store_logo_file}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code Toggle & Font Size Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-black/5 dark:border-white/8">

                  {/* QR Code Toggle */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-primary" />
                      إظهار رمز QR Code بالفاتورة
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setData('show_qr_code', '1')}
                        className={`px-4 py-3 rounded-xl font-black text-sm border transition-all ${
                          data.show_qr_code === '1'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                            : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-emerald-500/40'
                        }`}
                      >
                        تفعيل (إظهار)
                      </button>
                      <button
                        type="button"
                        onClick={() => setData('show_qr_code', '0')}
                        className={`px-4 py-3 rounded-xl font-black text-sm border transition-all ${
                          data.show_qr_code === '0'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                            : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-rose-500/40'
                        }`}
                      >
                        إيقاف (إخفاء)
                      </button>
                    </div>
                  </div>

                  {/* Font Size Selector Control */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90 flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary" />
                      حجم الخط الرئيسي (Font Size)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { size: '9', label: '9px' },
                        { size: '10', label: '10px' },
                        { size: '11', label: '11px' },
                        { size: '12', label: '12px' },
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.size}
                          onClick={() => setData('receipt_font_size', opt.size)}
                          className={`px-3 py-3 rounded-xl font-black text-xs border transition-all ${
                            data.receipt_font_size === opt.size
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                              : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-primary/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Store Name & Subname */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                      اسم المحل الرئيسي (Store Name)
                    </label>
                    <input
                      type="text"
                      value={data.store_name}
                      onChange={e => setData('store_name', e.target.value)}
                      placeholder="مثال: تاجوري للعطور الفاخرة"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    {errors.store_name && <span className="text-xs font-black text-rose-500">{errors.store_name}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                      الاسم الإنجليزي / الفرعي (Subname)
                    </label>
                    <input
                      type="text"
                      value={data.store_subname}
                      onChange={e => setData('store_subname', e.target.value)}
                      placeholder="مثال: TAJORI PERFUMES & ESSENCES"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    {errors.store_subname && <span className="text-xs font-black text-rose-500">{errors.store_subname}</span>}
                  </div>
                </div>

                {/* Store Details */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    وصف المكان، العنوان وهواتف الاتصال (Store Details & Contact)
                  </label>
                  <textarea
                    rows={3}
                    value={data.store_details}
                    onChange={e => setData('store_details', e.target.value)}
                    placeholder="مثال: طرابلس - شارع الجرابة (مقابل مجمع الذهب) | هاتف: 091-2345678"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                  />
                  {errors.store_details && <span className="text-xs font-black text-rose-500">{errors.store_details}</span>}
                </div>
              </div>

              {/* Footer & Policy Settings */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">تذييل الفاتورة، رسالة الشكر والسياسات</h2>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/50">تظهر بعد QR Code في أسفل الفاتورة</p>
                  </div>
                </div>

                {/* Thank You Message */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    نص الشكر والترحيب بالزبون (Thank You Note)
                  </label>
                  <input
                    type="text"
                    value={data.thank_you_message}
                    onChange={e => setData('thank_you_message', e.target.value)}
                    placeholder="مثال: ✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  {errors.thank_you_message && <span className="text-xs font-black text-rose-500">{errors.thank_you_message}</span>}
                </div>

                {/* Policy & Terms Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    شروط الاستبدال، الإرجاع وتنبيهات السلامة (Policy Notes)
                  </label>
                  <textarea
                    rows={4}
                    value={data.policy_notes}
                    onChange={e => setData('policy_notes', e.target.value)}
                    placeholder="أدخل الشروط والسياسات الخاصة بالمحل..."
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                  />
                  {errors.policy_notes && <span className="text-xs font-black text-rose-500">{errors.policy_notes}</span>}
                </div>
              </div>

              {/* Submit Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  إلغاء والعودة
                </button>

                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-black text-base hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {processing ? 'جاري الحفظ...' : 'حفظ إعدادات الفاتورة'}
                </button>
              </div>
            </div>

            {/* Thermal Receipt Live Preview Box Column */}
            <div className="lg:col-span-4 sticky top-6 space-y-4">
              <div className="rounded-[28px] p-6 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
                    <Eye className="w-5 h-5 text-primary" />
                    <span>معاينة حية للفاتورة</span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600">POS 80mm</span>
                </div>

                {/* Simulated Paper Content with Dynamic Font Size and Real Sample Items */}
                <div
                  className="p-3 rounded-2xl bg-white text-black font-sans border border-slate-300 shadow-inner leading-tight transition-all text-right dir-rtl select-none"
                  style={{ fontSize: `${data.receipt_font_size}px` }}
                >
                  {/* Header */}
                  <div className="text-center pb-2 border-b-2 border-black">
                    {previewLogo && (
                      <div className="flex justify-center mb-1 -mt-1">
                        <img src={previewLogo} alt="شعار" className="h-10 w-auto object-contain max-w-[140px]" />
                      </div>
                    )}
                    <div className="font-black text-[1.4em] leading-tight -mt-1 mb-1">{data.store_name || 'تاجوري للعطور الفاخرة'}</div>
                    {data.store_subname && <div className="text-[0.85em] font-extrabold text-black mb-1 uppercase tracking-wide">{data.store_subname}</div>}
                    <div className="text-[0.82em] text-black font-bold whitespace-pre-line mt-1">
                      {data.store_details || "طرابلس - شارع الجرابة (مقابل مجمع الذهب)\nهاتف: 091-2345678 / 092-8765432"}
                    </div>
                    <div className="inline-block bg-black text-white text-[0.9em] font-black px-2.5 py-0.5 rounded mt-1.5 mb-0.5">
                      فاتورة مبيعات #50621
                    </div>
                  </div>

                  {/* Meta Box (Single line: Cashier right, Date left) */}
                  <div className="border border-black rounded p-1.5 my-1.5 bg-white text-[0.88em] font-bold flex justify-between items-center">
                    <span>الكاشير: <span className="font-extrabold">سليم</span></span>
                    <span dir="ltr" className="font-extrabold">2026-08-18 | 07:38 AM</span>
                  </div>

                  {/* Sample Items Table matching thermal-receipt.blade.php exact layout */}
                  <table className="w-full border-collapse border border-black my-1.5 text-[0.9em]">
                    <thead>
                      <tr className="bg-black text-white font-black text-[0.85em]">
                        <th className="p-1 border border-black text-right w-[58%]">البيان / المنتج</th>
                        <th className="p-1 border border-black text-center w-[25%]">الكمية × السعر</th>
                        <th className="p-1 border border-black text-left w-[17%]">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="font-black">
                      <tr>
                        <td className="p-1 border border-black text-right">سواك</td>
                        <td className="p-1 border border-black text-center" dir="ltr">3 × 2</td>
                        <td className="p-1 border border-black text-left" dir="ltr">6</td>
                      </tr>
                      <tr>
                        <td class="p-1 border border-black text-right">لاكوست وايت (بخ 35)</td>
                        <td className="p-1 border border-black text-center" dir="ltr">2 × 35</td>
                        <td className="p-1 border border-black text-left" dir="ltr">70</td>
                      </tr>
                      <tr>
                        <td className="p-1 border border-black text-right">بوس داسنت (1 ملي)</td>
                        <td className="p-1 border border-black text-center" dir="ltr">10 × 8</td>
                        <td className="p-1 border border-black text-left" dir="ltr">80</td>
                      </tr>
                      <tr>
                        <td className="p-1 border border-black text-right">هيرش لهب (عبوة)</td>
                        <td className="p-1 border border-black text-center" dir="ltr">1 × 440</td>
                        <td className="p-1 border border-black text-left" dir="ltr">440</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border-t-2 border-double border-black my-1"></div>

                  {/* Totals Table */}
                  <div className="space-y-1 text-[0.92em] font-extrabold my-1">
                    <div className="flex justify-between">
                      <span>المجموع الإجمالي:</span>
                      <span><span dir="ltr">596</span> دينار</span>
                    </div>
                    <div className="flex justify-between border-t border-dotted border-black pt-1">
                      <span>المدفوع (نقداً):</span>
                      <span><span dir="ltr">596</span> دينار</span>
                    </div>
                  </div>

                  {/* Grand Total / Due Box */}
                  <div className="border-[1.5px] border-black rounded p-1 my-1 flex justify-between font-black text-[1em]">
                    <span>المتبقي (Due):</span>
                    <span><span dir="ltr">0</span> دينار</span>
                  </div>

                  <div className="border-t border-dashed border-black my-1"></div>

                  {/* QR Code & Footer */}
                  <div className="text-center space-y-1 pt-1">
                    {data.show_qr_code === '1' && (
                      <div className="flex justify-center my-1">
                        <svg className="w-14 h-14" viewBox="0 0 100 100" fill="#000000">
                          <path d="M0 0h30v30H0zM5 5v20h20V5zM10 10h10v10H10zM70 0h30v30H70zM75 5v20h20V5zM80 10h10v10H80zM0 70h30v30H0zM5 75v20h20V5zM10 80h10v10H10zM35 5h10v10H35zM50 5h10v5H50zM40 20h20v10H40zM35 35h10v10H35zM55 35h10v10H75zM35 50h10v10H35zM50 50h15v5H50zM80 50h15v10H80zM35 65h10v10H35zM65 65h10v10H65zM35 80h10v20H35zM50 75h10v10H50zM65 85h25v15H65z"/>
                        </svg>
                      </div>
                    )}

                    <div className="font-black text-[0.95em] pt-0.5">
                      {data.thank_you_message || '✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨'}
                    </div>

                    {data.policy_notes && (
                      <div className="text-[0.78em] font-bold border border-dashed border-black rounded p-1 mt-1 leading-normal whitespace-pre-line text-center">
                        {data.policy_notes}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>

          </form>
        )}

        {/* ─── NODE THERMAL RECEIPT ENGINE EDITOR ─── */}
        {activeTab === 'node_receipt' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setData('node_printer_name', selectedNodePrinter);
              handleSubmit(e);
              setTimeout(() => {
                fetchNodePreview();
              }, 600);
            }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in"
          >
            {/* Control Panel Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Back Button & Header */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all border border-black/5 dark:border-white/10"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>الرجوع بقائمة الإعدادات</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black text-xs border border-emerald-500/20">
                    Standalone Node.js Embedded Engine
                  </span>
                </div>
              </div>

              {/* Status Alert */}
              {nodePrintStatus && (
                <div className={`p-4 rounded-2xl border font-extrabold text-sm flex items-center justify-between gap-3 ${
                  nodePrintStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{nodePrintStatus.message}</span>
                  </div>
                  <button onClick={() => setNodePrintStatus(null)} className="text-xs opacity-70 hover:opacity-100 font-black">إغلاق</button>
                </div>
              )}

              {/* Card 1: Windows Printer Selection */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">طابعة الفواتير الحرارية في الويندوز</h2>
                      <p className="text-sm font-bold text-slate-400 dark:text-white/50">ربط المحرك المباشر بالطابعة المثبتة عبر Win32 RAW Spooler</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchNodePrinters}
                    disabled={loadingPrinters}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 font-black text-xs hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPrinters ? 'animate-spin' : ''}`} />
                    <span>{loadingPrinters ? 'جاري الفحص...' : 'كشف الطابعات'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-200">
                    اختر الطابعة الحرارية المستهدفة (XP-80 / POS-80):
                  </label>
                  
                  {nodePrinters.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {nodePrinters.map((p, idx) => {
                        const isSelected = selectedNodePrinter.toLowerCase() === p.name.toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedNodePrinter(p.name);
                              setData('node_printer_name', p.name);
                            }}
                            className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-black text-base text-slate-900 dark:text-white">{p.name}</span>
                              {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            </div>
                            <div className="text-xs font-bold text-slate-400">
                              <span>المغذي: {p.port || 'USB / Local'}</span> | <span>الحالة: {p.status}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 font-bold text-sm">
                      {loadingPrinters ? 'جاري فحص الطابعات الموصولة بنظام الويندوز...' : 'اضغط على زر "كشف الطابعات" لجلب الطابعات المثبتة تلقائياً.'}
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      أو ادخل اسم الطابعة يدوياً (كما هو معرف في الويندوز):
                    </label>
                    <input
                      type="text"
                      value={selectedNodePrinter}
                      onChange={(e) => {
                        setSelectedNodePrinter(e.target.value);
                        setData('node_printer_name', e.target.value);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="XP-80"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Store Header & Identity */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">ترويسة وهوية الفاتورة الحرارية</h2>
                      <p className="text-sm font-bold text-slate-400 dark:text-white/50">تظهر في أعلى كل فاتورة مطبوعة</p>
                    </div>
                  </div>

                  <a
                    href="/thermal-receipt"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-black text-xs hover:bg-primary/20 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    فتح الفاتورة الحرارية
                  </a>
                </div>

                {/* Logo Upload with Dedicated Receipt Directory Info */}
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    شعار المحل الحراري (Receipt Logo)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    <div className="w-24 h-24 rounded-2xl bg-white p-2 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img src={previewLogo} alt="معاينة الشعار" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 w-full">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                        <Upload className="w-4 h-4" />
                        رفع صورة شعار جديدة
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs font-bold text-slate-500 dark:text-white/60">
                        📁 يتم تفريغ وحفظ الشعار بمجلد مخصص للفواتير: <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">public/images/receipt/</code>
                      </span>
                      {errors.store_logo_file && (
                        <span className="text-xs font-black text-rose-500">{errors.store_logo_file}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code Toggle & Font Size Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-black/5 dark:border-white/8">

                  {/* QR Code Toggle */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-primary" />
                      إظهار رمز QR Code بالفاتورة
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setData('show_qr_code', '1')}
                        className={`px-4 py-3 rounded-xl font-black text-sm border transition-all ${
                          data.show_qr_code === '1'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                            : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-emerald-500/40'
                        }`}
                      >
                        تفعيل (إظهار)
                      </button>
                      <button
                        type="button"
                        onClick={() => setData('show_qr_code', '0')}
                        className={`px-4 py-3 rounded-xl font-black text-sm border transition-all ${
                          data.show_qr_code === '0'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                            : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-rose-500/40'
                        }`}
                      >
                        إيقاف (إخفاء)
                      </button>
                    </div>
                  </div>

                  {/* Font Size Selector Control */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90 flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary" />
                      حجم الخط الرئيسي (Font Size)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { size: '9', label: '9px' },
                        { size: '10', label: '10px' },
                        { size: '11', label: '11px' },
                        { size: '12', label: '12px' },
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.size}
                          onClick={() => setData('receipt_font_size', opt.size)}
                          className={`px-3 py-3 rounded-xl font-black text-xs border transition-all ${
                            data.receipt_font_size === opt.size
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                              : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-primary/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Store Name & Subname */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                      اسم المحل الرئيسي (Store Name)
                    </label>
                    <input
                      type="text"
                      value={data.store_name}
                      onChange={e => setData('store_name', e.target.value)}
                      placeholder="مثال: تاجوري للعطور الفاخرة"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    {errors.store_name && <span className="text-xs font-black text-rose-500">{errors.store_name}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                      الاسم الإنجليزي / الفرعي (Subname)
                    </label>
                    <input
                      type="text"
                      value={data.store_subname}
                      onChange={e => setData('store_subname', e.target.value)}
                      placeholder="مثال: TAJORI PERFUMES & ESSENCES"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    {errors.store_subname && <span className="text-xs font-black text-rose-500">{errors.store_subname}</span>}
                  </div>
                </div>

                {/* Store Details */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    وصف المكان، العنوان وهواتف الاتصال (Store Details & Contact)
                  </label>
                  <textarea
                    rows={3}
                    value={data.store_details}
                    onChange={e => setData('store_details', e.target.value)}
                    placeholder="مثال: طرابلس - شارع الجرابة (مقابل مجمع الذهب) | هاتف: 091-2345678"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                  />
                  {errors.store_details && <span className="text-xs font-black text-rose-500">{errors.store_details}</span>}
                </div>
              </div>

              {/* Card 3: Footer & Policy Settings */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">تذييل الفاتورة، رسالة الشكر والسياسات</h2>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/50">تظهر بعد QR Code في أسفل الفاتورة</p>
                  </div>
                </div>

                {/* Thank You Message */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    نص الشكر والترحيب بالزبون (Thank You Note)
                  </label>
                  <input
                    type="text"
                    value={data.thank_you_message}
                    onChange={e => setData('thank_you_message', e.target.value)}
                    placeholder="مثال: ✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  {errors.thank_you_message && <span className="text-xs font-black text-rose-500">{errors.thank_you_message}</span>}
                </div>

                {/* Policy & Terms Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    شروط الاستبدال، الإرجاع وتنبيهات السلامة (Policy Notes)
                  </label>
                  <textarea
                    rows={4}
                    value={data.policy_notes}
                    onChange={e => setData('policy_notes', e.target.value)}
                    placeholder="أدخل الشروط والسياسات الخاصة بالمحل..."
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                  />
                  {errors.policy_notes && <span className="text-xs font-black text-rose-500">{errors.policy_notes}</span>}
                </div>
              </div>

              {/* Submit Save Settings Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black text-base hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/30 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {processing ? 'جاري الحفظ...' : 'حفظ وتحديث الإعدادات والمعاينة'}
                </button>
              </div>

            </div>

            {/* Live Node Canvas Preview Box Column */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <div className="rounded-[28px] p-6 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
                    <Eye className="w-5 h-5 text-emerald-500" />
                    <span>معاينة محرك Node.js Canvas</span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600">
                    High-Res Monochrome PNG
                  </span>
                </div>

                {/* Live Invoice ID Input */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                  <input
                    type="text"
                    value={previewInvoiceId}
                    onChange={(e) => setPreviewInvoiceId(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchNodePreview(); } }}
                    placeholder="أدخل رقم الفاتورة للمعاينة (مثال: 50621)"
                    className="flex-1 px-3 py-1.5 text-sm font-black bg-transparent border-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => fetchNodePreview()}
                    disabled={loadingPreview}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>معاينة حية</span>
                  </button>
                </div>

                {/* Preview Image Container */}
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center min-h-[380px] shadow-inner">
                  {loadingPreview ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                      <span className="font-black text-sm">جاري رسم وتوليد الفاتورة عبر محرك Node...</span>
                    </div>
                  ) : nodePreviewImg ? (
                    <img
                      src={nodePreviewImg}
                      alt="Node Invoice Canvas Preview"
                      className="w-full max-w-[340px] h-auto object-contain rounded border border-slate-200 shadow-md transition-all"
                    />
                  ) : (
                    <div className="text-center py-12 space-y-3 text-slate-400">
                      <Printer className="w-12 h-12 mx-auto stroke-1" />
                      <p className="font-bold text-sm">اضغط على "تحديث المعاينة" لعرض الفاتورة الحرارية المُولّدة بمحرك Node</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={fetchNodePreview}
                    disabled={loadingPreview}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                    <span>{loadingPreview ? 'جاري التحديث...' : 'تحديث المعاينة (Node Canvas)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNodePrint}
                    disabled={printingNode}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-600 text-white font-black text-base hover:bg-emerald-500 active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/30 disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{printingNode ? 'جاري إرسال أوامر الطباعة المباشرة...' : '⚡ طباعة حرارية فورية (Node RAW Engine)'}</span>
                  </button>
                </div>

              </div>
            </div>

          </form>
        )}

        {/* ─── LABEL & BARCODE PRINTING STUDIO (SPATIAL UI + NODE RAW ENGINE) ─── */}
        {activeTab === 'label_printer' && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className="p-3 rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all border border-black/5 dark:border-white/10 cursor-pointer"
                  title="الرجوع"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    استوديو ملصقات الباركود والـ QR
                    <span className="px-3 py-0.5 rounded-full bg-primary text-white text-xs font-black shadow-sm">
                      Node.js RAW
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-400 dark:text-white/60">
                    تخصيص أبعاد الورق، المعاينة الحية بخط تاجوال، وتحديد الطابعة الافتراضية للطباعة المباشرة الصامتة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{processing ? 'جاري الحفظ...' : 'حفظ كإعدادات افتراضية'}</span>
                </button>
              </div>
            </div>

            {/* Status Alert if printed */}
            {nodeLabelPrintStatus && (
              <div
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  nodeLabelPrintStatus.success
                    ? 'bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-2 border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5 font-black text-sm">
                  {nodeLabelPrintStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-rose-500 font-bold">⚠️</span>
                  )}
                  <span>{nodeLabelPrintStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNodeLabelPrintStatus(null)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Grid: 2 Columns (Preview on right/top, Controls on left/bottom in RTL) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* ══ Column 1: Live Interactive Preview Card (5 cols) ══ */}
              <div className="lg:col-span-5 flex flex-col gap-4">

                {/* قائمة اختيار منتج حقيقي من المنظومة للتجربة والمعاينة الحية */}
                <div className="p-4 rounded-3xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      اختر منتجاً حقيقياً من المنظومة للمعاينة:
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      {products.length} منتجات متاحة
                    </span>
                  </div>
                  <select
                    value={selectedProductId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedProductId(id);
                      const prod = products.find(p => String(p.id) === String(id));
                      if (prod) {
                        setSampleProductName(prod.name);
                        setTestValue(prod.qrcode || '240000669027');
                        const pDisplay = prod.product_price?.full_bottle_regular
                          ? `${Number(prod.product_price.full_bottle_regular).toLocaleString('en-US')} د.ل`
                          : prod.product_price?.price_per_unit_regular
                          ? `${Number(prod.product_price.price_per_unit_regular).toLocaleString('en-US')} د.ل`
                          : '';
                        setSamplePrice(pDisplay);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.qrcode ? `(${p.qrcode})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Simulated Label Sticker Box - متطابق 100% مع صفحة المنتجات Products/Index.tsx */}
                <div className="flex flex-col items-center justify-center p-4 rounded-[24px] bg-slate-100/80 dark:bg-slate-800/40 border-2 border-dashed border-slate-300/80 dark:border-slate-700/80">
                  <div className="text-[11px] font-black text-slate-600 dark:text-slate-300 mb-3 flex items-center justify-between w-full">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      معاينة الملصق المباشرة (مطابقة لصفحة المنتجات)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold border border-primary/20">
                        {data.label_width_mm} × {data.label_height_mm} مم
                      </span>
                      {data.label_rotation !== '0' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/30">
                          {data.label_rotation}°
                        </span>
                      )}
                    </div>
                  </div>

                  {/* الصندوق الأبيض الحقيقي للملصق */}
                  <div
                    ref={labelPrintRef}
                    style={{
                      width: '210px',
                      height: `${Math.max(95, Math.min(160, Math.round(210 * (Number(data.label_height_mm) / Number(data.label_width_mm)))))}px`,
                    }}
                    className="bg-white rounded-[12px] shadow-[0_10px_25px_rgba(0,0,0,0.15)] border border-slate-300/80 p-2 flex flex-col items-center justify-center text-slate-900 font-sans transition-all overflow-hidden select-none relative"
                  >
                    <div
                      style={{
                        transform: `translate(${labelOffsetX * 2}px, ${labelOffsetY * 2}px) ${data.label_rotation !== '0' ? `rotate(${data.label_rotation}deg) ` : ''}`,
                        transformOrigin: 'center center',
                      }}
                      className="w-full h-full flex flex-col items-center justify-center gap-1.5 transition-transform py-1 px-1 font-sans"
                    >
                      {data.label_show_store_name === '1' && (
                        <span className="font-sans font-black text-xs text-slate-900 truncate w-full text-center leading-tight">
                          {sampleProductName}
                        </span>
                      )}

                      {labelTab === 'classic' ? (
                        <div className="flex items-center justify-center w-full gap-3 px-1 overflow-hidden" dir="rtl">
                          {/* جهة اليمين: الكود وتحته السعر */}
                          <div className="flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden font-sans">
                            {data.label_show_code_text === '1' && testValue && (
                              <span className="font-mono text-[11px] font-bold text-slate-700 tracking-wider text-center">
                                {testValue}
                              </span>
                            )}
                            {data.label_show_price === '1' && samplePrice && (
                              <span className="font-sans text-emerald-700 font-black text-sm leading-tight text-center">
                                {samplePrice}
                              </span>
                            )}
                          </div>

                          {/* جهة اليسار: رمز QR متناسق الأبعاد مع الورقة ومقترب من السعر */}
                          <div className="shrink-0 flex items-center justify-center p-0.5">
                            {(() => {
                              const hMm = Number(data.label_height_mm) || 25;
                              const wMm = Number(data.label_width_mm) || 50;
                              const previewBoxH = Math.max(95, Math.min(160, Math.round(210 * (hMm / wMm))));
                              const activeQrMm = Number(data.label_qr_size) || Math.max(8, Math.min(15, Math.round(Math.min((hMm - 5.5) * 0.65, wMm * 0.28) * 10) / 10));
                              const previewQrSize = Math.max(30, Math.min(Math.round(previewBoxH - 16), Math.round(activeQrMm * (210 / wMm))));
                              const logoSize = Math.max(8, Math.round(previewQrSize * 0.22));
                              return (
                                <QRCodeSVG
                                  value={testValue || '240000669027'}
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
                            {labelTab === 'ean13' && (
                              <div className="w-full flex items-center justify-center [&_g:first-of-type_text]:hidden">
                                <Barcode
                                  value={toEan13(testValue || '240000669027')}
                                  format="EAN13"
                                  width={1.3}
                                  height={34}
                                  displayValue={data.label_show_code_text === '1'}
                                  textMargin={1}
                                  fontSize={12}
                                  font="monospace"
                                  margin={0}
                                  lineColor="#000000"
                                />
                              </div>
                            )}

                            {labelTab === 'serial' && (
                              <div className="w-full flex items-center justify-center">
                                <Barcode
                                  value={testValue || '240000669027'}
                                  format="CODE128"
                                  width={1.2}
                                  height={34}
                                  displayValue={data.label_show_code_text === '1'}
                                  textMargin={1}
                                  fontSize={12}
                                  font="monospace"
                                  margin={0}
                                  lineColor="#000000"
                                />
                              </div>
                            )}
                          </div>

                          {data.label_show_price === '1' && samplePrice && (
                            <div className="flex items-center justify-center w-full px-1 text-[11px] font-black leading-none mt-0.5">
                              <span className="font-sans text-emerald-700 font-extrabold">
                                {samplePrice}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Readout Summary Badge */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ناتج قراءة الماسح الضوئي:
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300 tracking-wider">
                    {testValue}
                  </span>
                </div>

                {/* Quick 90deg Rotation Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextRot = data.label_rotation === '0' ? '90' : data.label_rotation === '90' ? '270' : '0';
                    setData('label_rotation', nextRot);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-black text-xs border border-amber-500/30 transition-all cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-amber-600" />
                  <span>🔄 تعديل التدوير (الحالي: {data.label_rotation === '0' ? '0° طبيعي' : `${data.label_rotation}°`}) - اضغط للتدوير</span>
                </button>

                {/* Direct Print Button (Node RAW) */}
                <button
                  type="button"
                  onClick={handleNodeLabelPrint}
                  disabled={printingNodeLabel}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-5 h-5" />
                  <span>{printingNodeLabel ? 'جاري إرسال الملصق للطابعة...' : '⚡ طباعة ملصق تجريبي فوراً (Node RAW)'}</span>
                </button>

              </div>

              {/* ══ Column 2: Controls & Settings Form (7 cols) ══ */}
              <div className="lg:col-span-7 space-y-5">

                {/* 1. اختيار طابعة الملصقات من Node */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-primary" />
                      <h3 className="font-black text-slate-900 dark:text-white text-base">
                        طابعة الملصقات الافتراضية (Node Spooler)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={fetchNodePrinters}
                      disabled={loadingPrinters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingPrinters ? 'animate-spin' : ''}`} />
                      <span>تحديث الطابعات</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    يتم هنا سرد كافة الطابعات الموصلة بالويندوز مباشرة عبر Node.js. اختر طابعة الباركود (مثل Xprinter XP-365B أو Zebra) لتكون الوجهة الافتراضية الصامتة دون الحاجة لفتح نافذة المتصفح.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">اسم الطابعة:</label>
                    <select
                      value={data.label_printer_name}
                      onChange={e => {
                        const newName = e.target.value;
                        setData('label_printer_name', newName);
                        setSelectedLabelPrinter(newName);
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                    >
                      {nodePrinters.length > 0 ? (
                        nodePrinters.map(p => (
                          <option key={p.name} value={p.name}>
                            {p.name} {p.driver ? `(${p.driver})` : ''}
                          </option>
                        ))
                      ) : (
                        <option value={data.label_printer_name || 'XP-365B'}>
                          {data.label_printer_name || 'XP-365B'} (المسجلة حالياً)
                        </option>
                      )}
                    </select>
                  </div>

                  {/* اختيار قالب الورق Stock من تعريف الطابعة في الويندوز */}
                  {(() => {
                    const currentPrinter = nodePrinters.find(p => p.name === data.label_printer_name || p.name === selectedLabelPrinter);
                    const forms = currentPrinter?.forms || [];
                    if (forms.length === 0) return null;
                    return (
                      <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            قالب الورق في الويندوز (Stock Name):
                          </label>
                          <span className="text-[10px] font-mono text-slate-400">Seagull / Windows Stock</span>
                        </div>
                        <select
                          onChange={e => {
                            const val = e.target.value;
                            if (val.includes('BIG') || val.includes('2.36')) {
                              setData('label_width_mm', '58');
                              setData('label_height_mm', '40');
                            } else if (val.includes('XP-365B') || val.includes('1.97')) {
                              setData('label_width_mm', '50');
                              setData('label_height_mm', '30');
                            } else if (val.includes('2 x 4')) {
                              setData('label_width_mm', '50');
                              setData('label_height_mm', '100');
                            }
                          }}
                          className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">-- اختر قالب Stock مسجل في الطابعة لتعبئة الأبعاد تلقائياً --</option>
                          {forms.map(f => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. نوع الترميز والتشفير */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    نوع الترميز وشكل الرمز الافتراضي:
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setLabelTab('ean13');
                        setData('label_default_tab', 'ean13');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                        labelTab === 'ean13'
                          ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      |||| EAN-13 دولي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLabelTab('serial');
                        setData('label_default_tab', 'serial');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                        labelTab === 'serial'
                          ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      ||| Code 128 مباشر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLabelTab('classic');
                        setData('label_default_tab', 'classic');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                        labelTab === 'classic'
                          ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      🔳 QR مربع
                    </button>
                  </div>
                </div>

                {/* 3. مقاس ورقة الملصق (Presets + مخصص) */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    مقاس ورقة الملصق (Label Size):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_LABEL_SIZES.map(s => {
                      const isSelected = Number(data.label_width_mm) === s.w && Number(data.label_height_mm) === s.h;
                      return (
                        <button
                          key={`${s.w}x${s.h}`}
                          type="button"
                          onClick={() => {
                            setData('label_width_mm', String(s.w));
                            setData('label_height_mm', String(s.h));
                          }}
                          className={`py-2.5 px-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* إدخال يدوي للأبعاد */}
                  <div className="mt-3 grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-400">العرض:</span>
                      <input
                        type="number"
                        min="20"
                        max="120"
                        value={data.label_width_mm}
                        onChange={e => setData('label_width_mm', e.target.value)}
                        className="w-full bg-transparent font-black text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-400">مم</span>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-400">الارتفاع:</span>
                      <input
                        type="number"
                        min="15"
                        max="120"
                        value={data.label_height_mm}
                        onChange={e => setData('label_height_mm', e.target.value)}
                        className="w-full bg-transparent font-black text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-400">مم</span>
                    </div>
                  </div>
                </div>

                {/* 4. خيارات الإظهار والإخفاء */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    عناصر الملصق:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={data.label_show_store_name === '1'}
                        onChange={e => setData('label_show_store_name', e.target.checked ? '1' : '0')}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">اسم المنتج / المحل</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={data.label_show_price === '1'}
                        onChange={e => setData('label_show_price', e.target.checked ? '1' : '0')}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">سعر البيع</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={data.label_show_code_text === '1'}
                        onChange={e => setData('label_show_code_text', e.target.checked ? '1' : '0')}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الأرقام أسفل الرمز</span>
                    </label>
                  </div>
                </div>

                {/* 5. حجم رمز الـ QR الافتراضي وحجم خط العنوان */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  {/* حجم رمز الـ QR */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                          حجم رمز الـ QR الافتراضي (Classic QR):
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {!data.label_qr_size ? 'محسوب تلقائياً حسب مقاس الورقة' : 'مقاس يدوي محدد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const current = Number(data.label_qr_size) || 14;
                            const next = Math.max(8, Math.round((current - 1) * 10) / 10);
                            setData('label_qr_size', String(next));
                          }}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[54px] text-center shadow-xs">
                          {data.label_qr_size ? `${data.label_qr_size} مم` : 'تلقائي'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = Number(data.label_qr_size) || 14;
                            const next = Math.min(30, Math.round((current + 1) * 10) / 10);
                            setData('label_qr_size', String(next));
                          }}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          +
                        </button>
                        {data.label_qr_size && (
                          <button
                            type="button"
                            onClick={() => setData('label_qr_size', '')}
                            className="text-[11px] font-bold text-primary hover:underline px-1.5 cursor-pointer"
                          >
                            تلقائي
                          </button>
                        )}
                      </div>
                    </div>

                    {/* أزرار سريعة لأحجام الـ QR */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">أحجام سريعة:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: 'صغير (10 مم)', val: '10' },
                          { label: 'متوسط (14 مم)', val: '14' },
                          { label: 'كبير (18 مم)', val: '18' },
                          { label: 'عريض (22 مم)', val: '22' },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setData('label_qr_size', opt.val)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                              data.label_qr_size === opt.val
                                ? 'bg-primary text-white border-primary shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* حجم خط عنوان المنتج */}
                  <div className="space-y-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                          حجم خط عنوان المنتج الافتراضي:
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {!data.label_title_font_size ? 'محسوب تلقائياً حسب مقاس الورقة' : 'حجم خط ثابت بالنقاط pt'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const current = Number(data.label_title_font_size) || 8;
                            const next = Math.max(4.5, Math.round((current - 0.5) * 10) / 10);
                            setData('label_title_font_size', String(next));
                          }}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[54px] text-center shadow-xs">
                          {data.label_title_font_size ? `${data.label_title_font_size} pt` : 'تلقائي'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = Number(data.label_title_font_size) || 8;
                            const next = Math.min(16, Math.round((current + 0.5) * 10) / 10);
                            setData('label_title_font_size', String(next));
                          }}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          +
                        </button>
                        {data.label_title_font_size && (
                          <button
                            type="button"
                            onClick={() => setData('label_title_font_size', '')}
                            className="text-[11px] font-bold text-primary hover:underline px-1.5 cursor-pointer"
                          >
                            تلقائي
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. إزاحة وتوسيط الطباعة (X و Y) */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      إزاحة الطباعة الدقيقة (Offset بالمليمتر):
                    </span>
                    {(labelOffsetX !== 0 || labelOffsetY !== 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLabelOffsetX(0);
                          setLabelOffsetY(0);
                        }}
                        className="text-[11px] font-black text-red-500 hover:underline cursor-pointer"
                      >
                        تصفير
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">عمودي (Y):</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLabelOffsetY(y => y - 0.5)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-xs min-w-[36px] text-center">
                          {labelOffsetY > 0 ? `+${labelOffsetY}` : labelOffsetY}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLabelOffsetY(y => y + 0.5)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أفقي (X):</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLabelOffsetX(x => x - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-xs min-w-[36px] text-center">
                          {labelOffsetX > 0 ? `+${labelOffsetX}` : labelOffsetX}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLabelOffsetX(x => x + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. عدد النسخ التجريبية */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">عدد النسخ للطباعة التجريبية:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLabelCopies(c => Math.max(1, c - 1))}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-sm"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm px-3">{labelCopies}</span>
                    <button
                      type="button"
                      onClick={() => setLabelCopies(c => Math.min(20, c + 1))}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </form>
        )}

      </div>
    </AppShell>
  );
}
