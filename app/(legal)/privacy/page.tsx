import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description:
    "Polityka prywatności serwisu Panopin — informacje o przetwarzaniu danych osobowych.",
};

const owner = process.env.NEXT_PUBLIC_SITE_OWNER ?? "administrator serwisu";
const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "kontakt@example.com";

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm prose-invert max-w-none">
      <h1>Polityka prywatności</h1>
      <p className="lead text-muted-foreground">
        Ostatnia aktualizacja: kwiecień 2025
      </p>

      <h2>1. Administrator danych</h2>
      <p>
        Administratorem danych osobowych użytkowników serwisu Panopin jest{" "}
        {owner}. Kontakt w sprawach dotyczących danych osobowych:{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>

      <h2>2. Jakie dane przetwarzamy</h2>
      <p>Serwis przetwarza następujące dane:</p>
      <ul>
        <li>
          <strong>Anonimowy identyfikator sesji</strong> — generowany
          automatycznie przy każdej wizycie, niezbędny do działania gry. Nie
          jest powiązany z tożsamością użytkownika, dopóki nie zaloguje się on
          kontem Google.
        </li>
        <li>
          <strong>Adres e-mail</strong> — wyłącznie w przypadku logowania przez
          Google. Używany do identyfikacji konta; nie jest udostępniany
          publicznie.
        </li>
        <li>
          <strong>Nazwa wyświetlana</strong> — opcjonalna, ustawiana przez
          użytkownika. Widoczna publicznie w rankingu.
        </li>
        <li>
          <strong>Wyniki gier</strong> — współrzędne geograficzne odpowiedzi,
          odległości od celu, punkty, czasy udzielenia odpowiedzi, znaczniki
          czasowe rund. Dane te są niezbędne do działania rankingu i statystyk.
        </li>
      </ul>
      <p>
        Serwis <strong>nie zbiera</strong> danych o zachowaniu użytkownika
        (śledzenie na stronach), nie wyświetla reklam i nie korzysta z
        zewnętrznych narzędzi analitycznych.
      </p>

      <h2>3. Podstawa i cel przetwarzania</h2>
      <p>
        Dane przetwarzane są na podstawie art. 6 ust. 1 lit. b RODO (niezbędność
        do wykonania umowy/usługi) — umożliwienie korzystania z gry,
        przechowywanie wyników i prowadzenie rankingu. Nie przetwarzamy danych w
        celach marketingowych.
      </p>

      <h2>4. Czas przechowywania danych</h2>
      <ul>
        <li>
          Anonimowe sesje wygasają automatycznie po 90 dniach braku aktywności
          (zgodnie z domyślną konfiguracją Supabase Auth).
        </li>
        <li>
          Dane kont zarejestrowanych (e-mail, nazwa, wyniki) są przechowywane do
          momentu usunięcia konta.
        </li>
      </ul>

      <h2>5. Odbiorcy danych</h2>
      <p>
        Dane są przechowywane w infrastrukturze Supabase (baza danych
        PostgreSQL, uwierzytelnianie) i Vercel (hosting aplikacji). Obaj
        dostawcy działają zgodnie z RODO i zapewniają standardowe klauzule
        umowne (SCC). Dane nie są przekazywane innym podmiotom.
      </p>

      <h2>6. Prawa użytkownika</h2>
      <p>
        Przysługuje Ci prawo do: dostępu do swoich danych, ich sprostowania,
        usunięcia (&quot;prawo do bycia zapomnianym&quot;), przenoszalności
        danych, ograniczenia przetwarzania oraz wniesienia sprzeciwu. Aby
        skorzystać z tych praw, wyślij wiadomość na adres:{" "}
        <a href={`mailto:${email}`}>{email}</a>. Masz również prawo złożenia
        skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO).
      </p>

      <h2>7. Pliki cookies</h2>
      <p>
        Informacje o używanych plikach cookies znajdziesz w{" "}
        <a href="/cookies">Polityce cookies</a>.
      </p>
    </article>
  );
}
