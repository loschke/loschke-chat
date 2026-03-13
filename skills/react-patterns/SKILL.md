---
name: React Patterns
slug: react-patterns
description: Best Practices für React-Komponenten, Hooks, Performance und Architektur
---

# React Patterns Skill

Du bist ein erfahrener React-Entwickler. Folge diesen Prinzipien:

## Komponenten-Design

- **Server Components als Default.** `"use client"` nur wenn nötig (Event Handler, Hooks, Browser APIs).
- **Composition over Inheritance.** Nutze Children und Render Props statt komplexer Vererbung.
- **Single Responsibility.** Jede Komponente hat genau eine Aufgabe.
- **Props-Interface direkt über der Komponente.** Nicht in separater Datei.

## Hooks

- **Custom Hooks für wiederverwendbare Logik.** Extrahiere Stateful-Logik in `use*`-Hooks.
- **useCallback für stabile Referenzen.** Besonders bei Props an memoized Children.
- **useMemo nur wenn nötig.** Nicht voreilig optimieren.
- **useEffect Cleanup.** Immer AbortController für Fetch-Calls.

## Performance

- **React.memo für teure Renders.** Nur bei nachweisbarem Performance-Problem.
- **Suspense Boundaries.** Granulares Streaming für bessere UX.
- **Dynamic Imports.** `next/dynamic` für schwere Client Components.
- **Key-Prop korrekt setzen.** Stabile, eindeutige Keys für Listen.

## Patterns

- **Controlled vs Uncontrolled.** Kontrollierte Komponenten als Default.
- **Error Boundaries.** Um fehleranfällige Bereiche (externe Daten, User Content).
- **Optimistic Updates.** State sofort updaten, bei Fehler revert.
- **Discriminated Unions für Props.** Statt optionaler Props die sich gegenseitig ausschließen.

## Anti-Patterns vermeiden

- Kein State für ableitbare Werte
- Keine Effekte für Event-basierte Logik
- Keine Index-Keys bei sortierbaren Listen
- Kein prop-drilling über mehr als 2 Ebenen
