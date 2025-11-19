'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Globe, Link } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import MarketplaceAccountModal from '@/components/modals/MarketplaceAccountModal';
import PublisherStatus from '@/components/publisher/PublisherStatus';

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const isSuperadmin = hasRole('superadmin');

  const baseSections = [
    {
      title: 'Perfil',
      description: 'Gestiona tu información personal y preferencias',
      icon: User,
      href: '/settings/profile',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Notificaciones',
      description: 'Configura cómo recibir notificaciones',
      icon: Bell,
      href: '/settings/notifications',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Seguridad',
      description: 'Cambia tu contraseña y configuración de seguridad',
      icon: Shield,
      href: '/settings/security',
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Idioma y Región',
      description: 'Configura el idioma y la zona horaria',
      icon: Globe,
      href: '/settings/locale',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const settingsSections = [
    ...baseSections,
    ...(isSuperadmin
      ? [
          {
            title: 'MercadoPago Marketplace',
            description: 'Consulta las credenciales principales del marketplace de Nexar',
            icon: Link,
            href: '#',
            color: 'from-yellow-500 to-yellow-600',
            onClick: () => setShowMarketplaceModal(true),
          },
        ]
      : []),
  ];

  // MercadoPago credentials are now configured via environment variables
  // No need for UI forms anymore

  return (
    <div className="w-full max-w-none">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configuración
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gestiona tu cuenta y preferencias de la plataforma
          </p>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass rounded-xl p-6 hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
              onClick={section.onClick || (() => {
                // For other sections, you can add navigation logic here
              })}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${section.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {section.description}
                  </p>
                  <button className="text-sm text-primary hover:text-secondary font-medium transition-colors">
                    Configurar →
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Publisher Status */}
        {!isSuperadmin && <PublisherStatus showDetails={true} />}

        {/* Marketplace Account Modal */}
        <MarketplaceAccountModal
          isOpen={showMarketplaceModal}
          onClose={() => setShowMarketplaceModal(false)}
        />

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Información de la Cuenta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre
              </label>
              <p className="text-gray-900 dark:text-white">{user?.name || 'No especificado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <p className="text-gray-900 dark:text-white">{user?.email || 'No especificado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teléfono
              </label>
              <p className="text-gray-900 dark:text-white">{user?.phone || 'No especificado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {user?.roles
                  .filter(role => role.isActive)
                  .map((role) => (
                    <span
                      key={role.roleId}
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${
                        role.roleName === 'superadmin' 
                          ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                          : role.roleName === 'publisher'
                          ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                      }`}
                    >
                      {role.roleName}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="glass rounded-xl p-6 border border-red-200 dark:border-red-800"
        >
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
            Zona de Peligro
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Desactivar Cuenta
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Desactiva temporalmente tu cuenta
                </p>
              </div>
              <button className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                Desactivar
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Eliminar Cuenta
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Elimina permanentemente tu cuenta y todos los datos
                </p>
              </div>
              <button className="px-4 py-2 text-sm text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
