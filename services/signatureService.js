const crypto = require('crypto');

/**
 * Servicio de simulación de firma digital para DTEs
 * Simula el proceso de firma digital sin usar certificados reales
 */
class SignatureService {
  constructor() {
    // Certificados simulados para diferentes tipos de emisores
    this.mockCertificates = {
      '00000000-0': {
        issuer: 'CN=Autoridad Certificadora de El Salvador, O=Ministerio de Hacienda, C=SV',
        subject: 'CN=Empresa Demo S.A. de C.V., OU=Facturación Electrónica, O=Empresa Demo, C=SV',
        serialNumber: '12345678901234567890',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        algorithm: 'RSA-SHA256',
        keySize: 2048
      },
      '12345678-9': {
        issuer: 'CN=Autoridad Certificadora de El Salvador, O=Ministerio de Hacienda, C=SV',
        subject: 'CN=Comercializadora Ejemplo S.A. de C.V., OU=Facturación Electrónica, O=Comercializadora Ejemplo, C=SV',
        serialNumber: '98765432109876543210',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        algorithm: 'RSA-SHA256',
        keySize: 2048
      }
    };
  }

  /**
   * Simula la generación de una firma digital
   * @param {Object} dteData - Datos del DTE a firmar
   * @param {string} emisorNit - NIT del emisor
   * @returns {Object} Datos de la firma digital simulada
   */
  generateDigitalSignature(dteData, emisorNit) {
    try {
      // Obtener certificado simulado
      const certificate = this.getMockCertificate(emisorNit);
      
      // Generar contenido para firmar (JSON + timestamp)
      const contentToSign = this.generateContentToSign(dteData);
      
      // Generar hash SHA256 del contenido
      const hash = crypto.createHash('sha256').update(contentToSign).digest('hex');
      
      // Simular firma RSA (generar hash firmado)
      const signedHash = this.simulateRSASignature(hash, certificate);
      
      // Generar timestamp de firma
      const signedAt = new Date();
      
      // Simular estado del DTE
      const status = this.simulateDTEStatus(dteData);
      
      return {
        signature: signedHash,
        signedAt: signedAt.toISOString(),
        certificate: certificate,
        hash: hash,
        algorithm: certificate.algorithm,
        keySize: certificate.keySize,
        status: status,
        signatureId: this.generateSignatureId(),
        validationCode: this.generateValidationCode()
      };
      
    } catch (error) {
      throw new Error(`Error al generar firma digital: ${error.message}`);
    }
  }

  /**
   * Valida una firma digital simulada
   * @param {Object} signatureData - Datos de la firma a validar
   * @param {Object} originalData - Datos originales del DTE
   * @returns {Object} Resultado de la validación
   */
  validateDigitalSignature(signatureData, originalData) {
    try {
      const validation = {
        isValid: false,
        errors: [],
        warnings: [],
        certificateStatus: 'UNKNOWN',
        signatureAlgorithm: signatureData.algorithm || 'UNKNOWN',
        validationTimestamp: new Date().toISOString()
      };

      // Validar certificado
      const certValidation = this.validateCertificate(signatureData.certificate);
      validation.certificateStatus = certValidation.status;
      
      if (!certValidation.isValid) {
        validation.errors.push(...certValidation.errors);
      }

      // Validar timestamp de firma
      const signedAt = new Date(signatureData.signedAt);
      const now = new Date();
      const timeDiff = now - signedAt;
      
      if (timeDiff < 0) {
        validation.errors.push('La firma tiene una fecha futura');
      } else if (timeDiff > 24 * 60 * 60 * 1000) { // 24 horas
        validation.warnings.push('La firma es antigua (más de 24 horas)');
      }

      // Validar algoritmo
      if (!signatureData.algorithm || signatureData.algorithm !== 'RSA-SHA256') {
        validation.errors.push('Algoritmo de firma no válido');
      }

      // Recalcular hash para verificar integridad
      const contentToSign = this.generateContentToSign(originalData);
      const recalculatedHash = crypto.createHash('sha256').update(contentToSign).digest('hex');
      
      if (signatureData.hash !== recalculatedHash) {
        validation.errors.push('El hash de la firma no coincide con los datos');
      }

      // Determinar si la firma es válida
      validation.isValid = validation.errors.length === 0;

      return validation;
      
    } catch (error) {
      return {
        isValid: false,
        errors: [`Error en la validación: ${error.message}`],
        warnings: [],
        certificateStatus: 'ERROR',
        signatureAlgorithm: 'UNKNOWN',
        validationTimestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtiene un certificado simulado
   * @param {string} emisorNit - NIT del emisor
   * @returns {Object} Certificado simulado
   */
  getMockCertificate(emisorNit) {
    return this.mockCertificates[emisorNit] || this.mockCertificates['00000000-0'];
  }

  /**
   * Genera el contenido que se va a firmar
   * @param {Object} dteData - Datos del DTE
   * @returns {string} Contenido para firmar
   */
  generateContentToSign(dteData) {
    const content = {
      numeroDTE: dteData.numeroDTE,
      tipoDTE: dteData.tipoDTE,
      emisor: dteData.emisor,
      receptor: dteData.receptor,
      totales: dteData.totales,
      fechaEmision: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    return JSON.stringify(content, null, 0);
  }

  /**
   * Simula una firma RSA
   * @param {string} hash - Hash a firmar
   * @param {Object} certificate - Certificado simulado
   * @returns {string} Hash firmado simulado
   */
  simulateRSASignature(hash, certificate) {
    // Simular firma RSA concatenando datos del certificado con el hash
    const signatureData = `${certificate.serialNumber}-${hash}-${certificate.subject}-${Date.now()}`;
    return crypto.createHash('sha256').update(signatureData).digest('hex');
  }

  /**
   * Simula el estado del DTE basado en reglas de negocio
   * @param {Object} dteData - Datos del DTE
   * @returns {string} Estado simulado
   */
  simulateDTEStatus(dteData) {
    // Reglas de simulación para el estado
    const random = Math.random();
    
    // 80% de probabilidad de ser aceptado
    if (random < 0.8) {
      return 'ACCEPTED';
    }
    // 10% de probabilidad de ser observado
    else if (random < 0.9) {
      return 'OBSERVED';
    }
    // 10% de probabilidad de ser rechazado
    else {
      return 'REJECTED';
    }
  }

  /**
   * Valida un certificado simulado
   * @param {Object} certificate - Certificado a validar
   * @returns {Object} Resultado de la validación
   */
  validateCertificate(certificate) {
    const validation = {
      isValid: true,
      status: 'VALID',
      errors: []
    };

    if (!certificate) {
      validation.isValid = false;
      validation.status = 'INVALID';
      validation.errors.push('Certificado no encontrado');
      return validation;
    }

    // Validar fechas de vigencia
    const now = new Date();
    const validFrom = new Date(certificate.validFrom);
    const validTo = new Date(certificate.validTo);

    if (now < validFrom) {
      validation.isValid = false;
      validation.status = 'NOT_YET_VALID';
      validation.errors.push('El certificado aún no es válido');
    }

    if (now > validTo) {
      validation.isValid = false;
      validation.status = 'EXPIRED';
      validation.errors.push('El certificado ha expirado');
    }

    // Validar campos requeridos
    const requiredFields = ['issuer', 'subject', 'serialNumber', 'algorithm'];
    for (const field of requiredFields) {
      if (!certificate[field]) {
        validation.isValid = false;
        validation.status = 'INVALID';
        validation.errors.push(`Campo requerido faltante: ${field}`);
      }
    }

    return validation;
  }

  /**
   * Genera un ID único para la firma
   * @returns {string} ID de la firma
   */
  generateSignatureId() {
    return `SIG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Genera un código de validación
   * @returns {string} Código de validación
   */
  generateValidationCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  /**
   * Obtiene información de todos los certificados simulados
   * @returns {Array} Lista de certificados
   */
  getAvailableCertificates() {
    return Object.keys(this.mockCertificates).map(nit => ({
      nit,
      ...this.mockCertificates[nit]
    }));
  }

  /**
   * Simula la revocación de un certificado
   * @param {string} emisorNit - NIT del emisor
   * @returns {Object} Resultado de la revocación
   */
  revokeCertificate(emisorNit) {
    if (this.mockCertificates[emisorNit]) {
      this.mockCertificates[emisorNit].revoked = true;
      this.mockCertificates[emisorNit].revocationDate = new Date();
      return {
        success: true,
        message: 'Certificado revocado exitosamente',
        revocationDate: new Date()
      };
    }
    
    return {
      success: false,
      message: 'Certificado no encontrado'
    };
  }
}

module.exports = new SignatureService();
