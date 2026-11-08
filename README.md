# I.G.N.I.S. - Incident Geographic Network & Information System

Prototipo de aplicación móvil de crowdsourcing para el reporte y validación de focos de incendio en tiempo real, desarrollado para la asignatura de Ingeniería de Software (INACAP).

## Arquitectura y Tendencias Tecnológicas (Cloud Computing)
Este proyecto utiliza un modelo Cloud dividido en:
*   **PaaS (Platform as a Service):** Backend alojado en la nube para procesamiento concurrente.
*   **BaaS (Backend as a Service):** Base de datos MongoDB Atlas para alta disponibilidad (99.9% uptime).
*   **Frontend:** React Native para compatibilidad multiplataforma.

## Seguridad y Normativa (OWASP)
En cumplimiento con la normativa de Delitos Informáticos y ética profesional, la API implementa:
1.  **Helmet.js:** Protección de cabeceras HTTP contra ataques XSS.
2.  **Express-Rate-Limit:** Prevención de ataques DDoS y fuerza bruta limitando peticiones por IP.
3.  **Express-Validator:** Saneamiento estricto de inputs (latitud, longitud, descripciones) para evitar inyecciones de código (SQL/NoSQL Injection).

## Cómo ejecutar localmente
1. Clonar el repositorio: `git clone https://github.com/rmunoz724/IGNIS-App.git`
2. Ir a la carpeta del backend: `cd backend`
3. Instalar dependencias: `npm install`
4. Crear archivo `.env` con la variable `MONGO_URI`.
5. Ejecutar: `node server.js`