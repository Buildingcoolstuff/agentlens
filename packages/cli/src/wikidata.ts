/**
 * Wikidata Entity Resolver (wikidata.ts)
 *
 * Resolves brand / organization names to authoritative Wikidata Q-IDs
 * via the public Wikidata search API.
 */

export interface WikidataSearchResult {
  id: string; // e.g. "Q105638"
  label: string;
  description: string;
  uri: string; // "https://www.wikidata.org/entity/Q105638"
}

export async function resolveWikidataEntity(brandName: string): Promise<WikidataSearchResult | null> {
  const query = brandName.trim();
  if (!query) return null;

  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    query
  )}&language=en&format=json&origin=*&type=item&limit=5`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AgentLens-CLI/1.0 (+https://github.com/Buildingcoolstuff/agentlens)',
      },
    });

    if (!res.ok) {
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
  } catch {
    // Network / timeout fallback
  }

  return null;
}
