import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VideosService, Video } from '../../../core/services/videos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-videos-list',
  imports: [DatePipe],
  templateUrl: './videos-list.html',
  styleUrl: './videos-list.scss',
})
export class VideosList implements OnInit {
  private svc   = inject(VideosService);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  videos     = signal<Video[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  deletingId = signal<string | null>(null);

  // Add modal
  showAddModal = signal(false);
  formUrl      = signal('');
  addForm      = { title: '', url: '', description: '' };

  // Edit modal
  showEditModal  = signal(false);
  editingVideo   = signal<Video | null>(null);
  editForm       = { title: '', description: '' };
  submittingEdit = signal(false);

  // Confirm delete modal
  showConfirm    = signal(false);
  confirmMsg     = signal('');
  pendingDeleteId = signal<string | null>(null);

  role = this.auth.getRole() ?? '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  (d) => { this.videos.set(d); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  // ── Add ──────────────────────────────────────────────────────────────
  openAddModal() {
    this.addForm = { title: '', url: '', description: '' };
    this.formUrl.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() { this.showAddModal.set(false); }

  setUrl(value: string) {
    this.addForm.url = value;
    this.formUrl.set(value);
  }

  submitAdd() {
    if (!this.addForm.title.trim() || !this.addForm.url.trim()) return;
    this.saving.set(true);
    const user = this.auth.getCurrentUser();
    const payload: { title: string; url: string; description?: string; uploaded_by?: string } = {
      title: this.addForm.title.trim(),
      url:   this.addForm.url.trim(),
    };
    if (this.addForm.description.trim()) payload.description = this.addForm.description.trim();
    if (user?.id)                        payload.uploaded_by = user.id;

    this.svc.create(payload).subscribe({
      next: (video) => {
        this.videos.update(list => [video, ...list]);
        this.saving.set(false);
        this.closeAddModal();
        this.toast.show('Video agregado correctamente', 'success');
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('Error al guardar el video', 'error');
      },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────
  openEdit(video: Video) {
    this.editingVideo.set(video);
    this.editForm = { title: video.title, description: video.description ?? '' };
    this.showEditModal.set(true);
  }

  closeEditModal() { this.showEditModal.set(false); }

  submitEdit() {
    const video = this.editingVideo();
    if (!video || !this.editForm.title.trim()) return;
    this.submittingEdit.set(true);
    const payload: { title: string; description?: string } = { title: this.editForm.title.trim() };
    if (this.editForm.description.trim()) payload.description = this.editForm.description.trim();

    this.svc.update(video.id, payload).subscribe({
      next: (updated) => {
        this.videos.update(list => list.map(v => v.id === updated.id ? { ...v, ...updated } : v));
        this.submittingEdit.set(false);
        this.closeEditModal();
        this.toast.show('Video actualizado', 'success');
      },
      error: () => {
        this.submittingEdit.set(false);
        this.toast.show('Error al actualizar el video', 'error');
      },
    });
  }

  // ── Delete (with custom confirm) ──────────────────────────────────────
  deleteVideo(id: string, title: string) {
    this.pendingDeleteId.set(id);
    this.confirmMsg.set(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`);
    this.showConfirm.set(true);
  }

  cancelConfirm() {
    this.showConfirm.set(false);
    this.pendingDeleteId.set(null);
  }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.showConfirm.set(false);
    this.deletingId.set(id);
    this.svc.delete(id).subscribe({
      next: () => {
        this.videos.update(list => list.filter(v => v.id !== id));
        this.deletingId.set(null);
        this.pendingDeleteId.set(null);
        this.toast.show('Video eliminado', 'success');
      },
      error: () => {
        this.deletingId.set(null);
        this.pendingDeleteId.set(null);
        this.toast.show('Error al eliminar el video', 'error');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  getYoutubeThumbnail(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  }

  getWatchUrl(url: string): string {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : url;
  }

  onThumbError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  canManage() { return ['super_admin', 'admin'].includes(this.role); }
  canDelete()  { return this.role === 'super_admin'; }
}
