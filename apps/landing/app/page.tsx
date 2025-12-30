import { InputForm } from "@/components/waitlist-form"
import { WaitlistWrapper } from "@/components/box"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/config"

export const metadata: Metadata = {
  title: {
    template: siteConfig.metadata.titleTemplate,
    default: siteConfig.metadata.defaultTitle,
  },
  description: siteConfig.metadata.defaultDescription,
  icons: [siteConfig.metadata.favicon],
}

type SubmitResult = { success: true; status?: "new" | "duplicate" } | { success: false; error: string }

async function submitWaitlist(data: FormData): Promise<SubmitResult> {
  "use server"

  const email = data.get("email") as string

  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address" }
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:3001"

  try {
    const response = await fetch(`${backendUrl}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "landing",
      }),
      cache: "no-store",
    })

    if (response.status === 409) {
      return { success: true, status: "duplicate" }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const message = body?.error || "Something went wrong while joining the waitlist."
      return { success: false, error: message }
    }

    return { success: true, status: "new" }
  } catch (error) {
    console.error("Failed to submit waitlist signup:", error)
    return { success: false, error: "Unable to reach the waitlist service. Please try again." }
  }

  return { success: true, status: "new" }
}

export default function Home() {
  const { waitlist } = siteConfig

  return (
    <WaitlistWrapper>
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-medium text-slate-12 whitespace-pre-wrap text-pretty">
          {waitlist.title}
        </h1>
        <p className="text-slate-10 tracking-tight text-pretty">{waitlist.subtitle}</p>
      </div>
      {/* Form */}
      <div className="px-1 flex flex-col w-full self-stretch">
        <InputForm
          buttonCopy={{
            idle: waitlist.button.idleCopy,
            success: waitlist.button.successCopy,
            duplicate: waitlist.button.duplicateCopy,
            loading: waitlist.button.submittingCopy,
          }}
          formAction={submitWaitlist}
          name={waitlist.emailInput.name}
          type={waitlist.emailInput.type}
          placeholder={waitlist.emailInput.placeholder}
          required={waitlist.emailInput.required}
        />
      </div>
    </WaitlistWrapper>
  )
}
