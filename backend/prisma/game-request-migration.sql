-- Migration : demandes de jeux en BDD (1 ligne par jeu + votes)
-- À exécuter UNE FOIS sur le serveur : crée uniquement 2 nouvelles tables,
-- ne modifie aucune table existante (user, session, bot_*, etc.)
-- Usage : mysql -u root ndsshop < prisma/game-request-migration.sql

CREATE TABLE IF NOT EXISTS game_request (
  id VARCHAR(191) NOT NULL,
  title VARCHAR(191) NOT NULL,
  systems VARCHAR(191) NULL,
  note TEXT NULL,
  requesterId VARCHAR(191) NULL,
  requesterName VARCHAR(191) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS game_request_title_idx ON game_request(title);

CREATE TABLE IF NOT EXISTS game_request_vote (
  requestId VARCHAR(191) NOT NULL,
  userId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (requestId, userId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- NB : pas de IF NOT EXISTS sur le ADD CONSTRAINT (non supporté par toutes les
-- versions de MariaDB) — si cette contrainte existe déjà, la ligne échouera,
-- c'est simplement que la migration a déjà été appliquée.
ALTER TABLE game_request_vote
  ADD CONSTRAINT game_request_vote_requestId_fkey
  FOREIGN KEY (requestId) REFERENCES game_request(id)
  ON DELETE CASCADE ON UPDATE CASCADE;
