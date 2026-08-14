import { supabase } from './supabase'
import type { Theme } from './theme'

export async function fetchTema(userId: string): Promise<Theme | null> {
  const { data } = await supabase
    .from('preferencias')
    .select('tema')
    .eq('user_id', userId)
    .maybeSingle()

  if (data && (data.tema === 'dark' || data.tema === 'light')) return data.tema
  return null
}

export async function salvarTema(userId: string, tema: Theme): Promise<void> {
  await supabase.from('preferencias').upsert({ user_id: userId, tema }, { onConflict: 'user_id' })
}
