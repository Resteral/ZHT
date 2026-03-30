import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("match_history columns:");
    const { data: mh, error } = await supabase.from("match_history").select("*").limit(1);
    if (error) console.error("Error:", error.message);
    else console.log(mh && mh.length > 0 ? Object.keys(mh[0]) : "Table exists but empty. We can't see columns from this query.");
    
    // Better way to get columns if empty:
    if (!mh || mh.length === 0) {
        console.log("Trying to get columns via a forced error or just standard REST...");
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/match_history?limit=1`, {
            headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
        });
        const text = await res.text();
        console.log("REST response:", text);
    }
}
check();
