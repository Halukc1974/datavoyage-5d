// scripts/test-supabase.js
// Small server-side test script to verify Supabase connection.
// Usage:
//   export SUPABASE_URL="https://<project>.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
//   node scripts/test-supabase.js

require('dotenv').config();

;(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js')

    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      console.error('SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlı değil. Lütfen ortam değişkenlerini ayarlayın.');
      process.exit(1);
    }

    const supabase = createClient(url, key)

    console.log('Bağlanılıyor...', url)

    const { data, error } = await supabase.from('sidebar_items').select('*').limit(5)
    if (error) {
      console.error('Sorgu hatası:', error)
      process.exit(1)
    }

    console.log('Örnek veri:', data)
    process.exit(0)
  } catch (err) {
    console.error('Beklenmeyen hata:', err)
    process.exit(1)
  }
})()
