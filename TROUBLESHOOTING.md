# Решение проблем подключения

## Ошибка: ERR_CONNECTION_REFUSED

Эта ошибка означает, что frontend не может подключиться к backend.

### Решение:

#### 1. Убедитесь, что Backend запущен

Проверьте в терминале, где запущен backend:
- Должно быть сообщение: `Server running on port 5000`
- Не должно быть ошибок подключения к базе данных

#### 2. Проверьте настройки Frontend

Создайте файл `frontend/.env` (если его нет):

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

**Важно:** После создания/изменения `.env` файла перезапустите frontend!

#### 3. Проверьте настройки Backend

Убедитесь, что в `backend/.env` указано:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
```

#### 4. Проверьте подключение к базе данных

Backend не запустится, если не может подключиться к PostgreSQL.

Проверьте в `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnichat
DB_USER=postgres
DB_PASSWORD=ваш_пароль
```

#### 5. Порядок запуска

1. **Сначала запустите Backend:**
   ```powershell
   cd backend
   npm run dev
   ```
   
   Дождитесь сообщения: `Server running on port 5000`

2. **Затем запустите Frontend:**
   ```powershell
   cd frontend
   npm start
   ```

#### 6. Проверка работы Backend

Откройте в браузере: http://localhost:5000/api/health

Должен вернуться JSON:
```json
{"status":"ok","timestamp":"..."}
```

Если не работает - backend не запущен или есть ошибки.

#### 7. Частые проблемы

**Проблема:** Backend не запускается из-за ошибки базы данных
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Решение:**
- Убедитесь, что PostgreSQL запущен
- Проверьте настройки в `backend/.env`
- Убедитесь, что база данных `omnichat` создана

**Проблема:** Backend запускается, но frontend не может подключиться

**Решение:**
- Проверьте, что порт 5000 не занят другим приложением
- Убедитесь, что в `frontend/.env` указан правильный URL
- Перезапустите frontend после изменения `.env`

**Проблема:** CORS ошибки

**Решение:**
- Убедитесь, что в `backend/.env` указано: `FRONTEND_URL=http://localhost:3000`
- Перезапустите backend после изменения `.env`
