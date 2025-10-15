const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para productos
const productoSchema = new Schema({
  // Información básica del producto
  codigo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  
  // Información comercial
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  impuesto: {
    type: Number,
    default: 13, // IVA del 13% en El Salvador
    min: 0,
    max: 100
  },
  cantidad: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Categorización
  categoria: {
    type: String,
    trim: true,
    default: 'General'
  },
  
  // Estado del producto
  activo: {
    type: Boolean,
    default: true
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

// Middleware para actualizar updatedAt
productoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método virtual para calcular precio con impuesto
productoSchema.virtual('precioConImpuesto').get(function() {
  return this.precio * (1 + this.impuesto / 100);
});

// Método para verificar stock disponible
productoSchema.methods.tieneStock = function(cantidadSolicitada) {
  return this.cantidad >= cantidadSolicitada;
};

// Método para reducir stock
productoSchema.methods.reducirStock = function(cantidad) {
  if (this.tieneStock(cantidad)) {
    this.cantidad -= cantidad;
    return true;
  }
  return false;
};

// Método para aumentar stock
productoSchema.methods.aumentarStock = function(cantidad) {
  this.cantidad += cantidad;
};

// Índices para mejorar rendimiento
productoSchema.index({ codigo: 1 });
productoSchema.index({ nombre: 'text', descripcion: 'text' });
productoSchema.index({ categoria: 1 });
productoSchema.index({ activo: 1 });

const Producto = mongoose.model('Producto', productoSchema);

module.exports = Producto;

