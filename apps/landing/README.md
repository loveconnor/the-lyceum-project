# Lyceum Landing

The marketing and waitlist site for The Lyceum Project, built with Next.js and modern design components.

## Overview

This app serves as the public-facing marketing site for The Lyceum Project, designed to introduce potential users to the platform and capture early interest through waitlist signups.

### Key Pages

- **Homepage** (`/`): Hero section, features overview, stats, testimonials, and FAQs
- **About** (`/about`): Company story, mission, founder testimonial, and call-to-action  
- **Pricing** (`/pricing`): Subscription tiers and feature comparisons
- **Privacy Policy** (`/privacy-policy`): Data collection and usage policies
- **404 Page**: Custom error handling for better user experience

### Key Features

- **Waitlist Signup**: Email collection with backend integration
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **Marketing Components**: Reusable sections (heroes, features, pricing tables, testimonials)
- **Performance Optimized**: Fast loading with optimized images and minimal JS
- **SEO Ready**: Proper meta tags, structured data, and social sharing

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom design system
- **Components**: Custom UI component library with various layouts
- **Icons**: Custom SVG icon system  
- **Images**: Next.js optimized images with responsive loading
- **Forms**: Custom form handling with validation and backend integration

## Development

### Prerequisites

- Node.js 20.18+
- pnpm 9.15+

### Getting Started

```bash
# From the root of the monorepo
npnpm install

# Start the landing dev server
pnpm dev --filter=lyceum-landing

# Or from this directory
cd apps/landing
pnpm dev
```

The landing site will be available at http://localhost:3000

### Project Structure

```
src/
  app/
    about/           # About page
    pricing/         # Pricing page  
    privacy-policy/  # Privacy policy
    404/             # Custom 404 page
    layout.tsx       # Root layout with navbar/footer
    page.tsx         # Homepage
  components/
    elements/        # Basic UI elements (buttons, links, forms)
    icons/           # SVG icon components
    sections/        # Page sections (heroes, features, CTAs)
    ui/              # Base UI components
  styles/
    globals.css      # Global styles and Tailwind imports
```

### Component System

The landing app uses a comprehensive component system:

- **Elements**: Basic building blocks (Button, Link, Container, etc.)
- **Sections**: Complete page sections (Hero, Features, Pricing, etc.)
- **Icons**: Custom SVG icons for branding and UI
- **Layouts**: Page layout components with consistent navigation

### Design System

Built with a cohesive design system including:

- Typography scales and font loading
- Color palette with light/dark mode support  
- Spacing and layout utilities
- Custom animation and transitions
- Responsive breakpoints and grid systems

## Backend Integration

The waitlist signup integrates with the backend API:

- **Endpoint**: `POST /waitlist`
- **Data**: Email address, source identifier, and optional metadata
- **Validation**: Client and server-side email validation
- **Response**: Success/error handling with user feedback
- **Features**: Duplicate email detection, confirmation emails, loading states

### Testing the Integration

1. **Start the backend server** (required):
   ```bash
   cd apps/backend
   pnpm dev
   # Backend will run on http://localhost:8080
   ```

2. **Start the landing app**:
   ```bash
   cd apps/landing
   pnpm dev
   # Landing will run on http://localhost:3000
   ```

3. **Test the waitlist signup**:
   - Visit http://localhost:3000
   - Enter an email in the hero form
   - Check for success confirmation and email
   - Try duplicate email to test error handling

4. **Run automated tests** (from project root):
   ```bash
   ./test-waitlist.sh
   ```

## Deployment

The landing site is deployed to Vercel with automatic builds from the main branch.

### Build Process

```bash
# Build for production
pnpm build

# Test the production build locally
pnpm start
```

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API endpoint for waitlist signup
- `NEXT_PUBLIC_SITE_URL`: Canonical site URL for SEO

## SEO & Performance

### SEO Optimizations

- Meta tags for all pages
- Open Graph and Twitter Card support
- Semantic HTML structure
- Structured data markup
- XML sitemap generation

### Performance Features

- Image optimization with Next.js
- Code splitting and lazy loading
- CSS optimization with Tailwind JIT
- Minimal JavaScript bundle size
- Fast loading with proper caching headers

## Analytics & Tracking

Ready for analytics integration:

- Google Analytics 4 support
- Custom event tracking for waitlist signups
- Performance monitoring
- Conversion funnel analysis

## Contributing

See the main project [contributing guidelines](../../CONTRIBUTING.md) for detailed information on:

- Code style and conventions
- Component development patterns  
- Design system usage
- Testing requirements
- Pull request process

## Troubleshooting

### Common Issues

- **Build failures**: Check Node.js and pnpm versions
- **Styling issues**: Verify Tailwind CSS is building correctly
- **Image loading**: Ensure images exist in the public directory
- **API integration**: Check backend endpoint configuration

### Development Tips

- Use the Tailwind CSS IntelliSense extension
- Test responsive design on multiple devices
- Validate forms thoroughly before deployment
- Test waitlist signup integration with backend

For additional help, refer to the main project documentation or create an issue in the repository.
