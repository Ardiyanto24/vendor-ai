import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://localhost:3001/api/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'test-staff-uuid',
        nama: 'Test Staff',
        email: 'test-staff@vendor-ai.dev',
        role: 'staff',
        accessToken: 'mock-access-token',
      },
    });
  }),
  http.post('http://localhost:3001/api/v1/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),
  http.post('http://localhost:3001/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'new-mock-access-token',
      },
    });
  }),
  http.get('http://localhost:3001/api/v1/users/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'test-staff-uuid',
        nama: 'Test Staff',
        email: 'test-staff@vendor-ai.dev',
        role: 'staff',
      },
    });
  }),
];
