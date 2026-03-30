"use client";

interface Props { topicId: string; langName?: string; }

// ── Scene definitions by topic keyword ────────────────────────────────────────

function GreetingsScene() {
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-amber-900/40 to-orange-800/20 flex items-end justify-center pb-2">
      {/* Sun rising */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-yellow-400/30 border-2 border-yellow-400/50"
        style={{ animation: "av-float 3s ease-in-out infinite" }} />
      {/* Two characters */}
      <div className="flex gap-16 items-end">
        <div className="flex flex-col items-center gap-1" style={{ animation: "av-float 2.5s ease-in-out infinite" }}>
          <div className="bg-white/90 rounded-xl px-2 py-1 text-black text-xs font-bold relative">
            👋
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 rotate-45" />
          </div>
          <span className="text-3xl">🧑</span>
        </div>
        <div className="flex flex-col items-center gap-1" style={{ animation: "av-float 2.5s ease-in-out infinite", animationDelay: "1.2s" }}>
          <div className="bg-white/90 rounded-xl px-2 py-1 text-black text-xs font-bold relative">
            👋
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 rotate-45" />
          </div>
          <span className="text-3xl">👩</span>
        </div>
      </div>
    </div>
  );
}

function ShoppingScene() {
  const items = ["🍎", "🥖", "🧀", "💧"];
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-green-900/40 to-emerald-800/20 flex items-end justify-center pb-2">
      {/* Shelf */}
      <div className="absolute top-8 left-8 right-8 h-1 bg-white/20 rounded-full" />
      {/* Items on shelf */}
      {items.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-2xl"
          style={{
            left: `${18 + i * 20}%`,
            top: "6px",
            animation: `av-float 2s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        >{emoji}</span>
      ))}
      {/* Shopper */}
      <div className="flex items-end gap-2" style={{ animation: "av-float 2.5s ease-in-out infinite", animationDelay: "0.5s" }}>
        <span className="text-4xl">🧺</span>
        <span className="text-3xl">🧑</span>
      </div>
    </div>
  );
}

function RestaurantScene() {
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-orange-900/40 to-red-800/20 flex items-end justify-center pb-2">
      {/* Table */}
      <div className="absolute bottom-12 left-12 right-12 h-2 bg-amber-800/60 rounded-full" />
      {/* Food items */}
      {["🍝", "🥗", "🍷"].map((e, i) => (
        <span
          key={i}
          className="absolute text-xl"
          style={{
            bottom: "56px",
            left: `${28 + i * 20}%`,
            animation: "av-float 2s ease-in-out infinite",
            animationDelay: `${i * 0.4}s`,
          }}
        >{e}</span>
      ))}
      {/* Steam from plate */}
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute bottom-16 text-white/20 text-xs select-none pointer-events-none"
          style={{
            left: `${40 + i * 8}%`,
            animation: `av-steam 2s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        >〰️</div>
      ))}
      {/* Waiter */}
      <span className="text-3xl" style={{ animation: "av-float 3s ease-in-out infinite" }}>🧑‍🍳</span>
    </div>
  );
}

function FamilyScene() {
  const family = [
    { emoji: "👨", scale: 1,    delay: "0s"   },
    { emoji: "👩", scale: 0.95, delay: "0.5s" },
    { emoji: "🧒", scale: 0.7,  delay: "1s"   },
  ];
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-900/40 to-indigo-800/20 flex items-end justify-center pb-2 gap-4">
      {family.map(({ emoji, scale, delay }) => (
        <span
          key={emoji}
          className="text-4xl"
          style={{
            transform: `scale(${scale})`,
            animation: "av-float 2.5s ease-in-out infinite",
            animationDelay: delay,
          }}
        >{emoji}</span>
      ))}
    </div>
  );
}

function ClockScene() {
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-purple-900/40 to-violet-800/20 flex items-center justify-center gap-8">
      {/* Analogue clock */}
      <div className="relative w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center">
        {/* Minute hand */}
        <div
          className="absolute bottom-1/2 left-1/2 w-0.5 h-8 bg-white origin-bottom rounded-full"
          style={{ transformOrigin: "bottom center", animation: "av-clock-min 10s linear infinite" }}
        />
        {/* Hour hand */}
        <div
          className="absolute bottom-1/2 left-1/2 w-1 h-5 bg-white/70 origin-bottom rounded-full"
          style={{ transformOrigin: "bottom center", animation: "av-clock-hour 120s linear infinite" }}
        />
        <div className="w-2 h-2 rounded-full bg-white" />
        {/* 12 o'clock dot */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
      </div>
      {/* Numbers cycling */}
      <div className="flex flex-col items-center gap-1">
        {[1, 2, 3, 4, 5].map((n, i) => (
          <span
            key={n}
            className="text-white/40 text-sm font-mono font-bold"
            style={{ animation: "av-float 2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
          >{n}</span>
        ))}
      </div>
    </div>
  );
}

function BodyScene() {
  const parts = [
    { emoji: "🧠", x: "45%", y: "8%",  delay: "0s"   },
    { emoji: "👁️", x: "62%", y: "14%", delay: "0.2s" },
    { emoji: "✋", x: "15%", y: "38%", delay: "0.4s" },
    { emoji: "✋", x: "72%", y: "38%", delay: "0.6s" },
    { emoji: "🦵", x: "35%", y: "72%", delay: "0.8s" },
    { emoji: "🦵", x: "52%", y: "72%", delay: "1.0s" },
  ];
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-teal-900/40 to-cyan-800/20">
      <span className="absolute text-5xl" style={{ left: "38%", top: "10%", animation: "av-float 3s ease-in-out infinite" }}>🧍</span>
      {parts.map(({ emoji, x, y, delay }) => (
        <div
          key={emoji + x}
          className="absolute text-lg"
          style={{ left: x, top: y, animation: `av-ping 2s ease-in-out infinite`, animationDelay: delay }}
        >{emoji}</div>
      ))}
    </div>
  );
}

function ColorsScene() {
  const colors = [
    { emoji: "🔴", label: "red" },
    { emoji: "🔵", label: "blue" },
    { emoji: "🟢", label: "green" },
    { emoji: "🟡", label: "yellow" },
    { emoji: "🟠", label: "orange" },
    { emoji: "🟣", label: "purple" },
  ];
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900/60 to-gray-800/30 flex items-center justify-center">
      <div className="flex flex-wrap gap-4 justify-center px-4">
        {colors.map(({ emoji }, i) => (
          <span
            key={emoji}
            className="text-3xl"
            style={{ animation: "av-float 2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
          >{emoji}</span>
        ))}
      </div>
    </div>
  );
}

function DirectionsScene() {
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900/60 to-gray-800/30 flex items-center justify-center gap-6">
      {/* Compass arrows */}
      {["↑", "→", "↓", "←"].map((arrow, i) => (
        <span
          key={arrow}
          className="text-3xl font-bold text-white/60"
          style={{ animation: "av-float 2s ease-in-out infinite", animationDelay: `${i * 0.3}s` }}
        >{arrow}</span>
      ))}
      <span className="text-4xl absolute" style={{ animation: "av-float 2s ease-in-out infinite" }}>🧭</span>
    </div>
  );
}

function DefaultScene({ topicId }: { topicId: string }) {
  // Generic visual using the topic ID as seed for color
  const palette = ["from-blue-900/40 to-indigo-800/20", "from-purple-900/40 to-violet-800/20",
    "from-teal-900/40 to-cyan-800/20", "from-rose-900/40 to-pink-800/20"];
  const idx = topicId.length % palette.length;
  return (
    <div className={`relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b ${palette[idx]} flex items-center justify-center`}>
      <span className="text-5xl" style={{ animation: "av-float 3s ease-in-out infinite" }}>📖</span>
    </div>
  );
}

// ── Scene selector ─────────────────────────────────────────────────────────────

function pickScene(topicId: string): React.ReactNode {
  const id = topicId.toLowerCase();
  if (id.includes("greet") || id.includes("hello") || id.includes("intro")) return <GreetingsScene />;
  if (id.includes("shop") || id.includes("grocery") || id.includes("market") || id.includes("buy")) return <ShoppingScene />;
  if (id.includes("food") || id.includes("restaurant") || id.includes("eat") || id.includes("order") || id.includes("drink")) return <RestaurantScene />;
  if (id.includes("family") || id.includes("relatives")) return <FamilyScene />;
  if (id.includes("time") || id.includes("number") || id.includes("clock") || id.includes("count") || id.includes("date")) return <ClockScene />;
  if (id.includes("body") || id.includes("health") || id.includes("anatomy")) return <BodyScene />;
  if (id.includes("color") || id.includes("colour")) return <ColorsScene />;
  if (id.includes("direction") || id.includes("travel") || id.includes("transport") || id.includes("navigation")) return <DirectionsScene />;
  return <DefaultScene topicId={topicId} />;
}

// ── Global keyframes — injected once ─────────────────────────────────────────

const KEYFRAMES = `
@keyframes av-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
@keyframes av-steam {
  0%   { opacity: 0; transform: translateY(0); }
  50%  { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-20px); }
}
@keyframes av-clock-min  { to { transform: rotate(360deg); } }
@keyframes av-clock-hour { to { transform: rotate(360deg); } }
@keyframes av-ping {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.2); }
}
`;

export default function LessonScene({ topicId }: Props) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {pickScene(topicId)}
    </>
  );
}
