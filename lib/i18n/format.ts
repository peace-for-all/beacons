import type { EvidenceClaim } from "@/lib/domain/schemas";
import type { Lang } from "./messages";

type Fact = EvidenceClaim["fact"];

const words = {
  en: {
    yes: "Yes", no: "No", required: "Required", refusalGround: "Entry may be refused if missing", mayBeRequested: "May be requested",
    recommended: "Recommended", notRequired: "Not required", arrival: "arrival",
    departure: "planned departure", evisa: "an electronic visa", visitorVisa: "a visitor visa",
    otherAuthorization: "an entry authorisation", accommodationProvider: "the accommodation provider or host",
    traveller: "the traveller when arranging their own accommodation",
  },
  ru: {
    yes: "Да", no: "Нет", required: "Требуется", refusalGround: "При отсутствии возможен отказ во въезде", mayBeRequested: "Могут запросить",
    recommended: "Рекомендуется", notRequired: "Не требуется", arrival: "прибытия",
    departure: "планируемого выезда", evisa: "электронная виза", visitorVisa: "гостевая виза",
    otherAuthorization: "разрешение на въезд", accommodationProvider: "средство размещения или принимающая сторона",
    traveller: "путешественник при самостоятельном размещении",
  },
} as const;

function documentLabel(kind: string, lang: Lang) {
  const labels: Record<string, { en: string; ru: string }> = {
    insurance: { en: "travel insurance", ru: "страховка для поездки" },
    accommodation: { en: "accommodation evidence", ru: "подтверждение размещения" },
    onward_ticket: { en: "onward ticket", ru: "билет для дальнейшего выезда" },
    return_ticket: { en: "return ticket", ru: "обратный билет" },
    guardian_consent: { en: "guardian consent", ru: "согласие законного представителя" },
    birth_certificate: { en: "birth certificate", ru: "свидетельство о рождении" },
    proof_of_funds: { en: "proof of funds", ru: "подтверждение средств" },
    passport_blank_pages: { en: "blank passport pages", ru: "свободные страницы паспорта" },
    passport_scan: { en: "passport scan", ru: "скан паспорта" },
    portrait_photo: { en: "portrait photograph", ru: "фотография" },
    printed_eta: { en: "printed travel authorisation", ru: "распечатанное разрешение на поездку" },
    other: { en: "other document", ru: "другой документ" },
  };
  return labels[kind]?.[lang] ?? kind;
}

export function formatChecklistRequirement(fact: Extract<Fact, { kind: "requirement" }>, lang: Lang): string {
  const requirement = fact.requirement;
  if (requirement.kind === "ordinary_passport_present") return lang === "ru" ? "Действующий обычный загранпаспорт" : "Valid ordinary passport";
  if (requirement.kind === "passport_validity") {
    const months = requirement.minimumRemainingCalendarMonths;
    const days = requirement.minimumRemainingDays;
    if (!months && !days) return lang === "ru" ? "Обычный загранпаспорт, действующий на дату прибытия" : "Ordinary passport valid on arrival";
    const duration = months ? `${months} ${lang === "ru" ? "мес." : "calendar month(s)"}` : `${days} ${lang === "ru" ? "дн." : "day(s)"}`;
    return lang === "ru"
      ? `Обычный загранпаспорт с запасом срока не менее ${duration} с даты ${requirement.basis === "arrival" ? words.ru.arrival : words.ru.departure}`
      : `Ordinary passport valid for at least ${duration} from ${requirement.basis === "arrival" ? words.en.arrival : words.en.departure}`;
  }
  if (requirement.kind === "entry_authorization") {
    const labels = {
      evisa: { en: "Granted individual e-Visa / ETA", ru: "Одобренная индивидуальная электронная виза / ETA" },
      visitor_visa: { en: "Granted individual visitor visa", ru: "Одобренная индивидуальная гостевая виза" },
      other: { en: "Granted individual entry authorisation", ru: "Одобренное индивидуальное разрешение на въезд" },
    } as const;
    return labels[requirement.authorizationKind][lang];
  }
  const labels: Record<string, { en: string; ru: string }> = {
    insurance: { en: "Travel insurance covering this traveller", ru: "Страховка, покрывающая этого путешественника" },
    accommodation: { en: "Accommodation booking or host confirmation", ru: "Бронь жилья или подтверждение принимающей стороны" },
    onward_ticket: { en: "Return or onward ticket", ru: "Обратный билет или билет для дальнейшего выезда" },
    return_ticket: { en: "Return ticket", ru: "Обратный билет" },
    guardian_consent: { en: "Guardian consent", ru: "Согласие законного представителя" },
    birth_certificate: { en: "Birth certificate", ru: "Свидетельство о рождении" },
    proof_of_funds: { en: "Proof of sufficient funds", ru: "Подтверждение достаточных средств" },
    passport_blank_pages: { en: "Required blank passport pages", ru: "Необходимые свободные страницы загранпаспорта" },
    passport_scan: { en: "Passport scan", ru: "Скан загранпаспорта" },
    portrait_photo: { en: "Portrait photograph", ru: "Фотография" },
    printed_eta: { en: "Printed granted ETA / travel authorisation", ru: "Распечатанное одобренное ETA / разрешение на поездку" },
    other: { en: "Other stated document", ru: "Другой указанный документ" },
  };
  return labels[requirement.documentKind]?.[lang] ?? documentLabel(requirement.documentKind, lang);
}

function stayRule(rule: Extract<Fact, { kind: "stay_rule" }> ["rule"], lang: Lang): string {
  if (rule.kind === "per_entry") return lang === "ru" ? `До ${rule.allowedDays} дней за один въезд.` : `Up to ${rule.allowedDays} days per entry.`;
  if (rule.kind === "rolling_window") return lang === "ru" ? `До ${rule.allowedDays} дней в каждые ${rule.windowDays} дней.` : `Up to ${rule.allowedDays} days in each ${rule.windowDays}-day period.`;
  if (rule.kind === "calendar_period") return lang === "ru" ? `До ${rule.allowedMonths} мес. с даты въезда.` : `Up to ${rule.allowedMonths} month(s) from entry.`;
  if (rule.kind === "authorization_dependent") return lang === "ru" ? `Можно запросить до ${rule.requestableDays} дней; срок зависит от разрешения.` : `Up to ${rule.requestableDays} days may be requested; the authorised stay controls.`;
  const parts = rule.constraints.map((constraint) => stayRule(constraint as Extract<Fact, { kind: "stay_rule" }> ["rule"], lang).replace(/[.]$/, ""));
  return lang === "ru" ? `Одновременно действуют ограничения: ${parts.join("; ")}.` : `These limits apply together: ${parts.join("; ")}.`;
}

export function formatStructuredFact(fact: Fact, lang: Lang): string {
  const t = words[lang];
  switch (fact.kind) {
    case "nationality_eligibility": return lang === "ru" ? `Граждане России: ${fact.eligible ? "подходят" : "не подходят"}.` : `Russian nationals are ${fact.eligible ? "eligible" : "not eligible"}.`;
    case "passport_type_eligibility": return lang === "ru" ? `Обычный загранпаспорт: ${fact.eligible ? "подходит" : "не подходит"}.` : `An ordinary passport is ${fact.eligible ? "eligible" : "not eligible"}.`;
    case "route_availability": return fact.availability === "verified_eligible"
      ? (lang === "ru" ? "Обычный маршрут подтверждён." : "An ordinary route is verified.")
      : (lang === "ru" ? "Можно подать заявление." : "An application route is available.");
    case "stay_rule": return stayRule(fact.rule, lang);
    case "traveller_applicability": return lang === "ru" ? `Это правило ${fact.applies ? "применимо" : "не применимо"} к указанным путешественникам.` : `This rule ${fact.applies ? "applies" : "does not apply"} to the specified travellers.`;
    case "arrival_registration": return lang === "ru" ? `Регистрация нужна в течение ${fact.withinHours} ч.; отвечает ${fact.responsibleParty === "accommodation_provider_or_host" ? t.accommodationProvider : t.traveller}.` : `Registration is due within ${fact.withinHours} hours; ${fact.responsibleParty === "accommodation_provider_or_host" ? t.accommodationProvider : t.traveller} is responsible.`;
    case "application_timing": return lang === "ru" ? `Подавать не менее чем за ${fact.minimumDaysBeforeArrival} дн. до прибытия${fact.maximumDaysBeforeArrival ? ` и не более чем за ${fact.maximumDaysBeforeArrival} дн.` : ""}.` : `Apply at least ${fact.minimumDaysBeforeArrival} days before arrival${fact.maximumDaysBeforeArrival ? ` and no more than ${fact.maximumDaysBeforeArrival} days before arrival` : ""}.`;
    case "entry_restriction": return lang === "ru" ? `Разрешённые пункты въезда: ${fact.entryPoints.join(", ")}.` : `Allowed entry points: ${fact.entryPoints.join(", ")}.`;
    case "airport_transit_rule": return lang === "ru"
      ? "Транзитная виза не требуется только при нахождении в транзитной зоне аэропорта; компетентные органы могут проверить документы."
      : "A transit visa is not required only while remaining in the airport transit area; competent authorities may check documents.";
    case "per_traveller_application": return lang === "ru" ? `Отдельное заявление для каждого путешественника: ${fact.required ? t.yes : t.no}.` : `A separate application is required for each traveller: ${fact.required ? t.yes : t.no}.`;
    case "qualifying_purpose": return lang === "ru" ? `Подходящие цели: ${fact.purposes.join(", ")}. Нужна правдивая декларация.` : `Qualifying purposes: ${fact.purposes.join(", ")}. A truthful declaration is required.`;
    case "fee_rule": {
      const amount = new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-GB", { style: "currency", currency: fact.currency }).format(fact.amountMinor / 100);
      return lang === "ru" ? `Сбор: ${amount}${fact.perTraveller ? " с каждого путешественника" : " за заявление"}; ${fact.refundable ? "возвращается" : "не возвращается"}.` : `Fee: ${amount}${fact.perTraveller ? " per traveller" : " per application"}; ${fact.refundable ? "refundable" : "non-refundable"}.`;
    }
    case "origin_departure_rule": {
      const labels = {
        valid_travel_document: { en: "A valid travel document is required to leave Russia.", ru: "Для выезда из России нужен действующий документ для зарубежных поездок." },
        child_birth_certificate_not_exit_document: { en: "A birth certificate is not an exit document for a child under 14 from 20 January 2026.", ru: "С 20 января 2026 года свидетельство о рождении не является документом для выезда ребёнка до 14 лет." },
        child_own_valid_travel_document: { en: "A child needs their own valid travel document to leave Russia for Serbia.", ru: "Для выезда из России в Сербию ребёнку нужен собственный действующий проездной документ." },
        child_with_legal_representative_if_no_objection: { en: "A child may leave with one legal representative if no applicable objection is filed.", ru: "Ребёнок может выехать с одним законным представителем при отсутствии применимого заявления о несогласии." },
        unaccompanied_child_notarized_consent: { en: "An unaccompanied child needs a passport and notarized consent from one legal representative.", ru: "Ребёнку без сопровождения нужны паспорт и нотариальное согласие одного законного представителя." },
        representative_objection_scope_and_withdrawal: { en: "A representative may file a scoped departure objection and may withdraw it outside court.", ru: "Представитель может подать ограниченное заявление о несогласии на выезд и отозвать его во внесудебном порядке." },
        court_resolution_if_disputed: { en: "A dispute over a departure objection is resolved by a court.", ru: "Спор о несогласии на выезд разрешается судом." },
      };
      return labels[fact.rule][lang];
    }
    case "requirement": {
      const requirement = fact.requirement;
      if (requirement.kind === "ordinary_passport_present") return lang === "ru" ? "Нужен обычный загранпаспорт." : "An ordinary passport is required.";
      if (requirement.kind === "passport_validity") {
        const duration = requirement.minimumRemainingCalendarMonths ? `${requirement.minimumRemainingCalendarMonths} ${lang === "ru" ? "мес." : "calendar month(s)"}` : `${requirement.minimumRemainingDays ?? 0} ${lang === "ru" ? "дн." : "day(s)"}`;
        return lang === "ru" ? `Паспорт должен быть действителен ещё ${duration} с даты ${requirement.basis === "arrival" ? t.arrival : t.departure}.` : `The passport must remain valid for ${duration} from ${requirement.basis === "arrival" ? t.arrival : t.departure}.`;
      }
      if (requirement.kind === "entry_authorization") {
        const name = requirement.authorizationKind === "evisa" ? t.evisa : requirement.authorizationKind === "visitor_visa" ? t.visitorVisa : t.otherAuthorization;
        return lang === "ru" ? `Требуется ${name}.` : `${name[0].toUpperCase()}${name.slice(1)} is required.`;
      }
      const obligation = requirement.obligation === "required" ? t.required : requirement.obligation === "entry_may_be_refused_if_missing" ? t.refusalGround : requirement.obligation === "may_be_requested" ? t.mayBeRequested : requirement.obligation === "recommended" ? t.recommended : t.notRequired;
      return lang === "ru" ? `${obligation}: ${documentLabel(requirement.documentKind, lang)}.` : `${obligation}: ${documentLabel(requirement.documentKind, lang)}.`;
    }
  }
}
