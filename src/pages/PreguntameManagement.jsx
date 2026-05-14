import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BookOpen, Upload, Trash2, FileText, Loader2, CheckCircle, X, Plus } from 'lucide-react';

// Extractor de texto desde PDF usando PDF.js CDN
async function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (file.type === 'application/pdf') {
      reader.onload = async (e) => {
        try {
          // Cargar PDF.js desde CDN si no está disponible
          if (!window.pdfjsLib) {
            await new Promise((res, rej) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                res();
              };
              script.onerror = rej;
              document.head.appendChild(script);
            });
          }

          const typedArray = new Uint8Array(e.target.result);
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
          }
          resolve(fullText.trim());
        } catch (err) {
          reject(new Error('Error al leer PDF: ' + err.message));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // TXT, MD, etc.
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file, 'UTF-8');
    }
  });
}

export default function PreguntameManagement() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', msg }
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    setLoading(true);
    const { data } = await supabase.from('knowledge_documents')
      .select('id, title, original_filename, created_at')
      .order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  }

  async function handleUpload() {
    if (!selectedFile || !title.trim()) {
      setUploadStatus({ type: 'error', msg: 'Completa el título y selecciona un archivo.' });
      return;
    }
    setUploading(true);
    setUploadStatus(null);

    try {
      setUploadStatus({ type: 'info', msg: `Extrayendo texto de "${selectedFile.name}"...` });
      const extractedText = await extractTextFromFile(selectedFile);

      if (!extractedText || extractedText.length < 20) {
        throw new Error('No se pudo extraer texto del documento. Asegúrate de que no sea una imagen escaneada.');
      }

      const { error } = await supabase.from('knowledge_documents').insert({
        title: title.trim(),
        original_filename: selectedFile.name,
        content: extractedText,
        uploaded_by: profile.id,
      });

      if (error) throw new Error(error.message);

      setUploadStatus({ type: 'success', msg: `✅ "${title}" cargado exitosamente. ${extractedText.length.toLocaleString()} caracteres indexados.` });
      setTitle('');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchDocs();
    } catch (err) {
      setUploadStatus({ type: 'error', msg: '❌ Error: ' + err.message });
    }
    setUploading(false);
  }

  async function handleDelete(id, docTitle) {
    if (!confirm(`¿Eliminar "${docTitle}" de la base de conocimiento?`)) return;
    await supabase.from('knowledge_documents').delete().eq('id', id);
    fetchDocs();
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
          <BookOpen size={32} style={{ verticalAlign: 'middle', marginRight: '12px', color: 'var(--accent-primary)' }} />
          Pregúntame
        </h1>
        <p className="text-muted" style={{ marginTop: '8px' }}>
          Carga documentos (PDF, TXT) y los colaboradores podrán consultarlos mediante su Asistente IA personalizado.
        </p>
      </div>

      {/* PANEL DE CARGA */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} color="var(--accent-primary)" /> Agregar Documento
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Nombre del Documento</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ej: Manual de Procedimientos de Caja"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Archivo (PDF o TXT)</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed rgba(0,240,255,0.3)',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedFile ? 'rgba(0,240,255,0.05)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={32} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--accent-primary)' }} />
              {selectedFile ? (
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{selectedFile.name}</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <>
                  <p style={{ fontWeight: 600 }}>Haz clic para seleccionar un archivo</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Soporta: PDF, TXT, MD</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md"
              style={{ display: 'none' }}
              onChange={e => setSelectedFile(e.target.files[0] || null)}
            />
          </div>

          {uploadStatus && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              background: uploadStatus.type === 'success' ? 'rgba(0,255,100,0.1)' :
                          uploadStatus.type === 'error'   ? 'rgba(255,0,85,0.1)' :
                                                           'rgba(0,240,255,0.1)',
              color: uploadStatus.type === 'success' ? '#00ff64' :
                     uploadStatus.type === 'error'   ? 'var(--accent-danger)' :
                                                      'var(--accent-primary)',
              border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(0,255,100,0.2)' : uploadStatus.type === 'error' ? 'rgba(255,0,85,0.2)' : 'rgba(0,240,255,0.2)'}`
            }}>
              {uploadStatus.msg}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !title.trim()}
            className="btn-primary"
            style={{ justifyContent: 'center', gap: '10px', height: '52px', fontSize: '1rem' }}
          >
            {uploading ? <><Loader2 size={20} className="animate-spin" /> Procesando...</> : <><Upload size={20} /> Cargar y Procesar</>}
          </button>
        </div>
      </div>

      {/* LISTA DE DOCUMENTOS */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} color="var(--accent-primary)" /> Base de Conocimiento ({docs.length} documentos)
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-primary)' }} /></div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
            <p>No hay documentos cargados aún. Agrega el primero para activar el Asistente.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {docs.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px'
              }}>
                <CheckCircle size={20} color="#00ff64" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{doc.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {doc.original_filename} · {new Date(doc.created_at).toLocaleDateString('es-CL')}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid rgba(255,0,85,0.2)', color: 'var(--accent-danger)', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
