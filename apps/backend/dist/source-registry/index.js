"use strict";
/**
 * Source Registry - Main Export
 * Source Discovery + Validation Service for Lyceum
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUrlAllowed = exports.isDomainAllowed = exports.getSeedsByType = exports.getSeedByName = exports.ALLOWED_DOMAINS = exports.SEED_SOURCES = exports.genericHtmlAdapter = exports.GenericHtmlTocAdapter = exports.sphinxDocsAdapter = exports.SphinxDocsAdapter = exports.mitOcwAdapter = exports.MitOcwAdapter = exports.openStaxAdapter = exports.OpenStaxAdapter = exports.BaseAdapter = exports.getAdapter = exports.KNOWN_DOC_SOURCES = exports.WebDocsSearcher = exports.MitOcwFetcher = exports.DynamicSourceFetcher = exports.renderModuleOnDemand = exports.synthesizeModuleContent = exports.formatCitationsDisplay = exports.buildCitations = exports.retrieveNodesContent = exports.extractContentFromUrl = exports.resolveNodesForModule = exports.selectNodesForModule = exports.ModuleGroundingService = exports.RegistryLogger = exports.logger = exports.Fetcher = exports.fetcher = exports.RegistryService = void 0;
// Types
__exportStar(require("./types"), exports);
__exportStar(require("./module-grounding-types"), exports);
// Services
var registry_service_1 = require("./registry-service");
Object.defineProperty(exports, "RegistryService", { enumerable: true, get: function () { return registry_service_1.RegistryService; } });
var fetcher_1 = require("./fetcher");
Object.defineProperty(exports, "fetcher", { enumerable: true, get: function () { return fetcher_1.fetcher; } });
Object.defineProperty(exports, "Fetcher", { enumerable: true, get: function () { return fetcher_1.Fetcher; } });
var logger_1 = require("./logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
Object.defineProperty(exports, "RegistryLogger", { enumerable: true, get: function () { return logger_1.RegistryLogger; } });
// Module Grounding Services
var module_grounding_service_1 = require("./module-grounding-service");
Object.defineProperty(exports, "ModuleGroundingService", { enumerable: true, get: function () { return module_grounding_service_1.ModuleGroundingService; } });
var module_node_resolver_1 = require("./module-node-resolver");
Object.defineProperty(exports, "selectNodesForModule", { enumerable: true, get: function () { return module_node_resolver_1.selectNodesForModule; } });
Object.defineProperty(exports, "resolveNodesForModule", { enumerable: true, get: function () { return module_node_resolver_1.resolveNodesForModule; } });
var module_content_retriever_1 = require("./module-content-retriever");
Object.defineProperty(exports, "extractContentFromUrl", { enumerable: true, get: function () { return module_content_retriever_1.extractContentFromUrl; } });
Object.defineProperty(exports, "retrieveNodesContent", { enumerable: true, get: function () { return module_content_retriever_1.retrieveNodesContent; } });
Object.defineProperty(exports, "buildCitations", { enumerable: true, get: function () { return module_content_retriever_1.buildCitations; } });
Object.defineProperty(exports, "formatCitationsDisplay", { enumerable: true, get: function () { return module_content_retriever_1.formatCitationsDisplay; } });
var module_content_synthesizer_1 = require("./module-content-synthesizer");
Object.defineProperty(exports, "synthesizeModuleContent", { enumerable: true, get: function () { return module_content_synthesizer_1.synthesizeModuleContent; } });
Object.defineProperty(exports, "renderModuleOnDemand", { enumerable: true, get: function () { return module_content_synthesizer_1.renderModuleOnDemand; } });
var dynamic_source_fetcher_1 = require("./dynamic-source-fetcher");
Object.defineProperty(exports, "DynamicSourceFetcher", { enumerable: true, get: function () { return dynamic_source_fetcher_1.DynamicSourceFetcher; } });
var mit_ocw_fetcher_1 = require("./mit-ocw-fetcher");
Object.defineProperty(exports, "MitOcwFetcher", { enumerable: true, get: function () { return mit_ocw_fetcher_1.MitOcwFetcher; } });
var web_docs_searcher_1 = require("./web-docs-searcher");
Object.defineProperty(exports, "WebDocsSearcher", { enumerable: true, get: function () { return web_docs_searcher_1.WebDocsSearcher; } });
Object.defineProperty(exports, "KNOWN_DOC_SOURCES", { enumerable: true, get: function () { return web_docs_searcher_1.KNOWN_DOC_SOURCES; } });
// Adapters
var adapters_1 = require("./adapters");
Object.defineProperty(exports, "getAdapter", { enumerable: true, get: function () { return adapters_1.getAdapter; } });
Object.defineProperty(exports, "BaseAdapter", { enumerable: true, get: function () { return adapters_1.BaseAdapter; } });
Object.defineProperty(exports, "OpenStaxAdapter", { enumerable: true, get: function () { return adapters_1.OpenStaxAdapter; } });
Object.defineProperty(exports, "openStaxAdapter", { enumerable: true, get: function () { return adapters_1.openStaxAdapter; } });
Object.defineProperty(exports, "MitOcwAdapter", { enumerable: true, get: function () { return adapters_1.MitOcwAdapter; } });
Object.defineProperty(exports, "mitOcwAdapter", { enumerable: true, get: function () { return adapters_1.mitOcwAdapter; } });
Object.defineProperty(exports, "SphinxDocsAdapter", { enumerable: true, get: function () { return adapters_1.SphinxDocsAdapter; } });
Object.defineProperty(exports, "sphinxDocsAdapter", { enumerable: true, get: function () { return adapters_1.sphinxDocsAdapter; } });
Object.defineProperty(exports, "GenericHtmlTocAdapter", { enumerable: true, get: function () { return adapters_1.GenericHtmlTocAdapter; } });
Object.defineProperty(exports, "genericHtmlAdapter", { enumerable: true, get: function () { return adapters_1.genericHtmlAdapter; } });
// Seeds
var seeds_1 = require("./seeds");
Object.defineProperty(exports, "SEED_SOURCES", { enumerable: true, get: function () { return seeds_1.SEED_SOURCES; } });
Object.defineProperty(exports, "ALLOWED_DOMAINS", { enumerable: true, get: function () { return seeds_1.ALLOWED_DOMAINS; } });
Object.defineProperty(exports, "getSeedByName", { enumerable: true, get: function () { return seeds_1.getSeedByName; } });
Object.defineProperty(exports, "getSeedsByType", { enumerable: true, get: function () { return seeds_1.getSeedsByType; } });
Object.defineProperty(exports, "isDomainAllowed", { enumerable: true, get: function () { return seeds_1.isDomainAllowed; } });
Object.defineProperty(exports, "isUrlAllowed", { enumerable: true, get: function () { return seeds_1.isUrlAllowed; } });
