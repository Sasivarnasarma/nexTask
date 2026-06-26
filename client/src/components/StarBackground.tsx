import React, { useMemo } from 'react';

interface Star {
  id: number;
  left: string;
  top: string;
  size: string;
  duration: string;
  delay: string;
  opacity: number;
}

export const StarBackground: React.FC = () => {
  const stars = useMemo<Star[]>(() => {
    const starCount = 80;
    const generated: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      generated.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${1 + Math.random() * 2.5}px`, // 1px to 3.5px
        duration: `${3 + Math.random() * 5}s`, // 3s to 8s
        delay: `${Math.random() * 5}s`,
        opacity: 0.1 + Math.random() * 0.4,
      });
    }
    return generated;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDuration: star.duration,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
};
