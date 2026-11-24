// Tipos compartilhados do assistente — sem imports de servidor: o componente de
// cliente também usa.

export type AssistantTask = {
  id: string;
  number: number;
  title: string;
  typeKey: string;
  typeLabel: string;
  statusKey: string;
  statusLabel: string;
  priorityKey: string | null;
  priorityLabel: string | null;
  priorityColor: string | null;
  // Posição da prioridade na ordem configurada (maior = mais importante).
  priorityRank: number;
  // Prazo do card, ou data da reunião quando o card é uma reunião.
  dueDate: string | null;
  dueTime: string | null;
  isMeeting: boolean;
  checklist: { done: number; total: number; daily: boolean } | null;
  mine: boolean;
  responsaveis: string[];
};

export type AssistantContext = {
  today: string;
  userFirstName: string | null;
  tasks: AssistantTask[];
};

export type AssistantCardRef = {
  id: string;
  number: number;
  title: string;
  priorityLabel: string | null;
  priorityColor: string | null;
  note: string;
};

// Rascunho de card montado a partir do chat. Só vira card quando a pessoa confirma.
export type AssistantDraft = {
  title: string;
  cardTypeId: string;
  statusId: string;
  priorityId: string;
  prazoData: string | null;
  prazoHora: string | null;
  responsavelId: string | null;
  responsavelName: string | null;
  options: {
    types: { id: string; label: string }[];
    priorities: { id: string; label: string }[];
  };
};

export type AssistantReply = {
  reply: string;
  cards: AssistantCardRef[];
  draft?: AssistantDraft;
  // Perguntas prontas, mostradas como botões clicáveis embaixo da resposta.
  suggestions?: string[];
};

export type AssistantChatMessage = { role: "user" | "assistant"; content: string };
