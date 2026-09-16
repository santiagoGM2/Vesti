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
  const items = [...state.garments, ...state.looks];
  const paths = [
    ...new Set([
      ...items.flatMap((item) => (item.path ? [item.path] : [])),
      ...[state.profile.face, state.profile.body].filter(
        (p): p is string => !!p,
      ),
    ]),
  ];
  if (paths.length) {
    const { data, error } = await supabase.storage
      .from("vesti-private")
      .createSignedUrls(paths, 3600);
    if (error) throw error;
    if (data.some((entry) => entry.error))
      throw Error(
        "No pudimos abrir algunas fotos de tu armario. Intenta cargarlo de nuevo.",
      );
    const urls = new Map(data.map((entry) => [entry.path, entry.signedUrl]));
    state.profile.faceImage = urls.get(state.profile.face || "") ?? undefined;
    state.profile.bodyImage = urls.get(state.profile.body || "") ?? undefined;
    for (const item of items) {
      if (item.path) item.image = urls.get(item.path) ?? undefined;
    }
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
    profile: { ...state.profile, faceImage: undefined, bodyImage: undefined },
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
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const path = `${user.id}/upload-${hash}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage
    .from("vesti-private")
    .upload(path, file);
  if (error) {
    // Repeated photographs share one private object. Only accept a duplicate
    // when the authenticated owner can actually read the existing object.
    const existing = await supabase.storage
      .from("vesti-private")
      .download(path);
    if (existing.error) throw error;
  }
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
