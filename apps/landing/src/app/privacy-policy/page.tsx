import Link from 'next/link'

import { DocumentCentered } from '@/components/sections/document-centered'

export default function Page() {
  return (
    <>
      <DocumentCentered id="document" headline="Privacy Policy" subheadline={<p>Last updated on February 6, 2026.</p>}>
        <p>
          The Lyceum Project, also referred to as <strong>Lyceum</strong>, <strong>we</strong>, <strong>us</strong>,
          and <strong>our</strong>, respects your privacy. This Privacy Policy explains the categories of information
          we collect, how we use it, and the choices available to you when using our websites and applications
          (collectively, the <strong>Services</strong>).
        </p>

        <h2>Information We Collect</h2>
        <p>Depending on how you use Lyceum, we may collect information such as:</p>
        <ul>
          <li>Account information (name, email address, login details)</li>
          <li>Profile and preference data (interests, starting level, settings)</li>
          <li>Learning activity (paths, modules, labs, reflections, progress status)</li>
          <li>AI assistant interactions (messages, optional file uploads, related metadata)</li>
          <li>Device and usage data (browser type, IP address, pages viewed, timestamps)</li>
        </ul>

        <h2>How We Use Information</h2>
        <p>We use information to operate and improve Lyceum, including to:</p>
        <ul>
          <li>Create and personalize learning paths and recommendations</li>
          <li>Save progress, completion signals, and mastery-related evidence</li>
          <li>Provide AI tutoring and product support</li>
          <li>Monitor performance, reliability, and security</li>
          <li>Communicate product updates and service notices</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>Sharing and Retention</h2>
        <p>
          We do not sell personal information. We may share information with service providers that support core
          operations such as hosting, analytics, authentication, and communications. We may also disclose information
          when required by law or to protect rights, safety, and platform integrity.
        </p>
        <p>
          We retain information only as long as needed for the purposes described in this policy, unless a longer
          retention period is required or permitted by law.
        </p>

        <h2>Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational safeguards to protect personal information.
          No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
        </p>

        <h2>Your Choices</h2>
        <p>
          You can update certain account information in settings. You may also request account deletion or ask privacy
          questions by contacting us. Depending on your location, you may have additional rights under applicable law.
        </p>

        <h2>Policy Updates and Contact</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will update the <strong>Last updated</strong>{' '}
          date above.
        </p>
        <p>For privacy inquiries, contact:</p>
        <p>
          <strong>The Lyceum Project</strong>
          <br />
          Email: <Link href="mailto:privacy@lyceum.app">privacy@lyceum.app</Link>
        </p>
      </DocumentCentered>
    </>
  )
}
