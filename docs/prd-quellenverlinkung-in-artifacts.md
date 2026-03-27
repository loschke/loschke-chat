# PRD: Quellenverlinkung in Artifacts

**Status:** Draft  
**Priorität:** Hoch  
**Bereich:** Artifact-Rendering / AI-Response-Pipeline

---

## 1. Problemstellung

Wenn der Assistent das `web_search`-Tool nutzt, erscheinen Quellen ausschließlich im Fließtext der Chat-Antwort. Sie werden nicht in das generierte Artifact übertragen. Damit entstehen drei Probleme:

1. **Vertrauen:** Der Nutzer kann Aussagen im Artifact nicht auf ihre Herkunft prüfen.
2. **Nachvollziehbarkeit:** Quellen gehen im Chat-Verlauf verloren und sind nicht persistiert.
3. **Professionalität:** Generierte Reports, Analysen und Recherche-Dokumente wirken ohne Quellenangaben unvollständig.

---

## 2. Ziel

Quellen, die bei der Generierung eines Artifacts verwendet wurden, sollen transparent, persistent und interaktiv im Artifact selbst verankert sein — ähnlich dem Zitiersystem wissenschaftlicher Artikel oder Wikipedia.

---

## 3. User Stories

| ID | Als... | möchte ich... | damit... |
|----|--------|--------------|----------|
| US-1 | Nutzer | Quellen im Artifact als Fußnoten sehen | ich Aussagen nachprüfen kann |
| US-2 | Nutzer | auf eine Quelle klicken und direkt zur Website gelangen | ich keine manuelle Suche machen muss |
| US-3 | Nutzer | beim Hovern über eine Aussage die Quelle als Tooltip sehen | der Lesefluss nicht unterbrochen wird |
| US-4 | Nutzer | am Ende eines Artifacts ein vollständiges Quellenverzeichnis sehen | ich alle Quellen auf einen Blick habe |
| US-5 | Assistent | Quellen automatisch beim Erstellen eines Artifacts einfügen | kein manueller Schritt nötig ist |

---

## 4. Funktionale Anforderungen

### 4.1 Inline-Zitierung

- Überall wo eine Aussage auf einem Web-Search-Ergebnis basiert, wird eine hochgestellte Zitatnummer eingefügt: `[1]`
- Die Zitierung gilt für Markdown-Artifacts und HTML-Artifacts
- Mehrere Quellen für eine Aussage werden kommasepariert dargestellt: `[1, 2]`
- Die Nummerierung ist fortlaufend und eindeutig pro Artifact

### 4.2 Quellenverzeichnis

- Am Ende jedes Artifacts mit Quellen wird automatisch ein Abschnitt `## Quellen` angehängt
- Jeder Eintrag enthält:
  - Laufende Nummer `[1]`
  - Titel der Webseite oder des Artikels
  - Vollständige URL als klickbarer Link
  - Abrufdatum (ISO-Format: YYYY-MM-DD)
- Beispiel:
  ```
  [1] OpenAI Blog – "GPT-4 Technical Report" — https://openai.com/research/gpt-4 (abgerufen: 2025-01-15)
  ```

### 4.3 Hover-Tooltip

- In HTML-Artifacts: Beim Hovern über eine `[n]`-Zitatmarke erscheint ein Tooltip mit:
  - Titel der Quelle
  - Domain der URL
  - Kurz-Snippet (max. 120 Zeichen) aus dem Search-Ergebnis
- In Markdown-Artifacts: Kein Tooltip (technisch nicht möglich), stattdessen nur Fußnoten

### 4.4 Quellen-Badge im Artifact-Header

- Artifacts mit Quellen erhalten im Header ein kleines Badge: `🔗 N Quellen`
- Klick auf das Badge scrollt zum Quellenverzeichnis

### 4.5 Automatische Aktivierung

- Die Quellenverlinkung wird **automatisch aktiviert**, wenn:
  - Das `web_search`-Tool während der Artifact-Generierung aufgerufen wurde
  - Mindestens eine Quelle in der Antwort verwendet wurde
- Kein manueller Eingriff durch den Nutzer erforderlich

---

## 5. Nicht-funktionale Anforderungen

| Anforderung | Beschreibung |
|-------------|-------------|
| **Konsistenz** | Zitierstil ist einheitlich über alle Artifact-Typen |
| **Performance** | Quellen-Rendering darf das Artifact-Laden nicht messbar verzögern |
| **Robustheit** | Fehlerhafte oder leere URLs werden graceful behandelt (kein Rendering-Fehler) |
| **Barrierefreiheit** | Links haben aussagekräftige `aria-label` Attribute |
| **Responsiveness** | Quellenverzeichnis ist auf mobilen Viewports lesbar |

---

## 6. UX-Spezifikation

### 6.1 Visuelles Design

```
Fließtext mit einer belegten Aussage [1] und einer weiteren [2].

...

---
## Quellen
[1] Titel des Artikels — example.com
    https://example.com/artikel (abgerufen: 2025-01-15)

[2] Zweiter Artikel — andere-seite.de
    https://andere-seite.de/seite (abgerufen: 2025-01-15)
```

### 6.2 Tooltip-Design (HTML-Artifacts)

- Hintergrund: `#1e1e2e` (dark) oder `#f4f4f5` (light), passend zum Artifact-Theme
- Schrift: `12px`, max. Breite `280px`
- Erscheint nach `200ms` Hover-Delay
- Verschwindet beim Verlassen mit `100ms` Fade-out

### 6.3 Zitat-Marker-Styling

```css
.citation-marker {
  font-size: 0.75em;
  vertical-align: super;
  color: var(--accent-color, #6366f1);
  cursor: pointer;
  text-decoration: none;
  font-weight: 600;
}

.citation-marker:hover {
  text-decoration: underline;
}
```

---

## 7. Technische Umsetzung

### 7.1 Datenmodell

Die Quellinformationen aus `web_search`-Ergebnissen werden als strukturiertes Objekt übergeben:

```typescript
interface Source {
  id: number;           // Laufende Nummer
  title: string;        // Seitentitel
  url: string;          // Vollständige URL
  domain: string;       // Nur die Domain (z.B. "openai.com")
  snippet: string;      // Kurzer Textausschnitt (max. 120 Zeichen)
  fetchedAt: string;    // ISO-Datum des Abrufs
}
```

### 7.2 Artifact-Generierungs-Pipeline

1. `web_search` wird aufgerufen → Ergebnisse werden als `Source[]` zwischengespeichert
2. Beim Schreiben des Artifact-Inhalts werden Aussagen mit `[n]` markiert
3. Nach Abschluss des Artifact-Inhalts wird automatisch der `## Quellen`-Block angehängt
4. Bei HTML-Artifacts: Tooltip-CSS und -JS werden inline in das Artifact eingebettet

### 7.3 Markdown-Artifacts

Nutzung des Standard-Markdown-Fußnotenformats für maximale Kompatibilität:

```markdown
Diese Aussage basiert auf einer Studie[^1].

[^1]: Titel des Artikels — https://example.com (abgerufen: 2025-01-15)
```

### 7.4 HTML-Artifacts

Inline-Tooltip via reines CSS/JS (kein externes Framework):

```html
<sup class="citation-marker" data-source-id="1">
  <a href="#source-1">[1]</a>
  <span class="citation-tooltip">
    <strong>Titel des Artikels</strong><br>
    example.com<br>
    "Kurzer Snippet-Text der Quelle..."
  </span>
</sup>
```

---

## 8. Abgrenzung (Out of Scope)

- Automatisches Zitieren von Informationen aus dem Trainings-Wissen (nicht web-search-basiert)
- Export des Quellenverzeichnisses als BibTeX oder andere Zitatformate
- Echtzeit-Überprüfung ob URLs noch erreichbar sind
- Unterschiedliche Zitierstile (APA, MLA, Chicago) — vorerst nur ein einheitlicher Stil

---

## 9. Akzeptanzkriterien

| ID | Kriterium | Testfall |
|----|-----------|----------|
| AC-1 | Artifact mit web_search enthält Inline-Zitate | Recherche-Artifact generieren → `[n]`-Marker vorhanden |
| AC-2 | Quellenverzeichnis am Ende des Artifacts | Scroll to bottom → Abschnitt "Quellen" sichtbar |
| AC-3 | Alle Links im Quellenverzeichnis sind klickbar | Link anklicken → öffnet korrekte URL |
| AC-4 | Tooltip erscheint beim Hovern (HTML) | Maus über `[1]` → Tooltip mit Titel + Snippet |
| AC-5 | Kein Fehler bei fehlendem Snippet | Source ohne Snippet → Tooltip zeigt nur Titel + Domain |
| AC-6 | Artifact ohne web_search hat kein Quellenverzeichnis | Normales Artifact → kein "Quellen"-Abschnitt |
| AC-7 | Badge im Header zeigt Quellenanzahl | Header → `🔗 3 Quellen` sichtbar |

---

## 10. Offene Fragen

| # | Frage | Owner |
|---|-------|-------|
| OQ-1 | Soll der Nutzer Quellen manuell hinzufügen oder entfernen können? | Product |
| OQ-2 | Wie gehen wir mit Paywalled-Quellen um, die nicht öffentlich zugänglich sind? | Product |
| OQ-3 | Soll die Quellenverlinkung per Nutzereinstellung deaktivierbar sein? | Product |
| OQ-4 | Werden Quellen auch bei reinen Code-Artifacts (`language`-Artifacts) benötigt? | Engineering |
