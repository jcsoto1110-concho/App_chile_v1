import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_L_vg-YpvCMf4Qfbr0ftkJw_4q2Z0E5m';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("--- BRANDS ---");
  const { data: brands, error: bErr } = await supabase.from('brands').select('*');
  if (bErr) console.error("Error fetching brands:", bErr);
  else console.log(JSON.stringify(brands, null, 2));

  console.log("\n--- PROFILES ---");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*, stores(name), brands(*)');
  if (pErr) console.error("Error fetching profiles:", pErr);
  else console.log(JSON.stringify(profiles, null, 2));
}

check();
