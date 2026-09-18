import { type Garment, type Profile, type Category } from "./model";
import { compatible } from "./look-selection";

export const occasions = [
  { name: "Universidad", formality: 1, description: "Cómodo, juvenil y práctico para estudiar" },
  { name: "Reunión de equipo", formality: 2, description: "Profesional y pulido para destacar" },
  { name: "Salida de noche", formality: 2, description: "Estiloso y con personalidad para salir" },
  { name: "Día para ti", formality: 0, description: "Relajado, fresco y 100% auténtico" },
  { name: "Día cálido", formality: 1, targetWarmth: 0, description: "Prendas frescas y ligeras bajo el sol" },
  { name: "Día lluvioso", formality: 1, targetWarmth: 3, description: "Capas abrigadas y protección para la lluvia" },
  { name: "Cita especial", formality: 2, description: "Romántico y especial para San Valentín" },
];

// Bounded ranking over the owner's inventory: no model requests or invented items.
export function recommend(
  items: Garment[],
  profile: Profile,
  occasion: number,
  temperature?: number,
  variant = 0,
): Garment[] {
  const currentOccasion = occasions[occasion % occasions.length];
  const target = currentOccasion.formality;
  const warmth =
    temperature !== undefined
      ? (temperature >= 26 ? 0 : temperature >= 18 ? 1 : temperature >= 10 ? 2 : 3)
      : (currentOccasion.targetWarmth ?? 1);
  const pick = (categories: Category[]) =>
    items
      .filter((g) => categories.includes(g.category))
      .map((g) => ({
        g,
        score:
          -Math.abs((g.formality ?? 1) - target) * 3 -
          Math.abs((g.warmth ?? 1) - warmth) * 2 +
          (g.favorite ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.g.id.localeCompare(b.g.id));
  const choose = (cats: Category[]) => {
    const options = pick(cats);
    return options.length
      ? options[variant % Math.min(3, options.length)].g
      : undefined;
  };
  const dress = choose(["Vestidos"]);
  const top = choose(["Tops"]);
  const pants = choose(["Pantalones"]);
  const feminine = profile.preferences?.includes("Femenina") ?? true;
  const useDress =
    dress && (!top || !pants || (feminine && (occasion + variant) % 2 === 1));
  return [
    useDress ? dress : top,
    useDress ? undefined : pants,
    choose(["Zapatos"]),
    warmth >= 2 ? choose(["Abrigos"]) : undefined,
    choose(["Bolsos", "Accesorios"]),
    choose(["Joyería"]),
  ].filter((g): g is Garment => !!g).reduce<Garment[]>((chosen, garment) => {
    if (chosen.every(other => compatible(other, garment))) chosen.push(garment);
    return chosen;
  }, []);
}

export const weatherPresets = [
  { label: "Cálido", temp: 26, icon: "☀️", desc: "Día soleado y ligero" },
  { label: "Templado", temp: 20, icon: "⛅", desc: "Clima equilibrado" },
  { label: "Lluvioso", temp: 14, icon: "🌧️", desc: "Fresco y con lluvia" },
  { label: "Frío", temp: 8, icon: "❄️", desc: "Capas para el frío" },
] as const;

export function getStylistAdvice(
  outfit: Garment[],
  occasion: (typeof occasions)[number],
  temperature?: number,
): string {
  if (!outfit.length) return "Añade prendas a tu armario para crear combinaciones únicas.";

  const mainPiece = outfit.find((g) => g.category === "Vestidos" || g.category === "Tops") || outfit[0];
  const secondPiece = outfit.find((g) => g.category === "Pantalones" || g.category === "Abrigos");
  const colors = [...new Set(outfit.map((g) => g.color.toLowerCase()))].slice(0, 2).join(" y ");

  switch (occasion.name) {
    case "Cita especial":
      return `Look romántico y cautivador para San Valentín. La armonía en tonos ${colors} realza tu silueta de forma delicada y sofisticada.`;
    case "Universidad":
      return `Estilo desenfadado y práctico. La combinación con ${mainPiece.name.toLowerCase()} ofrece comodidad absoluta para todo el día.`;
    case "Reunión de equipo":
      return `Presencia impecable y moderna. La estructura de ${secondPiece ? secondPiece.name.toLowerCase() : "este conjunto"} proyecta seguridad y profesionalismo.`;
    case "Día cálido":
      return `Frescura y ligereza total. Ideal para disfrutar bajo el sol con telas transpirables y caída relajada.`;
    case "Día lluvioso":
      return `Capas inteligentes contra el clima húmedo. Te mantiene cálida y protegida sin sacrificar elegancia.`;
    case "Salida de noche":
      return `Impacto visual con vibra nocturna. La combinación en tonos ${colors} destaca con la iluminación de la noche.`;
    case "Día para ti":
    default:
      return `Estilo auténtico y sin esfuerzo. Un conjunto equilibrado que prioriza tu comodidad con un toque chic.`;
  }
}
