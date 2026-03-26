import { createClient } from "@supabase/supabase-js"
import { lobbyQueueService } from "../lib/services/lobby-queue-service"

// Mock Supabase client for node execution (or use real one if env vars available)
// For this test we will rely on the service logic which uses the client.
// Assuming we are running this in a context where @/lib/supabase/client works or mocking it.

// Since we cannot easily import the nextjs app code in a standalone script without setup,
// we will verify by inserting data directly into the DB and checking results.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueueFlow() {
    console.log("Starting Queue Flow Test...")

    // 1. Create 4 dummy users (if not exist)
    const users = []
    for (let i = 0; i < 4; i++) {
        const email = `test_user_${i}_${Date.now()}@example.com`
        const { data, error } = await supabase.auth.signUp({
            email,
            password: "password123",
            options: {
                data: {
                    username: `QueueTester${i}`,
                    elo_rating: 1000 + (i * 100)
                }
            }
        })

        if (error) console.error("Error creating user:", error)
        if (data.user) {
            users.push(data.user)
            // Ensure user profile exists (depending on triggers)
            await supabase.from("users").upsert({
                id: data.user.id,
                username: `QueueTester${i}`,
                elo_rating: 1000 + (i * 100)
            })
        }
    }

    console.log(`Created ${users.length} test users.`)

    if (users.length < 4) {
        console.error("Failed to create enough users. Aborting.")
        return
    }

    // 2. Have them join the queue
    console.log("Users joining queue...")
    for (const user of users) {
        // Direct insert or use service if we could import it. 
        // We will perform direct DB inserts to simulate service actions
        await supabase.from("lobby_queue").insert({
            user_id: user.id,
            queue_type: "unmaxed",
            game_format: "snake_draft",
            player_count: 4,
            elo_rating: 1200, // approximate
            status: "waiting"
        })
    }

    // 3. Trigger match creation logic
    // In a real app this is a cron job or triggered by join. 
    // We will manually trigger the logic equivalent.
    console.log("Checking for match match...")

    // Call the service logic "remotely" or re-implement check query
    // Let's rely on the fact that if we implemented it right, the service would pick it up.
    // But since we can't run the Next.js service here easily, we will simulate the check manually.

    const { data: queuedUsers } = await supabase
        .from("lobby_queue")
        .select("*")
        .eq("status", "waiting")
        .eq("player_count", 4)
        .order("joined_at", { ascending: true })

    if (queuedUsers && queuedUsers.length >= 4) {
        console.log("Found 4+ users in queue. Creating tournament...")

        const players = queuedUsers.slice(0, 4)

        const { data: tournament, error: tError } = await supabase.from("tournaments").insert({
            name: "Test Class Queue Tournament",
            game: "Omega Strikers",
            tournament_type: "draft",
            max_participants: 4,
            status: "ready_check",
            player_pool_settings: {
                num_teams: 4,
                auto_assign_captains: true,
                captain_selection_mode: "high_elo"
            },
            created_by: players[0].user_id
        }).select().single()

        if (tError) {
            console.error("Error creating tournament:", tError)
            return
        }
        console.log("Tournament created:", tournament.id)

        // Add participants
        for (const p of players) {
            await supabase.from("tournament_participants").insert({
                tournament_id: tournament.id,
                user_id: p.user_id,
                status: "pending_ready"
            })
        }

        // Update queue
        await supabase.from("lobby_queue").update({ status: "matched" }).in("user_id", players.map(p => p.user_id))

        console.log("Match created and participants added.")

        // 4. Simulate Ready Check
        console.log("Simulating users accepting match...")
        for (const p of players) {
            await supabase.from("tournament_participants").update({ status: "ready" }).eq("tournament_id", tournament.id).eq("user_id", p.user_id)
        }

        // 5. Check for auto-start
        // Creating the "Ready Check" service logic here to verify it WOULD work
        const { data: readyParticipants } = await supabase.from("tournament_participants").select("status").eq("tournament_id", tournament.id)
        const allReady = readyParticipants?.every(p => p.status === "ready")

        if (allReady) {
            console.log("All users ready. Starting draft...")
            await supabase.from("tournaments").update({ status: "drafting" }).eq("id", tournament.id)
            console.log("Tournament set to drafting.")

            // Auto-select captains simulation
            console.log("Auto-selecting captains...")
            // Simplified logic: High ELO = first in list (mock)
            // In real implementation, this calls captainSelectionService
            const sortedPlayers = players // Assume sorted by ELO already for simplicity or fetch & sort

            for (let i = 0; i < sortedPlayers.length; i++) {
                // Create pool entry
                await supabase.from("tournament_player_pool").insert({
                    tournament_id: tournament.id,
                    user_id: sortedPlayers[i].user_id,
                    status: "drafted",
                    captain_type: i === 0 ? "high_elo" : (i === 1 ? "low_elo" : null) // Mock allocation for 4 teams? logic varies
                })
            }
            console.log("Captains selected.")
        }
    }

    // Cleanup
    console.log("Test finished. Cleaning up...")
    // Ideally delete created users/tournaments
}

testQueueFlow()
