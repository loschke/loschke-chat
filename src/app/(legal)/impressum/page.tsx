import type { Metadata } from "next"
import { brand } from "@/config/brand"
import { LegalProse } from "@/components/landing/legal-prose"

export const metadata: Metadata = {
  title: `Impressum — ${brand.name}`,
}

export default function ImpressumPage() {
  return (
    <LegalProse>
      <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
        Legal
      </p>
      <h1>Impressum</h1>
      <p className="lead">
        Angaben gemaess &sect; 5 Digitale-Dienste-Gesetz (DDG).
      </p>

      <h2>Angaben gemaess &sect; 5 DDG</h2>
      <p>
        Rico Loschke
        <br />
        c/o IP-Management #7926
        <br />
        Ludwig-Erhard-Str. 18
        <br />
        20459 Hamburg
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: hallo@sevenx.de
        <br />
        Telefon: 0351/89672115
      </p>

      <h2>Redaktionell verantwortlich</h2>
      <p>
        Rico Loschke
        <br />
        c/o IP-Management #7926
        <br />
        Ludwig-Erhard-Str. 18
        <br />
        20459 Hamburg
        <br />
        Deutschland
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europaeische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
        .
      </p>
      <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>

      <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an
        Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung fuer Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemaess &sect; 7 Abs. 1 DDG fuer eigene
        Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
        Nach &sect;&sect; 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, uebermittelte oder gespeicherte fremde Informationen zu
        ueberwachen oder nach Umstaenden zu forschen, die auf eine
        rechtswidrige Taetigkeit hinweisen.
      </p>
      <p>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon unberuehrt.
        Eine diesbezuegliche Haftung ist jedoch erst ab dem Zeitpunkt der
        Kenntnis einer konkreten Rechtsverletzung moeglich. Bei Bekanntwerden
        von entsprechenden Rechtsverletzungen werden wir diese Inhalte
        umgehend entfernen.
      </p>

      <h2>Haftung fuer Links</h2>
      <p>
        Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb koennen wir fuer diese
        fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der
        verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
        Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
        Verlinkung auf moegliche Rechtsverstoesse ueberprueft. Rechtswidrige
        Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
      </p>
      <p>
        Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch
        ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
        Bekanntwerden von Rechtsverletzungen werden wir derartige Links
        umgehend entfernen.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfaeltigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der
        Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des
        jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
        sind nur fuer den privaten, nicht kommerziellen Gebrauch gestattet.
      </p>
      <p>
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden,
        werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
        Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
        Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
        entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden
        wir derartige Inhalte umgehend entfernen.
      </p>
    </LegalProse>
  )
}
