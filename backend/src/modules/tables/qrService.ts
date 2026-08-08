import QRCode from "qrcode";
import archiver = require("archiver");
import { Readable } from "stream";
import { getTableById } from "./service";
import { AppError } from "../../utils/errorHandler";

/**
 * Construct the Self-Ordering URL for a specific table
 */
export const buildSelfOrderUrl = (tableId: string): string => {
  const baseUrl = process.env.SELF_ORDER_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/self-order?table=${tableId}`;
};

/**
 * Generate high-quality QR code image buffer for a URL
 */
export const generateQrCodeBuffer = async (url: string): Promise<Buffer> => {
  return QRCode.toBuffer(url, {
    type: "png",
    margin: 4,
    width: 600,
    errorCorrectionLevel: "M",
  });
};

/**
 * Generate ZIP archive containing QR codes for all active tables
 */
export const createQrCodeZipStream = async (tables: any[]): Promise<archiver.Archiver> => {
  const archiverLib = archiver as any;
  const archive = archiverLib("zip", {
    zlib: { level: 9 }, // Sets the compression level
  });

  // Process tables and generate QR buffers in memory
  const qrPromises = tables.map(async (table) => {
    const url = buildSelfOrderUrl(table.id);
    const buffer = await generateQrCodeBuffer(url);
    // Sanitize table code/name for safe filename
    const safeCode = table.code.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `table-${safeCode}-qr.png`;
    
    // Append buffer as file to archive
    archive.append(buffer, { name: filename });
  });

  // Wait for all QRs to be generated and appended
  await Promise.all(qrPromises);
  
  // Finalize the archive (we do not call finalize here; let the caller call it or call it immediately and return)
  archive.finalize();
  return archive;
};
