import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";
import {
  studioSchema,
  StudioError,
  VISION_MODEL,
  analysisSchema,
} from "@/lib/studio-contract";
import {
  analyzeWithClaude,
  pollFashn,
  submitFashn,
} from "@/lib/studio-providers";
import { cacheKey, requestCache } from "@/lib/studio-cache";
import { cropRectangle } from "@/lib/crop";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const deadline = Date.now() + 235000;
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      throw new StudioError("Inicia sesión para usar el estudio.", 401);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key)
      throw new StudioError("Falta conectar Supabase en Vercel.", 503);
    const db = createClient(url, key, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error,
    } = await db.auth.getUser(authorization.slice(7));
    if (error || !user)
      throw new StudioError("Tu sesión expiró. Vuelve a entrar.", 401);
    const allowed = (process.env.VESTI_ALLOWED_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase());
    if (!user.email || !allowed.includes(user.email.toLowerCase()))
      throw new StudioError(
        "Esta cuenta todavía no tiene habilitado el estudio.",
        403,
      );
    const raw = await request.text();
    if (raw.length > 16000)
      throw new StudioError("Solicitud demasiado grande.", 413);
    const body = studioSchema.parse(JSON.parse(raw));
    const providerKey =
      body.action === "analyze"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.FASHN_API_KEY;
    if (!providerKey)
      throw new StudioError(
        `Falta configurar ${body.action === "analyze" ? "ANTHROPIC_API_KEY" : "FASHN_API_KEY"} en Vercel.`,
        503,
      );
    const { data: record, error: stateError } = await db
      .from("wardrobes")
      .select("data")
      .eq("user_id", user.id)
      .single();
    if (stateError || !record?.data?.profile?.consent)
      throw new StudioError(
        "Autoriza el procesamiento de fotos en Tu perfil y guarda el cambio.",
        403,
      );
    const cached = requestCache(db, user.id, providerKey);
    async function read(path: string) {
      if (!path.startsWith(user!.id + "/") || path.includes(".."))
        throw new StudioError("La foto no pertenece a tu armario.", 403);
      const { data, error } = await db.storage
        .from("vesti-private")
        .download(path);
      if (error || !data) throw new StudioError("No pudimos abrir la foto.");
      if (data.size > 8 * 1024 * 1024)
        throw new StudioError("Usa fotos de hasta 8 MB.", 413);
      return Buffer.from(await data.arrayBuffer());
    }
    async function reserve() {
      const { data, error } = await db.rpc("reserve_studio_request");
      if (error)
        throw new StudioError(
          "No pudimos verificar la cuota. No se envió la generación.",
          503,
          true,
        );
      if (!data)
        throw new StudioError(
          "Alcanzaste el límite diario del estudio. Vuelve mañana.",
          429,
          true,
        );
    }
    const resize = (bytes: Buffer, width: number) =>
      sharp(bytes, { limitInputPixels: 40000000 })
        .rotate()
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 88 })
        .toBuffer();
    const imageData = async (path: string) =>
      `data:image/jpeg;base64,${(await resize(await read(path), 1600)).toString("base64")}`;
    if (body.action === "analyze") {
      const image = await resize(await read(body.path), 1024);
      const hash = cacheKey(
        user.id,
        VISION_MODEL + "inventory-v2" + image.toString("base64"),
        providerKey,
      );
      const result = await cached(hash, async () => {
        await reserve();
        return analyzeWithClaude(image, providerKey);
      });
      const inventory = analysisSchema.parse(result);
      const metadata = await sharp(image).metadata();
      const garments = [];
      for (const garment of inventory.garments) {
        const rect =
          garment.bounds &&
          cropRectangle(garment.bounds, metadata.width!, metadata.height!);
        let path = body.path;
        if (rect) {
          path = `${user.id}/crop-${cacheKey(user.id, hash + JSON.stringify(rect), providerKey)}.jpeg`;
          const bytes = await sharp(image)
            .extract(rect)
            .jpeg({ quality: 90 })
            .toBuffer();
          const saved = await db.storage
            .from("vesti-private")
            .upload(path, bytes, { contentType: "image/jpeg" });
          if (saved.error) {
            const existing = await db.storage
              .from("vesti-private")
              .download(path);
            if (existing.error)
              throw new StudioError(
                "No pudimos guardar los recortes. Reintenta para recuperar el análisis.",
              );
          }
        }
        const signed = await db.storage
          .from("vesti-private")
          .createSignedUrl(path, 3600);
        if (signed.error) throw new StudioError("No pudimos abrir el recorte.");
        garments.push({
          ...garment,
          path,
          image: signed.data.signedUrl,
          source: body.path,
        });
      }
      return NextResponse.json({ garments });
    }
    async function generate(
      model: "edit" | "tryon-max" | "model-swap",
      inputs: Record<string, unknown>,
    ) {
      const hash = cacheKey(
        user!.id,
        JSON.stringify({ model, inputs, version: "economy-1k-v1" }),
        providerKey!,
      );
      const result = await cached(
        hash,
        async (checkpoint, resume) => {
          let prediction =
            typeof resume?.prediction === "string" ? resume.prediction : null;
          if (!prediction) {
            await reserve();
            prediction = await submitFashn(model, inputs, providerKey!);
            await checkpoint({ prediction });
          }
          while (Date.now() < deadline - 10000) {
            const output = await pollFashn(prediction, providerKey!);
            if (output) {
              const path = `${user!.id}/${hash}.${output.type === "image/png" ? "png" : "jpeg"}`;
              const { error } = await db.storage
                .from("vesti-private")
                .upload(path, output.bytes, { contentType: output.type });
              if (error) {
                const { data: existing } = await db.storage
                  .from("vesti-private")
                  .download(path);
                if (!existing)
                  throw new StudioError(
                    "No pudimos guardar el resultado. Vuelve a pulsar para recuperarlo.",
                  );
              }
              return { path, credits: output.credits };
            }
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
          throw new StudioError(
            "FASHN sigue trabajando. Vuelve a pulsar para recuperar el resultado sin pedir otra imagen.",
            409,
          );
        },
        true,
      );
      if (
        typeof result.path !== "string" ||
        !result.path.startsWith(user!.id + "/")
      )
        throw new StudioError("No pudimos recuperar tu imagen.");
      return result.path;
    }
    let path: string;
    if (body.action === "clean")
      path = await generate("edit", {
        image: await imageData(body.path),
        prompt: `Extract ONLY the ${body.garment.name} (${body.garment.category}, ${body.garment.color}) as a studio product photo on warm white. Remove the person and background. Smooth incidental wrinkles. Preserve exact cut, color, texture, patterns and branding. Never invent hidden details or redesign the garment.`,
      });
    else {
      const state = record.data;
      if (!state.profile.body)
        throw new StudioError(
          "Añade una foto de cuerpo completo donde también se vea tu rostro.",
          400,
        );
      const garments = body.ids.map((id) =>
        state.garments.find((g: { id: string }) => g.id === id),
      );
      if (garments.some((g) => !g?.path))
        throw new StudioError(
          "Usa prendas con foto guardada en tu armario.",
          400,
        );
      const order: Record<string, number> = {
        Tops: 0,
        Pantalones: 1,
        Vestidos: 2,
        Abrigos: 3,
        Zapatos: 4,
        Accesorios: 5,
      };
      garments.sort(
        (a, b) =>
          (order[a.category] ?? 6) - (order[b.category] ?? 6) ||
          a.id.localeCompare(b.id),
      );
      const products = await Promise.all(
        garments.map((g) => imageData(g.path)),
      );
      let modelImage = await imageData(state.profile.body);
      path = state.profile.body;
      if (body.useFace) {
        if (!state.profile.face)
          throw new StudioError(
            "Añade tu foto de rostro antes de activar la referencia facial.",
            400,
          );
        const face = await imageData(state.profile.face);
        path = await generate("model-swap", {
          model_image: modelImage,
          face_reference: face,
          face_reference_mode: "match_base",
          prompt:
            "The face reference and body photo show the same person. Keep the exact body shape, proportions, pose, age, skin tone and clothing of the body photograph. Use the face reference only to preserve facial likeness. Do not slim or beautify.",
        });
        modelImage = await imageData(path);
      }
      for (let i = 0; i < products.length; i++) {
        if (Date.now() > deadline - 45000)
          throw new StudioError(
            "Guardamos el avance. Vuelve a pulsar para continuar sin repetir las prendas ya generadas.",
            409,
          );
        path = await generate("tryon-max", {
          model_image: modelImage,
          product_image: products[i],
          seed: body.seed,
          prompt: `Wear this ${garments[i].name}. Preserve the person's face, identity, body proportions, skin tone and pose. Preserve every other garment and accessory already worn. Do not slim, beautify or change age.`,
        });
        if (i < products.length - 1) modelImage = await imageData(path);
      }
    }
    const { data: signed, error: signError } = await db.storage
      .from("vesti-private")
      .createSignedUrl(path, 3600);
    if (signError) throw new StudioError("No pudimos abrir el resultado.");
    return NextResponse.json({ path, image: signed.signedUrl });
  } catch (error) {
    if (error instanceof StudioError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        {
          error:
            "No pudimos interpretar los datos. Revisa la foto y las prendas seleccionadas.",
        },
        { status: 400 },
      );
    console.error(
      "Studio failure",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      {
        error:
          "La operación se interrumpió. No se reintentó automáticamente para proteger tu saldo. Si FASHN ya recibió la solicitud, vuelve a pulsar para recuperar el progreso.",
      },
      { status: 502 },
    );
  }
}
