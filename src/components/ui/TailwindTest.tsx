'use client';

import { motion } from 'framer-motion';

export default function TailwindTest() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Tailwind CSS Test Component
      </h2>
      
      {/* Test basic Tailwind classes */}
      <div className="space-y-4">
        <div className="p-4 bg-blue-500 text-white rounded-lg">
          Basic Tailwind: bg-blue-500 text-white
        </div>
        
        <div className="p-4 bg-red-500 text-white rounded-lg">
          Another basic class: bg-red-500
        </div>
      </div>

      {/* Test our custom colors */}
      <div className="space-y-4">
        <div className="p-4 bg-primary text-white rounded-lg">
          Custom color: bg-primary
        </div>
        
        <div className="p-4 bg-secondary text-white rounded-lg">
          Custom color: bg-secondary
        </div>
        
        <div className="p-4 bg-secondary text-white rounded-lg">
          Custom color: bg-secondary
        </div>
      </div>

      {/* Test glassmorphism */}
      <div className="space-y-4">
        <div className="glass p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-2">Glassmorphism Effect</h3>
          <p>This should have a glass-like appearance with backdrop blur.</p>
        </div>
      </div>

      {/* Test gradient text */}
      <div className="space-y-4">
        <h3 className="gradient-text text-3xl font-bold">
          Gradient Text Effect
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          The text above should have a brown-to-green gradient.
        </p>
      </div>

      {/* Test animations */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-purple-500 text-white rounded-lg"
        >
          Framer Motion Animation
        </motion.div>
        
        <div className="p-4 bg-yellow-500 text-white rounded-lg animate-fade-in">
          Tailwind Animation: animate-fade-in
        </div>
      </div>

      {/* Test responsive design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Responsive Grid Item 1
        </div>
        <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Responsive Grid Item 2
        </div>
        <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Responsive Grid Item 3
        </div>
      </div>

      {/* Test dark mode */}
      <div className="space-y-4">
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
          <h3 className="text-gray-900 dark:text-white font-semibold">
            Dark Mode Test
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            This should adapt to light/dark mode.
          </p>
        </div>
      </div>
    </div>
  );
} 