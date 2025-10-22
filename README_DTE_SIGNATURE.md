# API de Facturación Electrónica - El Salvador

## Sistema de Simulación de Firma Digital DTE

Este proyecto implementa un sistema completo de facturación electrónica para El Salvador con **simulación avanzada de firma digital** para Documentos Tributarios Electrónicos (DTE). El sistema simula todo el proceso de firma digital sin requerir certificados reales, ideal para desarrollo, pruebas y demostraciones.

## 🚀 Características Principales

### Simulación de Firma Digital
- **Firma digital simulada** con algoritmos SHA256 y RSA
- **Certificados X.509 simulados** con datos realistas
- **Validación de firmas** con verificación de integridad
- **Gestión de certificados** con revocación simulada
- **Estados de DTE** simulados (PENDING, ACCEPTED, REJECTED, OBSERVED)

### Módulos del Sistema
1. **Productos** - CRUD completo con importación CSV
2. **Clientes** - Gestión con validación de NIT salvadoreño
3. **Ventas** - Sistema de ventas con cálculos de IVA (13%)
4. **DTE** - Generación, firma y gestión de documentos tributarios
5. **Bitácora** - Logging completo de todas las acciones
6. **Autenticación** - Sistema JWT con roles (admin, accountant, seller)

## 📋 Requisitos

- Node.js 16+
- MongoDB 4.4+
- npm o yarn

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd API_PP2

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar el servidor
npm run dev
```

## 🔧 Configuración

### Variables de Entorno

```env
# Base de datos
MONGO_URI=mongodb://127.0.0.1:27017/facturacion

# Servidor
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro

# Email (opcional para desarrollo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password
```

## 📚 Documentación API

La documentación completa está disponible en Swagger UI:
- **URL**: `http://localhost:5000/api-docs`
- **Autenticación**: Bearer Token (JWT)

## 🔐 Autenticación

### Registro de Usuario
```bash
POST /api/auth/register
{
  "name": "Usuario Demo",
  "email": "demo@example.com",
  "password": "password123",
  "dui": "12345678-9",
  "businessName": "Empresa Demo S.A. de C.V."
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "demo@example.com",
  "password": "password123"
}
```

## 📄 Simulación de Firma Digital DTE

### 1. Generar DTE con Firma Digital

```bash
POST /api/dte/generar
Authorization: Bearer <token>
{
  "ventaId": "venta_id",
  "tipoDTE": "01"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "numeroDTE": "20241200000001",
    "firmaDigital": {
      "signature": "a1b2c3d4e5f6...",
      "signedAt": "2024-12-01T10:30:00.000Z",
      "hash": "sha256_hash_here",
      "algorithm": "RSA-SHA256",
      "keySize": 2048,
      "signatureId": "SIG-1701435000000-ABCD1234",
      "validationCode": "ABCD1234EFGH5678",
      "certificado": "CN=Empresa Demo S.A. de C.V., OU=Facturación Electrónica..."
    },
    "estado": "Aceptado",
    "archivos": {
      "xml": {
        "contenido": "<?xml version=\"1.0\"...",
        "hash": "sha256_hash_here",
        "signature": "a1b2c3d4e5f6..."
      }
    }
  }
}
```

### 2. Validar Firma Digital

```bash
POST /api/dte/{dteId}/validar-firma
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "dteId": "dte_id",
    "numeroDTE": "20241200000001",
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": [],
      "certificateStatus": "VALID",
      "signatureAlgorithm": "RSA-SHA256",
      "validationTimestamp": "2024-12-01T10:35:00.000Z"
    },
    "signatureInfo": {
      "signatureId": "SIG-1701435000000-ABCD1234",
      "algorithm": "RSA-SHA256",
      "keySize": 2048,
      "signedAt": "2024-12-01T10:30:00.000Z",
      "validationCode": "ABCD1234EFGH5678"
    }
  }
}
```

### 3. Gestión de Certificados

#### Obtener Certificados Disponibles
```bash
GET /api/dte/certificados
Authorization: Bearer <token>
```

#### Revocar Certificado
```bash
PUT /api/dte/certificados/{nit}/revocar
Authorization: Bearer <token>
```

### 4. Simulación de Estados

```bash
POST /api/dte/{dteId}/simular-estado
Authorization: Bearer <token>
{
  "nuevoEstado": "Observado"
}
```

## 🏗️ Arquitectura del Sistema

### Estructura de Archivos
```
API_PP2/
├── controllers/          # Controladores de la API
│   ├── dteController.js  # Lógica de DTE y firma digital
│   ├── authController.js
│   ├── clienteController.js
│   ├── productoController.js
│   ├── ventaController.js
│   └── bitacoraController.js
├── models/               # Modelos de MongoDB
│   ├── DTE.js           # Modelo DTE con métodos de firma
│   ├── User.js
│   ├── Cliente.js
│   ├── Producto.js
│   ├── Venta.js
│   └── Bitacora.js
├── services/            # Servicios especializados
│   └── signatureService.js  # Servicio de simulación de firma
├── middleware/          # Middleware personalizado
│   ├── auth.js         # Autenticación JWT
│   ├── bitacora.js     # Logging de acciones
│   └── errorHandler.js  # Manejo de errores
├── routes/             # Definición de rutas
│   ├── dteRoutes.js    # Rutas de DTE
│   ├── authRoutes.js
│   ├── clienteRoutes.js
│   ├── productoRoutes.js
│   ├── ventaRoutes.js
│   └── bitacoraRoutes.js
├── swagger/            # Documentación API
│   └── swagger.js
├── tests/              # Pruebas unitarias
│   └── dte-signature.test.js
└── server.js          # Servidor principal
```

### Servicio de Firma Digital

El `SignatureService` es el núcleo de la simulación:

```javascript
const SignatureService = require('./services/signatureService');

// Generar firma digital
const signature = SignatureService.generateDigitalSignature(dteData, emisorNit);

// Validar firma
const validation = SignatureService.validateDigitalSignature(signature, originalData);

// Gestión de certificados
const certificates = SignatureService.getAvailableCertificates();
const result = SignatureService.revokeCertificate(nit);
```

## 🔍 Características de la Simulación

### Certificados Simulados
- **Emisor**: Autoridad Certificadora de El Salvador
- **Algoritmo**: RSA-SHA256
- **Tamaño de clave**: 2048 bits
- **Vigencia**: 2 años
- **Formato**: X.509 v3

### Estados de DTE Simulados
- **PENDING**: Documento pendiente de procesamiento
- **ACCEPTED**: Documento aceptado (80% probabilidad)
- **REJECTED**: Documento rechazado (10% probabilidad)
- **OBSERVED**: Documento observado (10% probabilidad)

### Validaciones Implementadas
- ✅ Verificación de integridad del hash
- ✅ Validación de fechas de certificado
- ✅ Verificación de algoritmo de firma
- ✅ Detección de modificaciones en datos
- ✅ Validación de estructura XML

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas de firma digital
npm test tests/dte-signature.test.js
```

### Cobertura de Pruebas
- ✅ Generación de firmas digitales
- ✅ Validación de firmas
- ✅ Gestión de certificados
- ✅ Simulación de estados
- ✅ Endpoints de API
- ✅ Integración completa

## 📊 Monitoreo y Logging

### Bitácora de Actividades
Todas las acciones se registran automáticamente:
- Generación de DTE
- Validación de firmas
- Cambios de estado
- Revocación de certificados
- Accesos denegados

### Consultar Bitácora
```bash
GET /api/bitacora
Authorization: Bearer <token>
```

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Docker (Opcional)
```bash
docker build -t dte-api .
docker run -p 5000:5000 dte-api
```

## 🔒 Seguridad

- **Autenticación JWT** con roles y permisos
- **Validación de entrada** con Joi
- **Sanitización de datos** en todas las entradas
- **Logging de seguridad** en bitácora
- **Rate limiting** (recomendado para producción)

## 📈 Rendimiento

- **Índices de MongoDB** optimizados
- **Paginación** en todas las consultas
- **Compresión** de archivos ZIP
- **Caché** de certificados en memoria

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- **Email**: soporte@empresa.com
- **Documentación**: http://localhost:5000/api-docs
- **Issues**: GitHub Issues

## 🔄 Changelog

### v1.0.0 (2024-12-01)
- ✅ Sistema completo de simulación de firma digital
- ✅ Certificados X.509 simulados
- ✅ Validación de firmas digitales
- ✅ Gestión de estados de DTE
- ✅ Documentación Swagger completa
- ✅ Pruebas unitarias e integración
- ✅ Sistema de bitácora y logging

---

**Nota**: Este sistema es una simulación educativa y no debe usarse en producción sin las certificaciones digitales reales correspondientes.
