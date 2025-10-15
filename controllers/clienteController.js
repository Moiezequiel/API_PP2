const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');

// Obtener todos los clientes
const obtenerClientes = async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      tipoCliente, 
      activo, 
      buscar,
      ordenar = 'nombre'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (tipoCliente) {
      filtros.tipoCliente = tipoCliente;
    }
    
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }
    
    if (buscar) {
      filtros.$or = [
        { nombre: new RegExp(buscar, 'i') },
        { nit: new RegExp(buscar, 'i') },
        { email: new RegExp(buscar, 'i') }
      ];
    }

    // Configurar paginación
    const skip = (pagina - 1) * limite;
    
    // Obtener clientes con paginación
    const clientes = await Cliente.find(filtros)
      .sort({ [ordenar]: 1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('-__v');

    // Contar total de clientes
    const total = await Cliente.countDocuments(filtros);

    res.json({
      success: true,
      data: clientes,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener clientes'
    });
  }
};

// Obtener cliente por ID
const obtenerCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });

  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cliente'
    });
  }
};

// Crear nuevo cliente
const crearCliente = async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    
    // Validar NIT
    if (!cliente.validarNIT()) {
      return res.status(400).json({
        success: false,
        error: 'Formato de NIT inválido'
      });
    }

    await cliente.save();

    res.status(201).json({
      success: true,
      data: cliente,
      message: 'Cliente creado exitosamente'
    });

  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar cliente
const actualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Actualizar campos
    Object.assign(cliente, req.body);
    
    // Validar NIT si se actualizó
    if (req.body.nit && !cliente.validarNIT()) {
      return res.status(400).json({
        success: false,
        error: 'Formato de NIT inválido'
      });
    }

    await cliente.save();

    res.json({
      success: true,
      data: cliente,
      message: 'Cliente actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar cliente
const eliminarCliente = async (req, res) => {
  try {
    // Verificar si el cliente tiene ventas asociadas
    const ventasCliente = await Venta.countDocuments({ cliente: req.params.id });
    
    if (ventasCliente > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el cliente porque tiene ventas asociadas'
      });
    }

    const cliente = await Cliente.findByIdAndDelete(req.params.id);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cliente'
    });
  }
};

// Obtener historial de ventas del cliente
const obtenerHistorialVentas = async (req, res) => {
  try {
    const { pagina = 1, limite = 10 } = req.query;
    const skip = (pagina - 1) * limite;

    const ventas = await Venta.find({ cliente: req.params.id })
      .populate('vendedor', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('numeroVenta total estado createdAt facturada numeroFactura');

    const total = await Venta.countDocuments({ cliente: req.params.id });

    // Calcular estadísticas del cliente
    const estadisticas = await Venta.aggregate([
      { $match: { cliente: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          totalVentas: { $sum: 1 },
          montoTotal: { $sum: '$total' },
          ventaPromedio: { $avg: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        ventas,
        estadisticas: estadisticas[0] || {
          totalVentas: 0,
          montoTotal: 0,
          ventaPromedio: 0
        }
      },
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener historial de ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de ventas'
    });
  }
};

// Buscar cliente por NIT
const buscarClientePorNIT = async (req, res) => {
  try {
    const { nit } = req.params;

    const cliente = await Cliente.findOne({ nit: nit });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });

  } catch (error) {
    console.error('Error al buscar cliente por NIT:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar cliente'
    });
  }
};

// Obtener estadísticas de clientes
const obtenerEstadisticasClientes = async (req, res) => {
  try {
    const estadisticas = await Cliente.aggregate([
      {
        $group: {
          _id: null,
          totalClientes: { $sum: 1 },
          clientesActivos: {
            $sum: { $cond: ['$activo', 1, 0] }
          },
          clientesInactivos: {
            $sum: { $cond: ['$activo', 0, 1] }
          }
        }
      }
    ]);

    const porTipo = await Cliente.aggregate([
      {
        $group: {
          _id: '$tipoCliente',
          cantidad: { $sum: 1 }
        }
      }
    ]);

    const porDepartamento = await Cliente.aggregate([
      {
        $group: {
          _id: '$direccion.departamento',
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        general: estadisticas[0] || {
          totalClientes: 0,
          clientesActivos: 0,
          clientesInactivos: 0
        },
        porTipo,
        porDepartamento
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

module.exports = {
  obtenerClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerHistorialVentas,
  buscarClientePorNIT,
  obtenerEstadisticasClientes
};


