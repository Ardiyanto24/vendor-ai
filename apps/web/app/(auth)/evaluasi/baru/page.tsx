import { PlusCircle } from 'lucide-react';
import EvaluasiStepper from '@/components/feature/EvaluasiStepper';

export const metadata = {
  title: 'Buat Evaluasi Baru | AI Vendor Selection',
};

export default function BuatEvaluasiPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Buat Evaluasi Baru</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Isi requirement, tambah vendor, lalu mulai evaluasi AI
          </p>
        </div>
      </div>

      <EvaluasiStepper />
    </div>
  );
}
