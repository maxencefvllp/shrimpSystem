import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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
        'user-manage', 'role-manage', 'menu-manage'
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

// 静态资源托管
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(3000, () => {
  console.log('后端服务运行在: http://localhost:3000');
});