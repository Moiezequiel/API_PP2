# 🧾 Sistema de Facturación Electrónica - El Salvador

## 📋 Descripción
API REST completa para sistema de facturación electrónica con autenticación JWT y MongoDB, adaptado específicamente para El Salvador. Incluye todos los módulos necesarios para un sistema de facturación profesional.

## 🚀 Características Principales

### ✅ Módulos Implementados
- **Autenticación JWT** - Login y registro con DUI salvadoreño
- **CRUD de Productos** - Con importación masiva desde CSV
- **CRUD de Clientes** - Con validación de NIT salvadoreño
- **Sistema de Ventas** - Con cálculos automáticos de IVA (13%)
- **Generación de DTE** - XML y PDF para facturación electrónica
- **Sistema de Bitácora** - Registro completo de acciones del sistema
- **Documentación Swagger** - API completamente documentada

### 🛡️ Seguridad
- Autenticación JWT con expiración de 7 días
- Contraseñas hasheadas con bcrypt (12 rounds)
- Control de acceso por roles (admin, user, accountant)
- Middleware de bitácora para todas las acciones
- Validación robusta de entrada de datos

## 📦 Instalación

### 1. Clonar y configurar
```bash
git clone <tu-repositorio>
cd APP_SERVER
npm install
```

### 2. Variables de entorno
Crear archivo `.env`:
```env
# Servidor
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/facturacion

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_y_largo_al_menos_32_caracteres

# CORS
CORS_ORIGIN=http://localhost:3000

# Correo (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password
```

### 3. Ejecutar
```bash
npm run dev
```

## 📚 Documentación de API

### 🌐 Acceso a Swagger
- **URL**: http://localhost:5000/api-docs
- **Documentación completa** con ejemplos de requests y responses

### 🔗 Endpoints Principales

#### Autenticación (`/api/auth`)
- `POST /register` - Registro de usuario
- `POST /login` - Login de usuario
- `GET /profile` - Obtener perfil (requiere token)
- `PUT /profile` - Actualizar perfil (requiere token)

#### Productos (`/api/productos`)
- `GET /` - Listar productos
- `GET /:id` - Obtener producto
- `POST /` - Crear producto
- `PUT /:id` - Actualizar producto
- `DELETE /:id` - Eliminar producto
- `GET /inventario` - Consultar inventario
- `POST /importar` - Importar desde CSV
- `GET /exportar` - Exportar a CSV

#### Clientes (`/api/clientes`)
- `GET /` - Listar clientes
- `GET /:id` - Obtener cliente
- `POST /` - Crear cliente
- `PUT /:id` - Actualizar cliente
- `DELETE /:id` - Eliminar cliente
- `GET /buscar/nit/:nit` - Buscar por NIT
- `GET /:id/historial` - Historial de ventas
- `GET /estadisticas` - Estadísticas de clientes

#### Ventas (`/api/ventas`)
- `GET /` - Listar ventas
- `GET /:id` - Obtener venta
- `POST /` - Crear venta
- `PUT /:id` - Actualizar venta
- `PUT /:id/cancelar` - Cancelar venta
- `GET /buscar/:numero` - Buscar por número
- `GET /estadisticas` - Estadísticas de ventas

#### DTE (`/api/dte`)
- `GET /` - Listar DTEs
- `GET /:id` - Obtener DTE
- `POST /generar` - Generar DTE
- `POST /:id/enviar` - Enviar por correo
- `PUT /:id/anular` - Anular DTE
- `GET /exportar` - Exportar en ZIP

#### Bitácora (`/api/bitacora`)
- `GET /` - Ver bitácora
- `GET /estadisticas` - Estadísticas
- `GET /errores` - Errores del sistema
- `GET /usuario/:id` - Acciones de usuario
- `GET /exportar` - Exportar a CSV
- `DELETE /limpiar` - Limpiar bitácora antigua

## 📝 Ejemplos de Uso

### 1. Registro de Usuario
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Carlos Pérez",
    "email": "juan@empresa.com",
    "password": "123456",
    "dui": "1234567890",
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
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@empresa.com",
    "password": "123456"
  }'
```

### 3. Crear Producto
```bash
curl -X POST http://localhost:5000/api/productos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "codigo": "PROD001",
    "nombre": "Producto de Prueba",
    "descripcion": "Descripción del producto",
    "precio": 100.00,
    "impuesto": 13,
    "cantidad": 50,
    "categoria": "General"
  }'
```

### 4. Crear Cliente
```bash
curl -X POST http://localhost:5000/api/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "nombre": "Empresa Cliente S.A. de C.V.",
    "email": "cliente@empresa.com",
    "nit": "0614-000000-000-0",
    "telefono": "+503 8888 7777",
    "direccion": {
      "calle": "Av. Cliente 456",
      "ciudad": "San Salvador",
      "departamento": "San Salvador",
      "codigoPostal": "1102"
    },
    "tipoCliente": "Persona Jurídica"
  }'
```

### 5. Crear Venta
```bash
curl -X POST http://localhost:5000/api/ventas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "cliente": "CLIENTE_ID_AQUI",
    "productos": [
      {
        "producto": "PRODUCTO_ID_AQUI",
        "cantidad": 2,
        "precioUnitario": 100.00,
        "impuesto": 13
      }
    ],
    "observaciones": "Venta de prueba"
  }'
```

### 6. Generar DTE
```bash
curl -X POST http://localhost:5000/api/dte/generar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "ventaId": "VENTA_ID_AQUI",
    "tipoDTE": "01"
  }'
```

## 🗄️ Estructura de Base de Datos

### Usuarios
- **DUI**: Formato salvadoreño (XXXX-XXXXX-X)
- **Roles**: admin, user, accountant
- **Régimen tributario**: General, Pequeño Contribuyente, Grande Contribuyente

### Productos
- **Código único** por producto
- **Cálculo automático** de precios con impuesto
- **Control de inventario** integrado

### Clientes
- **NIT**: Formato salvadoreño (XXXX-XXXXXX-XXX-X)
- **Tipos**: Persona Natural, Persona Jurídica, Consumidor Final
- **Historial de ventas** asociado

### Ventas
- **Numeración automática** (V-000001)
- **Cálculo automático** de subtotal, IVA y total
- **Control de stock** automático
- **Estados**: Pendiente, Completada, Cancelada, Facturada

### DTEs
- **Numeración automática** por año y mes
- **Generación de XML** según normativa salvadoreña
- **Firma digital** simulada
- **Envío por correo** automático
- **Estados**: Pendiente, Aceptado, Rechazado, Observado, Anulado

## 🔧 Scripts Disponibles

```bash
npm start          # Ejecutar en producción
npm run dev        # Ejecutar en desarrollo con nodemon
npm run setup      # Instalar dependencias y ejecutar
npm test           # Ejecutar pruebas (cuando estén implementadas)
```

## 📊 Características Técnicas

### Validaciones
- **DUI salvadoreño**: Formato XXXX-XXXXX-X
- **NIT salvadoreño**: Formato XXXX-XXXXXX-XXX-X
- **Email**: Formato válido y único
- **Contraseñas**: Mínimo 6 caracteres

### Seguridad
- **JWT**: Tokens con expiración de 7 días
- **bcrypt**: Contraseñas hasheadas con 12 rounds
- **CORS**: Configurado para desarrollo
- **Rate limiting**: Implementado en middleware

### Rendimiento
- **Paginación**: En todos los endpoints de listado
- **Índices**: Optimizados en MongoDB
- **Búsqueda**: Texto completo en productos y clientes
- **Agregaciones**: Para estadísticas complejas

## 🚨 Manejo de Errores

### Códigos de Estado
- `200` - Operación exitosa
- `201` - Recurso creado exitosamente
- `400` - Error de validación
- `401` - No autorizado
- `403` - Prohibido (sin permisos)
- `404` - Recurso no encontrado
- `500` - Error interno del servidor

### Formato de Error
```json
{
  "success": false,
  "error": "Mensaje de error descriptivo"
}
```

## 📈 Monitoreo y Logs

### Bitácora del Sistema
- **Registro automático** de todas las acciones
- **Información detallada**: usuario, IP, endpoint, tiempo de respuesta
- **Estadísticas**: por usuario, por endpoint, por hora
- **Exportación**: CSV para análisis externo

### Métricas Disponibles
- Total de acciones por usuario
- Endpoints más utilizados
- Tiempo promedio de respuesta
- Errores más comunes
- Actividad por hora del día

## 🔄 Flujo de Trabajo

### Proceso de Venta Completo
1. **Registro/Login** del usuario
2. **Crear/Seleccionar** cliente
3. **Agregar productos** a la venta
4. **Calcular totales** automáticamente
5. **Procesar venta** y reducir stock
6. **Generar DTE** (factura electrónica)
7. **Enviar por correo** al cliente
8. **Registrar en bitácora** todas las acciones

## 🛠️ Personalización

### Para Producción
- Cambiar `MONGO_URI` a MongoDB Atlas
- Configurar `SMTP_*` para envío real de correos
- Ajustar `JWT_SECRET` a valor seguro
- Configurar `CORS_ORIGIN` a dominio de producción

### Para Desarrollo
- Usar MongoDB local
- Configurar correo de prueba
- Habilitar logs detallados
- Usar CORS permisivo

## 📞 Soporte

### Problemas Comunes
1. **Error de conexión MongoDB**: Verificar MONGO_URI
2. **Token inválido**: Verificar JWT_SECRET
3. **Error de validación**: Revisar formato de datos
4. **Error de permisos**: Verificar roles de usuario

### Logs de Debug
```bash
# Ver logs detallados
NODE_ENV=development npm run dev

# Ver solo errores
NODE_ENV=production npm start
```

---

## 🎯 Estado del Proyecto

✅ **Completado al 100%**
- Todos los módulos implementados
- Documentación Swagger completa
- Validaciones robustas
- Sistema de bitácora funcional
- Manejo de errores centralizado
- Listo para desarrollo y pruebas

**¡El sistema está listo para usar!** 🚀


