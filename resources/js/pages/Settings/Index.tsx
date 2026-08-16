import { useState, ChangeEvent, FormEvent } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Settings as SettingsIcon, Printer, DollarSign, Users,
  RefreshCw, HardDrive, BookOpen, ChevronLeft, Store,
  FileText, CheckCircle2, Save, Upload, Eye, ArrowRight, Type, QrCode
} from 'lucide-react';

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
  };
  flash?: {
    success?: string;
  };
}

export default function SettingsIndex({ settings }: SettingsProps) {
  const { flash } = usePage<{ flash: { success?: string } }>().props;

  // View state: 'grid' (cards menu) or 'receipt' (receipt form editor)
  const [activeTab, setActiveTab] = useState<'grid' | 'receipt'>('grid');

  const [previewLogo, setPreviewLogo] = useState<string>(settings.store_logo || '/images/logo-black_white.png');

  const { data, setData, post, processing, errors } = useForm({
    store_name: settings.store_name || '',
    store_subname: settings.store_subname || '',
    store_details: settings.store_details || '',
    thank_you_message: settings.thank_you_message || '',
    policy_notes: settings.policy_notes || '',
    receipt_font_size: settings.receipt_font_size || '10',
    show_qr_code: settings.show_qr_code ?? '1',
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

                {/* Simulated Paper Content with Dynamic Font Size */}
                <div
                  className="p-4 rounded-2xl bg-white text-black font-sans border border-slate-300 shadow-inner space-y-3 text-center leading-tight transition-all"
                  style={{ fontSize: `${data.receipt_font_size}px` }}
                >
                  {/* Logo */}
                  {previewLogo && (
                    <div className="flex justify-center mb-2">
                      <img src={previewLogo} alt="شعار" className="h-12 w-auto object-contain max-w-[150px]" />
                    </div>
                  )}
                  <div className="font-black text-[1.4em]">{data.store_name || 'اسم المحل'}</div>
                  {data.store_subname && <div className="text-[0.85em] font-bold text-slate-600">{data.store_subname}</div>}
                  <div className="text-[0.85em] text-slate-700 whitespace-pre-line">{data.store_details || 'تفاصيل المحل'}</div>

                  <div className="border-t border-b border-dashed border-black py-2 my-2 text-slate-400 font-mono text-[0.85em]">
                    [ ... الأصناف والإجماليات ... ]
                  </div>

                  {/* QR Code preview if enabled */}
                  {data.show_qr_code === '1' && (
                    <div className="flex justify-center my-2">
                      <div className="w-12 h-12 border border-black p-1 flex items-center justify-center font-mono text-[9px] font-bold">
                        [QR Code]
                      </div>
                    </div>
                  )}

                  {/* Thank You & Policy */}
                  <div className="font-bold text-[1em] pt-1">{data.thank_you_message || 'نص الشكر'}</div>
                  <div className="text-[0.8em] text-slate-600 border-t border-dashed border-black pt-2 whitespace-pre-line text-center">
                    {data.policy_notes || 'شروط الفاتورة والسياسات'}
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
