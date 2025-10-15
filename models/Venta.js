const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para productos en una venta
const productoVentaSchema = new Schema({
  producto: {
    type: Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  impuesto: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  impuestoTotal: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

// Esquema principal para ventas
const ventaSchema = new Schema({
  // Información de la venta
  numeroVenta: {
    type: String,
    required: true,
    unique: true
  },
  
  // Cliente
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  
  // Productos
  productos: [productoVentaSchema],
  
  // Totales
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  impuestoTotal: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Información del vendedor
  vendedor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Estado de la venta
  estado: {
    type: String,
    enum: ['Pendiente', 'Completada', 'Cancelada', 'Facturada'],
    default: 'Pendiente'
  },
  
  // Información de facturación
  facturada: {
    type: Boolean,
    default: false
  },
  numeroFactura: {
    type: String,
    default: null
  },
  
  // Observaciones
  observaciones: {
    type: String,
    trim: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para generar número de venta automáticamente (se ejecuta primero)
ventaSchema.pre('save', async function(next) {
  if (!this.numeroVenta && this.isNew) {
    try {
      const count = await mongoose.model('Venta').countDocuments();
      this.numeroVenta = `V-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Middleware para actualizar updatedAt (se ejecuta después)
ventaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para calcular totales
ventaSchema.methods.calcularTotales = function() {
  let subtotal = 0;
  let impuestoTotal = 0;
  
  this.productos.forEach(producto => {
    producto.subtotal = producto.cantidad * producto.precioUnitario;
    producto.impuestoTotal = producto.subtotal * (producto.impuesto / 100);
    producto.total = producto.subtotal + producto.impuestoTotal;
    
    subtotal += producto.subtotal;
    impuestoTotal += producto.impuestoTotal;
  });
  
  this.subtotal = subtotal;
  this.impuestoTotal = impuestoTotal;
  this.total = subtotal + impuestoTotal;
};

// Método para verificar stock de productos
ventaSchema.methods.verificarStock = async function() {
  const Producto = mongoose.model('Producto');
  
  for (const item of this.productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto || !producto.tieneStock(item.cantidad)) {
      return {
        valido: false,
        producto: producto?.nombre || 'Producto no encontrado',
        cantidadDisponible: producto?.cantidad || 0,
        cantidadSolicitada: item.cantidad
      };
    }
  }
  
  return { valido: true };
};

// Método para procesar stock después de venta
ventaSchema.methods.procesarStock = async function() {
  const Producto = mongoose.model('Producto');
  
  for (const item of this.productos) {
    await Producto.findByIdAndUpdate(
      item.producto,
      { $inc: { cantidad: -item.cantidad } }
    );
  }
};

// Índices para mejorar rendimiento
ventaSchema.index({ numeroVenta: 1 });
ventaSchema.index({ cliente: 1 });
ventaSchema.index({ vendedor: 1 });
ventaSchema.index({ estado: 1 });
ventaSchema.index({ createdAt: -1 });

const Venta = mongoose.model('Venta', ventaSchema);

module.exports = Venta;

