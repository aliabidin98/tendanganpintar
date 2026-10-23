/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { downloadFile } from '../game/questionManager';

export const ADMIN_DOWNLOAD_PASSWORD = 'admin1212';

/**
 * Downloads the complete standalone single-file HTML bundle.
 * Requires verification with password: 'admin1212'.
 */
export async function downloadSingleFileBundle(password: string): Promise<{ success: boolean; message: string }> {
  if (password.trim() !== ADMIN_DOWNLOAD_PASSWORD) {
    return {
      success: false,
      message: 'Password salah! Akses ditolak. Silakan masukkan password admin yang benar.',
    };
  }

  try {
    // Attempt fetching the pre-built single-file HTML bundle from public/docs
    const candidates = [
      './ar-tendangan-pintar-singlefile.html',
      '/ar-tendangan-pintar-singlefile.html',
    ];

    let htmlText = '';
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          htmlText = await res.text();
          if (htmlText.length > 500 && htmlText.includes('<!doctype html>')) {
            break;
          }
        }
      } catch {
        // try next candidate
      }
    }

    if (!htmlText) {
      // Fallback: construct current document snapshot with embedded styles and app root
      const docHtml = document.documentElement.outerHTML;
      htmlText = `<!doctype html>\n${docHtml}`;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `ar-tendangan-pintar-lengkap-${timestamp}.html`;

    downloadFile(htmlText, fileName, 'text/html;charset=utf-8');

    return {
      success: true,
      message: `Berhasil mengunduh kode lengkap (1 File HTML)! File ${fileName} siap dijalankan secara offline.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error downloading single file HTML:', err);
    return {
      success: false,
      message: `Terjadi kendala saat mengunduh file: ${errorMsg}`,
    };
  }
}
