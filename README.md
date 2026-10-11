# Préstamos Familia - Comparador de Financiación vs Contado

Herramienta para ayudar a personas sin conocimientos financieros a analizar préstamos y leasing de vehículos, comparando pago al contado vs financiación.

## Stack Tecnológico

- **Backend**: FastAPI + SQLModel + PostgreSQL + Supabase Auth
- **Frontend**: React 18 + Vite + Tailwind CSS + TanStack Query + React Hook Form + Zod
- **Deploy**: Vercel (Frontend) + Railway/Render (Backend)
- **Auth**: Magic Links via Supabase (sin passwords)

## Estructura del Monorepo

```
prestamos-familia/
├── backend/                 # FastAPI Application
│   ├── app/
│   │   ├── api/            # Endpoints (routes)
│   │   ├── core/           # Config, security, database
│   │   ├── models/         # SQLModel tables
│   │   ├── schemas/        # Pydantic schemas (request/response)
│   │   ├── services/       # Business logic (calculations, alerts)
│   │   └── main.py         # App entry point
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic/            # Migrations
├── frontend/               # React + Vite Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components (routes)
│   │   ├── services/       # API calls (TanStack Query)
│   │   ├── types/          # TypeScript types (shared with backend)
│   │   └── utils/          # Helpers, formatters
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── shared/                 # Shared types/schemas
│   └── schemas.ts          # Zod schemas shared via copy or git submodule
├── docker-compose.yml      # Local development (PostgreSQL + Backend + Frontend)
├── .github/workflows/      # CI/CD pipelines
└── README.md
```

## Desarrollo Local

### Prerrequisitos
- Docker & Docker Compose
- Node.js 20+ (para frontend local sin Docker)
- Python 3.11+ (para backend local sin Docker)

### Con Docker (recomendado)
```bash
docker-compose up -d
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# PostgreSQL: localhost:5432
```

### Sin Docker (desarrollo nativo)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configurar variables
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env  # Configurar VITE_API_URL
npm run dev
```

## Variables de Entorno

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/prestamos
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_URL=https://your-project.supabase.co
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deploy

### Backend (Railway/Render)
1. Conectar repo GitHub
2. Configurar variables de entorno
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)
1. Importar repo GitHub
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configurar `VITE_API_URL` en variables de entorno

## Tests y calidad

```bash
# Backend (dentro del contenedor; los tests de API se deshacen con un rollback)
docker compose exec backend pytest
docker compose exec backend ruff check app/ tests/
docker compose exec backend mypy app/

# Frontend
cd frontend
npm run lint && npx tsc --noEmit && npm run test -- --run && npm run build
```

Tras cambiar un modelo, genera la migración y revísala antes de commitear:

```bash
docker compose exec backend alembic revision --autogenerate -m "descripcion"
docker compose exec backend alembic upgrade head
```

## CI/CD (GitHub Actions)

Hay un workflow por mitad del monorepo en `.github/workflows/`. Cada uno solo se
ejecuta si cambian archivos de su carpeta (`paths:`), en cada push a `main` y en
cada pull request contra `main`. También se pueden lanzar a mano desde la pestaña
**Actions** (`workflow_dispatch`).

| Workflow | Job | Qué hace |
|----------|-----|----------|
| `backend-ci.yml` | `test` | Levanta PostgreSQL como servicio, instala dependencias, `ruff`, `mypy`, aplica migraciones y ejecuta `pytest` con cobertura |
| `backend-ci.yml` | `docker` | Construye la imagen de producción (`backend/Dockerfile`) para comprobar que no se rompe |
| `frontend-ci.yml` | `test` | `npm ci`, ESLint, `tsc`, Vitest y build de producción |
| `frontend-ci.yml` | `deploy` | Despliega en Vercel: preview en los PR, producción en `main`. Se omite si faltan los secrets |

### Flujo de trabajo recomendado

```bash
git switch -c mi-cambio          # 1. rama nueva
# ...editar, commit...
git push -u origin mi-cambio     # 2. subir la rama
gh pr create --fill              # 3. abrir PR -> se lanza el CI
gh pr checks --watch             # 4. ver el resultado
gh pr merge --squash             # 5. fusionar -> CI en main (+ deploy)
```

### Activar el despliegue del frontend (CD)

1. Crea el proyecto en Vercel: `cd frontend && npx vercel link` (genera `.vercel/project.json` con `orgId` y `projectId`).
2. Crea un token en <https://vercel.com/account/tokens>.
3. Guarda los tres valores como secrets del repo:
   ```bash
   gh secret set VERCEL_TOKEN
   gh secret set VERCEL_ORG_ID
   gh secret set VERCEL_PROJECT_ID
   ```
4. En Vercel, define `VITE_API_URL` con la URL pública del backend.

El backend se despliega conectando el repo desde el panel de Railway/Render
(ver sección Deploy); ellos redepliegan en cada push a `main`.

> **Antes de desplegar en producción:** el login actual usa `/auth/dev-token`,
> que está desactivado cuando `ENVIRONMENT=production`. Hace falta implementar
> el login real (magic link de Supabase) para que la app sea usable desplegada.

### Ejercicios para practicar

- Rompe un test a propósito en una rama, abre un PR y mira cómo falla el check.
- Protege `main` (Settings → Branches) para exigir que el CI pase antes de fusionar.
- Añade un job que publique la imagen del backend en GHCR (`docker/build-push-action`).
- Añade Dependabot (`.github/dependabot.yml`) para actualizar dependencias con PRs automáticos.

## Licencia

MIT - Uso familiar y personal.
