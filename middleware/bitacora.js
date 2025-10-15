const Bitacora = require('../models/Bitacora');

// Middleware para registrar acciones en bitácora
const registrarBitacora = (accion, descripcion) => {
  return async (req, res, next) => {
    const inicioTiempo = Date.now();
    
    // Guardar referencia a la función de respuesta original
    const resJson = res.json;
    const resSend = res.send;
    const resEnd = res.end;
    
    let responseBody = null;
    let statusCode = 200;
    
    // Interceptar respuesta para capturar datos
    res.json = function(body) {
      responseBody = body;
      statusCode = res.statusCode;
      return resJson.call(this, body);
    };
    
    res.send = function(body) {
      responseBody = body;
      statusCode = res.statusCode;
      return resSend.call(this, body);
    };
    
    res.end = function(body) {
      responseBody = body;
      statusCode = res.statusCode;
      return resEnd.call(this, body);
    };
    
    // Continuar con la siguiente función
    next();
    
    // Registrar en bitácora después de la respuesta
    res.on('finish', async () => {
      try {
        const tiempoRespuesta = Date.now() - inicioTiempo;
        
        // Determinar si la acción fue exitosa
        const exito = statusCode >= 200 && statusCode < 400;
        
        // Obtener información del recurso si aplica
        let recurso = { tipo: 'Sistema' };
        
        if (responseBody && responseBody.data) {
          if (responseBody.data._id) {
            recurso.id = responseBody.data._id;
          }
          if (responseBody.data.numeroVenta) {
            recurso.identificador = responseBody.data.numeroVenta;
          }
          if (responseBody.data.numeroDTE) {
            recurso.identificador = responseBody.data.numeroDTE;
          }
          if (responseBody.data.codigo) {
            recurso.identificador = responseBody.data.codigo;
          }
          if (responseBody.data.nit) {
            recurso.identificador = responseBody.data.nit;
          }
        }
        
        // Determinar tipo de recurso basado en la ruta
        if (req.originalUrl.includes('/productos')) {
          recurso.tipo = 'Producto';
        } else if (req.originalUrl.includes('/clientes')) {
          recurso.tipo = 'Cliente';
        } else if (req.originalUrl.includes('/ventas')) {
          recurso.tipo = 'Venta';
        } else if (req.originalUrl.includes('/dte')) {
          recurso.tipo = 'DTE';
        } else if (req.originalUrl.includes('/auth')) {
          recurso.tipo = 'Usuario';
        }
        
        await Bitacora.registrarAccion({
          usuario: req.user ? req.user.id : null,
          accion: accion,
          descripcion: descripcion,
          endpoint: req.originalUrl,
          metodo: req.method,
          request: {
            body: req.body,
            query: req.query,
            params: req.params,
            headers: req.headers
          },
          response: {
            statusCode: statusCode,
            body: responseBody,
            tiempoRespuesta: tiempoRespuesta
          },
          ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
          userAgent: req.get('User-Agent'),
          recurso: recurso,
          exito: exito,
          error: !exito ? {
            codigo: statusCode,
            mensaje: responseBody?.error || 'Error desconocido'
          } : null
        });
        
      } catch (error) {
        console.error('Error al registrar en bitácora:', error);
      }
    });
  };
};

// Middleware específico para diferentes acciones
const bitacoraAuth = {
  login: registrarBitacora('LOGIN', 'Usuario inició sesión'),
  logout: registrarBitacora('LOGOUT', 'Usuario cerró sesión'),
  registro: registrarBitacora('REGISTRO', 'Usuario se registró')
};

const bitacoraProductos = {
  crear: registrarBitacora('CREAR_PRODUCTO', 'Producto creado'),
  actualizar: registrarBitacora('ACTUALIZAR_PRODUCTO', 'Producto actualizado'),
  eliminar: registrarBitacora('ELIMINAR_PRODUCTO', 'Producto eliminado'),
  importar: registrarBitacora('IMPORTAR_PRODUCTOS', 'Productos importados desde CSV')
};

const bitacoraClientes = {
  crear: registrarBitacora('CREAR_CLIENTE', 'Cliente creado'),
  actualizar: registrarBitacora('ACTUALIZAR_CLIENTE', 'Cliente actualizado'),
  eliminar: registrarBitacora('ELIMINAR_CLIENTE', 'Cliente eliminado')
};

const bitacoraVentas = {
  crear: registrarBitacora('CREAR_VENTA', 'Venta creada'),
  actualizar: registrarBitacora('ACTUALIZAR_VENTA', 'Venta actualizada'),
  cancelar: registrarBitacora('CANCELAR_VENTA', 'Venta cancelada')
};

const bitacoraDTE = {
  generar: registrarBitacora('GENERAR_DTE', 'DTE generado'),
  firmar: registrarBitacora('FIRMAR_DTE', 'DTE firmado digitalmente'),
  enviar: registrarBitacora('ENVIAR_DTE', 'DTE enviado por correo'),
  anular: registrarBitacora('ANULAR_DTE', 'DTE anulado'),
  exportar: registrarBitacora('EXPORTAR_DTES', 'DTEs exportados en ZIP')
};

// Middleware para acceso denegado
const bitacoraAccesoDenegado = async (req, res, next) => {
  try {
    await Bitacora.registrarAccion({
      usuario: req.user ? req.user.id : null,
      accion: 'ACCESO_DENEGADO',
      descripcion: 'Acceso denegado por permisos insuficientes',
      endpoint: req.originalUrl,
      metodo: req.method,
      request: {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers
      },
      response: {
        statusCode: 403,
        body: { error: 'Acceso denegado' }
      },
      ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
      userAgent: req.get('User-Agent'),
      recurso: { tipo: 'Sistema' },
      exito: false,
      error: {
        codigo: 'FORBIDDEN',
        mensaje: 'Permisos insuficientes'
      }
    });
  } catch (error) {
    console.error('Error al registrar acceso denegado:', error);
  }
  
  res.status(403).json({
    success: false,
    error: 'Acceso denegado. Permisos insuficientes.'
  });
};

module.exports = {
  registrarBitacora,
  bitacoraAuth,
  bitacoraProductos,
  bitacoraClientes,
  bitacoraVentas,
  bitacoraDTE,
  bitacoraAccesoDenegado
};

