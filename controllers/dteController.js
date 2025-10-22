const DTE = require('../models/DTE');
const Venta = require('../models/Venta');
const Cliente = require('../models/Cliente');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const SignatureService = require('../services/signatureService');

// Configurar transporter de correo (simulado para proyecto estudiantil)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'tu_email@gmail.com',
    pass: process.env.SMTP_PASS || 'tu_password'
  }
});

// Obtener todos los DTEs
const obtenerDTEs = async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      estado, 
      tipoDTE,
      fechaInicio,
      fechaFin,
      ordenar = 'createdAt'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (estado) {
      filtros.estado = estado;
    }
    
    if (tipoDTE) {
      filtros.tipoDTE = tipoDTE;
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
    
    // Obtener DTEs con paginación
    const dtes = await DTE.find(filtros)
      .populate('venta', 'numeroVenta total cliente')
      .populate('venta.cliente', 'nombre nit email')
      .sort({ [ordenar]: -1 })
      .limit(parseInt(limite))
      .skip(skip)
      .select('-__v');

    // Contar total de DTEs
    const total = await DTE.countDocuments(filtros);

    res.json({
      success: true,
      data: dtes,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener DTEs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener DTEs'
    });
  }
};

// Obtener DTE por ID
const obtenerDTE = async (req, res) => {
  try {
    const dte = await DTE.findById(req.params.id)
      .populate('venta', 'numeroVenta total productos')
      .populate('venta.cliente', 'nombre nit email direccion')
      .populate('venta.productos.producto', 'codigo nombre precio');
    
    if (!dte) {
      return res.status(404).json({
        success: false,
        error: 'DTE no encontrado'
      });
    }

    res.json({
      success: true,
      data: dte
    });

  } catch (error) {
    console.error('Error al obtener DTE:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener DTE'
    });
  }
};

// Generar DTE desde venta
const generarDTE = async (req, res) => {
  try {
    const { ventaId, tipoDTE = '01' } = req.body;

    // Obtener venta
    const venta = await Venta.findById(ventaId)
      .populate('cliente', 'nombre nit email direccion')
      .populate('vendedor', 'name email dui businessName address');

    if (!venta) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    // Verificar que la venta no esté ya facturada
    if (venta.facturada) {
      return res.status(400).json({
        success: false,
        error: 'La venta ya ha sido facturada'
      });
    }

    // Verificar que el cliente tenga datos completos
    if (!venta.cliente.nit || !venta.cliente.nombre) {
      return res.status(400).json({
        success: false,
        error: 'El cliente no tiene datos completos para generar DTE'
      });
    }

    // Generar número DTE si no existe
    const count = await DTE.countDocuments();
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const numero = String(count + 1).padStart(8, '0');
    const numeroDTE = `${año}${mes}${numero}`;

    // Crear DTE
    const dte = new DTE({
      numeroDTE,
      tipoDTE,
      emisor: {
        nit: venta.vendedor.dui || '00000000-0',
        nombre: venta.vendedor.businessName || venta.vendedor.name,
        direccion: venta.vendedor.address ? 
          `${venta.vendedor.address.street || ''}, ${venta.vendedor.address.city || ''}` : 
          'Dirección no especificada'
      },
      receptor: {
        nit: venta.cliente.nit,
        nombre: venta.cliente.nombre,
        direccion: venta.cliente.getDireccionCompleta() || 'Dirección no especificada'
      },
      venta: ventaId,
      totales: {
        subtotal: venta.subtotal,
        impuesto: venta.impuestoTotal,
        total: venta.total
      }
    });

    // Generar XML y firmar
    dte.firmarDTE();

    // Guardar DTE
    await dte.save();

    // Actualizar venta como facturada
    venta.facturada = true;
    venta.numeroFactura = dte.numeroDTE;
    venta.estado = 'Facturada';
    await venta.save();

    // Poblar datos para respuesta
    await dte.populate('venta', 'numeroVenta total');
    await dte.populate('venta.cliente', 'nombre nit email');

    res.status(201).json({
      success: true,
      data: dte,
      message: 'DTE generado exitosamente'
    });

  } catch (error) {
    console.error('Error al generar DTE:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Enviar DTE por correo
const enviarDTE = async (req, res) => {
  try {
    const { dteId } = req.params;
    const { emailDestinatario } = req.body;

    console.log('Intentando enviar DTE:', dteId, 'Email:', emailDestinatario);

    const dte = await DTE.findById(dteId)
      .populate({
        path: 'venta',
        populate: {
          path: 'cliente',
          select: 'nombre email'
        }
      });

    if (!dte) {
      return res.status(404).json({
        success: false,
        error: 'DTE no encontrado'
      });
    }

    console.log('DTE encontrado:', dte.numeroDTE);
    console.log('Venta poblada:', dte.venta ? 'Sí' : 'No');
    console.log('Cliente poblado:', dte.venta?.cliente ? 'Sí' : 'No');

    if (dte.estado === 'Anulado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede enviar un DTE anulado'
      });
    }

    // Verificar que el DTE tenga datos de venta y cliente
    if (!dte.venta || !dte.venta.cliente) {
      return res.status(400).json({
        success: false,
        error: 'DTE no tiene datos de venta o cliente asociados'
      });
    }

    // Verificar que el DTE tenga archivos XML
    if (!dte.archivos || !dte.archivos.xml || !dte.archivos.xml.contenido) {
      return res.status(400).json({
        success: false,
        error: 'DTE no tiene archivos XML generados'
      });
    }

    // Verificar email destinatario
    const emailFinal = emailDestinatario || dte.venta.cliente.email;
    console.log('Email final:', emailFinal);
    
    if (!emailFinal) {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado email destinatario y el cliente no tiene email'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFinal)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del email no es válido'
      });
    }

    // Generar PDF (simulado para proyecto estudiantil)
    const pdfContent = generarPDFSimulado(dte);

    // Configurar correo con validaciones adicionales
    const mailOptions = {
      from: process.env.SMTP_USER || 'facturacion@empresa.com',
      to: emailFinal,
      subject: `DTE ${dte.numeroDTE} - Factura Electrónica`,
      html: `
        <h2>Factura Electrónica</h2>
        <p>Estimado/a ${dte.venta.cliente.nombre || 'Cliente'},</p>
        <p>Adjunto encontrará su factura electrónica DTE ${dte.numeroDTE}.</p>
        <p>Total: $${dte.totales.total.toFixed(2)}</p>
        <p>Gracias por su compra.</p>
      `,
      attachments: [
        {
          filename: `DTE_${dte.numeroDTE}.xml`,
          content: dte.archivos.xml.contenido,
          contentType: 'application/xml'
        },
        {
          filename: `DTE_${dte.numeroDTE}.pdf`,
          content: pdfContent,
          contentType: 'application/pdf'
        }
      ]
    };

    console.log('Configurando envío de correo...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);

    // Para proyecto estudiantil, simular envío exitoso sin usar SMTP real
    if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
      console.log('Modo desarrollo: Simulando envío de correo');
      
      // Actualizar DTE como si se hubiera enviado
      dte.envio.emailEnviado = true;
      dte.envio.emailDestinatario = emailFinal;
      dte.envio.fechaEnvio = new Date();
      dte.envio.intentosEnvio += 1;
      await dte.save();

      return res.json({
        success: true,
        message: 'DTE enviado por correo exitosamente (simulado en desarrollo)',
        data: {
          emailEnviado: emailFinal,
          fechaEnvio: new Date(),
          modo: 'desarrollo'
        }
      });
    }

    // Enviar correo real solo si está configurado
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente');

    // Actualizar DTE
    dte.envio.emailEnviado = true;
    dte.envio.emailDestinatario = emailFinal;
    dte.envio.fechaEnvio = new Date();
    dte.envio.intentosEnvio += 1;
    await dte.save();

    res.json({
      success: true,
      message: 'DTE enviado por correo exitosamente',
      data: {
        emailEnviado: emailFinal,
        fechaEnvio: new Date()
      }
    });

  } catch (error) {
    console.error('Error al enviar DTE:', error);
    console.error('Error details:', error.message);
    
    // Actualizar intentos de envío
    try {
      await DTE.findByIdAndUpdate(req.params.dteId, {
        $inc: { 'envio.intentosEnvio': 1 }
      });
    } catch (updateError) {
      console.error('Error al actualizar intentos de envío:', updateError);
    }

    res.status(500).json({
      success: false,
      error: `Error al enviar DTE por correo: ${error.message}`
    });
  }
};

// Anular DTE
const anularDTE = async (req, res) => {
  try {
    const { dteId } = req.params;
    const { motivo, numeroNotaCredito } = req.body;

    const dte = await DTE.findById(dteId);

    if (!dte) {
      return res.status(404).json({
        success: false,
        error: 'DTE no encontrado'
      });
    }

    if (dte.estado === 'Anulado') {
      return res.status(400).json({
        success: false,
        error: 'El DTE ya está anulado'
      });
    }

    // Anular DTE
    dte.anularDTE(motivo, numeroNotaCredito);
    await dte.save();

    // Revertir estado de la venta
    const venta = await Venta.findById(dte.venta);
    if (venta) {
      venta.facturada = false;
      venta.numeroFactura = null;
      venta.estado = 'Completada';
      await venta.save();
    }

    res.json({
      success: true,
      data: dte,
      message: 'DTE anulado exitosamente'
    });

  } catch (error) {
    console.error('Error al anular DTE:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Exportar DTEs en ZIP
const exportarDTEsZIP = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado } = req.query;

    // Construir filtros
    const filtros = {};
    if (estado) {
      filtros.estado = estado;
    }
    if (fechaInicio && fechaFin) {
      filtros.createdAt = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    // Obtener DTEs
    const dtes = await DTE.find(filtros)
      .populate('venta.cliente', 'nombre nit');

    if (dtes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron DTEs para el período especificado'
      });
    }

    // Configurar respuesta ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="dtes_${new Date().toISOString().split('T')[0]}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Error en archivo ZIP:', err);
      res.status(500).json({
        success: false,
        error: 'Error al crear archivo ZIP'
      });
    });

    archive.pipe(res);

    // Agregar archivos al ZIP
    for (const dte of dtes) {
      if (dte.archivos.xml.contenido) {
        archive.append(dte.archivos.xml.contenido, {
          name: `DTE_${dte.numeroDTE}.xml`
        });
      }

      if (dte.archivos.pdf.contenido) {
        archive.append(dte.archivos.pdf.contenido, {
          name: `DTE_${dte.numeroDTE}.pdf`
        });
      }
    }

    // Finalizar ZIP
    await archive.finalize();

  } catch (error) {
    console.error('Error al exportar DTEs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al exportar DTEs'
    });
  }
};

// Función auxiliar para generar PDF simulado
const generarPDFSimulado = (dte) => {
  // Para proyecto estudiantil, generar un PDF simple
  const pdfContent = `
    DTE: ${dte.numeroDTE}
    Tipo: ${dte.tipoDTE}
    Fecha: ${new Date().toLocaleDateString()}
    
    Emisor:
    NIT: ${dte.emisor.nit}
    Nombre: ${dte.emisor.nombre}
    Dirección: ${dte.emisor.direccion}
    
    Receptor:
    NIT: ${dte.receptor.nit}
    Nombre: ${dte.receptor.nombre}
    Dirección: ${dte.receptor.direccion}
    
    Totales:
    Subtotal: $${dte.totales.subtotal.toFixed(2)}
    Impuesto: $${dte.totales.impuesto.toFixed(2)}
    Total: $${dte.totales.total.toFixed(2)}
    
    Estado: ${dte.estado}
  `;

  return Buffer.from(pdfContent, 'utf8');
};

// Validar firma digital de un DTE
const validarFirmaDigital = async (req, res) => {
  try {
    const { dteId } = req.params;

    const dte = await DTE.findById(dteId);
    
    if (!dte) {
      return res.status(404).json({
        success: false,
        error: 'DTE no encontrado'
      });
    }

    if (!dte.firmaDigital || !dte.firmaDigital.signature) {
      return res.status(400).json({
        success: false,
        error: 'El DTE no tiene firma digital'
      });
    }

    // Validar la firma usando el servicio
    const validationResult = SignatureService.validateDigitalSignature(
      dte.firmaDigital,
      {
        numeroDTE: dte.numeroDTE,
        tipoDTE: dte.tipoDTE,
        emisor: dte.emisor,
        receptor: dte.receptor,
        totales: dte.totales
      }
    );

    res.json({
      success: true,
      data: {
        dteId: dte._id,
        numeroDTE: dte.numeroDTE,
        validation: validationResult,
        signatureInfo: {
          signatureId: dte.firmaDigital.signatureId,
          algorithm: dte.firmaDigital.algorithm,
          keySize: dte.firmaDigital.keySize,
          signedAt: dte.firmaDigital.fechaFirma,
          validationCode: dte.firmaDigital.validationCode
        }
      }
    });

  } catch (error) {
    console.error('Error al validar firma digital:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar firma digital'
    });
  }
};

// Obtener certificados disponibles
const obtenerCertificados = async (req, res) => {
  try {
    const certificates = SignatureService.getAvailableCertificates();
    
    res.json({
      success: true,
      data: certificates,
      message: 'Certificados simulados disponibles'
    });

  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener certificados'
    });
  }
};

// Revocar certificado
const revocarCertificado = async (req, res) => {
  try {
    const { nit } = req.params;

    const result = SignatureService.revokeCertificate(nit);
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Certificado revocado exitosamente'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('Error al revocar certificado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al revocar certificado'
    });
  }
};

// Simular cambio de estado de DTE
const simularCambioEstado = async (req, res) => {
  try {
    const { dteId } = req.params;
    const { nuevoEstado } = req.body;

    const dte = await DTE.findById(dteId);
    
    if (!dte) {
      return res.status(404).json({
        success: false,
        error: 'DTE no encontrado'
      });
    }

    // Validar que el nuevo estado sea válido
    const estadosValidos = ['Pendiente', 'Aceptado', 'Rechazado', 'Observado'];
    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({
        success: false,
        error: 'Estado no válido'
      });
    }

    const estadoAnterior = dte.estado;
    dte.estado = nuevoEstado;
    await dte.save();

    res.json({
      success: true,
      data: {
        dteId: dte._id,
        numeroDTE: dte.numeroDTE,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        fechaCambio: new Date()
      },
      message: 'Estado del DTE actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar estado del DTE:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar estado del DTE'
    });
  }
};

module.exports = {
  obtenerDTEs,
  obtenerDTE,
  generarDTE,
  enviarDTE,
  anularDTE,
  exportarDTEsZIP,
  validarFirmaDigital,
  obtenerCertificados,
  revocarCertificado,
  simularCambioEstado
};

