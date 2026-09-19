import { supabase } from './supabase'

export async function ensureAnonymousUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  // Browser already has an identity
  if (session?.user) {
    return session.user
  }

  // Silently create an anonymous identity
  const {
    data,
    error,
  } = await supabase.auth.signInAnonymously()

  if (error) {
    throw error
  }

  return data.user
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return user
}