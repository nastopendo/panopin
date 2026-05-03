import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulamin",
  description: "Regulamin korzystania z serwisu Panopin.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-sm prose-invert max-w-none">
      <h1>Regulamin</h1>
      <p className="lead text-muted-foreground">Ostatnia aktualizacja: kwiecień 2025</p>

      <h2>1. Postanowienia ogólne</h2>
      <p>
        Panopin (dalej: „Serwis") to bezpłatna, otwartoźródłowa gra geograficzna dostępna pod
        adresem panopin.app. Serwis umożliwia przeglądanie panoram 360° i zgadywanie ich lokalizacji
        na mapie. Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu.
      </p>

      <h2>2. Zasady gry</h2>
      <p>
        Każda runda składa się z 5 lokalizacji. Gracz ogląda panoramę 360°, a następnie zaznacza na
        mapie miejsce, w którym jego zdaniem zostało wykonane zdjęcie. Punktacja zależy od odległości
        od rzeczywistej lokalizacji oraz czasu udzielenia odpowiedzi. Punktacja jest obliczana
        wyłącznie po stronie serwera — wyniki przesyłane przez klienta nie są akceptowane.
      </p>

      <h2>3. Konto użytkownika</h2>
      <p>
        Gra jest dostępna bez rejestracji — Serwis automatycznie tworzy anonimową sesję. Opcjonalnie
        można zalogować się kontem Google lub linkiem e-mail, co umożliwia ustawienie nazwy
        wyświetlanej i pojawienie się w rankingu. Logowanie łączy anonimową sesję z kontem —
        dotychczasowe wyniki zostają zachowane.
      </p>
      <p>
        Adres e-mail użytkownika nie jest publicznie widoczny w Serwisie. Administrator może
        kontaktować się z użytkownikami mailowo wyłącznie w sprawach związanych z działaniem
        Serwisu, w tym w celu wręczenia ewentualnych upominków lub nagród przewidzianych w
        konkursach lub akcjach promocyjnych. Serwis nie wysyła wiadomości marketingowych ani
        newslettera.
      </p>
      <p>
        Użytkownik może w dowolnym momencie usunąć swoje konto i powiązane dane, wysyłając prośbę
        na adres wskazany w Polityce prywatności.
      </p>

      <h2>4. Treści i prawa autorskie</h2>
      <p>
        Panoramy 360° dostępne w Serwisie zostały wykonane i udostępnione przez administratorów
        Serwisu lub za ich zgodą. Kod źródłowy Serwisu jest dostępny na licencji MIT. Serwis nie
        gromadzi ani nie udostępnia treści tworzonych przez użytkowników — gracze wysyłają wyłącznie
        współrzędne geograficzne swoich odpowiedzi.
      </p>

      <h2>5. Zasady korzystania</h2>
      <p>Użytkownik zobowiązuje się nie:</p>
      <ul>
        <li>zakłócać działania Serwisu poprzez automatyczne zapytania (boty, scrapery),</li>
        <li>
          próbować ominąć mechanizmów punktacji po stronie serwera ani manipulować wynikami,
        </li>
        <li>naruszać praw innych użytkowników.</li>
      </ul>

      <h2>6. Dostępność i odpowiedzialność</h2>
      <p>
        Serwis jest udostępniany bezpłatnie w trybie „tak jak jest" (as-is), bez gwarancji
        nieprzerwanej dostępności. Administrator zastrzega prawo do czasowego wyłączenia Serwisu w
        celu przeprowadzenia prac technicznych lub z innych uzasadnionych powodów. Administrator nie
        ponosi odpowiedzialności za przerwy w działaniu ani utratę danych wynikającą z czynników
        zewnętrznych (awaria infrastruktury, siły wyższe).
      </p>

      <h2>7. Zmiany Regulaminu</h2>
      <p>
        Administrator zastrzega prawo do zmiany Regulaminu. O istotnych zmianach użytkownicy
        zalogowani będą informowani drogą e-mail lub przez komunikat w Serwisie. Dalsze korzystanie
        z Serwisu po wprowadzeniu zmian oznacza ich akceptację.
      </p>

      <h2>8. Prawo właściwe</h2>
      <p>
        Niniejszy Regulamin podlega prawu polskiemu. Wszelkie spory rozstrzygane będą przez sąd
        właściwy dla miejsca siedziby administratora.
      </p>
    </article>
  );
}
