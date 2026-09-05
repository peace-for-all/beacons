export type DepartureOrigin = "MOW" | "LED";
export type DepartureWindow = "week" | "month" | "three_months";

export const DEFAULT_DEPARTURE_WINDOW: DepartureWindow = "week";

const departureWindowRanges: Record<DepartureWindow, { minimumDays: number; maximumDays: number; searchTiming: string }> = {
  week: { minimumDays: 0, maximumDays: 14, searchTiming: "about one week from now" },
  month: { minimumDays: 15, maximumDays: 45, searchTiming: "about one month from now" },
  three_months: { minimumDays: 46, maximumDays: 120, searchTiming: "about three months from now" },
};

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

export function departureLinks(placeId: string, origin: DepartureOrigin, window: DepartureWindow = DEFAULT_DEPARTURE_WINDOW) {
  const destination = destinations[placeId];
  if (!destination) return null;
  const query = encodeURIComponent(`Flights from ${originNames[origin]} to ${destination.city} ${departureWindowRanges[window].searchTiming}`);
  const stayQuery = encodeURIComponent(`cancellable first stay in ${destination.city}`);
  return {
    origin,
    airport: destination.airport,
    flightSearch: `https://www.google.com/travel/flights?q=${query}`,
    staySearch: `https://www.google.com/travel/search?q=${stayQuery}`,
    costGuide: destination.costGuide,
  };
}

export function matchesDepartureWindow(daysUntilDeparture: number | null, window: DepartureWindow) {
  if (daysUntilDeparture === null) return false;
  const range = departureWindowRanges[window];
  return daysUntilDeparture >= range.minimumDays && daysUntilDeparture <= range.maximumDays;
}
