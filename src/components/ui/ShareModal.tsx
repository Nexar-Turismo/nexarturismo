'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Facebook, Twitter, MessageCircle, Link, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    title: string;
    description: string;
    url: string;
  };
}

export default function ShareModal({ isOpen, onClose, post }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = post.url;
  const shareTitle = post.title;
  const shareDescription = post.description;

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        onClose();
      }
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'bg-black hover:bg-gray-800',
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        onClose();
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareTitle} - ${shareUrl}`)}`;
        window.open(whatsappUrl, '_blank');
        onClose();
      }
    },
    {
      name: 'Copiar Enlace',
      icon: copied ? Check : Link,
      color: copied ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700',
      action: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            onClose();
          }, 1500);
        } catch (error) {
          console.error('Error copying to clipboard:', error);
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            onClose();
          }, 1500);
        }
      }
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Compartir
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {shareTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-4">
              {shareOptions.map((option, index) => (
                <motion.button
                  key={option.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={option.action}
                  className={`${option.color} text-white p-4 rounded-lg flex flex-col items-center space-y-2 transition-all duration-200 transform hover:scale-105`}
                >
                  <option.icon className="w-6 h-6" />
                  <span className="text-sm font-medium">
                    {option.name}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* URL Preview */}
            <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                Enlace:
              </p>
              <p className="text-sm text-gray-900 dark:text-white break-all">
                {shareUrl}
              </p>
            </div>

            {/* Success Message */}
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    ¡Enlace copiado al portapapeles!
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
