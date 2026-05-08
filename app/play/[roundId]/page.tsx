import { getContent, t } from "@/lib/content";
import GameplayClient from "./GameplayClient";

export default async function Page() {
  const c = await getContent();
  return (
    <GameplayClient
      guestCardTitle={t(c, "play.guest_card_title")}
      guestCardDesc={t(c, "play.guest_card_desc")}
      guestCardButton={t(c, "play.guest_card_button")}
    />
  );
}
