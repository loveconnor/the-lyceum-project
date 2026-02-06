import { ButtonLink, PlainButtonLink } from '@/components/elements/button'
import { Main } from '@/components/elements/main'
import { ChevronIcon } from '@/components/icons/chevron-icon'
import { CallToActionSimpleCentered } from '@/components/sections/call-to-action-simple-centered'
import {
  FooterLink,
  FooterWithLinksAndSocialIcons,
  SocialLink,
} from '@/components/sections/footer-with-links-and-social-icons'
import { HeroSimpleCentered } from '@/components/sections/hero-simple-centered'
import {
  NavbarLink,
  NavbarLogo,
  NavbarWithLogoActionsAndLeftAlignedLinks,
} from '@/components/sections/navbar-with-logo-actions-and-left-aligned-links'
import { Stat, StatsThreeColumnWithDescription } from '@/components/sections/stats-three-column-with-description'
import { TeamFourColumnGrid, TeamMember } from '@/components/sections/team-four-column-grid'
import { TestimonialLargeQuote } from '@/components/sections/testimonial-with-large-quote'

export default function Page() {
  return (
    <>
      <Main>
        {/* Hero */}
        <HeroSimpleCentered
          id="hero"
          headline="Learn anything, your way."
          subheadline={
            <p>
              The Lyceum Project creates personalized learning paths that adapt to your interests and pace. 
              Get hands-on practice, AI tutoring, and track your progress as you master new skills.
            </p>
          }
        />

        {/* Stats */}
        <StatsThreeColumnWithDescription
          id="stats"
          heading="About The Lyceum Project"
          description={
            <>
              <p>
                The Lyceum Project was created to solve a simple problem: learning on your own is hard. 
                You need structure, but also flexibility. You need help when you're stuck, but also independence to explore.
              </p>
              <p>
                Our AI-powered learning platform creates a personalized path just for you. Whether you want to learn 
                programming, math, science, or writing, we start with your interests and current level, then build 
                a step-by-step journey to mastery.
              </p>
              <p>
                What makes us different is the combination of personalized paths, hands-on labs that you can practice in, 
                an AI tutor that's always available, and a reflection system that helps you learn from what works. 
                It's like having a private tutor who knows exactly what you need to learn next.
              </p>
            </>
          }
        >
          <Stat stat="100%" text="Personalized learning paths tailored to your interests and level." />
          <Stat stat="24/7" text="AI assistant ready to help explain concepts and guide your learning." />
          <Stat stat="Unlimited" text="Hands-on labs and practice exercises across multiple subjects." />
        </StatsThreeColumnWithDescription>

        {/* Testimonial */}
        <TestimonialLargeQuote
          id="testimonial"
          quote={
            <p>
              The Lyceum Project changed how I learn. Instead of jumping between random tutorials, I have a clear path 
              that builds on what I already know. The labs let me practice immediately, and the AI tutor helps when I'm confused. 
              It's like having a personal learning coach.
            </p>
          }
          img={
            <img
              src="https://assets.tailwindplus.com/avatars/10.webp?size=160"
              alt=""
              className="not-dark:bg-white/75 dark:bg-black/75"
              width={160}
              height={160}
            />
          }
          name="Alex Chen"
          byline="Software Developer & Lifelong Learner"
        />

        {/* Call To Action */}
        <CallToActionSimpleCentered
          id="call-to-action"
          headline="Ready to start learning?"
          subheadline={
            <p>Join The Lyceum Project and get a personalized learning path designed just for you.</p>
          }
          cta={
            <div className="flex items-center gap-4">
              <ButtonLink href="#" size="lg">
                Get started
              </ButtonLink>

              <PlainButtonLink href="#" size="lg">
                Learn more <ChevronIcon />
              </PlainButtonLink>
            </div>
          }
        />
      </Main>
    </>
  )
}
