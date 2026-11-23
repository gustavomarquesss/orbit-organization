"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowRight, CalendarClock, CheckCircle2, ListChecks, MoreHorizontal, Plus, Repeat, Sun } from "lucide-react";
import { toast } from "sonner";

import { AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamMemberAvatar } from "@/components/team/team-member-avatar";
import { useQuickAddCardInStatus } from "@/components/cards/card-quick-add-provider";
import { moveCardToStatus } from "@/lib/actions/cards";
import { renderCardTypeIcon } from "@/lib/utils/card-type-icons";
import { formatPrazo, isPrazoVencido } from "@/lib/utils/prazo";
import { cardRecorrenciaLabel } from "@/lib/utils/recorrencia";
import { sortCards } from "@/lib/utils/card-sort";
import { cn } from "@/lib/utils";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";

type Status = CardLookups["statuses"][number];

const COLUMN_PAGE_SIZE = 25;

function PriorityPill({ priority }: { priority: NonNullable<CardWithRelations["priority"]> }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color: priority.color, backgroundColor: `${priority.color}1f` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
      {priority.label}
    </span>
  );
}

function ChecklistChip({ checklist }: { checklist: NonNullable<CardWithRelations["checklist"]> }) {
  const complete = checklist.total > 0 && checklist.done === checklist.total;
  const Icon = complete ? CheckCircle2 : checklist.daily ? Sun : ListChecks;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        complete ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary",
      )}
      title={checklist.daily ? "Checklist que zera todo dia" : "Checklist"}
    >
      <Icon className="size-3" />
      {checklist.done}/{checklist.total}
      {checklist.daily ? <span className="font-normal opacity-80">hoje</span> : null}
    </span>
  );
}

// Visual do card no quadro (usado na coluna e no "fantasma" que acompanha o dedo/mouse ao arrastar).
function KanbanCardView({
  card,
  statuses,
  onMove,
  overlay,
  onLinkClick,
}: {
  card: CardWithRelations;
  statuses?: Status[];
  onMove?: (statusId: string) => void;
  overlay?: boolean;
  onLinkClick?: (e: React.MouseEvent) => void;
}) {
  const members = card.card_responsaveis
    .map((cr) => cr.team_member)
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  const modelos = card.card_modelos.map((cm) => cm.modelo?.name).filter((n): n is string => Boolean(n));
  const prazo = formatPrazo(card);
  const overdue = isPrazoVencido(card);
  const recorrencia = cardRecorrenciaLabel(card.recorrencia);
  const accent = card.priority?.color ?? "transparent";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all",
        overlay
          ? "rotate-2 scale-[1.03] cursor-grabbing shadow-2xl ring-2 ring-primary/50"
          : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
      )}
    >
      {card.cover_color ? (
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${card.cover_color}, ${card.cover_color}88)` }}
        />
      ) : null}
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: accent }} aria-hidden />

      <Link
        href={`/cards/${card.id}`}
        draggable={false}
        onClick={onLinkClick}
        className="flex flex-col gap-2 p-3 pl-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between gap-2 pr-6">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="shrink-0 font-mono text-muted-foreground/70">#{card.card_number}</span>
            {renderCardTypeIcon(card.card_type?.key, "size-3.5 shrink-0")}
            <span className="truncate">{card.card_type?.label}</span>
          </span>
          {card.priority ? <PriorityPill priority={card.priority} /> : null}
        </div>

        <h3 className="line-clamp-3 text-sm leading-snug font-medium text-foreground">{card.title}</h3>

        {card.card_tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {card.card_tags.slice(0, 3).map(({ tag }) =>
              tag ? (
                <span
                  key={tag.id}
                  className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                >
                  {tag.name}
                </span>
              ) : null,
            )}
            {card.card_tags.length > 3 ? (
              <span className="text-[10px] text-muted-foreground">+{card.card_tags.length - 3}</span>
            ) : null}
          </div>
        ) : null}

        {prazo || card.checklist || recorrencia ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {prazo ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  overdue ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                )}
                title={`Prazo: ${prazo}`}
              >
                <CalendarClock className="size-3" />
                {prazo}
              </span>
            ) : null}
            {card.checklist ? <ChecklistChip checklist={card.checklist} /> : null}
            {recorrencia ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                title={`Recorrência: ${recorrencia}`}
              >
                <Repeat className="size-3" />
                {recorrencia}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {members.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/70">Sem responsável</span>
          ) : (
            <AvatarGroup>
              {members.slice(0, 3).map((m) => (
                <TeamMemberAvatar
                  key={m.id}
                  name={m.full_name}
                  avatarUrl={m.avatar_url}
                  avatarColor={m.avatar_color}
                  size="sm"
                />
              ))}
            </AvatarGroup>
          )}
          {modelos.length > 0 ? (
            <span className="min-w-0 truncate text-[10px] text-muted-foreground" title={modelos.join(", ")}>
              {modelos.length <= 2 ? modelos.join(", ") : `${modelos.slice(0, 2).join(", ")} +${modelos.length - 2}`}
            </span>
          ) : null}
        </div>
      </Link>

      {onMove && statuses ? (
        <div className="absolute top-2 right-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Mover card"
                  className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 aria-expanded:opacity-100"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
              {statuses.map((s) => (
                <DropdownMenuItem key={s.id} disabled={s.id === card.status?.id} onClick={() => onMove(s.id)}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                  {s.id === card.status?.id ? null : <ArrowRight className="ml-auto size-3 opacity-50" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}

function DraggableCard({
  card,
  statuses,
  canEdit,
  onMove,
  lastDragRef,
}: {
  card: CardWithRelations;
  statuses: Status[];
  canEdit: boolean;
  onMove: (cardId: string, statusId: string) => void;
  lastDragRef: React.RefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: card.id, disabled: !canEdit });
  // O card também é "alvo": soltar sobre ele posiciona o card arrastado antes/depois dele.
  const { setNodeRef: setDropRef } = useDroppable({ id: card.id });

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      // listeners no wrapper; o role/tabindex de "button" do dnd-kit ficaria aninhado ao link do card.
      {...listeners}
      aria-describedby={attributes["aria-describedby"]}
      className={cn("touch-manipulation", canEdit && "cursor-grab", isDragging && "opacity-30")}
    >
      <KanbanCardView
        card={card}
        statuses={canEdit ? statuses : undefined}
        onMove={canEdit ? (statusId) => onMove(card.id, statusId) : undefined}
        // Soltar o card sobre ele mesmo não deve abrir o modal do card.
        onLinkClick={(e) => {
          if (lastDragRef.current) e.preventDefault();
        }}
      />
    </div>
  );
}

function Column({
  status,
  cards,
  statuses,
  canEdit,
  onMove,
  lastDragRef,
}: {
  status: Status;
  cards: CardWithRelations[];
  statuses: Status[];
  canEdit: boolean;
  onMove: (cardId: string, statusId: string) => void;
  lastDragRef: React.RefObject<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const openCreateInStatus = useQuickAddCardInStatus();
  const [visible, setVisible] = useState(COLUMN_PAGE_SIZE);
  const shown = cards.slice(0, visible);

  return (
    <section
      className={cn(
        "flex max-h-[calc(100dvh-17rem)] min-h-40 w-[17.5rem] shrink-0 snap-start flex-col rounded-2xl border bg-muted/30 transition-colors sm:w-72",
        isOver && "border-primary/60 bg-primary/5",
      )}
      style={{ borderTop: `3px solid ${status.color}` }}
      aria-label={status.label}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{status.label}</h2>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{ color: status.color, backgroundColor: `${status.color}1f` }}
        >
          {cards.length}
        </span>
        {canEdit ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => openCreateInStatus(status.id)}
            aria-label={`Novo card em ${status.label}`}
          >
            <Plus />
          </Button>
        ) : null}
      </header>

      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {shown.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            statuses={statuses}
            canEdit={canEdit}
            onMove={onMove}
            lastDragRef={lastDragRef}
          />
        ))}

        {cards.length > visible ? (
          <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + COLUMN_PAGE_SIZE)}>
            Mostrar mais ({cards.length - visible})
          </Button>
        ) : null}

        {cards.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground",
              isOver && "border-primary/60 text-primary",
            )}
          >
            {canEdit ? "Arraste cards para cá" : "Nenhum card"}
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <button
          type="button"
          onClick={() => openCreateInStatus(status.id)}
          className="mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Adicionar card
        </button>
      ) : null}
    </section>
  );
}

export function KanbanBoard({
  cards,
  lookups,
  columns,
  sortKey,
  canEdit,
}: {
  cards: CardWithRelations[];
  lookups: CardLookups;
  columns: Status[];
  sortKey: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastDragRef = useRef(false);
  // Por um instante após soltar, cliques no card são ignorados (evita abrir o modal sem querer).
  function markDragged() {
    lastDragRef.current = true;
    setTimeout(() => {
      lastDragRef.current = false;
    }, 250);
  }

  // Movimentos otimistas (coluna e posição) valem só até a próxima versão dos dados chegar do servidor.
  const [optimistic, setOptimistic] = useState<{
    source: CardWithRelations[];
    status: Record<string, string>;
    position: Record<string, number>;
  }>({ source: cards, status: {}, position: {} });
  const fresh = optimistic.source === cards;
  const statusOverrides = fresh ? optimistic.status : {};
  const positionOverrides = fresh ? optimistic.position : {};

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const statusOf = (card: CardWithRelations) => statusOverrides[card.id] ?? card.status?.id ?? "";
  const withPosition = cards.map((c) =>
    c.id in positionOverrides ? { ...c, board_position: positionOverrides[c.id] } : c,
  );
  const sorted = sortCards(withPosition, sortKey, lookups.priorities);
  const columnCards = (statusId: string) => sorted.filter((card) => statusOf(card) === statusId);

  const cardIds = new Set(cards.map((c) => c.id));
  const columnIds = new Set(columns.map((c) => c.id));

  // Prefere o card sob o cursor (para saber antes/depois de quem soltar); senão, a coluna.
  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const all = hits.length > 0 ? hits : rectIntersection(args);
    const cardHit = all.find((h) => cardIds.has(String(h.id)));
    if (cardHit) return [cardHit];
    const columnHit = all.find((h) => columnIds.has(String(h.id)));
    return columnHit ? [columnHit] : all.slice(0, 1);
  };

  // Coloca o card na coluna `targetStatusId`, antes de `beforeCardId` (ou no fim, se null).
  function placeCard(cardId: string, targetStatusId: string, beforeCardId: string | null) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const siblings = columnCards(targetStatusId).filter((c) => c.id !== cardId);
    let index = beforeCardId ? siblings.findIndex((c) => c.id === beforeCardId) : siblings.length;
    if (index < 0) index = siblings.length;

    const sameColumn = statusOf(card) === targetStatusId;
    if (sameColumn && sortKey !== "manual") return; // ordenação automática: reordenar não faz sentido

    // Posição: ponto médio entre os vizinhos. Se algum vizinho ainda não tem posição
    // (nunca foi arrastado), renumera a coluna inteira na ordem atual.
    const prev = siblings[index - 1]?.board_position;
    const next = siblings[index]?.board_position;
    const hasGap = siblings.every((c) => c.board_position != null);
    let updates: { id: string; position: number }[];
    if (hasGap) {
      const position =
        prev != null && next != null ? (prev + next) / 2 : prev != null ? prev + 1000 : next != null ? next - 1000 : 1000;
      updates = [{ id: cardId, position }];
    } else {
      const ordered = [...siblings.slice(0, index), card, ...siblings.slice(index)];
      updates = ordered.map((c, i) => ({ id: c.id, position: (i + 1) * 1000 }));
    }

    if (sameColumn && updates.length === 1 && siblings.length > 0) {
      // Soltou no mesmo lugar: nada a fazer.
      const current = columnCards(targetStatusId);
      const from = current.findIndex((c) => c.id === cardId);
      const to = beforeCardId ? current.findIndex((c) => c.id === beforeCardId) : current.length;
      if (from === to || from === to - 1) return;
    }

    const previous = { status: statusOverrides, position: positionOverrides };
    setOptimistic({
      source: cards,
      status: { ...statusOverrides, [cardId]: targetStatusId },
      position: { ...positionOverrides, ...Object.fromEntries(updates.map((u) => [u.id, u.position])) },
    });

    startTransition(async () => {
      const result = await moveCardToStatus(cardId, targetStatusId, updates);
      if (result.error) {
        toast.error(result.error);
        setOptimistic({ source: cards, status: previous.status, position: previous.position });
        return;
      }
      if (!sameColumn) {
        const target = columns.find((c) => c.id === targetStatusId);
        toast.success(`Movido para ${target?.label ?? "novo status"}`);
      }
      router.refresh();
    });
  }

  // Menu "Mover para": vai para o fim da coluna escolhida.
  function moveCard(cardId: string, statusId: string) {
    placeCard(cardId, statusId, null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    markDragged();
    if (!event.over) return;
    const activeCardId = String(event.active.id);
    const overId = String(event.over.id);
    if (overId === activeCardId) return;

    const overCard = cards.find((c) => c.id === overId);
    if (!overCard) {
      placeCard(activeCardId, overId, null); // soltou na coluna (área vazia): vai para o fim
      return;
    }

    // Soltou sobre outro card: entra antes dele — ou depois, se vem de cima na mesma coluna.
    const targetStatusId = statusOf(overCard);
    const active = cards.find((c) => c.id === activeCardId);
    const column = columnCards(targetStatusId);
    const activeIndex = column.findIndex((c) => c.id === activeCardId);
    const overIndex = column.findIndex((c) => c.id === overId);
    const movingDown = active != null && statusOf(active) === targetStatusId && activeIndex < overIndex;
    const before = movingDown ? (column[overIndex + 1]?.id ?? null) : overId;
    placeCard(activeCardId, targetStatusId, before === activeCardId ? null : before);
  }

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        markDragged();
      }}
    >
      <div className="-mx-4 flex snap-x snap-proximity items-start gap-3 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
        {columns.map((status) => (
          <Column
            key={status.id}
            status={status}
            cards={columnCards(status.id)}
            statuses={columns}
            canEdit={canEdit}
            onMove={moveCard}
            lastDragRef={lastDragRef}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeCard ? <KanbanCardView card={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
