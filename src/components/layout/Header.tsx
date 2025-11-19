'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bed, 
  Bike, 
  Sparkles,
  Plus,
  ChevronDown,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import NotificationBell from '@/components/ui/NotificationBell';
import { mainCategoryMapping } from '@/services/dummyData';


export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [openNestedSubmenu, setOpenNestedSubmenu] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasRole, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navigationItems = [
    { 
      name: 'Alojamientos', 
      href: '/alojamientos', 
      icon: Bed,
      hasSubmenu: true,
      submenuItems: [
        { name: 'Todas las publicaciones', href: '/alojamientos' },
        ...mainCategoryMapping['alojamiento'].map(cat => ({ 
          name: cat, 
          href: `/alojamientos?category=${encodeURIComponent(cat)}` 
        }))
      ]
    },
    { 
      name: 'Vehículos', 
      href: '/vehiculos', 
      icon: Bike,
      hasSubmenu: true,
      submenuItems: [
        { name: 'Todas las publicaciones', href: '/vehiculos' },
        ...mainCategoryMapping['alquiler-vehiculos'].map(cat => ({ 
          name: cat, 
          href: `/vehiculos?category=${encodeURIComponent(cat)}` 
        }))
      ]
    },
    { 
      name: 'Otros Servicios', 
      href: '/experiencias', 
      icon: Sparkles,
      hasSubmenu: true,
      hasNestedSubmenu: true,
      submenuItems: [
        { name: 'Todas las publicaciones', href: '/experiencias' },
        {
          name: 'Clases e instructorados',
          isGroup: true,
          items: [
            { name: 'Clases de Esquí', href: '/experiencias?category=Clases de Esquí' },
            { name: 'Clases de snowboard', href: '/experiencias?category=Clases de snowboard' },
            { name: 'Clases de surf', href: '/experiencias?category=Clases de surf' },
            { name: 'Clases de wingfoil', href: '/experiencias?category=Clases de wingfoil' },
            { name: 'Clases de wing surf', href: '/experiencias?category=Clases de wing surf' },
          ]
        },
        {
          name: 'Alquileres',
          isGroup: true,
          items: [
            { name: 'Alquiler equipo de esquí', href: '/experiencias?category=Alquiler equipo de esquí' },
            { name: 'Alquiler equipo de snowboard', href: '/experiencias?category=Alquiler equipo de snowboard' },
            { name: 'Alquiler ropa de nieve', href: '/experiencias?category=Alquiler ropa de nieve' },
            { name: 'Alquiler equipo de surf', href: '/experiencias?category=Alquiler equipo de surf' },
            { name: 'Alquiler equipo de wingfoil', href: '/experiencias?category=Alquiler equipo de wingfoil' },
            { name: 'Alquiler equipo de wing surf', href: '/experiencias?category=Alquiler equipo de wing surf' },
            { name: 'Alquiler de carpa', href: '/experiencias?category=Alquiler de carpa' },
            { name: 'Alquiler de sombrilla', href: '/experiencias?category=Alquiler de sombrilla' },
            { name: 'Alquiler', href: '/experiencias?category=Alquiler' },
          ]
        },
        {
          name: 'Excursiones',
          isGroup: true,
          items: [
            { name: 'Excursiones lacustres', href: '/experiencias?category=Excursiones lacustres' },
            { name: 'Excursiones terrestres', href: '/experiencias?category=Excursiones terrestres' },
            { name: 'Experiencias 4x4', href: '/experiencias?category=Experiencias 4x4' },
            { name: 'Cabalgatas', href: '/experiencias?category=Cabalgatas' },
            { name: 'Excursiones aéreas', href: '/experiencias?category=Excursiones aéreas' },
          ]
        },
        {
          name: 'Fotografía',
          isGroup: true,
          items: [
            { name: 'Vuelo de drone', href: '/experiencias?category=Vuelo de drone' },
            { name: 'Fotografía', href: '/experiencias?category=Fotografía' },
          ]
        }
      ]
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-gray-700 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative h-12 w-32 sm:h-14 sm:w-40">
              <Image 
                src="/img/logo.png" 
                alt="Nexar Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative">
                {item.hasSubmenu ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setOpenSubmenu(item.name)}
                    onMouseLeave={() => {
                      setOpenSubmenu(null);
                      setOpenNestedSubmenu(null);
                    }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'text-primary bg-primary/10'
                          : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Link>
                    
                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {openSubmenu === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                        >
                          <div className="py-2">
                            {item.submenuItems?.map((subItem: any) => (
                              subItem.isGroup ? (
                                // Group item with nested submenu
                                <div 
                                  key={subItem.name}
                                  className="relative"
                                  onMouseEnter={() => setOpenNestedSubmenu(subItem.name)}
                                  onMouseLeave={() => setOpenNestedSubmenu(null)}
                                >
                                  <button
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                                      subItem.disabled 
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                                        : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    disabled={subItem.disabled}
                                  >
                                    <span>{subItem.name}</span>
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                  
                                  {/* Nested submenu */}
                                  {!subItem.disabled && openNestedSubmenu === subItem.name && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -10 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute left-full top-0 ml-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                                    >
                                      <div className="py-2">
                                        {subItem.items?.map((nestedItem: any) => (
                                          <Link
                                            key={nestedItem.name}
                                            href={nestedItem.href}
                                            className={`block px-4 py-3 text-sm transition-colors ${
                                              nestedItem.disabled
                                                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                            onClick={(e) => nestedItem.disabled && e.preventDefault()}
                                          >
                                            {nestedItem.name}
                                          </Link>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              ) : (
                                // Regular submenu item
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  {subItem.name}
                                </Link>
                              )
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'text-primary bg-primary/10'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )}
              </div>
            ))}

          </nav>

          {/* Right Side - Publicar Button and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Publicar Button - Hidden for superadmin users */}
            {user && !hasRole('superadmin') && (
              <Link
                href="/posts/new"
                className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 transform hover:scale-105 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar</span>
              </Link>
            )}

            {/* User Menu / Login Button */}
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Notification Bell */}
                <NotificationBell userId={user.id} />
                
                {/* User Menu Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">
                      {user.name}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                      >
                        <div className="py-2">
                          <Link
                            href="/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <User className="w-4 h-4 mr-3" />
                            Mi cuenta
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Cerrar sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="hidden sm:block px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t border-gray-200 dark:border-gray-700"
            >
              <div className="py-4 space-y-2">
                {navigationItems.map((item) => (
                  <div key={item.name}>
                    {item.hasSubmenu ? (
                      <div>
                        <button
                          onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                            isActive(item.href)
                              ? 'text-primary bg-primary/10'
                              : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${openSubmenu === item.name ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Mobile Submenu */}
                        <AnimatePresence>
                          {openSubmenu === item.name && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="ml-4 mt-2 space-y-1"
                            >
                              {item.submenuItems?.map((subItem: any) => (
                                subItem.isGroup ? (
                                  // Group with nested items
                                  <div key={subItem.name}>
                                    <button
                                      onClick={() => setOpenNestedSubmenu(openNestedSubmenu === subItem.name ? null : subItem.name)}
                                      className={`flex items-center justify-between w-full px-4 py-2 text-sm rounded-lg transition-colors ${
                                        subItem.disabled 
                                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                                          : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                                      }`}
                                      disabled={subItem.disabled}
                                    >
                                      <span className="font-medium">{subItem.name}</span>
                                      <ChevronRight className={`w-4 h-4 transition-transform ${openNestedSubmenu === subItem.name ? 'rotate-90' : ''}`} />
                                    </button>
                                    
                                    {/* Mobile Nested Submenu */}
                                    {!subItem.disabled && openNestedSubmenu === subItem.name && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="ml-4 mt-1 space-y-1"
                                      >
                                        {subItem.items?.map((nestedItem: any) => (
                                          <Link
                                            key={nestedItem.name}
                                            href={nestedItem.href}
                                            onClick={(e) => {
                                              if (nestedItem.disabled) {
                                                e.preventDefault();
                                              } else {
                                                setIsMobileMenuOpen(false);
                                                setOpenSubmenu(null);
                                                setOpenNestedSubmenu(null);
                                              }
                                            }}
                                            className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                                              nestedItem.disabled
                                                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                          >
                                            {nestedItem.name}
                                          </Link>
                                        ))}
                                      </motion.div>
                                    )}
                                  </div>
                                ) : (
                                  // Regular submenu item
                                  <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    onClick={() => {
                                      setIsMobileMenuOpen(false);
                                      setOpenSubmenu(null);
                                    }}
                                    className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                  >
                                    {subItem.name}
                                  </Link>
                                )
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.href)
                            ? 'text-primary bg-primary/10'
                            : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    )}
                  </div>
                ))}


                {/* Mobile Publicar Button */}
                <div className="px-4">
                  <Link
                    href="/posts/new"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Publicar</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
