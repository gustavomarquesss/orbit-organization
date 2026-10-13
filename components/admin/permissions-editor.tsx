"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ALL_PERMISSION_KEYS, PERMISSION_GROUPS, type PermissionKey } from "@/lib/auth/permissions";

type PermissionValues = Record<PermissionKey, boolean>;

export function allPermissions(value: boolean): PermissionValues {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, value])) as PermissionValues;
}

export function PermissionsEditor({
  value,
  onChange,
  disabled,
}: {
  value: PermissionValues;
  onChange: (next: PermissionValues) => void;
  disabled?: boolean;
}) {
  function toggle(key: PermissionKey, checked: boolean) {
    const next = { ...value, [key]: checked };
    // Editar/excluir sem poder ver não faz sentido: ligar uma ação liga a visualização
    // correspondente, desligar a visualização desliga as ações.
    if (checked) {
      if (key === "cards_edit" || key === "cards_delete") next.cards = true;
      if (key === "financeiro_edit") next.financeiro = true;
    } else {
      if (key === "cards") next.cards_edit = next.cards_delete = false;
      if (key === "financeiro") next.financeiro_edit = false;
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="xs" disabled={disabled} onClick={() => onChange(allPermissions(true))}>
          Liberar tudo
        </Button>
        <Button type="button" variant="outline" size="xs" disabled={disabled} onClick={() => onChange(allPermissions(false))}>
          Bloquear tudo
        </Button>
      </div>
      <div className="space-y-3">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
            {group.permissions.map((permission) => (
              <div key={permission.key} className="flex items-start gap-2.5">
                <Checkbox
                  id={`perm-${permission.key}`}
                  className="mt-0.5"
                  checked={value[permission.key]}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggle(permission.key, checked === true)}
                />
                <Label htmlFor={`perm-${permission.key}`} className="flex-col items-start gap-0.5 leading-snug">
                  <span>{permission.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{permission.description}</span>
                </Label>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
