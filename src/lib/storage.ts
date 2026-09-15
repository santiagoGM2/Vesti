import { supabase } from "./supabase";
import { initial, type Wardrobe } from "./model";
export async function loadWardrobe(): Promise<Wardrobe> {
  if (!supabase)
    return JSON.parse(
      localStorage.getItem("vesti-preview") || JSON.stringify(initial),
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return structuredClone(initial);
  const { data, error } = await supabase
    .from("wardrobes")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  const state: Wardrobe = data?.data || structuredClone(initial);
  for (const item of [...state.garments, ...state.looks])
    if (item.path) {
      const { data, error } = await supabase.storage
        .from("vesti-private")
        .createSignedUrl(item.path, 3600);
      if (error) throw error;
      item.image = data.signedUrl;
    }
  return state;
}
export async function saveWardrobe(state: Wardrobe) {
  if (!supabase) {
    localStorage.setItem("vesti-preview", JSON.stringify(state));
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Error("Inicia sesión para guardar tu armario.");
  const data = {
    ...state,
    garments: state.garments.map((g) => ({
      ...g,
      image: g.path ? undefined : g.image,
    })),
    looks: state.looks.map((g) => ({
      ...g,
      image: g.path ? undefined : g.image,
    })),
  };
  const { error } = await supabase
    .from("wardrobes")
    .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function upload(file: File) {
  if (!supabase)
    throw Error(
      "Conecta tu cuenta para subir fotos privadas. Puedes explorar con las prendas de ejemplo.",
    );
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw Error("Usa JPG, PNG o WebP de hasta 8 MB.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Error("Inicia sesión para subir fotos.");
  const path = `${user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage
    .from("vesti-private")
    .upload(path, file);
  if (error) throw error;
  return path;
}
export async function studio(payload: Record<string, unknown>) {
  const session = supabase
    ? (await supabase.auth.getSession()).data.session
    : null;
  const response = await fetch("/api/studio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error || "No pudimos completar la solicitud.");
  return data;
}
