export const categories = [
  "Todas",
  "Tops",
  "Pantalones",
  "Vestidos",
  "Abrigos",
  "Zapatos",
  "Accesorios",
  "Bolsos",
  "Joyería",
  "Otras prendas",
] as const;
export type Category = (typeof categories)[number];
export type Garment = {
  id: string;
  name: string;
  category: Category;
  color: string;
  image?: string;
  path?: string;
  favorite: boolean;
  kind?: string;
  brand?: string;
  warmth?: number;
  formality?: number;
  source?: string;
  cleaned?: boolean;
};
export type Look = {
  id: string;
  name: string;
  ids: string[];
  date?: string;
  image?: string;
  path?: string;
};
export type Profile = {
  name: string;
  style: string;
  face?: string;
  body?: string;
  consent: boolean;
  preferences?: string[];
  onboarded?: boolean;
  faceImage?: string;
  bodyImage?: string;
};
export type Wardrobe = { profile: Profile; garments: Garment[]; looks: Look[] };
export const initial: Wardrobe = {
  profile: { name: "", style: "Casual chic", consent: false },
  garments: [],
  looks: [],
};
export const examples: Garment[] = [
  {
    id: "demo-shirt",
    name: "Camisa de lino",
    category: "Tops",
    color: "Marfil",
    favorite: false,
    kind: "shirt",
  },
  {
    id: "demo-pants",
    name: "Pantalón de pinzas",
    category: "Pantalones",
    color: "Arena",
    favorite: false,
    kind: "pants",
  },
  {
    id: "demo-bag",
    name: "Bolso de todos los días",
    category: "Accesorios",
    color: "Chocolate",
    favorite: false,
    kind: "bag",
  },
  {
    id: "demo-shoes",
    name: "Ballet flats",
    category: "Zapatos",
    color: "Negro",
    favorite: false,
    kind: "shoes",
  },
  {
    id: "demo-dress",
    name: "Vestido de verano",
    category: "Vestidos",
    color: "Salmón",
    favorite: false,
    kind: "dress",
  },
  {
    id: "demo-knit",
    name: "Un toque de azul",
    category: "Tops",
    color: "Azul",
    favorite: false,
    kind: "knit",
  },
];
export function suggest(items: Garment[], offset = 0): Garment[] {
  const pick = (cats: Category[]) => {
    const options = items.filter((g) => cats.includes(g.category));
    return options.length ? options[offset % options.length] : undefined;
  };
  const dress = pick(["Vestidos"]);
  const top = pick(["Tops"]);
  const pants = pick(["Pantalones"]);
  return [
    offset % 2 && dress ? dress : top || dress,
    offset % 2 && dress ? undefined : top ? pants : undefined,
    pick(["Zapatos"]),
    pick(["Accesorios"]),
  ].filter((x): x is Garment => !!x);
}
