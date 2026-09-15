ALTER TABLE "Stock" ADD CONSTRAINT "stock_nonnegative" CHECK (quantity >= 0 AND minimum >= 0 AND ideal >= 0 AND "averageCost" >= 0);
ALTER TABLE "DocumentItem" ADD CONSTRAINT "item_quantities" CHECK (quantity >= 0 AND completed >= 0 AND returned >= 0 AND lost >= 0 AND completed + returned + lost <= quantity AND "unitCost" >= 0);
ALTER TABLE "Document" ADD CONSTRAINT "different_destination" CHECK ("destinationId" IS NULL OR "destinationId" <> "locationId");
ALTER TABLE "Ledger" ADD CONSTRAINT "ledger_valid" CHECK (delta <> 0 AND balance >= 0 AND "unitCost" >= 0);
ALTER TABLE "Material" ADD CONSTRAINT "material_values" CHECK (weight >= 0 AND "referenceCost" >= 0);
CREATE FUNCTION reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Stock ledger is immutable'; END $$;
CREATE TRIGGER immutable_ledger BEFORE UPDATE OR DELETE ON "Ledger" FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
