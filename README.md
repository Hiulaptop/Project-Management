# Project Management

A Next.js project management application with role-based access control, team collaboration, and deadline tracking.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (jose) with HTTP-only cookies

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your-secret-key-here"
```

### 3. Setup database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Push schema to database (if needed)
npx prisma db push
```

### 4. Seed database

Creates the default SuperUser account.

```bash
npx prisma db seed
```

### 5. Run development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## API Routes

### Auth

| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| POST   | `/api/auth/signup`   | Register new user  |
| POST   | `/api/auth/signin`   | Login              |
| POST   | `/api/auth/signout`  | Logout             |

### Projects

| Method | Endpoint                                    | Description           |
|--------|---------------------------------------------|-----------------------|
| GET    | `/api/projects`                             | List user's projects  |
| POST   | `/api/projects`                             | Create project        |
| GET    | `/api/projects/:id`                         | Get project details   |
| PATCH  | `/api/projects/:id`                         | Update project        |
| DELETE | `/api/projects/:id`                         | Delete project        |

### Project Members

| Method | Endpoint                                    | Description           |
|--------|---------------------------------------------|-----------------------|
| GET    | `/api/projects/:id/members`                 | List members          |
| POST   | `/api/projects/:id/members`                 | Add member            |
| PATCH  | `/api/projects/:id/members/:userId`         | Update member role    |
| DELETE | `/api/projects/:id/members/:userId`         | Remove member         |

## Database Management

```bash
# View database in browser
npx prisma studio

# Reset database (drops all data)
npx prisma migrate reset

# Create a new migration after schema changes
npx prisma migrate dev --name describe-your-change

# Apply migrations in production
npx prisma migrate deploy
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/           # Auth routes
│   │   └── projects/       # Project routes
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth.ts             # JWT session helpers
│   ├── db.ts               # Prisma client
│   └── getUser.ts          # Auth user helper
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seeder
└── .env                    # Environment variables
```

## Roles

### User Roles

| Role        | Description                    |
|-------------|--------------------------------|
| `SUPERUSER` | Full system access             |
| `ADMIN`     | Administrative privileges      |
| `USER`      | Default role for new users     |

### Project Roles

| Role      | Permissions                              |
|-----------|------------------------------------------|
| `OWNER`   | Full control, delete project, manage all |
| `MANAGER` | Edit project, manage members & deadlines |
| `MEMBER`  | View project, work on assigned deadlines |