import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);

    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const saved = localStorage.getItem('theme');
        const useDark = saved === 'dark' || (!saved && prefersDark);
        document.documentElement.classList.toggle('dark', useDark);
    }, []);

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <div className="h-[100dvh] w-screen flex bg-[#05050A] overflow-hidden" dir="rtl">

            {/* Form Side */}
            <div className="relative w-full lg:w-1/2 flex flex-col items-center justify-start px-6 pt-6 pb-8 overflow-y-auto">

                {/* glow bg */}
                <div className="absolute inset-0 pointer-events-none lg:hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 w-full max-w-sm flex flex-col gap-5">

                    {/* Logo */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-48 h-48 sm:w-56 sm:h-56">
                            <img src="/images/logo.jpg" alt="Logo" className="w-full h-full object-contain mix-blend-screen" />
                        </div>
                        <div className="text-center -mt-4">
                            <p className="text-base sm:text-lg font-black text-white tracking-wide">
                                طيب التاجوري <span className="text-[#E5D0A1]">للروائح والعطور</span>
                            </p>
                            <p className="text-[11px] text-white/40 tracking-[0.2em] uppercase mt-0.5">Taib Al Tajouri Perfumes</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="flex flex-col gap-4">

                        {/* Username */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-white/70 px-1">اسم المستخدم</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={data.username}
                                    onChange={e => setData('username', e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    className="w-full h-12 rounded-[14px] bg-white/[0.06] border border-white/8 text-white placeholder-white/25 focus:bg-white/[0.09] focus:border-white/20 focus:outline-none transition-all pr-11 pl-4 font-bold text-sm"
                                    placeholder="أدخل اسم المستخدم"
                                />
                                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            </div>
                            {errors.username && <p className="text-xs font-bold text-red-400 px-1">{errors.username}</p>}
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-white/70 px-1">كلمة المرور</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full h-12 rounded-[14px] bg-white/[0.06] border border-white/8 text-white placeholder-white/25 focus:bg-white/[0.09] focus:border-white/20 focus:outline-none transition-all pr-11 pl-11 font-bold text-sm"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs font-bold text-red-400 px-1">{errors.password}</p>}
                        </div>

                        {/* Remember */}
                        <label className="flex items-center gap-2.5 cursor-pointer w-fit px-1">
                            <div className="relative flex items-center justify-center w-4.5 h-4.5 w-5 h-5 rounded-[5px] border border-white/20 bg-white/5 hover:bg-white/10 transition-colors shrink-0">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                    className="absolute opacity-0 w-full h-full cursor-pointer"
                                />
                                {remember && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-sm text-white/50 hover:text-white/80 transition-colors">تذكرني</span>
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full h-12 rounded-[14px] bg-[#E5D0A1] hover:bg-[#d4b97b] disabled:opacity-50 disabled:cursor-not-allowed text-[#05050A] font-black text-sm transition-all shadow-lg shadow-black/30 flex items-center justify-center gap-2 mt-1"
                        >
                            {processing && <div className="w-4 h-4 border-2 border-[#05050A]/20 border-t-[#05050A] rounded-full animate-spin" />}
                            {processing ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
                        </button>

                    </form>
                </div>
            </div>

            {/* Image Side — lg+ */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden group">
                <img
                    src="https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=2000&auto=format&fit=crop"
                    alt="Luxury Perfume"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-[#05050A] via-[#05050A]/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-transparent to-transparent" />
                <div className="absolute inset-8 border border-[#E5D0A1]/10 rounded-3xl pointer-events-none" />
            </div>

        </div>
    );
}
