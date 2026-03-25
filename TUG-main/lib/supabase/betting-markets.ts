export const loadBettingMarkets = (setBettingMarkets: (markets: any[]) => void) => {
  const matchMarkets = [
    {
      id: "match_winner",
      title: "Match Winner",
      options: [
        {
          id: "team1",
          name: "Team 1",
          odds: "1.85",
          probability: "54.1",
        },
        {
          id: "team2",
          name: "Team 2",
          odds: "1.95",
          probability: "51.3",
        },
      ],
    },
    {
      id: "total_goals",
      title: "Total Goals Over/Under",
      options: [
        { id: "over_5", name: "Over 5.5 Goals", odds: "1.85", probability: "54.1" },
        { id: "under_5", name: "Under 5.5 Goals", odds: "1.95", probability: "51.3" },
      ],
    },
  ]

  const playerMarkets = [
    {
      id: "most_goals",
      title: "Most Goals in Match",
      options: [
        {
          id: "most_goals_player1",
          name: "Player 1",
          odds: "3.50",
          probability: "28.6",
        },
        {
          id: "most_goals_player2",
          name: "Player 2",
          odds: "4.00",
          probability: "25.0",
        },
      ],
    },
    {
      id: "player_assists",
      title: "Player Assists Over/Under",
      options: [
        {
          id: "assists_over_player1",
          name: "Player 1 Over 1.5 Assists",
          odds: "2.10",
          probability: "47.6",
        },
        {
          id: "assists_under_player1",
          name: "Player 1 Under 1.5 Assists",
          odds: "1.75",
          probability: "57.1",
        },
      ],
    },
  ]

  setBettingMarkets([...matchMarkets, ...playerMarkets])
}
