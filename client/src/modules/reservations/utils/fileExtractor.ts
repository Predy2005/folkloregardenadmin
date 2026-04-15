import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type SupportedFileType = 'pdf' | 'xlsx' | 'xls' | 'docx' | 'doc' | 'txt' | 'csv';

const SUPPORTED_EXTENSIONS: Record<string, SupportedFileType> = {
  '.pdf': 'pdf',
  '.xlsx': 'xlsx',
  '.xls': 'xls',
  '.docx': 'docx',
  '.doc': 'doc',
  '.txt': 'txt',
  '.csv': 'csv',
};

export const ACCEPTED_FILE_TYPES = Object.keys(SUPPORTED_EXTENSIONS).join(',');

export function getFileType(file: File): SupportedFileType | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] ?? null;
}

// Extract text from a PDF file
async function extractFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n');
}

// Extract text from an Excel file (.xlsx, .xls, .csv)
function extractFromExcel(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to CSV-like text for AI processing
    const text = XLSX.utils.sheet_to_csv(sheet, { FS: '\t', RS: '\n' });
    if (text.trim()) {
      sheets.push('--- List: ' + sheetName + ' ---\n' + text);
    }
  }

  return sheets.join('\n\n');
}

// Extract text from a Word document (.docx)
async function extractFromDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

// Extract text from a plain text file
async function extractFromText(file: File): Promise<string> {
  return file.text();
}

// Main entry point: extract text from any supported file
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = getFileType(file);
  if (!fileType) {
    throw new Error('Nepodporovaný typ souboru: ' + file.name);
  }

  const buffer = await file.arrayBuffer();

  switch (fileType) {
    case 'pdf':
      return extractFromPdf(buffer);
    case 'xlsx':
    case 'xls':
    case 'csv':
      return extractFromExcel(buffer);
    case 'docx':
    case 'doc':
      return extractFromDocx(buffer);
    case 'txt':
      return extractFromText(file);
  }
}
