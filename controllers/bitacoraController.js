const Bitacora = require('../models/Bitacora');
const User = require('../models/User');

// Obtener bitácora con filtros
const obtenerBitacora = async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 50, 
      usuario,
      accion,
      exito,
      fechaInicio,
      fechaFin,
      endpoint,
      ip
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (usuario) {
      filtros.usuario = usuario;
    }
    
    if (accion) {
      filtros.accion = accion;
    }
    
    if (exito !== undefined) {
      filtros.exito = exito === 'true';
    }
    
    if (endpoint) {
      filtros.endpoint = new RegExp(endpoint, 'i');
    }
    
    if (ip) {
      filtros.ip = new RegExp(ip, 'i');
    }
    
    if (fechaInicio || fechaFin) {
      filtros.timestamp = {};
      if (fechaInicio) {
        filtros.timestamp.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.timestamp.$lte = new Date(fechaFin);
      }
    }

    // Configurar paginación
    const skip = (pagina - 1) * limite;
    
    // Obtener entradas de bitácora con paginación
    const bitacora = await Bitacora.find(filtros)
      .populate('usuario', 'name email role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('-request.body -response.body'); // Excluir datos sensibles

    // Contar total de entradas
    const total = await Bitacora.countDocuments(filtros);

    res.json({
      success: true,
      data: bitacora,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener bitácora:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener bitácora'
    });
  }
};

// Obtener acciones de un usuario específico
const obtenerAccionesUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { limite = 50, pagina = 1 } = req.query;

    // Verificar que el usuario existe
    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const acciones = await Bitacora.obtenerAccionesUsuario(usuarioId, parseInt(limite), parseInt(pagina));

    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario._id,
          name: usuario.name,
          email: usuario.email,
          role: usuario.role
        },
        acciones
      }
    });

  } catch (error) {
    console.error('Error al obtener acciones del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener acciones del usuario'
    });
  }
};

// Obtener estadísticas de la bitácora
const obtenerEstadisticas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const estadisticas = await Bitacora.obtenerEstadisticas(fechaInicio, fechaFin);

    // Estadísticas adicionales
    const pipeline = [
      { $match: {} },
      {
        $group: {
          _id: null,
          totalAcciones: { $sum: 1 },
          accionesExitosas: {
            $sum: { $cond: ['$exito', 1, 0] }
          },
          accionesFallidas: {
            $sum: { $cond: ['$exito', 0, 1] }
          },
          usuariosUnicos: { $addToSet: '$usuario' }
        }
      }
    ];

    if (fechaInicio && fechaFin) {
      pipeline[0].$match.timestamp = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    const resumen = await Bitacora.aggregate(pipeline);

    // Top usuarios por actividad
    const topUsuarios = await Bitacora.aggregate([
      { $match: pipeline[0].$match },
      {
        $group: {
          _id: '$usuario',
          totalAcciones: { $sum: 1 },
          accionesExitosas: {
            $sum: { $cond: ['$exito', 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' },
      {
        $project: {
          usuario: {
            name: '$usuario.name',
            email: '$usuario.email',
            role: '$usuario.role'
          },
          totalAcciones: 1,
          accionesExitosas: 1,
          porcentajeExito: {
            $multiply: [
              { $divide: ['$accionesExitosas', '$totalAcciones'] },
              100
            ]
          }
        }
      },
      { $sort: { totalAcciones: -1 } },
      { $limit: 10 }
    ]);

    // Top endpoints más utilizados
    const topEndpoints = await Bitacora.aggregate([
      { $match: pipeline[0].$match },
      {
        $group: {
          _id: '$endpoint',
          totalAccesos: { $sum: 1 },
          accesosExitosos: {
            $sum: { $cond: ['$exito', 1, 0] }
          },
          tiempoPromedio: { $avg: '$response.tiempoRespuesta' }
        }
      },
      { $sort: { totalAccesos: -1 } },
      { $limit: 10 }
    ]);

    // Actividad por hora del día
    const actividadPorHora = await Bitacora.aggregate([
      { $match: pipeline[0].$match },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          ...resumen[0],
          usuariosUnicos: resumen[0]?.usuariosUnicos?.length || 0
        },
        porAccion: estadisticas,
        topUsuarios,
        topEndpoints,
        actividadPorHora
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

// Obtener errores del sistema
const obtenerErrores = async (req, res) => {
  try {
    const { pagina = 1, limite = 50, fechaInicio, fechaFin } = req.query;

    const filtros = { exito: false };
    
    if (fechaInicio || fechaFin) {
      filtros.timestamp = {};
      if (fechaInicio) {
        filtros.timestamp.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.timestamp.$lte = new Date(fechaFin);
      }
    }

    const skip = (pagina - 1) * limite;
    
    const errores = await Bitacora.find(filtros)
      .populate('usuario', 'name email role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('timestamp usuario accion descripcion endpoint metodo response.statusCode error');

    const total = await Bitacora.countDocuments(filtros);

    // Estadísticas de errores
    const erroresPorTipo = await Bitacora.aggregate([
      { $match: filtros },
      {
        $group: {
          _id: '$response.statusCode',
          cantidad: { $sum: 1 },
          ejemplos: { $push: { endpoint: '$endpoint', mensaje: '$error.mensaje' } }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        errores,
        erroresPorTipo
      },
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener errores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener errores'
    });
  }
};

// Limpiar bitácora antigua
const limpiarBitacora = async (req, res) => {
  try {
    const { diasAntiguedad = 90 } = req.body;

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const resultado = await Bitacora.deleteMany({
      timestamp: { $lt: fechaLimite }
    });

    res.json({
      success: true,
      message: `Bitácora limpiada exitosamente`,
      data: {
        registrosEliminados: resultado.deletedCount,
        fechaLimite: fechaLimite
      }
    });

  } catch (error) {
    console.error('Error al limpiar bitácora:', error);
    res.status(500).json({
      success: false,
      error: 'Error al limpiar bitácora'
    });
  }
};

// Exportar bitácora a CSV
const exportarBitacoraCSV = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, accion, exito } = req.query;

    const filtros = {};
    
    if (accion) {
      filtros.accion = accion;
    }
    
    if (exito !== undefined) {
      filtros.exito = exito === 'true';
    }
    
    if (fechaInicio && fechaFin) {
      filtros.timestamp = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    const bitacora = await Bitacora.find(filtros)
      .populate('usuario', 'name email')
      .sort({ timestamp: -1 })
      .select('timestamp usuario accion descripcion endpoint metodo ip exito response.statusCode')
      .limit(10000); // Limitar para evitar archivos muy grandes

    // Crear contenido CSV
    let csvContent = 'fecha,usuario,accion,descripcion,endpoint,metodo,ip,exito,statusCode\n';
    
    bitacora.forEach(entrada => {
      const fecha = entrada.timestamp.toISOString();
      const usuario = entrada.usuario ? `${entrada.usuario.name} (${entrada.usuario.email})` : 'Sistema';
      const exitoStr = entrada.exito ? 'Sí' : 'No';
      
      csvContent += `"${fecha}","${usuario}","${entrada.accion}","${entrada.descripcion}","${entrada.endpoint}","${entrada.metodo}","${entrada.ip}","${exitoStr}","${entrada.response.statusCode}"\n`;
    });

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bitacora.csv"');
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error al exportar bitácora:', error);
    res.status(500).json({
      success: false,
      error: 'Error al exportar bitácora'
    });
  }
};

module.exports = {
  obtenerBitacora,
  obtenerAccionesUsuario,
  obtenerEstadisticas,
  obtenerErrores,
  limpiarBitacora,
  exportarBitacoraCSV
};


