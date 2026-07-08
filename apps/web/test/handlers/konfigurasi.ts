import { http, HttpResponse } from 'msw';

const DEFAULT_KRITERIA = [
  { key: 'harga_tco',            label: 'Harga & TCO',           bobot: 30, threshold_min: 60 },
  { key: 'kualitas_track_record', label: 'Kualitas & Track Record', bobot: 25, threshold_min: 60 },
  { key: 'kemampuan_delivery',    label: 'Kemampuan Delivery',     bobot: 20, threshold_min: 60 },
  { key: 'risiko_legalitas',      label: 'Risiko & Legalitas',     bobot: 15, threshold_min: 60 },
  { key: 'support_aftersales',    label: 'Support & Aftersales',   bobot: 10, threshold_min: 60 },
];

const KATEGORI_OPTIONS = [
  { value: 'it_hardware',       label: 'IT Hardware' },
  { value: 'it_software',       label: 'IT Software' },
  { value: 'jasa_it',           label: 'Jasa IT' },
  { value: 'jasa_konsultasi',   label: 'Jasa Konsultasi' },
  { value: 'alat_tulis_kantor', label: 'Alat Tulis Kantor' },
];

export const handlers = [
  http.get('http://localhost:3001/api/v1/kategori-pengadaan', () => {
    return HttpResponse.json({ success: true, data: KATEGORI_OPTIONS });
  }),

  http.get('http://localhost:3001/api/v1/konfigurasi/kriteria', ({ request }) => {
    const url = new URL(request.url);
    const kategori = url.searchParams.get('kategori');

    if (!kategori) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: "Parameter 'kategori' wajib diisi" } },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        id:         'mock-config-uuid',
        kategori,
        kriteria:   DEFAULT_KRITERIA,
        updated_by: 'mock-manager-uuid',
        updated_at: new Date().toISOString(),
      },
    });
  }),

  http.put('http://localhost:3001/api/v1/konfigurasi/kriteria', async ({ request }) => {
    const body = await request.json() as { kategori: string; kriteria: { bobot: number }[] };
    const totalBobot = (body.kriteria ?? []).reduce((sum: number, k: { bobot: number }) => sum + k.bobot, 0);

    if (totalBobot !== 100) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code:    'INVALID_WEIGHT_TOTAL',
            message: `Total bobot harus tepat 100. Saat ini: ${totalBobot}`,
          },
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        id:         'mock-config-uuid',
        kategori:   body.kategori,
        kriteria:   body.kriteria,
        updated_by: 'mock-manager-uuid',
        updated_at: new Date().toISOString(),
      },
    });
  }),
];
