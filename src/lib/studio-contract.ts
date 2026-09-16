import { z } from "zod";
export const garmentSchema = z.object({
  onPerson: z.boolean().default(true),
  name: z.string().min(1).max(100),
  category: z.enum([
    "Tops",
    "Pantalones",
    "Vestidos",
    "Abrigos",
    "Zapatos",
    "Accesorios",
    "Bolsos",
    "Joyería",
    "Otras prendas",
  ]),
  color: z.string().max(50),
  brand: z.string().max(80).optional(),
  warmth: z.number().int().min(0).max(3).optional(),
  formality: z.number().int().min(0).max(3).optional(),
  bounds: z
    .tuple([
      z.number().min(0).max(1),
      z.number().min(0).max(1),
      z.number().min(0).max(1),
      z.number().min(0).max(1),
    ])
    .optional(),
});
export const analysisSchema = z.object({
  garments: z.array(garmentSchema).max(30),
});
export const studioSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("analyze"), path: z.string().max(200) }),
  z.object({
    action: z.literal("extract"),
    path: z.string().max(200),
    garments: z.array(garmentSchema).min(1).max(30),
  }),
  z.object({
    action: z.literal("clean"),
    path: z.string().max(200),
    garment: garmentSchema,
  }),
  z.object({
    action: z.literal("tryon"),
    useFace: z.boolean().default(false),
    seed: z.number().int().min(0).max(4294967295).default(42),
    ids: z
      .array(z.string().max(100))
      .min(1)
      .max(6)
      .refine((ids) => new Set(ids).size === ids.length, "No repitas prendas."),
  }),
]);
export class StudioError extends Error {
  constructor(
    message: string,
    public status = 502,
    public retrySafe = false,
  ) {
    super(message);
  }
}
export const VISION_MODEL = "claude-haiku-4-5-20251001";
export const FASHN_OPTIONS = {
  resolution: "1k",
  generation_mode: "fast",
  num_images: 1,
  output_format: "png",
  return_base64: true,
} as const;
