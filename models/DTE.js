const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para Documentos Tributarios Electrónicos (DTE)
const dteSchema = new Schema({
  // Información del DTE
  numeroDTE: {
    type: String,
    required: true,
    unique: true
  },
  tipoDTE: {
    type: String,
    enum: ['01', '02', '03', '04', '05', '06', '07', '08'], // Tipos de DTE según normativa salvadoreña
    default: '01' // 01 = Factura
  },
  
  // Información del emisor
  emisor: {
    nit: {
      type: String,
      required: true
    },
    nombre: {
      type: String,
      required: true
    },
    direccion: {
      type: String,
      required: true
    }
  },
  
  // Información del receptor
  receptor: {
    nit: {
      type: String,
      required: true
    },
    nombre: {
      type: String,
      required: true
    },
    direccion: {
      type: String,
      required: true
    }
  },
  
  // Referencia a la venta
  venta: {
    type: Schema.Types.ObjectId,
    ref: 'Venta',
    required: true
  },
  
  // Totales del DTE
  totales: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    impuesto: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  // Estado del DTE
  estado: {
    type: String,
    enum: ['Pendiente', 'Aceptado', 'Rechazado', 'Observado', 'Anulado'],
    default: 'Pendiente'
  },
  
  // Información de firma digital
  firmaDigital: {
    certificado: {
      type: String,
      default: null
    },
    fechaFirma: {
      type: Date,
      default: null
    },
    hash: {
      type: String,
      default: null
    }
  },
  
  // Archivos generados
  archivos: {
    xml: {
      contenido: String,
      ruta: String,
      hash: String
    },
    pdf: {
      contenido: Buffer,
      ruta: String,
      hash: String
    }
  },
  
  // Información de envío
  envio: {
    fechaEnvio: {
      type: Date,
      default: null
    },
    emailEnviado: {
      type: Boolean,
      default: false
    },
    emailDestinatario: {
      type: String,
      default: null
    },
    intentosEnvio: {
      type: Number,
      default: 0
    }
  },
  
  // Información de anulación
  anulacion: {
    fechaAnulacion: {
      type: Date,
      default: null
    },
    motivo: {
      type: String,
      default: null
    },
    numeroNotaCredito: {
      type: String,
      default: null
    }
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
dteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para generar número DTE automáticamente
dteSchema.pre('save', async function(next) {
  if (!this.numeroDTE) {
    const count = await mongoose.model('DTE').countDocuments();
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const numero = String(count + 1).padStart(8, '0');
    this.numeroDTE = `${año}${mes}${numero}`;
  }
  next();
});

// Método para generar XML del DTE
dteSchema.methods.generarXML = function() {
  // Estructura básica del XML para DTE (simplificada para proyecto estudiantil)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DTE>
  <Encabezado>
    <Version>1.0</Version>
    <TipoDTE>${this.tipoDTE}</TipoDTE>
    <NumeroDTE>${this.numeroDTE}</NumeroDTE>
    <FechaEmision>${new Date().toISOString().split('T')[0]}</FechaEmision>
    <Emisor>
      <NIT>${this.emisor.nit}</NIT>
      <Nombre>${this.emisor.nombre}</Nombre>
      <Direccion>${this.emisor.direccion}</Direccion>
    </Emisor>
    <Receptor>
      <NIT>${this.receptor.nit}</NIT>
      <Nombre>${this.receptor.nombre}</Nombre>
      <Direccion>${this.receptor.direccion}</Direccion>
    </Receptor>
  </Encabezado>
  <Totales>
    <SubTotal>${this.totales.subtotal.toFixed(2)}</SubTotal>
    <Impuesto>${this.totales.impuesto.toFixed(2)}</Impuesto>
    <Total>${this.totales.total.toFixed(2)}</Total>
  </Totales>
  <Estado>${this.estado}</Estado>
</DTE>`;
  
  return xml;
};

// Método para firmar DTE (simulado)
dteSchema.methods.firmarDTE = function() {
  const crypto = require('crypto');
  const xml = this.generarXML();
  
  // Generar hash del XML (simulado)
  const hash = crypto.createHash('sha256').update(xml).digest('hex');
  
  this.firmaDigital = {
    certificado: 'CERTIFICADO_SIMULADO_123456789',
    fechaFirma: new Date(),
    hash: hash
  };
  
  this.archivos.xml = {
    contenido: xml,
    hash: hash,
    ruta: `dtes/xml/${this.numeroDTE}.xml`
  };
  
  this.estado = 'Aceptado';
};

// Método para anular DTE
dteSchema.methods.anularDTE = function(motivo, numeroNotaCredito) {
  this.estado = 'Anulado';
  this.anulacion = {
    fechaAnulacion: new Date(),
    motivo: motivo,
    numeroNotaCredito: numeroNotaCredito
  };
};

// Índices para mejorar rendimiento
dteSchema.index({ numeroDTE: 1 });
dteSchema.index({ 'emisor.nit': 1 });
dteSchema.index({ 'receptor.nit': 1 });
dteSchema.index({ venta: 1 });
dteSchema.index({ estado: 1 });
dteSchema.index({ createdAt: -1 });

const DTE = mongoose.model('DTE', dteSchema);

module.exports = DTE;

