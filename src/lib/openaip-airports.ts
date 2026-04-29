type OpenAipAirport = {
  name?: string;
  icaoCode?: string;
  geometry?: {
    coordinates?: [number, number];
  };
};

type OpenAipAirportSearchResponse = {
  items?: OpenAipAirport[];
};

export async function findOpenAipAirportByIcao(icao: string): Promise<OpenAipAirport | null> {
  const normalizedIcao = icao.trim().toUpperCase();
  if (!normalizedIcao) return null;

  const res = await fetch(`/api/openaip?resource=airports&search=${encodeURIComponent(normalizedIcao)}`);
  if (!res.ok) {
    throw new Error('Airport lookup failed.');
  }

  const data = (await res.json()) as OpenAipAirportSearchResponse;
  const items = data.items || [];

  return (
    items.find((item) => item.icaoCode?.toUpperCase() === normalizedIcao) ||
    items.find((item) => item.name?.toUpperCase() === normalizedIcao) ||
    items[0] ||
    null
  );
}
