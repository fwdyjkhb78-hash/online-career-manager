import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

export default function TabPanel({ children }) {
  return (
    <motion.div
      key={Math.random()}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}