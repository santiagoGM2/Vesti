import type { Garment } from './model';

export function slot(g: Pick<Garment, 'name' | 'category'>): string {
  const name = g.name.toLowerCase();
  for (const [key, pattern] of Object.entries({
    head: /gorra|sombrero|gorro|boina/,
    belt: /cintur[oó]n|correa/,
    glasses: /gafas|lentes/,
    watch: /reloj/,
    socks: /calcet|media[s]?\b/,
    tie: /corbata|corbat[ií]n/,
    bracelet: /pulsera|manilla|brazalete/,
    necklace: /collar|cadena/,
    earrings: /arete|pendiente/,
  })) if (pattern.test(name)) return key;
  return g.category;
}

export function compatible(a: Pick<Garment, 'name' | 'category'>, b: Pick<Garment, 'name' | 'category'>) {
  if (slot(a) === slot(b)) return false;
  return !((a.category === 'Vestidos' && ['Tops', 'Pantalones'].includes(b.category)) ||
    (b.category === 'Vestidos' && ['Tops', 'Pantalones'].includes(a.category)));
}

export function selectPiece(ids: string[], garment: Garment, garments: Garment[]) {
  if (ids.includes(garment.id)) return ids.filter(id => id !== garment.id);
  return [...ids.filter(id => {
    const old = garments.find(g => g.id === id);
    return old && compatible(old, garment);
  }), garment.id];
}
