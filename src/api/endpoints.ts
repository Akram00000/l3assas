import { jsonApi } from './client';
import type {
  CameraConfigRequest,
  CameraDetectionsResponse,
  CameraStartRequest,
  NtfyConfigRequest,
  NtfyConfigResponse,
  PredictRequest,
  PredictResponse,
  SimpleOkResponse,
  StatusResponse,
} from './types';

export const api = {
  status: () => jsonApi<StatusResponse>('/status'),
  predict: (payload: PredictRequest) =>
    jsonApi<PredictResponse>('/predict', { method: 'POST', body: JSON.stringify(payload) }),
  cameraStart: (payload: CameraStartRequest) =>
    jsonApi<SimpleOkResponse>('/camera/start', { method: 'POST', body: JSON.stringify(payload) }),
  cameraStop: () => jsonApi<SimpleOkResponse>('/camera/stop', { method: 'POST', body: '{}' }),
  cameraConfig: (payload: CameraConfigRequest) =>
    jsonApi<SimpleOkResponse>('/camera/config', { method: 'POST', body: JSON.stringify(payload) }),
  cameraDetections: () => jsonApi<CameraDetectionsResponse>('/camera/detections'),
  ntfyConfigGet: () => jsonApi<NtfyConfigResponse>('/ntfy/config'),
  ntfyConfig: (payload: NtfyConfigRequest) =>
    jsonApi<SimpleOkResponse>('/ntfy/config', { method: 'POST', body: JSON.stringify(payload) }),
  ntfyTest: () => jsonApi<SimpleOkResponse>('/ntfy/test', { method: 'POST', body: '{}' }),
};
