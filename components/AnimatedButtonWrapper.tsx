import { ReactNode, useEffect, useState } from "react";

interface AnimatedButtonWrapperProps {
  children: ReactNode;
  delay?: number;
}

export default function AnimatedButtonWrapper({ children, delay = 0 }: AnimatedButtonWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-all duration-500 ${
        isVisible 
          ? "opacity-100 scale-100 translate-y-0" 
          : "opacity-0 scale-95 translate-y-1"
      }`}
    >
      {children}
    </div>
  );
}