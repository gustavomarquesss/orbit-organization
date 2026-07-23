import { createElement } from "react";
import { Video, Image, Filter, Search, BookOpen, CalendarClock, NotebookPen, Mic, Wallet, Tag, type LucideIcon } from "lucide-react";

const CARD_TYPE_ICONS: Record<string, LucideIcon> = {
  video: Video,
  foto: Image,
  funil: Filter,
  referencia: Search,
  conteudo: BookOpen,
  reuniao: CalendarClock,
  anotacao: NotebookPen,
  podcast: Mic,
  financeiro: Wallet,
};

export function getCardTypeIcon(key?: string | null): LucideIcon {
  return (key && CARD_TYPE_ICONS[key]) || Tag;
}

// Retorna o ícone já instanciado (não o componente) para evitar criar um
// "componente" novo a cada render, o que o React Compiler não consegue
// memoizar com segurança (regra react-hooks/static-components).
export function renderCardTypeIcon(key?: string | null, className?: string) {
  return createElement(getCardTypeIcon(key), { className });
}
