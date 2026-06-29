import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head>
                <title>Iniciar Sesión</title>
                <meta name="description" content="Inicia sesión en SIAME, el Sistema Integral de Agentes del Ministerio de Educación." />
            </Head>

            <div className="text-center mb-6">
                <h1 className="text-3xl font-black text-[#FE8204] tracking-tight mb-2">
                    SIAME
                </h1>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Iniciar Sesión
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-1">
                    Ingresa tus credenciales para acceder
                </p>
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="email" value="Correo Electrónico" className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <InputLabel htmlFor="password" value="Contraseña" className="text-xs font-black uppercase tracking-wider text-gray-500" />
                        {canResetPassword && (
                            <Link
                                id="forgot-password-link"
                                href={route('password.request')}
                                className="text-xs font-bold text-[#FE8204] hover:text-[#ff5e00] transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        )}
                    </div>

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer select-none">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                        />
                        <span className="ms-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Recordarme
                        </span>
                    </label>
                </div>

                <div className="pt-2">
                    <PrimaryButton id="login-btn" className="w-full" disabled={processing}>
                        Entrar <i className="fa-solid fa-arrow-right-to-bracket ml-2"></i>
                    </PrimaryButton>
                </div>
            </form>

            {/* Quick Login Assist (Development Only) */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100/80 text-amber-900">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-amber-800">
                        <i className="fa-solid fa-key text-amber-500"></i>
                        Credenciales de Acceso Rápido
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            id="quick-login-admin"
                            type="button"
                            onClick={() => {
                                setData({
                                    ...data,
                                    email: 'admin@example.com',
                                    password: 'password'
                                });
                            }}
                            className="flex flex-col text-left bg-white/70 hover:bg-white border border-amber-200/50 hover:border-amber-300 rounded-xl p-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                        >
                            <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider leading-none">Admin</span>
                            <span className="text-[9px] text-gray-400 font-semibold mt-1 truncate w-full">admin@example.com</span>
                        </button>
                        <button
                            id="quick-login-staff"
                            type="button"
                            onClick={() => {
                                setData({
                                    ...data,
                                    email: 'administrativo@example.com',
                                    password: 'password'
                                });
                            }}
                            className="flex flex-col text-left bg-white/70 hover:bg-white border border-amber-200/50 hover:border-amber-300 rounded-xl p-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                        >
                            <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider leading-none">Personal</span>
                            <span className="text-[9px] text-gray-400 font-semibold mt-1 truncate w-full">administrativo@example.com</span>
                        </button>
                    </div>
                    <div className="mt-2 text-[9px] font-bold text-amber-700/80 text-center uppercase tracking-widest">
                        Contraseña común: <span className="font-black text-amber-900">password</span>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}

