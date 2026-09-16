import Image from "next/image";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`logo ${large ? 'logo-large' : ''}`}>
      <Image src="/brand/logo.webp" alt="" width={large ? 140 : 42} height={large ? 140 : 42} priority />
      <span>Vesti</span>
    </span>
  );
}
