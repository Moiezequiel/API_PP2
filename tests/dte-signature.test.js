const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const SignatureService = require('../services/signatureService');
const DTE = require('../models/DTE');
const User = require('../models/User');
const Venta = require('../models/Venta');
const Cliente = require('../models/Cliente');
const Producto = require('../models/Producto');

// Configuración de prueba
const testDB = 'mongodb://127.0.0.1:27017/facturacion_test';

describe('DTE Signature Simulation Tests', () => {
  let authToken;
  let testUser;
  let testCliente;
  let testProducto;
  let testVenta;
  let testDTE;

  beforeAll(async () => {
    // Conectar a base de datos de prueba
    await mongoose.connect(testDB);
    
    // Limpiar base de datos
    await Promise.all([
      User.deleteMany({}),
      Cliente.deleteMany({}),
      Producto.deleteMany({}),
      Venta.deleteMany({}),
      DTE.deleteMany({})
    ]);
  });

  afterAll(async () => {
    // Limpiar base de datos después de las pruebas
    await Promise.all([
      User.deleteMany({}),
      Cliente.deleteMany({}),
      Producto.deleteMany({}),
      Venta.deleteMany({}),
      DTE.deleteMany({})
    ]);
    
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Crear usuario de prueba
    testUser = new User({
      name: 'Usuario Prueba',
      email: 'test@example.com',
      password: 'password123',
      dui: '12345678-9',
      businessName: 'Empresa Prueba S.A. de C.V.',
      role: 'admin'
    });
    await testUser.save();

    // Crear cliente de prueba
    testCliente = new Cliente({
      nombre: 'Cliente Prueba',
      email: 'cliente@example.com',
      nit: '1234-567890-123-4',
      telefono: '1234-5678',
      direccion: {
        calle: 'Calle Principal',
        ciudad: 'San Salvador',
        departamento: 'San Salvador',
        pais: 'El Salvador'
      }
    });
    await testCliente.save();

    // Crear producto de prueba
    testProducto = new Producto({
      codigo: 'PROD001',
      nombre: 'Producto Prueba',
      precio: 100.00,
      impuesto: 13,
      cantidad: 10,
      descripcion: 'Producto para pruebas'
    });
    await testProducto.save();

    // Crear venta de prueba
    testVenta = new Venta({
      cliente: testCliente._id,
      vendedor: testUser._id,
      productos: [{
        producto: testProducto._id,
        cantidad: 2,
        precioUnitario: 100.00,
        impuesto: 13
      }],
      subtotal: 200.00,
      impuestoTotal: 26.00,
      total: 226.00,
      numeroVenta: 'V001'
    });
    await testVenta.save();

    // Obtener token de autenticación
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Limpiar datos después de cada prueba
    await Promise.all([
      User.deleteMany({}),
      Cliente.deleteMany({}),
      Producto.deleteMany({}),
      Venta.deleteMany({}),
      DTE.deleteMany({})
    ]);
  });

  describe('SignatureService Tests', () => {
    test('should generate digital signature with valid data', () => {
      const dteData = {
        numeroDTE: '20241200000001',
        tipoDTE: '01',
        emisor: {
          nit: '00000000-0',
          nombre: 'Empresa Demo S.A. de C.V.',
          direccion: 'Dirección Demo'
        },
        receptor: {
          nit: '1234-567890-123-4',
          nombre: 'Cliente Demo',
          direccion: 'Dirección Cliente'
        },
        totales: {
          subtotal: 200.00,
          impuesto: 26.00,
          total: 226.00
        }
      };

      const signature = SignatureService.generateDigitalSignature(dteData, '00000000-0');

      expect(signature).toBeDefined();
      expect(signature.signature).toBeDefined();
      expect(signature.signedAt).toBeDefined();
      expect(signature.certificate).toBeDefined();
      expect(signature.hash).toBeDefined();
      expect(signature.algorithm).toBe('RSA-SHA256');
      expect(signature.keySize).toBe(2048);
      expect(signature.status).toMatch(/^(ACCEPTED|REJECTED|OBSERVED)$/);
      expect(signature.signatureId).toBeDefined();
      expect(signature.validationCode).toBeDefined();
    });

    test('should validate digital signature correctly', () => {
      const dteData = {
        numeroDTE: '20241200000001',
        tipoDTE: '01',
        emisor: {
          nit: '00000000-0',
          nombre: 'Empresa Demo S.A. de C.V.',
          direccion: 'Dirección Demo'
        },
        receptor: {
          nit: '1234-567890-123-4',
          nombre: 'Cliente Demo',
          direccion: 'Dirección Cliente'
        },
        totales: {
          subtotal: 200.00,
          impuesto: 26.00,
          total: 226.00
        }
      };

      const signature = SignatureService.generateDigitalSignature(dteData, '00000000-0');
      const validation = SignatureService.validateDigitalSignature(signature, dteData);

      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.certificateStatus).toBe('VALID');
      expect(validation.signatureAlgorithm).toBe('RSA-SHA256');
      expect(validation.validationTimestamp).toBeDefined();
    });

    test('should detect invalid signature when data is modified', () => {
      const originalData = {
        numeroDTE: '20241200000001',
        tipoDTE: '01',
        emisor: { nit: '00000000-0', nombre: 'Empresa Demo', direccion: 'Dirección' },
        receptor: { nit: '1234-567890-123-4', nombre: 'Cliente Demo', direccion: 'Dirección' },
        totales: { subtotal: 200.00, impuesto: 26.00, total: 226.00 }
      };

      const modifiedData = {
        ...originalData,
        totales: { subtotal: 300.00, impuesto: 39.00, total: 339.00 } // Cambio en totales
      };

      const signature = SignatureService.generateDigitalSignature(originalData, '00000000-0');
      const validation = SignatureService.validateDigitalSignature(signature, modifiedData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('El hash de la firma no coincide con los datos');
    });

    test('should get available certificates', () => {
      const certificates = SignatureService.getAvailableCertificates();
      
      expect(certificates).toBeDefined();
      expect(Array.isArray(certificates)).toBe(true);
      expect(certificates.length).toBeGreaterThan(0);
      
      const certificate = certificates[0];
      expect(certificate.nit).toBeDefined();
      expect(certificate.issuer).toBeDefined();
      expect(certificate.subject).toBeDefined();
      expect(certificate.serialNumber).toBeDefined();
      expect(certificate.validFrom).toBeDefined();
      expect(certificate.validTo).toBeDefined();
    });

    test('should revoke certificate successfully', () => {
      const result = SignatureService.revokeCertificate('00000000-0');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Certificado revocado exitosamente');
      expect(result.revocationDate).toBeDefined();
    });

    test('should handle certificate revocation for non-existent certificate', () => {
      const result = SignatureService.revokeCertificate('99999999-9');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Certificado no encontrado');
    });
  });

  describe('DTE Model Tests', () => {
    test('should generate realistic XML structure', async () => {
      const dte = new DTE({
        numeroDTE: '20241200000001',
        tipoDTE: '01',
        emisor: {
          nit: '00000000-0',
          nombre: 'Empresa Demo S.A. de C.V.',
          direccion: 'Dirección Demo'
        },
        receptor: {
          nit: '1234-567890-123-4',
          nombre: 'Cliente Demo',
          direccion: 'Dirección Cliente'
        },
        venta: testVenta._id,
        totales: {
          subtotal: 200.00,
          impuesto: 26.00,
          total: 226.00
        }
      });

      const xml = dte.generarXML();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns:dte="http://www.sat.gob.sv/dte/fel/0.1.0"');
      expect(xml).toContain('<dte:TipoDTE>01</dte:TipoDTE>');
      expect(xml).toContain('<dte:NumeroDTE>20241200000001</dte:NumeroDTE>');
      expect(xml).toContain('<dte:NIT>00000000-0</dte:NIT>');
      expect(xml).toContain('<dte:GranTotal>226.00</dte:GranTotal>');
      expect(xml).toContain('<dte:Signature xmlns="http://www.w3.org/2000/09/xmldsig#">');
    });

    test('should convert numbers to letters correctly', async () => {
      const dte = new DTE({
        numeroDTE: '20241200000001',
        tipoDTE: '01',
        emisor: { nit: '00000000-0', nombre: 'Test', direccion: 'Test' },
        receptor: { nit: '1234-567890-123-4', nombre: 'Test', direccion: 'Test' },
        venta: testVenta._id,
        totales: { subtotal: 200.00, impuesto: 26.00, total: 226.00 }
      });

      const result = dte.convertirNumeroALetras(226.50);
      expect(result).toContain('dólares');
      expect(result).toContain('centavos');
    });

    test('should map signature status to DTE status correctly', async () => {
      const dte = new DTE({
        numeroDTE: '20241200000001',
        tipoDTE: '01',
        emisor: { nit: '00000000-0', nombre: 'Test', direccion: 'Test' },
        receptor: { nit: '1234-567890-123-4', nombre: 'Test', direccion: 'Test' },
        venta: testVenta._id,
        totales: { subtotal: 200.00, impuesto: 26.00, total: 226.00 }
      });

      expect(dte.mapSignatureStatusToDTEStatus('ACCEPTED')).toBe('Aceptado');
      expect(dte.mapSignatureStatusToDTEStatus('REJECTED')).toBe('Rechazado');
      expect(dte.mapSignatureStatusToDTEStatus('OBSERVED')).toBe('Observado');
      expect(dte.mapSignatureStatusToDTEStatus('PENDING')).toBe('Pendiente');
      expect(dte.mapSignatureStatusToDTEStatus('UNKNOWN')).toBe('Pendiente');
    });
  });

  describe('DTE API Endpoints Tests', () => {
    test('should generate DTE with digital signature', async () => {
      const response = await request(app)
        .post('/api/dte/generar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ventaId: testVenta._id,
          tipoDTE: '01'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firmaDigital).toBeDefined();
      expect(response.body.data.firmaDigital.signature).toBeDefined();
      expect(response.body.data.firmaDigital.hash).toBeDefined();
      expect(response.body.data.firmaDigital.algorithm).toBe('RSA-SHA256');
      expect(response.body.data.firmaDigital.signatureId).toBeDefined();
      expect(response.body.data.firmaDigital.validationCode).toBeDefined();
    });

    test('should validate DTE signature', async () => {
      // Primero generar un DTE
      const generateResponse = await request(app)
        .post('/api/dte/generar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ventaId: testVenta._id,
          tipoDTE: '01'
        });

      const dteId = generateResponse.body.data._id;

      // Luego validar la firma
      const response = await request(app)
        .post(`/api/dte/${dteId}/validar-firma`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation).toBeDefined();
      expect(response.body.data.validation.isValid).toBe(true);
      expect(response.body.data.signatureInfo).toBeDefined();
    });

    test('should get available certificates', async () => {
      const response = await request(app)
        .get('/api/dte/certificados')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should revoke certificate', async () => {
      const response = await request(app)
        .put('/api/dte/certificados/00000000-0/revocar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.revocationDate).toBeDefined();
    });

    test('should simulate DTE status change', async () => {
      // Primero generar un DTE
      const generateResponse = await request(app)
        .post('/api/dte/generar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ventaId: testVenta._id,
          tipoDTE: '01'
        });

      const dteId = generateResponse.body.data._id;

      // Cambiar estado
      const response = await request(app)
        .post(`/api/dte/${dteId}/simular-estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nuevoEstado: 'Observado'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estadoAnterior).toBeDefined();
      expect(response.body.data.estadoNuevo).toBe('Observado');
      expect(response.body.data.fechaCambio).toBeDefined();
    });

    test('should reject invalid status change', async () => {
      // Primero generar un DTE
      const generateResponse = await request(app)
        .post('/api/dte/generar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ventaId: testVenta._id,
          tipoDTE: '01'
        });

      const dteId = generateResponse.body.data._id;

      // Intentar cambiar a estado inválido
      const response = await request(app)
        .post(`/api/dte/${dteId}/simular-estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nuevoEstado: 'EstadoInvalido'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Estado no válido');
    });
  });

  describe('Integration Tests', () => {
    test('should complete full DTE lifecycle with signature simulation', async () => {
      // 1. Generar DTE
      const generateResponse = await request(app)
        .post('/api/dte/generar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ventaId: testVenta._id,
          tipoDTE: '01'
        });

      expect(generateResponse.status).toBe(201);
      const dteId = generateResponse.body.data._id;

      // 2. Validar firma
      const validateResponse = await request(app)
        .post(`/api/dte/${dteId}/validar-firma`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.data.validation.isValid).toBe(true);

      // 3. Simular cambio de estado
      const statusResponse = await request(app)
        .post(`/api/dte/${dteId}/simular-estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nuevoEstado: 'Aceptado'
        });

      expect(statusResponse.status).toBe(200);

      // 4. Obtener DTE actualizado
      const getResponse = await request(app)
        .get(`/api/dte/${dteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.estado).toBe('Aceptado');
      expect(getResponse.body.data.firmaDigital.signature).toBeDefined();
    });
  });
});
