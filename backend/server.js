const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a la BD (MongoDB Atlas)'))
    .catch(err => console.error('Error conectando a la BD:', err));

const reporteSchema = new mongoose.Schema({
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});
const Reporte = mongoose.model('Reporte', reporteSchema);

app.use(helmet());
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Demasiadas peticiones."
});
app.use('/api/', apiLimiter);

app.get('/api/reportes', async (req, res) => {
    try {
        const listaReportes = await Reporte.find().sort({ fecha: -1 }).limit(50);
        res.status(200).json(listaReportes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error interno.' });
    }
});

app.post('/api/reportes', [
    body('latitud').isFloat({ min: -90, max: 90 }),
    body('longitud').isFloat({ min: -180, max: 180 }),
    body('descripcion').trim().escape().isLength({ max: 255 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const nuevoReporte = new Reporte(req.body);
        await nuevoReporte.save();
        res.status(201).json({ mensaje: '¡Reporte guardado!' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al guardar.' });
    }
});


// --- ENDPOINT DEL CHATBOT CON IA (GEMINI) ---

app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;

        // 1. Validar mensaje recibido
        if (
            typeof mensaje !== 'string' ||
            mensaje.trim().length === 0 ||
            mensaje.length > 2000
        ) {
            return res.status(400).json({
                respuesta: 'El mensaje está vacío o supera el límite permitido.'
            });
        }

        // 2. Obtener API Key desde variables de entorno
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('No se encontró GEMINI_API_KEY.');

            return res.status(500).json({
                respuesta: 'El servicio de IA no está configurado.'
            });
        }

        // 3. Configurar solicitud a Gemini
        const url =
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

        const payload = {
            systemInstruction: {
                parts: [{
                    text: `Eres I.G.N.I.S. IA, el asistente virtual de
                    una aplicación chilena de reporte y seguimiento de
                    incendios forestales y emergencias.

                    Tus funciones son:
                    - Orientar a las personas ante emergencias.
                    - Entregar recomendaciones generales de seguridad.
                    - Explicar medidas preventivas frente a incendios.
                    - Orientar sobre evacuaciones de manera responsable.

                    REGLAS IMPORTANTES:
                    - Responde siempre en español.
                    - Sé claro, breve y directo.
                    - Utiliza un máximo de 3 oraciones cuando sea posible.
                    - No inventes información sobre incendios activos.
                    - No afirmes que conoces la ubicación de un incendio
                      si no tienes datos verificados.
                    - Nunca recomiendes acercarse a un incendio.
                    - Ante peligro inmediato, indica seguir instrucciones
                      de las autoridades y contactar a los servicios
                      de emergencia correspondientes.
                    - No sustituyas las instrucciones de SENAPRED,
                      CONAF ni Bomberos.
                    - Si la consulta no está relacionada con emergencias,
                      incendios o prevención, explica amablemente
                      el propósito de IGNIS.`
                }]
            },

            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: mensaje.trim()
                        }
                    ]
                }
            ],

            generationConfig: {
                maxOutputTokens: 250,
                thinkingConfig: {
                    thinkingLevel: "LOW"
    }
}

        };

        // 4. Enviar solicitud a Gemini
        const response = await fetch(url, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },

            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(60000)
        });

        const data = await response.json();

        // 5. Manejar errores de Gemini
        if (!response.ok) {
            console.error('Error de Gemini:', {
                status: response.status,
                message: data.error?.message
            });

            return res.status(502).json({
                respuesta: 'No fue posible obtener una respuesta de la IA.'
            });
        }

        // 6. Extraer respuesta generada
        const respuestaIA = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || '')
            .join('')
            .trim();

        if (!respuestaIA) {
            return res.status(502).json({
                respuesta: 'La IA no generó una respuesta válida.'
            });
        }

        // 7. Devolver respuesta al frontend
        res.status(200).json({
            respuesta: respuestaIA
        });

    } catch (error) {
        console.error('Error en el chatbot:', error.message);

        res.status(500).json({
            respuesta: 'No pude conectarme con el asistente. Intenta nuevamente.'
        });
    }
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor I.G.N.I.S. corriendo seguro en el puerto ${PORT}`);
});
