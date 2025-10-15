# Sistema de Facturación Electrónica - API (El Salvador)

## Descripción
API REST para sistema de facturación electrónica con autenticación JWT y MongoDB Atlas, adaptado para El Salvador.

## Configuración

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración del servidor
PORT=5000

# Configuración de MongoDB Atlas
MONGO_URI=mongodb+srv://tu_usuario:tu_password@tu_cluster.mongodb.net/tu_base_de_datos?retryWrites=true&w=majority

# Configuración de JWT
JWT_SECRET=tu_jwt_secret_super_seguro_y_largo_al_menos_32_caracteres

# Configuración de CORS (opcional)
CORS_ORIGIN=http://localhost:3000
```

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Ejecutar el Servidor
```bash
npm start
```

## Endpoints de Autenticación

### Registro de Usuario
**POST** `/api/auth/register`

```json
{
  "name": "Juan Carlos Pérez",
  "email": "juan@empresa.com",
  "password": "123456",
  "dui": "1234-56789-0",
  "businessName": "Juan Carlos Pérez",
  "commercialName": "Juan Pérez",
  "phone": "+503 9999 9999",
  "address": {
    "street": "Av. Test 123",
    "city": "San Salvador",
    "state": "San Salvador",
    "zipCode": "1101"
  },
  "taxRegime": "General",
  "role": "user"
}
```

**⚠️ IMPORTANTE: DUI Simplificado para Proyecto Estudiantil**
Para las pruebas, puedes usar cualquier DUI que tenga al menos 5 caracteres:
```json
{
  "dui": "1234-56789-0"
}
```
Ejemplos válidos:
- `1234-56789-0`
- `0001-00001-0`
- `1234567890`
- `DUI-12345`
- `12345678`

**Respuesta:**
```json
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Juan Carlos Pérez",
    "email": "juan@empresa.com",
    "businessName": "Juan Carlos Pérez",
    "dui": "1234-56789-0",
    "role": "user"
  }
}
```

### Login de Usuario
**POST** `/api/auth/login`

```json
{
  "email": "juan@empresa.com",
  "password": "123456"
}
```

**Respuesta:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Juan Carlos Pérez",
    "email": "juan@empresa.com",
    "businessName": "Juan Carlos Pérez",
    "dui": "1234-56789-0",
    "role": "user",
    "taxRegime": "General"
  }
}
```

### Obtener Perfil
**GET** `/api/auth/profile`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Actualizar Perfil
**PUT** `/api/auth/profile`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "name": "Juan Carlos Pérez Actualizado",
  "phone": "+503 8888 7777",
  "commercialName": "Juan Pérez Actualizado",
  "address": {
    "street": "Av. Actualizada 456",
    "city": "San Salvador",
    "state": "San Salvador",
    "zipCode": "1102"
  }
}
```

## Validaciones

### Campos Obligatorios para Registro:
- `name`: Nombre completo
- `email`: Email válido y único
- `password`: Mínimo 6 caracteres
- `dui`: Al menos 5 caracteres (flexible para proyecto estudiantil)
- `businessName`: Razón social o nombre completo

### Validaciones Específicas:
- **Email**: Formato válido y único en la base de datos
- **DUI**: Al menos 5 caracteres (validación simplificada)
- **Contraseña**: Mínimo 6 caracteres, hasheada con bcrypt
- **Régimen Tributario**: Valores permitidos: General, Pequeño Contribuyente, Grande Contribuyente

## Solución de Errores 400

### Error 400 - "Todos los campos obligatorios deben ser completados"
**Causa:** Faltan campos obligatorios
**Solución:** Asegúrate de incluir todos estos campos:
- `name`
- `email`
- `password`
- `dui`
- `businessName`

### Error 400 - "Formato de email inválido"
**Causa:** Email no tiene formato válido
**Solución:** Usa un email con formato correcto: `usuario@dominio.com`

### Error 400 - "La contraseña debe tener al menos 6 caracteres"
**Causa:** Contraseña muy corta
**Solución:** Usa una contraseña de al menos 6 caracteres

### Error 400 - "El DUI debe tener al menos 5 caracteres"
**Causa:** DUI muy corto
**Solución:** Usa un DUI con al menos 5 caracteres

### Error 400 - "El correo ya está registrado"
**Causa:** Email ya existe en la base de datos
**Solución:** Usa un email diferente

### Error 400 - "El DUI ya está registrado"
**Causa:** DUI ya existe en la base de datos
**Solución:** Usa un DUI diferente

## Roles de Usuario
- `admin`: Administrador del sistema
- `user`: Usuario regular (por defecto)
- `accountant`: Contador/contador público

## Seguridad
- Contraseñas hasheadas con bcrypt (12 rounds)
- Tokens JWT con expiración de 7 días
- Validación de DUI simplificada
- Middleware de autenticación para rutas protegidas
- Validación de usuario activo

## Estructura de la Base de Datos

### Usuario (User)
```javascript
{
  name: String,           // Nombre completo
  email: String,          // Email único
  password: String,       // Hasheada
  dui: String,           // DUI único (al menos 5 caracteres)
  businessName: String,   // Razón social o nombre completo
  commercialName: String, // Nombre comercial
  phone: String,         // Teléfono
  address: {             // Dirección
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  taxRegime: String,     // Régimen tributario
  isActive: Boolean,     // Estado activo
  role: String,          // Rol del usuario
  createdAt: Date,       // Fecha de creación
  updatedAt: Date        // Fecha de actualización
}
```

## Códigos de Error

- `400`: Error de validación o datos incorrectos
- `401`: No autorizado (token inválido o faltante)
- `403`: Prohibido (sin permisos)
- `404`: Recurso no encontrado
- `500`: Error interno del servidor
