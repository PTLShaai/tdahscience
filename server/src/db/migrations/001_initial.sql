-- Migration 001 : Schéma initial TDAH Science
-- Exécuter une seule fois : npm run migrate

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- UTILISATEURS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SUJETS DE RECHERCHE (TDAH, HPI, TSA…)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR(100) UNIQUE NOT NULL,
  label      VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales
INSERT INTO topics (slug, label) VALUES
  ('adhd', 'TDAH'),
  ('hpi',  'HPI / Haut Potentiel'),
  ('asd',  'TSA / Autisme')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────
-- LIAISON UTILISATEUR ↔ SUJET
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_topics (
  user_id  UUID REFERENCES users(id)  ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, topic_id)
);

-- ─────────────────────────────────────────
-- DOCUMENTS (référentiel universel)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doi              VARCHAR(255) UNIQUE,
  file_hash        VARCHAR(64)  UNIQUE NOT NULL,
  file_path        VARCHAR(500) NOT NULL,
  file_name        VARCHAR(255) NOT NULL,
  title            TEXT,
  authors          JSONB,
  year             INTEGER,
  journal          VARCHAR(500),
  study_type       VARCHAR(100),
  has_participants BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  imported_by      UUID REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- ANALYSE EXTRAITE PAR L'IA
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_analyses (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id              UUID UNIQUE REFERENCES documents(id) ON DELETE CASCADE,

  -- Population
  total_n                  INTEGER,
  analysis_n               INTEGER,
  n_grade                  CHAR(1) CHECK (n_grade IN ('A','B','C','D','E','F')),
  age_min                  INTEGER,
  age_max                  INTEGER,
  age_range_literal        TEXT,
  diagnosis_context_literal TEXT,
  recruitment_type         VARCHAR(100),
  university_flag          BOOLEAN DEFAULT FALSE,
  multi_site               BOOLEAN,
  geographic_context       TEXT,
  control_group            BOOLEAN,
  sex_breakdown_literal    TEXT,

  -- Qualité de preuve
  structured_diagnostic_tool BOOLEAN,
  diagnostic_tool_name       TEXT,
  multiple_informants        BOOLEAN,
  randomized                 BOOLEAN,
  longitudinal               BOOLEAN,

  -- Résultats
  medications_studied      JSONB DEFAULT '[]',
  key_findings_literal     JSONB DEFAULT '[]',
  limitations_literal      JSONB DEFAULT '[]',

  -- Méta extraction
  uncertain_fields         JSONB DEFAULT '[]',
  extraction_confidence    VARCHAR(20) CHECK (extraction_confidence IN ('high','medium','low')),
  primary_model            VARCHAR(100),
  secondary_model          VARCHAR(100),
  validation_status        VARCHAR(20) DEFAULT 'pending'
    CHECK (validation_status IN ('pending','validated','uncertain','failed')),

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DOMAINES DE RECHERCHE (liste vivante)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_domains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR(200) UNIQUE NOT NULL,
  label      VARCHAR(255) NOT NULL,
  parent_id  UUID REFERENCES research_domains(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias pour la normalisation
CREATE TABLE IF NOT EXISTS domain_aliases (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_label VARCHAR(255) NOT NULL,
  domain_id UUID REFERENCES research_domains(id) ON DELETE CASCADE,
  UNIQUE(raw_label)
);

-- ─────────────────────────────────────────
-- LIAISON DOCUMENT ↔ DOMAINE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_domains (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  domain_id   UUID REFERENCES research_domains(id) ON DELETE CASCADE,
  raw_label   VARCHAR(255),
  PRIMARY KEY (document_id, domain_id)
);

-- ─────────────────────────────────────────
-- LIAISON DOCUMENT ↔ SUJET
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_topics (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  topic_id    UUID REFERENCES topics(id)    ON DELETE CASCADE,
  added_by    UUID REFERENCES users(id),
  PRIMARY KEY (document_id, topic_id)
);

-- ─────────────────────────────────────────
-- FILE DE TRAITEMENT (queue batch)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  topic_id        UUID REFERENCES topics(id),
  status          VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','error')),
  attempt_count   INTEGER DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_documents_doi       ON documents(doi);
CREATE INDEX IF NOT EXISTS idx_documents_year      ON documents(year);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status  ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_doc_domains_domain  ON document_domains(domain_id);
