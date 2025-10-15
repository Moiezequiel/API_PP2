const Producto = require('../models/Producto');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Obtener todos los productos
const obtenerProductos = async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      categoria, 
      activo, 
      buscar,
      ordenar = 'nombre'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (categoria) {
      filtros.categoria = new RegExp(categoria, 'i');
    }
    
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }
    
    if (buscar) {
      filtros.$or = [
        { nombre: new RegExp(buscar, 'i') },
        { codigo: new RegExp(buscar, 'i') },
        { descripcion: new RegExp(buscar, 'i') }
      ];
    }

    // Configurar paginación
    const skip = (pagina - 1) * limite;
    
    // Obtener productos con paginación
    const productos = await Producto.find(filtros)
      .sort({ [ordenar]: 1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('-__v');

    // Contar total de productos
    const total = await Producto.countDocuments(filtros);

    res.json({
      success: true,
      data: productos,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener productos'
    });
  }
};

// Obtener producto por ID
const obtenerProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: producto
    });

  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener producto'
    });
  }
};

// Crear nuevo producto
const crearProducto = async (req, res) => {
  try {
    const producto = new Producto(req.body);
    await producto.save();

    res.status(201).json({
      success: true,
      data: producto,
      message: 'Producto creado exitosamente'
    });

  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar producto
const actualizarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!producto) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: producto,
      message: 'Producto actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar producto
const eliminarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto'
    });
  }
};

// Consultar inventario
const consultarInventario = async (req, res) => {
  try {
    const { stockMinimo = 0 } = req.query;

    const filtros = {
      cantidad: { $lte: parseInt(stockMinimo) }
    };

    const productosBajoStock = await Producto.find(filtros)
      .select('codigo nombre cantidad precio categoria')
      .sort({ cantidad: 1 });

    const totalProductos = await Producto.countDocuments();
    const productosConStock = await Producto.countDocuments({ cantidad: { $gt: 0 } });
    const productosSinStock = await Producto.countDocuments({ cantidad: 0 });

    res.json({
      success: true,
      data: {
        resumen: {
          totalProductos,
          productosConStock,
          productosSinStock,
          productosBajoStock: productosBajoStock.length
        },
        productosBajoStock,
        filtro: `Stock menor o igual a ${stockMinimo}`
      }
    });

  } catch (error) {
    console.error('Error al consultar inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al consultar inventario'
    });
  }
};

// Importar productos desde CSV
const importarProductosCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo CSV'
      });
    }

    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: []
    };

    const productos = [];

    // Leer archivo CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          productos.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Procesar cada producto
    for (const [index, productoData] of productos.entries()) {
      try {
        // Validar datos requeridos
        if (!productoData.codigo || !productoData.nombre || !productoData.precio) {
          throw new Error('Faltan campos requeridos: codigo, nombre, precio');
        }

        // Convertir tipos
        const producto = new Producto({
          codigo: productoData.codigo.toString().trim().toUpperCase(),
          nombre: productoData.nombre.toString().trim(),
          descripcion: productoData.descripcion ? productoData.descripcion.toString().trim() : '',
          precio: parseFloat(productoData.precio),
          impuesto: productoData.impuesto ? parseFloat(productoData.impuesto) : 13,
          cantidad: productoData.cantidad ? parseInt(productoData.cantidad) : 0,
          categoria: productoData.categoria ? productoData.categoria.toString().trim() : 'General',
          activo: productoData.activo !== undefined ? productoData.activo === 'true' : true
        });

        await producto.save();
        resultados.exitosos++;

      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({
          fila: index + 1,
          error: error.message,
          datos: productoData
        });
      }
    }

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Importación completada',
      data: {
        totalProcesados: productos.length,
        exitosos: resultados.exitosos,
        fallidos: resultados.fallidos,
        errores: resultados.errores
      }
    });

  } catch (error) {
    console.error('Error al importar productos:', error);
    
    // Eliminar archivo temporal en caso de error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Error al importar productos: ' + error.message
    });
  }
};

// Exportar productos a CSV
const exportarProductosCSV = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true })
      .select('codigo nombre descripcion precio impuesto cantidad categoria')
      .sort({ codigo: 1 });

    // Crear contenido CSV
    let csvContent = 'codigo,nombre,descripcion,precio,impuesto,cantidad,categoria\n';
    
    productos.forEach(producto => {
      csvContent += `${producto.codigo},"${producto.nombre}","${producto.descripcion}",${producto.precio},${producto.impuesto},${producto.cantidad},${producto.categoria}\n`;
    });

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error al exportar productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al exportar productos'
    });
  }
};

module.exports = {
  obtenerProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  consultarInventario,
  importarProductosCSV,
  exportarProductosCSV
};


