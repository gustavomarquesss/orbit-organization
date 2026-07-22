import { Video, Image, Filter, Search, BookOpen, CalendarClock, NotebookPen, Mic, Tag, type LucideIcon } from "lucide-react";

const CARD_TYPE_ICONS: Record<string, LucideIcon> = {
  video: Video,
  foto: Image,
  funil: Filter,
  referencia: Search,
  conteudo: BookOpen,
  reuniao: CalendarClock,
  anotacao: NotebookPen,
  podcast: Mic,
};

export function getCardTypeIcon(key?: string | null): LucideIcon {
  return (key && CARD_TYPE_ICONS[key]) || Tag;
}
