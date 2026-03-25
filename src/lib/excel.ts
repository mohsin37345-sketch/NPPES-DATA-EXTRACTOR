import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Reads an uploaded Excel/CSV file Buffer and returns a structured array of objects.
 * Keys in objects correspond to the actual column headers.
 */
export async function parseExcelData(buffer: Buffer): Promise<any[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  if (!workbook.SheetNames.length) {
    throw new Error('Excel file has no sheets.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert sheet to json array of objects. defval: '' string fills in empty cells
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  return data;
}

/**
 * Creates an Excel stream/buffer given the final array of rows.
 */
export async function buildOutputExcel(rows: any[]): Promise<Buffer> {
  if (rows.length === 0) {
    throw new Error('No data to write to output.');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Extracted NPPES Data');

  // Extract all columns from first row (assuming rows are uniform objects)
  const columns = Object.keys(rows[0]).map(key => ({
    header: key,
    key: key,
    width: 20 // default width
  }));

  worksheet.columns = columns;

  // Add rows
  worksheet.addRows(rows);

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer
  return (await workbook.xlsx.writeBuffer()) as Buffer;
}
