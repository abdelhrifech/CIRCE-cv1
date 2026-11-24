CREATE TABLE "production_delivery_forecast" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "expected_line_id" INTEGER NOT NULL,
  "delivery_date" TEXT,
  "comment" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" DATETIME NOT NULL,
  "updated_by_id" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "production_delivery_forecast_expected_line_id_key" ON "production_delivery_forecast"("expected_line_id");
