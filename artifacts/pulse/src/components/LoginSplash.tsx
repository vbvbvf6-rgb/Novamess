import { motion } from "framer-motion";
import PulseLogo from "@/components/PulseLogo";

/**
 * Full-screen entry animation shown briefly right after a successful login
 * or registration, before the main app UI takes over. Purely decorative —
 * unmounts itself via the `onDone` callback after the animation finishes.
 */
export function LoginSplash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-background overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } }}
      onAnimationComplete={() => {}}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-full bg-primary/25 blur-[100px]"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.3, 1.1], opacity: [0, 0.9, 0.6] }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* Expanding rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-primary/40"
          style={{ width: 120, height: 120 }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 6 + i * 1.5, opacity: 0 }}
          transition={{ duration: 1.3, delay: 0.15 + i * 0.12, ease: "easeOut" }}
        />
      ))}

      {/* Logo pop */}
      <motion.div
        className="relative flex flex-col items-center gap-4"
        initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
        onAnimationComplete={() => {
          setTimeout(onDone, 650);
        }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <PulseLogo size={88} />
        </motion.div>
        <motion.span
          className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary via-orange-400 to-amber-300 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          Nova
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
