'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Instagram, Phone, Mail, X } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <footer className="bg-primary">
      {/* Top Image */}
      <div className="w-full h-4 relative">
        <Image
          src="/img/footer-top.jpg"
          alt="Footer top"
          fill
          className="object-cover"
        />
      </div>

      {/* Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Left Side - Logo with Instagram Icon behind */}
          <div className="flex items-start relative">
          
            {/* Logo - positioned in front */}
            <div className="relative z-10 ml-12">
              <Image
                src="/img/logo-blanco.png"
                alt="NexAR Turismo Logo"
                width={128}
                height={48}
                className="h-12 w-auto mb-2"
              />
              {/* Instagram Icon - positioned behind */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-0 w-8 h-8 rounded-full bg-transparent border border-white flex items-center justify-center hover:bg-white/10 transition-colors z-0"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4 text-white" />
            </a>
            </div>
          </div>

          {/* Right Side - Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              CONTACTANOS
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-white" />
                <a 
                  href="tel:+541510101175" 
                  className="text-white hover:text-white/80 transition-colors"
                >
                  1510101175
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-white" />
                <a 
                  href="mailto:contacto@nexarturismo.com" 
                  className="text-white hover:text-white/80 transition-colors"
                >
                  contacto@nexarturismo.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <hr className="w-full border-white border-t mb-6" />

        {/* Second Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left - Copyright */}
          <p className="text-sm text-white">
            © {currentYear} NexAR Turismo. Todos los derechos reservados.
          </p>

          {/* Right - Legal Links */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowPrivacyModal(true)}
              className="text-sm text-white hover:text-white/80 transition-colors"
            >
              Políticas de Privacidad
            </button>
            <button 
              onClick={() => setShowTermsModal(true)}
              className="text-sm text-white hover:text-white/80 transition-colors"
            >
              Términos y Condiciones
            </button>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Términos y Condiciones
                </h2>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    TÉRMINOS Y CONDICIONES – NEXAR TURISMO (Argentina)
                  </h3>
                  
                  <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <section>
                      <p className="mb-4">
                        Nexar Turismo (en adelante, "la Plataforma") establece los presentes Términos y Condiciones de Uso, que regulan el acceso y la utilización de los servicios digitales ofrecidos a través del sitio web y demás canales asociados.
                      </p>
                      <p className="mb-4">
                        Al registrarse, navegar o utilizar los servicios de la Plataforma, los usuarios (clientes, negocios, revendedores y referidos) aceptan expresamente sujetarse a estas condiciones, conforme a lo dispuesto por la Ley de Defensa del Consumidor N.º 24.240, el Código Civil y Comercial de la Nación, y demás normativa aplicable en la República Argentina.
                      </p>
                      <p className="mb-4">
                        El uso de la Plataforma implica el conocimiento y aceptación de estos Términos y Condiciones. En caso de no estar de acuerdo, el usuario deberá abstenerse de utilizar los servicios.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">1. Objeto</h4>
                      <p className="mb-2">
                        Nexar Turismo actúa como intermediario digital que conecta a clientes con prestadores de servicios turísticos.
                      </p>
                      <p className="mb-4">
                        La Plataforma no presta servicios turísticos por sí misma, ni es responsable de su ejecución.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">2. Registro</h4>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Solo pueden registrarse personas mayores de 18 años.</li>
                        <li>Los datos aportados deben ser veraces y actualizados.</li>
                        <li>El usuario es responsable del uso de su cuenta y credenciales.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">3. Reservas</h4>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Una reserva se confirma únicamente cuando el negocio acepta la solicitud.</li>
                        <li>Al confirmarse, se genera un voucher de reserva con los datos del servicio contratado.</li>
                        <li>El voucher es personal e intransferible.</li>
                        <li>Cancelaciones y cambios se rigen por las políticas de cada prestador, que deben estar publicadas en la Plataforma conforme al art. 1100 del CCCN.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">4. Pagos</h4>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Los pagos se procesan exclusivamente mediante pasarelas externas.</li>
                        <li>Nexar Turismo no recibe ni almacena directamente dinero ni datos financieros de usuarios.</li>
                        <li>La Plataforma solo registra la confirmación de la operación para gestionar la reserva.</li>
                        <li>El pago al negocio se libera una vez cumplidas las condiciones pactadas por la pasarela.</li>
                        <li>Cualquier reclamo relacionado al procesamiento del pago deberá canalizarse a través de la pasarela correspondiente.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">5. Responsabilidades</h4>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Los negocios son responsables de la calidad, seguridad y cumplimiento del servicio ofrecido.</li>
                        <li>Los clientes son responsables de respetar las normas de uso establecidas por cada negocio.</li>
                        <li>Nexar Turismo no se hace responsable por daños, incumplimientos o conflictos entre las partes, aunque podrá intervenir como mediador cuando existan pruebas verificables.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">6. Propiedad intelectual</h4>
                      <p className="mb-4">
                        Todos los logos, diseños, marcas y contenidos de Nexar Turismo están protegidos por la Ley de Propiedad Intelectual N.º 11.723. Su uso sin autorización está prohibido.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">7. Suspensión de cuentas</h4>
                      <p className="mb-4">
                        Nexar Turismo podrá suspender o dar de baja cuentas en casos de fraude, incumplimiento de estos términos, uso indebido de la plataforma o conducta inadecuada.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">8. Jurisdicción y ley aplicable</h4>
                      <p className="mb-2">
                        Nexar Turismo se limita a actuar como intermediario digital y no es parte de los contratos celebrados entre clientes y prestadores, quienes deberán resolver sus conflictos conforme a la ley argentina y a la jurisdicción que corresponda según su relación.
                      </p>
                      <p className="mb-2">
                        Para cualquier controversia directamente vinculada con el uso de la Plataforma, será de aplicación la legislación argentina y serán competentes los tribunales ordinarios de San Carlos de Bariloche, Provincia de Río Negro, República Argentina.
                      </p>
                      <p className="mb-4">
                        En el caso de consumidores finales, se aplicará además lo dispuesto por la Ley de Defensa del Consumidor N.º 24.240 y el Código Civil y Comercial de la Nación, respetando la opción de reclamar en su domicilio o en el de la Plataforma.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">9. Modificaciones</h4>
                      <p>
                        La Plataforma podrá modificar estos Términos en cualquier momento. Los cambios entrarán en vigencia desde su publicación en el sitio web.
                      </p>
                    </section>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
                >
                  Entiendo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Política de Privacidad
                </h2>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    POLÍTICA DE PRIVACIDAD – NEXAR TURISMO (Argentina)
                  </h3>
                  
                  <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <section>
                      <p className="mb-4">
                        Nexar Turismo (en adelante, "La Plataforma") respeta y protege los datos personales de sus usuarios (clientes, negocios, revendedores y referidos), conforme a lo dispuesto por la Ley N.º 25.326 de Protección de Datos Personales y sus modificatorias.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">1. Datos que recopilamos</h4>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li><strong>Información personal:</strong> nombre, apellido, DNI, CUIT/CUIL (cuando corresponda), domicilio, correo electrónico, teléfono.</li>
                        <li><strong>Información comercial:</strong> descripción de servicios, precios, facturación.</li>
                        <li><strong>Datos de uso:</strong> historial de reservas, puntuaciones, preferencias.</li>
                        <li><strong>Datos de pago:</strong> la Plataforma no almacena información sensible de tarjetas o cuentas bancarias. Los pagos se procesan a través de pasarelas externas seguras, que cumplen con las normas de seguridad PCI DSS.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">2. Finalidad</h4>
                      <p className="mb-2">Los datos se recaban para:</p>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Gestionar reservas y generar vouchers.</li>
                        <li>Facilitar la comunicación entre clientes y negocios.</li>
                        <li>Emitir facturas según normativa de AFIP.</li>
                        <li>Analizar estadísticas de uso para mejorar la experiencia.</li>
                        <li>Cumplir obligaciones legales y contractuales.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">3. Protección y resguardo</h4>
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Los datos se almacenan en servidores seguros, con cifrado SSL.</li>
                        <li>Solo el personal autorizado accede a la información, bajo deber de confidencialidad.</li>
                        <li>No se ceden a terceros sin consentimiento, salvo obligación legal.</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">4. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)</h4>
                      <p className="mb-4">
                        Los usuarios pueden ejercer estos derechos según lo previsto en la Ley 25.326, enviando solicitud al correo oficial de la Plataforma.
                      </p>
                      <p className="mb-4">
                        La Dirección Nacional de Protección de Datos Personales es la autoridad de control en Argentina, y los usuarios pueden presentar reclamos ante ella si consideran vulnerados sus derechos.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">5. Cookies</h4>
                      <p className="mb-4">
                        Se utilizan cookies para optimizar la experiencia. Pueden deshabilitarse desde el navegador.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">6. Cambios en la política</h4>
                      <p>
                        La Plataforma podrá modificar la presente política en cualquier momento. Los cambios entrarán en vigencia desde su publicación en el sitio web.
                      </p>
                    </section>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
                >
                  Entiendo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
