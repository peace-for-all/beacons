import type { Lang } from "@/lib/i18n/messages";
import { formatStructuredFact } from "@/lib/i18n/format";
import type { PlaceView, SourceView } from "./catalog-view";
import type { HouseholdCountProfile } from "./household-eligibility";

export type RelocationPhaseId = "prepare_local" | "arrange_remote" | "after_arrival";
export type RelocationTaskStatus = "planning" | "required" | "confirm";

export type RelocationTask = {
  id: string;
  text: string;
  timing: string;
  status: RelocationTaskStatus;
  notes: string[];
  sources: Pick<SourceView, "publisher" | "url">[];
};

export type RelocationPhase = {
  id: RelocationPhaseId;
  tasks: RelocationTask[];
};

function localized(lang: Lang, en: string, ru: string) {
  return lang === "ru" ? ru : en;
}

function planning(id: string, lang: Lang, timing: [string, string], text: [string, string]): RelocationTask {
  // Generic life-admin guidance stays visibly separate from sourced route rules.
  // Only claimTask may label an item as a route requirement.
  return { id, timing: localized(lang, ...timing), text: localized(lang, ...text), status: "planning", notes: [], sources: [] };
}

function claimTask(
  claim: PlaceView["routes"][number]["claims"][number],
  id: string,
  lang: Lang,
  timing: [string, string],
  text: [string, string],
): RelocationTask {
  return {
    id,
    timing: localized(lang, ...timing),
    text: localized(lang, ...text),
    status: claim.actionState === "do_this" ? "required" : "confirm",
    notes: claim.limitations.map((note) => note[lang]),
    sources: claim.sources.map(({ publisher, url }) => ({ publisher, url })),
  };
}

function claimGroupTask(
  claims: PlaceView["routes"][number]["claims"],
  id: string,
  lang: Lang,
  timing: [string, string],
  text: [string, string],
): RelocationTask {
  const sources = [...new Map(
    claims.flatMap((claim) => claim.sources).map((source) => [source.url, source]),
  ).values()];
  return {
    id,
    timing: localized(lang, ...timing),
    text: localized(lang, ...text),
    status: claims.length > 0 && claims.every((claim) => claim.actionState === "do_this") ? "required" : "confirm",
    notes: [...new Set(claims.flatMap((claim) => claim.limitations.map((note) => note[lang])))],
    sources: sources.map(({ publisher, url }) => ({ publisher, url })),
  };
}

export function buildRelocationPlan({
  place,
  household,
  lang,
}: {
  place: PlaceView;
  household: HouseholdCountProfile;
  lang: Lang;
}): RelocationPhase[] {
  const claims = place.routes.flatMap((route) => route.claims);
  const applicationTiming = claims.find((claim) => claim.fact.kind === "application_timing");
  const entryRestriction = claims.find((claim) => claim.fact.kind === "entry_restriction");
  const registration = claims.filter((claim) => claim.fact.kind === "arrival_registration");
  const hostRegistration = registration.find((claim) =>
    claim.fact.kind === "arrival_registration" &&
    claim.fact.responsibleParty === "accommodation_provider_or_host"
  );
  const selfRegistration = registration.find((claim) =>
    claim.fact.kind === "arrival_registration" &&
    claim.fact.responsibleParty === "traveller_when_self_arranged"
  );
  const qualifyingPurpose = claims.find((claim) => claim.fact.kind === "qualifying_purpose");
  const stayRule = claims.find((claim) => claim.fact.kind === "stay_rule" && !claim.actionQuarantine);

  const prepareLocal: RelocationTask[] = [
    planning("local.work", lang, ["Start now", "Начать сейчас"], [
      "Set a written work departure plan: approved remote work, leave, or resignation. Save signed copies and final-pay contacts.",
      "Письменно оформить план по работе: согласованная удалёнка, отпуск или увольнение. Сохранить подписанные документы и контакты по окончательному расчёту.",
    ]),
    planning("local.home", lang, ["Before advertising or giving notice", "До публикации объявления или уведомления"], [
      "Decide whether to keep, rent out, or sell the current home. If renting, arrange a written lease, a trusted local representative, insurance, keys, repairs, and tax advice.",
      "Решить, оставить, сдать или продать нынешнее жильё. При сдаче подготовить договор, надёжного представителя на месте, страховку, передачу ключей, порядок ремонта и налоговую консультацию.",
    ]),
    planning("local.money", lang, ["Before committing to travel", "До невозвратных расходов на поездку"], [
      "Build a departure budget and an emergency reserve accessible from abroad. Test cards, online banking, two-factor authentication, and backup access.",
      "Составить бюджет отъезда и резерв, доступный из-за границы. Проверить карты, онлайн-банк, двухфакторную аутентификацию и резервный доступ.",
    ]),
    planning("local.records", lang, ["Before departure", "До выезда"], [
      "Store encrypted scans and paper backups of important records. Give a trusted contact the itinerary and emergency instructions.",
      "Сохранить зашифрованные сканы и бумажные копии важных документов. Передать доверенному человеку маршрут и инструкции на случай ЧП.",
    ]),
    planning("local.health", lang, ["2–6 weeks before departure", "За 2–6 недель до выезда"], [
      "Refill essential prescriptions and collect medical and vaccination records for every traveller.",
      "Пополнить запас необходимых лекарств и собрать медицинские документы и сведения о прививках для каждого путешественника.",
    ]),
  ];
  if (household.children > 0) prepareLocal.push(planning("local.school", lang, ["Before leaving the current school", "До ухода из нынешней школы"], [
    "Collect school records and agree how withdrawal, absence, or remote study will be handled.",
    "Получить школьные документы и согласовать отчисление, отсутствие или дистанционное обучение.",
  ]));
  if (household.dogs > 0) prepareLocal.push(planning("local.dog", lang, ["Start early enough for veterinary deadlines", "Начать с учётом ветеринарных сроков"], [
    "Book veterinary appointments early enough to complete the destination dog checklist; also confirm the carrier and crate rules.",
    "Записаться к ветеринару заранее, чтобы выполнить чек-лист для ввоза собаки; отдельно уточнить правила перевозчика и требования к контейнеру.",
  ]));

  const arrangeRemote: RelocationTask[] = [
    planning("remote.housing", lang, ["Before booking non-refundable travel", "До невозвратного бронирования поездки"], [
      `Arrange cancellable initial accommodation in ${place.city[lang]} and get written confirmation for every person${household.dogs ? " and dog" : ""} in the party.`,
      `Организовать отменяемое первое жильё в городе ${place.city[lang]} и получить письменное подтверждение для всех людей${household.dogs ? " и собак" : ""}.`,
    ]),
    planning("remote.fraud-check", lang, ["Before paying a housing deposit", "До внесения залога за жильё"], [
      "Verify the landlord or host, address, contract, refund terms, and the property by live video. Avoid irreversible transfers until these checks pass.",
      "Проверить арендодателя или хозяина, адрес, договор, условия возврата и жильё по видеосвязи. Не делать необратимый перевод до завершения проверок.",
    ]),
    planning("remote.arrival-plan", lang, ["Before departure", "До выезда"], [
      "Plan the airport or station transfer and the first 72 hours: working mobile data, food, medicines, payment backup, and an emergency contact.",
      "Спланировать трансфер из аэропорта или с вокзала и первые 72 часа: мобильную связь, еду, лекарства, резервный способ оплаты и экстренный контакт.",
    ]),
  ];
  if (applicationTiming?.fact.kind === "application_timing") {
    const maximum = applicationTiming.fact.maximumDaysBeforeArrival;
    arrangeRemote.push(claimTask(applicationTiming, "remote.application-window", lang,
      [`${applicationTiming.fact.minimumDaysBeforeArrival}${maximum ? `–${maximum}` : "+"} days before arrival`, `За ${applicationTiming.fact.minimumDaysBeforeArrival}${maximum ? `–${maximum}` : "+"} дн. до прибытия`],
      ["Submit and track a separate entry application for every traveller; do not treat submission as permission to travel.", "Подать и отслеживать отдельное заявление на въезд для каждого путешественника; не считать факт подачи разрешением на поездку."],
    ));
  }
  if (entryRestriction?.fact.kind === "entry_restriction") arrangeRemote.push(claimTask(entryRestriction, "remote.entry-point", lang, ["Before buying tickets", "До покупки билетов"], [
    `Confirm that the booked arrival point is allowed. Collected route: ${entryRestriction.fact.entryPoints.join(", ")}.`,
    `Убедиться, что выбранный пункт прибытия разрешён. Собранный маршрут: ${entryRestriction.fact.entryPoints.join(", ")}.`,
  ]));
  if (registration.length > 0) {
    const hostRule = hostRegistration?.fact.kind === "arrival_registration"
      ? formatStructuredFact(hostRegistration.fact, "en")
      : "The host-registration path is not established.";
    const hostRuleRu = hostRegistration?.fact.kind === "arrival_registration"
      ? formatStructuredFact(hostRegistration.fact, "ru")
      : "Порядок регистрации принимающей стороной не установлен.";
    const selfRule = selfRegistration?.fact.kind === "arrival_registration"
      ? formatStructuredFact(selfRegistration.fact, "en")
      : "The self-arranged registration path is not established.";
    const selfRuleRu = selfRegistration?.fact.kind === "arrival_registration"
      ? formatStructuredFact(selfRegistration.fact, "ru")
      : "Порядок самостоятельной регистрации не установлен.";
    arrangeRemote.push(claimGroupTask(registration, "remote.registration-arrangement", lang, ["Before confirming accommodation", "До подтверждения жилья"], [
      `Choose the actual registration arrangement and confirm how each traveller is handled. Collected paths: ${hostRule} ${selfRule}`,
      `Выбрать фактический порядок регистрации и уточнить оформление каждого путешественника. Собранные варианты: ${hostRuleRu} ${selfRuleRu}`,
    ]));
  }
  if (household.children > 0) arrangeRemote.push({
    ...planning("remote.school", lang, ["Before arrival", "До прибытия"], ["Contact possible schools and confirm enrolment, language support, records, deadlines, and whether visitor status is sufficient.", "Связаться с возможными школами и уточнить зачисление, языковую поддержку, документы, сроки и достаточно ли гостевого статуса."]),
    status: "confirm",
  });
  if (household.dogs > 0) arrangeRemote.push({
    ...planning("remote.dog-carrier", lang, ["Before buying tickets", "До покупки билетов"], ["Get written carrier acceptance for every dog and confirm crate, breed, seasonal, transit, and arrival-veterinary rules.", "Получить письменное подтверждение перевозки каждой собаки и уточнить требования к контейнеру, породе, сезону, транзиту и ветеринарному контролю по прибытии."]),
    status: "confirm",
  });

  const afterArrival: RelocationTask[] = [
    planning("arrival.border", lang, ["Before leaving the border or airport", "До выхода из пограничной зоны или аэропорта"], [
      "Check that every passport and authorisation was accepted under the expected route. Photograph entry stamps and keep transport records.",
      "Проверить, что каждый паспорт и разрешение приняты по ожидаемому маршруту. Сфотографировать въездные штампы и сохранить транспортные документы.",
    ]),
    stayRule?.fact.kind === "stay_rule" ? claimTask(stayRule, "arrival.deadline", lang, ["On the day of arrival", "В день прибытия"], [
      `Record the actual arrival date and calculate the lawful departure deadline using prior stays. Collected rule: ${formatStructuredFact(stayRule.fact, "en")}`,
      `Записать фактическую дату прибытия и рассчитать законный срок выезда с учётом предыдущих поездок. Собранное правило: ${formatStructuredFact(stayRule.fact, "ru")}`,
    ]) : planning("arrival.deadline", lang, ["On the day of arrival", "В день прибытия"], [
      "Record the actual arrival date and confirm the lawful departure deadline using prior stays as well as the applicable route limit.",
      "Записать фактическую дату прибытия и уточнить законный срок выезда с учётом предыдущих поездок и применимого лимита маршрута.",
    ]),
    planning("arrival.housing", lang, ["Before signing a long lease", "До подписания долгосрочной аренды"], [
      "Inspect long-term accommodation, verify the owner and contract, test utilities and internet, and document the condition before paying.",
      "Осмотреть долгосрочное жильё, проверить собственника и договор, протестировать коммунальные услуги и интернет, зафиксировать состояние до оплаты.",
    ]),
    planning("arrival.basics", lang, ["First 72 hours", "Первые 72 часа"], [
      "Set up reliable communications and local payments while preserving emergency access to the original phone number and bank accounts.",
      "Настроить надёжную связь и местные платежи, сохранив экстренный доступ к прежнему номеру телефона и банковским счетам.",
    ]),
  ];
  if (registration.length > 0) {
    const withinHours = Math.min(...registration.flatMap((claim) =>
      claim.fact.kind === "arrival_registration" ? [claim.fact.withinHours] : []
    ));
    afterArrival.push(claimGroupTask(registration, "arrival.registration", lang, [`Within ${withinHours} hours`, `В течение ${withinHours} ч.`], [
      "Follow the collected registration path that matches the actual accommodation arrangement. Keep proof and confirm separately how every traveller is handled; no family-batching rule has been established.",
      "Выполнить собранный порядок регистрации, соответствующий фактическому размещению. Сохранить подтверждение и отдельно уточнить оформление каждого путешественника: правило общей семейной регистрации не установлено.",
    ]));
  }
  afterArrival.push({
    ...(qualifyingPurpose ? claimTask(qualifyingPurpose, "arrival.status-boundary", lang, ["Before work, study, or a longer stay", "До работы, учёбы или длительного проживания"], ["Do not assume visitor entry permits work, study, or residence. Confirm and obtain the separate status required before starting.", "Не считать, что гостевой въезд разрешает работу, учёбу или проживание. До начала уточнить и получить отдельный необходимый статус."]) : planning("arrival.status-boundary", lang, ["Before work, study, or a longer stay", "До работы, учёбы или длительного проживания"], ["Do not assume visitor entry permits work, study, or residence. Confirm and obtain the separate status required before starting.", "Не считать, что гостевой въезд разрешает работу, учёбу или проживание. До начала уточнить и получить отдельный необходимый статус."])),
    status: "confirm",
  });
  if (household.children > 0) afterArrival.push({ ...planning("arrival.school", lang, ["First week", "Первая неделя"], ["Confirm the local school, health, and registration steps for every child before relying on a long-term arrangement.", "Уточнить местные школьные, медицинские и регистрационные шаги для каждого ребёнка до расчёта на долгосрочное устройство."]), status: "confirm" });
  if (household.dogs > 0) afterArrival.push({ ...planning("arrival.dog", lang, ["On arrival and during the first week", "По прибытии и в первую неделю"], ["Complete any arrival veterinary control, check the dog after travel, find a local veterinarian, and confirm local registration or leash rules.", "Пройти требуемый ветеринарный контроль по прибытии, проверить состояние собаки после поездки, найти местного ветеринара и уточнить местные правила регистрации и выгула."]), status: "confirm" });

  return [
    { id: "prepare_local", tasks: prepareLocal },
    { id: "arrange_remote", tasks: arrangeRemote },
    { id: "after_arrival", tasks: afterArrival },
  ];
}
