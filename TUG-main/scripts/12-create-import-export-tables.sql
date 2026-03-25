-- Create import logs table
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'processing')),
    records_processed INTEGER DEFAULT 0,
    records_imported INTEGER DEFAULT 0,
    errors TEXT[],
    warnings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create export logs table
CREATE TABLE IF NOT EXISTS export_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'json', 'excel')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'processing')),
    records_exported INTEGER DEFAULT 0,
    file_size_bytes BIGINT,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_type ON import_logs(type);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);

CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON export_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_type ON export_logs(type);
CREATE INDEX IF NOT EXISTS idx_export_logs_status ON export_logs(status);

-- Enable RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own import logs" ON import_logs
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own import logs" ON import_logs
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own export logs" ON export_logs
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own export logs" ON export_logs
    FOR INSERT WITH CHECK (auth.uid() = created_by);
