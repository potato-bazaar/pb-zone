export type LeaderboardFilter = "overall" | "week" | "month";

export type LeaderboardPlayer = {
  rank: number;
  name: string;
  points: number;
  avatar?: string;
  isYou?: boolean;
};

export const LEADERBOARD_FILTERS: { id: LeaderboardFilter; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export const PODIUM_PLAYERS: LeaderboardPlayer[] = [
  { rank: 1, name: "Arjun Mehta", points: 15980 },
  { rank: 2, name: "Priya Shah", points: 12450 },
  { rank: 3, name: "Rohan Verma", points: 10230 },
];

export const LIST_PLAYERS: LeaderboardPlayer[] = [
  { rank: 4, name: "Sneha Iyer", points: 9450 },
  { rank: 5, name: "You", points: 500, isYou: true },
  { rank: 6, name: "Karan Patel", points: 4200 },
  { rank: 7, name: "Neha Singh", points: 3890 },
  { rank: 8, name: "Aditya Kumar", points: 3650 },
];

export const YOUR_RANK = 5;
export const YOUR_POINTS = 500;
export const SEASON_LABEL = "Season 1";

export const ALL_PLAYERS: LeaderboardPlayer[] = [
  ...PODIUM_PLAYERS,
  ...LIST_PLAYERS,
  { rank: 9, name: "Vikram Joshi", points: 3420 },
  { rank: 10, name: "Ananya Reddy", points: 3180 },
  { rank: 11, name: "Rahul Gupta", points: 2950 },
  { rank: 12, name: "Meera Nair", points: 2720 },
  { rank: 13, name: "Suresh Kumar", points: 2510 },
  { rank: 14, name: "Pooja Desai", points: 2340 },
  { rank: 15, name: "Amit Sharma", points: 2180 },
  { rank: 16, name: "Divya Rao", points: 2050 },
  { rank: 17, name: "Sanjay Malhotra", points: 1920 },
  { rank: 18, name: "Kavya Menon", points: 1780 },
  { rank: 19, name: "Ravi Choudhary", points: 1650 },
  { rank: 20, name: "Isha Kapoor", points: 1520 },
];
