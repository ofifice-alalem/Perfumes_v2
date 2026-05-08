import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect } from 'react';
import { Lock, User } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

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
        <div className="h-[100dvh] w-screen flex items-center justify-center p-4 lg:p-6">
            <div className="w-full max-w-sm flex flex-col gap-8">

                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-[22px] flex items-center justify-center">
                        <span className="text-2xl font-black text-primary">P<span className="text-primary/60">+</span></span>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">نظام العطور</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">سجّل دخولك للمتابعة</p>
                    </div>
                </div>

                {/* Card */}
                <div className="spatial-card p-6 flex flex-col gap-5" dir="rtl">

                    <form onSubmit={submit} className="flex flex-col gap-5">

                        {/* Username */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-black text-slate-600 dark:text-white/60">
                                اسم المستخدم
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={data.username}
                                    onChange={e => setData('username', e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    className="w-full h-12 rounded-[14px] spatial-input pr-4 pl-11 font-bold text-slate-800 dark:text-white"
                                    placeholder="admin"
                                />
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                            </div>
                            {errors.username && (
                                <p className="text-xs font-bold text-red-500 dark:text-red-400">{errors.username}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-black text-slate-600 dark:text-white/60">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full h-12 rounded-[14px] spatial-input pr-4 pl-11 font-bold text-slate-800 dark:text-white"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                            </div>
                            {errors.password && (
                                <p className="text-xs font-bold text-red-500 dark:text-red-400">{errors.password}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full h-12 rounded-[14px] bg-primary hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black transition-all duration-200 mt-1"
                        >
                            {processing ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
                        </button>

                    </form>
                </div>

            </div>
        </div>
    );
}
