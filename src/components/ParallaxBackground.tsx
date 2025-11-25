import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ParallaxBackground = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const y3 = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);

    return (
        <div ref={ref} className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            {/* Gradient Orb 1 */}
            <motion.div
                style={{ y: y1, opacity }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[100px]"
            />

            {/* Gradient Orb 2 */}
            <motion.div
                style={{ y: y2, opacity }}
                className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 blur-[100px]"
            />

            {/* Gradient Orb 3 */}
            <motion.div
                style={{ y: y3 }}
                className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-500/5 blur-[100px]"
            />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
        </div>
    );
};

export default ParallaxBackground;
