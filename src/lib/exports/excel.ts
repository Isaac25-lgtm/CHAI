/**
 * CHAI PMTCT System - Excel/CSV Generation Utilities
 *
 * Uses the `xlsx` (SheetJS) library to produce Excel workbooks and CSV strings
 * from arrays of flat row objects.
 */

import * as XLSX from 'xlsx';

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Excel generation
// ---------------------------------------------------------------------------

/**
 * Creates an Excel (.xlsx) workbook buffer from an array of row objects.
 *
 * - Column headers are derived from the keys of the first row object.
 * - Column widths are auto-calculated based on header/data length.
 * - Returns a Node.js Buffer suitable for streaming as a response body.
 */
export function generateExcelBuffer(
  data: Row[],
  sheetName = 'Export',
): Buffer {
  const workbook = XLSX.utils.book_new();

  // Handle empty dataset gracefully
  if (data.length === 0) {
    const emptySheet = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(workbook, emptySheet, sheetName);
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-calculate column widths
  const headers = Object.keys(data[0]);
  const colWidths = headers.map((header) => {
    // Start with header length
    let maxLen = header.length;

    // Check first 100 rows for max content width
    const sampleSize = Math.min(data.length, 100);
    for (let i = 0; i < sampleSize; i++) {
      const cellValue = data[i][header];
      const cellLen = cellValue != null ? String(cellValue).length : 0;
      if (cellLen > maxLen) maxLen = cellLen;
    }

    // Clamp between 10 and 50 characters
    return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
  });

  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31)); // Sheet name max 31 chars

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

/**
 * Creates a CSV string from an array of row objects.
 *
 * - Uses the `xlsx` library's CSV output for consistent quoting/escaping.
 * - Handles commas, quotes, and newlines in cell values.
 */
export function generateCSVString(data: Row[]): string {
  if (data.length === 0) {
    return 'No data available\n';
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(worksheet);
}
