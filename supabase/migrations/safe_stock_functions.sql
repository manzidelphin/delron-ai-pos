-- ================================================
-- Safe stock changes for sales.
-- Each function changes stock in ONE statement: it adds the (negative) amount
-- to the current value and checks the business at the same time. Before, the
-- server read the stock, computed the new value and wrote it back, so two tills
-- selling the same item at the same moment could overwrite each other, and the
-- write did not check which business owned the item.
-- Called only by the server (service role); browsers cannot call them.
-- Each returns the new value, or NULL when the item is not in that business.
-- ================================================

CREATE OR REPLACE FUNCTION adjust_product_stock(p_id UUID, p_business UUID, p_delta NUMERIC)
RETURNS NUMERIC LANGUAGE sql AS $$
  UPDATE products
     SET quantity = GREATEST(0, quantity + p_delta), updated_at = now()
   WHERE id = p_id AND business_id = p_business
  RETURNING quantity;
$$;

CREATE OR REPLACE FUNCTION adjust_finished_good_stock(p_id UUID, p_business UUID, p_delta NUMERIC)
RETURNS NUMERIC LANGUAGE sql AS $$
  UPDATE finished_goods
     SET quantity = GREATEST(0, quantity + p_delta), updated_at = now()
   WHERE id = p_id AND business_id = p_business
  RETURNING quantity;
$$;

CREATE OR REPLACE FUNCTION adjust_bar_stock(p_id UUID, p_business UUID, p_bottles_delta NUMERIC, p_shots_delta NUMERIC)
RETURNS NUMERIC LANGUAGE sql AS $$
  UPDATE bar_items
     SET quantity_bottles = GREATEST(0, ROUND(quantity_bottles + p_bottles_delta, 2)),
         shots_remaining  = GREATEST(0, ROUND(COALESCE(shots_remaining, 0) + p_shots_delta, 2)),
         updated_at = now()
   WHERE id = p_id AND business_id = p_business
  RETURNING quantity_bottles;
$$;

REVOKE ALL ON FUNCTION adjust_product_stock(UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION adjust_finished_good_stock(UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION adjust_bar_stock(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION adjust_product_stock(UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_finished_good_stock(UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_bar_stock(UUID, UUID, NUMERIC, NUMERIC) TO service_role;
