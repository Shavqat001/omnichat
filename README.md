# OmniChat - Омниканальный Call-Центр

Система для объединения различных каналов коммуникации (социальные сети, мессенджеры, онлайн-чат) в единую платформу для операторов контакт-центра.

## Возможности

### Основной функционал
- ✅ Интеграция множественных каналов коммуникации
- ✅ Единый интерфейс для всех диалогов
- ✅ Real-time обновления через WebSocket
- ✅ Фильтрация диалогов (статус, канал, рейтинг, дата)
- ✅ Редактирование и удаление сообщений
- ✅ Приглашение операторов в чат
- ✅ Передача диалогов между операторами
- ✅ Отправка файлов
- ✅ Быстрые фразы (шаблоны)
- ✅ Статусы операторов (онлайн/перерыв/офлайн)
- ✅ Система команд/групп
- ✅ Статистика и отчетность
- ✅ Экспорт отчетов в Excel
- ✅ Административная панель
- ✅ SMS-авторизация для клиентов
- ✅ Бот-интеграция для начала диалогов

## Технологии

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- Socket.io для real-time коммуникации
- JWT для аутентификации
- Twilio для SMS
- ExcelJS для экспорта отчетов

### Frontend
- React + TypeScript
- React Router
- Socket.io Client
- Recharts для графиков
- Axios для HTTP запросов

## Установка

### Требования
- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### Шаги установки

1. Клонируйте репозиторий
```bash
git clone <repository-url>
cd OmniChat
```

2. Установите зависимости
```bash
npm run install:all
```

3. Настройте базу данных
- Создайте базу данных PostgreSQL
- Обновите настройки в `backend/.env`

4. Настройте переменные окружения
```bash
cd backend
cp .env.example .env
# Отредактируйте .env файл
```

5. Запустите миграции базы данных
```bash
cd backend
npm run migrate
```

6. Запустите приложение
```bash
# Из корневой директории
npm run dev
```

Backend будет доступен на `http://localhost:5000`
Frontend будет доступен на `http://localhost:3000`

## Структура проекта

```
OmniChat/
├── backend/
│   ├── src/
│   │   ├── database/      # Схема БД и подключение
│   │   ├── routes/        # API маршруты
│   │   ├── middleware/   # Middleware (auth, etc)
│   │   ├── socket/       # WebSocket обработчики
│   │   └── utils/         # Утилиты
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── pages/        # Страницы приложения
│   │   ├── contexts/     # React контексты
│   │   └── services/     # API и Socket сервисы
│   └── package.json
└── package.json
```

## API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Получить текущего оператора
- `PUT /api/auth/status` - Изменить статус оператора

### Диалоги
- `GET /api/dialogs` - Список диалогов с фильтрами
- `GET /api/dialogs/:id` - Детали диалога
- `POST /api/dialogs/:id/assign` - Назначить диалог
- `POST /api/dialogs/:id/transfer` - Передать диалог
- `POST /api/dialogs/:id/invite` - Пригласить оператора
- `POST /api/dialogs/:id/close` - Закрыть диалог
- `POST /api/dialogs/:id/spam` - Пометить как спам

### Сообщения
- `GET /api/messages/dialog/:dialogId` - Сообщения диалога
- `POST /api/messages` - Отправить сообщение
- `PUT /api/messages/:id` - Редактировать сообщение
- `DELETE /api/messages/:id` - Удалить сообщение

### Статистика
- `GET /api/statistics` - Общая статистика
- `GET /api/statistics/channels` - Статистика по каналам
- `GET /api/statistics/export` - Экспорт в Excel

### Администрирование
- `POST /api/admin/operators` - Создать оператора
- `PUT /api/admin/operators/:id` - Обновить оператора
- `DELETE /api/admin/operators/:id` - Удалить оператора
- `POST /api/admin/teams` - Создать команду

## Конфигурация

### Переменные окружения (backend/.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnichat
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-phone-number

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## Разработка

### Создание первого администратора

После запуска приложения, создайте первого администратора через SQL:

```sql
INSERT INTO operators (login, password_hash, full_name, role)
VALUES ('admin', '$2a$10$...', 'Администратор', 'admin');
```

Или используйте API после создания оператора с ролью admin.

## Лицензия

ISC

## Автор

Разработано для омниканального контакт-центра
