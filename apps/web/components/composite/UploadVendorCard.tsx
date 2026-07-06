'use client';

import React, { useState } from 'react';
import type { AddVendorPayload } from 'types';
import { useDocumentExtraction } from '@/hooks/useDocumentExtraction';
import VendorInputCard from '@/components/composite/VendorInputCard';

export interface UploadVendorCardProps {
  evaluasiId: string;
  uploadId: string | null;
  fileName: string;
  uploadError: string | null;
  onRemove: () => void;
  onSave: (data: AddVendorPayload) => Promise<void>;
}

export default function UploadVendorCard({
  evaluasiId,
  uploadId,
  fileName,
  uploadError,
  onRemove,
  onSave,
}: UploadVendorCardProps) {
  const [manualFallback, setManualFallback] = useState(false);
  const extraction = useDocumentExtraction(evaluasiId, uploadId);

  if (manualFallback) {
    return <VendorInputCard vendor={null} mode="manual" onRemove={onRemove} onSave={onSave} />;
  }

  if (uploadError) {
    return (
      <VendorInputCard
        vendor={null}
        mode="error"
        onRemove={onRemove}
        onSave={onSave}
        errorMessage={uploadError}
        onRetryManual={() => setManualFallback(true)}
      />
    );
  }

  if (extraction.status === 'failed' || extraction.status === 'timeout') {
    return (
      <VendorInputCard
        vendor={null}
        mode="error"
        onRemove={onRemove}
        onSave={onSave}
        errorMessage={
          extraction.status === 'timeout'
            ? `Ekstraksi dokumen "${fileName}" melebihi batas waktu. Coba upload ulang atau input manual.`
            : `AI gagal mengekstrak data dari dokumen "${fileName}".`
        }
        onRetryManual={() => setManualFallback(true)}
      />
    );
  }

  if (extraction.status === 'done' || extraction.status === 'done_partial') {
    return (
      <VendorInputCard
        vendor={null}
        mode="extracted"
        onRemove={onRemove}
        onSave={onSave}
        hasilEkstraksi={extraction.hasilEkstraksi}
        confidenceScore={extraction.confidenceScore}
        indexingRagStatus={extraction.indexingRagStatus}
      />
    );
  }

  return (
    <VendorInputCard vendor={null} mode="loading" onRemove={onRemove} onSave={onSave} fileName={fileName} />
  );
}
