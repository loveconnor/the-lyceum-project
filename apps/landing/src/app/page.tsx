import { AnnouncementBadge } from '@/components/elements/announcement-badge'
import { EmailSignupForm } from '@/components/elements/email-signup-form'
import { Link } from '@/components/elements/link'
import { Screenshot } from '@/components/elements/screenshot'
import { ArrowNarrowRightIcon } from '@/components/icons/arrow-narrow-right-icon'
import { ChevronIcon } from '@/components/icons/chevron-icon'
import { CallToActionSimple } from '@/components/sections/call-to-action-simple'
import { FAQsTwoColumnAccordion, Faq } from '@/components/sections/faqs-two-column-accordion'
import { FeatureThreeColumnWithDemos, Features } from '@/components/sections/features-three-column-with-demos'
import { HeroWithDemoOnBackground } from '@/components/sections/hero-with-demo-on-background'
import { Stat, StatsWithGraph } from '@/components/sections/stats-with-graph'
import { Button } from '@/components/ui/button'
import NextLink from 'next/link'

export default function Page() {
  return (
    <>
      {/* Hero */}
      <HeroWithDemoOnBackground
        id="hero"
        headline="From curiosity to mastery, one personalized path at a time."
        subheadline={
          <p>
            Lyceum is an AI-powered learning platform that builds tailored learning paths, hands-on labs, and tutoring
            support so you always know what to learn next.
          </p>
        }
        cta={
          <EmailSignupForm
            className="max-w-full"
            variant="overlay"
            cta={
              <>
                Join waitlist <ArrowNarrowRightIcon />
              </>
            }
          />
        }
        demo={
          <>
            <img
              className="bg-white/75 md:hidden dark:hidden"
              src="/img/screenshots/dashboard.png"
              alt="Lyceum Dashboard"
              width="3440"
              height="1500"
            />
            <img
              className="bg-black/75 not-dark:hidden md:hidden"
              src="/img/screenshots/dashboard.png"
              alt="Lyceum Dashboard"
              width="3440"
              height="1500"
            />
            <img
              className="bg-white/75 max-md:hidden lg:hidden dark:hidden"
              src="/img/screenshots/dashboard.png"
              alt="Lyceum Dashboard"
              width="3440"
              height="1500"
            />
            <img
              className="bg-black/75 not-dark:hidden max-md:hidden lg:hidden"
              src="/img/screenshots/dashboard.png"
              alt="Lyceum Dashboard"
              width="3440"
              height="1500"
            />
            <img
              className="bg-white/75 max-lg:hidden dark:hidden"
              src="/img/screenshots/dashboard.png"
              alt="Lyceum Dashboard"
              width="3440"
              height="1500"
            />
            <img
              className="bg-black/75 not-dark:hidden max-lg:hidden"
              src="/img/screenshots/dashboard.png"
              alt="Lyceum Dashboard"
              width="3440"
              height="1500"
            />
          </>
        }
      />

      {/* Features */}
      <Features
        id="features"
        headline="Everything you need to learn by doing"
        subheadline={
          <p>
            Go from onboarding to active practice in minutes. Lyceum adapts your path, guides each module, and helps
            you reflect so progress is real, not just busy work.
          </p>
        }
        cta={
          <Link href="/about">
            See how Lyceum works <ArrowNarrowRightIcon />
          </Link>
        }
        features={
          <>
            <FeatureThreeColumnWithDemos
              demo={
                <Screenshot wallpaper="blue" placement="bottom-right">
                  <img
                    src="/img/screenshots/paths.png"
                    alt="Lyceum Learning Paths"
                    className="bg-white/75 sm:hidden dark:hidden"
                    width={1200}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/paths.png"
                    alt="Lyceum Learning Paths"
                    width={1200}
                    height={736}
                    className="bg-black/75 not-dark:hidden sm:hidden"
                  />
                  <img
                    src="/img/screenshots/paths.png"
                    alt="Lyceum Learning Paths"
                    className="bg-white/75 max-sm:hidden lg:hidden dark:hidden"
                    width={1800}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/paths.png"
                    alt="Lyceum Learning Paths"
                    width={1800}
                    height={736}
                    className="bg-black/75 not-dark:hidden max-sm:hidden lg:hidden"
                  />
                  <img
                    src="/img/screenshots/paths.png"
                    alt="Lyceum Learning Paths"
                    className="bg-white/75 max-lg:hidden dark:hidden"
                    width={1200}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/paths.png"
                    alt="Lyceum Learning Paths"
                    width={1200}
                    height={736}
                    className="bg-black/75 not-dark:hidden max-lg:hidden"
                  />
                </Screenshot>
              }
              headline="Personalized learning paths"
              subheadline={
                <p>
                  Start with your interests and level, then get an AI-generated path with module sequencing,
                  recommendations, and clear next steps.
                </p>
              }
            />
            <FeatureThreeColumnWithDemos
              demo={
                <Screenshot wallpaper="purple" placement="top-left">
                  <img
                    src="/img/screenshots/module.png"
                    alt="Lyceum Module Interface"
                    className="bg-white/75 sm:hidden dark:hidden"
                    width={1200}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/module.png"
                    alt="Lyceum Module Interface"
                    width={1200}
                    height={736}
                    className="bg-black/75 not-dark:hidden sm:hidden"
                  />
                  <img
                    src="/img/screenshots/module.png"
                    alt="Lyceum Module Interface"
                    className="bg-white/75 max-sm:hidden lg:hidden dark:hidden"
                    width={1800}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/module.png"
                    alt="Lyceum Module Interface"
                    width={1800}
                    height={736}
                    className="bg-black/75 not-dark:hidden max-sm:hidden lg:hidden"
                  />
                  <img
                    src="/img/screenshots/module.png"
                    alt="Lyceum Module Interface"
                    className="bg-white/75 max-lg:hidden dark:hidden"
                    width={1200}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/module.png"
                    alt="Lyceum Module Interface"
                    width={1200}
                    height={736}
                    className="bg-black/75 not-dark:hidden max-lg:hidden"
                  />
                </Screenshot>
              }
              headline="Hands-on labs and modules"
              subheadline={
                <p>
                  Practice with interactive labs across Analyze, Build, Derive, Explain, Explore, and Revise templates
                  while your step progress is saved.
                </p>
              }
            />
            <FeatureThreeColumnWithDemos
              demo={
                <Screenshot wallpaper="brown" placement="bottom-left">
                  <img
                    src="/img/screenshots/chat.png"
                    alt="Lyceum AI Chat Interface"
                    className="bg-white/75 sm:hidden dark:hidden"
                    width={1200}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/chat.png"
                    alt="Lyceum AI Chat Interface"
                    width={1200}
                    height={736}
                    className="bg-black/75 not-dark:hidden sm:hidden"
                  />
                  <img
                    src="/img/screenshots/chat.png"
                    alt="Lyceum AI Chat Interface"
                    className="bg-white/75 max-sm:hidden lg:hidden dark:hidden"
                    width={1800}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/chat.png"
                    alt="Lyceum AI Chat Interface"
                    width={1800}
                    height={736}
                    className="bg-black/75 not-dark:hidden max-sm:hidden lg:hidden"
                  />
                  <img
                    src="/img/screenshots/chat.png"
                    alt="Lyceum AI Chat Interface"
                    className="bg-white/75 max-lg:hidden dark:hidden"
                    width={1200}
                    height={736}
                  />
                  <img
                    src="/img/screenshots/chat.png"
                    alt="Lyceum AI Chat Interface"
                    width={1200}
                    height={736}
                    className="bg-black/75 not-dark:hidden max-lg:hidden"
                  />
                </Screenshot>
              }
              headline="AI tutor and reflection"
              subheadline={
                <p>
                  Ask for help in context, attach files, and capture short reflections so Lyceum can track both
                  completion and evidence of mastery.
                </p>
              }
            />
          </>
        }
      />

      {/* Stats */}
      <StatsWithGraph
        id="stats"
        eyebrow="Built for learning outcomes"
        headline="Progress signals and mastery signals are tracked separately"
        subheadline={
          <p>
            Lyceum distinguishes activity from understanding. Completion shows momentum, while mastery reflects
            demonstrated evidence through assessments, validated work, and structured reflection.
          </p>
        }
      >
        <Stat stat="6" text="Core lab templates for different learning styles." />
        <Stat stat="3" text="Reflection prompts that reinforce what you tried, learned, and would change." />
      </StatsWithGraph>

      {/* FAQs */}
      <FAQsTwoColumnAccordion id="faqs" headline="Questions & Answers">
        <Faq
          id="faq-1"
          question="Who is Lyceum for?"
          answer="Lyceum is built for self-directed learners, students, and teams that want guided structure without a fixed course schedule."
        />
        <Faq
          id="faq-2"
          question="How does personalization work?"
          answer="During onboarding, Lyceum uses your interests and starting level to generate a recommended path with modules, labs, and pacing assumptions."
        />
        <Faq
          id="faq-3"
          question="What happens if I get stuck in a lab?"
          answer="You can use the in-app AI assistant for explanations, examples, and next-step guidance while keeping your progress intact."
        />
        <Faq
          id="faq-4"
          question="Does completion mean I mastered a topic?"
          answer="Not automatically. Completion tracks required steps finished. Mastery is a separate signal based on evidence, such as assessment performance and reflection."
        />
      </FAQsTwoColumnAccordion>

      {/* Call To Action */}
      <CallToActionSimple
        id="call-to-action"
        headline="Ready to start learning with Lyceum?"
        subheadline={
          <p>
            Join the waitlist to get early access to AI-generated learning paths, interactive labs, and tutoring support
            inside the Lyceum web app.
          </p>
        }
        cta={
          <div className="flex items-center gap-4">
            <Button size="lg" asChild>
              <NextLink href="/#hero">Join waitlist</NextLink>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <NextLink href="/about">
                Learn more <ChevronIcon />
              </NextLink>
            </Button>
          </div>
        }
      />
    </>
  )
}
