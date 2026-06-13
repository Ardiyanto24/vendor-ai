-- Seed default system user
INSERT INTO public."user" (id, nama, email, role, avatar_url)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'system@vendor-ai.dev',
    'manager',
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Seed default kriteria weights and thresholds for all categories
INSERT INTO public.konfigurasi_kriteria (id, kategori, kriteria, updated_by)
VALUES
  (
    gen_random_uuid(),
    'it_hardware',
    '[
      {"key": "harga_tco", "label": "Harga & TCO", "bobot": 30, "threshold_min": 60},
      {"key": "kualitas_track_record", "label": "Kualitas & Track Record", "bobot": 25, "threshold_min": 60},
      {"key": "kemampuan_delivery", "label": "Kemampuan Delivery", "bobot": 20, "threshold_min": 60},
      {"key": "risiko_legalitas", "label": "Risiko & Legalitas", "bobot": 15, "threshold_min": 60},
      {"key": "support_aftersales", "label": "Support & Aftersales", "bobot": 10, "threshold_min": 60}
    ]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    gen_random_uuid(),
    'it_software',
    '[
      {"key": "harga_tco", "label": "Harga & TCO", "bobot": 30, "threshold_min": 60},
      {"key": "kualitas_track_record", "label": "Kualitas & Track Record", "bobot": 25, "threshold_min": 60},
      {"key": "kemampuan_delivery", "label": "Kemampuan Delivery", "bobot": 20, "threshold_min": 60},
      {"key": "risiko_legalitas", "label": "Risiko & Legalitas", "bobot": 15, "threshold_min": 60},
      {"key": "support_aftersales", "label": "Support & Aftersales", "bobot": 10, "threshold_min": 60}
    ]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    gen_random_uuid(),
    'jasa_it',
    '[
      {"key": "harga_tco", "label": "Harga & TCO", "bobot": 30, "threshold_min": 60},
      {"key": "kualitas_track_record", "label": "Kualitas & Track Record", "bobot": 25, "threshold_min": 60},
      {"key": "kemampuan_delivery", "label": "Kemampuan Delivery", "bobot": 20, "threshold_min": 60},
      {"key": "risiko_legalitas", "label": "Risiko & Legalitas", "bobot": 15, "threshold_min": 60},
      {"key": "support_aftersales", "label": "Support & Aftersales", "bobot": 10, "threshold_min": 60}
    ]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    gen_random_uuid(),
    'jasa_konsultasi',
    '[
      {"key": "harga_tco", "label": "Harga & TCO", "bobot": 30, "threshold_min": 60},
      {"key": "kualitas_track_record", "label": "Kualitas & Track Record", "bobot": 25, "threshold_min": 60},
      {"key": "kemampuan_delivery", "label": "Kemampuan Delivery", "bobot": 20, "threshold_min": 60},
      {"key": "risiko_legalitas", "label": "Risiko & Legalitas", "bobot": 15, "threshold_min": 60},
      {"key": "support_aftersales", "label": "Support & Aftersales", "bobot": 10, "threshold_min": 60}
    ]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    gen_random_uuid(),
    'alat_tulis_kantor',
    '[
      {"key": "harga_tco", "label": "Harga & TCO", "bobot": 30, "threshold_min": 60},
      {"key": "kualitas_track_record", "label": "Kualitas & Track Record", "bobot": 25, "threshold_min": 60},
      {"key": "kemampuan_delivery", "label": "Kemampuan Delivery", "bobot": 20, "threshold_min": 60},
      {"key": "risiko_legalitas", "label": "Risiko & Legalitas", "bobot": 15, "threshold_min": 60},
      {"key": "support_aftersales", "label": "Support & Aftersales", "bobot": 10, "threshold_min": 60}
    ]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
  )
ON CONFLICT DO NOTHING;
