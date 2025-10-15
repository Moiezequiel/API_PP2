const express = require('express');
const router = express.Router();

// Controladores
const {
  obtenerClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerHistorialVentas,
  buscarClientePorNIT,
  obtenerEstadisticasClientes
} = require('../controllers/clienteController');

// Middleware
const { auth, authorize } = require('../middleware/auth');
const { bitacoraClientes } = require('../middleware/bitacora');

// Rutas públicas (solo lectura básica)
router.get('/buscar/nit/:nit', buscarClientePorNIT);

// Rutas protegidas (requieren autenticación)
router.use(auth);

// CRUD de clientes
router.get('/', obtenerClientes);
router.get('/estadisticas', authorize('admin', 'accountant'), obtenerEstadisticasClientes);
router.get('/:id', obtenerCliente);
router.get('/:id/historial', obtenerHistorialVentas);

router.post('/', authorize('admin', 'user'), bitacoraClientes.crear, crearCliente);
router.put('/:id', authorize('admin', 'user'), bitacoraClientes.actualizar, actualizarCliente);
router.delete('/:id', authorize('admin'), bitacoraClientes.eliminar, eliminarCliente);

module.exports = router;

