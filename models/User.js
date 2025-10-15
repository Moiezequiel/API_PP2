// user.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definir el esquema del usuario para facturación electrónica (El Salvador)
const userSchema = new Schema({
  // Información básica
  name: {
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
  password: {
    type: String,
    required: true
  },
  
  // Información de identificación (El Salvador)
  dui: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 10
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  commercialName: {
    type: String,
    trim: true
  },
  
  // Información de contacto
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'El Salvador'
    }
  },
  
  // Configuración de facturación (El Salvador)
  taxRegime: {
    type: String,
    enum: ['General', 'Pequeño Contribuyente', 'Grande Contribuyente'],
    default: 'General'
  },
  
  // Estado del usuario
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Roles de usuario
  role: {
    type: String,
    enum: ['admin', 'user', 'accountant'],
    default: 'user'
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para validar DUI de El Salvador (simplificado para proyecto estudiantil)
userSchema.methods.validateDUI = function() {
  const dui = this.dui;
  console.log("🔍 Validando DUI:", dui);
  
  // Validación básica: solo verificar que tenga el formato XXXX-XXXXX-X
  const duiRegex = /^\d{4}-\d{5}-\d{1}$/;
  if (!duiRegex.test(dui)) {
    console.log("❌ Formato de DUI inválido. Debe ser: XXXX-XXXXX-X");
    return false;
  }
  
  console.log("✅ DUI válido:", dui);
  return true;
};

// Crear el modelo de usuario
const User = mongoose.model('User', userSchema);

module.exports = User;