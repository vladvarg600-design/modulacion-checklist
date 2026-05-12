# Checklist de Modulacion E&F

Demo fullstack para replicar el formato industrial de checklist mostrado en la imagen, con frontend en React + Tailwind y backend en Node + PostgreSQL listo para Render.

## Estructura

- `frontend/`: app React para Cloudflare Pages.
- `backend/`: API Express para Render.
- `database/`: esquema y datos semilla PostgreSQL.
- `render.yaml`: blueprint opcional para desplegar la API en Render.

## Flujo de despliegue sugerido

1. Sube este repositorio a GitHub.
2. Crea una base PostgreSQL en Render o usa una existente y aplica `database/schema.sql` seguido de `database/seed.sql`.
3. Despliega `backend/` como Web Service en Render con las variables:
   - `DATABASE_URL`
   - `CORS_ORIGIN`
4. Despliega `frontend/` en Cloudflare Pages con:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`
   - Variable: `VITE_API_URL=https://tu-backend.onrender.com`

## Desarrollo local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notas de rendimiento

- La seccion del mapa usa carga diferida con `IntersectionObserver`.
- Las fotos de cada punto pueden cargarse desde la interfaz; el backend las guarda en PostgreSQL dentro de `foto_url`.
- Se aceptan `PNG`, `JPG` y `WebP`, con limite de 4 MB por imagen.
- Conviene subir las fotos finales y el plano en formato WebP, idealmente por debajo de 200 KB cada una.
- El backend guarda toda la jornada en una sola transaccion con `INSERT ... ON CONFLICT DO UPDATE`.
