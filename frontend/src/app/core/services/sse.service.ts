import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SseService {
  constructor(private auth: AuthService) {}

  pullModel(name: string): Observable<any> {
    return new Observable((observer) => {
      const token = this.auth.token();
      // SSE doesn't support POST with body, so we use fetch + ReadableStream
      const controller = new AbortController();

      fetch('/api/models/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          const read = (): void => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  observer.complete();
                  return;
                }
                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      observer.next(data);
                      if (data.status === 'success' || data.status === 'error') {
                        observer.complete();
                        return;
                      }
                    } catch {
                      // skip malformed JSON
                    }
                  }
                }
                read();
              })
              .catch((err) => observer.error(err));
          };

          read();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            observer.error(err);
          }
        });

      return () => controller.abort();
    });
  }
}
