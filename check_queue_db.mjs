import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking lobby_queue table...");
    const { data, error } = await supabase.from("lobby_queue").select("*").limit(1);
    if (error) {
        console.error("Table error:", error.message);
    } else {
        console.log("Table exists.");
    }

    console.log("Checking RPC join_pay_to_play_queue...");
    const { error: rpcError } = await supabase.rpc('join_pay_to_play_queue', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_queue_type: 'unmaxed',
        p_game_format: 'snake_draft',
        p_player_count: 4,
        p_entry_fee: 5
    });
    // If user is invalid, the RPC itself might throw an error like "Insufficient balance" rather than "Could not find the function"
    if (rpcError) {
        console.error("RPC Error:", rpcError.message);
        if (rpcError.message.includes("Could not find the function")) {
            console.log("-> RPC function is definitely missing.");
        }
    } else {
        console.log("RPC exists.");
    }
}
check();
