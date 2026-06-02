// 用户类型
export type User = {
  id: string;
  role: 'kid' | 'teacher';
  name: string;
  created_at: string;
};

// 项目类型
export type Project = {
  id: string;
  user_id: string;
  title: string;
  story: string;
  style: string;
  status: 'uploading' | 'understanding' | 'story_generated' | 'generating_images' | 'images_generated' | 'generating_video' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

// 图片类型
export type Image = {
  id: string;
  project_id: string;
  url: string;
  prompt: string;
  regeneration_count: number;
  created_at: string;
};

// 视频类型
export type Video = {
  id: string;
  project_id: string;
  url: string;
  prompt: string;
  generation_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

// 风格类型
export type Style = {
  id: string;
  name: string;
  prompt: string;
  display_name: string;
};

// 豆包 AI 响应类型
export type DoubaoResponse = {
  story: string;
  prompts: string[];
};

// 即梦生成请求类型
export type JimengGenerateRequest = {
  images: string[];
  prompt: string;
  model: string;
  resolution: string;
  duration: number;
};

// API 响应类型
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
