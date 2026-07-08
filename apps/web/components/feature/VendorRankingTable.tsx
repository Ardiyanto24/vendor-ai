'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import RankBadge from '@/components/atomic/RankBadge';
import ScoreBar from '@/components/atomic/ScoreBar';
import CriteriaBarChart from '@/components/charts/CriteriaBarChart';
import type { HasilVendor, KriteriaItem, TingkatKesesuaianPreferensi } from 'types';

export interface VendorRankingTableProps {
  vendors: HasilVendor[];
  konfigurasi: KriteriaItem[];
}

type SortColumn = 'rank' | 'vendor_nama' | 'skor_total' | string;
type SortDirection = 'asc' | 'desc';

const PREFERENSI_LABEL: Record<TingkatKesesuaianPreferensi, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rendah: 'Rendah',
  tidak_relevan: 'Tidak Relevan',
};

const PREFERENSI_CLASS: Record<TingkatKesesuaianPreferensi, string> = {
  tinggi: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  sedang: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  rendah: 'bg-red-500/10 text-red-400 border-red-500/30',
  tidak_relevan: 'bg-white/5 text-gray-400 border-white/10',
};

function sortValue(v: HasilVendor, column: SortColumn): number | string {
  if (column === 'rank') return v.rank;
  if (column === 'vendor_nama') return v.vendor_nama.toLowerCase();
  if (column === 'skor_total') return v.skor_total;
  return v.skor_per_kriteria[column] ?? 0;
}

export default function VendorRankingTable({ vendors, konfigurasi }: VendorRankingTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  const sortedVendors = useMemo(() => {
    const copy = [...vendors];
    copy.sort((a, b) => {
      const av = sortValue(a, sortColumn);
      const bv = sortValue(b, sortColumn);
      const cmp = typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [vendors, sortColumn, sortDirection]);

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <ChevronsUpDown className="w-3 h-3 text-gray-600" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-400" />
      : <ChevronDown className="w-3 h-3 text-blue-400" />;
  }

  const hasPreferensi = vendors.some((v) => v.tingkat_kesesuaian_preferensi != null);
  const colSpan = 3 + konfigurasi.length + (hasPreferensi ? 1 : 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden" data-testid="vendor-ranking-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-gray-400">
              <th className="px-4 py-3 text-left font-medium w-12">
                <button type="button" onClick={() => handleSort('rank')} className="flex items-center gap-1 hover:text-white" data-testid="sort-header-rank">
                  Rank <SortIcon column="rank" />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => handleSort('vendor_nama')} className="flex items-center gap-1 hover:text-white" data-testid="sort-header-vendor_nama">
                  Vendor <SortIcon column="vendor_nama" />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => handleSort('skor_total')} className="flex items-center gap-1 hover:text-white" data-testid="sort-header-skor_total">
                  Skor Total <SortIcon column="skor_total" />
                </button>
              </th>
              {konfigurasi.map((k) => (
                <th key={k.key} className="px-4 py-3 text-left font-medium">
                  <button type="button" onClick={() => handleSort(k.key)} className="flex items-center gap-1 hover:text-white" data-testid={`sort-header-${k.key}`}>
                    {k.label} <SortIcon column={k.key} />
                  </button>
                </th>
              ))}
              {hasPreferensi && <th className="px-4 py-3 text-left font-medium">Preferensi</th>}
            </tr>
          </thead>
          <tbody>
            {sortedVendors.map((vendor) => {
              const isExpanded = expandedId === vendor.id;
              return (
                <React.Fragment key={vendor.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : vendor.id)}
                    className="border-b border-white/5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                    data-testid={`vendor-row-${vendor.id}`}
                  >
                    <td className="px-4 py-3"><RankBadge rank={vendor.rank} /></td>
                    <td className="px-4 py-3 text-white font-medium">{vendor.vendor_nama}</td>
                    <td className="px-4 py-3 text-white font-semibold">{vendor.skor_total.toFixed(1)}</td>
                    {konfigurasi.map((k) => (
                      <td key={k.key} className="px-4 py-3 text-gray-300">
                        {vendor.skor_per_kriteria[k.key] ?? '—'}
                      </td>
                    ))}
                    {hasPreferensi && (
                      <td className="px-4 py-3">
                        {vendor.tingkat_kesesuaian_preferensi ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${PREFERENSI_CLASS[vendor.tingkat_kesesuaian_preferensi]}`}>
                            {PREFERENSI_LABEL[vendor.tingkat_kesesuaian_preferensi]}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                  </tr>

                  {isExpanded && (
                    <tr className="border-b border-white/5 bg-white/[0.015]" data-testid={`vendor-row-expanded-${vendor.id}`}>
                      <td colSpan={colSpan} className="px-4 py-5">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            {konfigurasi.map((k) => (
                              <div key={k.key}>
                                <ScoreBar
                                  value={vendor.skor_per_kriteria[k.key] ?? 0}
                                  label={k.label}
                                  weight={k.bobot}
                                />
                                {vendor.catatan_per_kriteria?.[k.key] && (
                                  <p className="text-xs text-gray-500 mt-1">{vendor.catatan_per_kriteria[k.key]}</p>
                                )}
                              </div>
                            ))}
                          </div>
                          <div>
                            <CriteriaBarChart
                              vendorNama={vendor.vendor_nama}
                              scores={konfigurasi.map((k) => ({
                                kriteria: k.label,
                                skor: vendor.skor_per_kriteria[k.key] ?? 0,
                                bobot: k.bobot,
                              }))}
                            />
                          </div>
                        </div>

                        {vendor.profil_kualitatif && (
                          <p className="text-xs text-gray-400 mt-4" data-testid={`vendor-profil-kualitatif-${vendor.id}`}>
                            {vendor.profil_kualitatif}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
