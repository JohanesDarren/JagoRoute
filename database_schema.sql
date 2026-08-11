-- JagoRoute PostgreSQL Database Schema Dump

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_users_email ON users (email);

-- 2. api_keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(24) NOT NULL,
    name VARCHAR(100) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_api_keys_user_id ON api_keys (user_id);
CREATE INDEX ix_api_keys_key_hash ON api_keys (key_hash);

-- 3. hardware_endpoints table
CREATE TABLE hardware_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    description TEXT,
    auth_headers JSONB,
    query_params JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_hardware_endpoints_user_id ON hardware_endpoints (user_id);

-- 4. routes table
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_path VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_routes_user_id ON routes (user_id);

-- 5. route_mappings table
CREATE TABLE route_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    hardware_id UUID NOT NULL REFERENCES hardware_endpoints(id),
    target_path TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_hardware_target UNIQUE (route_id, hardware_id, target_path)
);
CREATE INDEX ix_route_mappings_route_id ON route_mappings (route_id);
CREATE INDEX ix_route_mappings_hardware_id ON route_mappings (hardware_id);

-- 6. request_logs table
CREATE TABLE request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    request_path VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_request_logs_route_id ON request_logs (route_id);
CREATE INDEX ix_request_logs_api_key_id ON request_logs (api_key_id);
CREATE INDEX ix_request_logs_user_id ON request_logs (user_id);
CREATE INDEX ix_request_logs_created_at ON request_logs (created_at);
