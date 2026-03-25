-- Migration: Add entry_fee column to lobby_queue
-- This is required by the checkAndCreateMatch function in lobby-queue-service.ts
-- which groups queue entries by entry fee to ensure players in the same fee tier are matched together.

ALTER TABLE public.lobby_queue
ADD COLUMN IF NOT EXISTS entry_fee NUMERIC NOT NULL DEFAULT 5.00;

-- Update the join_pay_to_play_queue RPC to store entry_fee in the table
CREATE OR REPLACE FUNCTION join_pay_to_play_queue(
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
    IF EXISTS (SELECT 1 FROM public.lobby_queue WHERE user_id = p_user_id AND status = 'waiting') THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already in a queue.');
    END IF;

    SELECT balance INTO v_balance FROM public.users WHERE id = p_user_id;
    IF v_balance IS NULL OR v_balance < p_entry_fee THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for entry fee. Required: $' || p_entry_fee);
    END IF;

    SELECT elo_rating INTO v_elo_rating FROM public.users WHERE id = p_user_id;

    UPDATE public.users SET balance = balance - p_entry_fee WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, -p_entry_fee, 'arena_entry', 'completed', 'Strategic arena entry fee contribution');

    -- Now includes entry_fee column
    INSERT INTO public.lobby_queue (user_id, queue_type, game_format, player_count, elo_rating, entry_fee, status)
    VALUES (p_user_id, p_queue_type, p_game_format, p_player_count, COALESCE(v_elo_rating, 1000), p_entry_fee, 'waiting')
    RETURNING to_jsonb(public.lobby_queue.*) INTO v_queue_entry;

    RETURN jsonb_build_object('success', true, 'queue_entry', v_queue_entry);
END;
$$;

-- Also fix leave_pay_to_play_queue to correctly refund the right amount
CREATE OR REPLACE FUNCTION leave_pay_to_play_queue(
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
    -- Get the actual entry fee from the queue entry
    SELECT entry_fee INTO v_actual_fee FROM public.lobby_queue 
    WHERE user_id = p_user_id AND status = 'waiting'
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM public.lobby_queue 
        WHERE user_id = p_user_id AND status = 'waiting'
    ) INTO v_is_waiting;

    IF NOT v_is_waiting THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not currently waiting in a queue.');
    END IF;

    UPDATE public.lobby_queue SET status = 'cancelled' 
    WHERE user_id = p_user_id AND status = 'waiting';

    -- Use actual stored fee for refund (fall back to p_entry_fee if not found)
    v_actual_fee := COALESCE(v_actual_fee, p_entry_fee);
    UPDATE public.users SET balance = balance + v_actual_fee WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_user_id, v_actual_fee, 'refund', 'completed', 'Arena queue refund');

    RETURN jsonb_build_object('success', true, 'message', 'Left queue and refunded $' || v_actual_fee);
END;
$$;
