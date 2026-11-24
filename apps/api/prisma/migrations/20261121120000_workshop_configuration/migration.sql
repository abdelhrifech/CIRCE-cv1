-- EX-ADM-NEW-005 : métadonnées uniquement. Aucun modèle ni moteur existant modifié.
CREATE TABLE "workshop_configuration" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workshopId" INTEGER NOT NULL,
  "productionFlow" TEXT NOT NULL,
  "formatIds" TEXT NOT NULL DEFAULT '[]',
  "machineIds" TEXT NOT NULL DEFAULT '[]',
  "productionSteps" TEXT NOT NULL DEFAULT '[]',
  "schedulingCriteria" TEXT NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "workshop_configuration_workshopId_key" ON "workshop_configuration"("workshopId");
