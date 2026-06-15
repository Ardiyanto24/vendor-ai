import React from 'react';
import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Masuk | AI Vendor Selection System',
  description: 'Silakan masuk ke AI Vendor Selection System untuk mengelola dan membandingkan vendor terbaik menggunakan kecerdasan buatan.',
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#07080a] px-4 font-sans text-gray-200">
      {/* Background glowing design elements */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Subtle grid pattern background */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,transparent_80%)] bg-[size:30px_30px] opacity-30 pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0)`
        }}
      />

      {/* Main card wrapper */}
      <div className="relative z-10 w-full flex items-center justify-center py-12">
        <LoginForm />
      </div>

      {/* Footer copyright */}
      <div className="relative z-10 text-center text-xs text-gray-600 mt-6">
        &copy; {new Date().getFullYear()} AI Vendor Selection System. All rights reserved.
      </div>
    </main>
  );
}
