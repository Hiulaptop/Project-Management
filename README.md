This is a personal project about project management. Quick guide for access this project in development enviroment:

1. Setup .env
```
DATABASE_URL="YOUR DATABASE URL HERE"
```

2. Migrated database
```
npx prisma generate
npx prisma migrate dev --name init
npx prisma db push
```

3. Run seed to create SuperUser
```
npx prisma db seed
```

4. Run project
```
npm i
npm run devs
```