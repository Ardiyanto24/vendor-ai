import { NextResponse } from 'next/server';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Enum values are fixed — only changes with a DB migration.
// Values mirror the kategori_pengadaan enum in Supabase.
const KATEGORI_PENGADAAN = [
  { value: 'it_hardware',       label: 'IT Hardware' },
  { value: 'it_software',       label: 'IT Software' },
  { value: 'jasa_it',           label: 'Jasa IT' },
  { value: 'jasa_konsultasi',   label: 'Jasa Konsultasi' },
  { value: 'alat_tulis_kantor', label: 'Alat Tulis Kantor' },
] as const;

export async function GET() {
  return NextResponse.json(
    { success: true, data: KATEGORI_PENGADAAN },
    {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        // Data is static — only changes with DB migrations
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    }
  );
}
