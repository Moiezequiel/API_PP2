const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para bitácora de acciones del sistema
const bitacoraSchema = new Schema({
  // Información del usuario
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Información de la acción
  accion: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'REGISTRO',
      'CREAR_PRODUCTO', 'ACTUALIZAR_PRODUCTO', 'ELIMINAR_PRODUCTO',
      'CREAR_CLIENTE', 'ACTUALIZAR_CLIENTE', 'ELIMINAR_CLIENTE',
      'CREAR_VENTA', 'ACTUALIZAR_VENTA', 'CANCELAR_VENTA',
      'GENERAR_DTE', 'FIRMAR_DTE', 'ENVIAR_DTE', 'ANULAR_DTE',
      'IMPORTAR_PRODUCTOS', 'EXPORTAR_DTES',
      'ACCESO_DENEGADO', 'ERROR_SISTEMA'
    ]
  },
  
  // Descripción detallada
  descripcion: {
    type: String,
    required: true
  },
  
  // Endpoint accedido
  endpoint: {
    type: String,
    required: true
  },
  
  // Método HTTP
  metodo: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  
  // Información de la petición
  request: {
    body: Schema.Types.Mixed,
    query: Schema.Types.Mixed,
    params: Schema.Types.Mixed,
    headers: {
      'user-agent': String,
      'x-forwarded-for': String,
      'x-real-ip': String
    }
  },
  
  // Información de la respuesta
  response: {
    statusCode: Number,
    body: Schema.Types.Mixed,
    tiempoRespuesta: Number // en milisegundos
  },
  
  // Información de IP y ubicación
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  
  // Información del recurso afectado
  recurso: {
    tipo: {
      type: String,
      enum: ['Producto', 'Cliente', 'Venta', 'DTE', 'Usuario', 'Sistema']
    },
    id: {
      type: Schema.Types.ObjectId,
      default: null
    },
    identificador: {
      type: String,
      default: null
    }
  },
  
  // Resultado de la acción
  exito: {
    type: Boolean,
    required: true
  },
  
  // Error si aplica
  error: {
    codigo: String,
    mensaje: String,
    stack: String
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Método estático para registrar acción
bitacoraSchema.statics.registrarAccion = async function(datos) {
  const {
    usuario,
    accion,
    descripcion,
    endpoint,
    metodo,
    request,
    response,
    ip,
    userAgent,
    recurso,
    exito,
    error
  } = datos;
  
  const entrada = new this({
    usuario,
    accion,
    descripcion,
    endpoint,
    metodo,
    request: {
      body: request.body,
      query: request.query,
      params: request.params,
      headers: {
        'user-agent': request.headers['user-agent'],
        'x-forwarded-for': request.headers['x-forwarded-for'],
        'x-real-ip': request.headers['x-real-ip']
      }
    },
    response: {
      statusCode: response.statusCode,
      body: response.body,
      tiempoRespuesta: response.tiempoRespuesta
    },
    ip,
    userAgent,
    recurso,
    exito,
    error
  });
  
  return await entrada.save();
};

// Método estático para obtener acciones de un usuario
bitacoraSchema.statics.obtenerAccionesUsuario = async function(usuarioId, limite = 50, pagina = 1) {
  const skip = (pagina - 1) * limite;
  
  return await this.find({ usuario: usuarioId })
    .sort({ timestamp: -1 })
    .limit(limite)
    .skip(skip)
    .populate('usuario', 'name email role');
};

// Método estático para obtener estadísticas
bitacoraSchema.statics.obtenerEstadisticas = async function(fechaInicio, fechaFin) {
  const match = {};
  
  if (fechaInicio && fechaFin) {
    match.timestamp = {
      $gte: new Date(fechaInicio),
      $lte: new Date(fechaFin)
    };
  }
  
  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$accion',
        total: { $sum: 1 },
        exitosos: {
          $sum: { $cond: ['$exito', 1, 0] }
        },
        fallidos: {
          $sum: { $cond: ['$exito', 0, 1] }
        }
      }
    },
    { $sort: { total: -1 } }
  ];
  
  return await this.aggregate(pipeline);
};

const Bitacora = mongoose.model('Bitacora', bitacoraSchema);

module.exports = Bitacora;

