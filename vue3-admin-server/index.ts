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
// ESM 环境下获取 __dirname 的兼容处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
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
      type TEXT DEFAULT 'file', -- 新增字段：'file' 代表上传文件，'stream' 代表流地址
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
const startRtspToHls = (rtspUrl: string, streamName: string) => {
  const outputDir = path.join(__dirname, 'uploads', 'streams', streamName);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  ffmpeg(rtspUrl)
    .addOptions([
      '-profile:v baseline',
      '-level 3.0',
      '-start_number 0',
      '-hls_time 10',        // 每个切片 10 秒
      '-hls_list_size 360',  // 关键：保留 360 个切片，即 360 * 10s = 3600s (1小时)
      '-hls_flags delete_segments', // 关键：自动删除 1 小时之前的旧切片
      '-f hls'
    ])
    .output(path.join(outputDir, 'index.m3u8'))
    .on('start', () => console.log(`RTSP 流 ${streamName} 开始转码...`))
    .on('error', (err) => console.error(`流错误: ${err.message}`))
    .run();
};

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
// 添加流地址接口
app.post('/api/video/stream', async (req, res) => {
  const { name, url } = req.body; // url 为 rtsp://...
  const streamId = Date.now().toString();
  
  // 如果是 RTSP，启动后端转流
  if (url.startsWith('rtsp')) {
    startRtspToHls(url, streamId);
    const streamUrl = `http://localhost:3000/uploads/streams/${streamId}/index.m3u8`;
    
    // 存入数据库
    const db = await dbPromise;
    await db.run(
      "INSERT INTO videos (name, url, size, type) VALUES (?, ?, '实时流(1H)', 'rtsp')",
      [name, streamUrl]
    );
    res.json({ code: 1, message: 'RTSP 流已接入，正在进行 1 小时滚动录制' });
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