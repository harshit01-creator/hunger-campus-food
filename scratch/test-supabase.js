import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL & Anon Key when ready
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...');
  try {
    const { data, error, status } = await supabase.from('orders').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('⚠️ Supabase Response:', error.message);
      if (error.message.includes('FetchError') || error.message.includes('ENOTFOUND') || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
        console.log('📌 NOTE: Placeholder URL detected. Please replace SUPABASE_URL and SUPABASE_ANON_KEY in src/services/orders.ts with your real keys from https://app.supabase.com');
      }
    } else {
      console.log('✅ SUPABASE IS WORKING PERFECTLY! Status Code:', status);
    }
  } catch (err) {
    console.log('❌ Error connecting to Supabase:', err.message);
  }
}

checkSupabaseConnection();
