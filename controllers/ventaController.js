const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const mongoose = require('mongoose');

// Obtener todas las ventas
const obtenerVentas = async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      estado, 
      cliente,
      vendedor,
      fechaInicio,
      fechaFin,
      ordenar = 'createdAt'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (estado) {
      filtros.estado = estado;
    }
    
    if (cliente) {
      filtros.cliente = cliente;
    }
    
    if (vendedor) {
      filtros.vendedor = vendedor;
    }
    
    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) {
        filtros.createdAt.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.createdAt.$lte = new Date(fechaFin);
      }
    }

    // Configurar paginación
    const skip = (pagina - 1) * limite;
    
    // Obtener ventas con paginación
    const ventas = await Venta.find(filtros)
      .populate('cliente', 'nombre nit email')
      .populate('vendedor', 'name email')
      .populate('productos.producto', 'codigo nombre precio')
      .sort({ [ordenar]: -1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('-__v');

    // Contar total de ventas
    const total = await Venta.countDocuments(filtros);

    res.json({
      success: true,
      data: ventas,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ventas'
    });
  }
};

// Obtener venta por ID
const obtenerVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('cliente', 'nombre nit email telefono direccion')
      .populate('vendedor', 'name email')
      .populate('productos.producto', 'codigo nombre precio descripcion');
    
    if (!venta) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: venta
    });

  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener venta'
    });
  }
};

// Crear nueva venta
const crearVenta = async (req, res) => {
  try {
    const { cliente, productos, observaciones } = req.body;

    // Validar que existe el cliente
    const clienteExiste = await Cliente.findById(cliente);
    if (!clienteExiste) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Validar productos y stock
    const productosValidados = [];
    for (const item of productos) {
      const producto = await Producto.findById(item.producto);
      if (!producto) {
        return res.status(404).json({
          success: false,
          error: `Producto con ID ${item.producto} no encontrado`
        });
      }

      if (!producto.tieneStock(item.cantidad)) {
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente para el producto ${producto.nombre}. Disponible: ${producto.cantidad}`
        });
      }

      // Calcular precios y impuestos
      const subtotal = item.cantidad * item.precioUnitario;
      const impuestoTotal = subtotal * (item.impuesto / 100);
      const total = subtotal + impuestoTotal;

      productosValidados.push({
        producto: item.producto,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        impuesto: item.impuesto || producto.impuesto,
        subtotal,
        impuestoTotal,
        total
      });
    }

    // Generar número de venta si no existe
    const count = await Venta.countDocuments();
    const numeroVenta = `V-${String(count + 1).padStart(6, '0')}`;

    // Crear venta
    const venta = new Venta({
      numeroVenta,
      cliente,
      productos: productosValidados,
      vendedor: req.user.id,
      observaciones
    });

    // Calcular totales
    venta.calcularTotales();

    // Verificar stock una vez más antes de guardar
    const verificacionStock = await venta.verificarStock();
    if (!verificacionStock.valido) {
      return res.status(400).json({
        success: false,
        error: `Stock insuficiente para ${verificacionStock.producto}`
      });
    }

    // Guardar venta
    await venta.save();

    // Reducir stock de productos
    await venta.procesarStock();

    // Poblar datos para respuesta
    await venta.populate('cliente', 'nombre nit email');
    await venta.populate('vendedor', 'name email');
    await venta.populate('productos.producto', 'codigo nombre');

    res.status(201).json({
      success: true,
      data: venta,
      message: 'Venta creada exitosamente'
    });

  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar venta
const actualizarVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    
    if (!venta) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    // Solo permitir actualizar ventas pendientes
    if (venta.estado !== 'Pendiente') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden actualizar ventas pendientes'
      });
    }

    // Actualizar campos permitidos
    if (req.body.observaciones !== undefined) {
      venta.observaciones = req.body.observaciones;
    }

    if (req.body.estado) {
      venta.estado = req.body.estado;
    }

    await venta.save();

    res.json({
      success: true,
      data: venta,
      message: 'Venta actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Cancelar venta
const cancelarVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    
    if (!venta) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    // Solo permitir cancelar ventas pendientes
    if (venta.estado !== 'Pendiente') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden cancelar ventas pendientes'
      });
    }

    // Devolver stock a productos
    for (const item of venta.productos) {
      await Producto.findByIdAndUpdate(
        item.producto,
        { $inc: { cantidad: item.cantidad } }
      );
    }

    // Marcar como cancelada
    venta.estado = 'Cancelada';
    await venta.save();

    res.json({
      success: true,
      data: venta,
      message: 'Venta cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error al cancelar venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar venta'
    });
  }
};

// Obtener estadísticas de ventas
const obtenerEstadisticasVentas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const match = {};
    if (fechaInicio && fechaFin) {
      match.createdAt = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    const estadisticas = await Venta.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalVentas: { $sum: 1 },
          ventasCompletadas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Completada'] }, 1, 0] }
          },
          ventasCanceladas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Cancelada'] }, 1, 0] }
          },
          montoTotal: { $sum: '$total' },
          impuestoTotal: { $sum: '$impuestoTotal' },
          ventaPromedio: { $avg: '$total' }
        }
      }
    ]);

    const ventasPorEstado = await Venta.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$total' }
        }
      }
    ]);

    const ventasPorDia = await Venta.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            año: { $year: '$createdAt' },
            mes: { $month: '$createdAt' },
            dia: { $dayOfMonth: '$createdAt' }
          },
          cantidad: { $sum: 1 },
          monto: { $sum: '$total' }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1, '_id.dia': 1 } },
      { $limit: 30 }
    ]);

    const topProductos = await Venta.aggregate([
      { $match: match },
      { $unwind: '$productos' },
      {
        $group: {
          _id: '$productos.producto',
          cantidadVendida: { $sum: '$productos.cantidad' },
          montoTotal: { $sum: '$productos.total' }
        }
      },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'producto'
        }
      },
      { $unwind: '$producto' },
      {
        $project: {
          nombre: '$producto.nombre',
          codigo: '$producto.codigo',
          cantidadVendida: 1,
          montoTotal: 1
        }
      },
      { $sort: { cantidadVendida: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        general: estadisticas[0] || {
          totalVentas: 0,
          ventasCompletadas: 0,
          ventasCanceladas: 0,
          montoTotal: 0,
          impuestoTotal: 0,
          ventaPromedio: 0
        },
        porEstado: ventasPorEstado,
        porDia: ventasPorDia,
        topProductos
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

// Buscar venta por número
const buscarVentaPorNumero = async (req, res) => {
  try {
    const { numero } = req.params;

    const venta = await Venta.findOne({ numeroVenta: numero })
      .populate('cliente', 'nombre nit email')
      .populate('vendedor', 'name email')
      .populate('productos.producto', 'codigo nombre precio');

    if (!venta) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: venta
    });

  } catch (error) {
    console.error('Error al buscar venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar venta'
    });
  }
};

module.exports = {
  obtenerVentas,
  obtenerVenta,
  crearVenta,
  actualizarVenta,
  cancelarVenta,
  obtenerEstadisticasVentas,
  buscarVentaPorNumero
};

