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
        <div className="relative min-h-[100dvh] w-screen flex bg-[#05050A]" dir="rtl">
            
            {/* Right Side: Login Form (In RTL, this is the first element) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 xl:p-24 relative z-10">
                {/* Background effects for mobile */}
                <div className="absolute inset-0 z-0 pointer-events-none lg:hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[150px]"></div>
                </div>

                <div className="w-full max-w-[400px]">
                    {/* Form Container (Removed Glassmorphism) */}
                    <div className="flex flex-col gap-8 relative z-10 w-full my-8">
                        
                        {/* Header */}
                        <div className="flex flex-col items-center">
                            {/* Logo */}
                            <div className="flex flex-col items-center mb-1">
                                <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center overflow-hidden transition-transform hover:scale-105 duration-500">
                                    <img src="/images/logo.jpg" alt="Logo" className="w-full h-full object-contain mix-blend-screen" />
                                </div>
                                <div className="flex flex-col text-center mt-0">
                                    <span className="text-xl sm:text-2xl font-black text-white tracking-wider leading-tight">طيب التاجوري <span className="text-[#E5D0A1]">للروائح والعطور</span></span>
                                    <span className="text-xs text-white/50 tracking-[0.2em] uppercase mt-1">Taib Al Tajouri Perfumes</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit} className="flex flex-col gap-6 mt-2">

                            {/* Username */}
                            <div className="flex flex-col gap-2.5">
                                <label className="text-sm font-bold text-white/80 px-1">
                                    اسم المستخدم
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={data.username}
                                        onChange={e => setData('username', e.target.value)}
                                        autoComplete="username"
                                        autoFocus
                                        className="w-full h-14 rounded-[16px] bg-white/[0.06] border border-white/5 text-white placeholder-white/30 focus:bg-white/[0.08] focus:border-white/20 focus:ring-0 transition-all pl-4 pr-12 font-bold group-hover:bg-white/[0.08]"
                                        placeholder="أدخل اسم المستخدم"
                                    />
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 transition-colors group-hover:text-white/60" />
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
                                <div className="relative group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        autoComplete="current-password"
                                        className="w-full h-14 rounded-[16px] bg-white/[0.06] border border-white/5 text-white placeholder-white/30 focus:bg-white/[0.08] focus:border-white/20 focus:ring-0 transition-all pl-12 pr-12 font-bold group-hover:bg-white/[0.08]"
                                        placeholder="••••••••"
                                    />
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 transition-colors group-hover:text-white/60" />
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

                            {/* Remember (Removed Forget Password) */}
                            <div className="flex items-center text-sm mt-1 px-1">
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
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full h-14 rounded-[16px] bg-[#E5D0A1] hover:bg-[#d4b97b] disabled:opacity-50 disabled:cursor-not-allowed text-[#05050A] font-black transition-all duration-300 mt-2 shadow-lg shadow-black/40 border border-transparent flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <div className="w-5 h-5 border-2 border-[#05050A]/20 border-t-[#05050A] rounded-full animate-spin"></div>
                                ) : null}
                                {processing ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
                            </button>

                        </form>
                    </div>
                </div>
            </div>

            {/* Left Side: Marketing Section (Visible on lg and above) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#05050A] overflow-hidden group">
                {/* Elegant Perfume Marketing Image with slow zoom on hover */}
                <img 
                    src="https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=2000&auto=format&fit=crop" 
                    alt="Luxury Perfume" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                />
                
                {/* Complex rich gradient overlays to blend smoothly with the background and add depth */}
                <div className="absolute inset-0 bg-gradient-to-l from-[#05050A] via-[#05050A]/30 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#1a110a]/20 to-transparent mix-blend-multiply"></div>
                
                {/* Decorative border */}
                <div className="absolute inset-8 border border-[#E5D0A1]/10 rounded-3xl pointer-events-none"></div>
            </div>
            
        </div>
    );
}
