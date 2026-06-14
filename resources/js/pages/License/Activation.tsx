import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { ShieldAlert, Key, Copy, CheckCircle2 } from 'lucide-react';

interface Props {
    deviceId: string;
    flash?: { error?: string; success?: string };
}

export default function Activation({ deviceId, flash }: Props) {
    const [key, setKey] = useState('');
    const [copied, setCopied] = useState(false);
    const [processing, setProcessing] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(deviceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        router.post('/license/activate', { key }, {
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <div className="min-h-screen bg-black/5 dark:bg-black flex items-center justify-center p-4" dir="rtl">
            <Head title="تفعيل النظام" />
            
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden backdrop-blur-xl">
                    <div className="p-8 text-center border-b border-black/5 dark:border-white/5 bg-black/3 dark:bg-white/3">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تفعيل النظام</h1>
                        <p className="text-sm font-bold text-slate-500 dark:text-white/50 mt-2 leading-relaxed">
                            هذه النسخة غير مفعلة أو تم نقلها لجهاز جديد. يرجى تزويد المطور برمز الجهاز للحصول على مفتاح التفعيل.
                        </p>
                    </div>

                    <div className="p-8">
                        {flash?.error && (
                            <div className="mb-6 p-4 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold text-center">
                                {flash.error}
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">
                                رمز الجهاز (Device ID)
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="w-12 h-12 rounded-[14px] bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all shrink-0"
                                    title="نسخ رمز الجهاز"
                                >
                                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </button>
                                <div className="flex-1 h-12 rounded-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center px-4 font-black text-slate-800 dark:text-white tracking-widest font-mono text-center justify-center" dir="ltr">
                                    {deviceId}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit}>
                            <div className="mb-8">
                                <label className="block text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">
                                    مفتاح التفعيل (License Key)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                        <Key className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={key}
                                        onChange={e => setKey(e.target.value.toUpperCase())}
                                        className="w-full h-14 rounded-[14px] bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 focus:border-primary px-4 pl-12 font-black text-slate-800 dark:text-white tracking-wider text-center text-lg outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 uppercase"
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        dir="ltr"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !key}
                                className="w-full h-14 rounded-[16px] bg-primary text-white font-black text-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center"
                            >
                                {processing ? 'جاري التحقق...' : 'تفعيل الآن'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
