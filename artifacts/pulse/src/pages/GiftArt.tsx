import React from "react";

// Unique prefix per gift to avoid SVG gradient ID collisions when multiple rendered at once
function pfx(name: string) {
  return "ga-" + name.replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 8);
}

export function GiftArt({ name, size = 64 }: { name: string; size?: number }) {
  const p = pfx(name);
  const s = size;

  const arts: Record<string, JSX.Element> = {

    // ── COMMON ────────────────────────────────────────────────────────────────

    "Сердечко": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="38%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#ff9ec4"/>
            <stop offset="100%" stopColor="#9b0f3e"/>
          </radialGradient>
          <filter id={`${p}-f`}><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="M50 82 C18 58, 6 40, 6 28 A22 22 0 0 1 50 20 A22 22 0 0 1 94 28 C94 40 82 58 50 82Z"
          fill={`url(#${p}-a)`} filter={`url(#${p}-f)`}/>
        <ellipse cx="37" cy="33" rx="10" ry="6" fill="rgba(255,255,255,0.38)" transform="rotate(-30 37 33)"/>
        <ellipse cx="62" cy="42" rx="5" ry="3" fill="rgba(255,255,255,0.15)" transform="rotate(-20 62 42)"/>
      </svg>
    ),

    "Звёздочка": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff176"/>
            <stop offset="60%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#b45309"/>
          </radialGradient>
        </defs>
        {/* Glow rays */}
        {[0,45,90,135].map(a => (
          <line key={a} x1="50" y1="50" x2={50+48*Math.cos(a*Math.PI/180)} y2={50+48*Math.sin(a*Math.PI/180)}
            stroke="#fde68a" strokeWidth="2" opacity="0.35"/>
        ))}
        {[22,67,112,157].map(a => (
          <line key={a} x1="50" y1="50" x2={50+40*Math.cos(a*Math.PI/180)} y2={50+40*Math.sin(a*Math.PI/180)}
            stroke="#fde68a" strokeWidth="1" opacity="0.25"/>
        ))}
        {/* Star */}
        <polygon points="50,8 60.6,35.4 92,36.1 67.2,55.6 76.4,86.4 50,68 23.6,86.4 32.8,55.6 8,36.1 39.4,35.4"
          fill={`url(#${p}-a)`}/>
        <polygon points="50,18 57,37 76,37.5 61,48 66,67 50,56 34,67 39,48 24,37.5 43,37"
          fill="rgba(255,255,255,0.22)"/>
        <ellipse cx="42" cy="33" rx="6" ry="4" fill="rgba(255,255,255,0.5)" transform="rotate(-25 42 33)"/>
      </svg>
    ),

    "Цветок сакуры": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fce4ec"/>
            <stop offset="100%" stopColor="#c2185b"/>
          </radialGradient>
          <radialGradient id={`${p}-b`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff59d"/>
            <stop offset="100%" stopColor="#f9a825"/>
          </radialGradient>
        </defs>
        {[0,72,144,216,288].map(a => {
          const rx = 50 + 28*Math.cos((a-90)*Math.PI/180);
          const ry = 50 + 28*Math.sin((a-90)*Math.PI/180);
          return <ellipse key={a} cx={rx} cy={ry} rx="18" ry="12" fill={`url(#${p}-a)`}
            transform={`rotate(${a} ${rx} ${ry})`}/>;
        })}
        <circle cx="50" cy="50" r="13" fill={`url(#${p}-b)`}/>
        {[0,60,120,180,240,300].map(a => (
          <circle key={a} cx={50+9*Math.cos(a*Math.PI/180)} cy={50+9*Math.sin(a*Math.PI/180)} r="2.5" fill="#e65100" opacity="0.7"/>
        ))}
        <circle cx="50" cy="50" r="5" fill="#fff176"/>
        <ellipse cx="44" cy="44" rx="12" ry="7" fill="rgba(255,255,255,0.3)" transform="rotate(-35 44 44)"/>
      </svg>
    ),

    "Пончик": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffcc80"/>
            <stop offset="100%" stopColor="#6d3600"/>
          </radialGradient>
          <radialGradient id={`${p}-b`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f8bbd0"/>
            <stop offset="100%" stopColor="#e91e63"/>
          </radialGradient>
        </defs>
        {/* Donut body */}
        <circle cx="50" cy="53" r="40" fill={`url(#${p}-a)`}/>
        <circle cx="50" cy="53" r="16" fill="#1e293b"/>
        {/* Frosting */}
        <path d="M50 14 C65 14, 82 24, 87 40 C80 30, 65 26, 50 26 C35 26, 20 30, 13 40 C18 24, 35 14, 50 14Z"
          fill={`url(#${p}-b)`}/>
        {/* Sprinkles */}
        {[[38,20,45],[62,22,-30],[72,35,60],[28,32,-50],[55,17,15],[42,28,80]].map(([x,y,r],i) => (
          <rect key={i} x={x-4} y={y-1.5} width="8" height="3" rx="1.5"
            fill={["#f44336","#4caf50","#2196f3","#ffeb3b","#9c27b0","#ff9800"][i]}
            transform={`rotate(${r} ${x} ${y})`}/>
        ))}
        <ellipse cx="40" cy="28" rx="9" ry="4" fill="rgba(255,255,255,0.35)" transform="rotate(-20 40 28)"/>
      </svg>
    ),

    "Котёнок": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="100%" stopColor="#f9a825"/>
          </radialGradient>
        </defs>
        {/* Ears */}
        <polygon points="22,42 12,14 38,30" fill="#f9a825"/>
        <polygon points="78,42 88,14 62,30" fill="#f9a825"/>
        <polygon points="25,40 18,20 36,31" fill="#f48fb1" opacity="0.7"/>
        <polygon points="75,40 82,20 64,31" fill="#f48fb1" opacity="0.7"/>
        {/* Head */}
        <ellipse cx="50" cy="58" rx="36" ry="32" fill={`url(#${p}-a)`}/>
        {/* Eyes */}
        <ellipse cx="37" cy="52" rx="7" ry="8" fill="#1a237e"/>
        <ellipse cx="63" cy="52" rx="7" ry="8" fill="#1a237e"/>
        <ellipse cx="37" cy="52" rx="3.5" ry="7" fill="#0d0d0d"/>
        <ellipse cx="63" cy="52" rx="3.5" ry="7" fill="#0d0d0d"/>
        <circle cx="35" cy="49" r="2" fill="white"/>
        <circle cx="61" cy="49" r="2" fill="white"/>
        {/* Nose */}
        <polygon points="50,62 46,67 54,67" fill="#e91e63"/>
        {/* Mouth */}
        <path d="M46,67 Q50,72 54,67" fill="none" stroke="#c62828" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Whiskers */}
        {[[-28,-3],[-28,3],[28,-3],[28,3]].map(([dx,dy],i) => (
          <line key={i} x1="50" y1="65" x2={50+dx} y2={65+dy} stroke="#795548" strokeWidth="1" opacity="0.6"/>
        ))}
        <ellipse cx="44" cy="50" rx="8" ry="5" fill="rgba(255,255,255,0.4)" transform="rotate(-25 44 50)"/>
      </svg>
    ),

    "Воздушный шар": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#ff8a80"/>
            <stop offset="100%" stopColor="#b71c1c"/>
          </radialGradient>
        </defs>
        {/* Balloon */}
        <ellipse cx="50" cy="44" rx="36" ry="40" fill={`url(#${p}-a)`}/>
        {/* Stripe highlights */}
        <path d="M32 15 Q28 44, 32 73" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M44 12 Q40 44, 44 76" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" strokeLinecap="round"/>
        {/* Knot */}
        <ellipse cx="50" cy="84" rx="5" ry="4" fill="#c62828"/>
        {/* String */}
        <path d="M50 88 Q45 93 50 98" fill="none" stroke="#795548" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Shine */}
        <ellipse cx="38" cy="28" rx="10" ry="14" fill="rgba(255,255,255,0.38)" transform="rotate(-15 38 28)"/>
      </svg>
    ),

    "Четырёхлистник": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#a5d6a7"/>
            <stop offset="100%" stopColor="#1b5e20"/>
          </radialGradient>
        </defs>
        {/* Stem */}
        <path d="M50 68 Q55 80 50 92" fill="none" stroke="#2e7d32" strokeWidth="4" strokeLinecap="round"/>
        {/* Four leaves */}
        {[[50,30],[70,50],[50,70],[30,50]].map(([cx,cy],i) => (
          <ellipse key={i} cx={cx} cy={cy} rx="18" ry="14" fill={`url(#${p}-a)`}
            transform={`rotate(${i*90} ${cx} ${cy})`}/>
        ))}
        {/* Center */}
        <circle cx="50" cy="50" r="8" fill="#388e3c"/>
        {/* Vein lines */}
        {[[50,30],[70,50],[50,70],[30,50]].map(([cx,cy],i) => (
          <line key={i} x1="50" y1="50" x2={cx} y2={cy} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        ))}
        <ellipse cx="44" cy="35" rx="8" ry="5" fill="rgba(255,255,255,0.3)" transform="rotate(-30 44 35)"/>
      </svg>
    ),

    "Пицца": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffd54f"/>
            <stop offset="100%" stopColor="#e65100"/>
          </linearGradient>
        </defs>
        {/* Crust */}
        <path d="M50 8 L95 88 L5 88 Z" fill="#d7834a" rx="4"/>
        {/* Cheese */}
        <path d="M50 22 L85 82 L15 82 Z" fill={`url(#${p}-a)`}/>
        {/* Sauce blobs */}
        <circle cx="50" cy="45" r="9" fill="#e53935" opacity="0.85"/>
        <circle cx="35" cy="65" r="7" fill="#e53935" opacity="0.85"/>
        <circle cx="65" cy="65" r="7" fill="#e53935" opacity="0.85"/>
        <circle cx="50" cy="68" r="5" fill="#e53935" opacity="0.85"/>
        {/* Pepperoni */}
        {[[50,44],[36,64],[64,64],[50,66]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="6" fill="#b71c1c" opacity="0.8"/>
        ))}
        {/* Olives */}
        <circle cx="42" cy="55" r="3.5" fill="#212121"/>
        <circle cx="60" cy="55" r="3.5" fill="#212121"/>
        {/* Crust shine */}
        <path d="M22 80 Q50 72 78 80" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),

    "Торт": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8bbd0"/>
            <stop offset="100%" stopColor="#ad1457"/>
          </linearGradient>
          <linearGradient id={`${p}-b`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="100%" stopColor="#f9a825"/>
          </linearGradient>
        </defs>
        {/* Layer 1 - bottom */}
        <rect x="12" y="72" width="76" height="18" rx="4" fill={`url(#${p}-a)`}/>
        <rect x="14" y="72" width="72" height="6" rx="3" fill="rgba(255,255,255,0.3)"/>
        {/* Layer 2 - middle */}
        <rect x="18" y="55" width="64" height="18" rx="4" fill={`url(#${p}-b)`}/>
        <rect x="20" y="55" width="60" height="6" rx="3" fill="rgba(255,255,255,0.28)"/>
        {/* Layer 3 - top */}
        <rect x="24" y="40" width="52" height="16" rx="4" fill={`url(#${p}-a)`}/>
        <rect x="26" y="40" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.3)"/>
        {/* Frosting drips */}
        {[30,42,54,62,70].map((x,i) => (
          <ellipse key={i} cx={x} cy={40} rx="5" ry="6" fill="white" opacity="0.85"/>
        ))}
        {/* Candle */}
        <rect x="47" y="24" width="6" height="16" rx="3" fill="#ce93d8"/>
        <rect x="47" y="24" width="6" height="6" rx="1" fill="rgba(255,255,255,0.4)"/>
        {/* Flame */}
        <ellipse cx="50" cy="20" rx="4" ry="7" fill="#ff9800"/>
        <ellipse cx="50" cy="21" rx="2.5" ry="4.5" fill="#fff176"/>
        {/* Sprinkles */}
        {[[35,47,30],[55,60,-20],[65,48,60],[28,60,15]].map(([x,y,r],i) => (
          <rect key={i} x={x-4} y={y-1.5} width="8" height="3" rx="1.5"
            fill={["#f44336","#2196f3","#4caf50","#9c27b0"][i]}
            transform={`rotate(${r} ${x} ${y})`}/>
        ))}
      </svg>
    ),

    "Луна": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="60%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="70%" stopColor="#f9a825"/>
            <stop offset="100%" stopColor="#e65100"/>
          </radialGradient>
        </defs>
        {/* Stars */}
        {[[20,18,4],[78,25,3],[15,60,2.5],[82,65,3.5],[35,82,2],[70,80,2.5]].map(([cx,cy,r],i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#fff9c4" opacity="0.7"/>
        ))}
        {/* Moon crescent */}
        <circle cx="52" cy="50" r="38" fill={`url(#${p}-a)`}/>
        <circle cx="68" cy="40" r="30" fill="#1e293b"/>
        {/* Craters */}
        <circle cx="34" cy="60" r="6" fill="rgba(0,0,0,0.12)"/>
        <circle cx="42" cy="38" r="4" fill="rgba(0,0,0,0.1)"/>
        <circle cx="28" cy="44" r="3" fill="rgba(0,0,0,0.08)"/>
        {/* Shine */}
        <ellipse cx="36" cy="28" rx="8" ry="5" fill="rgba(255,255,255,0.45)" transform="rotate(-30 36 28)"/>
      </svg>
    ),

    // ── RARE ──────────────────────────────────────────────────────────────────

    "Корона": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff176"/>
            <stop offset="50%" stopColor="#ffd740"/>
            <stop offset="100%" stopColor="#ff6f00"/>
          </linearGradient>
          <linearGradient id={`${p}-b`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd740"/>
            <stop offset="100%" stopColor="#e65100"/>
          </linearGradient>
        </defs>
        {/* Crown base */}
        <path d="M8 80 L8 45 L25 65 L50 20 L75 65 L92 45 L92 80 Z" fill={`url(#${p}-a)`}/>
        {/* Inner shadow */}
        <path d="M12 78 L12 50 L27 67 L50 26 L73 67 L88 50 L88 78 Z" fill={`url(#${p}-b)`} opacity="0.5"/>
        {/* Band */}
        <rect x="8" y="70" width="84" height="14" rx="4" fill={`url(#${p}-b)`}/>
        <rect x="8" y="70" width="84" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
        {/* Gems */}
        {[[20,75,6,"#e53935"],[50,75,6,"#ce93d8"],[80,75,6,"#42a5f5"]].map(([cx,cy,r,fill],i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r as number} fill={fill as string}/>
            <circle cx={(cx as number)-2} cy={(cy as number)-2} r="2" fill="rgba(255,255,255,0.6)"/>
          </g>
        ))}
        {/* Top gem */}
        <circle cx="50" cy="20" r="7" fill="#ff1744"/>
        <circle cx="47" cy="17" r="2.5" fill="rgba(255,255,255,0.6)"/>
        {/* Shine */}
        <path d="M18 50 L25 60 L30 47" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),

    "Красная роза": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ef9a9a"/>
            <stop offset="100%" stopColor="#b71c1c"/>
          </radialGradient>
        </defs>
        {/* Stem */}
        <path d="M50 80 Q48 90 46 95" fill="none" stroke="#2e7d32" strokeWidth="4" strokeLinecap="round"/>
        <path d="M50 72 Q60 78 65 72" fill="#2e7d32"/>
        {/* Outer petals */}
        {[[-15,10],[15,10],[-20,30],[20,30],[0,35]].map(([dx,dy],i) => (
          <ellipse key={i} cx={50+dx} cy={50+dy} rx="18" ry="14" fill={`url(#${p}-a)`} opacity="0.85"/>
        ))}
        {/* Middle petals */}
        {[[-10,8],[10,8],[0,12],[-8,20],[8,20]].map(([dx,dy],i) => (
          <ellipse key={i} cx={50+dx} cy={50+dy} rx="14" ry="10" fill="#c62828" opacity="0.9"/>
        ))}
        {/* Center */}
        <ellipse cx="50" cy="50" rx="10" ry="8" fill="#b71c1c"/>
        <ellipse cx="48" cy="47" rx="5" ry="4" fill="rgba(255,255,255,0.2)" transform="rotate(-20 48 47)"/>
      </svg>
    ),

    "Лиса": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffcc80"/>
            <stop offset="100%" stopColor="#e65100"/>
          </radialGradient>
        </defs>
        {/* Ears */}
        <polygon points="22,45 8,10 40,30" fill="#ef6c00"/>
        <polygon points="78,45 92,10 60,30" fill="#ef6c00"/>
        <polygon points="25,43 14,18 38,30" fill="#ffccbc"/>
        <polygon points="75,43 86,18 62,30" fill="#ffccbc"/>
        {/* Head */}
        <ellipse cx="50" cy="60" rx="36" ry="32" fill={`url(#${p}-a)`}/>
        {/* White face mask */}
        <ellipse cx="50" cy="70" rx="22" ry="20" fill="#ffccbc"/>
        {/* Eyes */}
        <ellipse cx="36" cy="54" rx="7" ry="8" fill="#1a237e"/>
        <ellipse cx="64" cy="54" rx="7" ry="8" fill="#1a237e"/>
        <ellipse cx="36" cy="54" rx="3.5" ry="5" fill="#0d0d0d"/>
        <ellipse cx="64" cy="54" rx="3.5" ry="5" fill="#0d0d0d"/>
        <circle cx="34" cy="52" r="2" fill="white"/>
        <circle cx="62" cy="52" r="2" fill="white"/>
        {/* Nose */}
        <ellipse cx="50" cy="67" rx="5" ry="4" fill="#212121"/>
        <circle cx="48" cy="66" r="1.5" fill="rgba(255,255,255,0.5)"/>
        {/* Whiskers */}
        {[[-30,-2],[-30,4],[30,-2],[30,4]].map(([dx,dy],i) => (
          <line key={i} x1="50" y1="67" x2={50+dx} y2={67+dy} stroke="#795548" strokeWidth="1" opacity="0.5"/>
        ))}
        <ellipse cx="43" cy="53" rx="8" ry="5" fill="rgba(255,255,255,0.3)" transform="rotate(-25 43 53)"/>
      </svg>
    ),

    "Бриллиант": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#e0f7fa"/>
            <stop offset="40%" stopColor="#4dd0e1"/>
            <stop offset="100%" stopColor="#006064"/>
          </linearGradient>
          <linearGradient id={`${p}-b`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)"/>
            <stop offset="100%" stopColor="rgba(100,200,255,0.2)"/>
          </linearGradient>
        </defs>
        {/* Top facets */}
        <polygon points="50,10 20,38 50,42 80,38" fill={`url(#${p}-a)`}/>
        <polygon points="50,10 20,38 8,25" fill="#b2ebf2" opacity="0.9"/>
        <polygon points="50,10 80,38 92,25" fill="#80deea" opacity="0.8"/>
        {/* Left facets */}
        <polygon points="20,38 8,25 15,80 50,88" fill="#4dd0e1" opacity="0.85"/>
        <polygon points="20,38 50,42 50,88 15,80" fill="#26c6da"/>
        {/* Right facets */}
        <polygon points="80,38 92,25 85,80 50,88" fill="#80deea" opacity="0.85"/>
        <polygon points="80,38 50,42 50,88 85,80" fill="#4dd0e1" opacity="0.9"/>
        {/* Bottom */}
        <polygon points="15,80 50,88 85,80" fill="#006064"/>
        {/* Center line */}
        <line x1="50" y1="42" x2="50" y2="88" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        {/* Top shine */}
        <polygon points="50,10 20,38 50,42 80,38" fill={`url(#${p}-b)`} opacity="0.5"/>
        <ellipse cx="38" cy="26" rx="10" ry="5" fill="rgba(255,255,255,0.55)" transform="rotate(-30 38 26)"/>
      </svg>
    ),

    "Ракета": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e3f2fd"/>
            <stop offset="100%" stopColor="#1565c0"/>
          </linearGradient>
          <radialGradient id={`${p}-b`} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#ff5722"/>
            <stop offset="100%" stopColor="#ff9800"/>
          </radialGradient>
        </defs>
        {/* Flame */}
        <ellipse cx="50" cy="88" rx="12" ry="16" fill={`url(#${p}-b)`} opacity="0.9"/>
        <ellipse cx="50" cy="92" rx="7" ry="10" fill="#fff176" opacity="0.8"/>
        {/* Body */}
        <path d="M35 70 Q35 20 50 6 Q65 20 65 70 Z" fill={`url(#${p}-a)`}/>
        {/* Nose cone */}
        <path d="M50 6 Q60 18 65 30 Q55 26 50 6Z" fill="#e53935"/>
        <path d="M50 6 Q40 18 35 30 Q45 26 50 6Z" fill="#ef5350"/>
        {/* Wings */}
        <path d="M35 70 L15 82 L35 62 Z" fill="#1565c0"/>
        <path d="M65 70 L85 82 L65 62 Z" fill="#1565c0"/>
        {/* Window */}
        <circle cx="50" cy="45" r="11" fill="#0d47a1"/>
        <circle cx="50" cy="45" r="8" fill="#1976d2"/>
        <circle cx="47" cy="42" r="3" fill="rgba(255,255,255,0.5)"/>
        {/* Shine */}
        <path d="M42 20 Q40 42 42 60" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),

    "Гитара": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ce93d8"/>
            <stop offset="100%" stopColor="#4a148c"/>
          </radialGradient>
        </defs>
        {/* Neck */}
        <rect x="46" y="6" width="8" height="45" rx="4" fill="#795548"/>
        {/* Tuning pegs */}
        {[10,18,26].map((y,i) => (
          <circle key={i} cx="44" cy={y} r="3.5" fill="#bdb76b"/>
        ))}
        {[10,18,26].map((y,i) => (
          <circle key={i} cx="56" cy={y} r="3.5" fill="#bdb76b"/>
        ))}
        {/* Nut */}
        <rect x="44" y="28" width="12" height="3" rx="1.5" fill="#f5f5f5"/>
        {/* Body lower */}
        <ellipse cx="50" cy="78" rx="30" ry="22" fill={`url(#${p}-a)`}/>
        {/* Body upper */}
        <ellipse cx="50" cy="60" rx="22" ry="18" fill={`url(#${p}-a)`}/>
        {/* Waist */}
        <rect x="36" y="62" width="28" height="10" fill={`url(#${p}-a)`}/>
        {/* Sound hole */}
        <circle cx="50" cy="72" r="9" fill="#2d1b69"/>
        <circle cx="50" cy="72" r="7" fill="#1a0a40"/>
        {/* Strings */}
        {[-4,-1.5,1.5,4,6.5,9].map((dx,i) => (
          <line key={i} x1={50+dx} y1="31" x2={50+dx} y2="85"
            stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
        ))}
        {/* Bridge */}
        <rect x="38" y="84" width="24" height="4" rx="2" fill="#3e2723"/>
        <ellipse cx="42" cy="72" rx="6" ry="4" fill="rgba(255,255,255,0.2)" transform="rotate(-20 42 72)"/>
      </svg>
    ),

    "Кубок": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="40%" stopColor="#ffd740"/>
            <stop offset="100%" stopColor="#c17900"/>
          </linearGradient>
        </defs>
        {/* Cup body */}
        <path d="M28 14 L72 14 Q75 48 65 60 Q60 66 50 68 Q40 66 35 60 Q25 48 28 14Z" fill={`url(#${p}-a)`}/>
        {/* Handles */}
        <path d="M28 22 Q10 28 12 44 Q14 52 28 50" fill="none" stroke="#ffd740" strokeWidth="8" strokeLinecap="round"/>
        <path d="M72 22 Q90 28 88 44 Q86 52 72 50" fill="none" stroke="#ffd740" strokeWidth="8" strokeLinecap="round"/>
        {/* Stem */}
        <rect x="44" y="68" width="12" height="14" rx="3" fill="#c17900"/>
        <rect x="44" y="68" width="12" height="5" rx="2" fill="rgba(255,255,255,0.2)"/>
        {/* Base */}
        <rect x="30" y="82" width="40" height="8" rx="4" fill={`url(#${p}-a)`}/>
        {/* Star */}
        <polygon points="50,28 53,36 62,36 55,42 58,50 50,45 42,50 45,42 38,36 47,36"
          fill="rgba(255,255,255,0.6)"/>
        {/* Shine */}
        <path d="M36 22 Q34 42 36 58" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="5" strokeLinecap="round"/>
        <ellipse cx="40" cy="24" rx="7" ry="4" fill="rgba(255,255,255,0.4)" transform="rotate(-30 40 24)"/>
      </svg>
    ),

    "Радуга": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        {/* Clouds */}
        {[[15,82],[85,82]].map(([cx,cy],i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="10" fill="white" opacity="0.9"/>
            <circle cx={(cx as number)+8} cy={(cy as number)-4} r="8" fill="white" opacity="0.9"/>
            <circle cx={(cx as number)-8} cy={(cy as number)-4} r="8" fill="white" opacity="0.9"/>
          </g>
        ))}
        {/* Rainbow arcs */}
        {[
          ["#ef5350",48],["#ff9800",44],["#ffee58",40],
          ["#66bb6a",36],["#42a5f5",32],["#7e57c2",28],
        ].map(([color,r],i) => (
          <path key={i} d={`M10 82 A${r} ${r} 0 0 1 90 82`}
            fill="none" stroke={color as string} strokeWidth="5" opacity="0.9"/>
        ))}
        {/* Sun */}
        <circle cx="50" cy="30" r="12" fill="#ffd740"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <line key={a} x1={50+15*Math.cos(a*Math.PI/180)} y1={30+15*Math.sin(a*Math.PI/180)}
            x2={50+22*Math.cos(a*Math.PI/180)} y2={30+22*Math.sin(a*Math.PI/180)}
            stroke="#ffd740" strokeWidth="3" strokeLinecap="round"/>
        ))}
        <circle cx="47" cy="27" r="4" fill="rgba(255,255,255,0.5)"/>
      </svg>
    ),

    "Молния": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="50%" stopColor="#fdd835"/>
            <stop offset="100%" stopColor="#f57f17"/>
          </linearGradient>
          <filter id={`${p}-f`}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Glow */}
        <polygon points="56,6 30,52 50,52 44,94 70,44 50,44" fill="#fdd835" filter={`url(#${p}-f)`} opacity="0.5"/>
        {/* Bolt */}
        <polygon points="56,6 30,52 50,52 44,94 70,44 50,44" fill={`url(#${p}-a)`}/>
        {/* Highlight */}
        <polygon points="52,14 36,48 48,48" fill="rgba(255,255,255,0.4)"/>
      </svg>
    ),

    "Самоцвет": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#b9f6ca"/>
            <stop offset="50%" stopColor="#00c853"/>
            <stop offset="100%" stopColor="#1b5e20"/>
          </linearGradient>
        </defs>
        {/* Medal ribbon */}
        <path d="M40 40 L36 10 L50 18 L64 10 L60 40" fill="#e53935"/>
        <path d="M40 40 L36 10 L43 15" fill="#b71c1c"/>
        {/* Medal circle */}
        <circle cx="50" cy="65" r="28" fill="#ffd740"/>
        <circle cx="50" cy="65" r="24" fill={`url(#${p}-a)`}/>
        {/* Facets */}
        <polygon points="50,44 65,55 65,75 50,86 35,75 35,55" fill="rgba(255,255,255,0.15)"/>
        <polygon points="50,44 65,55 50,58 35,55" fill="rgba(255,255,255,0.35)"/>
        <polygon points="50,86 65,75 50,70 35,75" fill="rgba(0,0,0,0.2)"/>
        {/* Star */}
        <polygon points="50,52 52.5,59 60,59 54,63.5 56.5,71 50,66.5 43.5,71 46,63.5 40,59 47.5,59"
          fill="rgba(255,255,255,0.5)"/>
        <ellipse cx="43" cy="52" rx="7" ry="4" fill="rgba(255,255,255,0.5)" transform="rotate(-30 43 52)"/>
      </svg>
    ),

    // ── EPIC ──────────────────────────────────────────────────────────────────

    "Дракон": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ef9a9a"/>
            <stop offset="100%" stopColor="#4a0000"/>
          </radialGradient>
          <radialGradient id={`${p}-b`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff5722"/>
            <stop offset="100%" stopColor="#ff9800"/>
          </radialGradient>
        </defs>
        {/* Wings */}
        <path d="M30 55 Q5 30 10 10 Q25 30 35 45Z" fill="#6d0000" opacity="0.85"/>
        <path d="M70 55 Q95 30 90 10 Q75 30 65 45Z" fill="#6d0000" opacity="0.85"/>
        <path d="M30 55 Q5 30 10 10 Q22 32 32 48Z" fill="#880000" opacity="0.5"/>
        {/* Body/head */}
        <ellipse cx="50" cy="65" rx="32" ry="26" fill={`url(#${p}-a)`}/>
        {/* Horns */}
        <path d="M38 42 Q32 18 36 10 Q42 22 40 42" fill="#b71c1c"/>
        <path d="M62 42 Q68 18 64 10 Q58 22 60 42" fill="#b71c1c"/>
        {/* Snout */}
        <ellipse cx="50" cy="75" rx="20" ry="14" fill="#c62828"/>
        {/* Nostrils */}
        <ellipse cx="44" cy="78" rx="3" ry="2" fill="#4a0000"/>
        <ellipse cx="56" cy="78" rx="3" ry="2" fill="#4a0000"/>
        {/* Eyes */}
        <ellipse cx="38" cy="60" rx="8" ry="7" fill="#ffd740"/>
        <ellipse cx="62" cy="60" rx="8" ry="7" fill="#ffd740"/>
        <ellipse cx="38" cy="60" rx="4" ry="6" fill="#0d0d0d"/>
        <ellipse cx="62" cy="60" rx="4" ry="6" fill="#0d0d0d"/>
        {/* Fire */}
        <ellipse cx="50" cy="92" rx="12" ry="8" fill={`url(#${p}-b)`} opacity="0.9"/>
        <ellipse cx="50" cy="95" rx="7" ry="5" fill="#fff176" opacity="0.8"/>
        {/* Scales */}
        {[[38,52],[50,48],[62,52],[44,62],[56,62]].map(([cx,cy],i) => (
          <ellipse key={i} cx={cx} cy={cy} rx="5" ry="3.5" fill="rgba(0,0,0,0.2)" transform={`rotate(${i*15-30} ${cx} ${cy})`}/>
        ))}
        <ellipse cx="40" cy="57" rx="8" ry="5" fill="rgba(255,255,255,0.2)" transform="rotate(-25 40 57)"/>
      </svg>
    ),

    "Единорог": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff"/>
            <stop offset="100%" stopColor="#e8d0f0"/>
          </radialGradient>
          <linearGradient id={`${p}-b`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff8a80"/>
            <stop offset="33%" stopColor="#ffd740"/>
            <stop offset="66%" stopColor="#69f0ae"/>
            <stop offset="100%" stopColor="#40c4ff"/>
          </linearGradient>
        </defs>
        {/* Mane */}
        <ellipse cx="62" cy="38" rx="14" ry="22" fill={`url(#${p}-b)`} opacity="0.85"/>
        <ellipse cx="70" cy="52" rx="10" ry="18" fill={`url(#${p}-b)`} opacity="0.75"/>
        {/* Head */}
        <ellipse cx="50" cy="58" rx="30" ry="28" fill={`url(#${p}-a)`}/>
        {/* Ear */}
        <polygon points="32,42 26,18 44,34" fill="white"/>
        <polygon points="33,42 28,22 42,34" fill="#f8bbd0"/>
        {/* Horn */}
        <polygon points="50,10 44,36 56,36" fill={`url(#${p}-b)`}/>
        <polygon points="50,10 50,36 56,36" fill="rgba(255,255,255,0.4)"/>
        {/* Eye */}
        <ellipse cx="38" cy="56" rx="9" ry="9" fill="#7b1fa2"/>
        <ellipse cx="38" cy="56" rx="5" ry="6" fill="#0d0d0d"/>
        <circle cx="36" cy="53" r="2.5" fill="white"/>
        {/* Nostril */}
        <ellipse cx="30" cy="70" rx="4" ry="3" fill="#f8bbd0"/>
        {/* Cheek */}
        <ellipse cx="32" cy="64" rx="7" ry="5" fill="#f8bbd0" opacity="0.5"/>
        {/* Stars on mane */}
        {[[62,28,3],[72,44,2.5],[64,52,2]].map(([cx,cy,r],i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.7)"/>
        ))}
        <ellipse cx="44" cy="52" rx="9" ry="5" fill="rgba(255,255,255,0.4)" transform="rotate(-25 44 52)"/>
      </svg>
    ),

    "Феникс": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff176"/>
            <stop offset="50%" stopColor="#ff7043"/>
            <stop offset="100%" stopColor="#b71c1c"/>
          </radialGradient>
          <radialGradient id={`${p}-b`} cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#ff9800"/>
            <stop offset="100%" stopColor="#f44336"/>
          </radialGradient>
        </defs>
        {/* Tail flames */}
        <path d="M50 75 Q30 85 20 100" fill="none" stroke="#ff5722" strokeWidth="6" strokeLinecap="round" opacity="0.7"/>
        <path d="M50 75 Q50 90 45 100" fill="none" stroke="#ff9800" strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
        <path d="M50 75 Q70 85 80 100" fill="none" stroke="#ff5722" strokeWidth="6" strokeLinecap="round" opacity="0.7"/>
        {/* Wings */}
        <path d="M30 50 Q5 25 10 10 Q28 38 40 52Z" fill={`url(#${p}-b)`} opacity="0.9"/>
        <path d="M70 50 Q95 25 90 10 Q72 38 60 52Z" fill={`url(#${p}-b)`} opacity="0.9"/>
        <path d="M30 50 Q5 25 10 10 Q24 38 35 50Z" fill="#ff5722" opacity="0.5"/>
        <path d="M70 50 Q95 25 90 10 Q76 38 65 50Z" fill="#ff5722" opacity="0.5"/>
        {/* Body */}
        <ellipse cx="50" cy="62" rx="22" ry="18" fill={`url(#${p}-a)`}/>
        {/* Head */}
        <ellipse cx="50" cy="40" rx="16" ry="15" fill={`url(#${p}-a)`}/>
        {/* Crest feathers */}
        <path d="M50 26 Q44 10 42 5 Q50 18 50 25" fill="#ff9800"/>
        <path d="M50 26 Q52 8 56 5 Q52 18 50 25" fill="#ffd740"/>
        <path d="M50 26 Q38 14 35 8 Q46 20 49 25" fill="#ff5722"/>
        {/* Eye */}
        <circle cx="44" cy="38" r="6" fill="#0d0d0d"/>
        <circle cx="44" cy="38" r="3.5" fill="#ff9800"/>
        <circle cx="43" cy="37" r="1.5" fill="white"/>
        {/* Beak */}
        <path d="M36 42 L28 46 L36 47 Z" fill="#ffd740"/>
        {/* Glow */}
        <ellipse cx="50" cy="50" rx="35" ry="28" fill="rgba(255,152,0,0.1)"/>
        <ellipse cx="45" cy="37" rx="8" ry="5" fill="rgba(255,255,255,0.3)" transform="rotate(-20 45 37)"/>
      </svg>
    ),

    "Планета": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#90caf9"/>
            <stop offset="60%" stopColor="#1565c0"/>
            <stop offset="100%" stopColor="#0d0a2e"/>
          </radialGradient>
          <linearGradient id={`${p}-b`} x1="0%" y1="40%" x2="100%" y2="60%">
            <stop offset="0%" stopColor="#ce93d8"/>
            <stop offset="50%" stopColor="#9c27b0"/>
            <stop offset="100%" stopColor="#4a0080"/>
          </linearGradient>
        </defs>
        {/* Ring back */}
        <ellipse cx="50" cy="58" rx="46" ry="12" fill="none" stroke={`url(#${p}-b)`} strokeWidth="10" opacity="0.5"/>
        {/* Planet */}
        <circle cx="50" cy="50" r="34" fill={`url(#${p}-a)`}/>
        {/* Land masses */}
        <ellipse cx="42" cy="38" rx="14" ry="9" fill="#4caf50" opacity="0.6" transform="rotate(-20 42 38)"/>
        <ellipse cx="62" cy="55" rx="10" ry="7" fill="#4caf50" opacity="0.5" transform="rotate(15 62 55)"/>
        <ellipse cx="35" cy="60" rx="8" ry="5" fill="#4caf50" opacity="0.4" transform="rotate(-10 35 60)"/>
        {/* Clouds */}
        <ellipse cx="50" cy="32" rx="18" ry="4" fill="rgba(255,255,255,0.25)" transform="rotate(-10 50 32)"/>
        <ellipse cx="38" cy="50" rx="10" ry="3" fill="rgba(255,255,255,0.2)" transform="rotate(15 38 50)"/>
        {/* Ring front */}
        <path d="M4 58 Q50 76 96 58" fill="none" stroke={`url(#${p}-b)`} strokeWidth="10" opacity="0.85"/>
        {/* Shine */}
        <ellipse cx="38" cy="32" rx="14" ry="8" fill="rgba(255,255,255,0.35)" transform="rotate(-30 38 32)"/>
        {/* Stars */}
        {[[8,15,2],[88,20,1.5],[12,78,1.5],[90,70,2]].map(([cx,cy,r],i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity="0.6"/>
        ))}
      </svg>
    ),

    "Волшебство": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e1bee7"/>
            <stop offset="100%" stopColor="#6a1b9a"/>
          </linearGradient>
          <linearGradient id={`${p}-b`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fff176"/>
            <stop offset="100%" stopColor="#ffd740"/>
          </linearGradient>
        </defs>
        {/* Sparkles */}
        {[[18,20,8],[80,15,6],[88,72,7],[15,75,5],[55,8,6]].map(([cx,cy,r],i) => (
          <g key={i}>
            <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="#ffd740" strokeWidth="2" opacity="0.8"/>
            <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="#ffd740" strokeWidth="2" opacity="0.8"/>
            <line x1={cx-r*0.7} y1={cy-r*0.7} x2={cx+r*0.7} y2={cy+r*0.7} stroke="#ffd740" strokeWidth="1.2" opacity="0.5"/>
            <line x1={cx+r*0.7} y1={cy-r*0.7} x2={cx-r*0.7} y2={cy+r*0.7} stroke="#ffd740" strokeWidth="1.2" opacity="0.5"/>
          </g>
        ))}
        {/* Wand */}
        <rect x="28" y="72" width="44" height="8" rx="4" fill={`url(#${p}-a)`} transform="rotate(-45 50 50)"/>
        {/* Wand tip star */}
        <polygon points="70,30 73,38 82,38 75,43 78,52 70,47 62,52 65,43 58,38 67,38"
          fill={`url(#${p}-b)`}/>
        <polygon points="70,33 72.5,39 79,39 74,43 76,49 70,45 64,49 66,43 61,39 67.5,39"
          fill="rgba(255,255,255,0.5)"/>
        {/* Trail */}
        <path d="M62 38 Q42 52 22 72" fill="none" stroke="#ce93d8" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 3" opacity="0.6"/>
        <circle cx="67" cy="30" r="3" fill="rgba(255,255,255,0.7)"/>
      </svg>
    ),

    "Кристалл": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#e3f2fd"/>
            <stop offset="50%" stopColor="#1565c0"/>
            <stop offset="100%" stopColor="#0a0a2e"/>
          </radialGradient>
          <radialGradient id={`${p}-b`} cx="40%" cy="35%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)"/>
            <stop offset="100%" stopColor="rgba(100,200,255,0)"/>
          </radialGradient>
          <filter id={`${p}-f`}><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Glow */}
        <circle cx="50" cy="52" r="40" fill="#1565c0" opacity="0.25" filter={`url(#${p}-f)`}/>
        {/* Ball */}
        <circle cx="50" cy="52" r="36" fill={`url(#${p}-a)`}/>
        {/* Inner swirl */}
        <path d="M30 40 Q50 30 70 50 Q60 70 40 65 Q20 58 30 40Z" fill="rgba(100,181,246,0.3)"/>
        <path d="M35 55 Q55 42 68 58 Q58 74 42 70 Q25 63 35 55Z" fill="rgba(255,255,255,0.12)"/>
        {/* Nebula */}
        <circle cx="55" cy="45" r="12" fill="rgba(206,147,216,0.3)"/>
        <circle cx="42" cy="58" r="8" fill="rgba(79,195,247,0.25)"/>
        {/* Stars inside */}
        {[[44,38,2],[62,52,1.5],[38,60,1.5],[58,64,2]].map(([cx,cy,r],i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.7)"/>
        ))}
        {/* Highlight */}
        <circle cx="50" cy="52" r="36" fill={`url(#${p}-b)`}/>
        <ellipse cx="38" cy="36" rx="14" ry="9" fill="rgba(255,255,255,0.45)" transform="rotate(-30 38 36)"/>
        {/* Stand */}
        <rect x="44" y="86" width="12" height="6" rx="3" fill="#37474f"/>
        <rect x="38" y="90" width="24" height="5" rx="2.5" fill="#546e7a"/>
      </svg>
    ),

    // ── LEGENDARY ─────────────────────────────────────────────────────────────

    "Галактика": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="20%" stopColor="#f8bbd0"/>
            <stop offset="50%" stopColor="#7c4dff"/>
            <stop offset="100%" stopColor="#0a0a1e"/>
          </radialGradient>
        </defs>
        {/* Stars field */}
        {[[10,12],[85,8],[5,50],[95,45],[15,88],[90,80],[50,5],[8,70],[92,65],[45,95]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={[1.5,1,2,1,1.5,1,2,1,1.5,1][i]} fill="white" opacity={[0.9,0.7,0.8,0.6,0.9,0.7,0.8,0.6,0.9,0.7][i]}/>
        ))}
        {/* Galaxy disc */}
        <ellipse cx="50" cy="50" rx="44" ry="24" fill={`url(#${p}-a)`} transform="rotate(-20 50 50)"/>
        {/* Spiral arms */}
        <path d="M50 50 Q72 36 90 40" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round"/>
        <path d="M50 50 Q28 64 10 60" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round"/>
        <path d="M50 50 Q66 64 72 80" fill="none" stroke="rgba(200,160,255,0.35)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M50 50 Q34 36 28 20" fill="none" stroke="rgba(200,160,255,0.35)" strokeWidth="5" strokeLinecap="round"/>
        {/* Core */}
        <circle cx="50" cy="50" r="14" fill="rgba(255,249,196,0.7)"/>
        <circle cx="50" cy="50" r="7" fill="#fff9c4"/>
        <circle cx="48" cy="48" r="3" fill="white"/>
      </svg>
    ),

    "Ангел": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <radialGradient id={`${p}-a`} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff"/>
            <stop offset="100%" stopColor="#f0e6ff"/>
          </radialGradient>
          <radialGradient id={`${p}-b`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="100%" stopColor="#f9a825"/>
          </radialGradient>
        </defs>
        {/* Halo */}
        <ellipse cx="50" cy="14" rx="22" ry="7" fill="none" stroke={`url(#${p}-b)`} strokeWidth="5"/>
        <ellipse cx="50" cy="12" rx="20" ry="5" fill="none" stroke="#ffd740" strokeWidth="2" opacity="0.5"/>
        {/* Left wing */}
        <path d="M32 55 Q5 38 8 15 Q22 42 36 52Z" fill="white" opacity="0.9"/>
        <path d="M32 55 Q2 50 5 30 Q20 50 33 54Z" fill="white" opacity="0.7"/>
        <path d="M32 55 Q8 65 12 82 Q24 62 34 57Z" fill="white" opacity="0.8"/>
        {/* Right wing */}
        <path d="M68 55 Q95 38 92 15 Q78 42 64 52Z" fill="white" opacity="0.9"/>
        <path d="M68 55 Q98 50 95 30 Q80 50 67 54Z" fill="white" opacity="0.7"/>
        <path d="M68 55 Q92 65 88 82 Q76 62 66 57Z" fill="white" opacity="0.8"/>
        {/* Body/robe */}
        <path d="M36 55 Q38 80 50 90 Q62 80 64 55 Q58 60 50 62 Q42 60 36 55Z" fill="white" opacity="0.9"/>
        {/* Head */}
        <circle cx="50" cy="38" r="18" fill={`url(#${p}-a)`}/>
        {/* Face */}
        <ellipse cx="44" cy="36" rx="3" ry="3.5" fill="#1a237e"/>
        <ellipse cx="56" cy="36" rx="3" ry="3.5" fill="#1a237e"/>
        <path d="M44 44 Q50 48 56 44" fill="none" stroke="#f06292" strokeWidth="2" strokeLinecap="round"/>
        {/* Cheeks */}
        <circle cx="41" cy="42" r="4" fill="#f48fb1" opacity="0.4"/>
        <circle cx="59" cy="42" r="4" fill="#f48fb1" opacity="0.4"/>
        <ellipse cx="44" cy="32" rx="7" ry="4" fill="rgba(255,255,255,0.55)" transform="rotate(-25 44 32)"/>
        {/* Wing feather lines */}
        {[38,46,54].map((y,i) => (
          <path key={i} d={`M32 ${y} Q18 ${y-4} 10 ${y+2}`} fill="none" stroke="rgba(200,200,220,0.6)" strokeWidth="1.5"/>
        ))}
        {[38,46,54].map((y,i) => (
          <path key={i} d={`M68 ${y} Q82 ${y-4} 90 ${y+2}`} fill="none" stroke="rgba(200,200,220,0.6)" strokeWidth="1.5"/>
        ))}
      </svg>
    ),

    "Пульс": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ce93d8"/>
            <stop offset="50%" stopColor="#e040fb"/>
            <stop offset="100%" stopColor="#7c4dff"/>
          </linearGradient>
          <filter id={`${p}-f`}><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Background glow */}
        <rect x="5" y="38" width="90" height="24" rx="12" fill="#1e0038" opacity="0.7"/>
        {/* Pulse line glow */}
        <path d="M8 50 L22 50 L30 28 L38 72 L46 50 L54 50 L62 32 L70 68 L76 50 L92 50"
          fill="none" stroke="#e040fb" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#${p}-f)`} opacity="0.5"/>
        {/* Pulse line */}
        <path d="M8 50 L22 50 L30 28 L38 72 L46 50 L54 50 L62 32 L70 68 L76 50 L92 50"
          fill="none" stroke={`url(#${p}-a)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Heart above */}
        <path d="M50 24 C44 18, 34 20, 34 29 A10 10 0 0 0 50 42 A10 10 0 0 0 66 29 C66 20, 56 18, 50 24Z"
          fill="#e040fb" opacity="0.9"/>
        <ellipse cx="43" cy="27" rx="6" ry="4" fill="rgba(255,255,255,0.35)" transform="rotate(-20 43 27)"/>
        {/* Dot on line */}
        <circle cx="46" cy="50" r="5" fill="#fff" opacity="0.95"/>
        <circle cx="46" cy="50" r="3" fill="#e040fb"/>
      </svg>
    ),

    "Звезда": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="50%" stopColor="#ffd740"/>
            <stop offset="100%" stopColor="#e65100"/>
          </linearGradient>
          <filter id={`${p}-f`}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Trail */}
        <path d="M25 75 L72 28" stroke="rgba(255,215,64,0.5)" strokeWidth="12" strokeLinecap="round"
          filter={`url(#${p}-f)`}/>
        <path d="M25 75 L72 28" stroke="rgba(255,249,196,0.6)" strokeWidth="5" strokeLinecap="round"/>
        {/* Sparkles on trail */}
        {[[35,65,5],[45,55,4],[55,44,3]].map(([cx,cy,r],i) => (
          <g key={i}>
            <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="#fff9c4" strokeWidth="1.5" opacity={0.8-i*0.2}/>
            <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="#fff9c4" strokeWidth="1.5" opacity={0.8-i*0.2}/>
          </g>
        ))}
        {/* Star */}
        <g transform="translate(72,28) rotate(15)">
          <polygon points="0,-22 5.1,-8.6 19,-8.6 8,-0.5 12,14 0,6 -12,14 -8,-0.5 -19,-8.6 -5.1,-8.6"
            fill={`url(#${p}-a)`} filter={`url(#${p}-f)`} opacity="0.5"/>
          <polygon points="0,-22 5.1,-8.6 19,-8.6 8,-0.5 12,14 0,6 -12,14 -8,-0.5 -19,-8.6 -5.1,-8.6"
            fill={`url(#${p}-a)`}/>
          <ellipse cx="-7" cy="-14" rx="6" ry="4" fill="rgba(255,255,255,0.55)" transform="rotate(-30 -7 -14)"/>
        </g>
        {/* Background stars */}
        {[[12,20],[85,35],[10,65],[90,70]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={[2,1.5,1.5,2][i]} fill="white" opacity="0.5"/>
        ))}
      </svg>
    ),

    "Бесконечность": (
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id={`${p}-a`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4dd0e1"/>
            <stop offset="25%" stopColor="#7c4dff"/>
            <stop offset="50%" stopColor="#e040fb"/>
            <stop offset="75%" stopColor="#ff4081"/>
            <stop offset="100%" stopColor="#4dd0e1"/>
          </linearGradient>
          <filter id={`${p}-f`}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Stars */}
        {[[10,15],[90,12],[8,80],[92,78],[50,8],[50,92]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="white" opacity="0.5"/>
        ))}
        {/* Glow */}
        <path d="M20 50 C20 30, 46 30, 50 50 C54 70, 80 70, 80 50 C80 30, 54 30, 50 50 C46 70, 20 70, 20 50Z"
          fill="none" stroke={`url(#${p}-a)`} strokeWidth="14" strokeLinecap="round"
          filter={`url(#${p}-f)`} opacity="0.5"/>
        {/* Main ∞ */}
        <path d="M20 50 C20 30, 46 30, 50 50 C54 70, 80 70, 80 50 C80 30, 54 30, 50 50 C46 70, 20 70, 20 50Z"
          fill="none" stroke={`url(#${p}-a)`} strokeWidth="8" strokeLinecap="round"/>
        {/* Inner shine */}
        <path d="M20 50 C20 34, 42 34, 50 50" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <path d="M50 50 C58 66, 80 66, 80 50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
        {/* Center dot */}
        <circle cx="50" cy="50" r="5" fill="white" opacity="0.9"/>
        <circle cx="50" cy="50" r="3" fill="#e040fb"/>
        {/* Orbiting dots */}
        <circle cx="28" cy="42" r="3.5" fill="#4dd0e1" opacity="0.9"/>
        <circle cx="72" cy="58" r="3.5" fill="#ff4081" opacity="0.9"/>
      </svg>
    ),
  };

  return arts[name] ?? (
    // Fallback for any gift not in the map
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <radialGradient id={`${p}-fallback`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#b0bec5"/>
          <stop offset="100%" stopColor="#263238"/>
        </radialGradient>
      </defs>
      <polygon points="50,12 61,38 90,38 67,56 76,82 50,65 24,82 33,56 10,38 39,38"
        fill={`url(#${p}-fallback)`}/>
      <ellipse cx="42" cy="30" rx="9" ry="5" fill="rgba(255,255,255,0.4)" transform="rotate(-25 42 30)"/>
    </svg>
  );
}
