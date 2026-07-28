"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamMemberAvatar } from "@/components/team/team-member-avatar";
import { updateMyProfile } from "@/lib/actions/team";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function EditProfileDialog({
  fullName,
  avatarUrl,
  avatarColor,
}: {
  fullName: string;
  avatarUrl: string | null;
  avatarColor: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(fullName);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(fullName);
      setFile(null);
      setPreviewUrl(null);
      setError(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Formato não suportado. Use JPG, PNG ou WEBP.");
      return;
    }
    if (selected.size > MAX_AVATAR_BYTES) {
      setError("Imagem muito grande (máximo 2MB).");
      return;
    }

    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("full_name", name.trim());
    if (file) formData.set("avatar", file);

    const result = await updateMyProfile(formData);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Editar perfil"
      >
        <Pencil className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative"
                aria-label="Trocar foto"
              >
                <TeamMemberAvatar
                  name={name || fullName}
                  avatarUrl={previewUrl ?? avatarUrl}
                  avatarColor={avatarColor}
                  size="lg"
                  className="size-20"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Trocar
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome</Label>
              <Input id="full_name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
