import { test } from "node:test";
import assert from "node:assert/strict";
import { recommend } from "../src/lib/recommendations";
import { initial, examples, type Garment } from "../src/lib/model";
import { cropRectangle } from "../src/lib/crop";
import { analysisSchema, studioSchema } from "../src/lib/studio-contract";
test("ranking chooses weather-appropriate layers without duplicate items", () => {
  const items: Garment[] = [
    ...examples,
    {
      id: "coat",
      name: "Abrigo",
      category: "Abrigos",
      color: "Negro",
      warmth: 3,
      favorite: false,
    },
  ];
  const cold = recommend(items, initial.profile, 1, 6),
    hot = recommend(items, initial.profile, 1, 32);
  assert.ok(cold.some((g) => g.id === "coat"));
  assert.ok(!hot.some((g) => g.id === "coat"));
  for (let i = 0; i < 4; i++) {
    const look = recommend(items, initial.profile, i, 20, i);
    assert.equal(new Set(look.map((g) => g.id)).size, look.length);
    assert.ok(look.every((g) => items.includes(g)));
    if (look.some((g) => g.category === "Vestidos"))
      assert.ok(
        !look.some((g) => g.category === "Tops" || g.category === "Pantalones"),
      );
  }
  assert.deepEqual(recommend([], initial.profile, 0), []);
});
test("occasion ranks formal garments higher for a meeting", () => {
  const clothes: Garment[] = [
    { ...examples[0], id: "casual", formality: 0 },
    { ...examples[0], id: "formal", formality: 2 },
  ];
  assert.equal(recommend(clothes, initial.profile, 1)[0].id, "formal");
  assert.equal(recommend(clothes, initial.profile, 3)[0].id, "casual");
});
test("crops reject invalid geometry and always stay inside image", () => {
  assert.equal(cropRectangle([0.8, 0, 0.2, 1], 100, 100), null);
  assert.equal(cropRectangle([0, 0, NaN, 1], 100, 100), null);
  assert.equal(cropRectangle([0, 0, 1.2, 1], 100, 100), null);
  assert.deepEqual(cropRectangle([0, 0, 1, 1], 1024, 700), {
    left: 0,
    top: 0,
    width: 1024,
    height: 700,
  });
  const rect = cropRectangle([0.12, 0.13, 0.98, 0.99], 101, 99)!;
  assert.ok(rect.left + rect.width <= 101 && rect.top + rect.height <= 99);
});
test("inventory accepts more than five accessories and optional brands", () => {
  const garments = Array.from({ length: 20 }, () => ({
    name: "Pulsera plateada",
    category: "Joyería",
    color: "Plata",
    brand: "",
    bounds: [0, 0, 0.5, 0.5],
  }));
  assert.equal(analysisSchema.parse({ garments }).garments.length, 20);
  assert.equal(
    studioSchema.parse({ action: "tryon", ids: ["one"] }).action,
    "tryon",
  );
  assert.throws(() =>
    studioSchema.parse({ action: "tryon", ids: ["one", "one"] }),
  );
});
