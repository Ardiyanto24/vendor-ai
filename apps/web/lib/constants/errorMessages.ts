export const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  INVALID_CREDENTIALS: 'Email atau password salah. Silakan coba lagi.',
  UNAUTHORIZED: 'Sesi Anda telah berakhir atau tidak valid. Silakan login kembali.',
  FORBIDDEN: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.',
  TOKEN_EXPIRED: 'Sesi Anda telah berakhir. Silakan login kembali.',

  // Evaluasi & kriteria errors
  INVALID_WEIGHT_TOTAL: 'Total bobot kriteria harus tepat 100%.',
  VENDOR_LIMIT_EXCEEDED: 'Jumlah vendor melebihi batas maksimal (10 vendor).',
  INSUFFICIENT_VENDORS: 'Jumlah vendor kurang dari batas minimum (minimal 2 vendor).',
  PREFERENCE_TOO_LONG: 'Form preferensi perusahaan maksimal 1.000 karakter.',

  // Upload/File errors
  FILE_TOO_LARGE: 'Ukuran file terlalu besar. Maksimal ukuran file adalah 10MB.',
  INVALID_FILE_TYPE: 'Format file tidak didukung. Harap upload file PDF atau Excel.',

  // General errors
  INTERNAL_SERVER_ERROR: 'Terjadi kesalahan internal pada server. Harap coba lagi nanti.',
  VALIDATION_ERROR: 'Data yang dimasukkan tidak valid. Harap periksa kembali input Anda.',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
};

export const getErrorMessage = (code: string): string => {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
};
