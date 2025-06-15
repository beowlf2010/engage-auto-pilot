
-- This query finds duplicate inventory units using priority: stock_number, then vin, then order number field (if you specify which column).

WITH dedupe_keys AS (
  SELECT
    id,
    stock_number,
    vin,
    -- If stock_number exists, use it, else if vin, use it, else fallback to possible order number (repeat logic here if needed)
    COALESCE(
      NULLIF(TRIM(stock_number), ''),
      NULLIF(TRIM(vin), ''),
      'NO_ID'
    ) AS dedupe_key
  FROM public.inventory
)
SELECT
  dedupe_key AS duplicate_identifier,
  COUNT(*) AS duplicate_count
FROM dedupe_keys
GROUP BY dedupe_key
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
