-- ============================================================================
-- N8N Workflow Data Factory - D1 Database Schema
-- ============================================================================
-- Reference schema for Cloudflare D1 database
-- Note: D1 uses SQLite syntax, some PostgreSQL features may not be available
-- ============================================================================

-- ============================================================================
-- TABLE: workflows (Main)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT,
    
    -- Core Data
    name TEXT NOT NULL,
    description TEXT,
    workflow_json TEXT NOT NULL,
    
    -- Metadata
    node_count INTEGER,
    complexity TEXT,
    category TEXT,
    tags TEXT,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    original_created_at TEXT,
    last_modified_at TEXT,
    
    -- Quality Metrics
    completeness_score REAL DEFAULT 0.0,
    validity_score REAL DEFAULT 0.0,
    documentation_score REAL DEFAULT 0.0,
    popularity_score REAL DEFAULT 0.0,
    
    -- Processing Status
    processing_status TEXT DEFAULT 'pending',
    processed_at TEXT,
    embedding_generated INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    -- Constraints
    CONSTRAINT unique_source_workflow UNIQUE(source, source_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_complexity ON workflows(complexity);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(processing_status);
CREATE INDEX IF NOT EXISTS idx_workflows_created ON workflows(created_at);

-- ============================================================================
-- TABLE: workflow_nodes (Extracted from workflows)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    
    node_id TEXT NOT NULL,
    node_name TEXT,
    node_type TEXT NOT NULL,
    node_type_version REAL,
    
    position_x INTEGER,
    position_y INTEGER,
    
    is_disabled INTEGER DEFAULT 0,
    is_trigger INTEGER DEFAULT 0,
    
    parameters TEXT,
    credentials TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    
    CONSTRAINT unique_workflow_node UNIQUE(workflow_id, node_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON workflow_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_nodes_trigger ON workflow_nodes(is_trigger);

-- ============================================================================
-- TABLE: workflow_connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    
    source_node_id TEXT NOT NULL,
    source_output_index INTEGER DEFAULT 0,
    
    target_node_id TEXT NOT NULL,
    target_input_index INTEGER DEFAULT 0,
    
    connection_type TEXT DEFAULT 'main',
    
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_workflow ON workflow_connections(workflow_id);

-- ============================================================================
-- TABLE: categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INTEGER REFERENCES categories(id),
    
    workflow_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Default categories
INSERT OR IGNORE INTO categories (name, description, workflow_count) VALUES
    ('Data Synchronization', 'Workflows for syncing data between systems', 0),
    ('Marketing Automation', 'Marketing and campaign automation workflows', 0),
    ('Customer Support', 'Customer service and support workflows', 0),
    ('Content Management', 'Content creation and management workflows', 0),
    ('E-commerce Operations', 'E-commerce and sales workflows', 0),
    ('DevOps & Monitoring', 'DevOps and system monitoring workflows', 0),
    ('Reporting & Analytics', 'Reporting and analytics workflows', 0),
    ('Lead Generation & CRM', 'Lead generation and CRM workflows', 0),
    ('Notification Systems', 'Notification and alerting workflows', 0),
    ('Document Processing', 'Document handling workflows', 0);

-- ============================================================================
-- TABLE: tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    
    usage_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- TABLE: workflow_tags (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_tags (
    workflow_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    
    confidence REAL DEFAULT 1.0,
    is_auto_generated INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    
    PRIMARY KEY (workflow_id, tag_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE: node_types_registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS node_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    category TEXT,
    description TEXT,
    
    is_trigger INTEGER DEFAULT 0,
    is_deprecated INTEGER DEFAULT 0,
    
    usage_count INTEGER DEFAULT 0,
    
    documentation_url TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Common node types
INSERT OR IGNORE INTO node_types (type_name, display_name, category, is_trigger) VALUES
    ('webhook', 'Webhook', 'Trigger', 1),
    ('schedule', 'Schedule', 'Trigger', 1),
    ('manualTrigger', 'Manual Trigger', 'Trigger', 1),
    ('errorTrigger', 'Error Trigger', 'Trigger', 1),
    ('httpRequest', 'HTTP Request', 'HTTP', 0),
    ('slack', 'Slack', 'Communication', 0),
    ('googleSheets', 'Google Sheets', 'Spreadsheet', 0),
    ('airtable', 'Airtable', 'Database', 0),
    ('notion', 'Notion', 'Database', 0),
    ('discord', 'Discord', 'Communication', 0),
    ('email', 'Email', 'Communication', 0),
    ('telegram', 'Telegram', 'Communication', 0),
    ('set', 'Set', 'Data', 0),
    ('function', 'Function', 'Code', 0),
    ('code', 'Code', 'Code', 0);

-- ============================================================================
-- TABLE: integration_services
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT UNIQUE NOT NULL,
    service_type TEXT,
    
    usage_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now'))
);

-- Common integrations
INSERT OR IGNORE INTO integration_services (service_name, service_type) VALUES
    ('slack', 'Communication'),
    ('google-sheets', 'Spreadsheet'),
    ('airtable', 'Database'),
    ('notion', 'Database'),
    ('discord', 'Communication'),
    ('email', 'Communication'),
    ('github', 'Development'),
    ('stripe', 'Payment'),
    ('hubspot', 'CRM'),
    ('salesforce', 'CRM'),
    ('zendesk', 'Support'),
    ('jira', 'Project Management'),
    ('twilio', 'Communication'),
    ('sendgrid', 'Email'),
    ('mailchimp', 'Email'),
    ('typeform', 'Form'),
    ('wordpress', 'CMS');

-- ============================================================================
-- TABLE: workflow_services (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_services (
    workflow_id TEXT NOT NULL,
    service_id INTEGER NOT NULL,
    
    PRIMARY KEY (workflow_id, service_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES integration_services(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE: processing_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processing_workflow ON processing_log(workflow_id);
CREATE INDEX IF NOT EXISTS idx_processing_stage ON processing_log(stage);
CREATE INDEX IF NOT EXISTS idx_processing_status ON processing_log(status);

-- ============================================================================
-- TABLE: quality_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    
    metric_name TEXT NOT NULL,
    metric_value REAL,
    
    details TEXT,
    
    measured_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_workflow ON quality_metrics(workflow_id);
CREATE INDEX IF NOT EXISTS idx_quality_metric ON quality_metrics(metric_name);

-- ============================================================================
-- TABLE: data_sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT UNIQUE NOT NULL,
    source_type TEXT,
    
    base_url TEXT,
    last_fetched_at TEXT,
    
    total_workflows_collected INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    
    configuration TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Default data sources
INSERT OR IGNORE INTO data_sources (source_name, source_type, base_url) VALUES
    ('n8n-community', 'community', 'https://api.n8n.io'),
    ('github-templates', 'github', 'https://api.github.com'),
    ('user-submissions', 'user_submission', NULL);

-- ============================================================================
-- TABLE: collection_runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER REFERENCES data_sources(id),
    
    run_type TEXT,
    status TEXT,
    
    workflows_found INTEGER DEFAULT 0,
    workflows_new INTEGER DEFAULT 0,
    workflows_updated INTEGER DEFAULT 0,
    workflows_failed INTEGER DEFAULT 0,
    
    started_at TEXT,
    completed_at TEXT,
    
    error_summary TEXT,
    
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- TABLE: embeddings_metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS embeddings_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL UNIQUE,
    
    vector_id TEXT UNIQUE NOT NULL,
    embedding_model TEXT,
    embedding_dimension INTEGER,
    
    text_content TEXT,
    
    generated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_workflow ON embeddings_metadata(workflow_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings_metadata(vector_id);

-- ============================================================================
-- TABLE: duplicate_candidates
-- ============================================================================

CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id_1 TEXT NOT NULL,
    workflow_id_2 TEXT NOT NULL,
    
    similarity_score REAL,
    similarity_type TEXT,
    
    is_duplicate INTEGER,
    reviewed INTEGER DEFAULT 0,
    
    detected_at TEXT DEFAULT (datetime('now')),
    
    CONSTRAINT unique_pair UNIQUE(workflow_id_1, workflow_id_2),
    FOREIGN KEY (workflow_id_1) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id_2) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_duplicates_score ON duplicate_candidates(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_duplicates_reviewed ON duplicate_candidates(reviewed);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Sample workflow
INSERT OR IGNORE INTO workflows (id, source, source_id, name, description, workflow_json, category, complexity, processing_status) VALUES
(
    'wf_sample_001',
    'community',
    'n8n_123',
    'Typeform to Google Sheets Sync',
    'Sync Typeform responses to Google Sheets with Slack notifications',
    '{"name": "Typeform to Sheets", "nodes": []}',
    'Data Synchronization',
    'intermediate',
    'completed'
);

-- Sample nodes
INSERT OR IGNORE INTO workflow_nodes (workflow_id, node_id, node_name, node_type, is_trigger) VALUES
    ('wf_sample_001', 'node_1', 'Typeform Trigger', 'webhook', 1),
    ('wf_sample_001', 'node_2', 'Google Sheets', 'googleSheets', 0),
    ('wf_sample_001', 'node_3', 'Slack', 'slack', 0);

-- Sample tags
INSERT OR IGNORE INTO tags (name, usage_count) VALUES
    ('slack', 100),
    ('google-sheets', 80),
    ('typeform', 50),
    ('sync', 120),
    ('notifications', 90);

INSERT OR IGNORE INTO workflow_tags (workflow_id, tag_id, confidence) VALUES
    ('wf_sample_001', 1, 1.0),
    ('wf_sample_001', 2, 1.0),
    ('wf_sample_001', 3, 1.0),
    ('wf_sample_001', 4, 0.9),
    ('wf_sample_001', 5, 0.8);

-- Sample services
INSERT OR IGNORE INTO integration_services (service_name, service_type, usage_count) VALUES
    ('slack', 'Communication', 100),
    ('google-sheets', 'Spreadsheet', 80),
    ('typeform', 'Form', 50);

INSERT OR IGNORE INTO workflow_services (workflow_id, service_id) VALUES
    ('wf_sample_001', 1),
    ('wf_sample_001', 2),
    ('wf_sample_001', 3);

-- ============================================================================
-- VIEWS (Note: D1 has limited VIEW support)
-- ============================================================================

-- Workflow Summary Query
/*
 CREATE VIEW IF NOT EXISTS workflow_summary AS
 SELECT 
     w.id,
     w.name,
     w.category,
     w.complexity,
     w.node_count,
     w.completeness_score,
     w.validity_score,
     w.popularity_score,
     COUNT(wn.id) as actual_node_count,
     COUNT(wc.id) as connection_count,
     w.created_at,
     w.processed_at
 FROM workflows w
 LEFT JOIN workflow_nodes wn ON w.id = wn.workflow_id
 LEFT JOIN workflow_connections wc ON w.id = wc.workflow_id
 GROUP BY w.id;
 */

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
