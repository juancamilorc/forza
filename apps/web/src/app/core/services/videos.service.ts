import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Video {
  id:          string;
  title:       string;
  url:         string;
  description: string | null;
  uploaded_by: string | null;
  created_at:  string;
  users?:      { id: string; full_name: string } | null;
}

@Injectable({ providedIn: 'root' })
export class VideosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/videos`;

  getAll() {
    return this.http.get<Video[]>(this.base);
  }

  create(data: { title: string; url: string; description?: string; uploaded_by?: string }) {
    return this.http.post<Video>(this.base, data);
  }

  update(id: string, data: { title?: string; description?: string }) {
    return this.http.patch<Video>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
