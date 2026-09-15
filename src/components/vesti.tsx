"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  House,
  CoatHanger,
  Sparkle,
  Heart,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Camera,
  Check,
  X,
  MagnifyingGlass,
  Shuffle,
  SignOut,
  UserCircle,
  CalendarBlank,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { GarmentArt } from "./garment-art";
import {
  categories,
  examples,
  initial,
  suggest,
  type Category,
  type Garment,
  type Wardrobe,
} from "@/lib/model";
import { configured, supabase } from "@/lib/supabase";
import { loadWardrobe, saveWardrobe, studio, upload } from "@/lib/storage";
type Tab = "Hoy" | "Mi armario" | "Probador" | "Mis looks";
const nav = [
  { name: "Hoy" as Tab, icon: House },
  { name: "Mi armario" as Tab, icon: CoatHanger },
  { name: "Probador" as Tab, icon: Sparkle },
  { name: "Mis looks" as Tab, icon: Heart },
];
export function Vesti() {
  const [state, setState] = useState<Wardrobe>(initial),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState<Tab>("Hoy"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [signin, setSignin] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [category, setCategory] = useState<Category>("Todas"),
    [search, setSearch] = useState(""),
    [selection, setSelection] = useState<string[]>([]),
    [offset, setOffset] = useState(0),
    [modal, setModal] = useState<"upload" | "profile" | null>(null),
    [occasion, setOccasion] = useState("Un día para mí"),
    [lookName, setLookName] = useState(""),
    [date, setDate] = useState(""),
    [result, setResult] = useState<{ image: string; path: string } | null>(
      null,
    ),
    [detected, setDetected] = useState<(Garment & { source: string })[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const operation = useRef(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, preview, signedIn]);
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const user = supabase
          ? (await supabase.auth.getUser()).data.user
          : null;
        if (active) setSignedIn(!!user);
        if (user || !supabase) {
          const data = await loadWardrobe();
          if (active) {
            setState(data);
            setPreview(!supabase && !!data.profile.name);
          }
        }
      } catch {
        if (active)
          setError("No pudimos cargar tu armario. Vuelve a intentar.");
      } finally {
        if (active) setReady(true);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  async function run(label: string, task: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Algo no salió bien. Inténtalo de nuevo.",
      );
    } finally {
      setBusy("");
      operation.current = false;
    }
  }
  async function commit(next: Wardrobe) {
    await saveWardrobe(next);
    setState(next);
  }
  async function auth(event: React.FormEvent) {
    event.preventDefault();
    await run(signin ? "Entrando…" : "Creando tu espacio…", async () => {
      if (!supabase)
        throw Error(
          "La creación de cuentas estará disponible al conectar Supabase. Mientras tanto, explora la vista previa.",
        );
      const response = signin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: name } },
          });
      if (response.error) throw response.error;
      if (!response.data.session) {
        setNotice(
          "Revisa tu correo para confirmar tu cuenta. Después vuelve e inicia sesión.",
        );
        return;
      }
      const data = await loadWardrobe();
      if (!data.profile.name) {
        data.profile.name =
          name || response.data.user?.user_metadata.display_name || "Tú";
        await saveWardrobe(data);
      }
      setState(data);
      setName(data.profile.name);
      setSignedIn(true);
      setModal("profile");
    });
  }
  async function explore() {
    await run("Abriendo tu espacio…", async () => {
      const data = {
        ...initial,
        profile: { ...initial.profile, name: name.trim() || "Tú" },
        garments: examples,
      };
      if (!configured) await saveWardrobe(data);
      setState(data);
      setPreview(true);
    });
  }
  const isDemo = preview && !signedIn;
  const items = state.garments;
  const suggested = suggest(items, offset);
  const chosen = items.filter((g) => selection.includes(g.id));
  const filtered = items.filter(
    (g) =>
      (category === "Todas" || g.category === category) &&
      `${g.name} ${g.color}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function persist(next: Wardrobe) {
    if (isDemo && configured) {
      setState(next);
      return;
    }
    await commit(next);
  }
  async function addLook() {
    if (!chosen.length) return;
    await run("Guardando look…", async () => {
      await persist({
        ...state,
        looks: [
          {
            id: crypto.randomUUID(),
            name: lookName || occasion,
            ids: selection,
            date: date || undefined,
            ...(result || {}),
          },
          ...state.looks,
        ],
      });
      setNotice("Tu look ya está guardado.");
    });
  }
  async function processFiles(files: FileList | null) {
    if (!files) return;
    if (files.length > 10) {
      setError("Añade hasta 10 fotos por lote.");
      return;
    }
    await run("Analizando tus fotos…", async () => {
      if (isDemo) throw Error("Crea tu cuenta para subir fotos.");
      if (!state.profile.consent)
        throw Error("Primero autoriza el procesamiento en Tu perfil.");
      let total = 0;
      for (const file of Array.from(files)) {
        const source = await upload(file);
        const response = await studio({ action: "analyze", path: source });
        const rows = response.garments.map((g: Garment) => ({
          ...g,
          id: crypto.randomUUID(),
          favorite: false,
          source,
        }));
        setDetected((prev) => [...prev, ...rows]);
        total += rows.length;
      }
      setNotice(
        total
          ? `Encontramos ${total} prendas. Revisa los nombres y guarda las que quieras.`
          : "No encontramos prendas visibles. Prueba otra foto con mejor iluminación.",
      );
    });
  }
  async function keep(g: Garment & { source: string }) {
    await run("Preparando tu prenda…", async () => {
      const output = await studio({
        action: "clean",
        path: g.source,
        garment: { name: g.name, category: g.category, color: g.color },
      });
      const garment: Garment = {
        id: g.id,
        name: g.name,
        category: g.category,
        color: g.color,
        favorite: false,
        ...output,
      };
      await persist({ ...state, garments: [garment, ...items] });
      setDetected((prev) => prev.filter((x) => x.id !== g.id));
      setNotice("Prenda guardada en tu armario.");
    });
  }
  if (!ready)
    return (
      <main className="loading">
        <span className="wordmark">
          vesti<span>•</span>
        </span>
        <div className="skeleton" />
        <p>Preparando un espacio para ti…</p>
      </main>
    );
  if (!signedIn && !preview)
    return (
      <main className="welcome">
        <section className="welcome-story">
          <a className="wordmark" href="/">
            vesti<span>•</span>
          </a>
          <div>
            <span className="eyebrow">UN PEQUEÑO UNIVERSO, MUY TUYO</span>
            <h1>
              Tu estilo.
              <br />
              Tus posibilidades.
              <br />
              <span>Todos los días.</span>
            </h1>
            <p>
              Redescubre lo que ya tienes. Combina, imagina
              <br className="desktop" /> y encuentra nuevas formas de ser tú.
            </p>
          </div>
          <div className="welcome-art">
            <div className="art-tile first">
              <GarmentArt garment={examples[0]} />
            </div>
            <div className="art-tile second">
              <GarmentArt garment={examples[1]} />
            </div>
            <span className="art-note">
              Las mejores combinaciones
              <br />
              empiezan contigo.
            </span>
          </div>
          <small>HECHO CON AMOR. PENSADO PARA TI.</small>
        </section>
        <section className="welcome-form">
          <span className="tiny-heart">
            <Heart size={24} />
          </span>
          <span className="eyebrow">BIENVENIDA A VESTI</span>
          <h2>
            {signin
              ? "Qué lindo tenerte de vuelta."
              : "Primero, ¿cómo te llamas?"}
          </h2>
          <p>
            {signin
              ? "Tu armario te está esperando."
              : "Este espacio será tan único como tú."}
          </p>
          <form onSubmit={auth}>
            {!signin && (
              <label>
                Tu nombre
                <input
                  autoComplete="given-name"
                  required
                  maxLength={40}
                  placeholder="Así te llamaremos aquí"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete={signin ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Al menos 8 caracteres"
              />
            </label>
            <button className="primary wide" disabled={!!busy}>
              {busy || (signin ? "Entrar a mi armario" : "Crear mi espacio")}
              <ArrowRight />
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setSignin(!signin);
              setError("");
            }}
          >
            {signin
              ? "Soy nueva aquí · Crear cuenta"
              : "Ya tengo cuenta · Iniciar sesión"}
          </button>
          <div className="preview-entry">
            <button onClick={explore} disabled={!!busy}>
              Explorar una vista previa <ArrowUpRight />
            </button>
            <small>Con prendas ilustradas de ejemplo.</small>
          </div>
          <Status error={error} notice={notice} />
        </section>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="wordmark" onClick={() => setTab("Hoy")}>
          vesti<span>•</span>
        </button>
        <span className="sidebar-caption">TU UNIVERSO DE ESTILO</span>
        <nav aria-label="Navegación principal">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={tab === name ? "active" : ""}
            >
              <Icon size={22} weight={tab === name ? "fill" : "regular"} />
              <span>{name}</span>
              {name === "Probador" && <i>NUEVO</i>}
            </button>
          ))}
        </nav>
        <div className="love-note">
          <Heart size={24} />
          <p>
            Para todas las
            <br />
            versiones de ti.
          </p>
          <small>Un espacio hecho con amor.</small>
        </div>
        <button
          className="profile-button"
          onClick={() => {
            setName(state.profile.name);
            setModal("profile");
          }}
        >
          <span className="avatar">
            {state.profile.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            {state.profile.name}
            <small>Tu espacio personal</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Tu armario, nuevas posibilidades.</span>
          <div>
            {isDemo && <span className="demo-label">VISTA PREVIA</span>}
            <button
              aria-label="Abrir tu perfil"
              className="profile-small"
              onClick={() => {
                setName(state.profile.name);
                setModal("profile");
              }}
            >
              <UserCircle size={23} />
            </button>
            <button
              className="outline small"
              onClick={() => setModal("upload")}
            >
              <Plus size={16} /> Añadir prendas
            </button>
          </div>
        </header>
        <main className="content">
          <Status error={error} notice={notice} />
          {busy && (
            <div className="progress" role="status">
              <div className="skeleton" />
              {busy} Puede tomar unos momentos.
            </div>
          )}
          {tab === "Hoy" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">UN NUEVO DÍA PARA SER TÚ</span>
                  <h1>
                    Hola, {state.profile.name}
                    <span className="hello-star">✳</span>
                  </h1>
                  <p>Tu próximo look favorito ya está en tu armario.</p>
                </div>
                <span className="personal-tag">
                  <Heart size={16} /> Solo para ti
                </span>
              </div>
              <section className="daily-hero">
                <div className="hero-copy">
                  <span className="pill">
                    <Sparkle size={14} /> UN POCO DE INSPIRACIÓN
                  </span>
                  <h2>
                    Eso que tienes.
                    <br />
                    <span>
                      Como nunca{" "}
                      <br />
                      lo habías visto.
                    </span>
                  </h2>
                  <p>
                    Nuevas combinaciones, la misma tú.
                    <br />
                    Dale otra vida a tus prendas favoritas.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setSelection(suggested.map((g) => g.id));
                      setTab("Probador");
                    }}
                  >
                    Encontrar mi look <ArrowUpRight size={18} />
                  </button>
                  <small>
                    {isDemo
                      ? "Composición ilustrada de ejemplo"
                      : "Una selección de tu propio armario"}
                  </small>
                </div>
                <div className="outfit-collage">
                  {(suggested.length ? suggested : examples.slice(0, 4))
                    .slice(0, 4)
                    .map((g, i) => (
                      <div className={`collage-piece piece-${i}`} key={g.id}>
                        <GarmentArt garment={g} />
                      </div>
                    ))}
                  <span className="collage-label">
                    THE EVERYDAY EDIT <span>01 / VESTI</span>
                  </span>
                  <span className="floating-note">
                    muy tú <Heart size={15} />
                  </span>
                </div>
              </section>
              <section className="quick-grid">
                <button onClick={() => setModal("upload")}>
                  <span className="quick-icon mint">
                    <Camera size={24} />
                  </span>
                  <div>
                    <h3>De tu cámara a tu armario</h3>
                    <p>Una foto. Muchas posibilidades.</p>
                  </div>
                  <ArrowUpRight size={22} />
                </button>
                <button onClick={() => setTab("Probador")}>
                  <span className="quick-icon peach">
                    <Sparkle size={24} />
                  </span>
                  <div>
                    <h3>¿Y si te lo pruebas?</h3>
                    <p>Imagina tu próximo look en ti.</p>
                  </div>
                  <ArrowUpRight size={22} />
                </button>
              </section>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">REDESCUBRE TUS FAVORITOS</span>
                  <h2>Dentro de tu armario</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("Mi armario")}
                >
                  Ver todo <ArrowRight />
                </button>
              </div>
              {!items.length ? (
                <Empty
                  title="Tu historia de estilo empieza aquí"
                  text="Añade tu primera prenda para descubrir nuevas combinaciones."
                  action={() => setModal("upload")}
                  label="Añadir mi primera prenda"
                />
              ) : (
                <div className="garment-grid home-grid">
                  {items.slice(0, 4).map((g) => (
                    <GarmentCard
                      key={g.id}
                      garment={g}
                      onSelect={() => {
                        setSelection([g.id]);
                        setTab("Probador");
                      }}
                      onFavorite={() =>
                        void run("Guardando…", () =>
                          persist({
                            ...state,
                            garments: items.map((x) =>
                              x.id === g.id
                                ? { ...x, favorite: !x.favorite }
                                : x,
                            ),
                          }),
                        )
                      }
                    />
                  ))}
                </div>
              )}
              <footer>
                Menos «no sé qué ponerme». Más tú.
                <Heart size={13} />
              </footer>
            </>
          )}
          {tab === "Mi armario" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PRENDAS CON HISTORIAS</span>
                  <h1>Mi armario</h1>
                  <p>{items.length} prendas, muchas formas de combinarlas.</p>
                </div>
                <button className="primary" onClick={() => setModal("upload")}>
                  <Plus /> Añadir prendas
                </button>
              </div>
              <div className="toolbar">
                <div className="filter-tabs">
                  {categories.map((c) => (
                    <button
                      className={category === c ? "selected" : ""}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <MagnifyingGlass />
                  <input
                    aria-label="Buscar prendas"
                    placeholder="Buscar una prenda…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              {filtered.length ? (
                <div className="garment-grid">
                  {filtered.map((g) => (
                    <GarmentCard
                      key={g.id}
                      garment={g}
                      onSelect={() => {
                        setSelection([g.id]);
                        setTab("Probador");
                      }}
                      onFavorite={() =>
                        void run("Guardando…", () =>
                          persist({
                            ...state,
                            garments: items.map((x) =>
                              x.id === g.id
                                ? { ...x, favorite: !x.favorite }
                                : x,
                            ),
                          }),
                        )
                      }
                      onDelete={() =>
                        void run("Quitando prenda…", () =>
                          persist({
                            ...state,
                            garments: items.filter((x) => x.id !== g.id),
                            looks: state.looks.map((l) => ({
                              ...l,
                              ids: l.ids.filter((id) => id !== g.id),
                            })),
                          }),
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  title={
                    search
                      ? "No encontramos esa prenda"
                      : "Un espacio para tus favoritos"
                  }
                  text="Añade fotos de prendas o de tus outfits completos."
                  action={() => setModal("upload")}
                  label="Añadir prendas"
                />
              )}
            </>
          )}
          {tab === "Probador" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">JUEGA. COMBINA. REDESCUBRE.</span>
                  <h1>Tu probador</h1>
                  <p>Elige tus prendas y visualiza la combinación.</p>
                </div>
                <span className="personal-tag">
                  <Sparkle size={16} /> Hecho para ti
                </span>
              </div>
              <div className="studio-layout">
                <section className="studio-board">
                  {result ? (
                    <div className="result-image">
                      <Image
                        src={result.image}
                        alt="Tu visualización del outfit generado"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : chosen.length ? (
                    <div className="chosen-grid">
                      {chosen.map((g) => (
                        <div className="chosen-piece" key={g.id}>
                          <GarmentArt garment={g} />
                          <button
                            aria-label={`Quitar ${g.name}`}
                            onClick={() => {
                              setSelection(
                                selection.filter((id) => id !== g.id),
                              );
                              setResult(null);
                            }}
                          >
                            <X />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="board-empty">
                      <CoatHanger size={58} weight="thin" />
                      <h2>Un lienzo para tu estilo.</h2>
                      <p>Elige las prendas que quieras combinar.</p>
                    </div>
                  )}
                  <div className="board-caption">
                    <span>
                      {result ? "VISUALIZACIÓN CON IA" : "TU COMBINACIÓN"}
                    </span>
                    <span>{chosen.length} prendas</span>
                  </div>
                </section>
                <section className="studio-controls">
                  <h2>¿Qué tienes en mente?</h2>
                  <label>
                    Tu plan
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                    >
                      {[
                        "Un día para mí",
                        "Una cita especial",
                        "Día de oficina",
                        "Escapada de fin de semana",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="outline wide"
                    onClick={() => {
                      setOffset(offset + 1);
                      setSelection(suggest(items, offset + 1).map((x) => x.id));
                      setResult(null);
                    }}
                  >
                    <Shuffle /> Sugerir otra combinación
                  </button>
                  <p className="helper">
                    Las sugerencias combinan tipos de prendas. Tú eliges qué
                    encaja con tu plan.
                  </p>
                  <div className="mini-picker">
                    {items.map((g) => (
                      <button
                        className={selection.includes(g.id) ? "picked" : ""}
                        key={g.id}
                        aria-label={`Seleccionar ${g.name}`}
                        aria-pressed={selection.includes(g.id)}
                        onClick={() => {
                          setSelection(
                            selection.includes(g.id)
                              ? selection.filter((id) => id !== g.id)
                              : [...selection.slice(-5), g.id],
                          );
                          setResult(null);
                        }}
                      >
                        <GarmentArt garment={g} />
                        {selection.includes(g.id) && <Check />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="primary wide"
                    disabled={!!busy || !chosen.length}
                    onClick={() =>
                      void run("Creando tu visualización…", async () => {
                        if (isDemo)
                          throw Error(
                            "El probador con tus fotos se activa al crear tu cuenta y conectar el estudio.",
                          );
                        setResult(
                          await studio({ action: "tryon", ids: selection }),
                        );
                      })
                    }
                  >
                    <Sparkle /> Ver cómo me queda
                  </button>
                  <p className="helper">
                    Una aproximación visual, no una garantía de talla o ajuste.
                    Tus fotos se configuran en Tu perfil.
                  </p>
                  <label>
                    Nombre del look
                    <input
                      value={lookName}
                      onChange={(e) => setLookName(e.target.value)}
                      maxLength={80}
                      placeholder={occasion}
                    />
                  </label>
                  <label>
                    ¿Para qué día? <span>(opcional)</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <button
                    className="outline wide"
                    disabled={!!busy || !chosen.length}
                    onClick={addLook}
                  >
                    <Heart /> Guardar look
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "Mis looks" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">IDEAS QUE MERECEN REPETIRSE</span>
                  <h1>Mis looks</h1>
                  <p>
                    Tus combinaciones favoritas, listas para el próximo plan.
                  </p>
                </div>
              </div>
              {state.looks.length ? (
                <div className="looks-grid">
                  {state.looks.map((l) => (
                    <article className="saved-look" key={l.id}>
                      <button
                        className="saved-preview"
                        onClick={() => {
                          setSelection(l.ids);
                          setLookName(l.name);
                          setDate(l.date || "");
                          setResult(
                            l.image && l.path
                              ? { image: l.image, path: l.path }
                              : null,
                          );
                          setTab("Probador");
                        }}
                      >
                        {l.image ? (
                          <Image
                            src={l.image}
                            alt={l.name}
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        ) : (
                          l.ids
                            .map((id) => items.find((g) => g.id === id))
                            .filter((g): g is Garment => !!g)
                            .map((g) => (
                              <div key={g.id}>
                                <GarmentArt garment={g} />
                              </div>
                            ))
                        )}
                      </button>
                      <div className="saved-info">
                        <h3>{l.name}</h3>
                        <button
                          aria-label={`Eliminar ${l.name}`}
                          onClick={() =>
                            void run("Eliminando look…", () =>
                              persist({
                                ...state,
                                looks: state.looks.filter((x) => x.id !== l.id),
                              }),
                            )
                          }
                        >
                          <Trash />
                        </button>
                      </div>
                      {l.date && (
                        <small>
                          <CalendarBlank />
                          {new Date(l.date + "T12:00:00").toLocaleDateString(
                            "es-CO",
                            { day: "numeric", month: "long" },
                          )}
                        </small>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Aquí vivirán tus looks favoritos"
                  text="Arma una combinación en el probador y guárdala para otro día."
                  action={() => setTab("Probador")}
                  label="Crear mi primer look"
                />
              )}
            </>
          )}
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        <div className="dialog-inner">
          <button
            className="close"
            aria-label="Cerrar"
            onClick={() => setModal(null)}
          >
            <X size={22} />
          </button>
          <Status error={error} notice={notice} />
          {modal === "upload" ? (
            <>
              <span className="eyebrow">HAZLE ESPACIO A LO TUYO</span>
              <h2>Añade tus prendas</h2>
              <p>
                Sube una prenda o un outfit completo. Revisarás cada pieza antes
                de guardarla.
              </p>
              <label className="dropzone">
                <UploadSimple size={34} />
                <strong>{busy || "Elige tus fotos"}</strong>
                <span>Hasta 10 fotos · JPG, PNG o WebP · 8 MB por foto</span>
                <input
                  aria-label="Subir fotos de prendas"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={!!busy}
                  onChange={(e) => void processFiles(e.target.files)}
                />
              </label>
              <p className="helper">
                Una foto bien iluminada ayuda a conservar colores y detalles. La
                limpieza genera una nueva imagen y puede variar ligeramente.
              </p>
              {detected.map((g) => (
                <div className="detected" key={g.id}>
                  <label>
                    Prenda
                    <input
                      value={g.name}
                      onChange={(e) =>
                        setDetected((d) =>
                          d.map((x) =>
                            x.id === g.id ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Categoría
                    <select
                      value={g.category}
                      onChange={(e) =>
                        setDetected((d) =>
                          d.map((x) =>
                            x.id === g.id
                              ? { ...x, category: e.target.value as Category }
                              : x,
                          ),
                        )
                      }
                    >
                      {categories.slice(1).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      className="primary"
                      disabled={!!busy}
                      onClick={() => void keep(g)}
                    >
                      Limpiar y guardar
                    </button>
                    <button
                      className="outline"
                      disabled={!!busy}
                      onClick={() =>
                        setDetected((d) => d.filter((x) => x.id !== g.id))
                      }
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <span className="eyebrow">TAN ÚNICO COMO TÚ</span>
              <h2>Tu perfil</h2>
              <label>
                Tu nombre
                <input
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Tu estilo
                <select
                  value={state.profile.style}
                  onChange={(e) =>
                    setState({
                      ...state,
                      profile: { ...state.profile, style: e.target.value },
                    })
                  }
                >
                  {[
                    "Casual chic",
                    "Minimalista",
                    "Romántico",
                    "Clásico",
                    "Me gusta experimentar",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={state.profile.consent}
                  onChange={(e) =>
                    setState({
                      ...state,
                      profile: { ...state.profile, consent: e.target.checked },
                    })
                  }
                />
                <span>
                  Soy mayor de edad y autorizo que mis fotos se envíen al
                  proveedor de IA para detectar prendas y crear mis
                  visualizaciones. Puedo retirar mi autorización desmarcando
                  esta opción y guardando.
                </span>
              </label>
              <div className="reference-grid">
                {(["face", "body"] as const).map((type) => (
                  <label className="reference" key={type}>
                    <Camera size={25} />
                    <strong>
                      {type === "face" ? "Foto de rostro" : "Foto de cuerpo"}
                    </strong>
                    <span>
                      {state.profile[type]
                        ? "Foto guardada · cambiar"
                        : type === "face"
                          ? "De frente, con luz natural"
                          : "De pie, cuerpo completo"}
                    </span>
                    <input
                      aria-label={
                        type === "face"
                          ? "Subir foto de rostro"
                          : "Subir foto de cuerpo"
                      }
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={!!busy || !state.profile.consent}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void run("Guardando foto privada…", async () => {
                            if (isDemo)
                              throw Error(
                                "Crea tu cuenta para guardar fotos privadas.",
                              );
                            const path = await upload(file);
                            await persist({
                              ...state,
                              profile: { ...state.profile, [type]: path },
                            });
                          });
                      }}
                    />
                  </label>
                ))}
              </div>
              <p className="helper">
                Las fotos son referencias visuales del probador. No se usan para
                identificarte mediante reconocimiento facial.
              </p>
              <button
                className="primary wide"
                disabled={!!busy || !name.trim()}
                onClick={() =>
                  void run("Guardando perfil…", async () => {
                    await persist({
                      ...state,
                      profile: { ...state.profile, name: name.trim() },
                    });
                    setNotice("Tu perfil está guardado.");
                    setModal(null);
                  })
                }
              >
                Guardar mi perfil <Check />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  void run("Cerrando sesión…", async () => {
                    if (supabase) {
                      const { error } = await supabase.auth.signOut();
                      if (error) throw error;
                    }
                    setState(initial);
                    setSignedIn(false);
                    setPreview(false);
                    setModal(null);
                  })
                }
              >
                <SignOut />
                {isDemo ? "Salir de la vista previa" : "Cerrar sesión"}
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
function Status({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="status error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="status success">
          {notice}
        </p>
      )}
    </>
  );
}
function Empty({
  title,
  text,
  label,
  action,
}: {
  title: string;
  text: string;
  label: string;
  action: () => void;
}) {
  return (
    <div className="empty">
      <CoatHanger size={45} weight="thin" />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary" onClick={action}>
        {label}
        <Plus />
      </button>
    </div>
  );
}
function GarmentCard({
  garment: g,
  onSelect,
  onFavorite,
  onDelete,
}: {
  garment: Garment;
  onSelect: () => void;
  onFavorite: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="garment-card">
      <div className="garment-image">
        <button
          className="garment-open"
          onClick={onSelect}
          aria-label={`Combinar ${g.name}`}
        >
          <GarmentArt garment={g} />
        </button>
        <button
          className="favorite"
          aria-label={`${g.favorite ? "Quitar de" : "Añadir a"} favoritos: ${g.name}`}
          aria-pressed={g.favorite}
          onClick={onFavorite}
        >
          <Heart weight={g.favorite ? "fill" : "regular"} />
        </button>
        {onDelete && (
          <button
            className="delete-garment"
            aria-label={`Eliminar ${g.name}`}
            onClick={onDelete}
          >
            <Trash />
          </button>
        )}
      </div>
      <span className="garment-category">{g.category}</span>
      <h3>{g.name}</h3>
      <small>{g.color}</small>
    </article>
  );
}
