const Bitacora = require('../models/Bitacora');

// Middleware para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error en consola
  console.error('❌ Error:', err);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message: `Error de validación: ${message}`,
      statusCode: 400
    };
  }

  // Error de duplicado en Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      message: `${field} ya existe en el sistema`,
      statusCode: 400
    };
  }

  // Error de ObjectId inválido
  if (err.name === 'CastError') {
    error = {
      message: 'ID de recurso inválido',
      statusCode: 400
    };
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Token inválido',
      statusCode: 401
    };
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expirado',
      statusCode: 401
    };
  }

  // Error de archivo
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'Archivo demasiado grande',
      statusCode: 400
    };
  }

  // Error de CSV
  if (err.name === 'CSVError') {
    error = {
      message: `Error en archivo CSV: ${err.message}`,
      statusCode: 400
    };
  }

  // Registrar error en bitácora si hay usuario autenticado
  if (req.user && req.user.id) {
    registrarErrorEnBitacora(req, err, error);
  }

  // Respuesta de error
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Función para registrar errores en bitácora
const registrarErrorEnBitacora = async (req, err, error) => {
  try {
    await Bitacora.registrarAccion({
      usuario: req.user.id,
      accion: 'ERROR_SISTEMA',
      descripcion: `Error: ${error.message}`,
      endpoint: req.originalUrl,
      metodo: req.method,
      request: {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers
      },
      response: {
        statusCode: error.statusCode || 500,
        body: { error: error.message }
      },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      recurso: {
        tipo: 'Sistema'
      },
      exito: false,
      error: {
        codigo: err.name,
        mensaje: err.message,
        stack: err.stack
      }
    });
  } catch (bitacoraError) {
    console.error('Error al registrar en bitácora:', bitacoraError);
  }
};

// Middleware para rutas no encontradas
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware para validación de entrada
const validarEntrada = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

module.exports = {
  errorHandler,
  notFound,
  validarEntrada
};

