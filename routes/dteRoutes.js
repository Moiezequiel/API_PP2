const express = require('express');
const router = express.Router();

// Controladores
const {
  obtenerDTEs,
  obtenerDTE,
  generarDTE,
  enviarDTE,
  anularDTE,
  exportarDTEsZIP
} = require('../controllers/dteController');

// Middleware
const { auth, authorize } = require('../middleware/auth');
const { bitacoraDTE } = require('../middleware/bitacora');

// Todas las rutas requieren autenticación
router.use(auth);

// CRUD de DTEs
router.get('/', obtenerDTEs);
router.get('/exportar', authorize('admin', 'accountant'), bitacoraDTE.exportar, exportarDTEsZIP);
router.get('/:id', obtenerDTE);

router.post('/generar', authorize('admin', 'user'), bitacoraDTE.generar, generarDTE);
router.post('/:dteId/enviar', authorize('admin', 'user'), bitacoraDTE.enviar, enviarDTE);
router.put('/:dteId/anular', authorize('admin', 'accountant'), bitacoraDTE.anular, anularDTE);

module.exports = router;


