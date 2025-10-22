const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuración de Swagger
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Facturación Electrónica - El Salvador',
      version: '1.0.0',
      description: 'API REST para sistema de facturación electrónica con autenticación JWT y MongoDB Atlas, adaptado para El Salvador.',
      contact: {
        name: 'Desarrollador',
        email: 'desarrollador@empresa.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          required: ['name', 'email', 'password', 'dui', 'businessName'],
          properties: {
            name: {
              type: 'string',
              description: 'Nombre completo del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico único'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Contraseña (mínimo 6 caracteres)'
            },
            dui: {
              type: 'string',
              pattern: '^[0-9]{4}-[0-9]{5}-[0-9]{1}$',
              description: 'DUI en formato salvadoreño (XXXX-XXXXX-X)'
            },
            businessName: {
              type: 'string',
              description: 'Nombre de la empresa o razón social'
            },
            commercialName: {
              type: 'string',
              description: 'Nombre comercial'
            },
            phone: {
              type: 'string',
              description: 'Número de teléfono'
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string', default: 'El Salvador' }
              }
            },
            taxRegime: {
              type: 'string',
              enum: ['General', 'Pequeño Contribuyente', 'Grande Contribuyente'],
              default: 'General'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'accountant'],
              default: 'user'
            }
          }
        },
        Producto: {
          type: 'object',
          required: ['codigo', 'nombre', 'precio'],
          properties: {
            codigo: {
              type: 'string',
              description: 'Código único del producto'
            },
            nombre: {
              type: 'string',
              description: 'Nombre del producto'
            },
            descripcion: {
              type: 'string',
              description: 'Descripción del producto'
            },
            precio: {
              type: 'number',
              minimum: 0,
              description: 'Precio del producto'
            },
            impuesto: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              default: 13,
              description: 'Porcentaje de impuesto (IVA)'
            },
            cantidad: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Cantidad en inventario'
            },
            categoria: {
              type: 'string',
              default: 'General',
              description: 'Categoría del producto'
            },
            activo: {
              type: 'boolean',
              default: true,
              description: 'Estado del producto'
            }
          }
        },
        Cliente: {
          type: 'object',
          required: ['nombre', 'email', 'nit', 'businessName'],
          properties: {
            nombre: {
              type: 'string',
              description: 'Nombre completo del cliente'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico único'
            },
            nit: {
              type: 'string',
              pattern: '^[0-9]{4}-[0-9]{6}-[0-9]{3}-[0-9]{1}$',
              description: 'NIT en formato salvadoreño (XXXX-XXXXXX-XXX-X)'
            },
            telefono: {
              type: 'string',
              description: 'Número de teléfono'
            },
            direccion: {
              type: 'object',
              properties: {
                calle: { type: 'string' },
                ciudad: { type: 'string' },
                departamento: { type: 'string' },
                codigoPostal: { type: 'string' },
                pais: { type: 'string', default: 'El Salvador' }
              }
            },
            tipoCliente: {
              type: 'string',
              enum: ['Persona Natural', 'Persona Jurídica', 'Consumidor Final'],
              default: 'Consumidor Final'
            },
            activo: {
              type: 'boolean',
              default: true
            }
          }
        },
        Venta: {
          type: 'object',
          required: ['cliente', 'productos'],
          properties: {
            cliente: {
              type: 'string',
              description: 'ID del cliente'
            },
            productos: {
              type: 'array',
              items: {
                type: 'object',
                required: ['producto', 'cantidad', 'precioUnitario'],
                properties: {
                  producto: {
                    type: 'string',
                    description: 'ID del producto'
                  },
                  cantidad: {
                    type: 'number',
                    minimum: 1,
                    description: 'Cantidad a vender'
                  },
                  precioUnitario: {
                    type: 'number',
                    minimum: 0,
                    description: 'Precio unitario'
                  },
                  impuesto: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Porcentaje de impuesto'
                  }
                }
              }
            },
            observaciones: {
              type: 'string',
              description: 'Observaciones de la venta'
            }
          }
        },
        DTE: {
          type: 'object',
          required: ['ventaId', 'tipoDTE'],
          properties: {
            ventaId: {
              type: 'string',
              description: 'ID de la venta a facturar'
            },
            tipoDTE: {
              type: 'string',
              enum: ['01', '02', '03', '04', '05', '06', '07', '08'],
              default: '01',
              description: 'Tipo de documento tributario electrónico'
            }
          }
        },
        SignatureValidation: {
          type: 'object',
          properties: {
            isValid: {
              type: 'boolean',
              description: 'Si la firma es válida'
            },
            errors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lista de errores encontrados'
            },
            warnings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lista de advertencias'
            },
            certificateStatus: {
              type: 'string',
              enum: ['VALID', 'INVALID', 'EXPIRED', 'NOT_YET_VALID', 'REVOKED', 'UNKNOWN', 'ERROR'],
              description: 'Estado del certificado'
            },
            signatureAlgorithm: {
              type: 'string',
              description: 'Algoritmo de firma utilizado'
            },
            validationTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp de la validación'
            }
          }
        },
        Certificate: {
          type: 'object',
          properties: {
            nit: {
              type: 'string',
              description: 'NIT del emisor'
            },
            issuer: {
              type: 'string',
              description: 'Emisor del certificado'
            },
            subject: {
              type: 'string',
              description: 'Sujeto del certificado'
            },
            serialNumber: {
              type: 'string',
              description: 'Número de serie del certificado'
            },
            validFrom: {
              type: 'string',
              format: 'date',
              description: 'Fecha de validez desde'
            },
            validTo: {
              type: 'string',
              format: 'date',
              description: 'Fecha de validez hasta'
            },
            algorithm: {
              type: 'string',
              description: 'Algoritmo de firma'
            },
            keySize: {
              type: 'number',
              description: 'Tamaño de la clave'
            },
            revoked: {
              type: 'boolean',
              description: 'Si el certificado está revocado'
            },
            revocationDate: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de revocación'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Mensaje de error'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Mensaje de éxito'
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};


