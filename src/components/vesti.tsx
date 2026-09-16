"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  House,
  TShirt,
  UserCircle,
  Plus,
  X,
  Heart,
  ArrowLeft,
  ArrowRight,
  MagnifyingGlass,
  Check,
  Sparkle,
  MapPin,
  CalendarBlank,
  PencilSimple,
  SignOut,
  CoatHanger,
  Camera,
  LockSimple,
  Envelope,
  ArrowClockwise,
  Trash,
  CheckCircle,
} from "@phosphor-icons/react";
import { GarmentArt } from "./garment-art";
import { Brand as Logo } from "./brand";
import {
  categories,
  initial,
  examples,
  type Garment,
  type Wardrobe,
  type Profile,
} from "@/lib/model";
import { recommend, occasions } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";
import { loadWardrobe, saveWardrobe, upload, studio } from "@/lib/storage";
type Screen = "Inicio" | "Clóset" | "Perfil";
type Draft = Garment & { source: string };
function Collage({ items }: { items: Garment[] }) {
  return (
    <div className={`collage count-${items.length}`}>
      {items.map((g) => (
        <div className="collage-piece" key={g.id}>
          <GarmentArt garment={g} />
        </div>
      ))}
    </div>
  );
}
export function Vesti() {
  const [wardrobe, setWardrobe] = useState<Wardrobe>(() =>
    structuredClone(initial),
  );
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [ready, setReady] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [demo, setDemo] = useState(false);
  const [screen, setScreen] = useState<Screen>("Inicio"),
    [authMode, setAuthMode] = useState<"welcome" | "email">("welcome");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [signin, setSignin] = useState(false);
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [sheet, setSheet] = useState<
      "upload" | "editor" | "profile" | "garment" | null
    >(null),
    [drafts, setDrafts] = useState<Draft[]>([]);
  const [queue, setQueue] = useState<{ name: string; status: string }[]>([]),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("Todas"),
    [favorites, setFavorites] = useState(false);
  const [selected, setSelected] = useState<string[]>([]),
    [lookTitle, setLookTitle] = useState(""),
    [lookDate, setLookDate] = useState("");
  const [result, setResult] = useState<{ image: string; path: string } | null>(
      null,
    ),
    [showAvatar, setShowAvatar] = useState(true),
    [variant, setVariant] = useState(0);
  const [useFace, setUseFace] = useState(false),
    [seed, setSeed] = useState(42);
  const [weather, setWeather] = useState<{
    temperature: number;
    description: string;
  } | null>(null);
  const [photoState, setPhotoState] = useState<
    Record<"face" | "body", "idle" | "checking" | "ready" | "error">
  >({ face: "idle", body: "idle" });
  const [faceFocus, setFaceFocus] = useState("50% 32%");
  const dialog = useRef<HTMLDialogElement>(null),
    mutex = useRef(false),
    latest = useRef(wardrobe);
  const profile = wardrobe.profile,
    items = wardrobe.garments,
    chosen = items.filter((g) => selected.includes(g.id));
  const onboarding = (signedIn || demo) && !profile.onboarded;
  const dateLabel = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const user = supabase
          ? (await supabase.auth.getUser()).data.user
          : null;
        if (user) {
          const data = await loadWardrobe();
          if (active) {
            latest.current = data;
            setWardrobe(data);
            setName(
              data.profile.name ||
                user.user_metadata.display_name ||
                user.user_metadata.full_name ||
                "",
            );
            setSignedIn(true);
          }
        }
        if (
          new URLSearchParams(window.location.hash.slice(1)).get(
            "error_description",
          ) &&
          active
        )
          setError(
            "No se pudo completar el acceso. Intenta de nuevo con tu correo.",
          );
      } catch {
        if (active)
          setError(
            "No pudimos abrir tu espacio. Recarga para volver a intentar.",
          );
      } finally {
        if (active) setReady(true);
      }
    }
    void load();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN")
        setTimeout(() => {
          if (active) void load();
        }, 0);
      if (event === "SIGNED_OUT" && active) {
        setSignedIn(false);
        setDemo(false);
        setWardrobe(structuredClone(initial));
      }
    });
    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen, step, signedIn]);
  useEffect(() => {
    if (sheet) dialog.current?.showModal();
    else dialog.current?.close();
  }, [sheet]);
  async function run(label: string, work: () => Promise<void>) {
    if (mutex.current) return;
    mutex.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Algo salió mal. Vuelve a intentar.",
      );
    } finally {
      mutex.current = false;
      setBusy("");
    }
  }
  async function persist(next: Wardrobe) {
    if (!demo) await saveWardrobe(next);
    latest.current = next;
    setWardrobe(next);
  }
  async function updateProfile(patch: Partial<Profile>) {
    await persist({
      ...latest.current,
      profile: { ...latest.current.profile, ...patch },
    });
  }
  function preview() {
    const data = { ...structuredClone(initial), garments: examples };
    latest.current = data;
    setWardrobe(data);
    setDemo(true);
    setStep(0);
    setName("");
  }
  async function auth(e: React.FormEvent) {
    e.preventDefault();
    await run("Abriendo tu espacio…", async () => {
      if (!supabase)
        throw Error(
          "El acceso no está configurado en este despliegue. Revisa Supabase en Vercel.",
        );
      const response = signin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: name.trim() },
              emailRedirectTo: window.location.origin,
            },
          });
      if (response.error) throw response.error;
      if (!response.data.session) {
        setNotice(
          "Revisa tu correo y confirma tu cuenta. Después inicia sesión aquí.",
        );
        return;
      }
      const data = await loadWardrobe();
      if (!data.profile.name) data.profile.name = name.trim();
      await saveWardrobe(data);
      latest.current = data;
      setWardrobe(data);
      setSignedIn(true);
      setStep(0);
    });
  }
  async function google() {
    await run("Conectando con Google…", async () => {
      if (!supabase) throw Error("El acceso aún no está configurado.");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          },
        },
      );
      if (!response.ok)
        throw Error("No pudimos comprobar el acceso. Intenta con correo.");
      if (!(await response.json()).external?.google)
        throw Error(
          "Google todavía no está habilitado. Puedes crear tu cuenta con correo mientras se conecta.",
        );
      const auth = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (auth.error) throw auth.error;
    });
  }
  async function photo(file: File | undefined, kind: "face" | "body") {
    if (!file) return;
    setPhotoState((current) => ({ ...current, [kind]: "checking" }));
    await run(
      kind === "face" ? "Comprobando tu rostro…" : "Comprobando tu foto…",
      async () => {
        try {
          if (demo)
            throw Error(
              "Las fotos personales se guardan al crear una cuenta. Puedes omitir este paso en la vista previa.",
            );
          if (file.size > 8 * 1024 * 1024)
            throw Error("La foto debe pesar menos de 8 MB.");

          const bitmap = await createImageBitmap(file);
          if (bitmap.width < 320 || bitmap.height < 320) {
            bitmap.close();
            throw Error("Elige una foto más nítida, de al menos 320 × 320 px.");
          }

          if (kind === "face" && "FaceDetector" in window) {
            const FaceDetectorApi = (
              window as typeof window & {
                FaceDetector: new (options?: {
                  fastMode?: boolean;
                  maxDetectedFaces?: number;
                }) => {
                  detect: (image: ImageBitmap) => Promise<
                    { boundingBox: DOMRectReadOnly }[]
                  >;
                };
              }
            ).FaceDetector;
            const faces = await new FaceDetectorApi({
              fastMode: true,
              maxDetectedFaces: 1,
            }).detect(bitmap);
            if (!faces.length) {
              bitmap.close();
              throw Error(
                "No encontramos un rostro claro. Prueba con una foto frontal y bien iluminada.",
              );
            }
            const box = faces[0].boundingBox;
            setFaceFocus(
              `${((box.x + box.width / 2) / bitmap.width) * 100}% ${((box.y + box.height / 2) / bitmap.height) * 100}%`,
            );
          }
          bitmap.close();

          const path = await upload(file);
          const signed = await supabase!.storage
            .from("vesti-private")
            .createSignedUrl(path, 3600);
          if (signed.error) throw signed.error;
          await updateProfile({
            [kind]: path,
            [`${kind}Image`]: signed.data.signedUrl,
          });
          setPhotoState((current) => ({ ...current, [kind]: "ready" }));
          setNotice(
            kind === "face"
              ? "Rostro recibido y encuadrado."
              : "Foto de cuerpo completo recibida.",
          );
        } catch (cause) {
          setPhotoState((current) => ({ ...current, [kind]: "error" }));
          throw cause;
        }
      },
    );
  }
  async function locate() {
    await run("Consultando el clima…", async () => {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation
            ? navigator.geolocation.getCurrentPosition(
                resolve,
                () =>
                  reject(
                    Error(
                      "No pudimos obtener tu ubicación. Puedes seguir sin el clima.",
                    ),
                  ),
                { timeout: 12000, maximumAge: 3600000 },
              )
            : reject(
                Error("Este navegador no permite consultar la ubicación."),
              ),
      );
      const lat = position.coords.latitude.toFixed(2),
        lon = position.coords.longitude.toFixed(2),
        key = `vesti-weather-${lat}-${lon}`;
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const value = JSON.parse(cached);
        if (Date.now() - value.at < 3600000) {
          setWeather(value.weather);
          return;
        }
      }
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
        { signal: AbortSignal.timeout(12000) },
      );
      if (!response.ok) throw Error("El clima no está disponible ahora.");
      const data = await response.json();
      const next = {
        temperature: Math.round(data.current.temperature_2m),
        description:
          data.current.weather_code <= 1
            ? "Despejado"
            : data.current.weather_code <= 3
              ? "Nublado"
              : data.current.weather_code >= 51
                ? "Lluvia o nieve"
                : "Niebla",
      };
      setWeather(next);
      sessionStorage.setItem(
        key,
        JSON.stringify({ at: Date.now(), weather: next }),
      );
    });
  }
  function edit(ids: string[], title: string) {
    setSelected(ids);
    setLookTitle(title);
    setResult(null);
    setLookDate("");
    setShowAvatar(true);
    setSeed(42);
    setUseFace(false);
    setSheet("editor");
  }
  async function processPhotos(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    if (!list.length) return;
    if (list.length > 10) {
      setError("Añade hasta 10 fotos por lote.");
      return;
    }
    await run("Analizando tus prendas…", async () => {
      if (demo) throw Error("Crea una cuenta para analizar tus fotos.");
      if (!profile.consent)
        throw Error(
          "Autoriza el análisis de imágenes en tu perfil antes de subir prendas.",
        );
      setQueue(list.map((f) => ({ name: f.name, status: "Esperando" })));
      let detectedTotal = 0;
      let failedTotal = 0;
      for (let i = 0; i < list.length; i++) {
        setQueue((q) =>
          q.map((row, n) =>
            n === i ? { ...row, status: "Analizando…" } : row,
          ),
        );
        try {
          const source = await upload(list[i]);
          const response = await studio({ action: "analyze", path: source });
          detectedTotal += response.garments.length;
          setDrafts((d) => [
            ...d,
            ...response.garments.map((g: Garment) => ({
              ...g,
              source,
              id: crypto.randomUUID(),
              favorite: false,
            })),
          ]);
          setQueue((q) =>
            q.map((row, n) =>
              n === i
                ? {
                    ...row,
                    status: `${response.garments.length} piezas detectadas`,
                  }
                : row,
            ),
          );
        } catch (e) {
          failedTotal += 1;
          setQueue((q) =>
            q.map((row, n) =>
              n === i
                ? {
                    ...row,
                    status: "No se completó; selecciona esta foto de nuevo",
                  }
                : row,
            ),
          );
        }
      }
      setNotice(
        failedTotal
          ? `${detectedTotal} prendas listas. ${failedTotal} ${failedTotal === 1 ? "foto necesita" : "fotos necesitan"} otro intento.`
          : `${detectedTotal} prendas detectadas. Revisa sus datos antes de guardarlas.`,
      );
    });
  }
  function draftChange(id: string, patch: Partial<Draft>) {
    setDrafts((rows) =>
      rows.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  }
  async function saveDrafts(rows: Draft[]) {
    await run("Guardando en tu clóset…", async () => {
      const current = latest.current;
      const added = rows.filter(
        (g) =>
          !current.garments.some(
            (old) => old.path === g.path && old.name === g.name,
          ),
      );
      await persist({ ...current, garments: [...added, ...current.garments] });
      setDrafts((d) => d.filter((g) => !rows.some((row) => row.id === g.id)));
      setNotice(`${added.length} piezas guardadas.`);
    });
  }
  async function clean(g: Draft) {
    await run(`Mejorando ${g.name}…`, async () => {
      const response = await studio({
        action: "clean",
        path: g.path || g.source,
        garment: g,
      });
      draftChange(g.id, { ...response, cleaned: true });
      setNotice(`${g.name} ya tiene acabado de estudio.`);
    });
  }
  async function cleanAll() {
    const pending = drafts.filter((g) => !g.cleaned);
    if (!pending.length) return;
    await run(`Creando ${pending.length} fotos de estudio…`, async () => {
      let completed = 0;
      let failed = 0;
      for (const garment of pending) {
        setBusy(`Embelleciendo ${completed + failed + 1} de ${pending.length}…`);
        try {
          const response = await studio({
            action: "clean",
            path: garment.path || garment.source,
            garment,
          });
          setDrafts((rows) =>
            rows.map((row) =>
              row.id === garment.id
                ? { ...row, ...response, cleaned: true }
                : row,
            ),
          );
          completed += 1;
        } catch {
          failed += 1;
        }
      }
      if (!completed)
        throw Error(
          "No pudimos crear las fotos de estudio. Tu saldo no se volverá a usar al recuperar solicitudes pendientes.",
        );
      setNotice(
        failed
          ? `${completed} fotos de estudio listas; ${failed} necesitan otro intento.`
          : `${completed} fotos de estudio listas para guardar.`,
      );
    });
  }
  async function generate() {
    await run("Creando tu avatar. Guardamos cada paso…", async () => {
      if (demo)
        throw Error(
          "Crea una cuenta y añade tus fotos para probarte este look.",
        );
      setResult(
        await studio({ action: "tryon", ids: selected, useFace, seed }),
      );
      setShowAvatar(true);
    });
  }
  async function saveLook() {
    await run("Guardando tu look…", async () => {
      await persist({
        ...latest.current,
        looks: [
          {
            id: crypto.randomUUID(),
            name: lookTitle.trim() || "Mi look",
            ids: selected,
            date: lookDate || undefined,
            ...result,
          },
          ...latest.current.looks,
        ],
      });
      setSheet(null);
      setScreen("Perfil");
      setNotice("Tu look está guardado.");
    });
  }
  const feedback = (
    <>
      {error && (
        <div role="alert" className="feedback error">
          {error}
          <button aria-label="Cerrar aviso" onClick={() => setError("")}>
            <X />
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="feedback">
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            <X />
          </button>
        </div>
      )}
      {busy && (
        <div role="status" className="working">
          <span className="spinner" />
          {busy}
        </div>
      )}
    </>
  );
  const photoFields = (
    <>
      <div className="photo-grid">
        {(["face", "body"] as const).map((kind) => {
          const image = profile[kind === "face" ? "faceImage" : "bodyImage"];
          const stored = profile[kind];
          const state = photoState[kind];
          const complete = state === "ready" || (!!stored && state === "idle");
          return (
          <label className={`photo-field ${complete ? "is-ready" : ""}`} key={kind}>
            <span>{kind === "face" ? "ROSTRO" : "CUERPO"}</span>
            <div className={kind === "face" ? "face-frame" : "body-frame"}>
              {image ? (
                <Image
                  src={image}
                  alt={
                    kind === "face"
                      ? "Tu foto de rostro"
                      : "Tu foto de cuerpo entero"
                  }
                  fill
                  unoptimized
                  sizes="240px"
                  style={kind === "face" ? { objectPosition: faceFocus } : undefined}
                />
              ) : (
                <div className="photo-empty">
                  {state === "checking" ? <span className="spinner dark" /> : <Plus size={30} />}
                  <strong>{kind === "face" ? "Rostro" : "Cuerpo"}</strong>
                  <small aria-live="polite">
                    {state === "checking"
                      ? "Comprobando…"
                      : state === "error"
                        ? "Toca para intentarlo otra vez"
                        : kind === "face"
                          ? "Foto frontal"
                          : "De cabeza a pies"}
                  </small>
                </div>
              )}
              {image && (
                <span className="photo-confirmation" role="status">
                  <CheckCircle weight="fill" />
                  {kind === "face" ? "Rostro listo" : "Cuerpo listo"}
                </span>
              )}
              {image && (
                <small className="photo-change">
                    {kind === "face"
                      ? "Cambiar rostro"
                      : "Cambiar foto"}
                </small>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!!busy}
                onChange={(e) => void photo(e.target.files?.[0], kind)}
                aria-label={kind === "face" ? "Elegir foto de rostro" : "Elegir foto de cuerpo entero"}
              />
            </div>
          </label>
        )})}
      </div>
      <p className="photo-hint">
        Rostro completo, de frente y con buena luz. Para el cuerpo, incluye la
        cabeza y los pies, sin ocultar la silueta.
      </p>
      <p className="privacy">
        <LockSimple size={18} />
        Fotos en tu espacio privado. Puedes cambiarlas cuando quieras.
      </p>
    </>
  );
  if (!ready)
    return (
      <main className="splash">
        <Logo large />
      </main>
    );
  if (!signedIn && !demo)
    return (
      <main className="auth-page">
        {feedback}
        <div className="auth-brand">
          <Logo large />
        </div>
        <section className="auth-actions">
          {authMode === "welcome" ? (
            <>
              <button
                className="secondary wide"
                onClick={() => void google()}
                disabled={!!busy}
              >
                <Image
                  src="/google-g.png"
                  alt=""
                  width={22}
                  height={22}
                  className="google-g"
                  priority
                />
                Continuar con Google
              </button>
              <button
                className="secondary wide"
                onClick={() => setAuthMode("email")}
              >
                <Envelope size={23} />
                Continuar con correo
              </button>
              <button className="text-button" onClick={preview}>
                Explorar una vista previa
              </button>
            </>
          ) : (
            <form onSubmit={auth}>
              <button
                type="button"
                className="icon-button"
                aria-label="Volver"
                onClick={() => setAuthMode("welcome")}
              >
                <ArrowLeft />
              </button>
              <h1>{signin ? "Qué bueno verte" : "Tu espacio empieza aquí"}</h1>
              {!signin && (
                <label>
                  ¿Cómo te llamas?
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={60}
                    autoComplete="given-name"
                    placeholder="Tu nombre"
                  />
                </label>
              )}
              <label>
                Correo electrónico
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tucorreo@gmail.com"
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={signin ? "current-password" : "new-password"}
                  placeholder="Al menos 8 caracteres"
                />
              </label>
              <button className="primary wide" disabled={!!busy}>
                {signin ? "Entrar" : "Crear mi cuenta"}
                <ArrowRight />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setSignin(!signin)}
              >
                {signin ? "Crear una cuenta" : "Ya tengo cuenta"}
              </button>
            </form>
          )}
        </section>
      </main>
    );
  if (onboarding)
    return (
      <main className="onboarding">
        {feedback}
        <header>
          <button
            className="icon-button"
            aria-label="Volver"
            onClick={() =>
              step
                ? setStep(step - 1)
                : demo
                  ? setDemo(false)
                  : void run("Saliendo…", async () => {
                      await supabase?.auth.signOut();
                    })
            }
          >
            <ArrowLeft />
          </button>
          <span>{step + 1} / 4</span>
          {step >= 2 && (
            <button
              className="text-button"
              onClick={() =>
                void run("Guardando…", () => updateProfile({ onboarded: true }))
              }
            >
              Omitir
            </button>
          )}
        </header>
        <section className="onboarding-content">
          {step === 0 ? (
            <>
              <div className="round-icon">
                <UserCircle size={30} />
              </div>
              <h1>
                Empecemos
                <br />
                por <em>ti.</em>
              </h1>
              <p>¿Cómo quieres que te llamemos?</p>
              <label className="name-field">
                Tu nombre
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Escribe tu nombre"
                  autoComplete="given-name"
                />
              </label>
            </>
          ) : step === 1 ? (
            <>
              <div className="round-icon">
                <TShirt size={30} />
              </div>
              <h1>
                ¿Qué
                <br />
                <em>usas?</em>
              </h1>
              <p>
                Puedes elegir ambas opciones.
                <br />
                Tu estilo no necesita etiquetas.
              </p>
              <div className="preference-grid">
                {["Femenina", "Masculina"].map((value) => (
                  <button
                    key={value}
                    aria-pressed={!!profile.preferences?.includes(value)}
                    onClick={() =>
                      void run("Guardando estilo…", () =>
                        updateProfile({
                          preferences: profile.preferences?.includes(value)
                            ? profile.preferences.filter((v) => v !== value)
                            : [...(profile.preferences || []), value],
                        }),
                      )
                    }
                  >
                    <span className="selection-circle">
                      {profile.preferences?.includes(value) && <Check />}
                    </span>
                    Ropa {value.toLowerCase()}
                  </button>
                ))}
              </div>
            </>
          ) : step === 2 ? (
            <>
              <h1>
                Crea tu <em>avatar</em>
              </h1>
              <p>Descubre cómo se verían tus combinaciones en ti.</p>
              <div className="avatar-intro">
                <div className="avatar-outfit">
                  <GarmentArt garment={examples[0]} />
                </div>
                <div className="avatar-person">
                  <UserCircle size={120} weight="thin" />
                  <span>
                    Tu estilo.
                    <br />
                    Tu versión.
                  </span>
                </div>
                <div className="avatar-outfit">
                  <GarmentArt garment={examples[4]} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="round-icon">
                <Camera size={30} />
              </div>
              <h1>
                Añade tus <em>fotos</em>
              </h1>
              <p>
                Una de tu rostro y otra de cuerpo entero para tu probador
                personal.
              </p>
              {photoFields}
            </>
          )}
        </section>
        <footer>
          {step === 3 && (
            <label className="consent">
              <input
                type="checkbox"
                checked={profile.consent}
                onChange={(e) =>
                  void run("Guardando permiso…", () =>
                    updateProfile({ consent: e.target.checked }),
                  )
                }
              />
              Autorizo enviar mis fotos a los proveedores de IA para analizar
              prendas y generar mis pruebas virtuales.
            </label>
          )}
          <button
            className="primary wide"
            disabled={
              !!busy ||
              (step === 0 && !name.trim()) ||
              (step === 1 && !profile.preferences?.length) ||
              (step === 3 &&
                (!profile.face || !profile.body || !profile.consent))
            }
            onClick={() =>
              void run("Guardando…", async () => {
                if (step === 0) await updateProfile({ name: name.trim() });
                if (step === 3) await updateProfile({ onboarded: true });
                else setStep(step + 1);
              })
            }
          >
            Continuar
            <ArrowRight />
          </button>
        </footer>
      </main>
    );
  return (
    <div className="app-shell">
      {!sheet && feedback}
      <header className="app-header">
        <button
          className="icon-button"
          aria-label="Ver mis looks guardados"
          onClick={() => setScreen("Perfil")}
        >
          <CalendarBlank size={25} />
        </button>
        <Logo />
        <button
          className="icon-button"
          aria-label="Editar perfil"
          onClick={() => setSheet("profile")}
        >
          <UserCircle size={27} />
        </button>
      </header>
      {demo && (
        <div className="demo-banner">
          Vista previa · prendas de ejemplo
          <button
            onClick={() => {
              setDemo(false);
              setAuthMode("email");
            }}
          >
            Crear cuenta
            <ArrowRight />
          </button>
        </div>
      )}
      <main className="app-content">
        {screen === "Inicio" && (
          <>
            <section className="greeting">
              <div>
                <p className="eyebrow">{dateLabel}</p>
                <h1>
                  {items.length ? "Hola" : "Te damos la bienvenida"},{" "}
                  {profile.name || "tú"}.
                </h1>
              </div>
              <button
                className="weather"
                disabled={!!busy}
                onClick={() => void locate()}
              >
                {weather ? (
                  <>
                    <span>{weather.temperature}°</span>
                    <small>{weather.description}</small>
                  </>
                ) : (
                  <>
                    <MapPin size={21} />
                    <small>Ver clima local</small>
                  </>
                )}
              </button>
            </section>
            {!items.length ? (
              <section className="empty-home">
                <h2>Empieza con una sola prenda.</h2>
                <p>
                  Una foto de tu ropa o de tu outfit.
                  <br />
                  Cada pieza encuentra su lugar en tu clóset.
                </p>
                <div className="first-garment">
                  <GarmentArt garment={examples[0]} />
                  <span>
                    <Sparkle />
                    Tu próxima combinación empieza aquí
                  </span>
                </div>
                <button
                  className="primary wide"
                  onClick={() => setSheet("upload")}
                >
                  <Plus />
                  Agregar prendas
                </button>
              </section>
            ) : (
              <>
                <div className="home-prompt">
                  <Sparkle size={21} />
                  <span>¿Qué te vas a poner hoy?</span>
                  <button
                    className="icon-button dark"
                    aria-label="Crear mi combinación"
                    onClick={() => edit([], "Mi combinación")}
                  >
                    <ArrowRight />
                  </button>
                </div>
                <div className="looks-feed">
                  {occasions.map((occasion, i) => {
                    const outfit = recommend(
                      items,
                      profile,
                      i,
                      weather?.temperature,
                      variant,
                    );
                    return (
                      <article className="outfit-card" key={occasion.name}>
                        <header>
                          <h2>{occasion.name}</h2>
                          <span>
                            {i === 1
                              ? "Un poco más formal"
                              : i === 2
                                ? "A tu manera"
                                : "Cómodo y tuyo"}
                          </span>
                        </header>
                        <Collage items={outfit} />
                        <footer>
                          <button
                            className="icon-button"
                            aria-label={`Guardar look ${occasion.name}`}
                            onClick={() =>
                              edit(
                                outfit.map((g) => g.id),
                                occasion.name,
                              )
                            }
                          >
                            <Heart size={25} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Editar ${occasion.name}`}
                            onClick={() =>
                              edit(
                                outfit.map((g) => g.id),
                                occasion.name,
                              )
                            }
                          >
                            <PencilSimple size={24} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Otra combinación"
                            onClick={() => setVariant((v) => v + 1)}
                          >
                            <ArrowClockwise size={23} />
                          </button>
                          <button
                            className="primary"
                            onClick={() =>
                              edit(
                                outfit.map((g) => g.id),
                                occasion.name,
                              )
                            }
                          >
                            Crear avatar
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
                <p className="small-note">
                  Ideas con las prendas de tu clóset
                  {weather ? " y el clima local" : ""}.{" "}
                  <a
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Clima: Open-Meteo
                  </a>
                </p>
              </>
            )}
          </>
        )}
        {screen === "Clóset" && (
          <>
            <div className="section-heading">
              <h1>Clóset</h1>
              <button
                className="text-button"
                onClick={() => edit([], "Mi combinación")}
              >
                Crear look
                <ArrowRight />
              </button>
            </div>
            <div className="closet-toolbar">
              <span>{items.length} artículos</span>
              <button
                className={`icon-button ${favorites ? "selected" : ""}`}
                aria-label="Mostrar favoritos"
                aria-pressed={favorites}
                onClick={() => setFavorites(!favorites)}
              >
                <Heart weight={favorites ? "fill" : "regular"} />
              </button>
            </div>
            <label className="search">
              <MagnifyingGlass />
              <input
                aria-label="Buscar prendas"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por prenda, color o marca"
              />
            </label>
            <div className="category-strip">
              {categories.map((c) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {items.length ? (
              <div className="closet-grid">
                {items
                  .filter(
                    (g) =>
                      (category === "Todas" || g.category === category) &&
                      (!favorites || g.favorite) &&
                      `${g.name} ${g.color} ${g.brand || ""}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((g) => (
                    <article key={g.id}>
                      <button
                        className="garment-tile"
                        aria-label={`Combinar ${g.name}`}
                        onClick={() => edit([g.id], g.name)}
                      >
                        <GarmentArt garment={g} />
                        {g.cleaned && (
                          <span className="studio-mark">
                            <Sparkle weight="fill" />
                            Estudio
                          </span>
                        )}
                      </button>
                      <div className="garment-caption">
                        <h3>{g.name}</h3>
                        <button
                          aria-label={`${g.favorite ? "Quitar de" : "Añadir a"} favoritos: ${g.name}`}
                          className="favorite"
                          onClick={() =>
                            void run("Guardando…", () =>
                              persist({
                                ...latest.current,
                                garments: latest.current.garments.map((x) =>
                                  x.id === g.id
                                    ? { ...x, favorite: !x.favorite }
                                    : x,
                                ),
                              }),
                            )
                          }
                        >
                          <Heart weight={g.favorite ? "fill" : "regular"} />
                        </button>
                        <p>{g.brand || g.category}</p>
                        <button
                          className="edit-garment"
                          aria-label={`Editar prenda ${g.name}`}
                          onClick={() => {
                            setEditingGarment({ ...g });
                            setSheet("garment");
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <section className="empty-state">
                <CoatHanger size={110} weight="thin" />
                <h2>Un clóset lleno de posibilidades.</h2>
                <p>Añade tus prendas favoritas para empezar.</p>
                <button
                  className="primary wide"
                  onClick={() => setSheet("upload")}
                >
                  <Plus />
                  Agregar al clóset
                </button>
              </section>
            )}
          </>
        )}
        {screen === "Perfil" && (
          <>
            <section className="profile-summary">
              <div className="profile-picture">
                {profile.faceImage ? (
                  <Image
                    src={profile.faceImage}
                    alt="Tu rostro"
                    fill
                    unoptimized
                    sizes="90px"
                  />
                ) : (
                  <UserCircle size={90} weight="thin" />
                )}
              </div>
              <div>
                <h1>{profile.name}</h1>
                <p>
                  {profile.preferences
                    ?.map((s) => s.toLowerCase())
                    .join(" · ") || "Tu estilo, tus reglas"}
                </p>
              </div>
            </section>
            <div className="profile-stats">
              <div>
                <strong>{wardrobe.looks.length}</strong>looks
              </div>
              <div>
                <strong>{wardrobe.looks.filter((l) => l.path).length}</strong>
                avatares
              </div>
              <div>
                <strong>{items.length}</strong>artículos
              </div>
            </div>
            <button
              className="secondary wide"
              onClick={() => setSheet("profile")}
            >
              Editar perfil
              <PencilSimple />
            </button>
            {!profile.body && (
              <button
                className="profile-reminder"
                onClick={() => setSheet("profile")}
              >
                <div>
                  <strong>Tu avatar te está esperando</strong>
                  <p>Añade tus fotos para probarte un look.</p>
                </div>
                <ArrowRight />
              </button>
            )}
            <div className="section-heading">
              <h2>Tus looks</h2>
              <button
                className="icon-button"
                aria-label="Crear look"
                onClick={() => edit([], "Mi look")}
              >
                <Plus />
              </button>
            </div>
            {wardrobe.looks.length ? (
              <div className="saved-grid">
                {wardrobe.looks.map((look) => (
                  <article key={look.id}>
                    <button
                      className="saved-look"
                      onClick={() => {
                        edit(look.ids, look.name);
                        setLookDate(look.date || "");
                        setResult(
                          look.path && look.image
                            ? { path: look.path, image: look.image }
                            : null,
                        );
                      }}
                    >
                      {look.image ? (
                        <Image
                          src={look.image}
                          alt={look.name}
                          fill
                          unoptimized
                          sizes="300px"
                        />
                      ) : (
                        <Collage
                          items={items.filter((g) => look.ids.includes(g.id))}
                        />
                      )}
                    </button>
                    <h3>{look.name}</h3>
                    <p>
                      {look.date
                        ? new Date(`${look.date}T12:00:00`).toLocaleDateString(
                            "es",
                            { day: "numeric", month: "long" },
                          )
                        : "Cuando te apetezca"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <section className="empty-state">
                <CoatHanger size={90} weight="thin" />
                <h2>Tu historia de estilo empieza aquí.</h2>
                <p>Guarda las combinaciones que quieras volver a usar.</p>
                <button
                  className="primary"
                  onClick={() => edit([], "Mi primer look")}
                >
                  Crear mi primer look
                </button>
              </section>
            )}
            <button
              className="text-button signout"
              onClick={() =>
                void run("Cerrando sesión…", async () => {
                  if (demo) setDemo(false);
                  else {
                    const response = await supabase?.auth.signOut();
                    if (response?.error) throw response.error;
                  }
                  setSignedIn(false);
                  setScreen("Inicio");
                })
              }
            >
              <SignOut />
              Cerrar sesión
            </button>
          </>
        )}
      </main>
      <div className="bottom-bar">
        <nav aria-label="Navegación principal">
          {(
            [
              { name: "Inicio", icon: House },
              { name: "Clóset", icon: TShirt },
              { name: "Perfil", icon: UserCircle },
            ] as const
          ).map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-current={screen === name ? "page" : undefined}
              onClick={() => setScreen(name)}
            >
              <Icon size={26} weight={screen === name ? "fill" : "regular"} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <button
          className="add-floating"
          aria-label="Agregar prendas"
          onClick={() => setSheet("upload")}
        >
          <Plus size={29} />
        </button>
      </div>
      <dialog
        ref={dialog}
        className={`sheet ${sheet === "profile" || sheet === "garment" ? "light-sheet" : ""}`}
        aria-labelledby="sheet-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setSheet(null);
        }}
        onClose={() => setSheet(null)}
      >
        <header className="sheet-header">
          <button
            className="icon-button"
            aria-label="Cerrar"
            disabled={!!busy}
            onClick={() => setSheet(null)}
          >
            <X size={24} />
          </button>
          <h2 id="sheet-title">
            {sheet === "upload"
              ? "Agregar al clóset"
              : sheet === "editor"
                ? "Tu look"
                : sheet === "garment"
                  ? "Tu prenda"
                  : "Tu perfil"}
          </h2>
          {sheet === "upload" ? (
            <button
              className="pill-light"
              disabled={
                !drafts.length || !!busy || drafts.some((g) => !g.name.trim())
              }
              onClick={() => void saveDrafts(drafts)}
            >
              <Check />
              Agregar {drafts.length || ""}
            </button>
          ) : sheet === "editor" ? (
            <button
              className="pill-light"
              disabled={!chosen.length || !!busy}
              onClick={() => void saveLook()}
            >
              <Check />
              Guardar
            </button>
          ) : null}
        </header>
        {sheet && <div className="sheet-feedback">{feedback}</div>}
        {sheet === "garment" && editingGarment && (
          <div className="sheet-body profile-form">
            <div className="garment-detail-image">
              <GarmentArt garment={editingGarment} />
            </div>
            <label>
              Nombre de la prenda
              <input
                maxLength={100}
                value={editingGarment.name}
                onChange={(e) =>
                  setEditingGarment({ ...editingGarment, name: e.target.value })
                }
              />
            </label>
            <label>
              Marca
              <input
                maxLength={80}
                value={editingGarment.brand || ""}
                placeholder="Ingresar marca"
                onChange={(e) =>
                  setEditingGarment({
                    ...editingGarment,
                    brand: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Categoría
              <select
                value={editingGarment.category}
                onChange={(e) =>
                  setEditingGarment({
                    ...editingGarment,
                    category: e.target.value as Garment["category"],
                  })
                }
              >
                {categories
                  .filter((c) => c !== "Todas")
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
            </label>
            <label>
              Color
              <input
                maxLength={50}
                value={editingGarment.color}
                onChange={(e) =>
                  setEditingGarment({
                    ...editingGarment,
                    color: e.target.value,
                  })
                }
              />
            </label>
            <button
              className="primary wide"
              disabled={!!busy || !editingGarment.name.trim()}
              onClick={() =>
                void run("Guardando prenda…", async () => {
                  await persist({
                    ...latest.current,
                    garments: latest.current.garments.map((g) =>
                      g.id === editingGarment.id ? editingGarment : g,
                    ),
                  });
                  setSheet(null);
                })
              }
            >
              Guardar cambios
            </button>
            {editingGarment.path && !editingGarment.cleaned && (
              <button
                className="secondary wide"
                disabled={!!busy}
                onClick={() =>
                  void run("Mejorando tu prenda…", async () => {
                    if (demo)
                      throw Error("Crea una cuenta para mejorar fotos.");
                    const response = await studio({
                      action: "clean",
                      path: editingGarment.path,
                      garment: editingGarment,
                    });
                    const next = {
                      ...editingGarment,
                      ...response,
                      cleaned: true,
                    };
                    await persist({
                      ...latest.current,
                      garments: latest.current.garments.map((g) =>
                        g.id === next.id ? next : g,
                      ),
                    });
                    setEditingGarment(next);
                  })
                }
              >
                <Sparkle />
                Foto de estudio · gratis
              </button>
            )}
          </div>
        )}
        {sheet === "upload" && (
          <div className="sheet-body">
            <label className="upload-zone">
              <Camera size={30} />
              <strong>Selecciona una o varias fotos</strong>
              <span>
                Ropa u outfits completos · hasta 10 fotos · desglosamos cada
                prenda visible
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={!!busy}
                onChange={(e) => {
                  void processPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="sheet-note">
              Primero separamos cada prenda. Después puedes convertir las que
              quieras en fotos de estudio: fondo blanco, encuadre limpio y
              arrugas suavizadas, conservando color, corte y detalles.
            </p>
            {queue.map((q, i) => (
              <div className="queue-row" key={`${q.name}-${i}`}>
                <span>{q.name}</span>
                <small>{q.status}</small>
              </div>
            ))}
            {!!drafts.filter((g) => !g.cleaned).length && (
              <section className="studio-batch" aria-label="Acabado de estudio">
                <div>
                  <Sparkle weight="fill" />
                  <span>
                    <strong>Embellecer todas</strong>
                    Fondo blanco y acabado de catálogo
                  </span>
                </div>
                <button
                  disabled={!!busy}
                  onClick={() => void cleanAll()}
                >
                  Preparar {drafts.filter((g) => !g.cleaned).length} · gratis
                </button>
              </section>
            )}
            {drafts.map((g) => (
              <article className="draft" key={g.id}>
                <div className="draft-title">
                  <input
                    aria-label="Nombre de la prenda"
                    maxLength={100}
                    value={g.name}
                    onChange={(e) =>
                      draftChange(g.id, { name: e.target.value })
                    }
                  />
                  <button
                    className="icon-button"
                    aria-label={`Descartar ${g.name}`}
                    disabled={!!busy}
                    onClick={() =>
                      setDrafts((d) => d.filter((x) => x.id !== g.id))
                    }
                  >
                    <Trash />
                  </button>
                </div>
                <div className="draft-row">
                  <div className="draft-image">
                    <GarmentArt garment={g} />
                  </div>
                  <div className="draft-fields">
                    <input
                      aria-label={`Marca de ${g.name}`}
                      maxLength={80}
                      placeholder="Ingresar marca"
                      value={g.brand || ""}
                      onChange={(e) =>
                        draftChange(g.id, { brand: e.target.value })
                      }
                    />
                    <select
                      aria-label={`Categoría de ${g.name}`}
                      value={g.category}
                      onChange={(e) =>
                        draftChange(g.id, {
                          category: e.target.value as Garment["category"],
                        })
                      }
                    >
                      {categories
                        .filter((c) => c !== "Todas")
                        .map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                    </select>
                    <div className="draft-actions">
                      <button
                        disabled={!!busy || g.cleaned}
                        onClick={() => void clean(g)}
                      >
                        <Sparkle />
                        {g.cleaned ? "Lista" : "Preparar · gratis"}
                      </button>
                      <button
                        disabled={!!busy || !g.name.trim()}
                        onClick={() => void saveDrafts([g])}
                      >
                        <Check />
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {sheet === "editor" && (
          <div className="editor">
            <input
              className="look-title"
              aria-label="Título del look"
              value={lookTitle}
              maxLength={100}
              onChange={(e) => setLookTitle(e.target.value)}
              placeholder="Agregar título…"
            />
            <div className="editor-canvas">
              {result && showAvatar ? (
                <Image
                  src={result.image}
                  alt={`Prueba virtual: ${lookTitle}`}
                  fill
                  unoptimized
                  sizes="600px"
                />
              ) : chosen.length ? (
                <Collage items={chosen} />
              ) : (
                <div className="canvas-empty">
                  <TShirt size={65} weight="thin" />
                  <p>Elige las piezas de tu look abajo.</p>
                </div>
              )}
            </div>
            <div className="editor-tools">
              <div className="view-toggle">
                <button
                  className={showAvatar ? "active" : ""}
                  aria-label="Ver avatar"
                  disabled={!result}
                  onClick={() => setShowAvatar(true)}
                >
                  <UserCircle size={23} />
                </button>
                <button
                  className={!showAvatar ? "active" : ""}
                  aria-label="Ver prendas"
                  onClick={() => setShowAvatar(false)}
                >
                  <TShirt size={23} />
                </button>
              </div>
              <button
                className="primary"
                disabled={!chosen.length || !!busy || !!result}
                onClick={() => void generate()}
              >
                {result ? "Avatar listo" : "Crear avatar"}
              </button>
            </div>
            <p className="editor-cost">
              {result
                ? "Esta imagen queda guardada con tu look."
                : "1 crédito FASHN por look completo. Las fotos de estudio se preparan gratis y se reutilizan."}
            </p>
            <p className="editor-cost">
              El probador conserva el rostro de tu foto de cuerpo entero. El
              resultado es una simulación visual.
            </p>
            <p className="editor-cost face-note">
              Tu cuerpo y rostro se conservan en la misma foto base. El resultado
              siempre se presenta sobre fondo blanco.
            </p>
            {result && (
              <button
                className="text-button regenerate"
                onClick={() => {
                  setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);
                  setResult(null);
                  setNotice(
                    "Nueva versión preparada. Pulsa Crear avatar para generar con el coste indicado.",
                  );
                }}
              >
                Preparar otra versión
              </button>
            )}
            <div className="editor-picker">
              {items.map((g) => (
                <button
                  className={selected.includes(g.id) ? "selected" : ""}
                  key={g.id}
                  aria-label={`Seleccionar ${g.name}`}
                  aria-pressed={selected.includes(g.id)}
                  disabled={!!busy}
                  onClick={() => {
                    if (selected.length >= 6 && !selected.includes(g.id)) {
                      setError("Puedes combinar hasta 6 piezas por look.");
                      return;
                    }
                    setSelected((s) =>
                      s.includes(g.id)
                        ? s.filter((id) => id !== g.id)
                        : [...s, g.id],
                    );
                    setResult(null);
                  }}
                >
                  <div>
                    <GarmentArt garment={g} />
                    {selected.includes(g.id) && (
                      <span>
                        <Check />
                      </span>
                    )}
                  </div>
                  <small>{g.name}</small>
                </button>
              ))}
            </div>
            <label className="calendar-field">
              <CalendarBlank />
              Usarlo el
              <input
                type="date"
                value={lookDate}
                onChange={(e) => setLookDate(e.target.value)}
              />
            </label>
          </div>
        )}
        {sheet === "profile" && (
          <div className="sheet-body profile-form">
            <label>
              Tu nombre
              <input
                value={profile.name}
                maxLength={60}
                onChange={(e) => {
                  const data = {
                    ...latest.current,
                    profile: {
                      ...latest.current.profile,
                      name: e.target.value,
                    },
                  };
                  latest.current = data;
                  setWardrobe(data);
                }}
              />
            </label>
            <label>
              Tu estilo
              <input
                value={profile.style}
                maxLength={100}
                onChange={(e) => {
                  const data = {
                    ...latest.current,
                    profile: {
                      ...latest.current.profile,
                      style: e.target.value,
                    },
                  };
                  latest.current = data;
                  setWardrobe(data);
                }}
              />
            </label>
            {photoFields}
            <label className="consent">
              <input
                type="checkbox"
                checked={profile.consent}
                onChange={(e) => {
                  const data = {
                    ...latest.current,
                    profile: {
                      ...latest.current.profile,
                      consent: e.target.checked,
                    },
                  };
                  latest.current = data;
                  setWardrobe(data);
                }}
              />
              Autorizo el procesamiento de mis fotos por los proveedores de IA
              para estas funciones.
            </label>
            <button
              className="primary wide"
              disabled={!!busy || !profile.name.trim()}
              onClick={() =>
                void run("Guardando perfil…", async () => {
                  await persist(latest.current);
                  setSheet(null);
                  setNotice("Perfil actualizado.");
                })
              }
            >
              Guardar cambios
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
