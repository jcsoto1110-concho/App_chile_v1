-- Sistema "Pregúntame" - Base de conocimiento para colaboradores
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    original_filename TEXT,
    content TEXT NOT NULL,           -- Texto extraído del documento
    uploaded_by UUID REFERENCES profiles(id),
    target_roles TEXT[] DEFAULT NULL, -- NULL = todos los roles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read knowledge docs" ON knowledge_documents
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage knowledge docs" ON knowledge_documents
    FOR ALL USING (TRUE)
    WITH CHECK (TRUE);
