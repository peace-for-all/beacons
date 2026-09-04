export type DepartureOrigin = "MOW" | "LED";

const destinations: Record<string, { airport: string; city: string; costGuide: string }> = {
  "place.belgrade": { airport: "BEG", city: "Belgrade", costGuide: "https://www.numbeo.com/cost-of-living/in/Belgrade" },
  "place.delhi": { airport: "DEL", city: "Delhi", costGuide: "https://www.numbeo.com/cost-of-living/in/Delhi" },
  "place.istanbul": { airport: "IST", city: "Istanbul", costGuide: "https://www.numbeo.com/cost-of-living/in/Istanbul" },
  "place.yerevan": { airport: "EVN", city: "Yerevan", costGuide: "https://www.numbeo.com/cost-of-living/in/Yerevan" },
  "place.almaty": { airport: "ALA", city: "Almaty", costGuide: "https://www.numbeo.com/cost-of-living/in/Almaty" },
  "place.tbilisi": { airport: "TBS", city: "Tbilisi", costGuide: "https://www.numbeo.com/cost-of-living/in/Tbilisi" },
  "place.dubai": { airport: "DXB", city: "Dubai", costGuide: "https://www.numbeo.com/cost-of-living/in/Dubai" },
};

const originNames: Record<DepartureOrigin, string> = { MOW: "Moscow", LED: "Saint Petersburg" };

export function departureLinks(placeId: string, origin: DepartureOrigin) {
  const destination = destinations[placeId];
  if (!destination) return null;
  const query = encodeURIComponent(`Flights from ${originNames[origin]} to ${destination.city} today`);
  const stayQuery = encodeURIComponent(`cancellable first stay in ${destination.city}`);
  return {
    origin,
    airport: destination.airport,
    flightSearch: `https://www.google.com/travel/flights?q=${query}`,
    staySearch: `https://www.google.com/travel/search?q=${stayQuery}`,
    costGuide: destination.costGuide,
  };
}
