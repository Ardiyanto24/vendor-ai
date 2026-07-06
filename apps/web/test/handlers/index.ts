// import { handlers as authHandlers } from './auth';
import { handlers as evaluasiHandlers } from './evaluasi';
import { handlers as vendorHandlers } from './vendor';
import { handlers as konfigurasiHandlers } from './konfigurasi';
import { handlers as dokumenHandlers } from './dokumen';

export const handlers = [
  // ...authHandlers,
  ...evaluasiHandlers,
  ...vendorHandlers,
  ...konfigurasiHandlers,
  ...dokumenHandlers,
];
