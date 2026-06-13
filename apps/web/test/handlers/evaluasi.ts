import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:3001/api/v1/evaluasi', () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),
];
