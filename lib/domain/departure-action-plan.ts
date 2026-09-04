import type { Lang } from "@/lib/i18n/messages";
import type { HouseholdCountProfile } from "./household-eligibility";

export type PracticalChecklistItem = {
  id: string;
  text: string;
  status: "practical" | "confirm";
};

function localized(lang: Lang, en: string, ru: string) {
  return lang === "ru" ? ru : en;
}

export function buildPackingList(household: HouseholdCountProfile, lang: Lang): PracticalChecklistItem[] {
  const items: PracticalChecklistItem[] = [
    {
      id: "pack.documents",
      text: localized(lang, "Passports, route documents, paper copies, and encrypted scans for every traveller", "Паспорта, документы по маршруту, бумажные копии и зашифрованные сканы для каждого путешественника"),
      status: "practical",
    },
    {
      id: "pack.health",
      text: localized(lang, "Essential medicines, prescriptions, and medical and vaccination records", "Необходимые лекарства, рецепты, медицинские документы и сведения о прививках"),
      status: "practical",
    },
    {
      id: "pack.power",
      text: localized(lang, "Phones, chargers, power bank, offline itinerary, and important contacts", "Телефоны, зарядные устройства, внешний аккумулятор, офлайн-маршрут и важные контакты"),
      status: "practical",
    },
    {
      id: "pack.money",
      text: localized(lang, "Two working payment methods and a separately stored emergency reserve", "Два работающих способа оплаты и отдельно хранящийся резерв на экстренный случай"),
      status: "practical",
    },
    {
      id: "pack.first-days",
      text: localized(lang, "Three days of weather-appropriate clothes, hygiene items, water, and simple food", "Одежда по погоде, средства гигиены, вода и простая еда на первые три дня"),
      status: "practical",
    },
  ];
  if (household.children > 0) items.push({
    id: "pack.children",
    text: localized(lang, "Children's school and health records, familiar food, comfort item, and age-appropriate travel kit", "Школьные и медицинские документы детей, привычная еда, любимая вещь и дорожный набор по возрасту"),
    status: "practical",
  });
  if (household.dogs > 0) items.push({
    id: "pack.dogs",
    text: localized(lang, "Dog documents and medicines, food, water bowl, harness, lead, muzzle, bags, and carrier required by the booked transport", "Документы и лекарства собаки, корм, миска, шлейка, поводок, намордник, пакеты и контейнер по правилам выбранного перевозчика"),
    status: "confirm",
  });
  return items;
}

export function buildFirstStayChecks(household: HouseholdCountProfile, lang: Lang): PracticalChecklistItem[] {
  return [
    {
      id: "stay.cancellable",
      text: localized(lang, "Refund and cancellation terms are written down and acceptable", "Условия возврата и отмены записаны и подходят вам"),
      status: "practical",
    },
    {
      id: "stay.party",
      text: localized(
        lang,
        `The booking confirms all ${household.adults + household.children} travellers${household.dogs ? ` and ${household.dogs} dog${household.dogs === 1 ? "" : "s"}` : ""}`,
        `Бронирование подтверждает всех путешественников (${household.adults + household.children})${household.dogs ? ` и собак (${household.dogs})` : ""}`,
      ),
      status: "practical",
    },
    {
      id: "stay.arrival",
      text: localized(lang, "Address, host contact, check-in window, and late-arrival instructions are confirmed", "Подтверждены адрес, контакт хозяина, время заезда и инструкции для позднего прибытия"),
      status: "practical",
    },
    {
      id: "stay.registration",
      text: localized(lang, "Who handles any arrival registration is confirmed with the property", "У жилья уточнено, кто оформляет возможную регистрацию по прибытии"),
      status: "confirm",
    },
  ];
}
