// Configuración global para las pruebas
const mongoose = require('mongoose');

// Configurar timeout para las pruebas
jest.setTimeout(30000);

// Configurar variables de entorno para pruebas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'supersecreto123';
process.env.MONGO_URI = 'mongodb+srv://admin:admin1234@cluster0.hab2wda.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Limpiar base de datos antes de cada suite de pruebas
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Configurar console para pruebas
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('MongooseError') &&
      args[0].includes('OverwriteModelError')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('MongooseError') &&
      args[0].includes('OverwriteModelError')
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
