import { api } from './client';
import type { MeasurementProfilesResponse } from './types';

const BASE = '/api/v1/measurement-profiles';

export const measurementProfilesApi = {
  /** List measurement profiles for current user. Requires auth. */
  getList: () => api.get<MeasurementProfilesResponse>(BASE),
};
