import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';

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
        if (useDark) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('body-bg-dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.add('body-bg-light');
        }
    }, []);

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <div className="relative min-h-[100dvh] w-screen flex items-center justify-center overflow-hidden bg-[#05050A]" dir="rtl">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/30 rounded-full blur-[150px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]"></div>
                
                {/* Simulated starry pattern with repeating SVG noise */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.5 0" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                </svg>
            </div>

            <div className="relative z-10 w-full max-w-[420px] p-4 lg:p-6">
                {/* Glassmorphism Card */}
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl flex flex-col gap-8">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center gap-2">
                        {/* Logo Equivalent */}
                        <div className="flex flex-col items-center gap-3 mb-2">
                            <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner p-2 overflow-hidden">
                                <img src="/images/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl mix-blend-screen" />
                            </div>
                            <div className="flex flex-col text-center mt-1">
                                <span className="text-2xl font-black text-white tracking-wider leading-tight">طيب التاجوري <br/><span className="text-[#E5D0A1]">للروائح والعطور</span></span>
                                <span className="text-[10px] text-white/50 tracking-[0.2em] uppercase mt-1">Taib Al Tajouri Perfumes</span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-black text-white tracking-wide mt-2">تسجيل الدخول</h1>
                        <p className="text-sm text-white/60 font-medium">كل سحر العطور، في مكان واحد بسيط..!</p>
                    </div>

                    <form onSubmit={submit} className="flex flex-col gap-6">

                        {/* Username */}
                        <div className="flex flex-col gap-2.5">
                            <label className="text-sm font-bold text-white/80 px-1">
                                اسم المستخدم
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={data.username}
                                    onChange={e => setData('username', e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    className="w-full h-14 rounded-[16px] bg-white/[0.06] border border-white/5 text-white placeholder-white/30 focus:bg-white/[0.08] focus:border-white/20 focus:ring-0 transition-all pl-4 pr-12 font-bold"
                                    placeholder="أدخل اسم المستخدم"
                                />
                                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            </div>
                            {errors.username && (
                                <p className="text-xs font-bold text-red-400 px-1">{errors.username}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-2.5">
                            <label className="text-sm font-bold text-white/80 px-1">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full h-14 rounded-[16px] bg-white/[0.06] border border-white/5 text-white placeholder-white/30 focus:bg-white/[0.08] focus:border-white/20 focus:ring-0 transition-all pl-12 pr-12 font-bold"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs font-bold text-red-400 px-1">{errors.password}</p>
                            )}
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between text-sm mt-1 px-1">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-5 h-5 rounded-[6px] border border-white/20 bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="absolute opacity-0 w-full h-full cursor-pointer"
                                    />
                                    {remember && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-white/60 font-medium group-hover:text-white/90 transition-colors">تذكرني</span>
                            </label>

                            <a href="#" className="text-white/60 font-medium hover:text-white/90 transition-colors">
                                نسيت كلمة المرور؟
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full h-14 rounded-[16px] bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all duration-300 mt-4 shadow-lg shadow-black/40 border border-white/5 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : null}
                            {processing ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}
