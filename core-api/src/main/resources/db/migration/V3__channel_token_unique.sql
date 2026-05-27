-- Спочатку очищуємо можливі дублікати (залишаємо перший запис)
DELETE FROM channels c1
    USING channels c2
WHERE c1.token = c2.token
  AND c1.id > c2.id
  AND c1.token IS NOT NULL;

-- Додаємо унікальний constraint
ALTER TABLE channels
    ADD CONSTRAINT uq_channels_token UNIQUE (token);