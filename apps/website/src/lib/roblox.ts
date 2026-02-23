export interface RobloxGameInfo {
  universeId: number;
  name: string;
  playing: number;
  visits: number;
  maxPlayers: number;
}

interface RobloxGamesApiEntry {
  id: number;
  name: string;
  playing: number;
  visits: number;
  maxPlayers: number;
}

interface RobloxGamesApiResponse {
  data: RobloxGamesApiEntry[];
}

/**
 * Fetches live game stats from the public Roblox Games API.
 * No API key required — data is publicly visible on the Roblox website.
 * Revalidated by Next.js on a 60-second ISR cycle.
 */
export async function fetchGameStats(
  universeIds: string[]
): Promise<Record<string, RobloxGameInfo>> {
  const ids = universeIds.filter(Boolean).join(",");
  if (!ids) return {};

  try {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${ids}`, {
      next: { revalidate: 60 }, // ISR: refresh every 60s
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return {};

    const json: RobloxGamesApiResponse = await res.json();
    const result: Record<string, RobloxGameInfo> = {};

    for (const entry of json.data) {
      result[String(entry.id)] = {
        universeId: entry.id,
        name: entry.name,
        playing: entry.playing,
        visits: entry.visits,
        maxPlayers: entry.maxPlayers,
      };
    }

    return result;
  } catch {
    return {};
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
