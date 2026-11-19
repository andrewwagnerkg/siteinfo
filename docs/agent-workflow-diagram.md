# Схема агентской разработки сайта

Интерактивная версия (Whiteboard): https://claude.ai/artifact/7zBXwEwTpg9fuTUNB5FFuS

Связанный документ: `docs/tech-stack-decision.md`

Запросы может писать любой участник команды, который склонировал репозиторий. Агенты, правила и документация лежат в репозитории.

## Разработка → dev-стенд

```mermaid
flowchart LR
    O[Участник команды<br/>клонировал репо,<br/>пишет запрос]:::owner --> P[Программист<br/>страницы, ссылки]:::agent
    P --> D[Дизайнер<br/>дизайн-система]:::agent
    D --> C[Контент / SMM<br/>тексты, переводы]:::agent
    C --> T[Тестировщик<br/>автотесты Playwright]:::agent
    T -. ошибки → исправить .-> P
    T -- тесты пройдены --> PR[Pull request<br/>одобряет любой<br/>другой участник]:::owner
    PR --> M[Слияние в main<br/>автосборка dev]:::auto
    M --> DEV[GitHub Pages<br/>dev-стенд]:::site
    DEV -. следующий запрос .-> O

    classDef owner fill:#FFE9A8,stroke:#C9A227
    classDef agent fill:#CFE3FF,stroke:#3B6FB6
    classDef auto fill:#FFFFFF,stroke:#888888
    classDef site fill:#CDEFD3,stroke:#3A8F4B
```

## Релиз на prod

```mermaid
flowchart LR
    DEV[GitHub Pages<br/>dev-стенд]:::site -- версия нравится --> R[Любой участник<br/>«опубликуй на prod»]:::owner
    R --> PUB[Публикатор<br/>ставит тег v1.2.0]:::agent
    PUB --> GA[GitHub Actions<br/>сборка для prod]:::auto
    GA -.-> PROD[Prod с доменом<br/>решим позже]:::site

    classDef owner fill:#FFE9A8,stroke:#C9A227
    classDef agent fill:#CFE3FF,stroke:#3B6FB6
    classDef auto fill:#FFFFFF,stroke:#888888
    classDef site fill:#CDEFD3,stroke:#3A8F4B
```

Откат: «опубликуй v1.1.0» — GitHub Actions выкладывает старый тег.

Легенда: жёлтый — участник команды, синий — агенты, белый — автоматика GitHub, зелёный — сайт онлайн.

## Что лежит в репозитории
- `CLAUDE.md` — общие правила агентов
- `.claude/agents/` — описания агентов
- `docs/` — ТЗ, решения, схемы
- `src/` + `src/content/` — код и контент сайта

## Стек
Astro · Markdown в Git · Tailwind CSS · Astro i18n · Playwright · GitHub Actions · GitHub Pages (dev, $0) · prod — решим позже
