import * as XLSX from 'xlsx';

/**
 * Export tabular data to an XLSX file and trigger download.
 *
 * @param {Record<string, any>[]} data - Array of row objects.
 * @param {string[]} headers - Column header labels (display names).
 * @param {string[]} keys - Object keys corresponding to each header.
 * @param {string} filename - Name for the downloaded file (without extension).
 */
export function exportToXlsx(
    data: Record<string, any>[],
    headers: string[],
    keys: string[],
    filename: string
): void {
    // Build rows: header row + data rows
    const rows = data.map(row => keys.map(key => row[key] ?? ''));
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-size columns based on header/data widths
    worksheet['!cols'] = headers.map((header, i) => {
        const maxDataLen = rows.reduce((max, row) => {
            const val = String(row[i] ?? '');
            return Math.max(max, val.length);
        }, header.length);
        return { wch: Math.min(maxDataLen + 2, 50) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    XLSX.writeFile(workbook, `${filename}.xlsx`);
}
