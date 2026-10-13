// Catálogo de permissões — seguro para importar no client (nada de server aqui).
// Para criar uma permissão nova: adicione a chave abaixo, use `requirePermission`/
// `assertPermission` (lib/auth/session.ts) onde ela vale e ela já aparece no painel /admin.

export const SUPER_ADMIN_EMAIL = "gug4marques@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined) {
  return !!email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export type PermissionKey =
  | "dashboard"
  | "export"
  | "cards"
  | "cards_edit"
  | "cards_delete"
  | "reunioes"
  | "financeiro"
  | "financeiro_edit"
  | "configuracoes";

export type PermissionDef = {
  key: PermissionKey;
  label: string;
  description: string;
};

export type PermissionGroup = {
  label: string;
  permissions: PermissionDef[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Dashboard",
    permissions: [
      { key: "dashboard", label: "Ver dashboard", description: "Métricas, ranking e gráficos da página inicial." },
      { key: "export", label: "Exportar planilha", description: "Baixar o relatório .xlsx do dashboard." },
    ],
  },
  {
    label: "Cards",
    permissions: [
      { key: "cards", label: "Ver cards", description: "Acessar a lista de cards e abrir os detalhes." },
      { key: "cards_edit", label: "Criar e editar cards", description: "Criar, editar e duplicar cards (inclui reuniões)." },
      { key: "cards_delete", label: "Excluir cards", description: "Excluir cards, individualmente ou em massa." },
    ],
  },
  {
    label: "Reuniões",
    permissions: [{ key: "reunioes", label: "Ver reuniões", description: "Acessar a aba Reuniões." }],
  },
  {
    label: "Financeiro",
    permissions: [
      { key: "financeiro", label: "Ver financeiro", description: "Acessar a aba Financeiro e os valores." },
      { key: "financeiro_edit", label: "Editar financeiro", description: "Lançar gastos/receitas e alterar metas." },
    ],
  },
  {
    label: "Configurações",
    permissions: [
      {
        key: "configuracoes",
        label: "Editar configurações",
        description: "Tipos de card, status, prioridades, modelos e tags.",
      },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

// Chave ausente = liberado, para que quem já existia (ou for criado sem mexer nas
// caixinhas) continue com o acesso que sempre teve.
export function resolvePermissions(raw: unknown): Record<PermissionKey, boolean> {
  const stored = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, stored[key] !== false])) as Record<
    PermissionKey,
    boolean
  >;
}

// Só guarda o que foi bloqueado: o JSON no banco fica pequeno e novas permissões
// adicionadas no futuro nascem liberadas.
export function serializePermissions(map: Record<PermissionKey, boolean>): Record<string, false> {
  const out: Record<string, false> = {};
  for (const key of ALL_PERMISSION_KEYS) {
    if (map[key] === false) out[key] = false;
  }
  return out;
}

export type Access = {
  userId: string;
  email: string;
  isAdmin: boolean;
  permissions: Record<PermissionKey, boolean>;
};

export function can(access: Pick<Access, "isAdmin" | "permissions">, key: PermissionKey) {
  return access.isAdmin || access.permissions[key] === true;
}

// Permissão necessária para ver um card conforme o tipo (financeiro/reunião têm abas próprias).
export function canViewCardOfType(access: Pick<Access, "isAdmin" | "permissions">, typeKey: string | null | undefined) {
  if (can(access, "cards")) return true;
  if (typeKey === "financeiro") return can(access, "financeiro");
  if (typeKey === "reuniao") return can(access, "reunioes");
  return false;
}
