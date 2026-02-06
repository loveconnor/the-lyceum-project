"use strict";
/**
 * Source Registry Adapters
 * Export all adapters and adapter factory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericHtmlAdapter = exports.GenericHtmlTocAdapter = exports.sphinxDocsAdapter = exports.SphinxDocsAdapter = exports.mitOcwAdapter = exports.MitOcwAdapter = exports.openStaxAdapter = exports.OpenStaxAdapter = exports.BaseAdapter = void 0;
exports.getAdapter = getAdapter;
var base_adapter_1 = require("./base-adapter");
Object.defineProperty(exports, "BaseAdapter", { enumerable: true, get: function () { return base_adapter_1.BaseAdapter; } });
var openstax_adapter_1 = require("./openstax-adapter");
Object.defineProperty(exports, "OpenStaxAdapter", { enumerable: true, get: function () { return openstax_adapter_1.OpenStaxAdapter; } });
Object.defineProperty(exports, "openStaxAdapter", { enumerable: true, get: function () { return openstax_adapter_1.openStaxAdapter; } });
var mit_ocw_adapter_1 = require("./mit-ocw-adapter");
Object.defineProperty(exports, "MitOcwAdapter", { enumerable: true, get: function () { return mit_ocw_adapter_1.MitOcwAdapter; } });
Object.defineProperty(exports, "mitOcwAdapter", { enumerable: true, get: function () { return mit_ocw_adapter_1.mitOcwAdapter; } });
var sphinx_docs_adapter_1 = require("./sphinx-docs-adapter");
Object.defineProperty(exports, "SphinxDocsAdapter", { enumerable: true, get: function () { return sphinx_docs_adapter_1.SphinxDocsAdapter; } });
Object.defineProperty(exports, "sphinxDocsAdapter", { enumerable: true, get: function () { return sphinx_docs_adapter_1.sphinxDocsAdapter; } });
var generic_html_adapter_1 = require("./generic-html-adapter");
Object.defineProperty(exports, "GenericHtmlTocAdapter", { enumerable: true, get: function () { return generic_html_adapter_1.GenericHtmlTocAdapter; } });
Object.defineProperty(exports, "genericHtmlAdapter", { enumerable: true, get: function () { return generic_html_adapter_1.genericHtmlAdapter; } });
const openstax_adapter_2 = require("./openstax-adapter");
const mit_ocw_adapter_2 = require("./mit-ocw-adapter");
const sphinx_docs_adapter_2 = require("./sphinx-docs-adapter");
const generic_html_adapter_2 = require("./generic-html-adapter");
/**
 * Get adapter instance by source type
 */
function getAdapter(sourceType) {
    switch (sourceType) {
        case 'openstax':
            return openstax_adapter_2.openStaxAdapter;
        case 'mit_ocw':
            return mit_ocw_adapter_2.mitOcwAdapter;
        case 'sphinx_docs':
            return sphinx_docs_adapter_2.sphinxDocsAdapter;
        case 'generic_html':
            return generic_html_adapter_2.genericHtmlAdapter;
        case 'custom':
            // Custom adapters should be instantiated separately
            return generic_html_adapter_2.genericHtmlAdapter;
        default:
            throw new Error(`Unknown source type: ${sourceType}`);
    }
}
