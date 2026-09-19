import { supabase } from './supabase'

export async function getGames() {
  const {
    data,
    error,
  } = await supabase
    .from('games')
    .select('*')
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return data
}

export async function getGame(gameId) {
  const {
    data,
    error,
  } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}