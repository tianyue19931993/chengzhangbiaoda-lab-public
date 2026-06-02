#!/usr/bin/env node

// 7 天自动清理脚本
// 定期清理超过 7 天的项目文件

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FILE_RETENTION_DAYS = parseInt(process.env.FILE_RETENTION_DAYS || '7');

async function cleanup() {
  console.log('🗑️ 开始清理过期文件...');
  console.log(`⏰ 保留天数: ${FILE_RETENTION_DAYS} 天`);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - FILE_RETENTION_DAYS);
    
    console.log(`📅 清理 ${cutoffDate.toISOString()} 之前的文件`);
    
    // 1. 查找过期的项目
    console.log('🔍 查找过期项目...');
    const { data: oldProjects, error: projectError } = await supabase
      .from('projects')
      .select('id, original_image_url')
      .lt('created_at', cutoffDate.toISOString());
    
    if (projectError) {
      console.error('❌ 查询过期项目失败:', projectError);
      return;
    }
    
    if (!oldProjects || oldProjects.length === 0) {
      console.log('✅ 没有过期项目需要清理');
      return;
    }
    
    console.log(`📺 找到 ${oldProjects.length} 个过期项目`);
    
    // 2. 删除 Storage 中的文件
    console.log('🗑️ 删除 Storage 文件...');
    
    for (const project of oldProjects) {
      // 删除原图
      if (project.original_image_url) {
        const filePath = project.original_image_url.split('/').slice(-2).join('/');
        console.log(`🗑️ 删除原图: ${filePath}`);
        
        await supabase.storage
          .from('original-images')
          .remove([filePath]);
      }
      
      // 删除生成的图片
      const { data: images } = await supabase
        .from('images')
        .select('url')
        .eq('project_id', project.id);
      
      if (images) {
        for (const image of images) {
          const filePath = image.url.split('/').slice(-2).join('/');
          console.log(`🗑️ 删除图片: ${filePath}`);
          
          await supabase.storage
            .from('generated-images')
            .remove([filePath]);
        }
      }
      
      // 删除视频
      const { data: videos } = await supabase
        .from('videos')
        .select('url')
        .eq('project_id', project.id);
      
      if (videos) {
        for (const video of videos) {
          if (video.url) {
            const filePath = video.url.split('/').slice(-2).join('/');
            console.log(`🗑️ 删除视频: ${filePath}`);
            
            await supabase.storage
              .from('videos')
              .remove([filePath]);
          }
        }
      }
    }
    
    // 3. 删除数据库记录（级联删除 images 和 videos）
    console.log('🗑️ 删除数据库记录...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    
    if (deleteError) {
      console.error('❌ 删除项目记录失败:', deleteError);
      return;
    }
    
    console.log(`✅ 成功清理 ${oldProjects.length} 个过期项目`);
    console.log('✅ 清理完成！');
  } catch (error) {
    console.error('❌ 清理过程出错:', error);
    process.exit(1);
  }
}

// 执行清理
cleanup()
  .then(() => {
    console.log('✅ 清理脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 清理脚本执行失败:', error);
    process.exit(1);
  });
