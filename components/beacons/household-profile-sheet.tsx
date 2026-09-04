"use client";

import { useMemo, useState } from "react";
import type { PreparedRoute } from "@/lib/domain/prepared-route";
import { evaluatePreparedRoute } from "@/lib/domain/prepared-route-client";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { humanHouseholdProfileSchema } from "@/lib/domain/schemas";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type PassportState = "present" | "missing" | "unknown";

function traveller(passport: PassportState, expiresOn: string) {
  const datedPassport = passport === "present" && /^\d{4}-\d{2}-\d{2}$/.test(expiresOn)
    ? { state: "present" as const, expiresOn }
    : { state: passport === "missing" ? "missing" as const : "unknown" as const };
  return { ordinaryPassport: datedPassport, documents: [], authorizations: [] };
}

export function HouseholdProfileSheet({ preparedRoutes, lang, t }: { preparedRoutes: PreparedRoute[]; lang: Lang; t: Messages }) {
  const [adultCount, setAdultCount] = useState<1 | 2>(1);
  const [childAges, setChildAges] = useState<[string, string]>(["6", "17"]);
  const [passports, setPassports] = useState<PassportState[]>(["unknown", "unknown", "unknown", "unknown"]);
  const [passportExpiries, setPassportExpiries] = useState<string[]>(["", "", "", ""]);
  const [origin, setOrigin] = useState<"moscow" | "saint_petersburg">("moscow");
  const household = useMemo(() => {
    const ages = childAges.map(Number);
    if (!ages.every((age) => Number.isInteger(age) && age >= 6 && age <= 17)) return null;
    const children = ages.map((age, index) => ({ ...traveller(passports[adultCount + index], passportExpiries[adultCount + index]), ageYears: age })) as [{ ageYears: number } & ReturnType<typeof traveller>, { ageYears: number } & ReturnType<typeof traveller>];
    return adultCount === 1
      ? humanHouseholdProfileSchema.parse({ schemaVersion: 1, adultCount: 1, adults: [traveller(passports[0], passportExpiries[0])], children })
      : humanHouseholdProfileSchema.parse({ schemaVersion: 1, adultCount: 2, adults: [traveller(passports[0], passportExpiries[0]), traveller(passports[1], passportExpiries[1])], children });
  }, [adultCount, childAges, passportExpiries, passports]);
  const evaluations = household ? preparedRoutes.map((route) => ({ routeId: route.routeId, result: evaluatePreparedRoute({ route, household, journey: { origin }, asOf: new Date().toISOString() }) })) : [];
  const setPassport = (index: number, value: PassportState) => setPassports((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  const travellerCount = adultCount + 2;
  return <Sheet><SheetTrigger asChild><button className="household-trigger" type="button">{t.checkMyHousehold}</button></SheetTrigger><SheetContent side="right" className="household-sheet" lang={lang}><SheetHeader><SheetTitle>{t.householdTitle}</SheetTitle><SheetDescription>{t.householdBoundary}</SheetDescription></SheetHeader><div className="household-form"><label>{t.adults}<select value={adultCount} onChange={(event) => setAdultCount(Number(event.target.value) as 1 | 2)}><option value="1">1</option><option value="2">2</option></select></label><label>{t.travelOrigin}<select value={origin} onChange={(event) => setOrigin(event.target.value as "moscow" | "saint_petersburg")}><option value="moscow">{t.moscow}</option><option value="saint_petersburg">{t.saintPetersburg}</option></select></label>{[0, 1].map((index) => <label key={index}>{t.childAge} {index + 1}<input type="number" min="6" max="17" inputMode="numeric" value={childAges[index]} onChange={(event) => setChildAges((current) => current.map((age, ageIndex) => ageIndex === index ? event.target.value : age) as [string, string])} /></label>)}<fieldset><legend>{t.passports}</legend>{Array.from({ length: travellerCount }, (_, index) => <label key={index}>{index < adultCount ? `${t.adult} ${index + 1}` : `${t.child} ${index - adultCount + 1}`}<select value={passports[index]} onChange={(event) => setPassport(index, event.target.value as PassportState)}><option value="unknown">{t.unknown}</option><option value="present">{t.passportPresent}</option><option value="missing">{t.passportMissing}</option></select>{passports[index] === "present" && <><span>{t.passportExpiry}</span><input type="date" value={passportExpiries[index]} onChange={(event) => setPassportExpiries((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} /></>}</label>)}</fieldset>{!household && <p className="household-warning">{t.validChildAges}</p>}<section className="household-results" aria-live="polite"><h3>{t.householdResult}</h3>{evaluations.length === 0 ? <p>{t.noRoutesReadyForHousehold}</p> : evaluations.map(({ routeId, result }) => <p key={routeId}>{result.presentation}</p>)}</section><p className="household-private">{t.householdPrivate}</p></div></SheetContent></Sheet>;
}
