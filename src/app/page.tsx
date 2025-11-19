'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  Search, 
  MapPin, 
  Users,
  Star,
  Rocket,
  Flag,
  CheckCircle,
  Users as UsersIcon,
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin as MapPinIcon,
  Plus,
  Minus,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AddressSearch from '@/components/ui/AddressSearch';
import BackgroundCarousel from '@/components/ui/BackgroundCarousel';
import { firebaseDB } from '@/services/firebaseService';

// Icon Card Component with GSAP Animation
function IconCard({ card, index }: { card: { icon: string; title: string; description: string }; index: number }) {
  const uniqueId = useId().replace(/:/g, '-'); // Remove colons for SVG ID compatibility
  const iconRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const checkSvgRef = useRef<SVGSVGElement>(null);
  const flagSvgRef = useRef<SVGSVGElement>(null);
  const flagGroupRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLDivElement>(null);
  const flashlightRef = useRef<SVGCircleElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const checkPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const gradientIdRef = useRef(`gradient-comunidad-${index}-${uniqueId}`);
  const checkGradientIdRef = useRef(`gradient-check-${index}-${uniqueId}`);
  const flagFilterIdRef = useRef(`flag-wave-${index}-${uniqueId}`);
  const flagClipPathIdRef = useRef(`clippath-${index}-${uniqueId}`);
  const isLanzamiento = card.title === 'LANZAMIENTO 2025';
  const isFlag = card.title === '100% ARGENTINO';
  const isCheck = card.title === 'SEGURIDAD PRIMERO';
  const isComunidad = card.title === 'CRECIENDO JUNTOS';

  // Lanzamiento animation
  useEffect(() => {
    if (!isLanzamiento || !iconRef.current || !containerRef.current) return;

    const icon = iconRef.current;
    const container = containerRef.current;
    
    const handleMouseEnter = () => {
      const containerRect = container.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      
      // Reset position
      gsap.set(icon, { x: 0, y: 0, opacity: 1, rotation: 0 });
      
      // Create animation timeline
      const tl = gsap.timeline();
      
      // Step 1: Shake animation
      tl.to(icon, {
        x: '+=10',
        y: '+=5',
        rotation: 5,
        duration: 0.1,
        ease: 'power2.out'
      })
      .to(icon, {
        x: '-=15',
        y: '-=10',
        rotation: -5,
        duration: 0.1,
        ease: 'power2.out'
      })
      .to(icon, {
        x: '+=10',
        y: '+=5',
        rotation: 3,
        duration: 0.1,
        ease: 'power2.out'
      })
      .to(icon, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.1,
        ease: 'power2.out'
      });
      
      // Step 2: Translate to top right and disappear
      tl.to(icon, {
        x: containerRect.width / 2 + iconRect.width / 2,
        y: -containerRect.height / 2 - iconRect.height / 2,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
      
      // Step 3: Appear from bottom left
      tl.set(icon, {
        x: -containerRect.width / 2 - iconRect.width / 2,
        y: containerRect.height / 2 + iconRect.height / 2,
        opacity: 0
      })
      .to(icon, {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    container.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isLanzamiento]);

  // Flag flying/waving animation
  useEffect(() => {
    if (!isFlag || !flagSvgRef.current || !flagGroupRef.current || !containerRef.current) return;

    const svg = flagSvgRef.current;
    const flagGroup = flagGroupRef.current;
    const container = containerRef.current;
    
    // Get the inner group containing the flag elements
    const innerGroup = flagGroup.querySelector('g');
    const circle = flagGroup.querySelector('circle');
    
    if (!innerGroup) return;

    // Set transform origin to left center (flag pole anchor point)
    gsap.set(innerGroup, { transformOrigin: 'left center' });
    if (circle) {
      gsap.set(circle, { transformOrigin: 'center center' });
    }

    // Create smooth looping flying flag animation
    const tl = gsap.timeline({ repeat: -1 });
    
    // Flying effect: combine skew, rotation, and translation for realistic flag movement
    tl.to(innerGroup, {
      skewX: 5,
      rotation: 2,
      x: 2,
      y: 1,
      duration: 1.5,
      ease: 'sine.inOut'
    })
    .to(innerGroup, {
      skewX: -4,
      rotation: -1.5,
      x: -1,
      y: -1,
      duration: 1.5,
      ease: 'sine.inOut'
    })
    .to(innerGroup, {
      skewX: 3,
      rotation: 1,
      x: 1,
      y: 0.5,
      duration: 1.5,
      ease: 'sine.inOut'
    })
    .to(innerGroup, {
      skewX: -2,
      rotation: -1,
      x: -1.5,
      y: -0.5,
      duration: 1.5,
      ease: 'sine.inOut'
    })
    .to(innerGroup, {
      skewX: 0,
      rotation: 0,
      x: 0,
      y: 0,
      duration: 1.5,
      ease: 'sine.inOut'
    });

    // Animate the sun slightly with the flag movement
    if (circle) {
      gsap.to(circle, {
        x: 1,
        y: 0.5,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }

    animationRef.current = tl;

    // Auto-animate when section comes into view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Animation starts automatically
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        animationRef.current.kill();
      }
      if (circle) {
        gsap.killTweensOf(circle);
      }
    };
  }, [isFlag]);

  // Check flashlight animation
  useEffect(() => {
    if (!isCheck || !checkSvgRef.current || !containerRef.current || !flashlightRef.current) return;

    const svg = checkSvgRef.current;
    const container = containerRef.current;
    const flashlight = flashlightRef.current;
    const paths = checkPathRefs.current.filter(Boolean) as SVGPathElement[];

    if (paths.length === 0) return;

    // Use the first path as the main border path (the checkmark outline)
    const mainPath = paths[0];
    if (!mainPath) return;

    // Get path length
    const pathLength = mainPath.getTotalLength();
    
    // Find the leftmost point as starting position
    let startLength = 0;
    let leftmostX = Infinity;

    // Sample every 0.5 units along the path to find leftmost point
    for (let i = 0; i <= pathLength; i += 0.5) {
      const point = mainPath.getPointAtLength(i);
      if (point.x < leftmostX) {
        leftmostX = point.x;
        startLength = i;
      }
    }

    const animateFlashlight = () => {
      // Reset flashlight position and scale
      const startPoint = mainPath.getPointAtLength(startLength);
      flashlight.setAttribute('cx', startPoint.x.toString());
      flashlight.setAttribute('cy', startPoint.y.toString());
      flashlight.setAttribute('r', '20');
      
      const progressObj = { value: 0 };
      const scaleObj = { value: 1 };
      
      const tl = gsap.timeline();

      // Animate flashlight along the entire path (full loop)
      tl.to(flashlight, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out'
      })
      // Grow the flashlight slightly
      .to(scaleObj, {
        value: 1.3,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: function() {
          const scale = scaleObj.value;
          flashlight.setAttribute('r', (20 * scale).toString());
        }
      })
      // Move along the entire path (full loop from start to start)
      .to(progressObj, {
        value: 1,
        duration: 1.0, // Faster animation
        ease: 'power1.inOut',
        onUpdate: function() {
          // Get current progress (0 to 1 means full loop)
          const progress = progressObj.value;
          // Calculate position along the path (full loop: startLength -> end -> startLength)
          // When progress goes from 0 to 1, we traverse the entire path
          let currentLength = startLength + progress * pathLength;
          // Wrap around if we exceed pathLength
          if (currentLength >= pathLength) {
            currentLength = currentLength % pathLength;
          }
          const point = mainPath.getPointAtLength(currentLength);
          
          // Update flashlight position
          flashlight.setAttribute('cx', point.x.toString());
          flashlight.setAttribute('cy', point.y.toString());
        }
      })
      // Shrink and fade out at the end
      .to(scaleObj, {
        value: 0.8,
        duration: 0.2,
        ease: 'power2.in',
        onUpdate: function() {
          const scale = scaleObj.value;
          flashlight.setAttribute('r', (20 * scale).toString());
        }
      })
      .to(flashlight, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      }, '-=0.1'); // Start fading slightly before shrinking completes

      animationRef.current = tl;
    };

    // Auto-animate when section comes into view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(animateFlashlight, 300);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);

    // Also animate on hover
    container.addEventListener('mouseenter', animateFlashlight);

    return () => {
      container.removeEventListener('mouseenter', animateFlashlight);
      observer.disconnect();
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [isCheck]);

  // Comunidad drawing animation
  useEffect(() => {
    if (!isComunidad || !svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    const container = containerRef.current;
    const paths = pathRefs.current.filter(Boolean) as SVGPathElement[];

    if (paths.length === 0) return;

    // Get fill colors for each path (for stroke color)
    const getStrokeColor = (path: SVGPathElement): string => {
      const fill = path.getAttribute('fill');
      if (fill && fill.startsWith('#')) return fill;
      if (fill && fill.startsWith('url')) {
        // For gradients, use a contrasting color or the first gradient stop
        return '#1cb2e8'; // Default blue
      }
      // Check computed style
      const computedFill = window.getComputedStyle(path).fill;
      return computedFill !== 'none' ? computedFill : '#1cb2e8';
    };

    // Initialize paths for drawing animation
    paths.forEach((path) => {
      const length = path.getTotalLength();
      const strokeColor = getStrokeColor(path);
      
      // Set stroke properties for drawing effect
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.strokeWidth = '2.5';
      path.style.stroke = strokeColor;
      path.style.fillOpacity = '0';
      path.style.strokeLinecap = 'round';
      path.style.strokeLinejoin = 'round';
    });

    let hasAnimated = false;

    const animate = () => {
      if (hasAnimated) {
        // Reset and replay animation
        paths.forEach((path) => {
          const length = path.getTotalLength();
          path.style.strokeDashoffset = `${length}`;
          path.style.fillOpacity = '0';
        });
      }

      const tl = gsap.timeline();

      // Step 1: Draw all strokes (borders) - staggered
      paths.forEach((path, index) => {
        const length = path.getTotalLength();
        tl.to(
          path,
          {
            strokeDashoffset: 0,
            duration: 1,
            ease: 'power2.out',
          },
          index * 0.15 // Stagger the start of each path
        );
      });

      // Step 2: Fill with background color
      paths.forEach((path, index) => {
        tl.to(
          path,
          {
            fillOpacity: 1,
            duration: 0.6,
            ease: 'power2.inOut',
          },
          `-=${0.4 + index * 0.05}` // Start filling as strokes complete
        );
      });

      animationRef.current = tl;
      hasAnimated = true;
    };

    // Auto-animate when section comes into view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          // Small delay to ensure SVG is fully rendered
          setTimeout(animate, 100);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);

    // Also animate on hover
    container.addEventListener('mouseenter', animate);

    return () => {
      container.removeEventListener('mouseenter', animate);
      observer.disconnect();
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [isComunidad]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
      className="text-center"
    >
      <div ref={containerRef} className="mb-4 flex justify-center items-center h-24 relative overflow-hidden">
        {isComunidad ? (
          <svg
            ref={svgRef}
            id="Capa_1"
            data-name="Capa 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            className="w-24 h-24 object-contain relative z-10"
          >
            <defs>
              <style>
                {`.cls-1 { fill: #1cb2e8; }
                   .cls-2 { fill: #f9c74f; }
                   .cls-3 { fill: url(#${gradientIdRef.current}); }`}
              </style>
              <linearGradient id={gradientIdRef.current} data-name="Degradado sin nombre 12" x1="17.33" y1="100" x2="116.11" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f9c74f"/>
                <stop offset=".37" stopColor="#f7c650"/>
                <stop offset=".51" stopColor="#f0c654"/>
                <stop offset=".61" stopColor="#e4c55c"/>
                <stop offset=".68" stopColor="#d3c466"/>
                <stop offset=".75" stopColor="#bdc274"/>
                <stop offset=".81" stopColor="#a2c086"/>
                <stop offset=".86" stopColor="#81bd9a"/>
                <stop offset=".91" stopColor="#5cbab2"/>
                <stop offset=".96" stopColor="#32b7cd"/>
                <stop offset="1" stopColor="#05b4ea"/>
                <stop offset="1" stopColor="#01b4ed"/>
              </linearGradient>
            </defs>
            <path
              ref={(el) => { pathRefs.current[0] = el; }}
              className="cls-1"
              d="M182.67,133.39c0,8.13-5.97,14.87-13.77,16.07h-.01c-.82.03-1.65.04-2.47.04s-1.65-.01-2.47-.04h-.01c-26.22-.78-49.36-13.77-63.93-33.49,9.73-13.17,15.64-29.33,16.08-46.85v-.02c.02-.71.03-1.42.03-2.13,0,.57.01,1.14.03,1.7.88,26.34,22.09,47.6,48.41,48.57.62.03,1.24.04,1.87.04h.1c2.57,0,5.15.51,7.43,1.7,5.19,2.71,8.73,8.15,8.73,14.4Z"
            />
            <path
              ref={(el) => { pathRefs.current[1] = el; }}
              className="cls-3"
              d="M116.1,66.34v-.02c0-.12,0-.24,0-.36,0-.19-.02-.38-.03-.57,0-.06,0-.12-.01-.19v-.02c-.01-.08-.02-.15-.03-.24-.03-.34-.07-.68-.12-1.02-.01-.08-.02-.15-.04-.24-.02-.08-.03-.15-.05-.23-.03-.17-.06-.34-.09-.51-.07-.33-.15-.66-.24-.98-.05-.17-.1-.33-.14-.49-.05-.13-.09-.27-.14-.41-.06-.17-.12-.33-.19-.5-.13-.33-.27-.66-.42-.98-.07-.16-.15-.32-.24-.48-.17-.32-.34-.63-.53-.93-.75-1.21-1.66-2.32-2.7-3.3-.11-.11-.23-.22-.36-.32-.12-.11-.25-.22-.38-.33-.29-.25-.59-.48-.91-.71-.12-.09-.24-.17-.36-.25-.14-.09-.27-.19-.41-.27-.02-.01-.04-.02-.06-.04-.13-.08-.26-.15-.39-.24-.02,0-.03-.02-.05-.03-.14-.09-.29-.17-.44-.25-.16-.09-.31-.17-.47-.25-.13-.07-.26-.13-.4-.2-.05-.02-.09-.04-.13-.06-.14-.06-.28-.12-.43-.19-.25-.11-.52-.21-.78-.31-.12-.04-.24-.09-.36-.12-.63-.21-1.27-.39-1.93-.52-.1-.03-.21-.05-.32-.06-.1-.02-.2-.04-.29-.05-.15-.03-.31-.05-.46-.07-.18-.03-.36-.05-.55-.07-.55-.05-1.1-.08-1.66-.08s-1.12.03-1.67.08c-.19.02-.37.04-.55.07-.25.04-.49.07-.73.12-.11.02-.23.04-.34.07-.18.04-.35.07-.53.11-.57.14-1.13.3-1.67.5-.13.05-.25.09-.38.14-.17.06-.33.13-.49.2-.17.07-.33.14-.49.21-.16.08-.32.15-.48.23-.32.16-.63.33-.92.51-.15.09-.3.18-.45.27-.14.09-.29.19-.44.29-.14.1-.28.2-.43.3-.14.1-.28.21-.42.32-.14.11-.27.22-.41.33-.13.11-.27.22-.4.34-.13.11-.26.23-.39.35-.12.12-.25.24-.37.37s-.24.25-.36.38c-.12.12-.24.25-.35.39-.11.13-.23.26-.34.4-.11.13-.22.27-.33.41-.1.13-.2.26-.3.4-.31.43-.6.88-.87,1.34-.1.17-.19.34-.28.51-.08.15-.16.32-.24.48-.22.45-.41.91-.57,1.38-.07.2-.14.4-.2.6-.06.18-.11.35-.15.53-.14.53-.26,1.06-.35,1.61,0,.01,0,.02,0,.03-.01.07-.02.14-.03.21-.04.24-.07.48-.09.72,0,.04-.01.08-.02.12-.04.38-.06.76-.08,1.15,0,.12,0,.24,0,.36,0,.13,0,.27,0,.41v.25c0,.57-.01,1.14-.03,1.7-.88,26.34-22.09,47.6-48.41,48.57-.62.03-1.25.04-1.87.04h-.1c-2.58,0-5.15.51-7.43,1.7-5.19,2.71-8.73,8.15-8.73,14.4,0,8.13,5.97,14.87,13.77,16.07h.01c.82.03,1.65.04,2.47.04s1.65-.01,2.47-.04h.01c26.22-.78,49.36-13.77,63.93-33.49,9.73-13.17,15.64-29.33,16.08-46.85v-.02c.02-.71.03-1.42.03-2.13v-.22c0-.14,0-.28,0-.41Z"
            />
            <path
              ref={(el) => { pathRefs.current[2] = el; }}
              className="cls-1"
              d="M189.88,79.95c1.46,14.62-10.73,26.8-25.35,25.35-10.81-1.07-19.55-9.82-20.62-20.63-1.44-14.6,10.73-26.78,25.33-25.34,10.81,1.07,19.56,9.8,20.64,20.61Z"
            />
            <path
              ref={(el) => { pathRefs.current[3] = el; }}
              className="cls-2"
              d="M10.12,79.95c-1.46,14.62,10.73,26.8,25.35,25.35,10.81-1.07,19.55-9.82,20.62-20.63,1.44-14.6-10.73-26.78-25.33-25.34-10.81,1.07-19.56,9.8-20.64,20.61Z"
            />
          </svg>
        ) : isCheck ? (
          <svg
            ref={checkSvgRef}
            id="Capa_1"
            data-name="Capa 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            className="w-24 h-24 object-contain relative z-10"
          >
            <defs>
              <style>
                {`.check-cls-1 { fill: url(#${checkGradientIdRef.current}); }
                   .check-cls-2 { fill: #1cb2e8; }`}
              </style>
              <linearGradient id={checkGradientIdRef.current} data-name="Degradado sin nombre 34" x1="20.22" y1="100" x2="190" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f9c74f"/>
                <stop offset="1" stopColor="#01b4ed"/>
              </linearGradient>
              <radialGradient id={`flashlight-gradient-${index}`} cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 1)" stopOpacity="1"/>
                <stop offset="20%" stopColor="rgba(255, 255, 255, 0.8)" stopOpacity="0.8"/>
                <stop offset="40%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity="0.4"/>
                <stop offset="70%" stopColor="rgba(255, 255, 255, 0.1)" stopOpacity="0.1"/>
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0"/>
              </radialGradient>
              <filter id={`flashlight-glow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              ref={(el) => { checkPathRefs.current[0] = el; }}
              className="check-cls-1"
              d="M183.88,65.7l-104.24,104.24-29.52-29.53-29.9-29.89c7.92,7,18.36,11.25,29.76,11.25s21.62-4.17,29.52-11.05l.16.16,74.7-74.71c4.08-4.08,9.43-6.11,14.77-6.11s10.7,2.03,14.77,6.11c8.16,8.16,8.16,21.38,0,29.53Z"
            />
            <path
              ref={(el) => { checkPathRefs.current[1] = el; }}
              className="check-cls-2"
              d="M79.49,110.72c-7.9,6.88-18.23,11.05-29.52,11.05s-21.83-4.25-29.76-11.25l-3.92-3.92c-1.27-1.44-2.46-2.97-3.53-4.57-.03-.01-.04-.04-.05-.07-4.53-7.96-3.39-18.29,3.39-25.08,4.08-4.08,9.43-6.13,14.77-6.13s10.68,2.05,14.77,6.13l33.85,33.84Z"
            />
            {/* Flashlight effect */}
            <circle
              ref={flashlightRef}
              r="20"
              fill={`url(#flashlight-gradient-${index})`}
              filter={`url(#flashlight-glow-${index})`}
              opacity="0"
            />
          </svg>
        ) : isFlag ? (
          <svg
            ref={flagSvgRef}
            id="Capa_1"
            data-name="Capa 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            className="w-24 h-24 object-contain relative z-10"
          >
            <defs>
              <style>
                {`.flag-cls-1 { fill: #fff; }
                   .flag-cls-2 { fill: none; }
                   .flag-cls-3 { fill: #1cb2e8; }
                   .flag-cls-4 { clip-path: url(#${flagClipPathIdRef.current}); }
                   .flag-cls-5 { fill: #f9c74f; }`}
              </style>
              <clipPath id={flagClipPathIdRef.current}>
                <rect className="flag-cls-2" x="10" y="45.69" width="180" height="108.62" rx="54.31" ry="54.31"/>
              </clipPath>
            </defs>
            <g ref={flagGroupRef} className="flag-cls-4">
              <g>
                <rect className="flag-cls-3" x="-3.36" y="45.69" width="206.72" height="36.21"/>
                <rect className="flag-cls-1" x="-3.36" y="81.9" width="206.72" height="36.21"/>
                <rect className="flag-cls-3" x="-3.36" y="118.1" width="206.72" height="36.21"/>
                <circle className="flag-cls-5" cx="100" cy="100" r="12.1"/>
              </g>
            </g>
          </svg>
        ) : (
          <img 
            ref={iconRef}
            src={card.icon} 
            alt={card.title}
            className="w-24 h-24 object-contain relative z-10"
          />
        )}
      </div>
      <h3 className="text-lg font-bold mb-2 uppercase" style={{ color: '#4d4d4d' }}>
        {card.title}
      </h3>
      <p style={{ color: '#4d4d4d' }}>
        {card.description}
      </p>
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [searchForm, setSearchForm] = useState({
    location: '',
    guests: 0
  });

  const [locationData, setLocationData] = useState<any>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [guestsDropdownOpen, setGuestsDropdownOpen] = useState(false);
  const guestsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (guestsDropdownRef.current && !guestsDropdownRef.current.contains(event.target as Node)) {
        setGuestsDropdownOpen(false);
      }
    };

    if (guestsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [guestsDropdownOpen]);

  // Banner images for the carousel
  const bannerImages = [
    '/img/banner-1.jpg',
    '/img/banner-2.jpg',
    '/img/banner-3.jpg',
    '/img/banner-4.jpg'
  ];

  const popularDestinations = [
    { 
      name: 'SALTA', 
      image: '/img/salta.jpg', 
      description: 'Tradición, cultura y paisajes imponentes.',
      rating: 5
    },
    { 
      name: 'BARILOCHE', 
      image: '/img/bariloche.jpg', 
      description: 'Combina naturaleza, aventura y gastronomía.',
      rating: 5
    },
    { 
      name: 'MAR DEL PLATA', 
      image: '/img/mar-del-plata.jpg', 
      description: 'La ciudad costera más famosa del país.',
      rating: 5
    },
    { 
      name: 'IGUAZÚ', 
      image: '/img/iguazu.jpg', 
      description: 'Una Maravilla Natural del Mundo.',
      rating: 5
    },
  ];

  const handleLocationSelect = (address: any) => {
    setLocationData({
      ...address,
      state: address.state,
      city: address.city,
      stateId: address.stateId,
      cityId: address.cityId
    });
    setSearchForm(prev => ({
      ...prev,
      location: address.display_name
    }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    // Add location data if available
    if (locationData) {
      // Use stateId (code) if available, otherwise use state name
      if (locationData.stateId) {
        params.set('state', locationData.stateId);
      } else if (locationData.state) {
        params.set('state', locationData.state);
      }
      // Use city name for city parameter
      if (locationData.city) {
        params.set('city', locationData.city);
      }
    }
    
    // Add guests if selected
    if (searchForm.guests > 0) {
      params.set('guests', searchForm.guests.toString());
    }
    
    // Redirect to buscar page with query parameters
    const queryString = params.toString();
    router.push(`/buscar${queryString ? `?${queryString}` : ''}`);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setNewsletterStatus('error');
      setNewsletterMessage('Por favor ingresa un email válido');
      return;
    }

    setNewsletterStatus('loading');
    setNewsletterMessage('');

    try {
      await firebaseDB.newsletterSubscribers.create(newsletterEmail);
      setNewsletterStatus('success');
      setNewsletterMessage('¡Te has suscrito exitosamente!');
      setNewsletterEmail('');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setNewsletterStatus('idle');
        setNewsletterMessage('');
      }, 3000);
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterMessage(
        error instanceof Error && error.message === 'Email already subscribed'
          ? 'Este email ya está suscrito'
          : 'Error al suscribirse. Por favor intenta nuevamente.'
      );
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - Banner with Search Form Only */}
      <section className="relative py-12 sm:py-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-end">
        {/* Background Carousel - Images with text included */}
        <div className="absolute inset-0 z-0">
          <BackgroundCarousel 
            images={bannerImages} 
            interval={5000}
            className="w-full h-full"
          />
        </div>
        
        {/* Search Form - Centered */}
        <div className="relative z-50 max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-[2rem] p-2 flex flex-col lg:flex-row items-stretch lg:items-center space-y-2 lg:space-y-0 lg:space-x-2 shadow-xl border border-white/20 relative z-50">
              <div className="flex-1">
                <AddressSearch
                  value={searchForm.location}
                  onChange={(value) => setSearchForm(prev => ({ ...prev, location: value }))}
                  onSelect={handleLocationSelect}
                  placeholder="ELEGÍ TU DESTINO"
                  className="w-full"
                  showSearchIcon={false}
                />
              </div>
              <div className="flex-1 relative" ref={guestsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setGuestsDropdownOpen(!guestsDropdownOpen)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {searchForm.guests === 0 ? '¿CUANTOS VIAJEROS?' : `${searchForm.guests} ${searchForm.guests === 1 ? 'viajero' : 'viajeros'}`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${guestsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {guestsDropdownOpen && (
                  <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cantidad de viajeros
                      </span>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setSearchForm(prev => ({ ...prev, guests: Math.max(0, prev.guests - 1) }))}
                          className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={searchForm.guests === 0}
                        >
                          <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <span className="w-8 text-center text-gray-900 dark:text-white font-medium">
                          {searchForm.guests}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSearchForm(prev => ({ ...prev, guests: prev.guests + 1 }))}
                          className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={handleSearch}
                className="w-12 h-12 bg-primary text-white rounded-full hover:bg-secondary transition-all duration-300 transform hover:scale-105 flex items-center justify-center flex-shrink-0"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section 
        className="relative py-16 overflow-hidden bg-white dark:bg-gray-900 bg-no-repeat bg-center bg-contain w-full"
        style={{ backgroundImage: 'url(/img/destinos-populares-bg.jpg)' }}
      >
        <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl lg:text-6xl font-bold mb-4" style={{ color: '#4d4d4d' }}>
              DESTINOS POPULARES
            </h2>
            <p className="text-xl lg:text-4xl mb-4" style={{ color: '#4d4d4d' }}>
              Descubri los destinos más elegidos de Argentina.
            </p>
            <hr className="mx-auto w-[50%] h-[3px] bg-primary border-0 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((destination, index) => (
              <motion.div
                key={destination.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              >
                <Link
                  href={`/destinos/${destination.name.toLowerCase().replace(' ', '-')}`}
                  className="bg-white rounded-t-full overflow-hidden hover:transform hover:scale-105 transition-all duration-300 block shadow-lg"
                >
                  <div className="flex items-center justify-center relative overflow-hidden p-2">
                    <img 
                      src={destination.image} 
                      alt={destination.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="text-xl font-bold mb-2 text-primary">
                      {destination.name}
                    </h3>
                    <p className="text-base mb-3 font-medium" style={{ color: '#4d4d4d' }}>
                      {destination.description}
                    </p>
                    <div className="flex items-center justify-center">
                      <div className="flex text-yellow-400">
                        {[...Array(destination.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Descubrí y conectá VIVÍ ARGENTINA Section */}
      <section 
        className="relative overflow-hidden w-full"
        style={{ 
          background: 'linear-gradient(to right, rgba(249, 199, 79, 0.2) 0%, rgba(28, 178, 232, 0.2) 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t-[3px] border-b-[3px] border-primary">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative h-96 lg:h-[500px]"
            >
              <img 
                src="/img/desubri-y-conecta.png" 
                alt="Descubrí y conectá VIVÍ ARGENTINA" 
                className="w-full h-full object-contain"
              />
            </motion.div>

            {/* Right Side - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="p-8 lg:p-12">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: '#4d4d4d' }}>
                  DESCUBRÍ Y CONECTÁ
                </h2>
                <h3 className="text-3xl lg:text-5xl font-bold text-primary mb-6">
                  VIVÍ ARGENTINA
                </h3>
                <hr className="w-full h-[3px] bg-primary border-0 rounded-full mb-4" />
                <p className="text-xl lg:text-2xl font-bold mb-4" style={{ color: '#4d4d4d' }}>
                  Una plataforma que une destinos y experiencias.
                </p>
                <p className="text-lg leading-relaxed" style={{ color: '#4d4d4d' }}>
                  NexAR es el punto de encuentro. Una plataforma pensada para <strong>conectar viajeros y prestadores en un mismo espacio, de forma segura, ágil y personalizada.</strong> Organizá tus viajes, descubrí destinos y gestioná tus servicios con confianza y simplicidad.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Nuestro Comienzo y Tu Próxima Aventura Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl lg:text-6xl font-bold mb-4" style={{ color: '#4d4d4d' }}>
              NUESTRO COMIENZO <br /> Y TU PRÓXIMA AVENTURA
            </h2>
            <p className="text-xl lg:text-4xl mb-4" style={{ color: '#4d4d4d' }}>
              Creando el futuro del turismo juntos.
            </p>
            <hr className="mx-auto w-[20%] h-[3px] bg-primary border-0 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: '/img/icon-lanzamiento.svg',
                title: 'LANZAMIENTO 2025', 
                description: 'Despegamos hacia una nueva forma de viajar.' 
              },
              { 
                icon: '/img/icon-flag-ar.svg',
                title: '100% ARGENTINO', 
                description: 'Creado para conectarte. Hecho por argentinos.' 
              },
              { 
                icon: '/img/icon-check.svg',
                title: 'SEGURIDAD PRIMERO', 
                description: 'Tus datos, seguros. Políticas claras y protección.' 
              },
              { 
                icon: '/img/icon-comunidad.svg',
                title: 'CRECIENDO JUNTOS', 
                description: 'Forma parte desde nuestros inicios.' 
              },
            ].map((card, index) => {
              return (
                <IconCard 
                  key={card.title}
                  card={card}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter Subscription Section */}
      <section className="relative overflow-hidden w-full bg-white dark:bg-gray-900 border-t-[3px] border-b-[3px] border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* First Row: Title on left, Form on right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <h2 className="text-2xl lg:text-3xl font-bold text-primary mb-4">
                SUSCRIBITE PARA RECIBIR INFORMACIÓN
              </h2>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              onSubmit={handleNewsletterSubmit}
              className="flex flex-col sm:flex-row rounded-[50px] border border-primary dark:border-primary bg-white dark:bg-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent"
            >
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Ingresá tu email"
                className="flex-1 px-5 py-2 text-lg border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:outline-none"
                required
                disabled={newsletterStatus === 'loading'}
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-8 py-2 text-lg rounded-[50px] bg-primary text-white hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-regular"
              >
                {newsletterStatus === 'loading' ? 'Suscribiendo...' : 'Suscribirme'}
              </button>
            </motion.form>
          </div>

          {/* Second Row: Description text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-left"
          >
            <p className="text-xl" style={{ color: '#4d4d4d' }}>
              <strong>En NexAR Turismo todo se conecta: los destinos, las personas y las experiencias.</strong>
              <br />
              Registrate hoy y potenciá tu negocio o tu próxima experiencia.
            </p>
          </motion.div>

          {newsletterMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-4 text-left text-sm ${
                newsletterStatus === 'success' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {newsletterMessage}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}