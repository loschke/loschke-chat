import type { Metadata } from "next"
import { brand } from "@/config/brand"
import { LegalProse } from "@/components/landing/legal-prose"

export const metadata: Metadata = {
  title: `Datenschutzerklaerung — ${brand.name}`,
}

export default function DatenschutzPage() {
  return (
    <LegalProse>
      <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
        Legal
      </p>
      <h1>Datenschutz&shy;erklaerung</h1>
      <p className="lead">
        Informationen zur Verarbeitung personenbezogener Daten gemaess DSGVO.
      </p>

      {/* 1 — Ueberblick */}
      <h2>1. Datenschutz auf einen Blick</h2>

      <h3>Allgemeine Hinweise</h3>
      <p>
        Die folgenden Hinweise geben einen einfachen Ueberblick darueber, was
        mit Ihren personenbezogenen Daten passiert, wenn Sie diese Plattform
        nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie
        persoenlich identifiziert werden koennen.
      </p>

      <h3>Datenerfassung auf dieser Plattform</h3>
      <p>
        <strong>
          Wer ist verantwortlich fuer die Datenerfassung auf dieser Plattform?
        </strong>
        <br />
        Die Datenverarbeitung erfolgt durch den Plattformbetreiber. Dessen
        Kontaktdaten entnehmen Sie dem{" "}
        <a href="/impressum">Impressum</a>.
      </p>
      <p>
        <strong>Wie erfassen wir Ihre Daten?</strong>
        <br />
        Ihre Daten werden erhoben, wenn Sie sich registrieren, die
        Chat-Funktion nutzen, Dateien hochladen oder Einstellungen vornehmen.
        Technische Daten (z.B. Browser, Betriebssystem, Zugriffszeit) werden
        automatisch beim Seitenaufruf erfasst.
      </p>
      <p>
        <strong>Wofuer nutzen wir Ihre Daten?</strong>
        <br />
        Ihre Daten werden zur Bereitstellung der KI-Chat-Funktionalitaet,
        zur Benutzerverwaltung und zur Verbesserung der Plattform verwendet.
      </p>
      <p>
        <strong>Welche Rechte haben Sie?</strong>
        <br />
        Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Loeschung und
        Einschraenkung der Verarbeitung Ihrer Daten. Details finden Sie in
        Abschnitt 7.
      </p>

      {/* 2 — Hosting */}
      <h2>2. Hosting</h2>

      <h3>Hosting ueber Vercel</h3>
      <p>
        Diese Plattform wird ueber <strong>Vercel</strong> (Vercel Inc., 340 S
        Lemon Ave #4133, Walnut, CA 91789, USA) bereitgestellt. Beim Aufruf
        werden durch Vercel automatisch technische Daten verarbeitet (IP-Adresse,
        Browsertyp, Betriebssystem, Zugriffszeit, angeforderte Seite).
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an sicherer Bereitstellung). Vercel fungiert als Auftragsverarbeiter
        gemaess Art. 28 DSGVO.
      </p>
      <p>
        Vercel ist unter dem EU-US Data Privacy Framework (DPF) zertifiziert und
        setzt EU-Standardvertragsklauseln (SCCs) ein. DPA:{" "}
        <a
          href="https://vercel.com/legal/dpa"
          target="_blank"
          rel="noopener noreferrer"
        >
          vercel.com/legal/dpa
        </a>
      </p>

      <h3>Datenbank bei Neon</h3>
      <p>
        Fuer die Datenspeicherung nutzen wir <strong>Neon</strong> (Neon Inc.)
        als Datenbank-Hosting-Provider. Alle gespeicherten Daten werden mit
        AES-256 verschluesselt (Encryption at Rest). Die Verbindung erfolgt
        ausschliesslich ueber TLS 1.2/1.3 (Encryption in Transit). Neon
        fungiert als Auftragsverarbeiter gemaess Art. 28 DSGVO.
      </p>

      {/* 3 — Pflichtinformationen */}
      <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>

      <h3>Datenschutz</h3>
      <p>
        Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend
        der gesetzlichen Datenschutzvorschriften sowie dieser
        Datenschutzerklaerung. Die Datenuebertragung im Internet kann
        Sicherheitsluecken aufweisen. Ein lueckenloser Schutz ist nicht
        moeglich.
      </p>

      <h3>Verantwortliche Stelle</h3>
      <p>
        Die verantwortliche Stelle entnehmen Sie bitte dem{" "}
        <a href="/impressum">Impressum</a>.
      </p>

      <h3>Speicherdauer</h3>
      <p>
        Soweit keine speziellere Speicherdauer genannt wird, verbleiben Ihre
        Daten bei uns, bis der Verarbeitungszweck entfaellt. Bei berechtigtem
        Loeschersuchen oder Widerruf werden Ihre Daten geloescht, sofern keine
        gesetzlichen Aufbewahrungspflichten bestehen.
      </p>

      <h3>Widerruf Ihrer Einwilligung</h3>
      <p>
        Viele Datenverarbeitungsvorgaenge sind nur mit Ihrer Einwilligung
        moeglich. Sie koennen eine erteilte Einwilligung jederzeit widerrufen.
        Die Rechtmaessigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt
        unberuehrt.
      </p>

      <h3>Beschwerderecht</h3>
      <p>
        Im Falle von Verstoessen gegen die DSGVO steht Ihnen ein
        Beschwerderecht bei einer Aufsichtsbehoerde zu, insbesondere in dem
        Mitgliedstaat Ihres gewoehnlichen Aufenthalts oder des Orts des
        mutmasslichen Verstosses.
      </p>

      {/* 4 — Datenerfassung */}
      <h2>4. Datenerfassung auf dieser Plattform</h2>

      <h3>Benutzerkonto und Authentifizierung</h3>
      <p>
        Fuer die Nutzung ist ein Benutzerkonto erforderlich. Die
        Authentifizierung erfolgt ueber <strong>Logto</strong> (OpenID Connect).
        Dabei werden E-Mail-Adresse, Name und Profilbild verarbeitet.
        Passwoerter werden ausschliesslich bei Logto gespeichert, nicht auf
        unserer Plattform.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung).
      </p>

      <h3>Chat-Kommunikation</h3>
      <p>
        Ihre Chat-Nachrichten werden zur Generierung von KI-Antworten an den
        konfigurierten AI-Provider gesendet (transiente Verarbeitung, keine
        dauerhafte Speicherung beim Provider). Die Chat-Verlaeufe werden in
        unserer Datenbank gespeichert.
      </p>
      <p>
        Nicht angepinnte Chats werden automatisch nach{" "}
        <strong>90 Tagen</strong> geloescht (konfigurierbar). Sie koennen Chats
        jederzeit manuell loeschen.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung).
      </p>

      <h3>Generierte Inhalte (Artifacts)</h3>
      <p>
        Von der KI generierte Inhalte (Code, HTML, Dokumente) werden als
        Artifacts gespeichert und sind an den jeweiligen Chat gekoppelt.
        Datei-Uploads werden in einem S3-kompatiblen Object Storage
        (Cloudflare R2 oder Self-Hosted) gespeichert.
      </p>

      <h3>Nutzungserfassung und Credits</h3>
      <p>
        Wir erfassen Token-Verbrauch, verwendetes Modell und Zeitstempel zur
        Abrechnung und Verbrauchstransparenz. Es werden{" "}
        <strong>keine Nachrichteninhalte</strong> in den Usage-Logs gespeichert.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung).
      </p>

      {/* 5 — Cookies */}
      <h2>5. Cookies</h2>
      <p>
        Diese Plattform verwendet ausschliesslich <strong>technisch
        notwendige Cookies</strong>:
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Zweck</th>
            <th>Speicherdauer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Logto Session-Cookie</td>
            <td>Authentifizierung (OIDC-Session)</td>
            <td>Sitzungsdauer</td>
          </tr>
        </tbody>
      </table>
      <p>
        Es werden <strong>keine</strong> Analyse-, Tracking- oder
        Marketing-Cookies eingesetzt. Die Darstellungspraeferenz (Dark/Light
        Mode) wird im lokalen Browserspeicher (localStorage) gespeichert, nicht
        als Cookie.
      </p>
      <p>
        Da ausschliesslich technisch notwendige Cookies verwendet werden, ist
        eine Einwilligung gemaess &sect; 25 TDDDG nicht erforderlich.
      </p>

      {/* 6 — Optionale Features */}
      <h2>6. Optionale Datenschutz-Features</h2>

      <h3>PII-Erkennung (Business Mode)</h3>
      <p>
        Bei aktiviertem Business Mode erkennt die Plattform automatisch
        personenbezogene Daten in Ihren Eingaben (E-Mail, IBAN, Telefonnummer
        etc.) und bietet Ihnen die Moeglichkeit, diese vor der Verarbeitung zu
        maskieren oder die Anfrage an einen EU-basierten bzw. lokalen
        AI-Provider umzuleiten.
      </p>
      <p>
        Die PII-Erkennung erfolgt lokal auf dem Server (Regex-basiert). Es
        werden keine Daten an externe Dienste zur PII-Erkennung gesendet.
        Ihre Entscheidungen werden als Audit-Trail protokolliert.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
        Datenschutz-Compliance).
      </p>

      <h3>Memory-System</h3>
      <p>
        Das Memory-System speichert kontextuelle Erinnerungen fuer
        personalisierte KI-Antworten. Sie koennen Memory jederzeit
        deaktivieren und alle gespeicherten Memories loeschen.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Memory
        wird nur aktiviert, wenn Sie es explizit einschalten.
      </p>

      <h3>Chat-Sharing</h3>
      <p>
        Sie koennen Chats oeffentlich teilen oder mit anderen Nutzern der
        Plattform teilen. Oeffentliche Shares machen den Chat-Verlauf ohne
        Authentifizierung lesbar. Sie koennen Shares jederzeit widerrufen.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktives
        Teilen).
      </p>

      {/* 7 — Betroffenenrechte */}
      <h2>7. Ihre Rechte</h2>
      <p>Sie haben folgende Rechte bezueglich Ihrer personenbezogenen Daten:</p>
      <ul>
        <li>
          <strong>Auskunft</strong> (Art. 15 DSGVO) — Sie koennen Auskunft ueber
          Ihre gespeicherten Daten verlangen.
        </li>
        <li>
          <strong>Berichtigung</strong> (Art. 16 DSGVO) — Sie koennen Ihre
          Profildaten jederzeit aendern.
        </li>
        <li>
          <strong>Loeschung</strong> (Art. 17 DSGVO) — Sie koennen die Loeschung
          Ihrer Chats, Memories und Ihres Kontos verlangen.
        </li>
        <li>
          <strong>Einschraenkung</strong> (Art. 18 DSGVO) — Sie koennen die
          Einschraenkung der Verarbeitung verlangen.
        </li>
        <li>
          <strong>Datenuebertragbarkeit</strong> (Art. 20 DSGVO) — Sie koennen
          Ihre Daten in einem maschinenlesbaren Format anfordern.
        </li>
        <li>
          <strong>Widerspruch</strong> (Art. 21 DSGVO) — Sie koennen der
          Verarbeitung widersprechen.
        </li>
      </ul>
      <p>
        Zur Ausuebung Ihrer Rechte wenden Sie sich an die im{" "}
        <a href="/impressum">Impressum</a> genannte Kontaktadresse.
      </p>

      {/* 8 — Auftragsverarbeiter */}
      <h2>8. Auftragsverarbeiter und Drittlandtransfers</h2>
      <p>Folgende Dienstleister verarbeiten Daten in unserem Auftrag:</p>
      <table>
        <thead>
          <tr>
            <th>Dienstleister</th>
            <th>Zweck</th>
            <th>Standort</th>
            <th>Garantie</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Inc.</td>
            <td>App-Hosting</td>
            <td>USA / Global</td>
            <td>DPF + SCCs</td>
          </tr>
          <tr>
            <td>Neon Inc.</td>
            <td>Datenbank</td>
            <td>USA / EU (waehlbar)</td>
            <td>SCCs</td>
          </tr>
          <tr>
            <td>Logto</td>
            <td>Authentifizierung</td>
            <td>Abhaengig vom Setup</td>
            <td>SCCs</td>
          </tr>
          <tr>
            <td>AI-Provider (variabel)</td>
            <td>KI-Inference</td>
            <td>Abhaengig vom Provider</td>
            <td>SCCs / EU / Lokal</td>
          </tr>
        </tbody>
      </table>
      <p>
        Die Plattform unterstuetzt EU- und Self-Hosted-Deployment-Profile, bei
        denen Drittlandtransfers vollstaendig vermieden werden koennen.
      </p>

      {/* 9 — Sicherheit */}
      <h2>9. Technische Sicherheitsmassnahmen</h2>
      <p>Wir setzen folgende Massnahmen zum Schutz Ihrer Daten ein:</p>
      <ul>
        <li>Verschluesselung aller Daten at Rest (AES-256) und in Transit (TLS 1.2/1.3)</li>
        <li>OIDC-basierte Authentifizierung mit verschluesselten Session-Cookies</li>
        <li>CSRF-Schutz, Rate Limiting und Content Security Policy</li>
        <li>Zugriffskontrolle mit userId-Scoping auf allen Datenbankoperationen</li>
        <li>Automatische Loeschung nicht angepinnter Chats nach konfigurierbarer Frist</li>
        <li>Optionale PII-Erkennung und -Maskierung vor der KI-Verarbeitung</li>
      </ul>

      {/* 10 — Aktualitaet */}
      <h2>10. Aktualitaet</h2>
      <p>
        Diese Datenschutzerklaerung ist aktuell gueltig und hat den Stand
        Maerz 2026. Durch Weiterentwicklung der Plattform oder aufgrund
        geaenderter gesetzlicher Vorgaben kann eine Anpassung notwendig werden.
      </p>
    </LegalProse>
  )
}
