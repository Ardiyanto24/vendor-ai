import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://localhost:3001/api/v1/evaluasi/:id/vendor', () => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),
];
