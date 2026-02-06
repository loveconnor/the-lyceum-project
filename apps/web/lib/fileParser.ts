// Dynamic imports to avoid SSR issues
let mammoth: typeof import('mammoth') | null = null;

// Initialize libraries on client side only
if (typeof window !== 'undefined') {
  import('mammoth').then((module) => {
    mammoth = module.default || module;
    console.log('✅ Mammoth loaded');
  }).catch((error) => {
    console.error('Failed to load Mammoth:', error);
  });
}

/**
 * Parse a file and extract its text content
 * Supports: .txt, .md, .docx, .doc, and code files
 * Note: PDFs are read as base64 and should be parsed on the backend
 */
export async function parseFileContent(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  
  // Handle PDF files - encode as base64 for backend processing
  if (fileName.endsWith('.pdf')) {
    return await parsePDFAsBase64(file);
  }
  
  // Handle DOCX files
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return await parseDOCX(file);
  }
  
  // Handle all other text-based files
  return await parseTextFile(file);
}

/**
 * Parse a PDF file and return as base64 for backend processing
 */
async function parsePDFAsBase64(file: File): Promise<string> {
  try {
    // Use FileReader -> data URL to avoid expensive string concatenation on large PDFs
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Invalid FileReader result type'));
          return;
        }

        const commaIndex = result.indexOf(',');
        if (commaIndex < 0) {
          reject(new Error('Invalid data URL for PDF'));
          return;
        }

        resolve(result.slice(commaIndex + 1));
      };

      reader.onerror = () => reject(reader.error || new Error('Failed to read PDF file'));
      reader.readAsDataURL(file);
    });
    
    console.log(`✅ [FILE PARSER] Encoded PDF as base64 for backend processing: ${file.name}`);
    return `[PDF_BASE64]${base64}`;
  } catch (error) {
    console.error('❌ [FILE PARSER] Error encoding PDF:', error);
    throw new Error(`Failed to encode PDF file: ${(error as Error).message}`);
  }
}

/**
 * Parse a DOCX file and extract text
 */
async function parseDOCX(file: File): Promise<string> {
  if (!mammoth) {
    throw new Error('DOCX library not loaded. Please try again.');
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('[FILE PARSER] DOCX parsing warnings:', result.messages);
    }
    
    console.log(`✅ [FILE PARSER] Extracted ${result.value.length} characters from DOCX: ${file.name}`);
    return result.value;
  } catch (error) {
    console.error('❌ [FILE PARSER] Error parsing DOCX:', error);
    throw new Error(`Failed to parse DOCX file: ${(error as Error).message}`);
  }
}

/**
 * Parse a plain text file (including code files)
 */
async function parseTextFile(file: File): Promise<string> {
  try {
    const text = await file.text();
    console.log(`✅ [FILE PARSER] Read ${text.length} characters from ${file.name}`);
    return text;
  } catch (error) {
    console.error('❌ [FILE PARSER] Error reading text file:', error);
    throw new Error(`Failed to read file: ${(error as Error).message}`);
  }
}

/**
 * Parse multiple files and combine their content
 */
export async function parseMultipleFiles(files: File[]): Promise<string> {
  const parsedContents = await Promise.all(
    files.map(async (file) => {
      const content = await parseFileContent(file);
      return `--- ${file.name} ---\n\n${content}`;
    })
  );
  
  return parsedContents.join('\n\n---\n\n');
}
