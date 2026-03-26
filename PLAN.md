
# ZHT Wagering Platform Conversion Plan

## Goal Description
Convert the existing "ZHT" (Next.js/Supabase/Radix UI) template into a functionality-focused online wagering platform.
The core feature is a **Matchmaking System** allowing users to wager on 1v1 up to 6v6 matches, supported by **Stripe & Crypto** payments.

## User Review Required
> [!IMPORTANT]
> **Match Verification**: I will implement a **"Self-Report + Confirmation"** system (Winner reports, Loser confirms or auto-confirms after timeout). Disputes go to a manual admin queue.
> **Crypto Implementation**: For MVP, I will assume a "Deposit to Platform Balance" model (similar to Stripe), rather than direct on-chain smart contract wagering.

## Proposed Changes

### Database Schema (Supabase)
- **`users`**: Extends auth, adds `balance` (numeric, USD equivalent).
- **`transactions`**:
    - `id`, `user_id`, `amount`, `type` (deposit, withdrawal, wager_lock, wager_payout), `provider` (stripe, crypto), `status`, `external_id`.
- **`matches`**:
    - `id`, `creator_id`, `wager_amount`, `team_size` (1-6), `status` (open, in_progress, completed, disputed).
    - `result` (winner_team_id).
- **`match_participants`**:
    - `match_id`, `user_id`, `team_id` (1 or 2).

### Backend (Server Actions / API)
- **`actions/match.ts`**:
    - `createMatch`: Locks funds from balance.
    - `joinMatch`: Locks funds.
    - `reportResult`: Transfers locked funds to winner (minus platform fee?).
- **`actions/payment.ts`**:
    - `createStripeSession`: Initiates deposit.
    - `handleCryptoDeposit`: Records incoming crypto tx (mocked/manual for MVP).

### Frontend Components
- **`MatchList`**: Filterable grid of open challenges.
- **`MatchRoom`**: Real-time lobby.
- **`WalletPage`**:
    - "Deposit with Stripe" button.
    - "Deposit with Crypto" (Display wallet address / QR).
    - Balance History.

## Verification Plan
### Automated Tests
- Test balance locking logic (ensure funds cannot be spent twice).
### Manual Verification
- **Payment Flow**:
    - Test Stripe Mock Mode.
    - Manually adjust `users.balance` to simulate Crypto deposit.
- **Game Flow**:
    - Full 1v1 cycle with funds.
