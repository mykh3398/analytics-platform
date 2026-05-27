UPDATE unified_messages um
SET workspace_id = c.workspace_id
    FROM channels c
WHERE um.instance_id = c.instance_id
  AND (um.workspace_id IS NULL OR um.workspace_id = 0);

UPDATE classifications cl
SET workspace_id = um.workspace_id
    FROM unified_messages um
WHERE cl.message_id = um.id
  AND (cl.workspace_id IS NULL OR cl.workspace_id = 0)
  AND um.workspace_id IS NOT NULL
  AND um.workspace_id != 0;

DO $$
DECLARE
unfilled_messages      INT;
    unfilled_classifications INT;
BEGIN
SELECT COUNT(*) INTO unfilled_messages
FROM unified_messages
WHERE workspace_id IS NULL OR workspace_id = 0;

SELECT COUNT(*) INTO unfilled_classifications
FROM classifications
WHERE workspace_id IS NULL OR workspace_id = 0;

IF unfilled_messages > 0 OR unfilled_classifications > 0 THEN
        RAISE WARNING 'Backfill неповний: % повідомлень та % класифікацій без workspace_id',
            unfilled_messages, unfilled_classifications;
ELSE
        RAISE NOTICE 'Backfill успішний: всі записи отримали workspace_id';
END IF;
END $$;