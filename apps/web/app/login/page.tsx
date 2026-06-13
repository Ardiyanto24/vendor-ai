'use client';

import React from 'react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-md w-full border border-gray-200 dark:border-gray-800 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">AI Vendor Selection System</h1>
        <p className="text-sm text-gray-500 mb-6">Silakan masuk untuk melanjutkan.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent" 
              placeholder="staff@vendor-ai.dev atau manager@vendor-ai.dev" 
              disabled 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent" 
              disabled 
            />
          </div>
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-medium transition-colors"
            disabled
          >
            Masuk
          </button>
        </div>
      </div>
    </div>
  );
}
