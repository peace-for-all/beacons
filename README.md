# Beacons / Маяки

An evidence-first map of viable paths to a new life. The interface is available in English and Russian.

Карта возможных путей к новой жизни, основанная на проверяемых источниках. Интерфейс доступен на русском и английском.

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

Нужен Node.js версии 22.13 или новее. `nvm use` выберет проверенную для
проекта версию Node.js. Выполните команды выше и откройте локальный адрес,
который появится в терминале.

## Where to edit / Где редактировать

- `content/catalog.json` — validated publishable evidence content / проверяемые публикуемые данные
- `lib/domain/` — schemas, freshness and route evaluators / схемы, свежесть данных и оценка маршрутов
- `app/page.tsx` — current prototype interface and interactions / текущий интерфейс прототипа и интерактивность
- `app/globals.css` — visual design and responsive layout / дизайн и адаптивная вёрстка
- `app/layout.tsx` — page metadata / метаданные страницы
- `specs/` — RFC and implementation/launch plan / RFC и план реализации и запуска

## Data rule / Правило данных

Every critical claim must include current official primary evidence and a traceable automation decision. The decision links the structured fact to the exact observed passage, source metadata, fingerprints, extractor and policy versions, and freshness window. Missing, changed, contradictory, or untraceable evidence fails closed. A person may inspect every proof packet, but publication never waits for—or treats—a confirmation click as evidence. Unknowns remain explicitly unknown. Personalisation annotates options; it does not rank human worth or erase the underlying map.

У каждого критически важного утверждения должны быть актуальные официальные первичные доказательства и прослеживаемое решение автоматики. Решение связывает структурированный факт с точным наблюдавшимся фрагментом, метаданными источника, отпечатками, версиями экстрактора и политики, а также сроком актуальности. Отсутствующие, изменившиеся, противоречивые или непрослеживаемые данные приводят к безопасному отказу. Человек может изучить любой пакет доказательств, но публикация не ждёт и не считает нажатие кнопки доказательством. Неизвестное остаётся явно неизвестным. Персонализация поясняет варианты, но не ранжирует людей и не скрывает исходную карту.
