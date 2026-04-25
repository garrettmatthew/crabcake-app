type Rating = {
  spotId: string;
  spotCity: string;
  isBoysReview: boolean;
  score: string;
  createdAt: Date | string;
};

type Spot = {
  id: string;
  city: string;
  venueType: string | null;
};

type Badge = {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  earned: boolean;
  progress?: string; // e.g. "2 / 5"
};

/**
 * Profile passport — gamification surface that renders earned + in-progress
 * badges based on a user's ratings. Pure-derivation; no DB writes. New badge
 * tiers can be added by extending the BADGES array.
 */
export default function PassportBadges({
  ratings,
  spotsById,
  isAdmin = false,
}: {
  ratings: Rating[];
  spotsById: Record<string, Spot>;
  isAdmin?: boolean;
}) {
  const spotIds = new Set(ratings.map((r) => r.spotId));
  const cities = new Set(ratings.map((r) => r.spotCity).filter(Boolean));
  const venueTypes = new Map<string, number>();
  for (const r of ratings) {
    const vt = spotsById[r.spotId]?.venueType;
    if (vt) venueTypes.set(vt, (venueTypes.get(vt) ?? 0) + 1);
  }
  const states = new Set<string>();
  for (const c of cities) {
    const st = c.split(",")[1]?.trim();
    if (st) states.add(st);
  }
  const boysCount = ratings.filter((r) => r.isBoysReview).length;
  const tens = ratings.filter((r) => parseFloat(r.score) === 10).length;
  const ones = ratings.filter((r) => parseFloat(r.score) <= 1).length;

  const totalSpots = spotIds.size;
  const totalCities = cities.size;
  const totalStates = states.size;
  const countryClubCount = venueTypes.get("Country Club") ?? 0;
  const oysterBarCount = venueTypes.get("Oyster Bar") ?? 0;
  const hotelCount = venueTypes.get("Hotel") ?? 0;

  const tier = (n: number, target: number) =>
    n >= target ? `${target} / ${target}` : `${n} / ${target}`;

  const badges: Badge[] = [
    {
      id: "first-cake",
      emoji: "🥇",
      title: "First Cake",
      detail: "Submit your first review",
      earned: ratings.length >= 1,
    },
    {
      id: "five-spots",
      emoji: "🍽️",
      title: "Five Spots",
      detail: "Try 5 different spots",
      earned: totalSpots >= 5,
      progress: tier(totalSpots, 5),
    },
    {
      id: "ten-spots",
      emoji: "📒",
      title: "Cake Log Started",
      detail: "Try 10 different spots",
      earned: totalSpots >= 10,
      progress: tier(totalSpots, 10),
    },
    {
      id: "twenty-five-spots",
      emoji: "🏆",
      title: "Connoisseur",
      detail: "Try 25 different spots",
      earned: totalSpots >= 25,
      progress: tier(totalSpots, 25),
    },
    {
      id: "three-cities",
      emoji: "🏙️",
      title: "City Hopper",
      detail: "Spots in 3 cities",
      earned: totalCities >= 3,
      progress: tier(totalCities, 3),
    },
    {
      id: "five-states",
      emoji: "🗺️",
      title: "Five States",
      detail: "Spots in 5 states",
      earned: totalStates >= 5,
      progress: tier(totalStates, 5),
    },
    {
      id: "country-club",
      emoji: "⛳️",
      title: "Country Club Card",
      detail: "3 country clubs",
      earned: countryClubCount >= 3,
      progress: tier(countryClubCount, 3),
    },
    {
      id: "oyster",
      emoji: "🦪",
      title: "Oyster Bar Tour",
      detail: "3 oyster bars",
      earned: oysterBarCount >= 3,
      progress: tier(oysterBarCount, 3),
    },
    {
      id: "hotel",
      emoji: "🏨",
      title: "Hotel Hopper",
      detail: "3 hotels",
      earned: hotelCount >= 3,
      progress: tier(hotelCount, 3),
    },
    {
      id: "perfect-ten",
      emoji: "💯",
      title: "Perfect Ten",
      detail: "Score a spot a 10",
      earned: tens >= 1,
    },
    {
      id: "harsh-critic",
      emoji: "💀",
      title: "Harsh Critic",
      detail: "Score a spot 1.0 or below",
      earned: ones >= 1,
    },
  ];

  if (isAdmin) {
    badges.push({
      id: "boys-five",
      emoji: "🦀",
      title: "Boys Voice",
      detail: "5 official Boys reviews",
      earned: boysCount >= 5,
      progress: tier(boysCount, 5),
    });
  }

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3 mb-4">
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="font-display font-extrabold text-[15px] tracking-tight">
          Passport
        </div>
        <div className="text-[10.5px] font-mono text-[var(--ink-3)]">
          {earned.length} / {badges.length}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[...earned, ...locked].map((b) => (
          <div
            key={b.id}
            className="rounded-xl px-2 py-2.5 flex flex-col items-center text-center"
            style={{
              background: b.earned ? "var(--bg-2)" : "transparent",
              border: b.earned
                ? "1px solid var(--gold)"
                : "1px dashed var(--border-2)",
              opacity: b.earned ? 1 : 0.55,
            }}
          >
            <div className="text-[24px] leading-none mb-1">{b.emoji}</div>
            <div className="font-display font-bold text-[11px] tracking-tight leading-tight">
              {b.title}
            </div>
            <div className="text-[9.5px] text-[var(--ink-3)] font-medium leading-tight mt-0.5">
              {b.progress ?? b.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
