// Loaded only when requested. Inference runs on this device; no paid API.
export async function transparentPhoto(image: string, progress: (text: string) => void) {
  const response = await fetch(image);
  if (!response.ok) throw Error('No pudimos abrir la foto. Vuelve a cargar tu clóset.');
  const blob = await response.blob();
  const { removeBackground } = await import('@imgly/background-removal');
  progress('Quitando el fondo en tu dispositivo…');
  const result = await removeBackground(blob, {
    model: 'isnet_fp16',
    proxyToWorker: false,
    output: { format: 'image/png' },
    progress: (key, current, total) => {
      if (key.startsWith('fetch:')) progress(`Preparando el editor: ${Math.round(current / Math.max(total, 1) * 100)} %`);
    },
  });
  return new File([result], 'prenda-transparente.png', { type: 'image/png' });
}
