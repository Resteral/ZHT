-- =====================================================================
-- CONSOLIDATED: Create lobby_queue table + Queue RPCs
-- Paste this ENTIRE script into Supabase SQL Editor and run it.
-- It is safe to run multiple times (idempotent).
-- =====================================================================

-- =====================================================================
-- STEP 1: Fix transactions.type enum → convert to TEXT
-- The initial schema created `type` as the enum `transaction_type`
-- which only allows: 'deposit','withdrawal','wager_entry','wager_payout','refund'
-- The arena queue RPCs need to insert 'arena_entry' and 'arena_prize',
-- so we must convert the column to unrestricted TEXT.
-- =====================================================================
DO $$
BEGIN
  -- Check if type column is still an enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'type'
      AND data_type = 'USER-DEFINED'
  ) THEN
    -- Alter the column to TEXT (PostgreSQL allows casting enum → text directly)
    ALTER TABLE public.transactions ALTER COLUMN type TYPE TEXT USING type::TEXT;
    RAISE NOTICE 'Converted transactions.type from enum to TEXT';
  ELSE
    RAISE NOTICE 'transactions.type is already TEXT — skipping conversion';
  END IF;
END $$;

-- Same fix for transactions.status if it is still an enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.transactions ALTER COLUMN status TYPE TEXT USING status::TEXT;
    RAISE NOTICE 'Converted transactions.status from enum to TEXT';
  ELSE
    RAISE NOTICE 'transactions.status is already TEXT — skipping conversion';
  END IF;
END $$;

-- Drop old enum types if they exist and are no longer in use
-- (safe because we already converted the columns)
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;

-- =====================================================================
-- STEP 2: Ensure users table has required columns
-- =====================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS elo_rating INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;

-- Ensure balance cannot go negative
DO $$
BEGIN
  -- Add check constraint only if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND constraint_name = 'users_balance_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_balance_check CHECK (balance >= 0);
  END IF;
END $$;

-- =====================================================================
-- STEP 3: Ensure transactions table exists with TEXT columns
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    description TEXT,
    provider TEXT,
    external_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================================
-- STEP 4: Create lobby_queue table with all columns including entry_fee
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lobby_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('maxed', 'unmaxed')),
  game_format TEXT NOT NULL CHECK (game_format IN ('snake_draft', 'auction_draft', 'linear_draft')),
  player_count INTEGER NOT NULL CHECK (player_count IN (2, 3, 4, 6, 8, 12)),
  elo_rating INTEGER NOT NULL DEFAULT 1000,
  entry_fee NUMERIC NOT NULL DEFAULT 5.00,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add entry_fee if table already existed without it
ALTER TABLE public.lobby_queue ADD COLUMN IF NOT EXISTS entry_fee NUMERIC NOT NULL DEFAULT 5.00;

-- =====================================================================
-- STEP 5: Indexes
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_lobby_queue_status ON public.lobby_queue(status);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_type_format ON public.lobby_queue(queue_type, game_format, player_count);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_user ON public.lobby_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_joined_at ON public.lobby_queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_entry_fee ON public.lobby_queue(entry_fee);

-- =====================================================================
-- STEP 6: Row Level Security
-- =====================================================================
ALTER TABLE public.lobby_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all queue entries" ON public.lobby_queue;
CREATE POLICY "Users can view all queue entries" ON public.lobby_queue
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join queues" ON public.lobby_queue;
CREATE POLICY "Users can join queues" ON public.lobby_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own queue entries" ON public.lobby_queue;
CREATE POLICY "Users can update their own queue entries" ON public.lobby_queue
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own queue entries" ON public.lobby_queue;
CREATE POLICY "Users can delete their own queue entries" ON public.lobby_queue
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- STEP 7: join_pay_to_play_queue RPC (definitive version with entry_fee)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.join_pay_to_play_queue(
    p_user_id UUID,
    p_queue_type TEXT,
    p_game_format TEXT,
    p_player_count INTEGER,
    p_entry_fee NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
    v_elo_rating INTEGER;
    v_queue_entry JSONB;
BEGIN
    -- Already in queue?
    IF EXISTS (SELECT 1 FROM public.lobby_queue WHERE user_id = p_user_id AND status = 'waiting') THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already in a queue.');
    END IF;

    -- Sufficient balance?
    SELECT balance INTO v_balance FROM public.users WHERE id = p_user_id;
    IF v_balance IS NULL OR v_balance < p_entry_fee THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Required: $' || p_entry_fee::TEXT || '. Please deposit funds.');
    END IF;

    SELECT elo_rating INTO v_elo_rating FROM public.users WHERE id = p_user_id;

    -- Deduct entry fee
    UPDATE public.users SET balance = balance - p_entry_fee WHERE id = p_user_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, -p_entry_fee, 'arena_entry', 'completed', 'Arena queue entry fee');

    -- Insert queue entry WITH entry_fee
    INSERT INTO public.lobby_queue (user_id, queue_type, game_format, player_count, elo_rating, entry_fee, status)
    VALUES (p_user_id, p_queue_type, p_game_format, p_player_count, COALESCE(v_elo_rating, 1000), p_entry_fee, 'waiting')
    RETURNING to_jsonb(public.lobby_queue.*) INTO v_queue_entry;

    RETURN jsonb_build_object('success', true, 'queue_entry', v_queue_entry);
END;
$$;

-- =====================================================================
-- STEP 8: leave_pay_to_play_queue RPC (reads stored fee for refund)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.leave_pay_to_play_queue(
    p_user_id UUID,
    p_entry_fee NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_waiting BOOLEAN;
    v_actual_fee NUMERIC;
BEGIN
    -- Get stored fee for accurate refund
    SELECT entry_fee INTO v_actual_fee FROM public.lobby_queue
    WHERE user_id = p_user_id AND status = 'waiting'
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM public.lobby_queue
        WHERE user_id = p_user_id AND status = 'waiting'
    ) INTO v_is_waiting;

    IF NOT v_is_waiting THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not currently in a queue.');
    END IF;

    UPDATE public.lobby_queue SET status = 'cancelled'
    WHERE user_id = p_user_id AND status = 'waiting';

    v_actual_fee := COALESCE(v_actual_fee, p_entry_fee);
    UPDATE public.users SET balance = balance + v_actual_fee WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, v_actual_fee, 'refund', 'completed', 'Arena queue refund');

    RETURN jsonb_build_object('success', true, 'message', 'Left queue. Refunded $' || v_actual_fee::TEXT);
END;
$$;

-- =====================================================================
-- STEP 9: Grant the SECURITY DEFINER functions access to bypass RLS
-- (functions already use SECURITY DEFINER, but grant execute to authed users)
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.join_pay_to_play_queue(UUID, TEXT, TEXT, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_pay_to_play_queue(UUID, NUMERIC) TO authenticated;

-- DONE
SELECT 'Arena queue setup complete! Run this script once in Supabase SQL Editor.' AS status;
