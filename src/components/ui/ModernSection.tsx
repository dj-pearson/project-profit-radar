import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernSectionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    width?: 'full' | 'contained' | 'wide';
    background?: 'none' | 'mesh' | 'grid' | 'glass';
    id?: string;
}

const ModernSection: React.FC<ModernSectionProps> = ({
    children,
    className,
    delay = 0,
    direction = 'up',
    width = 'contained',
    background = 'none',
    id
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const getVariants = (): Variants => {
        const distance = 50;

        const initial: any = { opacity: 0 };
        if (direction === 'up') initial.y = distance;
        if (direction === 'down') initial.y = -distance;
        if (direction === 'left') initial.x = distance;
        if (direction === 'right') initial.x = -distance;

        return {
            hidden: initial,
            visible: {
                opacity: 1,
                x: 0,
                y: 0,
                transition: {
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                    delay: delay
                }
            }
        };
    };

    const getBackgroundClass = () => {
        switch (background) {
            case 'mesh': return 'bg-mesh';
            case 'grid': return 'bg-grid-pattern';
            case 'glass': return 'glass-panel';
            default: return '';
        }
    };

    const getWidthClass = () => {
        switch (width) {
            case 'contained': return 'container mx-auto px-4 sm:px-6 lg:px-8';
            case 'wide': return 'max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8';
            case 'full': return 'w-full';
            default: return 'container mx-auto';
        }
    };

    return (
        <section id={id} className={cn("relative py-16 sm:py-24 overflow-hidden", getBackgroundClass(), className)}>
            {background === 'grid' && (
                <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
            )}

            <motion.div
                ref={ref}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                variants={getVariants()}
                className={getWidthClass()}
            >
                {children}
            </motion.div>
        </section>
    );
};

export default ModernSection;
