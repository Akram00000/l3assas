import { jsonApi } from './client';
import type {
  CameraConfigRequest,
  CameraDetectionsResponse,
  CameraStartRequest,
  MobileNotifyRegisterRequest,
  MobileNotifyRegisterResponse,
  MobileNotifyStatusResponse,
  NtfyConfigRequest,
  NtfyConfigResponse,
  PredictRequest,
  PredictResponse,
  SensorStateResponse,
  SimpleOkResponse,
  StatusResponse,
} from './types';

export const api = {
  status: () => jsonApi<StatusResponse>('/status'),
  sensorState: () => jsonApi<SensorStateResponse>('/sensors/state'),
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
  mobileNotifyRegister: (payload: MobileNotifyRegisterRequest) =>
    jsonApi<MobileNotifyRegisterResponse>('/mobile/notify/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  mobileNotifyUnregister: (payload: { token: string }) =>
    jsonApi<SimpleOkResponse>('/mobile/notify/unregister', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  mobileNotifyStatus: () => jsonApi<MobileNotifyStatusResponse>('/mobile/notify/status'),
  mobileNotifyTest: () => jsonApi<SimpleOkResponse>('/mobile/notify/test', { method: 'POST', body: '{}' }),
};
