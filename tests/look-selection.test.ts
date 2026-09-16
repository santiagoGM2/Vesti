import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compatible, selectPiece } from '../src/lib/look-selection';
import type { Garment } from '../src/lib/model';
const piece = (id: string, name: string, category: Garment['category']): Garment => ({ id, name, category, color: 'negro', favorite: false });
test('replaces trousers and hats while retaining different accessories', () => {
  const items = [piece('a','Jeans','Pantalones'),piece('b','Pantalón','Pantalones'),piece('c','Gorra azul','Accesorios'),piece('d','Gorra roja','Accesorios'),piece('e','Reloj','Accesorios')];
  assert.deepEqual(selectPiece(['a','c','e'],items[1],items),['c','e','b']);
  assert.deepEqual(selectPiece(['b','c','e'],items[3],items),['b','e','d']);
});
test('dress replaces top and bottom; a second click deselects', () => {
  const items = [piece('a','Camisa','Tops'),piece('b','Jean','Pantalones'),piece('c','Vestido','Vestidos')];
  assert.deepEqual(selectPiece(['a','b'],items[2],items),['c']);
  assert.deepEqual(selectPiece(['c'],items[2],items),[]);
  assert.equal(compatible(items[0],items[2]),false);
});
