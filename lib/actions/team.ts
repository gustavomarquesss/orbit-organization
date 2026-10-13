"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// Edição do próprio perfil (nome + foto). A permissão é sempre restrita a auth.uid() —
// mesmo usando a service role key (que ignora RLS), ninguém pode editar o
// perfil de outra pessoa por essa action. Gestão de outros usuários fica em lib/actions/admin.ts.
export async function updateMyProfile(formData: FormData): Promise<{ error?: string; avatarUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const fullName = (formData.get("full_name") as string | null)?.trim();
  if (!fullName) return { error: "Informe seu nome." };

  const admin = getAdminClient();
  const update: { full_name: string; avatar_url?: string } = { full_name: fullName };

  const file = formData.get("avatar") as File | null;
  if (file && file.size > 0) {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return { error: "Formato de imagem não suportado. Use JPG, PNG ou WEBP." };
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return { error: "Imagem muito grande (máximo 2MB)." };
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from("avatars").upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadError) return { error: "Não foi possível enviar a imagem." };

    update.avatar_url = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await admin.from("team_members").update(update).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar o perfil." };

  revalidatePath("/perfil");
  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/admin");
  return { avatarUrl: update.avatar_url };
}
