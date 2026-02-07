# Lyceum Docs

The documentation site for The Lyceum Project, built with Next.js and Markdoc.

## Overview

This app provides comprehensive documentation for The Lyceum Project learning platform, including:

- **User Guides**: Getting started, learning paths, labs, reflections, AI assistant
- **Technical Documentation**: Architecture, deployment, environment setup
- **API References**: Backend service integration and endpoints
- **Contributing Guidelines**: How to contribute to the project
- **Troubleshooting**: Common issues and solutions
- **Developer Resources**: Writing plugins, customization guides

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Content**: Markdoc for structured documentation
- **Styling**: Tailwind CSS with custom design system
- **Search**: FlexSearch for fast client-side search
- **Math**: KaTeX for mathematical expressions
- **Code Highlighting**: Prism for syntax highlighting

## Development

### Prerequisites

- Node.js 20.18+ 
- pnpm 9.15+

### Getting Started

```bash
# From the root of the monorepo
pnpm install

# Start the docs dev server
pnpm dev --filter=lyceum-docs

# Or from this directory
cd apps/docs
pnpm dev
```

The docs will be available at http://localhost:3000

### Project Structure

```
src/
  app/
    docs/           # Documentation pages
      [...slug]/     # Dynamic routes for docs
      */             # Individual doc sections
    layout.tsx       # Root layout
    page.tsx         # Homepage redirect
  components/
    Layout.tsx       # Main layout component
    */               # Shared UI components
  lib/
    navigation.ts    # Sidebar navigation config
    search.ts        # Search functionality
  markdoc/
    tags/            # Custom Markdoc tags
    nodes/           # Custom Markdoc nodes
```

### Adding Documentation

1. Create new `.md` files in `src/app/docs/[section]/`
2. Add navigation entries in `src/lib/navigation.ts`
3. Use Markdoc syntax for rich formatting
4. Test locally before committing

### Custom Markdoc Components

The docs support custom components for enhanced content:

- Code blocks with syntax highlighting
- Callout boxes for tips and warnings
- Interactive examples
- Math expressions with KaTeX
- Responsive images and figures

## Deployment

The docs are deployed to Vercel with automatic builds from the main branch.

### Build Process

```bash
# Build for production
pnpm build

# Test the production build locally
pnpm start
```

### Environment Variables

No environment variables are required for basic functionality.

## Contributing

See the main project [contributing guidelines](../../CONTRIBUTING.md) and the [docs contribution guide](src/app/docs/contributing/page.md) for detailed information.

## Troubleshooting

### Common Issues

- **Build failures**: Check Node.js and pnpm versions match requirements
- **Search not working**: Ensure FlexSearch index is building correctly
- **Math not rendering**: Verify KaTeX styles are loading

For more help, see the [troubleshooting guide](src/app/docs/troubleshooting/page.md).