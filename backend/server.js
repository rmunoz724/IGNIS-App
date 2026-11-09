const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a la Base de Datos en la Nube (MongoDB Atlas)'))
    .catch(err => console.error('Error conectando a la BD:', err));

// MODELO DE DATOS DE I.G.N.I.S.
const reporteSchema = new mongoose.Schema({
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now } // Guarda la hora exacta del reporte
});
const Reporte = mongoose.model('Reporte', reporteSchema);

app.use(helmet());
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Demasiadas peticiones desde esta IP, intente nuevamente más tarde."
});
app.use('/api/', apiLimiter);

// RUTA PARA OBTENER LOS REPORTES Y MOSTRARLOS EN EL MAPA
app.get('/api/reportes', async (req, res) => {
    try {
        const listaReportes = await Reporte.find().sort({ fecha: -1 }).limit(50);
        res.status(200).json(listaReportes);
    } catch (error) {
        console.error("Error al obtener reportes:", error);
        res.status(500).json({ mensaje: 'Error interno al cargar el mapa.' });
    }
});

app.post('/api/reportes', [
    body('latitud').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('longitud').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    body('descripcion').trim().escape().isLength({ max: 255 }).withMessage('Descripción muy larga o caracteres inválidos')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const nuevoReporte = new Reporte({
            latitud: req.body.latitud,
            longitud: req.body.longitud,
            descripcion: req.body.descripcion
        });
        
        await nuevoReporte.save(); 
        
        res.status(201).json({ mensaje: '¡Reporte validado y guardado exitosamente en MongoDB!' });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(500).json({ mensaje: 'Error interno del servidor al guardar el reporte.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor I.G.N.I.S. corriendo seguro en el puerto ${PORT}`);
});