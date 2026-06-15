'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { loginUser } from '../../lib/api/auth';
import { getErrorMessage } from '../../lib/constants/errorMessages';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    // Client-side schema validation (in case of bypass)
    const validation = loginSchema.safeParse(data);
    if (!validation.success) {
      validation.error.issues.forEach((issue) => {
        setError(issue.path[0] as any, {
          message: issue.message,
        });
      });
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await loginUser(data.email, data.password);
      
      // Save session info to Zustand store
      setUser({
        id: response.user.id,
        nama: response.user.nama,
        email: response.user.email,
        role: response.user.role,
        avatarUrl: response.user.avatarUrl,
        accessToken: response.accessToken,
      });

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err.code || 'UNKNOWN_ERROR';
      setApiError(getErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (role: 'staff' | 'manager') => {
    if (role === 'staff') {
      setValue('email', 'test-staff@vendor-ai.dev');
      setValue('password', 'Password123');
    } else {
      setValue('email', 'test-manager@vendor-ai.dev');
      setValue('password', 'Password123');
    }
    setApiError(null);
  };

  return (
    <div className="relative w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0d0e12]/70 backdrop-blur-xl shadow-[0_0_50px_0_rgba(59,130,246,0.15)] transition-all duration-300 hover:shadow-[0_0_60px_0_rgba(59,130,246,0.25)]">
      {/* Top glowing ambient accent */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-blue-500/20 rounded-full blur-[40px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 mb-4 transform hover:scale-105 transition-transform duration-300">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400">
          AI Vendor Selection System
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          Masuk ke dashboard pengadaan berbasis AI
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Global Error Banner */}
        {apiError && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-sm text-center font-medium animate-fadeIn">
            {apiError}
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Email Pengguna
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="nama@vendor-ai.dev"
              disabled={isLoading}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white/[0.03] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.email
                  ? 'border-red-500/50 focus:ring-red-500/20'
                  : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20'
              }`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1 font-medium animate-slideIn">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white/[0.03] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.password
                  ? 'border-red-500/50 focus:ring-red-500/20'
                  : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1 font-medium animate-slideIn">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="relative w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Masuk ke Akun</span>
          )}
        </button>
      </form>

      {/* Quick Login Helpers */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Akun Demo Uji Coba
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fillCredentials('staff')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-xs font-medium text-gray-300 transition-all hover:text-white active:scale-95"
          >
            <User className="w-3 h-3 text-blue-400" />
            <span>Staff Demo</span>
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fillCredentials('manager')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-xs font-medium text-gray-300 transition-all hover:text-white active:scale-95"
          >
            <User className="w-3 h-3 text-purple-400" />
            <span>Manager Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
