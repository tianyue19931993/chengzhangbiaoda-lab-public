/**
 * 存储/下载工具函数
 */

/**
 * 从 URL 下载文件，返回 Buffer 和 contentType
 */
export async function downloadImageToBuffer(url: string): Promise<{
  buffer: Buffer;
  contentType: string | null;
}> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type');
  return { buffer, contentType };
}

/**
 * 上传文件到 Supabase Storage，返回公开 URL
 */
export async function uploadToSupabaseStorage(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const { supabaseAdmin } = await import('./supabase');
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
