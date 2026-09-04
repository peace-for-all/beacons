# Beacons / Маяки

A map-first browser of realistic departure options. Useful facts remain visible
when they are unchecked or incomplete, with their confidence and sources shown
clearly. The interface is available in English and Russian.

Public site: <https://peace-for-all.github.io/beacons/>

Карта реалистичных вариантов отъезда. Полезные факты остаются видимыми, даже
если они ещё не проверены или неполны; степень уверенности и источники указываются
явно. Интерфейс доступен на русском и английском.

## Develop locally / Локальная разработка

Requires Node.js 22.13 or newer.

```bash
nvm use
npm run install:ci
npm run dev
```

Open the local address printed by the development server.

Before committing, run the complete local gate:

```bash
npm run check
```

The complete gate builds the production artifact and runs the Playwright/axe
browser suite with the installed Chrome. To run that slice alone, use
`npm run test:browser`; use `npm run test:browser:built` only after a successful
production build.

Нужен Node.js версии 22.13 или новее. `nvm use` выберет проверенную для
проекта версию Node.js. Выполните команды выше и откройте локальный адрес,
который появится в терминале.

## Where to edit / Где редактировать

- `content/catalog.json` — validated publishable evidence content / проверяемые публикуемые данные
- `content/corridor-requirements.json` — fail-closed corridor denominator / полный перечень требований маршрута
- `content/journey-guidance.json` — authority policies and structured guidance records / политики полномочий и структурированные инструкции
- `lib/domain/` — schemas, freshness and route evaluators / схемы, свежесть данных и оценка маршрутов
- `app/[lang]/page.tsx` — current localized prototype interface and interactions / текущий локализованный интерфейс прототипа и интерактивность
- `app/globals.css` — visual design and responsive layout / дизайн и адаптивная вёрстка
- `app/[lang]/layout.tsx` — localized page metadata / локализованные метаданные страницы
- `specs/` — RFC and implementation/launch plan / RFC и план реализации и запуска

## Data rule / Правило данных

Displayability and verification are separate. Useful authored facts may be shown
when unchecked, stale, incomplete, or disputed as long as that confidence state
is explicit. Missing information remains unknown rather than becoming “closed.”
Evidence automation, sources, and proof packets improve confidence and remain
available for inspection; they do not decide whether an honestly labelled fact
may appear in the option browser. See [`PLAN.md`](./PLAN.md) for the accepted
product roadmap.

Displayability is also separate from action authority. All current destinations
are research-only candidates. A manifest selects the denominator but grants no
authority. Until its exact policy, proof, scope, and dependencies are complete,
collected route facts can produce only
**Confirm first**, never **Do this**, `Required`, or a calculated stay deadline.
Coverage and blockers are shown per route; one current fact never promotes the
whole destination.

The Serbia first-72-hour packet now records exact expected-but-uncollected
arrangements and contacts separately from evidence. Its evaluator reports the
next unresolved packet requirement and automatically demotes missing, expired,
or non-observed operational records; it does not create travel instructions.

Текущий манифест задаёт полный перечень требований, но сам по себе не разрешает
действовать. До выполнения политики, доказательств, области применимости и всех
зависимостей конкретного пункта собранный факт остаётся «Сначала проверить» и
не может автоматически стать инструкцией или сроком.

Видимость и проверенность данных разделены. Полезные факты можно показывать,
даже если они ещё не проверены, устарели, неполны или оспариваются, при условии
явного указания степени уверенности. Отсутствие данных означает «неизвестно», а
не «закрыто». Автопроверка, источники и пакеты доказательств повышают уверенность
и доступны для изучения, но не решают, можно ли показать честно маркированный
факт в интерфейсе вариантов.
