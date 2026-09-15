import { test } from "node:test";
import assert from "node:assert/strict";
import { examples, suggest } from "../src/lib/model";
test("suggestions never invent clothes or repeat an item", () => {
  for (let offset = 0; offset < 20; offset++) {
    const result = suggest(examples, offset);
    assert.equal(new Set(result.map((g) => g.id)).size, result.length);
    assert.ok(result.every((g) => examples.some((x) => x.id === g.id)));
  }
});
test("a dress replaces both top and trousers", () => {
  const result = suggest(examples, 1);
  assert.ok(result.some((g) => g.category === "Vestidos"));
  assert.ok(!result.some((g) => ["Tops", "Pantalones"].includes(g.category)));
});
test("empty wardrobe has no recommendations", () =>
  assert.deepEqual(suggest([]), []));
test("dress-only wardrobe does not invent trousers", () =>
  assert.deepEqual(
    suggest(examples.filter((g) => g.category === "Vestidos")).map(
      (g) => g.category,
    ),
    ["Vestidos"],
  ));
