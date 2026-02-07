'use client'

import { clsx } from 'clsx/lite'
import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WaitlistResponse {
  success?: boolean
  error?: string
}

export function EmailSignupForm({
  label = 'Email address',
  placeholder = 'Enter your email',
  cta,
  variant = 'normal',
  className,
  source = 'landing',
  ...props
}: {
  label?: string
  placeholder?: string
  cta: ReactNode
  variant?: 'normal' | 'overlay'
  source?: string
} & ComponentProps<'form'>) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isAlreadyJoined, setIsAlreadyJoined] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')
    setIsAlreadyJoined(false)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
      
      const response = await fetch(`${apiUrl}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
          },
        }),
      })

      const data: WaitlistResponse = await response.json()

      if (response.ok && data.success) {
        setIsSubmitted(true)
        setEmail('')
      } else {
        // Handle specific error messages from the API
        if (response.status === 409) {
          setIsAlreadyJoined(true)
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
      }
    } catch (err) {
      console.error('Waitlist submission error:', err)
      setError('Unable to connect. Please check your internet connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // If successfully submitted, show success message
  if (isSubmitted) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-full p-4 text-center',
          variant === 'normal' && 'bg-green-50 text-green-800 border border-green-200',
          variant === 'overlay' && 'bg-green-500/20 text-white',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium">You're on the waitlist! Check your email for confirmation.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={handleSubmit}
        className={clsx(
          'flex rounded-full p-1 inset-ring-1 dark:bg-white/10 dark:inset-ring-white/10',
          variant === 'normal' && 'bg-white inset-ring-black/10',
          variant === 'overlay' && 'bg-white/15 inset-ring-white/10',
          className,
        )}
        {...props}
      >
        <Input
          className={clsx(
            'min-w-0 flex-1 rounded-full border-transparent bg-transparent text-sm/7 shadow-none focus-visible:ring-0',
            variant === 'normal' && 'text-mist-950',
            variant === 'overlay' && 'text-white placeholder:text-white/60',
          )}
          type="email"
          aria-label={label}
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting || isAlreadyJoined}
          required
        />
        <Button
          type="submit"
          disabled={isSubmitting || isAlreadyJoined}
          className={clsx(
            'rounded-full transition-all duration-200',
            variant === 'overlay' &&
              'bg-white text-mist-950 hover:bg-mist-100 dark:bg-mist-100 dark:text-mist-950 dark:hover:bg-white',
            (isSubmitting || isAlreadyJoined) && 'opacity-75 cursor-not-allowed',
            isAlreadyJoined && variant === 'normal' && 'bg-orange-100 text-orange-800 hover:bg-orange-100',
            isAlreadyJoined && variant === 'overlay' && 'bg-orange-200 text-orange-900 hover:bg-orange-200',
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Joining...
            </div>
          ) : isAlreadyJoined ? (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Already joined
            </div>
          ) : (
            cta
          )}
        </Button>
      </form>
      
      {error && (
        <p
          className={clsx(
            'text-sm text-center',
            variant === 'normal' && 'text-red-600',
            variant === 'overlay' && 'text-red-200',
          )}
        >
          {error}
        </p>
      )}
    </div>
  )
}
