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
import { compatible } from "@/lib/look-selection";
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
    // Access is governed by Supabase Auth. Do not maintain a second allowlist:
    // any user who successfully signs in can use their private wardrobe.
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
      // The owner's testing account is exempt from the application's daily
      // quota. Provider limits and balances still apply.
      if (user?.email?.toLowerCase() === "santiagogomez3186@gmail.com") return;
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
        VISION_MODEL + "inventory-subject-v3" + image.toString("base64"),
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
        if (rect && !(inventory.garments.length === 1 && garment.onPerson === false)) {
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
    if (body.action === "extract") {
      const names = body.garments.map((g) => `${g.name} (${g.color})`).join(", ");
      const sheetPath = await generate("edit", {
        image: await imageData(body.path),
        prompt: `Extract every visible wardrobe item from this photo and recreate them as separate premium ecommerce flat-lay product photographs on one seamless pure white sheet. Items: ${names}. Show each item exactly once, fully visible, centered in its own generous grid area, with clear white space between items. Remove the person, skin, hands, furniture, room, hangers and shadows. Reconstruct naturally hidden portions, smooth incidental wrinkles, and preserve the exact color, fabric, cut, pattern, seams, hardware and visible branding. Do not invent, duplicate, combine or redesign items.`,
      });
      const sheet = await resize(await read(sheetPath), 1600);
      const claudeKey = process.env.ANTHROPIC_API_KEY;
      if (!claudeKey)
        throw new StudioError("Falta configurar ANTHROPIC_API_KEY en Vercel.", 503);
      const inventory = analysisSchema.parse(await analyzeWithClaude(sheet, claudeKey));
      const metadata = await sharp(sheet).metadata();
      const garments = [];
      for (const [index, garment] of inventory.garments.entries()) {
        const rect = garment.bounds && cropRectangle(garment.bounds, metadata.width!, metadata.height!);
        if (!rect) continue;
        const path = `${user.id}/studio-piece-${cacheKey(user.id, `${sheetPath}:${index}:${JSON.stringify(rect)}`, providerKey)}.png`;
        const bytes = await sharp(sheet)
          .extract(rect)
          .resize({ width: 900, height: 900, fit: "contain", background: "#ffffff" })
          .flatten({ background: "#ffffff" })
          .png()
          .toBuffer();
        const saved = await db.storage.from("vesti-private").upload(path, bytes, {
          contentType: "image/png",
          upsert: true,
        });
        if (saved.error) throw new StudioError("No pudimos guardar una prenda extraída.");
        const signed = await db.storage.from("vesti-private").createSignedUrl(path, 3600);
        if (signed.error) throw new StudioError("No pudimos abrir una prenda extraída.");
        garments.push({ ...garment, path, image: signed.data.signedUrl, source: body.path, cleaned: true });
      }
      if (!garments.length)
        throw new StudioError("No pudimos separar las prendas de esta foto. Prueba con mejor luz.");
      return NextResponse.json({ garments });
    }
    let path: string;
    if (body.action === "clean") {
      if (body.garment.onPerson !== false) {
        path = await generate("edit", {
          image: await imageData(body.path),
          prompt: `High-end luxury ecommerce ghost-mannequin flat-lay product photograph of this garment (${body.garment.name}, ${body.garment.color}${body.garment.material ? `, ${body.garment.material}` : ""}) perfectly isolated on an immaculate solid pure white #FFFFFF background. Completely erase the person, head, neck, face, hands, limbs, skin, shadows, hanger, and background scenery. Reconstruct hidden necklines, inner back collar labels, hemlines, and waistbands with realistic interior fabric. Perfectly iron out, smooth, and flatten all fabric wrinkles, folds, and body creases. The garment is laid out completely flat, crisp, symmetrical, centered, with generous breathing room around edges. Maintain 100% faithful true-to-life color, fabric texture, weave, buttons, zippers, stitching, and visible branding.`,
        });
      } else {
        const source = await read(body.path);
        const normalized = await sharp(source, { limitInputPixels: 40000000 })
          .rotate()
          .resize({ width: 800, height: 800, fit: "contain", background: "#ffffff" })
          .extend({ top: 50, bottom: 50, left: 50, right: 50, background: "#ffffff" })
          .flatten({ background: "#ffffff" })
          .png()
          .toBuffer();
        const hash = cacheKey(user.id, `local-studio-v4:${body.path}`, providerKey);
        path = `${user.id}/studio-${hash}.png`;
        const saved = await db.storage.from("vesti-private").upload(path, normalized, {
          contentType: "image/png",
          upsert: true,
        });
        if (saved.error) throw new StudioError("No pudimos guardar la foto de estudio.");
      }
    }
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
      if (garments.some((g, i) => garments.slice(i + 1).some(other => !compatible(g, other))))
        throw new StudioError("Elige una sola prenda de cada tipo. Un vestido sustituye camisa y pantalón.", 400);
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
      const productBuffers = await Promise.all(garments.map((g) => read(g.path)));
      // Compose every selected piece into one clean white reference sheet. One
      // try-on request can then dress the model with the complete look.
      const slots = Math.ceil(Math.sqrt(productBuffers.length));
      const tile = 620;
      const canvas = sharp({
        create: {
          width: slots * tile,
          height: slots * tile,
          channels: 4,
          background: "#ffffff",
        },
      });
      const composites = await Promise.all(productBuffers.map(async (buffer, index) => ({
        input: await sharp(buffer).rotate().resize({ width: tile - 40, height: tile - 40, fit: "contain", background: "#ffffff" }).png().toBuffer(),
        left: (index % slots) * tile + 20,
        top: Math.floor(index / slots) * tile + 20,
      })));
      const sheet = await canvas.composite(composites).png().toBuffer();
      const productImage = `data:image/png;base64,${sheet.toString("base64")}`;
      let modelImage = await imageData(state.profile.body);
      const bodyTraits = [
        state.profile.bodyType ? `silhouette: ${state.profile.bodyType}` : null,
        state.profile.skinTone ? `skin tone: ${state.profile.skinTone}` : null,
        state.profile.hairStyle ? `hair: ${state.profile.hairStyle}` : null,
        state.profile.height ? `height: ${state.profile.height}` : null,
      ].filter(Boolean).join(", ");
      path = state.profile.body;
      path = await generate("tryon-max", {
        model_image: modelImage,
        product_image: productImage,
        seed: body.seed,
        category: "auto",
        prompt: `Dress the person in the exact clothing pieces shown on the reference sheet: ${garments.map((g) => g.name).join(", ")}.
CRITICAL REQUIREMENT - ZERO MODIFICATION TO HEAD OR FACE:
Keep the person's real face, eyes, gaze, eyelids, eyebrows, nose, mouth, lips, smile, facial structure, skin texture, complexion, ears, hair, and expression 100% untouched and identical to the original photo.
Do not generate an artificial AI face. Do not modify, beautify, retouch, change age, or alter the head or facial features.
Only replace the clothing on the body. Preserve the natural pose, proportions, and lighting.`,
      });
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
