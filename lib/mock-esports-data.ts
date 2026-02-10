
export interface EsportsMatch {
    id: string;
    gameTitle: "League of Legends" | "CS2" | "Valorant" | "Dota 2" | "Rainbow Six Siege" | "Starcraft II" | "GTA VI" | "Fortnite" | "Apex Legends" | "Omega Strikers" | "Zealot Hockey" | "World of Warcraft";
    league: string;
    homeTeam: {
        name: string;
        logo?: string;
        record: string;
    };
    awayTeam: {
        name: string;
        logo?: string;
        record: string;
    };
    scheduledTime: string; // ISO string
    status: "live" | "upcoming" | "finished";
    entryFee: number;
    prizePool: number;
    liveState?: {
        homeScore: number;
        awayScore: number;
        quarter: string; // e.g. "Map 2"
        time?: string;
    };
    markets: {
        type: "moneyline" | "spread" | "total";
        homeOdds?: string;
        awayOdds?: string;
        homeSpread?: string;
        awaySpread?: string;
        over?: string;
        under?: string;
        overOdds?: string;
        underOdds?: string;
    }[];
}

export const MOCK_ESPORTS_MATCHES: EsportsMatch[] = [
    {
        id: "match-1",
        gameTitle: "League of Legends",
        league: "LCK Summer",
        homeTeam: { name: "T1", record: "12-2" },
        awayTeam: { name: "Gen.G", record: "13-1" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours from now
        status: "upcoming",
        entryFee: 10,
        prizePool: 1000,
        markets: [
            { type: "moneyline", homeOdds: "-150", awayOdds: "+120" },
            { type: "spread", homeSpread: "-1.5", awaySpread: "+1.5", homeOdds: "+180", awayOdds: "-220" }
        ]
    },
    {
        id: "match-2",
        gameTitle: "CS2",
        league: "IEM Cologne",
        homeTeam: { name: "FaZe Clan", record: "3-0" },
        awayTeam: { name: "G2 Esports", record: "2-1" },
        scheduledTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // Started 30 mins ago
        status: "live",
        entryFee: 25,
        prizePool: 5000,
        liveState: {
            homeScore: 1,
            awayScore: 0,
            quarter: "Map 2",
            time: "Live"
        },
        markets: [
            { type: "moneyline", homeOdds: "-200", awayOdds: "+160" }
        ]
    },
    {
        id: "match-3",
        gameTitle: "Valorant",
        league: "VCT Americas",
        homeTeam: { name: "Sentinels", record: "4-1" },
        awayTeam: { name: "100 Thieves", record: "3-2" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
        status: "upcoming",
        entryFee: 5,
        prizePool: 500,
        markets: [
            { type: "moneyline", homeOdds: "-110", awayOdds: "-110" },
            { type: "total", over: "2.5", under: "2.5", overOdds: "+100", underOdds: "-120" }
        ]
    },
    {
        id: "match-4",
        gameTitle: "Rainbow Six Siege",
        league: "Six Invitational",
        homeTeam: { name: "W7M Esports", record: "5-0" },
        awayTeam: { name: "FaZe Clan", record: "4-1" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
        status: "upcoming",
        entryFee: 15,
        prizePool: 1500,
        markets: [
            { type: "moneyline", homeOdds: "-130", awayOdds: "+100" }
        ]
    },
    {
        id: "match-5",
        gameTitle: "Starcraft II",
        league: "GSL Code S",
        homeTeam: { name: "Maru", record: "2-0" },
        awayTeam: { name: "Serral", record: "2-0" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        status: "upcoming",
        entryFee: 20,
        prizePool: 2000,
        markets: [
            { type: "moneyline", homeOdds: "-110", awayOdds: "-110" }
        ]
    },
    {
        id: "match-6",
        gameTitle: "Fortnite",
        league: "FNCS Major",
        homeTeam: { name: "EpikWhale & Reed", record: "1st" },
        awayTeam: { name: "Bugha & Mero", record: "2nd" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
        status: "upcoming",
        entryFee: 10,
        prizePool: 5000,
        markets: [
            { type: "moneyline", homeOdds: "+150", awayOdds: "-180" } // Head to head
        ]
    },
    {
        id: "match-7",
        gameTitle: "GTA VI",
        league: "Roleplay Server Wars",
        homeTeam: { name: "NoPixel", record: "10-2" },
        awayTeam: { name: "Eclipse", record: "8-4" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        status: "upcoming",
        entryFee: 50,
        prizePool: 10000,
        markets: [
            { type: "moneyline", homeOdds: "-500", awayOdds: "+350" }
        ]
    },
    {
        id: "match-8",
        gameTitle: "Apex Legends",
        league: "ALGS Split 2",
        homeTeam: { name: "DarkZero", record: "1st" },
        awayTeam: { name: "TSM", record: "2nd" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        status: "upcoming",
        entryFee: 12,
        prizePool: 2500,
        markets: [
            { type: "moneyline", homeOdds: "+110", awayOdds: "-130" }
        ]
    },
    {
        id: "match-9",
        gameTitle: "Omega Strikers",
        league: "Core Strike League",
        homeTeam: { name: "Team Atlas", record: "5-1" },
        awayTeam: { name: "Kairos", record: "4-2" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        status: "upcoming",
        entryFee: 8,
        prizePool: 800,
        markets: [
            { type: "moneyline", homeOdds: "-120", awayOdds: "+100" }
        ]
    },
    {
        id: "match-10",
        gameTitle: "Zealot Hockey",
        league: "Galactic Cup",
        homeTeam: { name: "Aiur Blades", record: "7-0" },
        awayTeam: { name: "Void Rays", record: "6-1" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
        status: "live",
        entryFee: 15,
        prizePool: 1200,
        liveState: {
            homeScore: 3,
            awayScore: 2,
            quarter: "Period 2",
            time: "10:45"
        },
        markets: [
            { type: "moneyline", homeOdds: "-160", awayOdds: "+130" },
            { type: "total", over: "5.5", under: "5.5", overOdds: "-110", underOdds: "-110" }
        ]
    },
    {
        id: "match-11",
        gameTitle: "World of Warcraft",
        league: "Arena World Championship",
        homeTeam: { name: "Echo", record: "15-2" },
        awayTeam: { name: "Liquid", record: "14-3" },
        scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        status: "upcoming",
        entryFee: 10,
        prizePool: 3000,
        markets: [
            { type: "moneyline", homeOdds: "-140", awayOdds: "+110" }
        ]
    }
];
