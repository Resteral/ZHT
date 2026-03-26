export interface AuctionBid {
  id: string
  team_id: string
  player_id: string
  bid_amount: number
  bid_time: string
  is_winning_bid: boolean
}

export interface TeamBudget {
  id: string
  team_id: string
  team_name: string
  captain_username: string
  current_budget: number
  spent_amount: number
  players_acquired: number
  max_players: number
}

export function calculateMinimumBid(currentBid: number): number {
  if (currentBid === 0) return 5 // Minimum starting bid
  return currentBid + 5 // Minimum increment
}

export function validateBid(
  bidAmount: number,
  currentBid: number,
  teamBudget: number,
): {
  valid: boolean
  error?: string
} {
  if (bidAmount <= currentBid) {
    return { valid: false, error: "Bid must be higher than current bid" }
  }

  if (bidAmount > teamBudget) {
    return { valid: false, error: "Insufficient budget" }
  }

  const minBid = calculateMinimumBid(currentBid)
  if (bidAmount < minBid) {
    return { valid: false, error: `Minimum bid is $${minBid}` }
  }

  return { valid: true }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "0:00"

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function getBidButtonVariants(bidAmount: number, teamBudget: number) {
  return {
    disabled: bidAmount > teamBudget,
    variant: bidAmount > teamBudget ? "secondary" : "default",
  }
}
