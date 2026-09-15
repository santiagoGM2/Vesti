import Image from "next/image";
import type { Garment } from "@/lib/model";
export function GarmentArt({ garment }: { garment: Garment }) {
  if (garment.image)
    return (
      <Image
        src={garment.image}
        alt={garment.name}
        fill
        unoptimized
        sizes="(max-width: 700px) 45vw, 260px"
        className="object-contain p-4"
      />
    );
  const type =
    garment.kind ||
    (
      {
        Tops: "shirt",
        Pantalones: "pants",
        Vestidos: "dress",
        Abrigos: "knit",
        Zapatos: "shoes",
        Accesorios: "bag",
      } as Record<string, string>
    )[garment.category] ||
    "shirt";
  return (
    <svg
      viewBox="0 0 260 280"
      role="img"
      aria-label={garment.name}
      className="garment-art"
    >
      <defs>
        <linearGradient id={`fabric-${garment.id}`} x1="0" x2="1">
          <stop
            stopColor={
              type === "knit"
                ? "#698baf"
                : type === "dress"
                  ? "#dba99c"
                  : type === "pants"
                    ? "#b6a58f"
                    : "#e4e0d5"
            }
          />
          <stop
            offset=".5"
            stopColor={
              type === "knit"
                ? "#94b0cc"
                : type === "dress"
                  ? "#edc1b1"
                  : type === "pants"
                    ? "#d1c2ae"
                    : "#fffdf5"
            }
          />
          <stop
            offset="1"
            stopColor={
              type === "knit"
                ? "#7193b4"
                : type === "dress"
                  ? "#ce998d"
                  : type === "pants"
                    ? "#b8a790"
                    : "#e5e1d6"
            }
          />
        </linearGradient>
        <filter id={`shadow-${garment.id}`}>
          <feDropShadow dx="1" dy="7" stdDeviation="5" floodOpacity=".1" />
        </filter>
      </defs>
      <g filter={`url(#shadow-${garment.id})`} strokeLinejoin="round">
        {["shirt", "knit"].includes(type) && (
          <>
            <path
              d="M94 46 64 56 26 131 58 146 82 99 78 228Q130 242 182 228L178 99 202 146 234 131 196 56 166 46Q130 64 94 46Z"
              fill={`url(#fabric-${garment.id})`}
              stroke="#8b8c8425"
            />
            <path
              d="M94 46 112 80 130 61 149 80 166 46M130 63V232M85 104 90 208M175 103 169 211"
              fill="none"
              stroke="#77777730"
            />
            {[98, 126, 154, 182, 210].map((y) => (
              <circle key={y} cx="132" cy={y} r="2" fill="#b4b3a4" />
            ))}
          </>
        )}
        {type === "pants" && (
          <>
            <path
              d="M88 35H175L185 120 175 250 132 250 134 135 122 135 112 250 68 250 76 116Z"
              fill={`url(#fabric-${garment.id})`}
              stroke="#927e6440"
            />
            <path
              d="M86 48H177M129 49V107L134 135M99 66 92 235M157 66 153 235M84 63 106 63 80 93"
              fill="none"
              stroke="#8a775748"
            />
            <circle cx="132" cy="41" r="2" fill="#806d50" />
          </>
        )}
        {type === "bag" && (
          <>
            <path
              d="M98 119V89C98 44 167 44 167 89V119"
              fill="none"
              stroke="#674d3f"
              strokeWidth="12"
            />
            <path
              d="M71 111Q130 122 189 111L204 222Q130 242 58 222Z"
              fill="#795846"
            />
            <path
              d="M76 117 70 215Q130 230 191 215L184 118M132 126V217"
              fill="none"
              stroke="#bd9370"
              strokeWidth="1.5"
            />
            <rect
              x="119"
              y="133"
              width="25"
              height="17"
              rx="3"
              fill="#c9ad78"
            />
          </>
        )}
        {type === "shoes" && (
          <>
            <g transform="rotate(-16 90 140)">
              <path
                d="M80 51C112 47 112 107 109 156L110 216Q90 246 68 216L65 125Q62 63 80 51"
                fill="#343b3d"
              />
              <ellipse cx="86" cy="133" rx="17" ry="59" fill="#d6b9a1" />
              <path
                d="M68 183Q87 174 108 183M76 186 88 193 99 184"
                fill="none"
                stroke="#161e22"
                strokeWidth="3"
              />
            </g>
            <g transform="translate(76 10) rotate(9 90 140)">
              <path
                d="M80 51C112 47 112 107 109 156L110 216Q90 246 68 216L65 125Q62 63 80 51"
                fill="#343b3d"
              />
              <ellipse cx="86" cy="133" rx="17" ry="59" fill="#d6b9a1" />
              <path
                d="M68 183Q87 174 108 183M76 186 88 193 99 184"
                fill="none"
                stroke="#161e22"
                strokeWidth="3"
              />
            </g>
          </>
        )}
        {type === "dress" && (
          <>
            <path
              d="M100 35H111L115 74Q130 91 146 74L149 35H161L166 103 151 129 200 244Q131 270 61 244L110 129 94 103Z"
              fill={`url(#fabric-${garment.id})`}
            />
            <path
              d="M110 129Q130 140 151 129M112 148 91 242M143 148 166 245M130 148V253"
              stroke="#b67b7040"
              fill="none"
            />
          </>
        )}
      </g>
    </svg>
  );
}
