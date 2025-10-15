const express = require('express');
const router = express.Router();

// Controladores
const {
  obtenerVentas,
  obtenerVenta,
  crearVenta,
  actualizarVenta,
  cancelarVenta,
  obtenerEstadisticasVentas,
  buscarVentaPorNumero
} = require('../controllers/ventaController');

// Middleware
const { auth, authorize } = require('../middleware/auth');
const { bitacoraVentas } = require('../middleware/bitacora');

// Todas las rutas requieren autenticación
router.use(auth);

// CRUD de ventas
router.get('/', obtenerVentas);
router.get('/estadisticas', authorize('admin', 'accountant'), obtenerEstadisticasVentas);
router.get('/buscar/:numero', buscarVentaPorNumero);
router.get('/:id', obtenerVenta);

router.post('/', authorize('admin', 'user'), bitacoraVentas.crear, crearVenta);
router.put('/:id', authorize('admin', 'user'), bitacoraVentas.actualizar, actualizarVenta);
router.put('/:id/cancelar', authorize('admin', 'user'), bitacoraVentas.cancelar, cancelarVenta);

module.exports = router;


