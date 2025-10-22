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
    },
    signature: {
      type: String,
      default: null
    },
    algorithm: {
      type: String,
      default: null
    },
    keySize: {
      type: Number,
      default: null
    },
    signatureId: {
      type: String,
      default: null
    },
    validationCode: {
      type: String,
      default: null
    }
  },
  
  // Archivos generados
  archivos: {
    xml: {
      contenido: String,
      ruta: String,
      hash: String,
      signature: String
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
  // Estructura XML más realista para DTE según normativa salvadoreña
  const fechaEmision = new Date().toISOString().split('T')[0];
  const horaEmision = new Date().toTimeString().split(' ')[0];
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dte:DTE xmlns:dte="http://www.sat.gob.sv/dte/fel/0.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.sv/dte/fel/0.1.0 DTE.xsd">
  <dte:Encabezado>
    <dte:Version>1.0</dte:Version>
    <dte:TipoDTE>${this.tipoDTE}</dte:TipoDTE>
    <dte:NumeroDTE>${this.numeroDTE}</dte:NumeroDTE>
    <dte:FechaEmision>${fechaEmision}</dte:FechaEmision>
    <dte:HoraEmision>${horaEmision}</dte:HoraEmision>
    <dte:TipoMoneda>USD</dte:TipoMoneda>
    <dte:TipoCambio>1.00</dte:TipoCambio>
    <dte:Emisor>
      <dte:NIT>${this.emisor.nit}</dte:NIT>
      <dte:Nombre>${this.emisor.nombre}</dte:Nombre>
      <dte:NombreComercial>${this.emisor.nombre}</dte:NombreComercial>
      <dte:Direccion>
        <dte:Direccion>${this.emisor.direccion}</dte:Direccion>
        <dte:CodigoPostal>00000</dte:CodigoPostal>
        <dte:Municipio>San Salvador</dte:Municipio>
        <dte:Departamento>San Salvador</dte:Departamento>
        <dte:Pais>El Salvador</dte:Pais>
      </dte:Direccion>
      <dte:Telefono>0000-0000</dte:Telefono>
      <dte:Email>emisor@empresa.com</dte:Email>
      <dte:CodigoActividad>00000</dte:CodigoActividad>
      <dte:DescripcionActividad>Actividad Económica</dte:DescripcionActividad>
    </dte:Emisor>
    <dte:Receptor>
      <dte:NIT>${this.receptor.nit}</dte:NIT>
      <dte:Nombre>${this.receptor.nombre}</dte:Nombre>
      <dte:NombreComercial>${this.receptor.nombre}</dte:NombreComercial>
      <dte:Direccion>
        <dte:Direccion>${this.receptor.direccion}</dte:Direccion>
        <dte:CodigoPostal>00000</dte:CodigoPostal>
        <dte:Municipio>San Salvador</dte:Municipio>
        <dte:Departamento>San Salvador</dte:Departamento>
        <dte:Pais>El Salvador</dte:Pais>
      </dte:Direccion>
      <dte:Telefono>0000-0000</dte:Telefono>
      <dte:Email>receptor@cliente.com</dte:Email>
    </dte:Receptor>
  </dte:Encabezado>
  <dte:Detalle>
    <dte:Item>
      <dte:Cantidad>1</dte:Cantidad>
      <dte:UnidadMedida>UNI</dte:UnidadMedida>
      <dte:Descripcion>Producto/Servicio</dte:Descripcion>
      <dte:PrecioUnitario>${this.totales.subtotal.toFixed(2)}</dte:PrecioUnitario>
      <dte:Precio>${this.totales.subtotal.toFixed(2)}</dte:Precio>
      <dte:Descuento>0.00</dte:Descuento>
      <dte:Impuesto>
        <dte:CodigoImpuesto>20</dte:CodigoImpuesto>
        <dte:CodigoTarifa>13</dte:CodigoTarifa>
        <dte:Tarifa>13.00</dte:Tarifa>
        <dte:MontoImpuesto>${this.totales.impuesto.toFixed(2)}</dte:MontoImpuesto>
      </dte:Impuesto>
      <dte:SubTotal>${this.totales.subtotal.toFixed(2)}</dte:SubTotal>
      <dte:MontoTotal>${this.totales.total.toFixed(2)}</dte:MontoTotal>
    </dte:Item>
  </dte:Detalle>
  <dte:Resumen>
    <dte:TotalImpuestos>
      <dte:TotalImpuesto>
        <dte:CodigoImpuesto>20</dte:CodigoImpuesto>
        <dte:CodigoTarifa>13</dte:CodigoTarifa>
        <dte:MontoImpuesto>${this.totales.impuesto.toFixed(2)}</dte:MontoImpuesto>
      </dte:TotalImpuesto>
    </dte:TotalImpuestos>
    <dte:GranTotal>${this.totales.total.toFixed(2)}</dte:GranTotal>
    <dte:TotalLetras>${this.convertirNumeroALetras(this.totales.total)}</dte:TotalLetras>
  </dte:Resumen>
  <dte:Extension>
    <dte:NombresEmisor>${this.emisor.nombre}</dte:NombresEmisor>
    <dte:NombresReceptor>${this.receptor.nombre}</dte:NombresReceptor>
    <dte:DocumentoRelacionado>
      <dte:TipoDocumento>36</dte:TipoDocumento>
      <dte:NumeroDocumento>${this.numeroDTE}</dte:NumeroDocumento>
      <dte:FechaEmision>${fechaEmision}</dte:FechaEmision>
      <dte:Monto>${this.totales.total.toFixed(2)}</dte:Monto>
    </dte:DocumentoRelacionado>
  </dte:Extension>
  <dte:Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${this.firmaDigital ? this.firmaDigital.hash : 'PLACEHOLDER_HASH'}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${this.firmaDigital ? this.firmaDigital.signature : 'PLACEHOLDER_SIGNATURE'}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>${this.firmaDigital ? this.firmaDigital.certificado : 'PLACEHOLDER_CERTIFICATE'}</X509Certificate>
      </X509Data>
    </KeyInfo>
  </dte:Signature>
</dte:DTE>`;
  
  return xml;
};

// Método para convertir número a letras (simplificado)
dteSchema.methods.convertirNumeroALetras = function(numero) {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  
  const entero = Math.floor(numero);
  const decimal = Math.round((numero - entero) * 100);
  
  let resultado = '';
  
  if (entero === 0) {
    resultado = 'cero';
  } else if (entero < 10) {
    resultado = unidades[entero];
  } else if (entero < 20) {
    resultado = especiales[entero - 10];
  } else if (entero < 100) {
    const decena = Math.floor(entero / 10);
    const unidad = entero % 10;
    resultado = decenas[decena];
    if (unidad > 0) {
      resultado += ' y ' + unidades[unidad];
    }
  } else {
    resultado = 'más de cien';
  }
  
  resultado += ' dólares';
  
  if (decimal > 0) {
    resultado += ' con ' + decimal + ' centavos';
  }
  
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

// Método para firmar DTE (simulado)
dteSchema.methods.firmarDTE = function() {
  const SignatureService = require('../services/signatureService');
  const xml = this.generarXML();
  
  // Generar firma digital usando el servicio
  const signatureData = SignatureService.generateDigitalSignature({
    numeroDTE: this.numeroDTE,
    tipoDTE: this.tipoDTE,
    emisor: this.emisor,
    receptor: this.receptor,
    totales: this.totales
  }, this.emisor.nit);
  
  // Actualizar datos de firma digital
  this.firmaDigital = {
    certificado: signatureData.certificate.subject,
    fechaFirma: signatureData.signedAt,
    hash: signatureData.hash,
    signature: signatureData.signature,
    algorithm: signatureData.algorithm,
    keySize: signatureData.keySize,
    signatureId: signatureData.signatureId,
    validationCode: signatureData.validationCode
  };
  
  // Actualizar archivos XML con hash mejorado
  this.archivos.xml = {
    contenido: xml,
    hash: signatureData.hash,
    ruta: `dtes/xml/${this.numeroDTE}.xml`,
    signature: signatureData.signature
  };
  
  // Actualizar estado basado en la simulación
  this.estado = this.mapSignatureStatusToDTEStatus(signatureData.status);
};

// Método para mapear estado de firma a estado de DTE
dteSchema.methods.mapSignatureStatusToDTEStatus = function(signatureStatus) {
  const statusMap = {
    'ACCEPTED': 'Aceptado',
    'REJECTED': 'Rechazado',
    'OBSERVED': 'Observado',
    'PENDING': 'Pendiente'
  };
  
  return statusMap[signatureStatus] || 'Pendiente';
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


const DTE = mongoose.model('DTE', dteSchema);

module.exports = DTE;

