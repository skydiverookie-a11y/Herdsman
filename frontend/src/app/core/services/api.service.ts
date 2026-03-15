import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Ollama Status
  getOllamaStatus(): Observable<{ connected: boolean; host: string }> {
    return this.http.get<{ connected: boolean; host: string }>('/api/ollama/status');
  }

  // Local Models
  getLocalModels(): Observable<{ models: any[] }> {
    return this.http.get<{ models: any[] }>('/api/models');
  }

  getRunningModels(): Observable<{ models: any[] }> {
    return this.http.get<{ models: any[] }>('/api/models/running');
  }

  getModelDetails(name: string): Observable<any> {
    return this.http.get(`/api/models/${name}/details`);
  }

  deleteModel(name: string): Observable<any> {
    return this.http.delete(`/api/models/${name}`);
  }

  unloadModel(name: string): Observable<any> {
    return this.http.post('/api/models/unload', { name });
  }

  generatePrompt(model: string, prompt: string): Observable<{ response: string }> {
    return this.http.post<{ response: string }>('/api/models/generate', { model, prompt });
  }

  cancelPull(name: string): Observable<any> {
    return this.http.post('/api/models/pull/cancel', { name });
  }

  // Pull Queue
  getPullQueue(): Observable<{ jobs: any[] }> {
    return this.http.get<{ jobs: any[] }>('/api/models/queue');
  }

  // Registry
  searchRegistry(
    query: string = '',
    category: string = '',
    sort: string = '',
    page: number = 1,
  ): Observable<any> {
    let params = new HttpParams();
    if (query) params = params.set('q', query);
    if (category) params = params.set('c', category);
    if (sort) params = params.set('o', sort);
    if (page > 1) params = params.set('p', page.toString());
    return this.http.get('/api/registry/search', { params });
  }

  getRegistryModelDetails(name: string): Observable<any> {
    return this.http.get(`/api/registry/models/${name}/details`);
  }

  getRegistryModelTags(name: string): Observable<any> {
    return this.http.get(`/api/registry/models/${name}/tags`);
  }

  // Settings
  getSettings(): Observable<any> {
    return this.http.get('/api/settings');
  }

  updateSettings(data: any): Observable<any> {
    return this.http.put('/api/settings', data);
  }

  clearCache(): Observable<any> {
    return this.http.delete('/api/settings/cache');
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put('/api/settings/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // Database Viewer
  getDatabase(): Observable<any> {
    return this.http.get('/api/settings/database');
  }

  deleteDatabaseRow(table: string, key: string): Observable<any> {
    return this.http.delete(`/api/settings/database/${table}/${encodeURIComponent(key)}`);
  }
}
