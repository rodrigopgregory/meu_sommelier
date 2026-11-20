// Foto: reduz para no máximo 1600 px em JPEG antes de enviar.
export const FOTO_MAX_BYTES = 15 * 1024 * 1024;

export async function prepararFoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('O arquivo não é uma imagem.');
  if (file.size > FOTO_MAX_BYTES) throw new Error('A foto é grande demais (máximo 15 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não foi possível abrir esta imagem.'));
      i.src = url;
    });
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, erro) => canvas.toBlob(b => (b ? ok(b) : erro(new Error('Não foi possível preparar a foto.'))), 'image/jpeg', 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Áudio: o navegador grava em webm/ogg; convertemos para WAV 16 kHz mono, que o Gemini lê.
export async function paraWav(gravado: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(await gravado.arrayBuffer());
    const taxa = 16000;
    const off = new OfflineAudioContext(1, Math.ceil(buffer.duration * taxa), taxa);
    const fonte = off.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(off.destination);
    fonte.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const dados = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const escrever = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dados.setUint8(o + i, s.charCodeAt(i)); };
    escrever(0, 'RIFF'); dados.setUint32(4, 36 + pcm.length * 2, true); escrever(8, 'WAVE'); escrever(12, 'fmt ');
    dados.setUint32(16, 16, true); dados.setUint16(20, 1, true); dados.setUint16(22, 1, true); dados.setUint32(24, taxa, true);
    dados.setUint32(28, taxa * 2, true); dados.setUint16(32, 2, true); dados.setUint16(34, 16, true); escrever(36, 'data'); dados.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) dados.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    return new Blob([dados], { type: 'audio/wav' });
  } finally {
    ctx.close();
  }
}
