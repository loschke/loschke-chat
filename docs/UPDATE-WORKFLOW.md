# Update-Workflow für loschke-chat

## Git-Konfiguration

Ihr Repository ist jetzt korrekt eingerichtet:

```bash
# Ihr Fork (für eigene Änderungen)
origin: https://github.com/loschke/loschke-chat.git

# Vercel Original (für Updates)
upstream: https://github.com/vercel/ai-chatbot.git
```

## Updates vom Original holen

### Regelmäßige Updates (monatlich oder bei Bedarf)

```bash
# 1. Sicherstellen, dass alle lokalen Änderungen committed sind
git status

# 2. Updates vom Original holen
git fetch upstream

# 3. In den main Branch wechseln
git checkout main

# 4. Original-Updates mergen
git merge upstream/main

# 5. Konflikte lösen (falls welche auftreten)
# - Dateien mit Konflikten manuell bearbeiten
# - git add <datei>
# - git commit

# 6. Zu Ihrem Fork pushen
git push origin main
```

### Strategie für Konflikte

**Dateien, die Sie IMMER vom Upstream übernehmen sollten:**
- `lib/ai/` - AI SDK Core-Logik
- `components/chat.tsx` - Hauptchat-Interface
- `components/multimodal-input.tsx` - Input-Handling
- `app/(chat)/api/chat/route.ts` - Chat-API-Route
- `package.json` - Dependencies (mit Vorsicht, eigene hinzufügen)

**Dateien, die Sie CUSTOM halten (nie überschreiben):**
- `VISION.md` - Ihre Projekt-Vision
- `UPDATE-WORKFLOW.md` - Diese Datei
- Zukünftige custom Dateien:
  - `lib/prompts/` - Ihr Prompt-Builder
  - `lib/subscriptions/` - Ihr Billing-System
  - `app/components/` - Ihre Komponenten-Verwaltung
  - `components/component-lib/` - Ihre UI-Komponenten

**Dateien, die SORGFÄLTIG gemerged werden müssen:**
- `.env.example` - Fügen Sie Ihre Umgebungsvariablen hinzu
- `lib/db/schema.ts` - Erweitern Sie das Schema, überschreiben Sie nicht
- `middleware.ts` - Kann Anpassungen für Subscription-Checks brauchen
- `app/layout.tsx` - UI-Anpassungen

## Vor dem Merge: Backup erstellen

```bash
# Branch für aktuellen Stand erstellen (vor Update)
git checkout -b backup-before-update-$(date +%Y%m%d)
git push origin backup-before-update-$(date +%Y%m%d)

# Zurück zu main für Update
git checkout main
```

## Nach dem Merge: Testen

```bash
# Dependencies neu installieren
pnpm install

# Datenbank-Migrationen prüfen
pnpm db:migrate

# Entwicklungsserver starten
pnpm dev

# Tests ausführen
pnpm test
```

## Selektive Updates (für einzelne Features)

Wenn Sie nur spezifische Commits/Features vom Upstream wollen:

```bash
# 1. Upstream Updates holen (ohne zu mergen)
git fetch upstream

# 2. Log vom Upstream anschauen
git log upstream/main --oneline

# 3. Spezifischen Commit cherry-picken
git cherry-pick <commit-hash>

# 4. Pushen
git push origin main
```

## Update-Zeitplan

**Empfehlung:**
- **Major Updates**: Monatlich prüfen, wenn stable
- **Security Updates**: Sofort (überwachen Sie GitHub Releases)
- **Feature Updates**: Nach Bedarf (neue LLM-Provider, UI-Verbesserungen)

## Wichtige Links

- Ihr Fork: https://github.com/loschke/loschke-chat
- Upstream: https://github.com/vercel/ai-chatbot
- Upstream Releases: https://github.com/vercel/ai-chatbot/releases
- Upstream Commits: https://github.com/vercel/ai-chatbot/commits/main

## Troubleshooting

### "Merge conflict in package.json"
```bash
# 1. Ihre Dependencies sichern
cp package.json package.json.backup

# 2. Upstream Version akzeptieren
git checkout --theirs package.json

# 3. Ihre custom Dependencies manuell zurückfügen
# (z.B. Polar SDK, weitere libraries)

# 4. Neue Dependencies installieren
pnpm install

# 5. Merge abschließen
git add package.json
git commit
```

### "Zu viele Konflikte"
```bash
# Update abbrechen
git merge --abort

# Stattdessen: Rebase verwenden (fortgeschritten)
git rebase upstream/main
# Konflikte Commit für Commit lösen
```

### "Versehentlich falschen Branch gemerged"
```bash
# Zurücksetzen zum vorherigen Stand
git reset --hard origin/main

# Dann erneut korrekt mergen
git merge upstream/main
```

## Architektur-Richtlinien

Um Updates einfach zu halten, befolgen Sie diese Prinzipien:

### ✅ DO: Extension über Modification
- Erstellen Sie neue Module in separaten Ordnern
- Nutzen Sie Composition statt Code-Änderung
- Erweitern Sie Interfaces, ändern Sie sie nicht

### ❌ DON'T: Original-Code direkt modifizieren
- Minimale Änderungen an Core-Files
- Dokumentieren Sie jede Modifikation
- Überlegen Sie, ob es als separates Modul geht

### Beispiel: System-Prompt-Injection

**Falsch** (schwer zu mergen):
```typescript
// In lib/ai/prompts.ts (Original-Datei)
export const systemPrompt = userComponents 
  ? buildFromComponents(userComponents)
  : regularSystemPrompt;
```

**Richtig** (einfach zu mergen):
```typescript
// In lib/prompts/builder.ts (neue Datei)
import { systemPrompt as basePrompt } from '@/lib/ai/prompts';

export function enhanceSystemPrompt(components) {
  const enhanced = buildFromComponents(components);
  return `${basePrompt}\n\n${enhanced}`;
}

// In app/(chat)/api/chat/route.ts
import { enhanceSystemPrompt } from '@/lib/prompts/builder';
```

## Changelog führen

Erstellen Sie `CHANGELOG.md` für Ihre Änderungen:

```markdown
# Changelog

## [Unreleased]
### Added
- Component management system
- Preset functionality

### Modified
- Extended database schema for components

## [Upstream Merge 2024-11-13]
### Updated
- Synced with vercel/ai-chatbot main branch
- Updated dependencies
```

---

**Letzte Aktualisierung:** 2024-11-13  
**Setup durch:** Claude (Cline)
