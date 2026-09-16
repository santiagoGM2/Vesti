import { type Garment, type Profile, type Category } from "./model";
import { compatible } from "./look-selection";

export const occasions = [
  { name: "Universidad", formality: 1 },
  { name: "Reunión de equipo", formality: 2 },
  { name: "Salida de noche", formality: 2 },
  { name: "Un día para ti", formality: 0 },
];

// Bounded ranking over the owner's inventory: no model requests or invented items.
export function recommend(
  items: Garment[],
  profile: Profile,
  occasion: number,
  temperature?: number,
  variant = 0,
): Garment[] {
  const target = occasions[occasion % occasions.length].formality;
  const warmth =
    temperature === undefined
      ? 1
      : temperature >= 26
        ? 0
        : temperature >= 18
          ? 1
          : temperature >= 10
            ? 2
            : 3;
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
