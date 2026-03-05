import { motion } from 'framer-motion'

/**
 * Cute anime-style character for Guided Chapters - simple SVG mascot
 */
export function LessonCharacter({ variant = 'default', size = 'md', animate = true }) {
  const sizes = { sm: 48, md: 80, lg: 120 }
  const s = sizes[size] || 80

  return (
    <motion.div
      animate={animate ? { y: [0, -4, 0], scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-flex items-center justify-center"
      style={{ width: s, height: s }}
    >
      <svg
        viewBox="0 0 100 100"
        width={s}
        height={s}
        className="drop-shadow-md"
      >
        {/* Head */}
        <circle cx="50" cy="42" r="28" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
        {/* Blush */}
        <ellipse cx="35" cy="48" rx="6" ry="4" fill="#FDA4AF" opacity="0.6" />
        <ellipse cx="65" cy="48" rx="6" ry="4" fill="#FDA4AF" opacity="0.6" />
        {/* Eyes */}
        <ellipse cx="40" cy="40" rx="4" ry="5" fill="#1E293B" />
        <ellipse cx="60" cy="40" rx="4" ry="5" fill="#1E293B" />
        <circle cx="41" cy="38" r="1" fill="white" />
        <circle cx="61" cy="38" r="1" fill="white" />
        {/* Smile */}
        <path d="M 38 52 Q 50 60 62 52" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Bow / hair accessory */}
        <ellipse cx="50" cy="18" rx="12" ry="6" fill="#F472B6" />
        <circle cx="50" cy="18" r="4" fill="#EC4899" />
      </svg>
    </motion.div>
  )
}
