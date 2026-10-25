import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { Lock, User, Eye, EyeOff, Phone } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

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
        <div className="h-[100dvh] w-screen flex bg-[#030712] overflow-hidden" dir="rtl">

            {/* Form Side */}
            <div className="relative w-full lg:w-1/2 flex flex-col justify-between items-center z-10 h-full overflow-hidden border-l border-white/10">

                {/* Scoped CSS for autofill to prevent browser white/light background */}
                <style>{`
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover, 
                    input:-webkit-autofill:focus, 
                    input:-webkit-autofill:active {
                        -webkit-box-shadow: 0 0 0 1000px #060B16 inset !important;
                        -webkit-text-fill-color: #ffffff !important;
                        transition: background-color 5000s ease-in-out 0s;
                        caret-color: #38bdf8;
                    }
                `}</style>

                {/* Ambient glow in background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-sky-900/15 rounded-full blur-[110px]" />
                    <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-amber-500/10 rounded-full blur-[100px]" />
                </div>

                <div className="w-full shrink-0 h-1 sm:h-2" />

                {/* Middle: Store Logo & Form (Fluidly scaled with clamp to fit any viewport height without scrollbar) */}
                <div className="relative z-10 w-full px-6 sm:px-8 lg:px-12 flex flex-col items-center justify-center my-auto py-1">
                    <div 
                        className="w-full flex flex-col items-center"
                        style={{
                            maxWidth: 'clamp(320px, 30vw, 480px)',
                            gap: 'clamp(10px, 2vh, 22px)',
                        }}
                    >

                        {/* Store Logo (Significantly enlarged per user request) */}
                        <div className="flex flex-col items-center text-center shrink-0 w-full">
                            <div 
                                className="relative group shrink-0 flex items-center justify-center"
                                style={{
                                    width: 'clamp(190px, 28vh, 320px)',
                                    aspectRatio: '960 / 686',
                                    maxHeight: 'clamp(135px, 23vh, 225px)',
                                }}
                            >
                                <div className="absolute inset-0 bg-sky-500/15 rounded-full blur-3xl group-hover:bg-sky-500/25 transition-all pointer-events-none" />
                                <img src="/images/logo.jpg" alt="طيب التاجوري" className="w-full h-full object-contain mix-blend-screen relative z-10" />
                            </div>
                            <div className="text-center -mt-3 sm:-mt-4">
                                <h1 
                                    className="font-black text-white tracking-wide"
                                    style={{ fontSize: 'clamp(1.15rem, 2.2vh, 1.75rem)', lineHeight: 1.25 }}
                                >
                                    طيب التاجوري <span className="text-[#E5D0A1]">للروائح والعطور</span>
                                </h1>
                                <p 
                                    className="text-white/40 tracking-[0.2em] uppercase font-bold mt-0.5"
                                    style={{ fontSize: 'clamp(0.65rem, 1vh, 0.82rem)' }}
                                >
                                    Taib Al Tajouri Perfumes
                                </p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={submit} className="w-full flex flex-col" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>

                            {/* Username */}
                            <div className="flex flex-col" style={{ gap: 'clamp(2px, 0.5vh, 5px)' }}>
                                <label className="font-bold text-white/80 px-1" style={{ fontSize: 'clamp(0.72rem, 1.15vh, 0.85rem)' }}>
                                    اسم المستخدم
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={data.username}
                                        onChange={e => setData('username', e.target.value)}
                                        autoComplete="username"
                                        autoFocus
                                        className="w-full rounded-[12px] bg-[#060B16]/80 hover:bg-[#080E1E] focus:bg-[#070D1B] border border-white/12 hover:border-sky-400/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/25 focus:shadow-[0_0_20px_rgba(56,189,248,0.25)] text-white placeholder-white/20 transition-all pr-11 pl-4 font-bold"
                                        style={{
                                            height: 'clamp(44px, 5.4vh, 54px)',
                                            fontSize: 'clamp(0.82rem, 1.35vh, 0.95rem)',
                                        }}
                                        placeholder="أدخل اسم المستخدم"
                                    />
                                    <User 
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                                        style={{ width: 'clamp(15px, 1.7vh, 18px)', height: 'clamp(15px, 1.7vh, 18px)' }}
                                    />
                                </div>
                                {errors.username && <p className="text-xs font-bold text-red-400 px-1">{errors.username}</p>}
                            </div>

                            {/* Password */}
                            <div className="flex flex-col" style={{ gap: 'clamp(2px, 0.5vh, 5px)' }}>
                                <label className="font-bold text-white/80 px-1" style={{ fontSize: 'clamp(0.72rem, 1.15vh, 0.85rem)' }}>
                                    كلمة المرور
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        autoComplete="current-password"
                                        className="w-full rounded-[12px] bg-[#060B16]/80 hover:bg-[#080E1E] focus:bg-[#070D1B] border border-white/12 hover:border-sky-400/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/25 focus:shadow-[0_0_20px_rgba(56,189,248,0.25)] text-white placeholder-white/20 transition-all pr-11 pl-11 font-bold"
                                        style={{
                                            height: 'clamp(44px, 5.4vh, 54px)',
                                            fontSize: 'clamp(0.82rem, 1.35vh, 0.95rem)',
                                        }}
                                        placeholder="••••••••"
                                    />
                                    <Lock 
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" 
                                        style={{ width: 'clamp(15px, 1.7vh, 18px)', height: 'clamp(15px, 1.7vh, 18px)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff style={{ width: 'clamp(15px, 1.7vh, 18px)', height: 'clamp(15px, 1.7vh, 18px)' }} />
                                        ) : (
                                            <Eye style={{ width: 'clamp(15px, 1.7vh, 18px)', height: 'clamp(15px, 1.7vh, 18px)' }} />
                                        )}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs font-bold text-red-400 px-1">{errors.password}</p>}
                            </div>

                            {/* Remember */}
                            <label className="flex items-center gap-2 cursor-pointer w-fit px-1 select-none">
                                <div 
                                    className="relative flex items-center justify-center rounded-[5px] border border-white/20 bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                                    style={{ width: 'clamp(16px, 1.9vh, 20px)', height: 'clamp(16px, 1.9vh, 20px)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked)}
                                        className="absolute opacity-0 w-full h-full cursor-pointer"
                                    />
                                    {data.remember && (
                                        <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-white/60 hover:text-white/80 transition-colors" style={{ fontSize: 'clamp(0.68rem, 1.05vh, 0.8rem)' }}>
                                    تذكر الجلسة على هذا الجهاز
                                </span>
                            </label>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-[12px] bg-[#E5D0A1] hover:bg-[#d4b97b] disabled:opacity-50 disabled:cursor-not-allowed text-[#05050A] font-black transition-all shadow-lg shadow-black/30 flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                                style={{
                                    height: 'clamp(44px, 5.4vh, 54px)',
                                    fontSize: 'clamp(0.82rem, 1.4vh, 0.98rem)',
                                }}
                            >
                                {processing && <div className="w-4 h-4 border-2 border-[#05050A]/20 border-t-[#05050A] rounded-full animate-spin" />}
                                {processing ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
                            </button>

                        </form>
                    </div>
                </div>

                {/* ══════════════ Simple Corporate Footer (Taqniya Cloud Signature) ══════════════ */}
                {/* Full-width divider border across the entire half section */}
                <div 
                    className="w-full border-t border-white/15 px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3.5 relative z-10 shrink-0 bg-[#030712]/50 backdrop-blur-sm"
                    style={{
                        paddingTop: 'clamp(12px, 2vh, 20px)',
                        paddingBottom: 'clamp(12px, 2vh, 20px)',
                        fontSize: 'clamp(0.85rem, 1.5vh, 1.05rem)',
                    }}
                >
                    
                    {/* Developer Company info */}
                    <div className="flex items-center gap-3">
                        <img 
                            src="/images/taqniya-logo.png" 
                            alt="تقنية السحابة" 
                            className="object-contain shrink-0" 
                            style={{
                                width: 'clamp(32px, 4.2vh, 46px)',
                                height: 'clamp(32px, 4.2vh, 46px)',
                            }}
                        />
                        <span className="text-white/85">
                            تم التطوير والتشغيل بواسطة <strong className="text-sky-400 font-black">تقنية السحابة</strong>
                        </span>
                        <span className="text-white/25 hidden sm:inline">•</span>
                        <a 
                            href="https://taqnniya.cloud/" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-white/50 hover:text-sky-400 transition-colors hidden sm:inline font-mono font-medium"
                        >
                            taqnniya.cloud
                        </a>
                    </div>

                    {/* Support Contact Phone (0921233218) */}
                    <div className="flex items-center gap-2.5 text-white/90">
                        <span className="text-white/60 text-xs sm:text-sm font-semibold">الدعم الفني:</span>
                        <a 
                            href="tel:0921233218" 
                            className="font-mono font-black text-white hover:text-sky-400 flex items-center gap-2 transition-colors tracking-wide"
                            title="الاتصال بالدعم الفني"
                            style={{ fontSize: 'clamp(0.9rem, 1.6vh, 1.15rem)' }}
                        >
                            <Phone style={{ width: 'clamp(16px, 2.2vh, 22px)', height: 'clamp(16px, 2.2vh, 22px)' }} className="text-sky-400" />
                            <span dir="ltr">0921233218</span>
                        </a>
                    </div>

                </div>

            </div>

            {/* ══════════════ Image Side — lg+ (Sapphire Blue with Cinematic Overlays) ══════════════ */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden group bg-slate-950">
                
                {/* Local Sapphire Perfume Visual */}
                <img
                    src="/images/perfume-blue.jpg"
                    alt="Luxury Sapphire Perfume"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />

                {/* Atmospheric dark overlays */}
                <div className="absolute inset-0 bg-gradient-to-l from-[#030712] via-[#030712]/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/40 via-transparent to-transparent" />

                {/* Sapphire Luxury Framed Border */}
                <div className="absolute inset-8 border border-sky-400/20 rounded-3xl pointer-events-none" />

            </div>

        </div>
    );
}
