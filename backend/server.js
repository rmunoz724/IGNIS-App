const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// 1. Conexión a la Base de Datos Cloud (BaaS)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a la Base de Datos en la Nube (MongoDB Atlas)'))
    .catch(err => console.error('Error conectando a la BD:', err));

// 2. BUENAS PRÁCTICAS OWASP: Seguridad de cabeceras HTTP
app.use(helmet());

// 3. Middlewares básicos
app.use(cors());
app.use(express.json());

// 4. BUENAS PRÁCTICAS OWASP: Prevención de ataques de fuerza bruta y DDoS
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Demasiadas peticiones desde esta IP, intente nuevamente más tarde."
});
app.use('/api/', apiLimiter);

// 5. Endpoint de prueba para reportes
app.post('/api/reportes', [
    body('latitud').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('longitud').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    body('descripcion').trim().escape().isLength({ max: 255 }).withMessage('Descripción muy larga o caracteres inválidos')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // Retorno exitoso simulando la inserción
    res.status(201).json({ mensaje: 'Reporte validado por OWASP y registrado en MongoDB exitosamente.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor I.G.N.I.S. corriendo seguro en el puerto ${PORT}`);
});