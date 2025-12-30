export const siteConfig = {
  metadata: {
    titleTemplate: "%s | Waitlist",
    defaultTitle: "Waitlist",
    defaultDescription: "Join our waitlist to be the first to know when we launch.",
    favicon: "/favicon.ico",
    ogImage: "/og-image.png",
  },
  settings: {
    defaultTheme: "system" as const,
    forcedTheme: null as string | null,
    background: {
      lightColors: ["#F6F4F8", "#EFE9F3", "#F3DCE8", "#E3D8F6", "#D9E6F2", "#F6D6E3"],
      darkColors: ["#0F0F12", "#1B1A22", "#2A1F33", "#3B2A4A", "#2E3A55", "#4A355E"],
      speed: 0.5,
    },
  },
  header: {
    navbar: [
      { href: "/", title: "Waitlist" },
      { href: "/manifesto", title: "Manifesto" },
    ],
  },
  waitlist: {
    title: "Join the Waitlist",
    subtitle: "Be the first to know when we launch. Sign up now to get early access.",
    button: {
      idleCopy: "Join",
      successCopy: "You're in!",
      submittingCopy: "Joining...",
    },
    emailInput: {
      name: "email",
      type: "email",
      placeholder: "Enter your email",
      required: true,
    },
  },
  manifesto: {
    body: [
      "Learning should feel thoughtful, not rushed.",
      "We believe understanding comes from slowing down, asking better questions, and working through ideas step by step.",
      "Lyceum is built for people who want to think clearly, practice deeply, and truly understand what they are learning.",
      "There are no shortcuts to real learning. Progress comes from effort, reflection, and curiosity.",
      "Our goal is to create a space where learning feels calm, focused, and intentional, and where complex ideas are made approachable without being oversimplified.",
      "Lyceum is not about consuming more information. It is about building understanding that lasts."
    ],
    author: {
      signatureName: "Connor",
      name: "Connor Love",
      role: "Founder, Lyceum",
    },
  },
  
  
  footer: {
    copyright: "© 2025 Lyceum Project. All rights reserved.",
    showThemeSwitcher: true,
  },
  //logo: {
  //  dark: "/logo-dark.svg",
  //  light: "/logo-light.svg",
  //  alt: "Logo",
  //},
}

export type SiteConfig = typeof siteConfig
