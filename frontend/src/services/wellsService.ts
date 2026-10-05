import api from "@/services/api";

export const dashboardService = {
  getOverview: async () => {
    const res = await api.get("/api/dashboard/overview");
    return res.data;
  },
};

export const wellsService = {
  list: async (params?: Record<string, unknown>) => {
    const res = await api.get("/api/wells", { params });
    return res.data;
  },
  listDrilling: async () => {
    const res = await api.get("/api/wells/drilling");
    return res.data;
  },
  stats: async () => {
    const res = await api.get("/api/wells/stats");
    return res.data;
  },
  getDetail: async (id: number) => {
    const res = await api.get(`/api/wells/${id}`);
    return res.data;
  },
  getEvents: async (id: number, params?: Record<string, unknown>) => {
    const res = await api.get(`/api/wells/${id}/events`, { params });
    return res.data;
  },
  getFormations: async (id: number) => {
    const res = await api.get(`/api/wells/${id}/formations`);
    return res.data;
  },
  getOffsetWells: async (id: number, radiusKm?: number) => {
    const res = await api.get(`/api/wells/${id}/offset-wells`, { params: { radius_km: radiusKm } });
    return res.data;
  },
  getTrajectory: async (id: number) => {
    const res = await api.get(`/api/wells/${id}/trajectory`);
    return res.data;
  },
  simUpdate: async (id: number, params: { current_depth?: number; well_status?: string }) => {
    const res = await api.patch(`/api/wells/${id}/sim-update`, null, { params });
    return res.data;
  },
};

export const liveService = {
  getSavedRisks: async (wellId: number) => {
    const res = await api.get(`/api/live/risks/${wellId}/saved`);
    return res.data;
  },
  persistRisks: async (wellId: number, risks: object[]) => {
    const res = await api.post(`/api/live/risks/${wellId}/persist`, risks);
    return res.data;
  },
  getRisks: async (wellId: number) => {
    const res = await api.get(`/api/live/risks/${wellId}`);
    return res.data;
  },
};

export const basinsService = {
  list: async () => {
    const res = await api.get("/api/basins");
    return res.data;
  },
  getFields: async (basinId: number) => {
    const res = await api.get(`/api/basins/${basinId}/fields`);
    return res.data;
  },
};

export const fieldsService = {
  list: async (basinId?: number) => {
    const res = await api.get("/api/fields", { params: { basin_id: basinId } });
    return res.data;
  },
};
