# Tasks 001: TI Visualizer, interaktiver Netzwerk-Baukasten

**Status:** Entwurf vom 2026-11-04. Zur Freigabe durch Justin.
**Basis:** [spec.md](./spec.md), [regelwerk.md](./regelwerk.md),
[plan.md](./plan.md) (Abschnitt „Umsetzungsphasen“),
[architektur.md](./architektur.md)

## So sind die Tasks aufgebaut

```
- [ ] **T-xxx Titel** [P] · FR: … · Regeln: … · nach: T-…
  - Umfang: was gebaut wird
  - Fertig, wenn: prüfbares Kriterium (Test, CI-Check oder Abnahme)
```

| Feld | Bedeutung |
|---|---|
| `[ ]` / `[x]` | offen / erledigt. Das Häkchen setzt der PR, der den Task abschließt |
| **T-xxx** | Task-ID. Hunderter = Phase (T-0xx = P0, T-1xx = P1 …), T-8xx optional, T-9xx Begleitaufgaben ohne Code |
| [P] | kann parallel zu anderen [P]-Tasks derselben Phase laufen |
| FR | betroffene Anforderungen aus der Spec |
| Regeln | Regel-IDs aus dem Regelwerk. Jede genannte Regel braucht einen Test mit der ID im Namen, z. B. `it("[K-3] …")` (D18) |
| nach | Tasks, die vorher fertig sein müssen |

**Arbeitsweise** (plan.md, „Branch-Schutz und Ablauf“): ein Branch je
Task (`task/T-xxx-kurzname`), jeder Commit und PR nennt die Task-ID, Merge
nach grünen Pflicht-Checks. Ein Task passt in einen PR. Wird er zu groß,
wird er hier geteilt (T-105a, T-105b), nicht im PR.

**Rückverfolgbarkeit** (D30): `scripts/check-traceability.ts` (T-109)
prüft nur Regeln, deren Task hier abgehakt ist. So bricht die CI nicht
für Regeln ab, die erst in einer späteren Phase dran sind.

---

## P0: Grundgerüst und Pipeline-Kern

Ziel: Leere App öffentlich erreichbar, jede Änderung läuft durch die
Pipeline. Vor T-010 müssen T-901 bis T-904 erledigt sein, weil das Repo
dann öffentlich wird. Insbesondere wird vorher das ganze Projekt samt
Git-Historie auf private Daten und Secrets durchsucht (T-901).

- [x] **T-001 Projekt aufsetzen** · FR: – · Regeln: – · nach: –
  - Umfang: Vite, React, TypeScript, pnpm. `tsconfig` mit `strict`,
    `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
    `noImplicitOverride`. Ordner nach Repo-Layout (`src/app`, `ui`,
    `canvas`, `panels`, `dialogs`, `engine`, `store`, `persistence`,
    `schema`, `styles`, `assets`, `catalog/`, `tests/`). Vitest mit
    `@vitest/coverage-v8`. ESLint (`strict-type-checked`, `react-hooks`,
    `jsx-a11y`, `no-unsanitized`), Prettier. Vite-`base` aus `BASE_PATH`
    (Standard `/ti-visualizer/`).
  - Fertig, wenn: `pnpm lint`, `pnpm typecheck`, `pnpm test` und
    `pnpm build` lokal grün sind. Ein Beispieltest läuft mit Coverage-Bericht
    `coverage/lcov.info`.

- [x] **T-002 Design-Tokens und Schriften** [P] · FR: FR-22 · Regeln: – · nach: T-001
  - Umfang: `src/styles/tokens.css` aus dem Organic-Design-System des
    Mockups, Dunkelmodus als `:root[data-theme="dark"]`, Standard nach
    `prefers-color-scheme`. Kategorie-Farben und Formen aus `CAT`,
    Kantenstile aus `EDGEKIND`, neue Kategorien mit Okabe-Ito-Farben.
    Fokusrahmen `--tiv-focus`. Schriften über `@fontsource/figtree` und
    `@fontsource/caprasimo`, Icons über `lucide-react` (D20 bis D22).
  - Fertig, wenn: ein Vitest-Test alle Text-/Hintergrund-Paare der Tokens
    in Hell und Dunkel auf WCAG AA prüft und grün ist. Keine Anfrage an
    fremde Server beim Laden (geprüft in T-006).

- [ ] **T-003 App-Shell mit Impressum** [P] · FR: FR-22 · Regeln: – · nach: T-001
  - Umfang: Layout nach plan.md („Layout“): Kopfleiste, Platzhalter für
    Palette, Canvas und Detailpanel, Fußzeile mit dauerhaftem
    Impressum-Link. `ImpressumDialog` mit Katalogversion (vorerst
    Platzhalter) und Datenschutzhinweis. `ThemeToggle` (System, Hell,
    Dunkel). Basis-Bausteine in `src/ui/` (Button, Dialog, Toast).
  - Fertig, wenn: RTL-Tests zeigen: Impressum-Link öffnet den Dialog,
    Esc schließt ihn, der Fokus kehrt zurück. Der Theme-Schalter setzt
    `data-theme`.

- [ ] **T-004 Seitenhärtung und CSP-Probe** [P] · FR: – · Regeln: – · nach: T-001
  - Umfang: CSP- und Referrer-Policy-Meta-Tag in `index.html` (Wortlaut
    aus plan.md, „Härtung der Seite“). `SECURITY.md` mit Meldeweg. Probe:
    React Flow mit einem Knoten unter der CSP im `vite preview` rendern
    und klären, ob `style-src` ohne `'unsafe-inline'` reicht.
  - Fertig, wenn: der Build enthält beide Meta-Tags. Das Ergebnis der
    Probe steht in plan.md unter „Risiken“ (Ausnahme nur mit Begründung).

- [ ] **T-005 Pre-Commit und PR-Vorlagen** [P] · FR: – · Regeln: – · nach: T-001
  - Umfang: `lefthook` mit `lint-staged` (ESLint, Prettier) und `gitleaks`.
    `.github/pull_request_template.md` (Task-ID, FR- und Regel-IDs, Tests,
    Screenshot bei UI, Sicherheitsrelevanz). `.github/CODEOWNERS` (nur
    Benachrichtigung). `.github/review-richtlinien.md` mit den Prüfpunkten
    aus plan.md („KI-Review“).
  - Fertig, wenn: ein Commit mit einem Test-Secret lokal abgelehnt wird
    und ein neuer PR die Vorlage zeigt.

- [ ] **T-006 Playwright-Smoke und Axe** · FR: – · Regeln: – · nach: T-003
  - Umfang: `playwright.config.ts` gegen `vite preview` (Chromium). Suite
    `smoke`: App lädt, Impressum erreichbar, keine CSP-Verletzung und
    keine Anfrage an fremde Domains in der Konsole bzw. im Netzwerk.
    Suite `a11y`: Axe auf der Shell und dem Impressum-Dialog.
  - Fertig, wenn: `pnpm e2e` lokal grün ist. Ein absichtlich eingebauter
    Axe-Fehler lässt die Suite scheitern.

- [ ] **T-007 CI-Pipeline Kern** · FR: – · Regeln: – · nach: T-002, T-004, T-005, T-006
  - Umfang: `.github/workflows/_pipeline.yml` (`workflow_call`) mit den
    Stufen `static` (Install mit Lockfile, ESLint, Prettier, `tsc`,
    gitleaks), `unit` (Vitest mit Coverage), `sonar` (Quality Gate
    abwarten), `build` (`BASE_PATH`, `size-limit` ≤ 500 KB gzip,
    CSP-Tag vorhanden, `dist/` als Artefakt), `e2e` (gegen den Build,
    Trace und Video bei Fehlern). `ci.yml` für PR und Push.
    `sonar-project.properties` nach plan.md. `.github/dependabot.yml` für
    npm und Actions. Actions per SHA gepinnt, `permissions` minimal,
    keine Secrets für Fork-PRs.
  - Fertig, wenn: ein PR zeigt alle fünf Checks grün. Ein PR mit
    Lint-Fehler wird rot. Die Sonar-Stufe läuft erst nach T-010 (bis dahin
    als übersprungen markiert, nicht entfernt).

- [ ] **T-008 KI-Review am Pull Request** [P] · FR: – · Regeln: – · nach: T-005, T-007
  - Umfang: Job `ai-review` mit `anthropics/claude-code-action`
    (gepinnt, Modell Opus) nach plan.md („KI-Review“): Pfadfilter
    `src/`, `catalog/`, `specs/`, nicht bei Entwurfs-PRs, Laufzeitgrenze,
    Forks nur nach Freigabe, Rechte nur Lesen und Kommentieren. Kein
    Pflicht-Check. Labels „KI-Befund übernommen“ und „KI-Befund
    verworfen“ anlegen.
  - Fertig, wenn: ein Test-PR mit Änderung in `src/` einen deutschen
    Review-Kommentar bekommt und ein PR nur mit `README.md` keinen.

- [ ] **T-009 Deployment auf GitHub Pages** · FR: – · Regeln: – · nach: T-007
  - Umfang: `deploy.yml` bei Push auf `main` und manuell: dieselbe
    Pipeline, danach `upload-pages-artifact`, `deploy-pages` und
    `smoke` gegen die öffentliche Adresse. Umgebung `github-pages` nur
    für `main`.
  - Fertig, wenn: nach T-010 ein Merge auf `main` die App unter
    `https://jurie2000.github.io/ti-visualizer/` bereitstellt und der
    Smoke-Test danach grün ist.

- [ ] **T-010 Repo öffentlich schalten und einrichten** (manuell) · FR: – · Regeln: – · nach: T-009, T-901, T-902, T-903, T-904
  - Umfang: einmalige Einstellungen aus plan.md („GitHub Pages“): Repo
    öffentlich, Pages-Quelle „GitHub Actions“, SonarQube Cloud verbinden,
    `SONAR_TOKEN` und `ANTHROPIC_API_KEY` als Secrets, Claude GitHub App,
    Branch-Schutz für `main` (Pflicht-Checks `static`, `unit`, `sonar`,
    `build`, `e2e`), Secret Scanning mit Push Protection, Private
    vulnerability reporting.
  - Fertig, wenn: die leere App öffentlich erreichbar ist und ein Direkt-Push
    auf `main` abgelehnt wird. **Ergebnis von P0.**

---

## P1: Schemas, Katalog und Regel-Engine

Ziel: Regeln vollständig und nachweisbar getestet. Alles ohne UI (D17).
Vorher: T-907 (fachliche Freigabe).

- [ ] **T-101 Schemas für Datei und Topologie** [P] · FR: FR-5, FR-12, FR-18 · Regeln: – · nach: T-001
  - Umfang: Zod-Schemas in `src/schema/`: `TivFile`, `Settings`,
    `Topology` (mit `simDate`), `Element`, `Node`, `Edge`, `Zone`, `Point`,
    `Rect`, `Endpoint`, `Card`, `PinCard` (über `kind`), `NetConfig` und
    die Varianten `KonnektorConfig`, `TerminalConfig`, `ClientConfig`,
    `RouterConfig`, `InfraConfig` (D13, D35). Grenzen und Schema-Regeln aus
    plan.md („Sicherheit beim Öffnen“): Größen, eindeutige IDs, zwei
    Kantenenden, feste Werte für `tone`. TypeScript-Typen nur per
    `z.infer`.
  - Fertig, wenn: Tests für gültige und ungültige Beispiele grün sind,
    darunter: Datei ohne `topology` abgelehnt, Datei nur mit `settings`
    abgelehnt, doppelte IDs abgelehnt, `__proto__` nicht übernommen.

- [ ] **T-102 Katalog-Schemas und Loader** [P] · FR: FR-12 · Regeln: – · nach: T-001
  - Umfang: Zod-Schemas für alle Dateien aus plan.md („Katalog“),
    `catalog/active.json`, `catalog/1/meta.json`. Loader bündelt den
    aktiven Katalog beim Build. Deklarative Ausdrücke für Voraussetzungen
    und Prüfregeln (kein Code im JSON). Jeder fachliche Eintrag braucht
    `source` und `status`. Referenztest: jede Regel zeigt auf vorhandene
    Typen, Anschlüsse, Protokolle und Quellen.
  - Fertig, wenn: ein kaputter Verweis oder ein fehlendes `source` den
    Test `unit` rot macht (D5).

- [ ] **T-103 Katalog: Geräte, Anschlüsse, Quellen** · FR: FR-1, FR-12, FR-13, FR-14 · Regeln: A-1, A-2 · nach: T-102
  - Umfang: `categories.json`, `device-types.json` (Regelwerk 1 mit
    Fähigkeiten, Icon, „In Einfach sichtbar“, Anschlüssen aus 2.2),
    `port-kinds.json` (2.1, 2.3), `sources.json` aus quellen.md. Abgeleitet
    von Claude, geprüft von Justin (D16).
  - Fertig, wenn: Schema- und Referenztests grün, Tests `[A-1]` und
    `[A-2]` für die Verträglichkeit der Anschlussarten grün, und Justin
    hat die Gerätetypen im PR abgenommen.

- [ ] **T-104 Katalog: Verbindungsregeln und Protokolle** · FR: FR-4, FR-11, FR-12 · Regeln: G-1 bis G-4, V-4 bis V-10, V-12, V-14 bis V-20, X-1 · nach: T-103, T-905
  - Umfang: `base-checks.json` (4.1), `connection-rules.json` (4.2,
    Erlaubnisliste mit Sichtbarkeit in Einfach), `reason-rules.json` (4.3),
    `exclusion-rules.json` (4.4), `protocols.json` (Regelwerk 3 mit
    Kantenbeschriftung, Netzport, TLS, Datenformat).
  - Fertig, wenn: `scripts/check-regelwerk-katalog.ts` (T-109) oder bis
    dahin ein Vitest-Test zeigt: jede dieser Regel-IDs steht im Katalog
    mit Status und Quelle wie im Regelwerk.

- [ ] **T-105 Regel-Engine `validateConnection`** · FR: FR-3, FR-4, FR-14 · Regeln: G-1 bis G-4, V-4 bis V-10, V-12, V-14 bis V-20, X-1, A-3, A-4 · nach: T-101, T-104
  - Umfang: `src/engine/rules.ts` nach Regelwerk 4.0: Grundprüfungen und
    Ausschlüsse, dann Erlaubnisliste, sonst Begründungsregel oder
    allgemeine Meldung mit erlaubten Partnern. Rückgabe
    `{ ok, reason?, ruleId? }`. `autoPorts` (A-3, erstes freies
    verträgliches Paar), WLAN-Erkennung (A-4). Ungerichtet (D15), Modus
    egal (D36).
  - Fertig, wenn: je Regel ein Test mit ID im Namen grün ist, dazu je
    Paar der Erlaubnisliste ein Gültig-Test und der Konsistenztest
    „kein erlaubtes Paar wird von einer Begründungsregel erfasst“.
    Engine-Coverage ≥ 90 % Zeilen, ≥ 85 % Zweige.

- [ ] **T-106 Karten-Engine** [P] · FR: FR-18 · Regeln: K-1 bis K-9 · nach: T-101, T-103
  - Umfang: `plugCard`, `unplugCard`, `cardState` in `src/engine/cards.ts`:
    nur in Geräten mit `cardSlots` bzw. `nfcCard`, eine Karte je Art,
    Ablauf gegen `simDate`, PIN-Freischaltung, `pinActive` der eGK.
  - Fertig, wenn: je Regel K-1 bis K-9 ein Test mit ID und erwarteter
    Meldung grün ist. Eine abgelaufene Karte zählt als nicht gesteckt.

- [ ] **T-107 Pfad-Engine** [P] · FR: FR-8 · Regeln: Regelwerk 6.0 (Pfadregel) · nach: T-101, T-103
  - Umfang: `resolvePath(topology, trigger, target, catalog)` in
    `src/engine/paths.ts` nach der Rollenfolge Auslöser → LAN → Zugang →
    Router/Internet → VPN → Zentrales Netz → Dienst. Wege am Zugang vorbei
    zählen nicht. Internet-Wege nur für Apps, TI-Messenger, CardLink,
    PoPP. `pathKind: local` für NFDM/eMP. Zuordnung KT ↔ Zugang über
    `pairedWith`, Terminal über `workplace`. Ausgeblendete Geräte zählen
    mit.
  - Fertig, wenn: Tests für jede Aussage aus Regelwerk 6.0 grün sind,
    darunter „Weg am Zugang vorbei ist kein TI-Pfad“ und „zwei Zugänge im
    Netz, KT gehört zum gepairten“.

- [ ] **T-108 Presets im Katalog** · FR: FR-2 · Regeln: A-5 · nach: T-105, T-106
  - Umfang: `presets.json` mit Arztpraxis, Apotheke, Krankenhaus,
    Klinikum nach Regelwerk 13 (Geräte, Kanten mit Anschlüssen, Karten,
    Zonen, `simDate` = 2026-11-01). Positionen aus dem Mockup.
  - Fertig, wenn: Test `[A-5]` grün ist: jede Kante jedes Presets besteht
    `validateConnection` und ist über Anschlüsse herstellbar, und jede
    erlaubte Verbindung aus 4.2 ist über Anschlüsse herstellbar.

- [ ] **T-109 Rückverfolgbarkeits-Skripte** · FR: – · Regeln: – · nach: T-104
  - Umfang: `scripts/check-traceability.ts` (Regel-IDs aus regelwerk.md
    gegen Testnamen, nur für abgehakte Tasks dieser Datei, frei gewordene
    IDs V-1, V-2, V-3, V-11, V-13, G-5 ausgenommen),
    `scripts/check-regelwerk-katalog.ts` (ID, Status, Quelle),
    Bericht „FR → Tasks → Tests“. Beide in Stufe `unit` der CI.
  - Fertig, wenn: eine abgehakte Regel ohne Test die CI rot macht und der
    Bericht als Artefakt am PR hängt.

- [ ] **T-110 Architekturregeln und Property-based Tests** [P] · FR: FR-3, FR-13 · Regeln: – · nach: T-105
  - Umfang: `.dependency-cruiser.cjs` nach plan.md („Statische Qualität“),
    in Stufe `static`. `fast-check`-Tests: Verbinden ist symmetrisch,
    Erlaubnis- und Begründungsliste überschneiden sich nie.
  - Fertig, wenn: ein Import von React in `src/engine/` die CI rot macht
    und die Property-Tests mit mindestens 1 000 Läufen grün sind.
    **Ergebnis von P1.**

---

## P2: Topologien bauen

Ziel: Nutzer baut Topologien im Mockup-Stil, nur gültig verbunden.

- [ ] **T-201 Stores mit Rückgängig** · FR: FR-16 · Regeln: – · nach: T-101, T-102
  - Umfang: Zustand-Stores für Katalog, Topologie (Verlauf mit 80
    Schritten, D25), Oberfläche und Einstellungen. Alle Änderungen an der
    Topologie laufen über Store-Aktionen, die die Engines aufrufen.
  - Fertig, wenn: Tests für Rückgängig/Wiederholen grün sind, inklusive
    Grenze von 80 Schritten.

- [ ] **T-202 Canvas, Knoten und Kanten** · FR: FR-1, FR-3, FR-16 · Regeln: – · nach: T-002, T-201
  - Umfang: React Flow auf der Canvas. `DeviceNode` mit Kategorie-Leiste,
    Form, Icon, Kurzname und Name. `ConnectionEdge` je Verbindungsart mit
    Label. Zoom, Minimap, „alles einpassen“. Knoten per Pfeiltasten
    verschiebbar, Rollen und Labels für Screenreader.
  - Fertig, wenn: das Preset Arztpraxis (aus T-108) im Erweitert-Modus
    vollständig angezeigt wird und RTL-Tests Rolle und Label der Knoten
    prüfen.

- [ ] **T-203 Gerätepalette** [P] · FR: FR-1 · Regeln: – · nach: T-202
  - Umfang: `Palette`, `PaletteGroup`, `PaletteItem`: gruppiert nach
    Kategorie, einklappbar, anpinnbar, Suche, Drag & Drop und Enter zum
    Hinzufügen. Beliebig viele Geräte je Typ.
  - Fertig, wenn: RTL-Tests Suche, Hinzufügen per Enter und per Drop
    abdecken.

- [ ] **T-204 Verbinden mit Begründung** · FR: FR-3, FR-4 · Regeln: X-1 · nach: T-105, T-202
  - Umfang: Quelle/Ziel-Auswahl mit Maus und Tastatur, `isValidConnection`
    ruft `validateConnection`, Anschlüsse per `autoPorts`. Ungültig:
    `Toast` mit Icon und Begründung. `ExclusionDialog` bei Konnektor und
    TI-Gateway.
  - Fertig, wenn: E2E-Suite `build-and-connect` grün ist: Gerät ergänzen,
    gültig und ungültig verbinden, Begründung sichtbar.

- [ ] **T-205 Karten stecken und ziehen** [P] · FR: FR-18 · Regeln: K-2, K-3, K-4 · nach: T-106, T-202
  - Umfang: `CardChip` im Terminal mit Beschriftung „gesteckt · ISO 7816“
    bzw. „NFC · ISO 14443, CAN“. `PlugCardDialog` mit Kartenart,
    Ablaufdatum und PIN-Status. Abgelaufene oder gesperrte Karten nicht
    nur über Farbe erkennbar.
  - Fertig, wenn: RTL-Tests Stecken, Ziehen und die Meldung bei voller
    Kartenbelegung (K-2) prüfen.

- [ ] **T-206 Startansicht und Presets** [P] · FR: FR-2 · Regeln: – · nach: T-108, T-202
  - Umfang: `StartScreen` mit `PresetCard` (Vorschau) für die vier Presets
    und leeren Start.
  - Fertig, wenn: Suite `smoke` um „Preset öffnen“ erweitert und grün ist.

- [ ] **T-207 Modus Einfach und Erweitert** · FR: FR-13 · Regeln: A-3 · nach: T-105, T-204
  - Umfang: `ModeSwitch` in der Kopfleiste, Modus in den Einstellungen.
    `collapseHidden(topology, catalog)` in der Engine, `GroupEdge` für
    Sammelkanten (Klick zeigt ausgeblendete Geräte). Palette zeigt im
    Modus Einfach nur sichtbare Typen.
  - Fertig, wenn: Property-Test „Topologie ist in beiden Modi dieselbe“
    (D36) und der Konsistenztest „sichtbare Verbindung nur zwischen
    sichtbaren Geräten“ grün sind. `build-and-connect` prüft den
    Moduswechsel mit Sammelkanten. **Ergebnis von P2.**

---

## P3: Speichern, Öffnen, Autosave

Ziel: Austausch mit anderen Browsern über Dateien, abgesichert.

- [ ] **T-301 Dateiformat und Migrationen** · FR: FR-5, FR-12 · Regeln: – · nach: T-101
  - Umfang: `src/persistence/`: `serialize` und `parse` für `.tiv.json`,
    Migrationskette für ältere `schemaVersion`, Ablehnung neuerer
    Versionen mit Meldung, Prüfung gegen den aktiven Katalog bei
    abweichender `catalogVersion`. Liste der Importbefunde statt
    stillem Entfernen.
  - Fertig, wenn: Property-Tests „Speichern → Öffnen ergibt dieselbe
    Topologie“ und „Migration ist idempotent“ grün sind, dazu Tests für
    neuere Version und unbekannte Gerätetypen.

- [ ] **T-302 Speichern** [P] · FR: FR-5 · Regeln: – · nach: T-201, T-301
  - Umfang: Speichern über Strg+S und Kopfleiste. File System Access API
    in Chrome/Edge, Download in Firefox/Safari. Häkchen „Einstellungen
    mitspeichern“ (Standard aus, Wahl gemerkt). Anzeige „nicht als Datei
    gespeichert“ und `beforeunload`-Nachfrage.
  - Fertig, wenn: RTL-Tests Häkchen und Hinweis prüfen und der
    Download-Weg in Playwright eine gültige Datei liefert.

- [ ] **T-303 Öffnen** [P] · FR: FR-2, FR-5 · Regeln: – · nach: T-201, T-301
  - Umfang: `OpenDialog` mit Datei (Auswahl, Drag & Drop auf die Canvas)
    und Preset. Rückfrage „Einstellungen aus der Datei übernehmen?“
    (Standard nein). Vor dem Ersetzen Speichern anbieten, alter Stand als
    Rückgängig-Schritt. `ImportFindingsDialog`. Geöffnete Dateien sind
    als eigene Datei gekennzeichnet, nie als offizielles Preset.
  - Fertig, wenn: RTL-Tests Rückfrage, Importbefunde und Rückgängig nach
    dem Öffnen prüfen.

- [ ] **T-304 Autosave** [P] · FR: FR-5 · Regeln: – · nach: T-201, T-301
  - Umfang: Autosave in IndexedDB über `idb-keyval` kurz nach jeder
    Änderung, genau ein Stand. Beim Start „Letzten Stand
    wiederherstellen?“. Hinweis auf die Grenzen beim ersten Start.
  - Fertig, wenn: Tests mit `fake-indexeddb` Sichern und Wiederherstellen
    abdecken. Ein kaputter Autosave wird wie eine fremde Datei geprüft.

- [ ] **T-305 Injection-Suite und Fuzzing** · FR: FR-5 · Regeln: – · nach: T-302, T-303, T-304
  - Umfang: `tests/security/` mit dem Korpus aus plan.md
    („Injection-Tests“) über jeden Eingabeweg: Datei, Drag & Drop,
    Autosave, Topologiename, Beschreibung, Zonenname, Gerätebezeichnung,
    Einstellungen. `fast-check`-Fuzzing für `parse`. In Stufe `e2e`.
  - Fertig, wenn: alle Fälle der Tabelle grün sind, insbesondere
    `window.__pwned` bleibt leer und `Object.prototype` unverändert.

- [ ] **T-306 E2E-Suite Datei** · FR: FR-5 · Regeln: – · nach: T-302, T-303, T-304
  - Umfang: Suite `datei` in Chromium und Firefox: Speichern in Kontext A,
    Öffnen in neuem Kontext B. Einstellungen nur nach Zustimmung. Datei
    ohne Einstellungen. Autosave und Wiederherstellen.
  - Fertig, wenn: die Suite in beiden Browsern in der CI grün ist.
    **Ergebnis von P3.**

---

## P4: Aktionen und Simulation

Ziel: Abläufe über den Kontextmenü starten und Schritt für Schritt
abspielen.

- [ ] **T-401 Katalog: Aktionen und Abläufe** · FR: FR-6, FR-8, FR-9, FR-12 · Regeln: Regelwerk 6.2 bis 6.7, 7 · nach: T-104, T-905
  - Umfang: `actions.json` (Aktionen je Gerätetyp mit Voraussetzungen aus
    den Bausteinen 6.1), `flows.json` (Schritte, Protokolle, Erklärtexte
    aus dem Mockup, sinngemäß und mit Quelle, nicht wörtlich aus
    gematik-Dokumenten).
  - Fertig, wenn: Schema- und Referenztests grün sind und jede Aktion aus
    Regelwerk 6 genau einen Katalogeintrag hat.

- [ ] **T-402 Aktions-Engine `availableActions`** · FR: FR-6, FR-7, FR-8 · Regeln: K-3, K-4, K-7 · nach: T-106, T-107, T-401
  - Umfang: `availableActions(node, topology, catalog)` mit `enabled` und
    `disabledReason`. Bausteine aus Regelwerk 6.1 über den Pfad, erste
    nicht erfüllte Bedingung liefert die Begründung. Störungen an Gerät
    und Kante unterbrechen den Pfad. Mehrere passende Terminals ohne
    Zuordnung: Rückgabe „Terminal wählen“.
  - Fertig, wenn: je Aktion zwei Tests grün sind: eine Topologie, in der
    sie aktiv ist, und eine, in der sie mit der erwarteten Begründung
    ausgegraut ist.

- [ ] **T-403 Simulations-Engine** [P] · FR: FR-8, FR-9, FR-10 · Regeln: Regelwerk 7 · nach: T-107, T-401
  - Umfang: Schritte aus `flows.json` auf den Pfad binden. Zustandsautomat
    `idle → running(n) ⇄ paused → done | cancelled`. Schritt vor/zurück,
    Tempo.
  - Fertig, wenn: je Ablauf ein Test die Schrittfolge prüft, `notfalldaten`
    und `emp` ohne VPN und Fachdienst laufen und Abbrechen aus jedem
    Zustand nach `cancelled` führt.

- [ ] **T-404 Kontextmenü und Störungen** · FR: FR-6, FR-7, FR-18 · Regeln: – · nach: T-402, T-202
  - Umfang: `ContextMenu` per Rechtsklick, Menütaste und Shift+F10.
    Ausgegraute Einträge mit Schloss-Icon und Begründung. Einträge für
    alle Geräte: Details, Ausfall simulieren / wieder in Betrieb.
    An Kanten: trennen / wiederherstellen. Dialog „Welches Terminal?“.
  - Fertig, wenn: RTL-Tests Tastaturbedienung und ausgegraute Einträge
    prüfen. Ausgegraut ist nicht nur über Farbe erkennbar.

- [ ] **T-405 Simulations-Player** · FR: FR-9, FR-10 · Regeln: – · nach: T-403, T-404
  - Umfang: `SimPlayer` mit Play/Pause (Leertaste), Schritt (Pfeiltasten),
    Tempo, Abbrechen (Esc), Fortschritt, Erklärtext als `aria-live`.
    Paket-Animation auf den Kanten, aus bei `prefers-reduced-motion`.
    Topologie während der Simulation gesperrt. Öffnen, Moduswechsel,
    Rückgängig und Störung brechen ab.
  - Fertig, wenn: RTL-Tests Steuerung und Sperre prüfen.

- [ ] **T-406 Detailpanel** [P] · FR: FR-11 · Regeln: – · nach: T-202, T-104
  - Umfang: `DetailPanel` für Gerät, Kante und Zone: Protokoll,
    Datenformat, TLS, Netzport (soweit belegt), Quelle mit Link.
    Einblendbar und anpinnbar.
  - Fertig, wenn: RTL-Test für eine Kante die Werte aus `protocols.json`
    und die Quelle zeigt.

- [ ] **T-407 E2E-Suite Aktionen** · FR: FR-6 bis FR-10 · Regeln: – · nach: T-405, T-406
  - Umfang: Suite `actions-sim`: Kontextmenü, ausgegraute Aktion,
    Simulation abspielen und abbrechen, Bearbeiten gesperrt. Alle
    Aktionen aus den Erfolgskriterien der Spec auf einem Preset.
  - Fertig, wenn: die Suite in der CI grün ist. **Ergebnis von P4.**

---

## P5: Modus Erweitert

Ziel: Anschlüsse, Einstellungen, Zonen, Editor-Hilfen und
Sicherheitsprüfung.

- [ ] **T-501 Anschlüsse und PortPicker** · FR: FR-14 · Regeln: A-1 bis A-4 · nach: T-207
  - Umfang: Anschluss-Punkte am `DeviceNode` nur im Modus Erweitert.
    `PortPicker` beim Verbinden, belegte Anschlüsse erkennbar.
  - Fertig, wenn: RTL-Test zeigt: im Modus Erweitert wählt der Nutzer
    den Anschluss, im Modus Einfach nicht. Ein voller Anschluss liefert
    die Meldung aus G-3.

- [ ] **T-502 Geräteeinstellungen** · FR: FR-17 · Regeln: Regelwerk 8 · nach: T-406, T-501
  - Umfang: `config-defaults.json` aus Regelwerk 8. Formular im
    Detailpanel je Config-Variante, nur im Modus Erweitert. Standardwerte
    beim Hinzufügen eines Geräts.
  - Fertig, wenn: Tests prüfen, dass jedes Feld aus Regelwerk 8 im
    Katalog und im Formular vorkommt und Eingaben das Schema einhalten.

- [ ] **T-503 Prüfregeln Zustand** [P] · FR: FR-19 · Regeln: P-1 bis P-7, P-18, P-22, P-31, P-32, P-33 · nach: T-106, T-107
  - Umfang: `checks.json` (Teil Zustand) und `runChecks(topology, mode)`
    in `src/engine/checks.ts` mit Schwere, Erklärung und betroffenem
    Gerät.
  - Fertig, wenn: je Regel ein positiver und ein negativer Testfall grün
    ist. Property-Test: Ergebnis hängt nicht von der Reihenfolge der
    Knoten ab.

- [ ] **T-504 Prüfregeln Adressierung** [P] · FR: FR-17, FR-19 · Regeln: P-8 bis P-15 · nach: T-503, T-502
  - Umfang: Prüfregeln für IP, Maske, Gateway und Subnetz, nur im Modus
    Erweitert.
  - Fertig, wenn: je Regel ein positiver und ein negativer Testfall grün
    ist und die Regeln im Modus Einfach nicht melden.

- [ ] **T-505 Prüfregeln Betrieb** [P] · FR: FR-17, FR-19 · Regeln: P-16, P-17, P-17a, P-19 bis P-21, P-23 bis P-30 · nach: T-503, T-502
  - Umfang: Prüfregeln für Update, Zeit, Betriebsart, Firewall, DHCP,
    VLAN, Gateway, TI-Route, DNS, Arbeitsplatz, Pairing. Regeln, die den
    Pfad unterbrechen, fließen im Modus Erweitert in `availableActions`
    ein (z. B. fehlende TI-Route).
  - Fertig, wenn: je Regel ein positiver und ein negativer Testfall grün
    ist, plus ein Test, dass P-27 die Aktion „eRezept ausstellen“
    ausgraut.

- [ ] **T-506 Sicherheitsprüfung** · FR: FR-19 · Regeln: – · nach: T-503
  - Umfang: `SecurityDialog` aus der Kopfleiste: Befunde nach Schwere
    (Icon und Text, nicht nur Farbe), Klick hebt das Gerät hervor.
    Importbefunde aus T-301 erscheinen hier. Hinweis auf vereinfachte
    Direktverbindungen im Modus Erweitert (Regelwerk 11).
  - Fertig, wenn: RTL-Test Auswahl und Hervorhebung prüft und ein Test
    zeigt, dass jede simulierte Störung (P-1, P-2) gefunden wird.

- [ ] **T-507 Zonen** [P] · FR: FR-15 · Regeln: – · nach: T-202
  - Umfang: `ZoneNode`: Geräte gruppieren, Zone benennen, einfärben (nur
    feste Töne), verschieben, entfernen. Rückgängig machbar.
  - Fertig, wenn: RTL-Tests alle fünf Handlungen abdecken.

- [ ] **T-508 Editor-Hilfen** [P] · FR: FR-16 · Regeln: – · nach: T-201, T-202
  - Umfang: Kopieren, Einfügen, Duplizieren (Kanten nur, wenn gültig),
    automatisch anordnen (rückgängig machbar), Tastaturkürzel dazu.
  - Fertig, wenn: Tests prüfen, dass eingefügte Kanten `validateConnection`
    bestehen und „anordnen“ ein Rückgängig-Schritt ist.
    **Ergebnis von P5.**

---

## P6: Tutorial und Herausforderungen

- [ ] **T-601 Tutorial-Inhalte** [P] · FR: FR-20 · Regeln: – · nach: T-401
  - Umfang: `tutorial.json` mit zwei Teilen (Praxis bis E-Rezept,
    Apotheke bis Einlösung), Personas mit Alt-Texten, Persona-Bilder als
    WebP in `src/assets/`.
  - Fertig, wenn: Schema-Test grün ist und jeder Schritt auf eine
    vorhandene Aktion oder ein vorhandenes Gerät zeigt.

- [ ] **T-602 Tutorial-Karte** · FR: FR-20 · Regeln: – · nach: T-601, T-405
  - Umfang: `TutorialCard` mit Avatar, Schritt x/y, Vor/Zurück,
    Fortschritt in den Einstellungen.
  - Fertig, wenn: ein E2E-Test beide Teile vollständig durchspielt.

- [ ] **T-603 Herausforderungen im Katalog** [P] · FR: FR-21 · Regeln: P-9, P-11, P-13 bis P-15, P-17, P-21, P-22, P-25, P-27 bis P-30 · nach: T-505, T-108
  - Umfang: `challenges.json` mit den fünf Herausforderungen aus
    Regelwerk 10. Erkennung „gelöst“ nach den drei Bedingungen dort
    (über `runChecks` und `availableActions`).
  - Fertig, wenn: je Herausforderung ein Test zeigt: der Start ist nicht
    gelöst, eine hinterlegte Musterlösung ist gelöst.

- [ ] **T-604 Herausforderungs-Panel** · FR: FR-21 · Regeln: – · nach: T-603
  - Umfang: `ChallengePanel` mit Aufgabe, Symptomen und Status. Start
    schaltet in den Modus Erweitert. Gelöste Herausforderungen in den
    Einstellungen.
  - Fertig, wenn: ein E2E-Test Herausforderung 1 löst und der Status
    nach Neuladen erhalten bleibt. **Ergebnis von P6.**

---

## P7: Barrierefreiheit, Tablet, Release

- [ ] **T-701 Listenansicht** · FR: FR-22 · Regeln: – · nach: T-404, T-506
  - Umfang: `TopologyList` als Textalternative: Geräte mit Kategorie,
    Karten und Verbindungen, bedienbar wie eine Tabelle. Aktionen und
    Sicherheitsprüfung von dort erreichbar.
  - Fertig, wenn: ein E2E-Durchlauf nur über die Listenansicht eine Aktion
    startet und die Sicherheitsprüfung öffnet.

- [ ] **T-702 Tastatur und Kürzel** · FR: FR-22 · Regeln: – · nach: T-508, T-405
  - Umfang: Lücken in der Tastaturbedienung schließen, `ShortcutsDialog`
    mit allen Kürzeln.
  - Fertig, wenn: ein E2E-Durchlauf nur per Tastatur Preset öffnen, Gerät
    ergänzen, verbinden, Aktion abspielen und speichern schafft.

- [ ] **T-703 Tablet und kleine Bildschirme** [P] · FR: – · Regeln: – · nach: T-203, T-406
  - Umfang: unter 1100 px Palette und Detailpanel als Überlagerung, unter
    700 px Hinweis, Presets und Dateien bleiben ansehbar.
  - Fertig, wenn: Playwright-Tests in beiden Breiten grün sind.

- [ ] **T-704 E2E-Abschluss und optische Abnahme** · FR: alle · Regeln: – · nach: T-701, T-702, T-703
  - Umfang: Suite `a11y` auf alle Hauptansichten und Dialoge erweitern,
    Gesamtszenario aus plan.md („Teststrategie“). Screenshots der
    Hauptansichten hell und dunkel gegen `design/mockup/screenshots/`.
  - Fertig, wenn: alle Suiten grün sind und Justin die Screenshots
    abgenommen hat.

- [ ] **T-705 Release v1** · FR: – · Regeln: – · nach: T-704, T-906
  - Umfang: README-Status, Feature-Tabelle in `specs/README.md`,
    Changelog, Tag `v1.0.0`. Bericht „FR → Tasks → Tests“ als Anhang für
    die Arbeit.
  - Fertig, wenn: der Bericht FR-1 bis FR-22 vollständig abgedeckt zeigt
    und die Seite mit Tag `v1.0.0` deployt ist. **Ergebnis von P7.**

---

## Optional nach P7

Nur bei Bedarf, z. B. für die Auswertung in der Arbeit (plan.md,
„Ausbaustufen“). Wird ein Punkt gebraucht, bekommt er hier Umfang und
Fertig-Kriterium.

- [ ] **T-801** Mutation-Testing mit StrykerJS für `src/engine/` und
  `src/persistence/` (Ziel ≥ 80 %)
- [ ] **T-802** `nightly.yml`: E2E in allen Browsern
- [ ] **T-803** Lighthouse CI und `knip`
- [ ] **T-804** CodeQL, Dependency-Review-Action, `pnpm audit`, OSV-Scanner
- [ ] **T-805** SBOM (CycloneDX) und OWASP Dependency-Track
- [ ] **T-806** OWASP ZAP Baseline-Scan und OpenSSF Scorecard
- [ ] **T-807** Build-Provenienz und `commitlint`

---

## Begleitaufgaben ohne Code

Offene Punkte aus spec.md, regelwerk.md (12) und plan.md („Risiken“).
Sie blockieren die genannten Tasks.

- [ ] **T-901 Projekt auf private Daten und Secrets durchsuchen** · blockiert: T-010
  - Umfang: Arbeitsstand **und** die gesamte Git-Historie aller Branches
    prüfen, bevor das Repo öffentlich wird.
    - Secrets: `gitleaks detect` über die volle Historie (`--log-opts="--all"`)
      und den Arbeitsstand. Dazu Suche nach Mustern wie `API_KEY`,
      `TOKEN`, `password`, `.env`, privaten Schlüsseln.
    - Private Daten: E-Mail-Adressen, Telefonnummern, Anschriften, echte
      Namen außerhalb von Impressum und Autorenschaft, lokale Pfade mit
      Benutzernamen (z. B. `/Users/…`), Inhalte aus Chats.
    - Dateien prüfen, die ein Scanner nicht lesen kann: `design/mockup/MockUp.zip`
      (entpacken und durchsehen), Bilder in `design/mockup/uploads/` und
      `assets/` (auch Metadaten wie EXIF), Screenshots.
    - Fund in der Historie: Datei bereinigen (`git filter-repo`) oder das
      Repo mit neuer Historie veröffentlichen. Gefundene Secrets gelten als
      verbraucht und werden widerrufen, auch nach dem Bereinigen.
  - Fertig, wenn: `gitleaks` über alle Commits ohne Fund läuft, die
    manuelle Durchsicht als Checkliste im PR von T-010 dokumentiert ist
    und Justin sie bestätigt hat.
- [ ] **T-902 Impressum: Anschrift klären** · blockiert: T-010
- [ ] **T-903 Datenschutzhinweis (Art. 13 DSGVO) rechtlich prüfen lassen** · blockiert: T-010
- [ ] **T-904 Nutzungsrechte am Design-System „Organic“ klären** · blockiert: T-010 (die Tokens werden mit P0 öffentlich)
- [ ] **T-905 Restpunkte Regelwerk 12** (CardLink-Netzweg, Belege V-17
  und V-20, eAU-Dienstkennungen, ePA-Befugnisdauer, mobiles KT, Ablauf
  `epa`, offene Netzports) · blockiert: T-104, T-401. Regeln ohne Beleg
  dürfen mit Status „offen“ in den Katalog, der Task hält sie sichtbar.
- [ ] **T-906 Fachliche Abnahme der Erklär-, Tutorial- und
  Herausforderungstexte** · blockiert: T-705
- [ ] **T-907 Fachliche Freigabe von Spec, Regelwerk, Plan und Tasks durch
  Justin** · blockiert: P1 (ab T-103)

---

## Abdeckung

### Anforderungen → Tasks

| FR | Tasks |
|---|---|
| FR-1 | T-103, T-202, T-203 |
| FR-2 | T-108, T-206, T-303 |
| FR-3 | T-105, T-110, T-202, T-204 |
| FR-4 | T-104, T-105, T-204 |
| FR-5 | T-101, T-301 bis T-306 |
| FR-6 | T-401, T-402, T-404, T-407 |
| FR-7 | T-402, T-404, T-407 |
| FR-8 | T-107, T-401, T-402, T-403 |
| FR-9 | T-401, T-403, T-405 |
| FR-10 | T-403, T-405, T-407 |
| FR-11 | T-104, T-406 |
| FR-12 | T-101, T-102, T-103, T-104, T-301, T-401 |
| FR-13 | T-103, T-110, T-207 |
| FR-14 | T-103, T-105, T-501 |
| FR-15 | T-507 |
| FR-16 | T-201, T-202, T-508 |
| FR-17 | T-502, T-504, T-505 |
| FR-18 | T-101, T-106, T-205, T-404 |
| FR-19 | T-503 bis T-506 |
| FR-20 | T-601, T-602 |
| FR-21 | T-603, T-604 |
| FR-22 | T-002, T-003, T-701, T-702 |

### Regeln → Tasks

| Regeln (Regelwerk) | Tasks |
|---|---|
| A-1, A-2 (2.3) | T-103, T-501 |
| A-3, A-4 (2.3) | T-105, T-207, T-501 |
| A-5 (2.3, 13) | T-108 |
| G-1 bis G-4 (4.1) | T-104, T-105 |
| Erlaubnisliste (4.2, ohne IDs, Test je Paar) | T-104, T-105 |
| V-4 bis V-10, V-12, V-14 bis V-20 (4.3) | T-104, T-105 |
| X-1 (4.4) | T-104, T-105, T-204 |
| K-1 bis K-9 (5) | T-106, T-205 |
| Pfadregel (6.0), Bausteine (6.1) | T-107, T-402 |
| Aktionen (6.2 bis 6.7), Abläufe (7) | T-401 bis T-403 |
| Konfiguration (8) | T-502 |
| P-1 bis P-7, P-18, P-22, P-31 bis P-33 (9) | T-503 |
| P-8 bis P-15 (9) | T-504 |
| P-16, P-17, P-17a, P-19 bis P-21, P-23 bis P-30 (9) | T-505 |
| Herausforderungen (10) | T-603 |
| Modus Einfach/Erweitert (11) | T-207, T-501, T-506 |
| Presets (13) | T-108 |

Frei gewordene IDs ohne Task: V-1, V-2, V-3, V-11, V-13, G-5 (im
Regelwerk als G-1 bis G-3, K-6, K-8, K-9 aufgegangen).
