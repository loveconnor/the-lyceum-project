'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = (formData.get('first_name') as string) ?? ''
  const lastName = (formData.get('last_name') as string) ?? ''

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
      },
    },
  })

  if (error) {
    redirect('/signup?error=Could not authenticate user')
  }

  try {
    const userId = data?.user?.id
    if (userId) {
      // Use service role to bypass RLS during initial creation
      const admin = createAdminClient()
      await admin.from('profiles').upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim() || null,
        avatar_url: null,
        onboarding_complete: false,
        onboarding_data: null,
      })
    }
  } catch {
    // If profile creation fails, let the auth flow continue; RLS or table setup will surface in logs.
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
