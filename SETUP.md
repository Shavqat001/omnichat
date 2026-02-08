# Инструкция по установке и настройке OmniChat

## Предварительные требования

1. **Node.js** версии 18 или выше
2. **PostgreSQL** версии 12 или выше
3. **npm** или **yarn**

## Шаг 1: Установка зависимостей

```bash
# Установка всех зависимостей (root, backend, frontend)
npm run install:all
```

Или вручную:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Шаг 2: Настройка базы данных

1. Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE omnichat;
```

2. Создайте пользователя (опционально):

```sql
CREATE USER omnichat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE omnichat TO omnichat_user;
```

## Шаг 3: Настройка переменных окружения

### Backend

Создайте файл `backend/.env` на основе `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Отредактируйте `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnichat
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-very-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# SMS Configuration (Twilio) - опционально
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Social Media API Keys - опционально
INSTAGRAM_ACCESS_TOKEN=
FACEBOOK_ACCESS_TOKEN=
VK_ACCESS_TOKEN=
OK_ACCESS_TOKEN=

# Messenger API Keys - опционально
WHATSAPP_API_KEY=
VIBER_API_KEY=
TELEGRAM_BOT_TOKEN=

# Bot Configuration
BOT_ENABLED=true
BOT_GREETING_MESSAGE=Добро пожаловать! Выберите интересующую вас тему.
```

### Frontend

Создайте файл `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Отредактируйте `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Шаг 4: Инициализация базы данных

```bash
cd backend
npm run migrate
```

Это создаст все необходимые таблицы в базе данных.

## Шаг 5: Создание первого администратора

После инициализации базы данных, создайте первого администратора через SQL:

```sql
-- Войдите в PostgreSQL
psql -U postgres -d omnichat

-- Создайте администратора (пароль: admin123)
-- ВАЖНО: В production используйте более сложный пароль!
INSERT INTO operators (login, password_hash, full_name, role)
VALUES (
  'admin',
  '$2a$10$mU7qGqhoprlfhX5JFOOtBOMVgCoFk4UlRagO6ru2efb/wHCC9wXcy',
  'Администратор',
  'admin'
);
```

**Примечание:** Для генерации правильного хеша пароля используйте:

```bash
cd backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password', 10).then(hash => console.log(hash));"
```

Или создайте временный скрипт:

```javascript
// backend/scripts/createAdmin.js
const bcrypt = require('bcryptjs');
const { query } = require('./src/database/connection');

async function createAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await query(
    `INSERT INTO operators (login, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)`,
    ['admin', passwordHash, 'Администратор', 'admin']
  );
  console.log('Admin created: login=admin, password=admin123');
}

createAdmin();
```

## Шаг 6: Запуск приложения

### Режим разработки (оба сервера одновременно)

Из корневой директории:

```bash
npm run dev
```

### Или запустите отдельно:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm start
```

## Шаг 7: Доступ к приложению

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## Настройка каналов

После входа как администратор, вы можете настроить каналы через API или напрямую в базе данных:

```sql
-- Пример создания канала
INSERT INTO channels (name, type, api_config, enabled)
VALUES ('WhatsApp', 'whatsapp', '{"api_key": "your_key"}', true);
```

## Интеграция с внешними сервисами

### Twilio (SMS)

1. Зарегистрируйтесь на https://www.twilio.com
2. Получите Account SID и Auth Token
3. Добавьте их в `backend/.env`

### Социальные сети и мессенджеры

Для каждой платформы требуется:
1. Создание приложения/бота в соответствующей системе
2. Получение API ключей/токенов
3. Добавление их в `backend/.env`
4. Реализация интеграции в `backend/src/services/channelIntegrations.ts`

## Решение проблем

### Ошибка подключения к базе данных

- Проверьте, что PostgreSQL запущен
- Убедитесь, что данные в `.env` правильные
- Проверьте права доступа пользователя БД

### Ошибки при установке зависимостей

```bash
# Очистите кэш и переустановите
rm -rf node_modules package-lock.json
npm install
```

### Порт уже занят

Измените порт в `.env` файлах:
- Backend: `PORT=5001`
- Frontend: измените в `package.json` скрипт `start`

## Production развертывание

1. Установите `NODE_ENV=production`
2. Используйте сильные секретные ключи для JWT
3. Настройте HTTPS
4. Используйте reverse proxy (nginx)
5. Настройте резервное копирование базы данных
6. Настройте мониторинг и логирование
