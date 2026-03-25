import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Tournaments columns:")
    const { data: t } = await supabase.from("tournaments").select("*").limit(1);
    console.log(t ? Object.keys(t[0] || {}) : "No data");

    console.log("Tournament Participants columns:")
    const { data: tp } = await supabase.from("tournament_participants").select("*").limit(1);
    console.log(tp ? Object.keys(tp[0] || {}) : "No data");
}
check();
