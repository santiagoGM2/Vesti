import Image from "next/image";

export function Brand() {
  return (
    <span className="brand-lockup">
      <Image src="/brand/logo.webp" alt="" width={56} height={56} priority />
      <span>vesti<span className="brand-dot">.</span></span>
    </span>
  );
}
