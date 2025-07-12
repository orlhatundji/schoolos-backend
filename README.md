# SchoolOS Backend

### Setting environment variables - `.env` files
Copy the `.env.template` file to `.env` and `.env.test` files and fill in the required values.

```sh
# Copy the template file to .env
cp .env.template .env
# Copy the template file to .env.test
cp .env.template .env.test
```

### Running Infrastructure (Docker - for Postgres and Redis)
```sh
# add execution permission for postgres docker container entry db script
chmod +x init-db.sh # do this the first time only

# Start containers
docker compose up -d
```
This will start the containers in the background. development and test databases will be created automatically and running at
 - `postgresql://root:secret@localhost:5434/scms-backend`
 - `postgresql://root:secret@localhost:5434/scms-backend-test` respectively.

### Running the Application
```sh
# Install dependencies
pnpm install
# start the development server
pnpm run start:dev
```
### Running Tests
```sh

# Run e2e tests
pnpm run test:e2e
```

### Database Commands
```sh

# Generate a new migration:
npx prisma migrate dev --name "name-of-migration"

# Seeing the DB (one time run needed)
npx prisma db seed
```

### Updating env template (.env.template)
To update the `.env.template` file after making changes to the `.env` file during development. This script will create a new `.env.template` file based on the current `.env` file.
```sh
# add script execution permission for env template generation
chmod +x generate-env-template.sh
```
This will generate a new `.env.template` file from the `.env` file.

```sh
# Generate a new .env file from the .env.template file
./generate-env-template.sh .env
```

### Generating NestJS Resources
When we need to generate NestJS modules and other resources, we can use:
```sh
npx nest generate resource
```
Then we move the generated resource folders into the components/ folder
Read more here: https://docs.nestjs.com/recipes/crud-generator

### Envs
```sh
# Generate random 32 bytes for `ENCRYPTOR_SECRET_KEY`

openssl rand -hex 64 | head -c 32
```
