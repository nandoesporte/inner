
import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto ativo (nxccuamwkcqcpghlvirj)
export const supabaseUrl = 'https://nxccuamwkcqcpghlvirj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y2N1YW13a2NxY3BnaGx2aXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODU4NjUsImV4cCI6MjA4MDg2MTg2NX0.ckNJQTQ-hFdNOKf6ZMbXUptTMFcGN6sm2tbNZtKIwLU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, options).catch(err => {
        console.warn('Supabase Fetch Retry:', err);
        return fetch(url, options);
      });
    }
  }
});
