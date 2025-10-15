const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Controladores
const {
  obtenerProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  consultarInventario,
  importarProductosCSV,
  exportarProductosCSV
} = require('../controllers/productoController');

// Middleware
const { auth, authorize } = require('../middleware/auth');
const { bitacoraProductos } = require('../middleware/bitacora');

// Configurar multer para archivos CSV
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'productos-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// Rutas públicas (solo lectura)
router.get('/', obtenerProductos);
router.get('/inventario', consultarInventario);
router.get('/exportar', exportarProductosCSV);

// Rutas protegidas (requieren autenticación)
router.use(auth);

// CRUD de productos
router.get('/:id', obtenerProducto);
router.post('/', authorize('admin', 'user'), bitacoraProductos.crear, crearProducto);
router.put('/:id', authorize('admin', 'user'), bitacoraProductos.actualizar, actualizarProducto);
router.delete('/:id', authorize('admin'), bitacoraProductos.eliminar, eliminarProducto);

// Importación de productos
router.post('/importar', 
  authorize('admin'), 
  upload.single('archivo'), 
  bitacoraProductos.importar, 
  importarProductosCSV
);

module.exports = router;


