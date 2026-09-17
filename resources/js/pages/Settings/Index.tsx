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
  };
  flash?: {
    success?: string;
  };
}

export default function SettingsIndex({ settings }: SettingsProps) {
  const { flash } = usePage<{ flash: { success?: string } }>().props;

  // View state: 'grid' | 'receipt' | 'node_receipt' | 'label_printer'
  const [activeTab, setActiveTab] = useState<'grid' | 'receipt' | 'node_receipt' | 'label_printer'>('grid');

  const [previewLogo, setPreviewLogo] = useState<string>(settings.store_logo || '/images/logo-black_white.png');

  // Label & Barcode Studio States
  const [testValue, setTestValue] = useState<string>('240000669027');
  const [sampleProductName, setSampleProductName] = useState<string>('عطر تاجوري الخاص 100 مل');
  const [samplePrice, setSamplePrice] = useState<string>('145.00 د.ل');
  const [copiedValue, setCopiedValue] = useState<boolean>(false);
  const labelPrintRef = useRef<HTMLDivElement>(null);

  // Node Thermal Printer Engine States
  const [nodePrinters, setNodePrinters] = useState<Array<{ name: string; driver: string; port: string; status: string }>>([]);
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

  const { data, setData, post, processing, errors } = useForm({
    store_name: settings.store_name || '',
    store_subname: settings.store_subname || '',
    store_details: settings.store_details || '',
    thank_you_message: settings.thank_you_message || '',
    policy_notes: settings.policy_notes || '',
    receipt_font_size: settings.receipt_font_size || '10',
    show_qr_code: settings.show_qr_code ?? '1',
    node_printer_name: settings.node_printer_name || 'XP-80',
    label_width_mm: settings.label_width_mm || '62.5',
    label_height_mm: settings.label_height_mm || '40',
    label_margin_mm: settings.label_margin_mm || '1',
    label_orientation: settings.label_orientation || 'landscape',
    label_barcode_type: (settings.label_barcode_type as 'qr_2d' | 'qr_3d' | 'imei' | 'serial') || 'qr_2d',
    label_show_store_name: settings.label_show_store_name ?? '0',
    label_show_price: settings.label_show_price ?? '0',
    label_show_code_text: settings.label_show_code_text ?? '0',
    label_font_size: settings.label_font_size || '11',
    label_zoom: settings.label_zoom || '100',
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
    const widthMm = Number(data.label_width_mm) || 62.5;
    const heightMm = Number(data.label_height_mm) || 40;
    const marginMm = Number(data.label_margin_mm) || 1;
    const isQr = data.label_barcode_type.startsWith('qr');
    const zoomPct = Number(data.label_zoom || '100');

    const win = window.open('', '_blank', `width=${Math.max(widthMm * 6, 460)},height=${Math.max(heightMm * 6, 360)}`);
    if (!win) return;

    const labelContent = labelPrintRef.current ? labelPrintRef.current.innerHTML : '';

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>طباعة ملصق - ${testValue}</title>
        <style>
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            margin: 0;
            padding: 0;
            background: #fff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            direction: rtl;
          }
          .print-label {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            padding: ${marginMm}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: ${hasNoText ? 'center' : 'space-between'};
            box-sizing: border-box;
            overflow: hidden;
          }
          .store-title {
            font-size: ${Math.max(7, Math.min(12, Number(data.label_font_size)))}pt;
            font-weight: 800;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            line-height: 1.1;
            margin-bottom: 0.5mm;
          }
          .price-tag {
            font-size: ${Math.max(8, Math.min(13, Number(data.label_font_size) + 1))}pt;
            font-weight: 900;
            color: #000;
            line-height: 1.1;
            margin-top: 0.5mm;
          }
          .code-text {
            font-family: monospace;
            font-size: ${Math.max(7, Math.min(11, Number(data.label_font_size) - 1))}pt;
            font-weight: 800;
            letter-spacing: 2px;
            color: #000;
            line-height: 1;
            white-space: nowrap;
            margin-top: 0.5mm;
          }
          .graphic-container {
            width: 100%;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .graphic-container svg {
            width: ${isQr ? (hasNoText ? `${Math.min(widthMm, heightMm) * 0.95 * (zoomPct / 100)}mm` : `${Math.min(widthMm, heightMm - 10) * 0.90 * (zoomPct / 100)}mm`) : '98%'};
            height: ${isQr ? (hasNoText ? `${Math.min(widthMm, heightMm) * 0.95 * (zoomPct / 100)}mm` : `${Math.min(widthMm, heightMm - 10) * 0.90 * (zoomPct / 100)}mm`) : `${(hasNoText ? heightMm * 0.85 : hasOnlyCode ? heightMm * 0.65 : heightMm * 0.52) * (zoomPct / 100)}mm`};
            max-width: 98% !important;
            max-height: 98% !important;
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
    { id: '62.5x40', label: '62.5 × 40 مم (2.46 × 1.58 in)', desc: 'مقاس طابعتك الحالي (taqniya-xp-235B)', width: '62.5', height: '40', orientation: 'landscape' },
    { id: '50x30', label: '50 × 30 مم (1.97 × 1.18 in)', desc: 'Xprinter XP-235B القياسي', width: '50', height: '30', orientation: 'landscape' },
    { id: '50x25', label: '50 × 25 مم (1.97 × 0.98 in)', desc: 'ملصقات مدمجة', width: '50', height: '25', orientation: 'landscape' },
    { id: '40x30', label: '40 × 30 مم (1.57 × 1.18 in)', desc: 'ملصقات متوسطة', width: '40', height: '30', orientation: 'landscape' },
    { id: '40x25', label: '40 × 25 مم (1.57 × 0.98 in)', desc: 'ملصقات العطور والعينات', width: '40', height: '25', orientation: 'landscape' },
    { id: '75x50', label: '75 × 50 مم (2.95 × 1.97 in)', desc: 'مقاس كبير للشحنات والكراتين', width: '75', height: '50', orientation: 'landscape' },
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
      desc: 'تخصيص أبعاد ورق وطابعات الباركود والملصقات (50x30mm)، المعاينة الحية الفورية، واختبار قراءة الباركود والـ QR (2D/3D/IMEI/Serial).',
      action: () => setActiveTab('label_printer'),
      badge: 'Label & Barcode Studio',
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

        {/* ─── LABEL & BARCODE PRINTING STUDIO ─── */}
        {activeTab === 'label_printer' && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in">
            {/* Controls Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Back & Title Header */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all border border-black/5 dark:border-white/10 cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>الرجوع لقائمة الإعدادات</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20">
                    Label & Barcode Engine
                  </span>
                </div>
              </div>

              {/* Card 1: Presets & Paper Dimensions */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Maximize2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">أبعاد ومقاسات ورقة الملصق (Label Size)</h2>
                      <p className="text-sm font-bold text-slate-400 dark:text-white/50">تحديد العرض والارتفاع المتوافق مع رول الطابعة (مثل Xprinter XP-235B)</p>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    مقاسات قياسية جاهزة (Quick Presets):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {labelPresets.map((preset) => {
                      const isSelected = data.label_width_mm === preset.width && data.label_height_mm === preset.height;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setData('label_width_mm', preset.width);
                            setData('label_height_mm', preset.height);
                            setData('label_orientation', preset.orientation);
                          }}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer active:scale-98 ${
                            isSelected
                              ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/10 text-primary'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-black text-base">{preset.label}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Dimensions Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-black/5 dark:border-white/8">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80">
                      العرض بالملم (Width mm)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="200"
                      value={data.label_width_mm}
                      onChange={(e) => setData('label_width_mm', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80">
                      الارتفاع بالملم (Height mm)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="200"
                      value={data.label_height_mm}
                      onChange={(e) => setData('label_height_mm', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80">
                      الهامش الداخلي (Margin mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={data.label_margin_mm}
                      onChange={(e) => setData('label_margin_mm', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Orientation & Font size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/5 dark:border-white/8">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-primary" />
                      اتجاه الطباعة (Orientation)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setData('label_orientation', 'landscape')}
                        className={`p-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          data.label_orientation === 'landscape'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        أفقي (Landscape)
                      </button>
                      <button
                        type="button"
                        onClick={() => setData('label_orientation', 'portrait')}
                        className={`p-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          data.label_orientation === 'portrait'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        عمودي (Portrait)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary" />
                      حجم خط الملصق (Font Size)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['9', '10', '11', '12'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setData('label_font_size', sz)}
                          className={`p-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                            data.label_font_size === sz
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {sz}pt
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Card 2: Barcode Type & Testing Options */}
              <div className="rounded-[28px] p-7 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">نوع وشكل الباركود للتجربة والاختبار</h2>
                      <p className="text-sm font-bold text-slate-400 dark:text-white/50">اختبار كافة الأنماط (QR 2D/3D، IMEI، Serial Number) بقيمة القراءة المحددة</p>
                    </div>
                  </div>
                </div>

                {/* 4 Types Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                    اختر نوع وتنسيق التشفير:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {barcodeTypes.map((type) => {
                      const isSelected = data.label_barcode_type === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setData('label_barcode_type', type.id as any)}
                          className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer active:scale-98 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-md shadow-emerald-500/10'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-base">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                {type.icon}
                              </div>
                              <span>{type.name}</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black">
                              {type.badge}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                            {type.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Test Value Input */}
                <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/8">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                      قيمة التشفير للاختبار (Scanner Test Value):
                    </label>
                    <button
                      type="button"
                      onClick={() => setTestValue('240000669027')}
                      className="text-xs font-black text-primary hover:underline cursor-pointer"
                    >
                      إعادة تعيين لـ 240000669027
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      placeholder="أدخل رقم أو كود الاختبار"
                      className="flex-1 px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(testValue);
                        setCopiedValue(true);
                        setTimeout(() => setCopiedValue(false), 2000);
                      }}
                      className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedValue ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedValue ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Layout Presets & Display Elements */}
                <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/8">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-black text-slate-700 dark:text-white/90">
                      نمط وتخطيط محتوى الملصق:
                    </label>
                    <span className="text-xs font-bold text-slate-500">اختر نمط سريع أو حدد يدوياً</span>
                  </div>

                  {/* 3 Quick Layout Mode Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          label_show_store_name: '0',
                          label_show_price: '0',
                          label_show_code_text: '0',
                          label_zoom: '100',
                        }));
                      }}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        data.label_show_store_name === '0' && data.label_show_price === '0' && data.label_show_code_text === '0'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-black text-xs">🔲 باركود فقط (بدون نصوص)</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1">تعبئة قصوى 100% لكامل الورقة</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          label_show_store_name: '0',
                          label_show_price: '0',
                          label_show_code_text: '1',
                          label_zoom: '100',
                        }));
                      }}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        data.label_show_store_name === '0' && data.label_show_price === '0' && data.label_show_code_text === '1'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-black text-xs">🔢 باركود مع الرقم فقط</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1">بدون اسم المحل أو السعر</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          label_show_store_name: '1',
                          label_show_price: '1',
                          label_show_code_text: '1',
                        }));
                      }}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        data.label_show_store_name === '1' && data.label_show_price === '1' && data.label_show_code_text === '1'
                          ? 'border-primary bg-primary/10 text-primary shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-black text-xs">🏷️ ملصق تجاري كامل</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1">اسم المحل + السعر + الرقم</div>
                    </button>
                  </div>

                  {/* Zoom / Scale Selector */}
                  <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/8">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80">
                      نسبة حجم وتعبئة الكود داخل الملصق (Scale / Fill):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: '100', label: '100% تعبئة قصوى (الأكبر)' },
                        { val: '85', label: '85% حجم كبير' },
                        { val: '70', label: '70% حجم متوسط' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setData('label_zoom', item.val)}
                          className={`p-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                            (data.label_zoom || '100') === item.val
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-black/3 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fine-Tuning Checkboxes */}
                  <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/8">
                    <label className="block text-xs font-black text-slate-700 dark:text-white/80">
                      التحكم اليدوي الدقيق بالعناصر:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-black/2 dark:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.label_show_store_name === '1'}
                          onChange={(e) => setData('label_show_store_name', e.target.checked ? '1' : '0')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">اسم المحل / المنتج</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-black/2 dark:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.label_show_price === '1'}
                          onChange={(e) => setData('label_show_price', e.target.checked ? '1' : '0')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">سعر البيع (د.ل)</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-black/2 dark:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.label_show_code_text === '1'}
                          onChange={(e) => setData('label_show_code_text', e.target.checked ? '1' : '0')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">الرقم التسلسلي المقروء</span>
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-black text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer"
                >
                  إلغاء والعودة
                </button>

                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-black text-base hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-5 h-5" />
                  {processing ? 'جاري الحفظ...' : 'حفظ إعدادات الملصقات الافتراضية'}
                </button>
              </div>

            </div>

            {/* Live Interactive Realistic Preview Column (5 cols) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <div className="rounded-[28px] p-6 border border-black/8 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-xl shadow-black/5 space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/8">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
                    <Eye className="w-5 h-5 text-primary" />
                    <span>المعاينة الحية التفاعلية للملصق</span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-mono">
                    {data.label_width_mm} × {data.label_height_mm} mm
                  </span>
                </div>

                {/* Simulated Label Sticker Box */}
                <div className="p-6 rounded-2xl bg-slate-200/70 dark:bg-slate-950/80 border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center min-h-[340px]">
                  
                  {/* The Physical Sticker Representation */}
                  <div
                    ref={labelPrintRef}
                    className="bg-white text-slate-900 border-2 border-slate-300 shadow-2xl rounded-lg flex flex-col items-center justify-center text-center transition-all duration-300 select-none relative overflow-hidden"
                    style={{
                      width: `${Math.min(340, Math.max(180, Number(data.label_width_mm) * 5))}px`,
                      minHeight: `${Math.min(280, Math.max(120, Number(data.label_height_mm) * 5))}px`,
                      padding: hasNoText ? '6px' : '10px 8px',
                      gap: hasNoText ? '0px' : '4px',
                    }}
                  >
                    {/* Optional Store / Product Header */}
                    {data.label_show_store_name === '1' && (
                      <div
                        className="store-title font-extrabold text-slate-900 leading-tight w-full truncate"
                        style={{ fontSize: `${Math.max(8, Number(data.label_font_size) - 2)}px` }}
                      >
                        {data.store_name || 'تاجوري للعطور الفاخرة'}
                      </div>
                    )}

                    {/* Barcode Graphic Rendering according to selected type */}
                    <div className="graphic-container flex flex-col items-center justify-center w-full flex-1 overflow-hidden my-auto">
                      {data.label_barcode_type === 'qr_2d' && (
                        <QRCodeSVG
                          value={testValue || '240000669027'}
                          size={Math.round((hasNoText ? 190 : hasOnlyCode ? 150 : 110) * (Number(data.label_zoom || '100') / 100))}
                          level="H"
                          fgColor="#0f172a"
                          bgColor="#ffffff"
                        />
                      )}

                      {data.label_barcode_type === 'qr_3d' && (
                        <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
                          <QRCodeSVG
                            value={testValue || '240000669027'}
                            size={Math.round((hasNoText ? 180 : hasOnlyCode ? 140 : 105) * (Number(data.label_zoom || '100') / 100))}
                            level="H"
                            fgColor="#0f172a"
                            bgColor="#ffffff"
                            imageSettings={{
                              src: PERFUME_SVG_B64,
                              width: Math.round((hasNoText ? 42 : 32) * (Number(data.label_zoom || '100') / 100)),
                              height: Math.round((hasNoText ? 42 : 32) * (Number(data.label_zoom || '100') / 100)),
                              excavate: true,
                            }}
                          />
                        </div>
                      )}

                      {data.label_barcode_type === 'imei' && (
                        <div className="w-full flex justify-center scale-95 sm:scale-100">
                          <Barcode
                            value={testValue || '240000669027'}
                            format="CODE128"
                            width={(hasNoText ? 2.0 : hasOnlyCode ? 1.6 : 1.3) * (Number(data.label_zoom || '100') / 100)}
                            height={Math.round((hasNoText ? 90 : hasOnlyCode ? 65 : 45) * (Number(data.label_zoom || '100') / 100))}
                            displayValue={false}
                            margin={0}
                            background="#ffffff"
                          />
                        </div>
                      )}

                      {data.label_barcode_type === 'serial' && (
                        <div className="w-full flex justify-center scale-95 sm:scale-100">
                          <Barcode
                            value={testValue || '240000669027'}
                            format="CODE128"
                            width={(hasNoText ? 2.2 : hasOnlyCode ? 1.8 : 1.4) * (Number(data.label_zoom || '100') / 100)}
                            height={Math.round((hasNoText ? 95 : hasOnlyCode ? 70 : 50) * (Number(data.label_zoom || '100') / 100))}
                            displayValue={false}
                            margin={0}
                            background="#ffffff"
                          />
                        </div>
                      )}
                    </div>

                    {/* Numeric Code Text */}
                    {data.label_show_code_text === '1' && (
                      <div
                        className="code-text font-mono font-bold tracking-widest text-slate-800 leading-none select-all"
                        style={{ fontSize: `${Math.max(8, Number(data.label_font_size) - 3)}px` }}
                      >
                        {testValue}
                      </div>
                    )}

                    {/* Price Tag */}
                    {data.label_show_price === '1' && (
                      <div
                        className="price-tag font-black text-slate-900 leading-tight mt-0.5"
                        style={{ fontSize: `${Math.max(9, Number(data.label_font_size))}px` }}
                      >
                        {samplePrice}
                      </div>
                    )}

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

                {/* Direct Print Button */}
                <button
                  type="button"
                  onClick={handleTestLabelPrint}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/30 cursor-pointer"
                >
                  <Printer className="w-5 h-5" />
                  <span>🖨️ طباعة ملصق تجريبي فوراً (Test Print)</span>
                </button>

              </div>
            </div>

          </form>
        )}

      </div>
    </AppShell>
  );
}
