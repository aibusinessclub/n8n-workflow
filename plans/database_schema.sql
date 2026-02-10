-- ============================================================================
-- N8N Workflow Data Factory - Database Schema
-- ============================================================================

-- Workflows Table (Main)
CREATE TABLE workflows (
    id VARCHAR(64) PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    
    -- Core Data
    name VARCHAR(500) NOT NULL,
    description TEXT,
    workflow_json JSONB NOT NULL,
    
    -- Metadata
    node_count INTEGER,
    complexity VARCHAR(20),
    category VARCHAR(100),
    tags TEXT[],
    
    -- Version Control
    version INTEGER DEFAULT 1,
    original_created_at TIMESTAMP,
    last_modified_at TIMESTAMP,
    
    -- Quality Metrics
    completeness_score DECIMAL(3,2),
    validity_score DECIMAL(3,2),
    documentation_score DECIMAL(3,2),
    popularity_score DECIMAL(3,2),
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP,
    embedding_generated BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT unique_source_workflow UNIQUE(source, source_id)
);

CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_complexity ON workflows(complexity);
CREATE INDEX idx_workflows_status ON workflows(processing_status);
CREATE INDEX idx_workflows_created ON workflows(created_at);
CREATE INDEX idx_workflows_tags ON workflows USING GIN(tags);

-- Nodes Table (Extracted from workflows)
CREATE TABLE workflow_nodes (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    
    node_id VARCHAR(100) NOT NULL,
    node_name VARCHAR(200),
    node_type VARCHAR(100) NOT NULL,
    node_type_version DECIMAL(3,1),
    
    position_x INTEGER,
    position_y INTEGER,
    
    is_disabled BOOLEAN DEFAULT FALSE,
    is_trigger BOOLEAN DEFAULT FALSE,
    
    parameters JSONB,
    credentials JSONB,  -- Should be empty after cleaning
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_workflow_node UNIQUE(workflow_id, node_id)
);

CREATE INDEX idx_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_nodes_type ON workflow_nodes(node_type);
CREATE INDEX idx_nodes_trigger ON workflow_nodes(is_trigger);

-- Connections Table
CREATE TABLE workflow_connections (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    
    source_node_id VARCHAR(100) NOT NULL,
    source_output_index INTEGER DEFAULT 0,
    
    target_node_id VARCHAR(100) NOT NULL,
    target_input_index INTEGER DEFAULT 0,
    
    connection_type VARCHAR(50) DEFAULT 'main',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_connections_workflow ON workflow_connections(workflow_id);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INTEGER REFERENCES categories(id),
    
    workflow_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags Table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Tags (Many-to-Many)
CREATE TABLE workflow_tags (
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    
    confidence DECIMAL(3,2) DEFAULT 1.0,
    is_auto_generated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (workflow_id, tag_id)
);

-- Node Types Registry
CREATE TABLE node_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200),
    category VARCHAR(100),
    description TEXT,
    
    is_trigger BOOLEAN DEFAULT FALSE,
    is_deprecated BOOLEAN DEFAULT FALSE,
    
    usage_count INTEGER DEFAULT 0,
    
    documentation_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integration Services (APIs, Platforms used)
CREATE TABLE integration_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL,
    service_type VARCHAR(50),  -- API, Database, Cloud, etc.
    
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Services (Many-to-Many)
CREATE TABLE workflow_services (
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES integration_services(id) ON DELETE CASCADE,
    
    PRIMARY KEY (workflow_id, service_id)
);

-- Processing Log
CREATE TABLE processing_log (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    
    stage VARCHAR(50) NOT NULL,  -- collect, clean, validate, classify, embed
    status VARCHAR(20) NOT NULL,  -- success, failed, skipped
    
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processing_workflow ON processing_log(workflow_id);
CREATE INDEX idx_processing_stage ON processing_log(stage);
CREATE INDEX idx_processing_status ON processing_log(status);

-- Quality Metrics History
CREATE TABLE quality_metrics (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(5,2),
    
    details JSONB,
    
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_workflow ON quality_metrics(workflow_id);
CREATE INDEX idx_quality_metric ON quality_metrics(metric_name);

-- Data Sources
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(50) UNIQUE NOT NULL,
    source_type VARCHAR(50),  -- community, github, user_submission
    
    base_url TEXT,
    last_fetched_at TIMESTAMP,
    
    total_workflows_collected INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    
    configuration JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection Runs
CREATE TABLE collection_runs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(id),
    
    run_type VARCHAR(20),  -- full, incremental
    status VARCHAR(20),  -- running, completed, failed
    
    workflows_found INTEGER DEFAULT 0,
    workflows_new INTEGER DEFAULT 0,
    workflows_updated INTEGER DEFAULT 0,
    workflows_failed INTEGER DEFAULT 0,
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    error_summary JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings Metadata (vector IDs linked to workflows)
CREATE TABLE embeddings_metadata (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    
    vector_id VARCHAR(100) UNIQUE NOT NULL,  -- ID in vector database
    embedding_model VARCHAR(100),
    embedding_dimension INTEGER,
    
    text_content TEXT,  -- What was embedded
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_embeddings_workflow ON embeddings_metadata(workflow_id);
CREATE INDEX idx_embeddings_vector ON embeddings_metadata(vector_id);

-- Duplicate Detection
CREATE TABLE duplicate_candidates (
    id SERIAL PRIMARY KEY,
    workflow_id_1 VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    workflow_id_2 VARCHAR(64) REFERENCES workflows(id) ON DELETE CASCADE,
    
    similarity_score DECIMAL(3,2),
    similarity_type VARCHAR(50),  -- structural, semantic, exact
    
    is_duplicate BOOLEAN,
    reviewed BOOLEAN DEFAULT FALSE,
    
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_pair UNIQUE(workflow_id_1, workflow_id_2)
);

CREATE INDEX idx_duplicates_score ON duplicate_candidates(similarity_score DESC);
CREATE INDEX idx_duplicates_reviewed ON duplicate_candidates(reviewed);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Workflow Summary View
CREATE VIEW workflow_summary AS
SELECT 
    w.id,
    w.name,
    w.category,
    w.complexity,
    w.node_count,
    w.tags,
    w.completeness_score,
    w.validity_score,
    w.popularity_score,
    COUNT(DISTINCT wn.id) as actual_node_count,
    COUNT(DISTINCT wc.id) as connection_count,
    ARRAY_AGG(DISTINCT wn.node_type) as node_types_used,
    w.created_at,
    w.processed_at
FROM workflows w
LEFT JOIN workflow_nodes wn ON w.id = wn.workflow_id
LEFT JOIN workflow_connections wc ON w.id = wc.workflow_id
GROUP BY w.id;

-- Category Statistics View
CREATE VIEW category_stats AS
SELECT 
    c.name as category,
    COUNT(w.id) as workflow_count,
    AVG(w.completeness_score) as avg_completeness,
    AVG(w.validity_score) as avg_validity,
    AVG(w.node_count) as avg_nodes
FROM categories c
LEFT JOIN workflows w ON w.category = c.name
GROUP BY c.name;

-- Most Used Nodes View
CREATE VIEW popular_nodes AS
SELECT 
    nt.type_name,
    nt.display_name,
    nt.category,
    COUNT(wn.id) as usage_count,
    COUNT(DISTINCT wn.workflow_id) as workflow_count
FROM node_types nt
LEFT JOIN workflow_nodes wn ON nt.type_name = wn.node_type
GROUP BY nt.id, nt.type_name, nt.display_name, nt.category
ORDER BY usage_count DESC;

-- ============================================================================
-- Triggers for Auto-Updates
-- ============================================================================

-- Update workflow updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
