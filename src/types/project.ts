// Project types V3 - Collection Platform (aligned with DB schema)

export type ProjectStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Project {
  id: number;
  child_name: string;
  project_name: string;
  style_id?: string;
  original_image_url?: string;
  storyboard_image_url?: string;
  video_url?: string;
  status: ProjectStatus;
  submitted_at?: string;
  processing_at?: string;
  completed_at?: string;
  downloaded_at?: string;
  created_at: string;
  updated_at: string;
  style_name?: string;
}

export interface CreateProjectRequest {
  child_name: string;
  project_name: string;
  style_id?: string;
  original_image_url: string;
}

export interface UpdateProjectRequest {
  status?: ProjectStatus;
  storyboard_image_url?: string;
  video_url?: string;
  processing_at_formatted?: string;
}

export interface ProjectWithDetails extends Project {
  submitted_at_formatted?: string;
  processing_at_formatted?: string;
  completed_at_formatted?: string;
}

export interface Style {
  id: string;
  name: string;
  prompt: string;
}

export interface ExportLog {
  id: string;
  project_id: number;
  teacher_id: string;
  format: string;
  file_url: string;
  created_at: string;
}
