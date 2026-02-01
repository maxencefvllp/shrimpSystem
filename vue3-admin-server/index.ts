import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs'; 
import ffmpeg from 'fluent-ffmpeg'; // 现在应该不再报红了
import { exec, type ExecException } from 'child_process';
import shellEscape from 'shell-escape';
// ESM 环境下获取 __dirname 的兼容处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());

// --- 数据库初始化 ---
const dbPromise = open({
  filename: './database.db',
  driver: sqlite3.Database
});

// 初始化视频表结构
(async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      url TEXT,
      size TEXT,
      type TEXT DEFAULT 'file',
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // index.ts 初始化部分
  await db.exec(`
    CREATE TABLE IF NOT EXISTS algorithms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,        -- 算法名称，如 "YOLOv13-南美白对虾检测"
      version TEXT,     -- 版本号，如 "v1.0.2"
      file_url TEXT,    -- 文件下载地址
      description TEXT, -- 算法描述
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
})();

// --- Multer 视频上传配置 ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    // 直接连接时间戳和原始文件名
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 启动 RTSP 转 HLS 任务的函数
// 先确保顶部引入了所有必要模块（和其他import放在一起）

/**
 * RTSP流转换为HLS流（自动创建目录、兼容特殊字符、带详细日志）
 * @param rtspUrl RTSP流地址（支持包含&等特殊字符）
 * @param streamId 唯一流ID（用于创建独立文件夹）
 */

function startRtspToHls(rtspUrl: string, streamId: string) {
  // 1. 构建输出目录（和之前一致）
  const outputDir = path.join(__dirname, 'uploads', 'streams', streamId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ 自动创建流目录成功：${outputDir}`);
  }
  const outputM3u8Path = path.join(outputDir, 'index.m3u8');

  // 2. 生成批处理文件的内容（直接写死FFmpeg命令，用绝对路径）
  const batContent = `@echo off
:: 这里替换为你实际的FFmpeg完整路径（必须是绝对路径）
"D:\\ffmpeg\\bin\\ffmpeg.exe" ^
-rtsp_transport tcp ^
-max_delay 5000000 ^
-i "${rtspUrl}" ^
-c:v libx264 ^
-c:a aac ^
-preset ultrafast ^
-f hls ^
-hls_time 5 ^
-hls_list_size 720 ^
-hls_flags delete_segments+omit_endlist ^
-hls_allow_cache 0 ^
-y ^
"${outputM3u8Path}"
`;

  // 3. 保存批处理文件到临时目录（比如项目根目录的temp文件夹）
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const batPath = path.join(tempDir, `rtsp_${streamId}.bat`);
  fs.writeFileSync(batPath, batContent, 'utf8');
  console.log(`✅ 生成批处理文件：${batPath}`);

  // 4. 执行批处理文件（用cmd /c 确保在命令提示符中执行）
  // 把执行批处理的 cmd 命令改成下面这样，添加编码切换
  const cmd = `cmd /c "chcp 65001 && cd /d ${path.dirname(batPath)} && ${path.basename(batPath)}"`;
  console.log(`📌 执行批处理命令：${cmd}`);
  
  const childProcess = exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
    console.log(`📋 批处理输出：\n${stdout}`);
    if (stderr) console.warn(`⚠️ 批处理警告：\n${stderr}`);
    if (error) console.error(`❌ 批处理执行失败：${error.message}`);
  });

  childProcess.on('exit', (code: number | null) => {
    if (code !== 0) console.error(`❌ 批处理进程退出码：${code}`);
  });
}

// 1. 登录接口
app.post('/user/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123456') {
    res.json({
      code: 1,
      data: { token: 'mock-token-abc-123' },
      message: '登录成功'
    });
  } else {
    res.json({ code: 0, message: '用户名或密码错误' });
  }
});

// 2. 获取权限路由接口
app.get('/user/info', (req, res) => {
  res.json({
    code: 1,
    data: {
      data: [
        'Index', 'data-source', 'video-manage', 'permission', 
        'user-manage', 'role-manage', 'menu-manage','algorithm-manage','algorithm-list'
      ]
    }
  });
});

// 3. 获取视频列表接口 (新增：供前端初始化加载卡片)
app.get('/videos', async (req, res) => {
  try {
    const db = await dbPromise;
    const videos = await db.all('SELECT * FROM videos ORDER BY upload_time DESC');
    res.json({ code: 1, data: videos });
  } catch (err) {
    res.json({ code: 0, message: '获取数据失败' });
  }
});

// 4. 视频上传并保存到数据库接口 (修改：增加数据库写入)
app.post('/upload/video', upload.single('file'), async (req, res) => {
  if (req.file) {
    const videoData = {
      name: req.file.originalname,
      url: `http://localhost:3000/uploads/${req.file.filename}`,
      size: (req.file.size / 1024 / 1024).toFixed(2) + ' MB'
    };

    try {
      const db = await dbPromise;
      const result = await db.run(
        'INSERT INTO videos (name, url, size) VALUES (?, ?, ?)',
        [videoData.name, videoData.url, videoData.size]
      );
      
      res.json({
        code: 1,
        data: { id: result.lastID, ...videoData },
        message: '上传并保存成功'
      });
    } catch (err) {
      res.json({ code: 0, message: '数据库写入失败' });
    }
  } else {
    res.json({ code: 0, message: '文件上传失败' });
  }
});

// 5. 删除视频接口 (新增)
app.delete('/videos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await dbPromise;
    await db.run('DELETE FROM videos WHERE id = ?', id);
    res.json({ code: 1, message: '删除成功' });
  } catch (err) {
    res.json({ code: 0, message: '删除失败' });
  }
});

// 放在 startRtspToHls 函数下方
app.post('/video/stream', async (req, res) => {
  try {
    const { name, url } = req.body;

    // 校验必填参数
    if (!name || !url) {
      return res.json({
        code: 0,
        message: '请填写完整的视频名称和流地址'
      });
    }

    const streamId = Date.now().toString();
    let finalUrl = url;

    // 仅当是RTSP地址时，才进行转换
    if (url.toLowerCase().startsWith('rtsp://')) {
      // 调用转换函数（自动创建目录、生成HLS文件）
      startRtspToHls(url, streamId);
      // 拼接前端可访问的HLS地址（和静态资源配置对应）
      finalUrl = `http://localhost:3000/uploads/streams/${streamId}/index.m3u8`;
      console.log(`✅ RTSP流转换成功，前端访问地址：${finalUrl}`);
    }

    // 写入数据库（保持你原来的数据库逻辑，此处仅做示例）
    const db = await dbPromise;
    // 替换为你的实际数据库插入语句
    await db.run(
      'INSERT INTO videos (name, url, size, type) VALUES (?, ?, ?, ?)',
      [name, finalUrl, '实时流（1小时循环）', 'stream']
    );

    // 返回成功响应（和前端预期的格式一致）
    res.json({
      code: 1,
      message: '流地址接入成功',
      data: {
        id: Date.now(), // 替换为数据库返回的实际ID
        name,
        url: finalUrl,
        size: '实时流（1小时循环）'
      }
    });
  } catch (err) {
    console.error(`❌ 接入流地址失败：${(err as Error).message}`);
    res.json({
      code: 0,
      message: '流地址接入失败，请稍后重试'
    });
  }
});
app.post('/video/clip',async(req,res)=>{
  try{
    const {sourceUrl,startTime,endTime,name} = req.body;
    if(!sourceUrl||startTime ===undefined||!endTime)
    {
      return res.json({code:0,message:'参数不完整'});
    }
    const clipId =Date.now();
    const fileName = `clip-${clipId}.mp4`;
    const outputPath = path.join(__dirname,'uploads',fileName);
    const duration = endTime-startTime;

    const ffmpegCmd = `"${path.join('D:', 'ffmpeg', 'bin', 'ffmpeg.exe')}" -ss ${startTime} -t ${duration} -i "${sourceUrl}" -c:v libx264 -c:a aac -strict -2 "${outputPath}"`;
    exec(ffmpegCmd, async (error) => {
      if (error) {
        console.error(`剪辑失败: ${error.message}`);
        return res.json({ code: 0, message: '视频剪辑失败' });
      }

      // 写入数据库
      const db = await dbPromise;
      const finalUrl = `http://localhost:3000/uploads/${fileName}`;
      const stats = fs.statSync(outputPath);
      const sizeStr = (stats.size / 1024 / 1024).toFixed(2) + ' MB';

      const result = await db.run(
        'INSERT INTO videos (name, url, size, type) VALUES (?, ?, ?, ?)',
        [`剪辑-${name}`, finalUrl, sizeStr, 'file']
      );

      res.json({
        code: 1,
        message: '片段截取成功',
        data: { id: result.lastID, name: `剪辑-${name}`, url: finalUrl }
      });
    });
  } catch (err) {
    res.json({ code: 0, message: '服务器错误' });
  }
})
// --- 新增：导出流媒体为 MP4 接口 ---
app.post('/video/export', async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url || !name) {
      return res.json({ code: 0, message: '参数不完整' });
    }

    // 1. 解析流 ID 和本地路径
    // 假设 URL 格式为: http://localhost:3000/uploads/streams/{streamId}/index.m3u8
    const match = url.match(/streams\/([^\/]+)\/index\.m3u8/);
    if (!match) {
      return res.json({ code: 0, message: '无效的流地址格式' });
    }
    const streamId = match[1];
    const streamDir = path.join(__dirname, 'uploads', 'streams', streamId);
    const m3u8Path = path.join(streamDir, 'index.m3u8');

    if (!fs.existsSync(m3u8Path)) {
      return res.json({ code: 0, message: '流文件不存在或已过期' });
    }

    // 2. 准备导出文件的路径和名称
    const exportId = Date.now();
    // 使用 "原名-导出-时间戳" 的格式
    const newName = `${name}-导出-${exportId}`; 
    const fileName = `export-${exportId}.mp4`;
    const outputPath = path.join(__dirname, 'uploads', fileName);

    // 3. 核心逻辑：创建带 ENDLIST 的临时 m3u8
    // 因为实时流没有结束标记，ffmpeg 可能会一直等待。我们手动创建一个静态快照。
    const tempM3u8Path = path.join(streamDir, `snapshot-${exportId}.m3u8`);
    
    let m3u8Content = fs.readFileSync(m3u8Path, 'utf-8');
    // 如果没有结束标记，手动追加
    if (!m3u8Content.includes('#EXT-X-ENDLIST')) {
      m3u8Content += '\n#EXT-X-ENDLIST';
    }
    fs.writeFileSync(tempM3u8Path, m3u8Content, 'utf-8');

    // 4. 使用 FFmpeg 转封装 (copy 模式极快，不重新编码)
    // 同样使用绝对路径调用 ffmpeg
    const ffmpegCmd = `"${path.join('D:', 'ffmpeg', 'bin', 'ffmpeg.exe')}" -i "${tempM3u8Path}" -c copy -bsf:a aac_adtstoasc -y "${outputPath}"`;
    
    console.log(`正在导出流: ${name}`);
    
    exec(ffmpegCmd, async (error) => {
      // 清理临时 m3u8 文件
      if (fs.existsSync(tempM3u8Path)) fs.unlinkSync(tempM3u8Path);

      if (error) {
        console.error(`导出失败: ${error.message}`);
        return res.json({ code: 0, message: '视频导出失败' });
      }

      // 5. 写入数据库
      try {
        const db = await dbPromise;
        const finalUrl = `http://localhost:3000/uploads/${fileName}`;
        const stats = fs.statSync(outputPath);
        const sizeStr = (stats.size / 1024 / 1024).toFixed(2) + ' MB';

        const result = await db.run(
          'INSERT INTO videos (name, url, size, type) VALUES (?, ?, ?, ?)',
          [newName, finalUrl, sizeStr, 'file'] // type='file' 确保它可以被剪辑
        );

        res.json({
          code: 1,
          message: '流视频已成功导出为MP4',
          data: { id: result.lastID, name: newName, url: finalUrl }
        });
      } catch (dbErr) {
        console.error(dbErr);
        res.json({ code: 0, message: '数据库写入失败' });
      }
    });

  } catch (err) {
    console.error(err);
    res.json({ code: 0, message: '服务器内部错误' });
  }
});
// 静态资源托管
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(3000, () => {
  console.log('后端服务运行在: http://localhost:3000');
});

// 1. 获取算法列表
app.get('/algorithm', async (req, res) => {
  const db = await dbPromise;
  const list = await db.all('SELECT * FROM algorithms ORDER BY upload_time DESC');
  res.json({ code: 1, data: list });
});

// 2. 上传算法包
app.post('/upload/algorithm', upload.single('file'), async (req, res) => {
  if (req.file) {
    const { name, version, description } = req.body; // 从前端传来的附加信息
    const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    
    const db = await dbPromise;
    const result = await db.run(
      'INSERT INTO algorithms (name, version, file_url, description) VALUES (?, ?, ?, ?)',
      [name || req.file.originalname, version || '1.0.0', fileUrl, description || '']
    );
    
    res.json({ code: 1, message: '算法包上传成功', data: { id: result.lastID } });
  } else {
    res.json({ code: 0, message: '上传失败' });
  }
});

// 5. 删除视频接口 (新增)
app.delete('/algorithm/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await dbPromise;
    await db.run('DELETE FROM algorithms WHERE id = ?', id);
    res.json({ code: 1, message: '删除成功' });
  } catch (err) {
    res.json({ code: 0, message: '删除失败' });
  }
});