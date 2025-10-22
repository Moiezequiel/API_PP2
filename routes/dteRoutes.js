const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DTESignatureValidation:
 *       type: object
 *       properties:
 *         dteId:
 *           type: string
 *           description: ID del DTE
 *         numeroDTE:
 *           type: string
 *           description: Número del DTE
 *         validation:
 *           $ref: '#/components/schemas/SignatureValidation'
 *         signatureInfo:
 *           type: object
 *           properties:
 *             signatureId:
 *               type: string
 *             algorithm:
 *               type: string
 *             keySize:
 *               type: number
 *             signedAt:
 *               type: string
 *               format: date-time
 *             validationCode:
 *               type: string
 */

// Controladores
const {
  obtenerDTEs,
  obtenerDTE,
  generarDTE,
  enviarDTE,
  anularDTE,
  exportarDTEsZIP,
  validarFirmaDigital,
  obtenerCertificados,
  revocarCertificado,
  simularCambioEstado
} = require('../controllers/dteController');

// Middleware
const { auth, authorize } = require('../middleware/auth');
const { bitacoraDTE } = require('../middleware/bitacora');

// Todas las rutas requieren autenticación
router.use(auth);

// CRUD de DTEs
router.get('/', obtenerDTEs);
router.get('/exportar', authorize('admin', 'accountant'), bitacoraDTE.exportar, exportarDTEsZIP);
/**
 * @swagger
 * /api/dte/certificados:
 *   get:
 *     summary: Obtener certificados digitales disponibles
 *     tags: [DTE]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de certificados obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 *                 message:
 *                   type: string
 *                   example: Certificados simulados disponibles
 *       500:
 *         description: Error interno del servidor
 */
router.get('/certificados', authorize('admin', 'accountant'), obtenerCertificados);
router.get('/:id', obtenerDTE);

router.post('/generar', authorize('admin', 'user'), bitacoraDTE.generar, generarDTE);
router.post('/:dteId/enviar', authorize('admin', 'user'), bitacoraDTE.enviar, enviarDTE);
/**
 * @swagger
 * /api/dte/{dteId}/validar-firma:
 *   post:
 *     summary: Validar firma digital de un DTE
 *     tags: [DTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del DTE
 *     responses:
 *       200:
 *         description: Validación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DTESignatureValidation'
 *       400:
 *         description: El DTE no tiene firma digital
 *       404:
 *         description: DTE no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/:dteId/validar-firma', authorize('admin', 'accountant'), bitacoraDTE.firmar, validarFirmaDigital);

/**
 * @swagger
 * /api/dte/{dteId}/simular-estado:
 *   post:
 *     summary: Simular cambio de estado de un DTE
 *     tags: [DTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del DTE
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nuevoEstado
 *             properties:
 *               nuevoEstado:
 *                 type: string
 *                 enum: [Pendiente, Aceptado, Rechazado, Observado]
 *                 description: Nuevo estado del DTE
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     dteId:
 *                       type: string
 *                     numeroDTE:
 *                       type: string
 *                     estadoAnterior:
 *                       type: string
 *                     estadoNuevo:
 *                       type: string
 *                     fechaCambio:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Estado no válido
 *       404:
 *         description: DTE no encontrado
 */
router.post('/:dteId/simular-estado', authorize('admin'), simularCambioEstado);

router.put('/:dteId/anular', authorize('admin', 'accountant'), bitacoraDTE.anular, anularDTE);

/**
 * @swagger
 * /api/dte/certificados/{nit}/revocar:
 *   put:
 *     summary: Revocar certificado digital
 *     tags: [DTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nit
 *         required: true
 *         schema:
 *           type: string
 *         description: NIT del emisor
 *     responses:
 *       200:
 *         description: Certificado revocado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     revocationDate:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       404:
 *         description: Certificado no encontrado
 */
router.put('/certificados/:nit/revocar', authorize('admin'), revocarCertificado);

module.exports = router;


