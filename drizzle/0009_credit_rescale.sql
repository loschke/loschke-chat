-- Credit system rescale: 100,000 credits/dollar → 100 credits/dollar (÷1000)
-- 1 credit = 1 cent after this migration

-- Convert user balances (minimum 1 if previously > 0)
UPDATE users
SET credits_balance = GREATEST(1, ROUND(credits_balance / 1000.0)::integer)
WHERE credits_balance > 0;

-- Convert transaction amounts and balance snapshots
UPDATE credit_transactions
SET amount = CASE
      WHEN amount > 0 THEN GREATEST(1, ROUND(amount / 1000.0)::integer)
      WHEN amount < 0 THEN LEAST(-1, ROUND(amount / 1000.0)::integer)
      ELSE 0
    END,
    balance_after = GREATEST(0, ROUND(balance_after / 1000.0)::integer);
