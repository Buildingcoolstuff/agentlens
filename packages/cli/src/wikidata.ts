/**
 * Wikidata Entity Resolver (wikidata.ts)
 *
 * Resolves brand / organization names to authoritative Wikidata Q-IDs
 * via the public Wikidata search API with timeout, retry backoff, and rate-limit handling.
 */

export interface WikidataSearchResult {
  id: string; // e.g. "Q105638"
  label: string;
  description: string;
  uri: string; // "https://www.wikidata.org/entity/Q105638"
}

export async function resolveWikidataEntity(
  brandName: string,
  retries: number = 2,
  timeoutMs: number = 5000
): Promise<WikidataSearchResult | null> {
  const query = brandName.trim();
  if (!query) return null;

  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    query
  )}&language=en&format=json&origin=*&type=item&limit=5`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AgentLens-CLI/1.0 (+https://github.com/Buildingcoolstuff/agentlens)',
          Accept: 'application/json',
        },
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        // Rate limited — back off exponentially
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        return null;
      }

      if (!res.ok) {
        if (attempt < retries) continue;
        return null;
      }

      const data = (await res.json()) as {
        search?: Array<{ id: string; label: string; description?: string }>;
      };

      if (data.search && data.search.length > 0) {
        const best = data.search[0]!;
        return {
          id: best.id,
          label: best.label,
          description: best.description || '',
          uri: `https://www.wikidata.org/entity/${best.id}`,
        };
      }

      return null;
    } catch {
      clearTimeout(timeout);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }

  return null;
}
