import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 20 - 10,
        y: (e.clientY / window.innerHeight) * 20 - 10,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative px-6 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
        }}
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight pb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          Automated SLA & NDA Engine
        </h1>
        <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12">
          Experience the future of contract generation. Seamless, secure, and instantaneous.
        </p>
      </motion.div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="w-[90vw] max-w-[800px] aspect-square rounded-full border border-white/5 border-dashed"
        />
      </div>

      <motion.div 
        className="absolute bottom-8 p-4 animate-bounce cursor-pointer flex flex-col items-center text-gray-500 hover:text-glow transition-colors"
        onClick={() => {
          document.getElementById('intake-form').scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="text-sm mb-2 uppercase tracking-widest">Begin Intake</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-current to-transparent" />
      </motion.div>
    </div>
  );
}
