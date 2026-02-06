"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPdfText = extractPdfText;
const pdfParseModule = require('pdf-parse');
const resolveLegacyParser = () => {
    if (typeof pdfParseModule === 'function') {
        return pdfParseModule;
    }
    if (pdfParseModule && typeof pdfParseModule.default === 'function') {
        return pdfParseModule.default;
    }
    return null;
};
const resolveV2Ctor = () => {
    if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
        return pdfParseModule.PDFParse;
    }
    return null;
};
async function extractPdfText(buffer) {
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
        }
        finally {
            await parser.destroy?.();
        }
    }
    throw new Error('Unsupported pdf-parse export shape');
}
