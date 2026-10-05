import api from "@/services/api";

export const mapService = {
  getWellsGeoJSON: async (params?: {
    basin_id?: number;
    field_id?: number;
    status?: string[];
    purpose?: string[];
  }) => {
    const res = await api.get("/api/map/wells/geojson", { 
      params,
      paramsSerializer: { indexes: null }
    });
    return res.data;
  },

  getFieldsGeoJSON: async (params?: { basin_id?: number }) => {
    const res = await api.get("/api/map/fields/geojson", { params });
    return res.data;
  },
};
