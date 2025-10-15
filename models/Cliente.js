const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para clientes
const clienteSchema = new Schema({
  // Información básica
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  
  // Información tributaria (El Salvador)
  nit: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 17,
    maxlength: 17
  },
  
  // Información de contacto
  telefono: {
    type: String,
    trim: true
  },
  direccion: {
    calle: String,
    ciudad: String,
    departamento: String,
    codigoPostal: String,
    pais: {
      type: String,
      default: 'El Salvador'
    }
  },
  
  // Información comercial
  tipoCliente: {
    type: String,
    enum: ['Persona Natural', 'Persona Jurídica', 'Consumidor Final'],
    default: 'Consumidor Final'
  },
  
  // Estado del cliente
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
clienteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para validar NIT/DUI de El Salvador
clienteSchema.methods.validarNIT = function() {
  const nit = this.nit;
  
  // Formato DUI/NIT El Salvador: XXXX-XXXXXX-XXX-X (17 caracteres con guiones)
  const nitRegex = /^\d{4}-\d{6}-\d{3}-\d{1}$/;
  if (!nitRegex.test(nit)) {
    return false;
  }
  
  // Para proyecto estudiantil, validación simplificada
  return true;
};

// Método para obtener dirección completa
clienteSchema.methods.getDireccionCompleta = function() {
  const dir = this.direccion;
  if (!dir) return '';
  
  const partes = [];
  if (dir.calle) partes.push(dir.calle);
  if (dir.ciudad) partes.push(dir.ciudad);
  if (dir.departamento) partes.push(dir.departamento);
  if (dir.codigoPostal) partes.push(dir.codigoPostal);
  
  return partes.join(', ');
};

// Índices para mejorar rendimiento
clienteSchema.index({ nit: 1 });
clienteSchema.index({ email: 1 });
clienteSchema.index({ nombre: 'text' });
clienteSchema.index({ activo: 1 });

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;

