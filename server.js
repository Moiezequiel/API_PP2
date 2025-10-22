const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para capturar IP real
app.use((req, res, next) => {
  req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  next();
});

// Crear directorio de uploads si no existe
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads', 'temp');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Swagger
const { specs, swaggerUi } = require('./swagger/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Facturación Electrónica - El Salvador'
}));

// Rutas de la API
app.use("/api/auth", require("./routes/authRoutes.js"));
app.use("/api/productos", require("./routes/productoRoutes.js"));
app.use("/api/clientes", require("./routes/clienteRoutes.js"));
app.use("/api/ventas", require("./routes/ventaRoutes.js"));
app.use("/api/dte", require("./routes/dteRoutes.js"));
app.use("/api/bitacora", require("./routes/bitacoraRoutes.js"));

// Middleware para manejo de errores
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "API de Facturación Electrónica - El Salvador",
    version: "1.0.0",
    description: "Sistema completo de facturación electrónica para El Salvador",
    documentation: "http://localhost:5000/api-docs",
    endpoints: {
      auth: "/api/auth",
      productos: "/api/productos",
      clientes: "/api/clientes",
      ventas: "/api/ventas",
      dte: "/api/dte",
      bitacora: "/api/bitacora"
    },
    features: [
      "Autenticación JWT",
      "CRUD de Productos con importación CSV",
      "CRUD de Clientes con validación NIT",
      "Sistema de Ventas con cálculos de IVA",
      "Generación de DTE (XML y PDF)",
      "Sistema de Bitácora y Seguridad",
      "Documentación Swagger completa"
    ]
  });
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://admin:admin1234@cluster0.hab2wda.mongodb.net/Cluster0")
  .then(() => {
    console.log("✅ MongoDB conectado correctamente");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  });

