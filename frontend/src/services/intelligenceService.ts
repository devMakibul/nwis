import api from "@/services/api";

export const documentsService = {
  upload: async (file: File, documentType: string, wellId?: number, aiProvider?: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("document_type", documentType);
    if (wellId) form.append("well_id", String(wellId));
    if (aiProvider) form.append("ai_provider", aiProvider);
    const res = await api.post("/api/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  delete: async (id: number) => {
    const res = await api.delete(`/api/documents/${id}`);
    return res.data;
  },

  list: async (params?: { well_id?: number; document_type?: string; status?: string }) => {
    const res = await api.get("/api/documents", { params });
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/api/documents/stats");
    return res.data;
  },

  getTypes: async () => {
    const res = await api.get("/api/documents/types");
    return res.data;
  },

  getDetail: async (id: number) => {
    const res = await api.get(`/api/documents/${id}`);
    return res.data;
  },

  getPages: async (id: number) => {
    const res = await api.get(`/api/documents/${id}/pages`);
    return res.data;
  },

  getExtractedEvents: async (id: number) => {
    const res = await api.get(`/api/documents/${id}/extracted-events`);
    return res.data;
  },

  triggerEventExtraction: async (id: number, aiProvider?: string) => {
    const params = aiProvider ? { ai_provider: aiProvider } : undefined;
    const res = await api.post(`/api/documents/${id}/extract-events`, null, { params });
    return res.data;
  },

  updateExtractedEvents: async (id: number, events: object[]) => {
    const res = await api.put(`/api/documents/${id}/extracted-events`, events);
    return res.data;
  },

  saveDraft: async (id: number, payload: { events: object[]; page_contents?: Record<string, string> }) => {
    const res = await api.post(`/api/documents/${id}/draft`, payload);
    return res.data;
  },

  downloadFile: async (id: number) => {
    const res = await api.get(`/api/documents/${id}/file`, { responseType: 'blob' });
    return res;
  },

  commit: async (id: number, payload: { events: object[]; page_contents?: Record<string, string> }) => {
    const res = await api.post(`/api/documents/${id}/commit`, payload);
    return res.data;
  },

  getBasinsFieldsWells: async () => {
    const res = await api.get("/api/documents/basins-fields-wells");
    return res.data;
  },

  getHistoricalEvents: async (params?: {
    basin_id?: number;
    field_id?: number;
    well_id?: number;
    event_type?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }) => {
    const res = await api.get("/api/documents/historical-events", { params });
    return res.data;
  },
};

export const assistantService = {
  listSessions: async () => {
    const res = await api.get("/api/assistant/sessions");
    return res.data;
  },

  createSession: async (data: { title?: string; context_type?: string; context_id?: number }) => {
    const res = await api.post("/api/assistant/sessions", data);
    return res.data;
  },

  renameSession: async (id: number, title: string) => {
    const res = await api.patch(`/api/assistant/sessions/${id}`, { title });
    return res.data;
  },

  deleteSession: async (id: number) => {
    const res = await api.delete(`/api/assistant/sessions/${id}`);
    return res.data;
  },

  getMessages: async (sessionId: number) => {
    const res = await api.get(`/api/assistant/sessions/${sessionId}/messages`);
    return res.data;
  },

  sendMessage: async (sessionId: number, data: { message: string; context_type?: string; context_id?: number; ai_provider?: string; extra_context?: string }) => {
    const res = await api.post(`/api/assistant/sessions/${sessionId}/chat`, data);
    return res.data;
  },

  getContextWells: async (search?: string) => {
    const res = await api.get("/api/assistant/context/wells", { params: { search } });
    return res.data;
  },
};
