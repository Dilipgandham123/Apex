"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const easeOut = [0.23, 1, 0.32, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  amount?: number;
};

export function Reveal({
  children,
  className,
  delay = 0,
  distance = 20,
  amount = 0.2,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: reduceMotion ? "none" : `translateY(${distance}px)` }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.48, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  interval?: number;
  amount?: number;
};

export function Stagger({
  children,
  className,
  delay = 0,
  interval = 0.06,
  amount = 0.15,
}: StaggerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: interval } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, transform: reduceMotion ? "none" : "translateY(16px)" },
        visible: {
          opacity: 1,
          transform: "translateY(0px)",
          transition: { duration: 0.44, ease: easeOut },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={className}
      variants={{
        hidden: { opacity: 0, transform: reduceMotion ? "none" : "translateY(40px)" },
        visible: {
          opacity: 1,
          transform: "translateY(0px)",
          transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.article>
  );
}

export function HeroScrollFade({ children, className }: { children: ReactNode; className?: string }) {
  const target = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end start"],
  });
  const targetOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 0.15, 0.15]);
  const opacity = useSpring(targetOpacity, { stiffness: 120, damping: 30, mass: 0.25 });

  return (
    <motion.div ref={target} className={className} style={{ opacity: reduceMotion ? 1 : opacity }}>
      {children}
    </motion.div>
  );
}

type AnimatedCTAProps = {
  children: ReactNode;
  className?: string;
  href: string;
  onClick?: () => void;
};

export function AnimatedCTA({ children, className, href, onClick }: AnimatedCTAProps) {
  return (
    <motion.a
      className={className}
      href={href}
      onClick={onClick}
      whileHover={{ transform: "translateY(-2px)" }}
      whileTap={{ transform: "scale(0.97)" }}
      transition={{ duration: 0.16, ease: easeOut }}
    >
      {children}
    </motion.a>
  );
}

type ScrollMediaProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
};

export function ScrollMedia({ children, className, distance = 36 }: ScrollMediaProps) {
  const target = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start end", "end start"],
  });
  const translateY = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const transform = useTransform(translateY, value => `translateY(${value}px)`);

  return (
    <motion.div
      ref={target}
      className={className}
      style={{ transform: reduceMotion ? "none" : transform }}
    >
      {children}
    </motion.div>
  );
}

type CountUpProps = {
  value: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
};

export function CountUp({
  value,
  className,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.2,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) return;

    const unsubscribe = progress.on("change", latest => setDisplay(latest));
    const controls = animate(progress, value, { duration, ease: easeOut });
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [duration, isInView, progress, reduceMotion, value]);

  const renderedValue = reduceMotion ? value : display;
  return <span ref={ref} className={className}>{prefix}{renderedValue.toFixed(decimals)}{suffix}</span>;
}
