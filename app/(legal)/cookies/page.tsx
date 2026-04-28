import type { Metadata } from "next";

const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "kontakt@example.com";

export const metadata: Metadata = {
  title: "Polityka cookies",
  description: "Informacje o plikach cookies używanych przez serwis Panopin.",
};

export default function CookiesPage() {
  return (
    <article className="prose prose-sm prose-invert max-w-none">
      <h1>Polityka cookies</h1>
      <p className="lead text-muted-foreground">Ostatnia aktualizacja: kwiecień 2025</p>

      <h2>Czym są pliki cookies?</h2>
      <p>
        Pliki cookies (ciasteczka) to małe pliki tekstowe zapisywane przez przeglądarkę na Twoim
        urządzeniu. Serwis korzysta też z mechanizmu <code>localStorage</code> — podobnego, ale
        dostępnego wyłącznie po stronie przeglądarki i nieprzesyłanego do serwera przy każdym
        żądaniu.
      </p>

      <h2>Jakich cookies używamy</h2>
      <p>
        Panopin używa wyłącznie plików cookies i wpisów localStorage niezbędnych do działania
        serwisu. Nie stosujemy cookies analitycznych ani marketingowych.
      </p>

      <div className="not-prose overflow-x-auto mt-4 mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Nazwa</th>
              <th className="py-2 pr-4 font-medium">Typ</th>
              <th className="py-2 pr-4 font-medium">Cel</th>
              <th className="py-2 font-medium">Wygaśnięcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <tr>
              <td className="py-3 pr-4 font-mono text-xs">sb-*</td>
              <td className="py-3 pr-4">Cookie HTTP</td>
              <td className="py-3 pr-4">
                Sesja uwierzytelniania (Supabase Auth) — niezbędna do gry, przechowywania wyników
                i logowania.
              </td>
              <td className="py-3">90 dni lub do wylogowania</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 font-mono text-xs">cookie_consent</td>
              <td className="py-3 pr-4">localStorage</td>
              <td className="py-3 pr-4">
                Zapamiętuje, że zapoznałeś się z informacją o cookies, aby nie wyświetlać jej
                ponownie.
              </td>
              <td className="py-3">Do wyczyszczenia localStorage</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Jak zarządzać cookies</h2>
      <p>
        Możesz zablokować lub usunąć cookies w ustawieniach swojej przeglądarki. Należy jednak
        pamiętać, że zablokowanie cookie sesji Supabase (<code>sb-*</code>) uniemożliwi
        korzystanie z gry — sesja i wyniki nie będą zapisywane.
      </p>
      <p>
        Instrukcje zarządzania cookies dla popularnych przeglądarek:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/pl/kb/usuwanie-ciasteczek"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/pl-pl/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
      </ul>

      <h2>Kontakt</h2>
      <p>
        W razie pytań dotyczących cookies skontaktuj się z nami:{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </article>
  );
}
