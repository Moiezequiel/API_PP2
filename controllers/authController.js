const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {
    console.log("📝 Datos recibidos en registro:", req.body);
    
    const { 
      name, 
      email, 
      password, 
      dui, 
      businessName, 
      commercialName, 
      phone, 
      address, 
      taxRegime, 
      role 
    } = req.body;

    // Validaciones básicas
    if (!name || !email || !password || !dui || !businessName) {
      console.log(" Campos faltantes:", { name: !!name, email: !!email, password: !!password, dui: !!dui, businessName: !!businessName });
      return res.status(400).json({ 
        message: "Todos los campos obligatorios deben ser completados",
        missingFields: {
          name: !name,
          email: !email,
          password: !password,
          dui: !dui,
          businessName: !businessName
        }
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(" Email inválido:", email);
      return res.status(400).json({ message: "Formato de email inválido" });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      console.log(" Contraseña muy corta:", password.length, "caracteres");
      return res.status(400).json({ 
        message: "La contraseña debe tener al menos 6 caracteres" 
      });
    }

    // Validación simplificada de DUI para proyecto estudiantil
    if (!dui || dui.length < 5) {
      console.log(" DUI muy corto:", dui);
      return res.status(400).json({ 
        message: "El DUI debe tener al menos 5 caracteres" 
      });
    }

    console.log("🔍 Verificando si el usuario ya existe...");

    // Validar si el usuario ya existe por email
    const userExistsByEmail = await User.findOne({ email });
    if (userExistsByEmail) {
      console.log(" Email ya registrado:", email);
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    // Validar si el usuario ya existe por DUI
    const userExistsByDUI = await User.findOne({ dui });
    if (userExistsByDUI) {
      console.log(" DUI ya registrado:", dui);
      return res.status(400).json({ message: "El DUI ya está registrado" });
    }

    console.log(" Validaciones básicas pasadas, creando usuario...");

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      dui,
      businessName,
      commercialName,
      phone,
      address,
      taxRegime: taxRegime || 'General',
      role: role || 'user'
    });

    console.log(" Usuario creado, guardando en base de datos...");

    await newUser.save();

    console.log(" Usuario guardado exitosamente, generando token...");

    // Generar token para el usuario recién registrado
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(" Registro completado exitosamente");

    res.status(201).json({ 
      message: "Usuario registrado exitosamente",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        businessName: newUser.businessName,
        dui: newUser.dui,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error(" Error en registro:", err);
    res.status(500).json({ 
      message: "Error en el servidor", 
      error: err.message 
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email y contraseña son requeridos" 
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({ message: "Cuenta deshabilitada" });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Generar token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        dui: user.dui,
        role: user.role,
        taxRegime: user.taxRegime
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ 
      message: "Error en el servidor", 
      error: err.message 
    });
  }
};

// Función para obtener perfil del usuario
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    res.json({ user });
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ 
      message: "Error en el servidor", 
      error: err.message 
    });
  }
};

// Función para actualizar perfil del usuario
const updateUserProfile = async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      address, 
      commercialName 
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar campos permitidos
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (commercialName) user.commercialName = commercialName;

    await user.save();

    res.json({ 
      message: "Perfil actualizado exitosamente",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        dui: user.dui,
        role: user.role,
        phone: user.phone,
        address: user.address,
        commercialName: user.commercialName
      }
    });
  } catch (err) {
    console.error("Error actualizando perfil:", err);
    res.status(500).json({ 
      message: "Error en el servidor", 
      error: err.message 
    });
  }
};

module.exports = { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile 
};
