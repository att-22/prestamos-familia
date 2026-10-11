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

## Licencia

MIT - Uso familiar y personal.
