'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { logoutUser } from '@/lib/api/auth';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  ClipboardCheck,
  Settings,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { nama, role, avatarUrl, clearUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearUser();
      router.push('/login');
    }
  };

  const allMenus = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['staff', 'manager'],
    },
    {
      label: 'Buat Evaluasi',
      href: '/evaluasi/baru',
      icon: PlusCircle,
      roles: ['staff', 'manager'],
    },
    {
      label: 'Riwayat Evaluasi',
      href: '/riwayat',
      icon: History,
      roles: ['staff', 'manager'],
    },
    {
      label: 'Approval',
      href: '/approval',
      icon: ClipboardCheck,
      roles: ['manager'],
    },
    {
      label: 'Konfigurasi Kriteria',
      href: '/settings/kriteria',
      icon: Settings,
      roles: ['manager'],
    },
  ];

  // Filter menu based on user role
  const allowedMenus = allMenus.filter((menu) => {
    if (!role) return false;
    return menu.roles.includes(role);
  });

  return (
    <aside className="w-sidebar-width h-screen bg-[#0d0e12] border-r border-gray-800 flex flex-col justify-between flex-shrink-0 font-sans text-gray-300">
      {/* Upper Section */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Logo / Header */}
        <div className="flex items-center space-x-3 px-6 py-5 border-b border-gray-800">
          <div className="bg-blue-600/10 p-2 rounded-lg border border-blue-500/25">
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide leading-tight">
              VendorAI
            </h1>
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">
              Selection System
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {allowedMenus.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname === menu.href || pathname?.startsWith(menu.href + '/');

            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={clsx(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-blue-600/10 text-blue-500 border-l-2 border-blue-500 rounded-l-none pl-2.5'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                )}
              >
                <Icon
                  className={clsx(
                    'w-5 h-5 transition-colors duration-200',
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-300'
                  )}
                />
                <span>{menu.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="border-t border-gray-800 p-4 bg-[#090a0d]">
        <div className="flex items-center space-x-3 mb-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={nama || 'User Avatar'}
              className="w-9 h-9 rounded-full object-cover border border-gray-700"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-white truncate leading-snug">
              {nama || 'Nama Pengguna'}
            </h4>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider truncate">
              {role === 'manager' ? 'Manager' : 'Staff'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-red-500/20 hover:border-red-500/40 bg-red-950/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Aplikasi</span>
        </button>
      </div>
    </aside>
  );
}
