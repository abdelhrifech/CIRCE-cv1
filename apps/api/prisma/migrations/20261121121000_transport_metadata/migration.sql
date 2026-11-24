CREATE TABLE "transport_colis_metadata" (
  "colisId" INTEGER NOT NULL PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 1,
  "donnees" TEXT NOT NULL,
  "verifieLe" TEXT NOT NULL,
  "verifiePar" INTEGER NOT NULL
);
