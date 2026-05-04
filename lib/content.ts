import { db } from "@/lib/db/client";
import { siteContent } from "@/lib/db/schema";

export type ContentKey = keyof typeof DEFAULT_CONTENT;

export const DEFAULT_CONTENT = {
  // ── Strona główna ──────────────────────────────────────────────────────────
  "home.badge": "Otwartoźródłowa gra zrobiona dla lokalnej społeczności",
  "home.hero_title": "Zgadnij, gdzie zrobiono",
  "home.hero_title_highlight": "panoramę 360°",
  "home.hero_desc":
    "Obejrzyj zdjęcie z okolicy, postaw pinezkę na mapie i zdobywaj punkty. Im bliżej trafisz — tym lepiej. 5 lokalizacji, jedna runda, czysta zabawa.",
  "home.cta_play": "Zagraj teraz",
  "home.cta_tournament": "Turniej ze znajomymi",
  "home.stat_panoramas": "Panoram w grze",
  "home.stat_rounds": "Rund rozegranych",
  "home.stat_tournaments": "Turnieji rozegranych",
  "home.stat_per_round": "Lokalizacji na rundę",
  "home.how_title": "Jak to działa",
  "home.step1_title": "Obejrzyj panoramę",
  "home.step1_desc":
    "Otwórz zdjęcie 360° i rozejrzyj się — szukaj znajomych ulic, budynków i innych charakterystycznych elementów.",
  "home.step2_title": "Postaw pinezkę",
  "home.step2_desc":
    "Wybierz na mapie miejsce, w którym Twoim zdaniem powstała panorama. Im bliżej trafisz — tym więcej punktów.",
  "home.step3_title": "Pobij rekord",
  "home.step3_desc":
    "5 lokalizacji, jeden łączny wynik. Walcz o miejsce w rankingu albo udostępnij wynik znajomym i sprawdź, kto trafia celniej.",
  // ── Gra solo ───────────────────────────────────────────────────────────────
  "play.badge": "5 lokalizacji · jedna runda",
  "play.hero_title": "Gotów do gry?",
  "play.hero_desc": "Wybierz trudność i opcjonalne tagi — albo zostaw wszystko i zaczynaj.",
  "play.filters_title": "Filtry",
  "play.filters_desc": "Zostaną zastosowane do losowania.",
  "play.difficulty_label": "Trudność",
  "play.start_button": "Zagraj",
  "play.loading": "Przygotowuję grę…",
  "play.difficulty_easy": "Łatwe",
  "play.difficulty_medium": "Średnie",
  "play.difficulty_hard": "Trudne",
  "play.difficulty_extreme": "Ekstremalne",
  // ── Turniej ────────────────────────────────────────────────────────────────
  "tournament.badge": "Turniej · do 20 graczy",
  "tournament.hero_title": "Zagraj ze znajomymi",
  "tournament.hero_desc":
    "Utwórz turniej i podziel się kodem albo dołącz do istniejącego.",
  "tournament.tab_create": "Utwórz",
  "tournament.tab_join": "Dołącz",
  "tournament.player_card_title": "Twoje dane",
  "tournament.player_card_desc": "Pod tą nazwą zobaczą Cię inni gracze.",
  "tournament.nick_label": "Nick",
  "tournament.nick_placeholder": "Np. Kasia",
  "tournament.filters_title": "Filtry",
  "tournament.filters_desc": "Zostaną zastosowane do losowania zdjęć.",
  "tournament.code_card_title": "Kod turnieju",
  "tournament.code_card_desc": "6 znaków od hosta.",
  "tournament.create_button": "Utwórz turniej",
  "tournament.join_button": "Dołącz do turnieju",
  "tournament.creating": "Tworzę turniej…",
  "tournament.joining": "Dołączam…",
  // ── Ranking ────────────────────────────────────────────────────────────────
  "leaderboard.title": "Ranking",
  "leaderboard.subtitle": "Najlepsze wyniki ze wszystkich czasów",
  "leaderboard.empty": "Brak wyników. Zagraj pierwszą rundę!",
  "leaderboard.col_player": "Gracz",
  "leaderboard.col_score": "Wynik",
  "leaderboard.col_date": "Data",
  // ── SEO / Meta ─────────────────────────────────────────────────────────────
  "meta.site_name": "Panopin",
  "meta.title_default": "Panopin — sprawdź jak dobrze znasz swoją okolicę",
  "meta.title_template": "%s · Panopin",
  "meta.description": "Obejrzyj panoramę 360° z okolicy i postaw pinezkę tam, gdzie myślisz że została zrobiona. 5 lokalizacji w rundzie — im celniej tym więcej punktów.",
  "meta.keywords": "panopin, geoguessr, panorama 360, gra lokalna, moja okolica, zgadywanka",
  "meta.og_title": "Panopin — sprawdź jak dobrze znasz swoją okolicę",
  "meta.og_description": "Obejrzyj panoramę 360° z okolicy i postaw pinezkę tam, gdzie myślisz że została zrobiona. 5 lokalizacji w rundzie — im celniej tym więcej punktów.",
  "meta.twitter_title": "Panopin — jak dobrze znasz swoją okolicę?",
  "meta.twitter_description": "Obejrzyj panoramę 360° i postaw pinezkę tam, gdzie myślisz że została zrobiona.",
} as const satisfies Record<string, string>;

export type ContentMap = Record<string, string>;

export const CONTENT_META: Record<
  string,
  { section: string; label: string; description?: string; multiline?: boolean }
> = {
  "home.badge": { section: "Strona główna", label: "Badge pod logo", description: "Mały tekst w kapsule nad tytułem" },
  "home.hero_title": { section: "Strona główna", label: "Tytuł — część pierwsza" },
  "home.hero_title_highlight": { section: "Strona główna", label: "Tytuł — wyróżniona część (gradient)" },
  "home.hero_desc": { section: "Strona główna", label: "Opis pod tytułem", multiline: true },
  "home.cta_play": { section: "Strona główna", label: "Przycisk: Zagraj" },
  "home.cta_tournament": { section: "Strona główna", label: "Przycisk: Turniej" },
  "home.stat_panoramas": { section: "Strona główna", label: "Statystyka: etykieta panoram" },
  "home.stat_rounds": { section: "Strona główna", label: "Statystyka: etykieta rund" },
  "home.stat_tournaments": { section: "Strona główna", label: "Statystyka: etykieta turnieji" },
  "home.stat_per_round": { section: "Strona główna", label: "Statystyka: etykieta lokalizacji" },
  "home.how_title": { section: "Strona główna", label: "Tytuł sekcji 'Jak to działa'" },
  "home.step1_title": { section: "Strona główna", label: "Krok 1 — tytuł" },
  "home.step1_desc": { section: "Strona główna", label: "Krok 1 — opis", multiline: true },
  "home.step2_title": { section: "Strona główna", label: "Krok 2 — tytuł" },
  "home.step2_desc": { section: "Strona główna", label: "Krok 2 — opis", multiline: true },
  "home.step3_title": { section: "Strona główna", label: "Krok 3 — tytuł" },
  "home.step3_desc": { section: "Strona główna", label: "Krok 3 — opis", multiline: true },

  "play.badge": { section: "Gra solo", label: "Badge (np. '5 lokalizacji')" },
  "play.hero_title": { section: "Gra solo", label: "Tytuł strony" },
  "play.hero_desc": { section: "Gra solo", label: "Opis pod tytułem" },
  "play.filters_title": { section: "Gra solo", label: "Tytuł karty filtrów" },
  "play.filters_desc": { section: "Gra solo", label: "Opis karty filtrów" },
  "play.difficulty_label": { section: "Gra solo", label: "Etykieta sekcji trudności" },
  "play.start_button": { section: "Gra solo", label: "Przycisk: Zagraj" },
  "play.loading": { section: "Gra solo", label: "Tekst ładowania gry" },
  "play.difficulty_easy": { section: "Gra solo", label: "Trudność: Łatwe" },
  "play.difficulty_medium": { section: "Gra solo", label: "Trudność: Średnie" },
  "play.difficulty_hard": { section: "Gra solo", label: "Trudność: Trudne" },
  "play.difficulty_extreme": { section: "Gra solo", label: "Trudność: Ekstremalne" },

  "tournament.badge": { section: "Turniej", label: "Badge (np. 'Turniej · do 20 graczy')" },
  "tournament.hero_title": { section: "Turniej", label: "Tytuł strony" },
  "tournament.hero_desc": { section: "Turniej", label: "Opis pod tytułem", multiline: true },
  "tournament.tab_create": { section: "Turniej", label: "Zakładka: Utwórz" },
  "tournament.tab_join": { section: "Turniej", label: "Zakładka: Dołącz" },
  "tournament.player_card_title": { section: "Turniej", label: "Karta gracza — tytuł" },
  "tournament.player_card_desc": { section: "Turniej", label: "Karta gracza — opis" },
  "tournament.nick_label": { section: "Turniej", label: "Pole: Nick — etykieta" },
  "tournament.nick_placeholder": { section: "Turniej", label: "Pole: Nick — placeholder" },
  "tournament.filters_title": { section: "Turniej", label: "Karta filtrów — tytuł" },
  "tournament.filters_desc": { section: "Turniej", label: "Karta filtrów — opis" },
  "tournament.code_card_title": { section: "Turniej", label: "Karta kodu — tytuł" },
  "tournament.code_card_desc": { section: "Turniej", label: "Karta kodu — opis" },
  "tournament.create_button": { section: "Turniej", label: "Przycisk: Utwórz turniej" },
  "tournament.join_button": { section: "Turniej", label: "Przycisk: Dołącz do turnieju" },
  "tournament.creating": { section: "Turniej", label: "Tekst ładowania (tworzenie)" },
  "tournament.joining": { section: "Turniej", label: "Tekst ładowania (dołączanie)" },

  "leaderboard.title": { section: "Ranking", label: "Tytuł strony" },
  "leaderboard.subtitle": { section: "Ranking", label: "Podtytuł" },
  "leaderboard.empty": { section: "Ranking", label: "Tekst gdy brak wyników" },
  "leaderboard.col_player": { section: "Ranking", label: "Kolumna: Gracz" },
  "leaderboard.col_score": { section: "Ranking", label: "Kolumna: Wynik" },
  "leaderboard.col_date": { section: "Ranking", label: "Kolumna: Data" },

  "meta.site_name": { section: "SEO / Meta", label: "Nazwa serwisu" },
  "meta.title_default": { section: "SEO / Meta", label: "Tytuł domyślny", description: "Używany gdy strona nie nadpisuje tytułu" },
  "meta.title_template": { section: "SEO / Meta", label: "Szablon tytułu", description: "%s zostanie zastąpione tytułem podstrony" },
  "meta.description": { section: "SEO / Meta", label: "Opis strony (description)", description: "Wyświetlany w wynikach Google i przy udostępnianiu", multiline: true },
  "meta.keywords": { section: "SEO / Meta", label: "Słowa kluczowe (keywords)", description: "Oddzielone przecinkami" },
  "meta.og_title": { section: "SEO / Meta", label: "Open Graph: tytuł", description: "Tytuł przy udostępnianiu na Facebooku, Twitterze itp." },
  "meta.og_description": { section: "SEO / Meta", label: "Open Graph: opis", description: "Opis przy udostępnianiu linku", multiline: true },
  "meta.twitter_title": { section: "SEO / Meta", label: "Twitter/X: tytuł" },
  "meta.twitter_description": { section: "SEO / Meta", label: "Twitter/X: opis", multiline: true },
};

export async function getContent(): Promise<ContentMap> {
  try {
    const rows = await db.select().from(siteContent);
    const result: ContentMap = { ...DEFAULT_CONTENT };
    for (const row of rows) {
      if (row.key in result) result[row.key] = row.value;
    }
    return result;
  } catch {
    return { ...DEFAULT_CONTENT };
  }
}

export function t(content: ContentMap, key: string): string {
  return content[key] ?? DEFAULT_CONTENT[key as ContentKey] ?? key;
}
