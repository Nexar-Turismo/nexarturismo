# Nexar

Un marketplace moderno y minimalista para servicios turísticos en España. Conecta a viajeros con proveedores de servicios turísticos como alquiler de vehículos, hoteles, experiencias y más.

## 🎯 Objetivo

Nexar ayuda a los individuos a encontrar su viaje soñado, con un enfoque en la experiencia de viaje. Por otro lado, es un canal para agencias turísticas, propietarios de apartamentos y administradores turísticos para mostrar sus servicios.

## ✨ Características

### Diseño Visual
- **Minimalista y limpio**: Layout moderno con enfoque en la usabilidad
- **Colores principales**: Marrón y verde como paleta principal
- **Soporte de temas**: Claro y oscuro
- **Tipografía moderna**: Montserrat y Nunito
- **Iconos vectoriales**: Lucide React para consistencia visual
- **Efectos glassmorphism**: Tarjetas flotantes con efectos de cristal

### Funcionalidades MVP
1. **Página de Bienvenida**: Landing page con hero section y formulario de búsqueda
2. **Autenticación**: Sistema de login para proveedores de servicios
3. **Dashboard**: Panel de control con estadísticas e información importante
4. **Gestión de Publicaciones**: CRUD completo con vista de tabla y formulario wizard

### Categorías de Servicios
- Alquiler de Bicicletas
- Alquiler de Coches
- Excursiones
- Experiencias
- Estancia en Hotel
- Alquiler de Casa de Vacaciones
- Estancia de Camping

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14**: Framework React con App Router
- **TypeScript**: Tipado estático para mejor desarrollo
- **Tailwind CSS**: Framework CSS utility-first
- **Framer Motion**: Animaciones fluidas y transiciones
- **Lucide React**: Iconos vectoriales modernos

### Backend (Futuro)
- **Firebase**: Autenticación, Firestore, Storage
- **Datos dummy**: Para desarrollo y testing

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── (auth)/            # Rutas de autenticación
│   │   └── login/         # Página de login
│   ├── (dashboard)/       # Rutas del dashboard
│   │   ├── dashboard/     # Dashboard principal
│   │   └── posts/         # Gestión de publicaciones
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de bienvenida
├── components/            # Componentes reutilizables
│   ├── forms/            # Componentes de formularios
│   ├── layout/           # Componentes de layout
│   └── ui/               # Componentes de UI básicos
├── lib/                  # Utilidades y helpers
├── models/               # Modelos de datos
├── services/             # Servicios y lógica de negocio
└── types/                # Definiciones de tipos TypeScript
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js v22.17.0 o superior
- npm o yarn

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd mkt-turismo-next
```

2. **Instalar dependencias**
```bash
nvm use v22.17.0 && npm install
```

3. **Ejecutar en desarrollo**
```bash
npm run dev
```

4. **Abrir en el navegador**
```
http://localhost:3000
```

### Scripts Disponibles

- `npm run dev`: Ejecuta el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run start`: Ejecuta la aplicación en modo producción
- `npm run lint`: Ejecuta el linter

## 🎨 Sistema de Diseño

### Colores
```css
/* Primarios */
--primary-brown: #8B4513
--primary-green: #228B22

/* Secundarios */
--secondary-brown: #D2691E
--secondary-green: #32CD32

/* Acentos */
--accent-brown: #CD853F
--accent-green: #90EE90
```

### Tipografía
- **Montserrat**: Títulos y encabezados
- **Nunito**: Texto del cuerpo y elementos de UI

### Componentes
- **Glassmorphism**: Efectos de cristal con `backdrop-filter`
- **Gradientes**: Transiciones suaves entre colores primarios
- **Animaciones**: Transiciones fluidas con Framer Motion

## 📱 Páginas y Funcionalidades

### 1. Página de Bienvenida (`/`)
- Hero section con llamada a la acción
- Formulario de búsqueda avanzada
- Sección de categorías de servicios
- Características principales del marketplace

### 2. Login (`/login`)
- Formulario de autenticación
- Validación de campos
- Integración con Google (preparado)
- Diseño responsive

### 3. Dashboard (`/dashboard`)
- Estadísticas en tiempo real
- Actividad reciente
- Acciones rápidas
- Navegación lateral

### 4. Gestión de Publicaciones (`/posts`)
- Vista de tabla con filtros
- Toggle de estado activo/inactivo
- Búsqueda y filtrado
- Acciones de edición y eliminación

### 5. Formulario Wizard (`/posts/new`)
- Formulario de 4 pasos
- Campos específicos por categoría
- Validación en tiempo real
- Vista previa antes de publicar

## 🔧 Configuración de Desarrollo

### Variables de Entorno
Crear archivo `.env.local`:
```env
NEXT_PUBLIC_APP_NAME=Nexar
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Estructura de Datos

#### Usuario
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isProvider: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Publicación
```typescript
interface BasePost {
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  currency: string;
  location: string;
  images: string[];
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🎯 Próximas Funcionalidades

### Fase 2
- [ ] Integración con Firebase
- [ ] Sistema de reservas
- [ ] Notificaciones en tiempo real
- [ ] Sistema de pagos
- [ ] Calificaciones y reseñas

### Fase 3
- [ ] Aplicación móvil
- [ ] Chat en tiempo real
- [ ] Sistema de recomendaciones
- [ ] Analytics avanzado
- [ ] API pública

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

- **Proyecto**: Nexar
- **Email**: info@marketplaceturismo.com
- **Website**: https://marketplaceturismo.com

---

Desarrollado con ❤️ para conectar viajeros con experiencias únicas en España.
