import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.TIMEBANK_CONFIG || {};
const url = config.url || config.supabaseUrl;
const key = config.publishableKey || config.anonKey || config.supabaseKey;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createSupabaseClient(url, key)
  : null;

export function createClient() {
  if (!supabase) {
    throw new Error("TimeBank backend configuration is not connected.");
  }
  return supabase;
}

export function getBackendError(error) {
  if (!isSupabaseConfigured) {
    return "TimeBank backend configuration is not connected.";
  }
  if (!error) return "Unable to connect to TimeBank right now.";
  return "Unable to connect to TimeBank right now.";
}
