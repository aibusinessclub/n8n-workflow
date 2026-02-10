-- ============================================================================
-- N8N Workflow Data Factory - D1 Database Schema (SQLite)
-- ============================================================================

-- Workflows Table (Main)
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'manual',
    source_id TEXT,
    
    -- Core Data
    name TEXT NOT NULL,
    description TEXT,
    workflow_json TEXT NOT NULL,
    
    -- Metadata
    node_count INTEGER DEFAULT 0,
    complexity TEXT CHECK(complexity IN ('beginner', 'intermediate', 'advanced')),
    category TEXT,
    tags TEXT, -- JSON array stored as text
    
    -- Quality Metrics
    completeness_score REAL DEFAULT 0.0,
    validity_score REAL DEFAULT 0.0,
    popularity_score REAL DEFAULT 0.0,
    
    -- Processing Status
    processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'collecting', 'cleaning', 'classifying', 'embedding', 'ready', 'failed')),
    embedding_generated INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT,
    
    UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_complexity ON workflows(complexity);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(processing_status);

-- Workflow Nodes Table
CREATE TABLE IF NOT EXISTS workflow_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    
    node_id TEXT NOT NULL,
    node_name TEXT,
    node_type TEXT NOT NULL,
    node_type_version REAL,
    
    position_x INTEGER,
    position_y INTEGER,
    
    is_disabled INTEGER DEFAULT 0,
    is_trigger INTEGER DEFAULT 0,
    
    parameters TEXT, -- JSON
    
    created_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(workflow_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON workflow_nodes(node_type);

-- Workflow Connections Table
CREATE TABLE IF NOT EXISTS workflow_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    
    source_node_id TEXT NOT NULL,
    source_output_index INTEGER DEFAULT 0,
    
    target_node_id TEXT NOT NULL,
    target_input_index INTEGER DEFAULT 0,
    
    connection_type TEXT DEFAULT 'main',
    
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connections_workflow ON workflow_connections(workflow_id);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INTEGER REFERENCES categories(id),
    workflow_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Workflow Tags Junction Table
CREATE TABLE IF NOT EXISTS workflow_tags (
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confidence REAL DEFAULT 1.0,
    is_auto_generated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (workflow_id, tag_id)
);

-- Node Types Registry
CREATE TABLE IF NOT EXISTS node_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    category TEXT,
    description TEXT,
    is_trigger INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Integration Services
CREATE TABLE IF NOT EXISTS integration_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT UNIQUE NOT NULL,
    service_type TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Workflow-Service Junction Table
CREATE TABLE IF NOT EXISTS workflow_services (
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES integration_services(id) ON DELETE CASCADE,
    PRIMARY KEY (workflow_id, service_id)
);

-- Embeddings Metadata (links vector IDs to workflows)
CREATE TABLE IF NOT EXISTS embeddings_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    vector_id TEXT UNIQUE NOT NULL,
    embedding_model TEXT,
    embedding_dimension INTEGER,
    text_content TEXT,
    generated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_embeddings_workflow ON embeddings_metadata(workflow_id);

-- Processing Log
CREATE TABLE IF NOT EXISTS processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT REFERENCES workflows(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'skipped')),
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_processing_workflow ON processing_log(workflow_id);
CREATE INDEX IF NOT EXISTS idx_processing_stage ON processing_log(stage);

-- Seed default categories
INSERT OR IGNORE INTO categories (name, description) VALUES 
    ('Data Synchronization', 'Workflows that sync data between services'),
    ('Marketing Automation', 'Marketing campaign and lead workflows'),
    ('Customer Support', 'Customer service and ticket workflows'),
    ('Content Management', 'Content publishing and distribution workflows'),
    ('E-commerce Operations', 'Order processing and inventory workflows'),
    ('DevOps & Monitoring', 'CI/CD, monitoring, and incident workflows'),
    ('Reporting & Analytics', 'Data aggregation and reporting workflows'),
    ('Lead Generation & CRM', 'Lead capture and CRM integration workflows'),
    ('Notification Systems', 'Alert and notification routing workflows'),
    ('Document Processing', 'Document generation and processing workflows');
