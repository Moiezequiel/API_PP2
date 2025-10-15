const express = require('express');
const router = express.Router();

// Controladores
const {
  obtenerBitacora,
  obtenerAccionesUsuario,
  obtenerEstadisticas,
  obtenerErrores,
  limpiarBitacora,
  exportarBitacoraCSV
} = require('../controllers/bitacoraController');

// Middleware
const { auth, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(auth);
router.use(authorize('admin'));

// Rutas de bitácora
router.get('/', obtenerBitacora);
router.get('/estadisticas', obtenerEstadisticas);
router.get('/errores', obtenerErrores);
router.get('/exportar', exportarBitacoraCSV);
router.get('/usuario/:usuarioId', obtenerAccionesUsuario);

router.delete('/limpiar', limpiarBitacora);

module.exports = router;


