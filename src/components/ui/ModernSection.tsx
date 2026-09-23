import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Reveal-on-scroll with an IntersectionObserver and a CSS transition. This was
// framer-motion's motion.div + useInView, which put ~39 KB gz of framer-motion
// on the landing page's critical path for a fade-and-slide (US-388).

interface ModernSectionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    width?: 'full' | 'contained' | 'wide';
    background?: 'none' | 'mesh' | 'grid' | 'glass';
    id?: string;
}

const DISTANCE_PX = 50;

const hiddenTransform = (direction: ModernSectionProps['direction']): string => {
    switch (direction) {
        case 'up': return `translate3d(0, ${DISTANCE_PX}px, 0)`;
        case 'down': return `translate3d(0, -${DISTANCE_PX}px, 0)`;
        case 'left': return `translate3d(${DISTANCE_PX}px, 0, 0)`;
        case 'right': return `translate3d(-${DISTANCE_PX}px, 0, 0)`;
        default: return 'none';
    }
};

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const ModernSection: React.FC<ModernSectionProps> = ({
    children,
    className,
    delay = 0,
    direction = 'up',
    width = 'contained',
    background = 'none',
    id
}) => {
    const ref = useRef<HTMLDivElement>(null);
    // No observer (old browser, test env) or reduced motion: render visible.
    const [isInView, setIsInView] = useState(
        () => typeof IntersectionObserver === 'undefined' || prefersReducedMotion()
    );

    useEffect(() => {
        if (isInView) return;
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '-100px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [isInView]);

    const revealStyle: React.CSSProperties = {
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'none' : hiddenTransform(direction),
        transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: `${delay}s`,
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

            <div ref={ref} style={revealStyle} className={getWidthClass()}>
                {children}
            </div>
        </section>
    );
};

export default ModernSection;
