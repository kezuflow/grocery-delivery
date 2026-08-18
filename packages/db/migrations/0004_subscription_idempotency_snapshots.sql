ALTER TABLE subscription_idempotency
  ADD COLUMN result_json TEXT NOT NULL DEFAULT '{}';

UPDATE subscription_idempotency
SET result_json = (
  SELECT json_object(
    'id', s.id,
    'customerId', s.customer_id,
    'planId', s.plan_id,
    'status', s.status,
    'skippedCycleId', s.skipped_cycle_id,
    'lastAction', s.last_action,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at
  )
  FROM subscriptions s
  WHERE s.id = subscription_idempotency.subscription_id
)
WHERE result_json = '{}';
