import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, createSupabaseUserClient } from '@/lib/supabase';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const VALID_STATUS = [
  'draft',
  'processing',
  'selesai',
  'menunggu_approval',
  'approved',
  'butuh_revisi',
] as const;

const VALID_KATEGORI = [
  'it_hardware',
  'it_software',
  'jasa_it',
  'jasa_konsultasi',
  'alat_tulis_kantor',
] as const;

const postBodySchema = z.object({
  judul:                z.string().min(1).max(255),
  kategori:             z.enum(VALID_KATEGORI),
  deskripsi:            z.string().min(1).max(5000),
  budgetMin:            z.number().int().positive().optional().nullable(),
  budgetMax:            z.number().int().positive(),
  deadline:             z.string().min(1),
  prioritasKriteria:    z.array(z.string()).optional().nullable(),
  lampiranUrl:          z.string().optional().nullable(),
  preferensiPerusahaan: z.string().optional().nullable(),
});

const querySchema = z.object({
  status:   z.enum(VALID_STATUS).optional(),
  kategori: z.enum(VALID_KATEGORI).optional(),
  search:   z.string().max(200).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo:   z.string().datetime({ offset: true }).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
});

// ---------------------------------------------------------------------------
// GET /api/v1/evaluasi
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const token  = request.headers.get('x-user-token');
    const userId = request.headers.get('x-user-id');

    if (!token || !userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      status:   searchParams.get('status')   ?? undefined,
      kategori: searchParams.get('kategori') ?? undefined,
      search:   searchParams.get('search')   ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo:   searchParams.get('dateTo')   ?? undefined,
      page:     searchParams.get('page')     ?? undefined,
      limit:    searchParams.get('limit')    ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: 'Parameter query tidak valid',
            details: parsed.error.format(),
          },
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { status, kategori, search, dateFrom, dateTo, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // Use user-scoped client — RLS enforces staff only sees own evaluasi
    const userClient = createSupabaseUserClient(token);

    let query = userClient
      .from('evaluasi')
      .select(
        'id, judul, kategori, status, budget_min, budget_max, deadline, created_by, created_at, updated_at',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status)   query = query.eq('status', status);
    if (kategori) query = query.eq('kategori', kategori);
    if (search)   query = query.ilike('judul', `%${search}%`);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo)   query = query.lte('created_at', dateTo);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching evaluasi list:', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil daftar evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const total      = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          items: data ?? [],
          meta: { page, limit, total, totalPages },
        },
      },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in GET /evaluasi:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/evaluasi
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const token  = request.headers.get('x-user-token');

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' } },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    const body   = await request.json();
    const parsed = postBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: 'Input tidak valid',
            details: parsed.error.format(),
          },
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const {
      judul, kategori, deskripsi, budgetMin, budgetMax,
      deadline, prioritasKriteria, lampiranUrl, preferensiPerusahaan,
    } = parsed.data;

    if (preferensiPerusahaan && preferensiPerusahaan.length > 1000) {
      return NextResponse.json(
        { success: false, error: { code: 'PREFERENCE_TOO_LONG', message: 'Teks preferensi perusahaan tidak boleh lebih dari 1.000 karakter' } },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Use service role — manual auth already verified. created_by is set to auth'd user.
    const { data, error } = await supabase
      .from('evaluasi')
      .insert({
        judul,
        kategori,
        deskripsi,
        status:               'draft',
        budget_min:           budgetMin ?? null,
        budget_max:           budgetMax,
        deadline,
        prioritas_kriteria:   prioritasKriteria ?? null,
        lampiran_url:         lampiranUrl ?? null,
        preferensi_perusahaan: preferensiPerusahaan ?? null,
        created_by:           userId,
      })
      .select('id, judul, kategori, deskripsi, status, budget_min, budget_max, deadline, prioritas_kriteria, lampiran_url, preferensi_perusahaan, created_by, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('Error creating evaluasi:', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal membuat evaluasi' } },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 201, headers: SECURITY_HEADERS }
    );

  } catch (err) {
    console.error('Error in POST /evaluasi:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal pada server' } },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
