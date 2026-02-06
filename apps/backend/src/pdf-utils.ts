const pdfParseModule = require('pdf-parse');

type LegacyPdfParseResult = {
  text?: string;
};

type LegacyPdfParseFn = (data: Buffer) => Promise<LegacyPdfParseResult>;

type PdfParseV2Instance = {
  getText: () => Promise<{ text?: string }>;
  destroy?: () => Promise<void> | void;
};

type PdfParseV2Ctor = new (options: { data: Buffer }) => PdfParseV2Instance;

const resolveLegacyParser = (): LegacyPdfParseFn | null => {
  if (typeof pdfParseModule === 'function') {
    return pdfParseModule as LegacyPdfParseFn;
  }
  if (pdfParseModule && typeof pdfParseModule.default === 'function') {
    return pdfParseModule.default as LegacyPdfParseFn;
  }
  return null;
};

const resolveV2Ctor = (): PdfParseV2Ctor | null => {
  if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
    return pdfParseModule.PDFParse as PdfParseV2Ctor;
  }
  return null;
};

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const legacyParser = resolveLegacyParser();
  if (legacyParser) {
    const result = await legacyParser(buffer);
    return typeof result?.text === 'string' ? result.text : '';
  }

  const PdfParseCtor = resolveV2Ctor();
  if (PdfParseCtor) {
    const parser = new PdfParseCtor({ data: buffer });
    try {
      const result = await parser.getText();
      return typeof result?.text === 'string' ? result.text : '';
    } finally {
      await parser.destroy?.();
    }
  }

  throw new Error('Unsupported pdf-parse export shape');
}
